"""Core template and API views for the Stay & Trek application.

The file is intentionally broad because the web map, mobile app, and admin
workflow all depend on the same domain objects. The most important design
assumptions to keep in mind when reading it are:

- trail proximity searches use the stored trail start point as the anchor
- POI and boundary endpoints are shaped for direct use by the Leaflet frontend
- routing returns a hybrid GeoJSON route made of connector segments plus the
  snapped road-network path, so the user sees both exact selected locations and
  the routed travel line
"""

import logging
from django.shortcuts import render, redirect
from django.http import HttpResponse, JsonResponse
from django.core.serializers import serialize
from django.db import models, connection 
from django.db.models import Count, Q
from django.contrib.gis.geos import Point, GEOSGeometry
from django.contrib.gis.db.models.functions import Distance as DistanceFunction
from django.contrib.gis.measure import Distance as D
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth.decorators import login_required
from django.conf import settings
from django.contrib.auth.models import User

from rest_framework import generics, status
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.pagination import PageNumberPagination
from rest_framework.filters import SearchFilter, OrderingFilter
from rest_framework.permissions import AllowAny, IsAuthenticated
from drf_spectacular.utils import extend_schema
from django_filters.rest_framework import DjangoFilterBackend

import requests
from .models import Trail, Town, PointOfInterest, TrailPOIIntersection, Rivers, Accommodation
from .serializers import (
    AccommodationGeoJSONSerializer, TrailListSerializer, TrailDetailSerializer, TrailGeoJSONSerializer,
    TrailCreateSerializer, TrailSummarySerializer, DistanceSerializer,
    BoundingBoxSerializer, PointOfInterestSerializer, PointOfInterestGeoJSONSerializer,
    TrailPOIIntersectionSerializer, TrailWithPOISerializer, GeographicBoundarySerializer, AccommodationSerializer
)
from .serializers import TrailPathGeoSerializer
from .filters import TrailFilter
import json

ROUTE_ESTIMATE_WALKING_SPEED_KMH = 4.5
ROUTE_ESTIMATE_DRIVING_SPEED_KMH = 60.0


# Shared helpers used by the stay-planning and routing responses.
def normalize_accommodation_category(raw_category):
    """Map UI filter values onto one internal category key."""
    category = (raw_category or "").strip().lower()
    aliases = {
        "b&b": "bed_and_breakfast",
        "bb": "bed_and_breakfast",
        "bed-and-breakfast": "bed_and_breakfast",
        "bed_and_breakfast": "bed_and_breakfast",
        "self-catering": "self_catering",
        "self_catering": "self_catering",
        "welcome-standard": "welcome_standard",
        "welcome_standard": "welcome_standard",
    }
    return aliases.get(category, category)


def build_accommodation_category_query(raw_category):
    """Translate a category filter into the safest DB query approximation."""
    category = normalize_accommodation_category(raw_category)
    if not category or category == "all":
        return None

    if category == "hotel":
        return Q(external_id__istartswith="HHS") | Q(name__icontains="hotel")
    if category == "bed_and_breakfast":
        return (
            Q(external_id__istartswith="BBL")
            | Q(name__icontains="b&b")
            | Q(name__icontains="bed and breakfast")
            | Q(name__icontains="farmhouse")
            | Q(name__icontains="guesthouse")
            | Q(name__icontains="guest lodge")
        )
    if category == "camping":
        return (
            Q(external_id__istartswith="CCS")
            | Q(name__icontains="camping")
            | Q(name__icontains="campsite")
            | Q(name__icontains="caravan")
            | Q(name__icontains="holiday park")
            | Q(name__icontains="glamping")
            | Q(name__icontains="pod")
        )
    if category == "self_catering":
        return (
            Q(external_id__istartswith="SCL")
            | Q(external_id__istartswith="SCS")
            | Q(name__icontains="cottage")
            | Q(name__icontains="holiday home")
            | Q(name__icontains="self catering")
        )
    if category == "apartment":
        return Q(name__icontains="apartment")
    if category == "hostel":
        return Q(name__icontains="hostel")
    if category == "lodge":
        return Q(name__icontains="lodge")
    if category == "welcome_standard":
        return Q(external_id__istartswith="WSL")
    return None


def format_estimated_minutes(total_minutes):
    """Render integer minutes as a compact user-facing estimate label."""
    if total_minutes is None:
        return None

    total_minutes = int(max(0, total_minutes))
    hours, minutes = divmod(total_minutes, 60)

    if hours and minutes:
        return f"{hours} hr {minutes} min"
    if hours:
        return f"{hours} hr"
    return f"{minutes} min"


def estimate_route_times(route_distance_km):
    """Estimate basic walking and driving times from an existing route distance."""
    if route_distance_km in (None, ""):
        return None

    try:
        distance_km = float(route_distance_km)
    except (TypeError, ValueError):
        return None

    if distance_km < 0:
        return None

    walking_minutes = round((distance_km / ROUTE_ESTIMATE_WALKING_SPEED_KMH) * 60)
    driving_minutes = round((distance_km / ROUTE_ESTIMATE_DRIVING_SPEED_KMH) * 60)

    return {
        "walking_minutes": walking_minutes,
        "driving_minutes": driving_minutes,
        "walking_label": format_estimated_minutes(walking_minutes),
        "driving_label": format_estimated_minutes(driving_minutes),
    }


# Creates a basic user account for the app.
@api_view(['POST'])
@permission_classes([AllowAny])
def register_user(request):
    username = request.data.get('username')
    password = request.data.get('password')
    email = request.data.get('email')
    
    if User.objects.filter(username=username).exists():
        return Response({"error": "Username taken"}, status=status.HTTP_400_BAD_REQUEST)
    
    user = User.objects.create_user(username=username, email=email, password=password)
    return Response({"message": "User created"}, status=status.HTTP_201_CREATED)

# Sets a larger page size for the main API lists.
class StandardResultsSetPagination(PageNumberPagination):
    page_size = 500
    page_size_query_param = 'page_size'
    max_page_size = 2000


# Lists trails for browsing and handles trail creation.
class TrailListCreateView(generics.ListCreateAPIView):
    queryset = Trail.objects.all()
    serializer_class = None
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    # Reuses the shared filter set for county, difficulty, and range filters.
    filterset_class = TrailFilter
    search_fields = ['trail_name', 'county', 'region']
    ordering_fields = ['trail_name', 'county', 'distance_km', 'difficulty']
    ordering = ['trail_name']

    # Switches serializer based on whether the request is reading or creating.
    def get_serializer_class(self):
        if self.request.method == 'POST':
            return TrailCreateSerializer
        return TrailListSerializer

    # Applies the main trail filters from the query string.
    def get_queryset(self):
        queryset = super().get_queryset()
        min_length = self.request.query_params.get('min_length')
        max_length = self.request.query_params.get('max_length')
        difficulty = self.request.query_params.get('difficulty')

        if min_length:
            queryset = queryset.filter(distance_km__gte=min_length)
        if max_length:
            queryset = queryset.filter(distance_km__lte=max_length)
        if difficulty:
            queryset = queryset.filter(difficulty__iexact=difficulty)

        return queryset
    # Allows public reads and requires login for writes.
    def get_permissions(self):
        if self.request.method == 'POST':
            permission_classes = [IsAuthenticated]
        else:
            permission_classes = [AllowAny]
        return [permission() for permission in permission_classes]


# Handles one town record at a time.
class TownDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Town.objects.all()

    # Allows public reads and requires login for edits.
    def get_permissions(self):
        if self.request.method in ['PUT', 'PATCH', 'DELETE']:
            permission_classes = [IsAuthenticated]
        else:
            permission_classes = [AllowAny]
        return [permission() for permission in permission_classes]

# Handles one trail record at a time.
@extend_schema(tags=["Trails"], summary="Retrieve, update or delete a trail")
class TrailDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Trail.objects.all()
    serializer_class = TrailDetailSerializer


# --- Spatial search and map data endpoints ----------------------------------

# Finds nearby trails from a clicked point and search radius.
@csrf_exempt
@api_view(['POST'])
@authentication_classes([])
@permission_classes([AllowAny])
def trails_within_radius(request):
    try:
        if not request.data.get("latitude") or not request.data.get("longitude"):
            return Response(
                {"error": "Latitude and longitude are required."},
                status=400
            )
        if not request.data.get("radius_km"):
            return Response(
                {"error": "radius_km is required."},
                status=400
            )
        lat = float(request.data.get("latitude"))
        lng = float(request.data.get("longitude"))
        radius_km = float(request.data.get("radius_km", 50))

        # Represent the clicked map position as a PostGIS point so the
        # queryset can apply spatial distance filtering directly in SQL.
        user_location = Point(lng, lat, srid=4326)

        trails = (
            # Annotate each trail with its distance from the selected point,
            # then keep only the trails that fall inside the requested radius.
            Trail.objects.annotate(distance=DistanceFunction("start_point", user_location))
            .filter(distance__lte=radius_km * 1000)
            .order_by("distance")
        )

        # Return a lightweight response for the map sidebar and numbered markers.
        results = [
            {
                "id": t.id,
                "name": t.trail_name,
                "county": t.county,
                "difficulty": t.difficulty,
                "distance_km": round(t.distance_km or 0, 2),
                "distance_from_point_km": round(t.distance.km, 2),
                "latitude": t.start_point.y,
                "longitude": t.start_point.x,
            }
            for t in trails
        ]

        return Response({
            "search_point": {"lat": lat, "lng": lng},
            "radius_km": radius_km,
            "total_found": len(results),
            "nearest_trails": results,
        })

    except Exception as e:
        return Response({"error": str(e)}, status=500)


# Finds trails inside a drawn bounding box.
@csrf_exempt
@extend_schema(tags=["Spatial"], request=BoundingBoxSerializer, responses={200: dict})
@api_view(['POST'])
@authentication_classes([])
@permission_classes([AllowAny])
def trails_in_bounding_box(request):
    serializer = BoundingBoxSerializer(data=request.data)
    if serializer.is_valid():
        data = serializer.validated_data
        # The queryset helper expects the bounding box in the canonical
        # [min_lng, min_lat, max_lng, max_lat] order used throughout the app.
        bbox = [
            data['min_longitude'], data['min_latitude'],
            data['max_longitude'], data['max_latitude']
        ]
        trails = Trail.objects.in_bounding_box(bbox)

        return Response({
            'bounding_box': data,
            'count': trails.count(),
            'trails': TrailListSerializer(trails, many=True).data
        })

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# Returns the top-level trail numbers used in summaries and dashboards.
@csrf_exempt
@api_view(['GET'])
def trail_statistics(request):
    stats = {
        "total_trails": Trail.objects.count(),
        "average_distance_km": Trail.objects.aggregate(avg=models.Avg("distance_km"))["avg"] or 0,
        "max_elevation_gain": Trail.objects.aggregate(max=models.Max("elevation_gain_m"))["max"] or 0,
        "easy_count": Trail.objects.filter(difficulty__iexact="easy").count(),
        "moderate_count": Trail.objects.filter(difficulty__iexact="moderate").count(),
        "hard_count": Trail.objects.filter(difficulty__in=["hard", "challenging"]).count(),
    }
    serializer = TrailSummarySerializer(stats)
    return Response(serializer.data)

# Saves a suggested trail description for moderation.
@api_view(['PATCH'])
def suggest_description(request, pk):
    try:
        trail = Trail.objects.get(pk=pk)
        description = request.data.get('description')

        if not description or len(description) < 10:
            return Response(
                {"error": "Description too short or missing."}, 
                status=status.HTTP_400_BAD_REQUEST
            )

        trail.description = description
        trail.status = 'pending'
        trail.save()

        return Response({"message": "Submission received. Awaiting approval."}, status=status.HTTP_200_OK)
    except Trail.DoesNotExist:
        return Response({"error": "Trail not found."}, status=status.HTTP_404_NOT_FOUND)


# Opens the advanced mapping page for signed-in users.
@csrf_exempt
@login_required
def advanced_mapping_map(request):
    return render(request, 'advanced_js_mapping/map.html')

# Renders the main trails map page.
def trail_map(request):
    return render(request, 'trails/map.html')

# Returns towns as GeoJSON for the map filters.
@api_view(['GET'])
def towns_geojson(request):
    towns = Town.objects.all()
    min_pop = request.GET.get('min_population')
    max_pop = request.GET.get('max_population')
    town_type = request.GET.get('town_type')

    if min_pop:
        towns = towns.filter(population__gte=int(min_pop))
    if max_pop:
        towns = towns.filter(population__lte=int(max_pop))
    if town_type:
        towns = towns.filter(town_type__iexact=town_type.strip())

    geojson = serialize(
        'geojson',
        towns,
        geometry_field='location',
        fields=('name', 'town_type', 'population', 'area')
    )
    return HttpResponse(geojson, content_type='application/json')

# Finds the closest town to the supplied coordinates.
@api_view(['POST'])
def nearest_town(request):
    lat = request.data.get('latitude')
    lng = request.data.get('longitude')
    if not lat or not lng:
        return Response({'error': 'Latitude and longitude required'}, status=400)
    # Reuse the selected search point to rank towns by spatial distance.
    user_location = Point(float(lng), float(lat), srid=4326)
    nearest = Town.objects.annotate(distance=DistanceFunction('location', user_location)).order_by('distance').first()

    if not nearest:
        return Response({'error': 'No towns found'}, status=404)

    return Response({
        'name': nearest.name,
        'town_type': nearest.town_type,
        'distance_km': round(nearest.distance.km, 2),
        'latitude': nearest.location.y,
        'longitude': nearest.location.x,
    })

# Loads sample towns from the bundled GeoJSON file.
@api_view(['GET'])
def load_towns(request):
    with open("trails_api/data/sample_towns.geojson") as f:
        data = json.load(f)
    Town.objects.all().delete()
    count = 0

    for feature in data["features"]:
        props = feature["properties"]
        name = props.get("ENGLISH") or props.get("name")
        area = props.get("AREA")
        population = props.get("POPULATION") or props.get("population") or 0
        town_type = props.get("TOWN_TYPE") or props.get("town_type") or "Urban"

        # Convert each GeoJSON coordinate pair into a PostGIS point so the
        # towns can be used by nearest-town lookup, filtering, and weather views.
        lon, lat = feature["geometry"]["coordinates"]
        point = Point(float(lon), float(lat), srid=4326)

        Town.objects.create(
            name=name,
            area=area,
            population=population,
            town_type=town_type,
            location=point
        )
        count += 1

    return Response({"status": f"Loaded {count} towns successfully"})

# Returns trails as GeoJSON for the main map page.
@api_view(['GET'])
def trails_geojson(request):
    trails = Trail.objects.all()

    min_length = request.GET.get('min_length')
    max_length = request.GET.get('max_length')
    difficulty = request.GET.get('difficulty')
    county = request.GET.get('county')
    trail_type = request.GET.get('trail_type')
    
    if min_length:
        trails = trails.filter(distance_km__gte=float(min_length))
    if max_length:
        trails = trails.filter(distance_km__lte=float(max_length))
    if difficulty and difficulty.lower() in ['easy', 'moderate', 'hard']:
        trails = trails.filter(difficulty__iexact=difficulty.lower())
    if county:
        trails = trails.filter(county__icontains=county)
    if trail_type:
        trails = trails.filter(trail_type__icontains=trail_type)

    geojson = serialize(
        'geojson',
        trails,
        geometry_field='start_point',
        fields=('trail_name', 'county', 'distance_km', 'difficulty', 'dogs_allowed', 'parking_available', 'description', 'status'
        )
    )
    return HttpResponse(geojson, content_type='application/json')

# Returns a short API summary for quick inspection.
@api_view(['GET'])
def api_info(request):
    info = {
        "api_name": "Trails API",
        "version": "1.0",
        "description": "Provides trail data, GeoJSON views, and trail search functionality for hiking routes in Ireland.",
        "endpoints": [
            "/api/trails/",
            "/api/trails/<id>/",
            "/api/trails/geojson/",
            "/api/trails/counties/",
            "/api/trails/info/",
            "/api/trails/search/",
        ],
    }
    return Response(info)

# Returns the available counties with their trail counts.
@api_view(['GET'])
def counties_list(request):
    counties = (
        Trail.objects
        .values('county')
        .annotate(trail_count=Count('id'))
        .order_by('county')
    )
    return Response(list(counties))

# Runs a lightweight trail name search.
@api_view(['GET'])
def trail_search(request):
    q = request.query_params.get('q', '')
    if not q:
        return Response([], status=200)

    trails = Trail.objects.filter(trail_name__icontains=q)[:10]
    return Response(TrailListSerializer(trails, many=True).data)

# Returns saved trail paths as GeoJSON features.
@api_view(['GET'])
@authentication_classes([])
@permission_classes([AllowAny])
def trails_paths_geojson(request):
    # This endpoint deliberately exposes full route geometry separately from the
    # lighter marker endpoint so the frontend can choose between fast marker
    # loading and more expensive path rendering.
    qs = Trail.objects.exclude(path__isnull=True)
    serializer = TrailPathGeoSerializer(qs, many=True)
    return Response(serializer.data)



# Shows the small API test page.
def api_test_page(request):
    return redirect(f"{settings.STATIC_URL}api_test.html")

# Keeps the old API test route working.
def api_test_view(request):
    return redirect(f"{settings.STATIC_URL}api_test.html")


# --- Weather proxy endpoints -------------------------------------------------

# Returns live weather for a trail start point.
@api_view(['GET'])
def trail_weather(request, pk):
    try:
        trail = Trail.objects.get(pk=pk)
        
        if not trail.start_point:
            return JsonResponse({'error': 'No coordinates for this trail'}, status=400)
        
        lon, lat = trail.start_point.x, trail.start_point.y

        api_key = settings.OPENWEATHERMAP_API_KEY
        url = f'https://api.openweathermap.org/data/2.5/weather?lat={lat}&lon={lon}&appid={api_key}&units=metric'

        response = requests.get(url)
        data = response.json()

        return JsonResponse(data)
    
    except Trail.DoesNotExist:
        return JsonResponse({'error': 'Trail not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)
    
# Returns live weather for a selected town point.
@api_view(['GET'])
def town_weather(request):
    lat = request.GET.get("lat")
    lng = request.GET.get("lng")

    if not lat or not lng:
        return Response({"error": "Missing coordinates"}, status=400)

    # Pull the OpenWeatherMap key from configuration so credentials stay out of
    # the client and the request can be assembled securely on the backend.
    api_key = settings.OPENWEATHERMAP_API_KEY

    # Build the weather request from the selected map coordinates and ask for
    # metric units so the frontend receives planning-ready values.
    url = (
        f"https://api.openweathermap.org/data/2.5/weather?"
        f"lat={lat}&lon={lng}&appid={api_key}&units=metric"
    )

    # Return the provider response in a simple JSON form that can be displayed
    # directly in the town popup and related weather panels.
    data = requests.get(url).json()
    return Response(data)


# --- POI and geographic-boundary endpoints ----------------------------------

# Lists POIs with the standard filters and search options.
class PointOfInterestViewSet(generics.ListAPIView):
    queryset = PointOfInterest.objects.all()
    serializer_class = PointOfInterestSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['poi_type', 'county']
    search_fields = ['name', 'description', 'county']
    ordering_fields = ['name', 'poi_type', 'county']
    ordering = ['poi_type', 'name']
    pagination_class = StandardResultsSetPagination
    permission_classes = [AllowAny]

# Filters POIs down to one type.
class POIByTypeView(generics.ListAPIView):
    serializer_class = PointOfInterestSerializer
    pagination_class = StandardResultsSetPagination
    permission_classes = [AllowAny]
    
    def get_queryset(self):
        poi_type = self.kwargs.get('poi_type')
        if poi_type:
            return PointOfInterest.objects.filter(poi_type=poi_type)
        return PointOfInterest.objects.all()

# POIs Near Trail Endpoint
# Returns the POIs linked to one trail.
@api_view(['POST'])
@permission_classes([AllowAny])
def pois_near_trail(request):
    try:
        trail_id = request.data.get('trail_id')
        if not trail_id:
            return Response({'error': 'trail_id required'}, status=400)
        
        trail = Trail.objects.get(id=trail_id)
        
        # Trail/POI relationships are pre-computed and stored as intersections.
        # That keeps this endpoint predictable and fast for repeated map clicks.
        intersections = TrailPOIIntersection.objects.filter(trail=trail).order_by('distance_meters')
        
        return Response({
            'trail': {
                'id': trail.id,
                'name': trail.trail_name,
                'county': trail.county,
            },
            'pois_count': intersections.count(),
            'pois': TrailPOIIntersectionSerializer(intersections, many=True).data
        })
    except Trail.DoesNotExist:
        return Response({'error': 'Trail not found'}, status=404)
    except Exception as e:
        return Response({'error': str(e)}, status=500)

# Finds POIs near a clicked point.
@api_view(['POST'])
@permission_classes([AllowAny])
def pois_in_radius(request):
    try:
        lat = request.data.get('latitude')
        lng = request.data.get('longitude')
        radius_km = float(request.data.get('radius_km', 5))
        poi_type = request.data.get('poi_type')
        
        if not lat or not lng:
            return Response({'error': 'Latitude and longitude required'}, status=400)
        
        # Radius search is centered on an arbitrary map click rather than a
        # trail, which makes the endpoint reusable for exploratory map work.
        user_location = Point(float(lng), float(lat), srid=4326)
        
        pois = PointOfInterest.objects.annotate(
            distance=DistanceFunction('location', user_location)
        ).filter(
            distance__lte=radius_km * 1000
        ).order_by('distance')
        
        if poi_type:
            pois = pois.filter(poi_type=poi_type)
        
        results = [
            {
                'id': p.id,
                'name': p.name,
                'type': p.poi_type,
                'county': p.county,
                'distance_km': round(p.distance.km, 2),
                'latitude': p.latitude,
                'longitude': p.longitude,
                'phone': p.phone,
                'website': p.website,
            }
            for p in pois
        ]
        
        return Response({
            'search_point': {'lat': lat, 'lng': lng},
            'radius_km': radius_km,
            'poi_type_filter': poi_type,
            'total_found': len(results),
            'pois': results
        })
    except Exception as e:
        return Response({'error': str(e)}, status=500)

# Lists rivers and other geographic boundaries.
class GeographicBoundaryViewSet(generics.ListAPIView):
    queryset = Rivers.objects.all()
    serializer_class = GeographicBoundarySerializer
    filter_backends = [DjangoFilterBackend, SearchFilter]
    filterset_fields = ['boundary_type']
    search_fields = ['name', 'description']
    permission_classes = [AllowAny]
    pagination_class = StandardResultsSetPagination

# Returns trails that cross or sit inside one boundary.
@api_view(['GET'])
@permission_classes([AllowAny])
def trails_crossing_boundary(request, boundary_id):
    try:
        boundary = Rivers.objects.get(id=boundary_id)
        
        trails_crossing = boundary.trails_crossing()
        trails_within = boundary.trails_within()
        
        return Response({
            'boundary': {
                'id': boundary.id,
                'name': boundary.name,
                'type': boundary.boundary_type,
            },
            'trails_crossing_count': trails_crossing.count(),
            'trails_within_count': trails_within.count(),
            'trails_crossing': TrailListSerializer(trails_crossing, many=True).data,
            'trails_within': TrailListSerializer(trails_within, many=True).data,
        })
    except Rivers.DoesNotExist:
        return Response({'error': 'Boundary not found'}, status=404)
    except Exception as e:
        return Response({'error': str(e)}, status=500)

# Returns crossing trail paths as GeoJSON.
@api_view(['GET'])
@permission_classes([AllowAny])
def trails_crossing_boundary_geojson(request, boundary_id):
    try:
        boundary = Rivers.objects.get(id=boundary_id)
        trails_crossing = boundary.trails_crossing()
        serializer = TrailPathGeoSerializer(trails_crossing, many=True)
        features = serializer.data
        
        if isinstance(features, list):
            geojson_response = {
                "type": "FeatureCollection",
                "features": features
            }
        else:
            geojson_response = features
            
        return Response(geojson_response)
    except Rivers.DoesNotExist:
        return Response({'error': 'Boundary not found'}, status=404)
    except Exception as e:
        return Response({'error': str(e)}, status=500)

# Falls back to nearby start points when full paths are missing.
@api_view(['GET'])
@permission_classes([AllowAny])
def trails_near_boundary(request, boundary_id):
    try:
        radius_m = int(request.GET.get('radius_m', 200))
        boundary = Rivers.objects.get(id=boundary_id)
        # This uses trail start points as a practical fallback for "near this
        # river/boundary" rather than buffering full trail geometry on demand.
        qs = Trail.objects.filter(start_point__distance_lte=(boundary.geom, D(m=radius_m)))
        qs = qs.annotate(distance=DistanceFunction('start_point', boundary.geom)).order_by('distance')
        return Response(TrailListSerializer(qs, many=True).data)
    except Rivers.DoesNotExist:
        return Response({'error': 'Boundary not found'}, status=404)
    except Exception as e:
        return Response({'error': str(e)}, status=500)

# Returns trails for a county boundary or falls back to the county field.
@api_view(['GET'])
@permission_classes([AllowAny])
def trails_by_county_boundary(request, county_name):
    try:
        boundary = Rivers.objects.get(name__iexact=county_name, boundary_type='county')
        
        trails_crossing = boundary.trails_crossing()
        trails_within = boundary.trails_within()
        
        return Response({
            'county': county_name,
            'trails_crossing': TrailListSerializer(trails_crossing, many=True).data,
            'trails_within': TrailListSerializer(trails_within, many=True).data,
            'total_in_area': trails_within.count() + trails_crossing.count(),
        })
    except Rivers.DoesNotExist:
        trails = Trail.objects.filter(county__iexact=county_name)
        return Response({
            'county': county_name,
            'trails': TrailListSerializer(trails, many=True).data,
            'count': trails.count(),
        })
    except Exception as e:
        return Response({'error': str(e)}, status=500)

# Summarises the main spatial datasets for reporting.
@api_view(['GET'])
@permission_classes([AllowAny])
def spatial_analysis_summary(request):
    return Response({
        'total_trails': Trail.objects.count(),
        'total_pois': PointOfInterest.objects.count(),
        'pois_by_type': dict(
            PointOfInterest.objects
            .values('poi_type')
            .annotate(count=Count('id'))
            .values_list('poi_type', 'count')
        ),
        'geographic_boundaries': Rivers.objects.count(),
        'trail_poi_intersections': TrailPOIIntersection.objects.count(),
        'pois_near_trails': {
            'very_close': TrailPOIIntersection.objects.filter(proximity='very_close').count(),
            'close': TrailPOIIntersection.objects.filter(proximity='close').count(),
            'moderate': TrailPOIIntersection.objects.filter(proximity='moderate').count(),
        }
    })


# --- Accommodation and stay-planning endpoints ------------------------------

# Lists accommodations with basic filtering and search.
class AccommodationsListView(generics.ListAPIView):
    queryset = Accommodation.objects.all()
    serializer_class = AccommodationSerializer
    pagination_class = StandardResultsSetPagination
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    search_fields = ['name', 'url']
    ordering_fields = ['name', 'rating', 'price_per_night']
    ordering = ['name']
    permission_classes = [AllowAny]
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
        source = self.request.GET.get('source')
        category = self.request.GET.get('category')
        
        if source:
            queryset = queryset.filter(source__iexact=source)
        category_query = build_accommodation_category_query(category)
        if category_query is not None:
            queryset = queryset.filter(category_query)
            
        return queryset

# Returns nearby accommodations as GeoJSON around a point.
@api_view(['GET'])
@permission_classes([AllowAny])
def accommodations_geojson(request):
    print("!!! THE VIEW IS RUNNING !!!")
    
    lat = request.GET.get("lat")
    lng = request.GET.get("lng")
    radius = request.GET.get("radius", 10)
    
    if not lat or not lng:
        return Response({"error": "lat and lng required"}, status=400)

    # The calling UI may use either the selected trail location or a free map
    # click as the search origin, so the endpoint stays point-based on purpose.
    point = Point(float(lng), float(lat), srid=4326)

    try:
        accommodations = (
            Accommodation.objects
            .filter(location__distance_lte=(point, D(km=radius)))
            .annotate(distance=DistanceFunction('location', point))
            .order_by('distance')[:10]  # Limit to 10 for performance
        )
        
        features = []
        
        for acc in accommodations:
            if acc.location:
                features.append({
                    "type": "Feature",
                    "geometry": {
                        "type": "Point",
                        "coordinates": [acc.location.x, acc.location.y]
                    },
                    "properties": {
                        "id": acc.id,
                        "name": acc.name,
                        "source": acc.source,
                        "category": acc.category,
                        "category_label": acc.category_label,
                        "price_per_night": float(acc.price_per_night) if acc.price_per_night else None,
                        "rating": acc.rating or 0,
                        "url": acc.url,
                    }
                })
        
        return Response({
            "type": "FeatureCollection",
            "features": features,
            "count": len(features)
        })
    except Exception as e:
        return Response({"error": str(e)}, status=500)
    
# Finds accommodation near a trail and sorts it by route distance when possible.
@api_view(['GET'])
@permission_classes([AllowAny])
def accommodations_near_trail(request):
    trail_id = request.GET.get('trail_id')
    category = request.GET.get('category', 'all')
    radius_km = float(request.GET.get('radius_km', 10))
    
    if not trail_id:
        return Response({"error": "trail_id is required"}, status=400)
    
    try:
        trail = Trail.objects.get(id=trail_id)
        
        if not trail.start_point:
            return Response({"error": "Trail has no coordinates"}, status=400)
        
        radius_meters = radius_km * 1000
        
        from django.contrib.gis.db.models import Value as V
        from django.contrib.gis.db.models.functions import Transform
        
        # Starts with the closest stays around the trail start point. The
        # frontend uses the trailhead as the stay-planning origin throughout.
        accommodations_qs = (
            Accommodation.objects.annotate(
                distance=DistanceFunction('location', trail.start_point)
            ).filter(
                location__dwithin=(trail.start_point, D(m=radius_meters))
            )
        )

        category_query = build_accommodation_category_query(category)
        if category_query is not None:
            accommodations_qs = accommodations_qs.filter(category_query)

        accommodations = list(accommodations_qs.order_by('distance')[:10])
        accommodations = [acc for acc in accommodations if acc.location]

        # Tries to rank stays by road distance so the list feels more realistic
        # than a simple straight-line ordering when routing data is available.
        road_distances = {}
        if accommodations:
            with connection.cursor() as cursor:
                trail_lng = trail.start_point.x
                trail_lat = trail.start_point.y
                start_node = get_road_node_for_point(
                    cursor,
                    trail_lng,
                    trail_lat,
                    ROAD_HIGHWAY_FILTER
                )
                acc_nodes = {}
                end_nodes = []

                for acc in accommodations:
                    acc_node = get_road_node_for_point(
                        cursor,
                        acc.location.x,
                        acc.location.y,
                        ROAD_HIGHWAY_FILTER
                    )
                    if acc_node is not None:
                        acc_nodes[acc.id] = acc_node
                        end_nodes.append(acc_node)

                end_nodes = list(dict.fromkeys(end_nodes))

                if start_node is not None and end_nodes:
                    # Uses the furthest stay to size a road search area that covers the full set.
                    far_acc = max(
                        accommodations,
                        key=lambda a: abs(a.location.y - trail_lat) + abs(a.location.x - trail_lng)
                    )
                    inner_sql = build_road_inner_sql(
                        cursor,
                        (trail_lng, trail_lat),
                        (far_acc.location.x, far_acc.location.y),
                        ROAD_HIGHWAY_FILTER
                    )
                    cursor.execute(
                        "SELECT node, agg_cost FROM pgr_kdijkstraCost(%s, %s, %s, false)",
                        [inner_sql, start_node, end_nodes]
                    )
                    cost_rows = cursor.fetchall()
                    node_costs = {row[0]: row[1] for row in cost_rows if row and row[1] is not None}
                    for acc_id, node_id in acc_nodes.items():
                        road_distances[acc_id] = node_costs.get(node_id)

        def road_distance_sort_key(acc_item):
            dist = road_distances.get(acc_item.id)
            return dist if dist is not None else float("inf")

        # Keeps the closest road routes at the top when routing data is available.
        accommodations.sort(key=road_distance_sort_key)

        features = []
        # Shapes the response for map markers and accommodation cards.
        for acc in accommodations:
            road_distance_m = road_distances.get(acc.id)
            road_distance_km = round(road_distance_m / 1000, 2) if road_distance_m is not None else None
            features.append({
                "type": "Feature",
                "geometry": {
                    "type": "Point",
                    "coordinates": [acc.location.x, acc.location.y]
                },
                "properties": {
                    "id": acc.id,
                    "name": acc.name,
                    "source": acc.source,
                    "category": acc.category,
                    "category_label": acc.category_label,
                    "price_per_night": float(acc.price_per_night) if acc.price_per_night else None,
                    "rating": acc.rating,
                    "distance_km": round(acc.distance.km, 2),
                    "road_distance_km": road_distance_km,
                    "url": acc.url,
                }
            })
        
        return Response({
            "type": "FeatureCollection",
            "features": features,
            "count": len(features),
            "trail_id": trail_id,
            "trail_name": trail.trail_name,
            "category_filter": category,
            "radius_km": radius_km
        })
        
    except Trail.DoesNotExist:
        return Response({"error": "Trail not found"}, status=404)
    except Exception as e:
        return Response({"error": str(e)}, status=500)

# Groups accommodation counts by county.
@api_view(['GET'])
@permission_classes([AllowAny])
def accommodations_by_county(request):
    accommodations = PointOfInterest.objects.filter(poi_type='accommodation')
    county_stats = accommodations.values('county').annotate(
        count=Count('id')
    ).order_by('-count')
    return Response({
        "counties": list(county_stats),
        "total_counties": county_stats.count(),
        "total_accommodations": accommodations.count()
    })

# Returns a simple straight line for route testing.
@api_view(['GET'])
@permission_classes([AllowAny])
def route_test(request):

    trail_lat = request.GET.get("trail_lat")
    trail_lng = request.GET.get("trail_lng")
    
    acc_lat = request.GET.get("acc_lat")
    acc_lng = request.GET.get("acc_lng")
    
    if trail_lat is None or trail_lng is None or acc_lat is None or acc_lng is None:
        return Response({
            "type": "FeatureCollection",
            "features": []
        })

    geojson = {
        "type": "Feature",
        "geometry": {
            "type": "LineString",
            "coordinates": [
                [trail_lng, trail_lat],
                [acc_lng, acc_lat]
            ]
        }

    }
    return Response(geojson)
# Lists the road types allowed in route searches.
ROAD_HIGHWAY_FILTER = """
highway IN (
'motorway','motorway_link',
'trunk','trunk_link',
'primary','primary_link',
'secondary','secondary_link',
'tertiary',
'unclassified',
'residential',
'service',
'track',
'path',
'footway',
'cycleway',
'pedestrian'
)
"""
BBOX_BUFFER_DEG = 2 


logger = logging.getLogger(__name__)

ROUTE_SEARCH_TIME_LIMIT_SECONDS = 8.0
ROUTE_INITIAL_RADIUS_METERS = 15000
ROUTE_RADIUS_MULTIPLIER = 1.75
ROUTE_MAX_RADIUS_METERS = 450000
ROUTE_MAX_SINGLE_QUERY_MS = 2500
ROUTE_END_NODE_CANDIDATE_LIMIT = 3
ROUTE_PRIMARY_NODE_BUDGET_SECONDS = 4.0
ROUTE_ALTERNATE_NODE_BUDGET_SECONDS = 2.0


# --- Road-network routing helpers -------------------------------------------

# Builds the inner road SQL used by the routing queries.
def build_road_inner_sql(cursor, start_coords, end_coords, road_filter, bbox_buffer_deg=BBOX_BUFFER_DEG):

    if not road_filter:
        road_filter = "TRUE"
        
    start_lng, start_lat = start_coords
    end_lng, end_lat = end_coords
    start_geom = cursor.mogrify(
        "ST_SetSRID(ST_Point(%s,%s),4326)",
        [start_lng, start_lat]
    ).decode()
    end_geom = cursor.mogrify(
        "ST_SetSRID(ST_Point(%s,%s),4326)",
        [end_lng, end_lat]
    ).decode()
    bbox_geom = (
        "ST_Transform(ST_Buffer(ST_Envelope(ST_Collect(" +
        start_geom + "," + end_geom + ")), " + str(bbox_buffer_deg) + "), 3857)"
    )
    # Keeps the routing query focused on the road network table used by pgRouting.
    return f"""
        SELECT id,
               source,
               target,
               cost
        FROM routing_ways
        WHERE {road_filter}
    """

# Finds the closest routable road nodes to a point.
def get_road_nodes_for_point(cursor, lng, lat, limit=1):
    cursor.execute("""
        SELECT id
        FROM routing_ways_vertices_pgr
        WHERE component_id = 38
        ORDER BY the_geom <-> ST_Transform(ST_SetSRID(ST_Point(%s, %s), 4326), 3857)
        LIMIT %s;
    """, [lng, lat, limit])

    return [row[0] for row in cursor.fetchall()]


# Finds the closest routable road node to a point.
def get_road_node_for_point(cursor, lng, lat):
    nodes = get_road_nodes_for_point(cursor, lng, lat, limit=1)
    return nodes[0] if nodes else None


# Loads one snapped road vertex geometry so connector lines can be drawn.
def get_road_node_geometry(cursor, node_id):
    cursor.execute(
        "SELECT ST_AsGeoJSON(ST_Transform(the_geom, 4326)) FROM routing_ways_vertices_pgr WHERE id = %s;",
        [node_id],
    )
    row = cursor.fetchone()
    return json.loads(row[0])["coordinates"] if row and row[0] else None

# Retries the route search with a wider radius until it succeeds or times out.
def find_route_with_expanding_radius(
    cursor,
    start_lng,
    start_lat,
    end_lng,
    end_lat,
    start_node,
    end_node,
    max_total_seconds=ROUTE_SEARCH_TIME_LIMIT_SECONDS,
    initial_radius=ROUTE_INITIAL_RADIUS_METERS,
    radius_multiplier=ROUTE_RADIUS_MULTIPLIER,
    max_radius=ROUTE_MAX_RADIUS_METERS,
    max_single_query_ms=ROUTE_MAX_SINGLE_QUERY_MS,
):
    import time
    from django.db import transaction

    started = time.monotonic()
    radius = int(initial_radius)
    attempt = 0
    last_error = None

    # Increase the routing search envelope gradually so slow areas of the graph
    # do not block the page with one large, unbounded pgRouting query.
    while radius <= int(max_radius):
        elapsed = time.monotonic() - started
        remaining_ms = int((max_total_seconds - elapsed) * 1000)

        if remaining_ms <= 0:
            break

        statement_timeout_ms = min(int(max_single_query_ms), remaining_ms)
        if statement_timeout_ms <= 0:
            break

        attempt += 1

        try:
            with transaction.atomic():
                cursor.execute("SET LOCAL statement_timeout = %s;", [statement_timeout_ms])
                cursor.execute("""
                    SELECT ST_AsGeoJSON(ST_Transform(ST_Collect(r.geom), 4326))
                    FROM pgr_dijkstra(
                        'SELECT id, source, target, cost, reverse_cost FROM routing_ways
                         WHERE geom && ST_Expand(ST_Envelope(ST_Collect(
                            ST_Transform(ST_SetSRID(ST_Point(%s,%s),4326), 3857),
                            ST_Transform(ST_SetSRID(ST_Point(%s,%s),4326), 3857)
                         )), %s)',
                        %s, %s, true
                    ) d
                    JOIN routing_ways r ON d.edge = r.id
                    WHERE d.edge <> -1;
                """, [
                    start_lng,
                    start_lat,
                    end_lng,
                    end_lat,
                    radius,
                    start_node,
                    end_node,
                ])
                row = cursor.fetchone()

            if row and row[0]:
                return {
                    "ok": True,
                    "geojson": row[0],
                    "radius_used": radius,
                    "attempts": attempt,
                    "elapsed_seconds": round(time.monotonic() - started, 3),
                }
        except Exception as e:
            last_error = str(e)
            logger.warning(
                "[ROUTING RETRY] attempt=%s radius=%s timeout_ms=%s error=%s",
                attempt,
                radius,
                statement_timeout_ms,
                last_error,
            )

        next_radius = int(radius * radius_multiplier)
        radius = next_radius if next_radius > radius else radius + 50000

    return {
        "ok": False,
        "geojson": None,
        "radius_used": radius,
        "attempts": attempt,
        "elapsed_seconds": round(time.monotonic() - started, 3),
        "error": last_error or "No route found before time limit was reached",
    }

# Builds a hybrid route: short connector lines into the road graph plus the
# pgRouting road path itself, returned as one GeoJSON feature collection.
def get_transport_route(start_coords, end_coords):
    features = []
    start_lng, start_lat = start_coords
    end_lng, end_lat = end_coords

    # Adds up the line segments so the UI can show one route distance.
    def route_distance_km_from_features(route_features):
        total_meters = 0.0
        for feature in route_features:
            geometry = feature.get("geometry")
            if not geometry:
                continue
            try:
                geom = GEOSGeometry(json.dumps(geometry), srid=4326)
            except Exception:
                continue

            if geom.geom_type not in {"LineString", "MultiLineString"}:
                continue

            total_meters += geom.transform(3857, clone=True).length

        return round(total_meters / 1000, 2)

    with connection.cursor() as cursor:
        import time

        logger.warning(f"DEBUG coords: {start_lng},{start_lat} -> {end_lng},{end_lat}")

        # Snap the trail and accommodation coordinates to the nearest routable
        # vertices before running shortest-path search on the road network. The
        # original coordinates are still preserved as connector segments so the
        # returned route starts and ends exactly where the user clicked.
        start_node = get_road_node_for_point(cursor, start_lng, start_lat)
        end_node = get_road_node_for_point(cursor, end_lng, end_lat)

        if start_node is None or end_node is None:
            logger.warning("[ROUTE DEBUG] No start/end node found.")
            return {"status": "no_route_found"}

        start_vertex_coords = get_road_node_geometry(cursor, start_node)

        if start_vertex_coords:
            # Preserve the true trailhead position by drawing a short connector
            # from the selected point to the snapped road-network vertex.
            features.append({
                "type": "Feature",
                "properties": {"segment": "connector_start"},
                "geometry": {"type": "LineString", "coordinates": [[start_lng, start_lat], start_vertex_coords]}
            })

        overall_started = time.monotonic()
        route_result = None
        selected_end_coords = None
        selected_candidate_index = 1

        # Keep the current nearest-node route search first, then try a couple
        # of alternate destination nodes if that first snapped target times out.
        # This gives the route search a second chance near sparse graph edges
        # without changing the user-facing selection model.
        end_node_candidates = [end_node]
        for candidate in get_road_nodes_for_point(
            cursor,
            end_lng,
            end_lat,
            limit=ROUTE_END_NODE_CANDIDATE_LIMIT,
        ):
            if candidate not in end_node_candidates:
                end_node_candidates.append(candidate)

        for candidate_index, candidate_end_node in enumerate(end_node_candidates, start=1):
            remaining_seconds = ROUTE_SEARCH_TIME_LIMIT_SECONDS - (time.monotonic() - overall_started)
            if remaining_seconds <= 0:
                break

            candidate_budget = min(
                remaining_seconds,
                ROUTE_PRIMARY_NODE_BUDGET_SECONDS
                if candidate_index == 1
                else ROUTE_ALTERNATE_NODE_BUDGET_SECONDS,
            )
            if candidate_budget <= 0:
                break

            try:
                route_result = find_route_with_expanding_radius(
                    cursor,
                    start_lng,
                    start_lat,
                    end_lng,
                    end_lat,
                    start_node,
                    candidate_end_node,
                    max_total_seconds=candidate_budget,
                )
            except Exception as e:
                logger.error(f"ROUTING SQL ERROR: {e}")
                return {"status": "error", "message": str(e)}

            if route_result["ok"]:
                selected_end_coords = get_road_node_geometry(cursor, candidate_end_node)
                selected_candidate_index = candidate_index
                break

        if route_result and route_result["ok"]:
            features.append({
                "type": "Feature",
                "properties": {
                    "segment": "road_route",
                    "radius_used": route_result["radius_used"],
                    "attempts": route_result["attempts"],
                    "end_node_candidate": selected_candidate_index,
                },
                "geometry": json.loads(route_result["geojson"])
            })
        else:
            routing_debug = route_result or {
                "ok": False,
                "geojson": None,
                "radius_used": None,
                "attempts": 0,
                "elapsed_seconds": round(time.monotonic() - overall_started, 3),
                "error": "No route found before time limit was reached",
            }
            routing_debug["end_node_candidates_tried"] = len(end_node_candidates)
            return {
                "status": "no_route_found",
                "error": routing_debug["error"],
                "routing_debug": routing_debug,
            }

        if selected_end_coords:
            # Finish the route with a second connector into the selected stay.
            features.append({
                "type": "Feature",
                "properties": {"segment": "connector_end"},
                "geometry": {"type": "LineString", "coordinates": [selected_end_coords, [end_lng, end_lat]]}
            })

        # Return one map-ready payload so the frontend can draw the full route
        # and show the accumulated distance in a single update.
        route_distance_km = route_distance_km_from_features(features)

        return {
            "status": "success_v2",
            "type": "FeatureCollection",
            "features": features,
            "route_distance_km": route_distance_km,
            "estimated_times": estimate_route_times(route_distance_km),
        }

# Validates the selected trail/stay coordinates and returns a routed
# GeoJSON response for the map interface.
@api_view(['POST'])
@authentication_classes([])
@permission_classes([AllowAny])
def route_between_nodes(request):
    try:
        t_lat = float(request.data.get("trail_lat"))
        t_lng = float(request.data.get("trail_lng"))
        a_lat = float(request.data.get("acc_lat"))
        a_lng = float(request.data.get("acc_lng"))
    except (TypeError, ValueError):
        return JsonResponse({"error": "Valid coordinates required"}, status=400)

    route_data = get_transport_route((t_lng, t_lat), (a_lng, a_lat))

    if route_data.get("status") != "success_v2":
        # Fall back to a straight line if the road graph cannot produce a route,
        # so the UI still gives the user a visible result.
        return JsonResponse({
            "status": "fallback",
            "route_error": route_data.get("error"),
            "routing_debug": route_data.get("routing_debug"),
            "type": "FeatureCollection",
            "features": [{
                "type": "Feature",
                "geometry": {
                    "type": "LineString",
                    "coordinates": [[t_lng, t_lat], [a_lng, a_lat]]
                },
                "properties": {"segment": "straight_line"}
            }]
        })

    return JsonResponse(route_data)


# Returns the nearest road node for debugging and routing checks.
@api_view(['GET'])
@permission_classes([AllowAny])
def nearest_node(request):
    lat = request.GET.get("lat")
    lng = request.GET.get("lng")

    if not lat or not lng:
        return JsonResponse({"error": "lat and lng required"}, status=400)

    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT id
            FROM routing_ways_vertices_pgr
            WHERE component_id = 38
            ORDER BY the_geom <-> ST_Transform(ST_SetSRID(ST_Point(%s,%s),4326), 3857)
            LIMIT 1
        """, [lng, lat])
        row = cursor.fetchone()

    if row:
        return JsonResponse({"nearest_node_id": row[0]})
    return JsonResponse({"error": "No nodes found"}, status=404)

# Returns the top-level accommodation numbers used in reports.
@api_view(['GET'])
@permission_classes([AllowAny])
def accommodations_statistics(request):
    accommodations = PointOfInterest.objects.filter(poi_type='accommodation')
    
    total = accommodations.count()
    with_phone = accommodations.exclude(phone='').exclude(phone__isnull=True).count()
    with_website = accommodations.exclude(website='').exclude(website__isnull=True).count()
    
    county_distribution = list(
        accommodations.values('county').annotate(count=Count('id')).order_by('-count')
    )
    
    region_distribution = list(
        accommodations.values('region').annotate(count=Count('id')).order_by('-count')
    )
    
    return Response({
        "total_accommodations": total,
        "with_contact_info": {
            "phone": with_phone,
            "website": with_website,
        },
        "by_county": county_distribution,
        "by_region": region_distribution,
        "coverage_stats": {
            "counties_with_accommodation": accommodations.values('county').distinct().count(),
            "regions_with_accommodation": accommodations.values('region').distinct().count(),
        }
    })
    
# Lists nearby accommodation for the mobile app.
class NearbyAccommodationView(generics.ListAPIView):
    serializer_class = AccommodationGeoJSONSerializer
    permission_classes = [AllowAny]
    
    def get_queryset(self):
        lat = self.request.query_params.get('lat')
        lng = self.request.query_params.get('lng')
        radius_param = self.request.query_params.get('radius', 20)
        category = self.request.query_params.get('category')

        try:
            radius_km = float(radius_param)
        except (ValueError, TypeError):
            raise ValidationError({"error": "Valid radius required"})
        
        if lat and lng:
            try:
                user_location = Point(float(lng), float(lat), srid=4326)
                
                queryset = Accommodation.objects.filter(
                    location__distance_lte=(user_location, D(km=radius_km))
                ).annotate(
                    distance=DistanceFunction('location', user_location)
                )
                category_query = build_accommodation_category_query(category)
                if category_query is not None:
                    queryset = queryset.filter(category_query)
                return queryset.order_by('distance')[:30]
            except (ValueError, TypeError):
                return Accommodation.objects.none()
            
        return Accommodation.objects.none()
    

# Finds accommodation near a chosen town.
@api_view(['GET'])
@permission_classes([AllowAny])
def accommodations_near_town(request):
    town_id = request.GET.get('town_id')
    radius_km = float(request.GET.get('radius', 15))
    
    if not town_id:
        return Response({'error': 'town_id parameter required'}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        town = Town.objects.get(id=town_id)
    except Town.DoesNotExist:
        return Response({'error': f'Town {town_id} not found'}, status=status.HTTP_404_NOT_FOUND)
    
    # Uses the town as the search centre and returns the closest stays first.
    nearby_accommodations = PointOfInterest.objects.filter(
        poi_type='accommodation',
        location__distance_lte=(town.location, D(km=radius_km))
    ).annotate(
        distance_km=DistanceFunction('location', town.location)
    ).order_by('distance_km')
    
    features = []
    # Shapes the stay data for the map and side panel.
    for acc in nearby_accommodations:
        features.append({
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [acc.longitude, acc.latitude]
            },
            "properties": {
                "id": acc.id,
                "name": acc.name,
                "source": acc.accommodation_source,
                "price": str(acc.price_per_night) if acc.price_per_night else "N/A",
                "rating": acc.rating or 0,
                "url": acc.url,
            }
        })
    
    return Response({
        "type": "FeatureCollection",
        "town_id": town_id,
        "town_name": town.name,
        "town_population": town.population,
        "search_radius_km": radius_km,
        "features": features,
        "count": len(features)
    })
    

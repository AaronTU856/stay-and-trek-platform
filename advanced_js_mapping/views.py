# advanced_js_mapping/views.py
from django.shortcuts import render
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.contrib.gis.geos import GEOSGeometry, Polygon
from django.contrib.gis.measure import Distance
from django.db.models import Count, Avg, Sum
from django.utils import timezone
import json
import time
import logging
from .models import PolygonAnalysis, SearchSession
from trails_api.models import Town

logger = logging.getLogger(__name__)

@csrf_exempt
@require_http_methods(["POST"])
def polygon_search(request):
    """
    Advanced spatial search endpoint - finds cities within a drawn polygon.

    This is the core function that performs PostGIS spatial queries.
    """
    start_time = time.time()

    try:
        # Parse incoming JSON data
        data = json.loads(request.body)
        polygon_geojson = data.get('polygon')
        filters = data.get('filters', {})

        if not polygon_geojson:
            return JsonResponse({
                'error': 'No polygon provided',
                'details': 'A valid GeoJSON polygon is required'
            }, status=400)

        # Create PostGIS polygon geometry from GeoJSON
        try:
            polygon_coords = polygon_geojson['coordinates'][0]
            # Ensure polygon is properly closed
            if polygon_coords[0] != polygon_coords[-1]:
                polygon_coords.append(polygon_coords[0])

            # Create PostGIS Polygon object
            polygon_geometry = Polygon(polygon_coords)

        except (KeyError, IndexError, ValueError) as e:
            return JsonResponse({
                'error': 'Invalid polygon format',
                'details': str(e)
            }, status=400)

        # SPATIAL QUERY: Find towns within polygon using PostGIS (compatibility with project)
        queryset = Town.objects.filter(location__within=polygon_geometry)

        # Apply additional filters if provided
        if filters.get('min_population'):
            queryset = queryset.filter(population__gte=filters['min_population'])
        if filters.get('countries'):
            queryset = queryset.filter(country__in=filters['countries'])

        # Execute query and get results
        # Map Town fields into a city-like dict for the frontend
        cities = []
        for t in queryset:
            lat = t.location.y if t.location else None
            lon = t.location.x if t.location else None
            cities.append({
                'id': t.id,
                'name': t.name,
                'country': getattr(t, 'country', '') or '',
                'latitude': lat,
                'longitude': lon,
                'population': t.population or 0,
                'area_km2': getattr(t, 'area', None),
                'gdp_per_capita': None,
                'unemployment_rate': None,
                'city_type': getattr(t, 'town_type', ''),
                'elevation_m': None,
            })

        # Calculate statistics
        total_population = queryset.aggregate(Sum('population'))['population__sum'] or 0
        avg_population = queryset.aggregate(Avg('population'))['population__avg'] or 0
        city_count = len(cities)

        # Calculate polygon area (simplified)
        polygon_area_km2 = polygon_geometry.area * 111.32 * 111.32  # Rough conversion

        # Create GeoJSON response
        features = []
        for city in cities:
            features.append({
                "type": "Feature",
                "geometry": {
                    "type": "Point",
                    "coordinates": [city['longitude'], city['latitude']]
                },
                "properties": city
            })

        # Calculate execution time
        execution_time_ms = int((time.time() - start_time) * 1000)

        # Save analysis for tracking
        try:
            analysis = PolygonAnalysis.objects.create(
                polygon_geojson=json.dumps(polygon_geojson),
                polygon_geometry=polygon_geometry,
                cities_count=city_count,
                total_population=total_population,
                average_population=avg_population,
                area_analyzed_km2=polygon_area_km2,
                session_key=getattr(request, 'session', None) and request.session.session_key,
                query_duration_ms=execution_time_ms
            )
        except Exception as e:
            logger.error(f"Failed to save analysis: {e}")

        # Return comprehensive results
        response_data = {
            'success': True,
            'results': {
                'geojson': {
                    "type": "FeatureCollection",
                    "features": features
                },
                'cities': cities,
                'analysis': {
                    'total_cities': city_count,
                    'total_population': total_population,
                    'average_population': round(avg_population, 0),
                    'polygon_area_km2': round(polygon_area_km2, 2),
                    'population_density': round(total_population / polygon_area_km2, 2) if polygon_area_km2 > 0 else 0,
                    'execution_time_ms': execution_time_ms
                }
            }
        }

        return JsonResponse(response_data)

    except json.JSONDecodeError:
        return JsonResponse({
            'error': 'Invalid JSON data',
            'details': 'Request body must contain valid JSON'
        }, status=400)

    except Exception as e:
        logger.error(f"Polygon search error: {e}")
        return JsonResponse({
            'error': 'Internal server error',
            'details': str(e)
        }, status=500)

def index_view(request):
    """Main page with application overview"""
    # Use Town model for counts to reflect existing project data
    total_cities = Town.objects.count()
    total_countries = Town.objects.values('country').distinct().count() if hasattr(Town, 'country') else 1

    context = {
        'total_cities': total_cities,
        'total_countries': total_countries,
    }

    return render(request, 'advanced_js_mapping/index.html', context)

def map_view(request):
    """Interactive map view"""
    context = {}
    return render(request, 'advanced_js_mapping/map.html', context)



# Add to advanced_js_mapping/views.py

def analytics_view(request):
    """Analytics dashboard with comprehensive statistics"""
    from django.db.models import Count, Avg, Sum
    import json

    # Basic statistics
    total_cities = Town.objects.count()
    total_countries = Town.objects.values('country').distinct().count() if hasattr(Town, 'country') else 1
    total_population = Town.objects.aggregate(Sum('population'))['population__sum'] or 0

    # Analysis statistics
    total_analyses = PolygonAnalysis.objects.count()
    recent_analyses = PolygonAnalysis.objects.filter(
        analysis_timestamp__gte=timezone.now() - timezone.timedelta(days=7)
    ).count()

    avg_cities_per_search = PolygonAnalysis.objects.aggregate(
        Avg('cities_count')
    )['cities_count__avg'] or 0

    avg_query_time = PolygonAnalysis.objects.aggregate(
        Avg('query_duration_ms')
    )['query_duration_ms__avg'] or 0

    # Countries chart data
    if hasattr(Town, 'country'):
        popular_countries = Town.objects.values('country').annotate(
            city_count=Count('id')
        ).order_by('-city_count')[:10]
    else:
        popular_countries = []

    countries_labels = json.dumps([country['country'] for country in popular_countries])
    countries_data = json.dumps([country['city_count'] for country in popular_countries])

    # Recent analyses
    recent_analyses_list = PolygonAnalysis.objects.order_by('-analysis_timestamp')[:10]

    context = {
        'total_cities': total_cities,
        'total_countries': total_countries,
        'total_population': total_population,
        'total_analyses': total_analyses,
        'recent_analyses': recent_analyses,
        'avg_cities_per_search': round(avg_cities_per_search, 1),
        'avg_query_time': round(avg_query_time, 1),
        'countries_labels': countries_labels,
        'countries_data': countries_data,
        'recent_analyses_list': recent_analyses_list,
    }

    return render(request, 'advanced_js_mapping/analytics.html', context)

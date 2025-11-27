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
from django.contrib.auth.decorators import login_required
from django.contrib.gis.geos import Point

# Set up logging
logger = logging.getLogger(__name__)

# Advanced spatial search endpoint which finds cities within a drawn polygon.
@csrf_exempt
@require_http_methods(["POST"])
def polygon_search(request):
    """
    Advanced spatial search endpoint - finds cities within a drawn polygon.

    This is the core function that performs PostGIS spatial queries.
    """
    start_time = time.time() # Start timer for performance measurement

    # dump raw request body for polygon POST (temporary — remove after debugging)
    try:
        raw_body = request.body.decode('utf-8')
    except Exception:
        raw_body = repr(request.body)
    logger.info(f"RAW POLYGON POST BODY: {raw_body[:2000]}")

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
            logger.debug(f"Received polygon payload type={type(polygon_geojson)} value={repr(polygon_geojson)[:500]}")

            # Accept several input shapes: dict with 'coordinates', dict with 'geometry',
            # or a raw list of coordinates
            coords_container = None
            if isinstance(polygon_geojson, dict):
                # shape: { 'type': 'Polygon', 'coordinates': [...] }
                if 'coordinates' in polygon_geojson:
                    coords_container = polygon_geojson['coordinates']
                # shape: { 'geometry': { 'type': 'Polygon', 'coordinates': [...] } }
                elif 'geometry' in polygon_geojson and isinstance(polygon_geojson['geometry'], dict) and 'coordinates' in polygon_geojson['geometry']:
                    coords_container = polygon_geojson['geometry']['coordinates']
                # sometimes client sends a Feature object with geometry nested under 'geometry'
                elif polygon_geojson.get('type', '').lower() == 'feature' and isinstance(polygon_geojson.get('geometry'), dict):
                    coords_container = polygon_geojson['geometry'].get('coordinates')
            elif isinstance(polygon_geojson, list):
                coords_container = polygon_geojson

            if coords_container is None:
                raise ValueError('Unsupported polygon payload type')

            # coords_container may be: [ [ [lng,lat], ... ] ]  (GeoJSON Polygon)
            # or a single linear ring: [ [lng,lat], ... ]
            if not coords_container:
                raise ValueError('Empty coordinates')

            # Determine ring (array of [lng,lat])
            first = coords_container[0]
            if isinstance(first, (list, tuple)) and len(first) > 0 and isinstance(first[0], (list, tuple)):
                # coords_container is [ [ [lng,lat], ... ] ]
                polygon_coords = list(first)
            elif isinstance(first, (list, tuple)) and isinstance(first[0], (int, float)):
                # coords_container is already the ring: [ [lng,lat], ... ]
                polygon_coords = list(coords_container)
            else:
                raise ValueError('Unsupported coordinates nesting')

            # Ensure polygon is properly closed
            if polygon_coords[0] != polygon_coords[-1]:
                polygon_coords.append(polygon_coords[0])

            # Build a GeoJSON Polygon and use GEOSGeometry so SRID is set correctly
            geojson_polygon = {
                'type': 'Polygon',
                'coordinates': [polygon_coords]
            }

            polygon_geometry = GEOSGeometry(json.dumps(geojson_polygon), srid=4326)

            # As a safety fallback, ensure SRID is set (models use 4326)
            if not getattr(polygon_geometry, 'srid', None):
                polygon_geometry.srid = 4326

            logger.debug(f"Parsed polygon with {len(polygon_coords)} points")

        except Exception as e:
            logger.error(f"Invalid polygon format: {e} -- payload={repr(polygon_geojson)[:1000]}")
            return JsonResponse({
                'error': 'Invalid polygon format',
                'details': str(e)
            }, status=400)

        # SPATIAL QUERY: attempt several approaches and gather counts for diagnostics
        within_count = 0
        intersects_count = 0
        bbox_count = 0
        used_method = 'within'

        try:
            queryset_within = Town.objects.filter # (location__within=polygon_geometry)
            within_count = queryset_within.count() 
        except Exception as e:
            logger.debug(f"within query failed: {e}")
            queryset_within = Town.objects.none()

        try:
            queryset_intersects = Town.objects.filter(location__intersects=polygon_geometry)
            intersects_count = queryset_intersects.count()
        except Exception as e:
            logger.debug(f"intersects query failed: {e}")
            queryset_intersects = Town.objects.none()

        # bounding box comparison
        try:
            bbox = polygon_geometry.extent  # (xmin, ymin, xmax, ymax)
            bbox_poly = Polygon.from_bbox(bbox)
            bbox_count = Town.objects.filter(location__within=bbox_poly).count()
            logger.info(f"Polygon extent: {bbox}, bbox_count={bbox_count}")
        except Exception as e:
            logger.debug(f"Could not compute bbox debug info: {e}")

        # Choose the best non-empty queryset (prefer within)
        if within_count > 0:
            queryset = queryset_within
            used_method = 'within'
        elif intersects_count > 0:
            queryset = queryset_intersects
            used_method = 'intersects'
        else:
            queryset = queryset_within
            used_method = 'within'

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

        # Log a brief summary for debugging: how many cities found and sample names
        try:
            sample_names = [c['name'] for c in cities][:10]
            logger.info(f"Polygon search found {len(cities)} cities (sample: {sample_names}) in {execution_time_ms}ms")
        except Exception:
            logger.info(f"Polygon search completed; cities_count={len(cities)}")

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
                    'execution_time_ms': execution_time_ms,
                    'debug': {
                        'bbox_count': bbox_count,
                        'within_count': within_count,
                        'intersects_count': intersects_count,
                        'used_method': used_method
                    }
                }
            }
        }

        # DEBUG: log the response payload (truncated) to help trace client/server mismatch
        try:
            logger.info(f"Polygon search response (truncated): {json.dumps(response_data)[:2000]}")
        except Exception:
            logger.info("Polygon search response prepared (could not serialize)")

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

@login_required
def index_view(request):
    """Main page with application overview"""
    # Use Town model for counts to reflect existing project data
    total_cities = Town.objects.count()
    total_countries = Town.objects.values('country').distinct().count() if hasattr(Town, 'country') else 1

    context = {
        'total_cities': total_cities,
        'total_countries': total_countries,
        'current_page': 'polygon_search',
    }

    return render(request, 'advanced_js_mapping/index.html', context)

@login_required
def map_view(request):
    """Interactive map view"""
    context = {
        'current_page': 'interactive_map',
    }
    return render(request, 'advanced_js_mapping/map.html', context)

@login_required
def analytics_view(request):
    """Analytics dashboard adapted for Town data."""
    from django.db.models import Count, Avg, Sum
    import json

    # Basic statistics
    total_cities = Town.objects.count()
    total_countries = Town.objects.values('country').distinct().count() if hasattr(Town, 'country') else 1
    total_population = Town.objects.aggregate(Sum('population'))['population__sum'] or 0

    # Analysis statistics (from PolygonAnalysis model)
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

    # Top cities by population
    top_cities_qs = Town.objects.order_by('-population')[:10]
    top_cities_by_population = [
        {
            'id': t.id,
            'name': getattr(t, 'name', ''),
            'country': getattr(t, 'country', '') or '',
            'population': t.population or 0,
        }
        for t in top_cities_qs
    ]

    # GDP data likely not available on Town; provide empty list if absent
    if hasattr(Town, 'gdp_per_capita'):
        top_cities_by_gdp_qs = Town.objects.exclude(gdp_per_capita__isnull=True).order_by('-gdp_per_capita')[:10]
        top_cities_by_gdp = [
            {'id': t.id, 'name': t.name, 'country': getattr(t, 'country', '') or '', 'gdp_per_capita': t.gdp_per_capita}
            for t in top_cities_by_gdp_qs
        ]
    else:
        top_cities_by_gdp = []

    # City types distribution (if town_type exists)
    if hasattr(Town, 'town_type'):
        types_qs = Town.objects.values('town_type').annotate(count=Count('id')).order_by('-count')
        type_labels = [t['town_type'] or 'Unknown' for t in types_qs]
        type_data = [t['count'] for t in types_qs]
    else:
        type_labels = []
        type_data = []

    # Countries chart data (top 10)
    if hasattr(Town, 'country'):
        popular_countries = Town.objects.values('country').annotate(
            city_count=Count('id')
        ).order_by('-city_count')[:10]
    else:
        popular_countries = []

    countries_labels = json.dumps([country['country'] or 'Unknown' for country in popular_countries])
    countries_data = json.dumps([country['city_count'] for country in popular_countries])

    # Population distribution buckets
    buckets = [
        ('<1k', 0, 999),
        ('1k-5k', 1000, 4999),
        ('5k-20k', 5000, 19999),
        ('20k+', 20000, None),
    ]
    pop_dist = []
    for label, low, high in buckets:
        if high is None:
            cnt = Town.objects.filter(population__gte=low).count()
        else:
            cnt = Town.objects.filter(population__gte=low, population__lte=high).count()
        pop_dist.append({'label': label, 'count': cnt})

    # Recent analyses list for table (keep as provided by model)
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
        'top_cities_by_population': top_cities_by_population,
        'top_cities_by_gdp': top_cities_by_gdp,
        'city_type_labels': json.dumps(type_labels),
        'city_type_data': json.dumps(type_data),
        'population_distribution': json.dumps(pop_dist),
        'current_page': 'analytics',
    }

    return render(request, 'advanced_js_mapping/analytics.html', context)



@login_required
def towns_management_view(request):
    """Town management interface for authenticated users"""
    context = {
        'user': request.user,
    }
    return render(request, 'advanced_js_mapping/towns_management.html', context)

# Town editing API endpoint with authentication and CSRF exemption
@csrf_exempt
@login_required
@require_http_methods(["GET", "PUT", "DELETE"])
def edit_town_api(request, town_id):
    """API endpoint for editing town data - requires authentication"""
    try:
        town = Town.objects.get(id=town_id)

        if request.method == 'GET':
            # Return town data
            lat = town.location.y if town.location else None
            lon = town.location.x if town.location else None
            
            return JsonResponse({
                'success': True,
                'town': {
                    'id': town.id,
                    'name': town.name,
                    'country': getattr(town, 'country', '') or '',
                    'latitude': lat,
                    'longitude': lon,
                    'population': town.population or 0,
                    'area_km2': getattr(town, 'area', None),
                    'town_type': getattr(town, 'town_type', '') or '',
                }
            })
        elif request.method == 'PUT':
            # Update town data
            data = json.loads(request.body)

            # Update fields if provided
            if 'name' in data:
                town.name = data['name']
            if 'country' in data:
                town.country = data['country']
            if 'population' in data:
                town.population = int(data['population'])
            if 'area_km2' in data and data['area_km2'] is not None:
                if hasattr(town, 'area'):
                    town.area = float(data['area_km2'])
            if 'town_type' in data:
                if hasattr(town, 'town_type'):
                    town.town_type = data['town_type']
            
            # Update location if coordinates provided
            if 'latitude' in data and 'longitude' in data:
                lat = float(data['latitude'])
                lon = float(data['longitude'])
                town.location = Point(lon, lat, srid=4326)

            town.save()

            lat = town.location.y if town.location else None
            lon = town.location.x if town.location else None

            return JsonResponse({
                'success': True,
                'message': f'Town {town.name} updated successfully',
                'town': {
                    'id': town.id,
                    'name': town.name,
                    'country': getattr(town, 'country', '') or '',
                    'latitude': lat,
                    'longitude': lon,
                    'population': town.population or 0,
                    'area_km2': getattr(town, 'area', None),
                    'town_type': getattr(town, 'town_type', '') or '',
                }
            })

        elif request.method == 'DELETE':
            # Delete town
            town_name = town.name
            town.delete()
            return JsonResponse({
                'success': True,
                'message': f'Town {town_name} deleted successfully'
            })

    except Town.DoesNotExist:
        return JsonResponse({
            'error': 'Town not found'
        }, status=404)

    except json.JSONDecodeError:
        return JsonResponse({
            'error': 'Invalid JSON data'
        }, status=400)

    except ValueError as e:
        return JsonResponse({
            'error': 'Invalid data format',
            'details': str(e)
        }, status=400)

    except Exception as e:
        logger.error(f"Town edit API error: {e}")
        return JsonResponse({
            'error': 'Internal server error',
            'details': str(e)
        }, status=500)

# Trails API endpoint to list or create trails
@csrf_exempt
@require_http_methods(["GET", "POST"])
def trails_api(request):
    """API endpoint to list or create trails"""
    if request.method == 'GET':
        # Return list of trails as JSON
        from trails_api.models import Trail
        
        trails = Trail.objects.all().values('id', 'trail_name', 'distance_km', 'difficulty', 'county')
        return JsonResponse({'success': True, 'trails': list(trails), 'count': len(list(trails))})
    
    elif request.method == 'POST':
        # Create new trail (requires authentication)
        if not request.user.is_authenticated:
            return JsonResponse({'success': False, 'error': 'Authentication required'}, status=401)
        
        try:
            from trails_api.models import Trail
            
            data = json.loads(request.body)
            trail = Trail.objects.create(
                trail_name=data.get('trail_name'),
                distance_km=data.get('distance_km', 0),
                difficulty=data.get('difficulty', 'Easy'),
                county=data.get('county', ''),
                region=data.get('region', ''),
            )
            return JsonResponse({'success': True, 'trail_id': trail.id, 'message': 'Trail created'})
        except Exception as e:
            logger.error(f"Trail creation error: {e}")
            return JsonResponse({'success': False, 'error': str(e)}, status=400)
  
# Distance search API endpoint      
@csrf_exempt
@require_http_methods(["POST"])
def distance_search(request):
    """Search towns within a distance radius"""
    try:
        data = json.loads(request.body)
        lat = data.get('latitude')
        lng = data.get('longitude')
        radius_km = data.get('radius_km', 10)
        
        center_point = Point(lng, lat, srid=4326)
        towns = Town.objects.filter(
            location__distance_lte=(center_point, Distance(km=radius_km))
        ).values('id', 'name', 'country', 'population')
        
        results = []
        for town in towns:
            results.append({
                'id': town['id'],
                'name': town['name'],
                'country': town.get('country', ''),
                'population': town['population'],
            })
        
        return JsonResponse({
            'success': True,
            'towns': results,
            'radius_km': radius_km,
            'count': len(results)
        })
    except Exception as e:
        logger.error(f'Distance search error: {str(e)}')
        return JsonResponse({'success': False, 'error': str(e)}, status=400)
        
        
        
        
        
        
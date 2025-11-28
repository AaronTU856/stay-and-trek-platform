app_name = 'trails_api'

from django.urls import path
from . import views
from .views import trail_map
from .views import api_test_view

app_name = 'trails'
# URL patterns for trails_api app
urlpatterns = [
    path('', views.TrailListCreateView.as_view(), name='trail-list-create'),
    path('<int:pk>/', views.TrailDetailView.as_view(), name='trail-detail'),
    path('search/', views.trail_search, name='trail_search'),
    path('map/', trail_map, name='map'),
    path('geojson/', views.trails_geojson, name='trails_geojson'),

    # Town endpoints
    path('towns/geojson/', views.towns_geojson, name='towns_geojson'),
    path('nearest-town/', views.nearest_town, name='nearest-town'),
    path('load-towns/', views.load_towns, name='load-towns'),

    # Spatial
    path('within-radius/', views.trails_within_radius, name='trails-within-radius'),
    path('bbox/', views.trails_in_bounding_box, name='trails-bbox'),
    path('paths/geojson/', views.trails_paths_geojson, name='trails_paths_geojson'),

    # Statistics
    path('stats/', views.trail_statistics, name='trail-statistics'),
    path('counties/', views.counties_list, name='countries-list'),
    path('info/', views.api_info, name='api-info'),
    path('test/', views.api_test_page, name='api-test'),
    
    # Weather endpoint for towns and trails
    path('weather/<int:pk>/', views.trail_weather, name='trail-weather'),
    path('weather-town/', views.town_weather, name='town-weather'),
    
    #  NEW POI ENDPOINTS
    path('pois/', views.PointOfInterestViewSet.as_view(), name='poi-list'),
    path('pois/type/<str:poi_type>/', views.POIByTypeView.as_view(), name='poi-by-type'),
    path('pois/near-trail/', views.pois_near_trail, name='pois-near-trail'),
    path('pois/radius-search/', views.pois_in_radius, name='pois-radius-search'),
    
    # GEOGRAPHIC BOUNDARY ENDPOINTS 
    path('boundaries/', views.GeographicBoundaryViewSet.as_view(), name='boundaries-list'),
    path('boundaries/<int:boundary_id>/trails-crossing/', views.trails_crossing_boundary, name='trails-crossing-boundary'),
    path('boundaries/county/<str:county_name>/trails/', views.trails_by_county_boundary, name='trails-by-county'),
    
    # Spatial analysis
    path('spatial-analysis/summary/', views.spatial_analysis_summary, name='spatial-analysis-summary'),
]


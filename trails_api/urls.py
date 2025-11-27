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
    
    #Weather endpoint for towns and trails
    path('weather/<int:pk>/', views.trail_weather, name='trail-weather'),
    path('weather-town/', views.town_weather, name='town-weather'),
    
]

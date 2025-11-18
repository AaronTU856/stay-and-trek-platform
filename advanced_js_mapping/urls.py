from django.urls import path
from . import views

app_name = 'advanced_js_mapping'

urlpatterns = [
    path('', views.index_view, name='index'),
    path('map/', views.map_view, name='map'),
    path('analytics/', views.analytics_view, name='analytics'),
    path('api/polygon-search/', views.polygon_search, name='polygon_search'),
    path('towns/', views.towns_management_view, name='towns_management'),
    
    
    path('api/trails/', views.trails_api, name='trails_api'),
    path('api/distance-search/', views.distance_search, name='distance_search'),
    path('api/town/edit/<int:town_id>/', views.edit_town_api, name='edit_town_api'),
]

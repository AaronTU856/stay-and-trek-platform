from django.urls import path
from . import views

app_name = 'advanced_js_mapping'

urlpatterns = [
    path('', views.index_view, name='index'),
    path('map/', views.map_view, name='map'),
    path('analytics/', views.analytics_view, name='analytics'),
    path('api/polygon-search/', views.polygon_search, name='polygon_search'),
]

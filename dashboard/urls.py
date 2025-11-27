from django.urls import path
from . import views

# URL patterns for dashboard app
urlpatterns = [
    path('', views.index, name='dashboard_index'),
    path('analytics/', views.analytics, name='dashboard_analytics'),
]

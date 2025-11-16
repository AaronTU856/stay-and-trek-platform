"""
URL configuration for webmapping_project project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/4.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView, SpectacularRedocView
from trails_api.views import trail_map

from webmapping_project import views as project_views 


urlpatterns = [
    path('admin/', admin.site.urls),

    # Home page (main map view)
    #path('', trail_map, name='home'),
    path('', project_views.home, name='home'),

    # Maps app
    path('maps/', include('maps.urls')),

    # Trails API
    path('api/trails/', include(('trails_api.urls', 'trails'), namespace='trails')),
    
    # Weather
    #path('api/trails/weather/<int:pk>/', views.trail_weather, name='trail-weather'),

    path('advanced-js-mapping/', include(('advanced_js_mapping.urls','advanced_js_mapping'), namespace='advanced_js_mapping')),

    # API documentation
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),

    # Dashboard
    path('dashboard/', include('dashboard.urls')),
    # Advanced JS Mapping app
    path('advanced-js-mapping/', include(('advanced_js_mapping.urls', 'advanced_js_mapping'), namespace='advanced_js_mapping')),
]

# Serve static and media files during development
if settings.DEBUG:
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
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
    
    # Authentication
    path('auth/', include('authentication.urls')),  # Add this line
]

# Serve static and media files during development
if settings.DEBUG:
    from django.views.static import serve as static_serve
    from django.urls import re_path
    import os
    from pathlib import Path
    
    # Helper to serve files from multiple static directories (root + app-specific)
    def static_files_view(request, path):
        """Serve static files from root static/ and app-specific static/ dirs"""
        # Try root static directory first
        root_static = settings.BASE_DIR / 'static'
        if (root_static / path).exists():
            return static_serve(request, path, document_root=str(root_static))
        
        # Try app-specific static directories
        # Path format: "trails_api/js/file.js" - split on first /
        if '/' in path:
            app_name = path.split('/')[0]
            remaining_path = path[len(app_name)+1:]  # Remove app_name/ prefix
            
            app_static_dir = settings.BASE_DIR / app_name / 'static' / app_name
            if app_static_dir.exists():
                full_path = app_static_dir / remaining_path
                if full_path.exists():
                    return static_serve(request, remaining_path, document_root=str(app_static_dir))
        
        # File not found - return 404
        from django.http import Http404
        raise Http404(f"Static file not found: {path}")
    
    # Serve static files directly from the source directories
    urlpatterns += [
        re_path(r'^static/(?P<path>.*)$', static_files_view),
        re_path(r'^media/(?P<path>.*)$', static_serve, {'document_root': str(settings.BASE_DIR / 'media')}),
    ]
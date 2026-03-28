from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView, SpectacularRedocView
from trails_api.views import trail_map
from trails_api.views import NearbyAccommodationView
from webmapping_project import views as project_views
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView


# Wires the main web pages, APIs, and app sections into one route table.
urlpatterns = [
    path('admin/', admin.site.urls),

    # Sends the root URL to the public landing page.
    path('', project_views.home, name='home'),
    
    # Exposes token endpoints for the mobile app and API clients.
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),

    # Hands off the map pages to the maps app.
    path('maps/', include(('maps.urls', 'maps'), namespace='maps')),

    # Hands off trail data and trail pages to the trails app.
    path('api/trails/', include(('trails_api.urls', 'trails'), namespace='trails')),

    # Opens the advanced mapping section.
    path('advanced-js-mapping/', include(('advanced_js_mapping.urls','advanced_js_mapping'), namespace='advanced_js_mapping')),

    # Publishes API schema and docs pages.
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),

    # Opens the analytics and dashboard section.
    path('dashboard/', include('dashboard.urls')),
    
    # Opens the login, signup, and profile pages.
    path('auth/', include('authentication.urls')),
]

# Serves local static and media files while developing.
if settings.DEBUG:
    from django.views.static import serve as static_serve
    from django.urls import re_path
    import os
    from pathlib import Path
    
    # Tries collected files first, then falls back to root and app static folders.
    def static_files_view(request, path):
        static_root = Path(settings.STATIC_ROOT)
        if (static_root / path).exists():
            return static_serve(request, path, document_root=str(static_root))

        root_static = settings.BASE_DIR / 'static'
        if (root_static / path).exists():
            return static_serve(request, path, document_root=str(root_static))
        
        if '/' in path:
            app_name = path.split('/')[0]
            remaining_path = path[len(app_name)+1:]
            
            app_static_dir = settings.BASE_DIR / app_name / 'static' / app_name
            if app_static_dir.exists():
                full_path = app_static_dir / remaining_path
                if full_path.exists():
                    return static_serve(request, remaining_path, document_root=str(app_static_dir))
        
        from django.http import Http404
        raise Http404(f"Static file not found: {path}")
    
    urlpatterns += [
        re_path(r'^static/(?P<path>.*)$', static_files_view),
        re_path(r'^media/(?P<path>.*)$', static_serve, {'document_root': str(settings.BASE_DIR / 'media')}),
    ]

from django.contrib.auth import get_user_model
import threading
import logging

# Creates a fallback admin account if the default one is missing.
def create_emergency_admin():
    try:
        User = get_user_model()
        if not User.objects.filter(username='admin').exists():
            User.objects.create_superuser(
                username='admin',
                email='admin@example.com',
                password='Clara2026'
            )
            print("✅ Successfully created superuser: admin")
    except Exception as e:
        print(f"⚠️ Superuser check skipped: {e}")

# Runs the admin check in the background so startup is not blocked.
threading.Thread(target=create_emergency_admin, daemon=True).start()

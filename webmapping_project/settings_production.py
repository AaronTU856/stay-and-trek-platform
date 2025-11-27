from .settings import *
import os

DEBUG = False

ALLOWED_HOSTS = ["127.0.0.1", "localhost", "::1", "Aarons-MacBook-Pro.local"]

CSRF_TRUSTED_ORIGINS = [
    "http://127.0.0.1",
    "http://127.0.0.1:8000",
    "http://localhost",
    "http://localhost:8000",
    "http://Aarons-MacBook-Pro.local",
    "http://Aarons-MacBook-Pro.local:8000",
]

# Security
SECURE_BROWSER_XSS_FILTER = True # Enable XSS filter
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = 'DENY'
SECURE_HSTS_SECONDS = 31536000 # 1 year
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True

# Database
DATABASES = {
    'default': {
        'ENGINE': 'django.contrib.gis.db.backends.postgis',
        'NAME': os.environ.get('DB_NAME', 'webmapping_db'),   
        'USER': os.environ.get('DB_USER', 'webmapping'),
        'PASSWORD': os.environ.get('DB_PASSWORD', 'awm123'),
        'HOST': os.environ.get('DB_HOST', 'localhost'),
        'PORT': os.environ.get('DB_PORT', '5432'),
    }
}

# Static files
STATIC_ROOT = BASE_DIR / 'staticfiles_production'   # <-- local safe path

# CORS
CORS_ALLOW_ALL_ORIGINS = True  # for local testing only

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',   # <-- must be here
    'django.contrib.gis',
    'maps',
    'apps.spatial_data_app',
]


MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",  
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]


STATIC_URL = '/static/'  
STATIC_ROOT = BASE_DIR / 'staticfiles_production'
STATICFILES_DIRS = [ BASE_DIR / 'static' ]  
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

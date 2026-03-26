"""
Local-only Django test settings for macOS/Homebrew GIS libraries.

This module is intentionally isolated from production and normal development
settings. It exists only to make local automated tests runnable with GeoDjango
and PostGIS on this machine.
"""

from .settings import *  # noqa: F401,F403
import os


# Use the local PostgreSQL/PostGIS instance for tests.
# Django's test runner will create and use a temporary test database derived
# from this configuration, rather than writing into the working database.
DATABASES = {
    "default": {
        "ENGINE": "django.contrib.gis.db.backends.postgis",
        "NAME": "webmapping_db",
        "USER": "aaronbaggot",
        "PASSWORD": "",
        "HOST": "127.0.0.1",
        "PORT": "5432",
    }
}


# Local Homebrew GIS libraries for macOS test execution.
GDAL_LIBRARY_PATH = "/opt/homebrew/opt/gdal/lib/libgdal.dylib"
GEOS_LIBRARY_PATH = "/opt/homebrew/opt/geos/lib/libgeos_c.dylib"
os.environ["PROJ_LIB"] = "/opt/homebrew/opt/proj/share/proj"


# Keep test startup isolated from non-test URL side effects.
ROOT_URLCONF = "webmapping_project.urls_test_local"

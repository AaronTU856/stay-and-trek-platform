"""
CI-friendly Django test settings for Cloud Build.

This module keeps automated tests isolated from local PostGIS and Cloud SQL by
using an in-memory SpatiaLite database inside the application container.
"""

from .settings import *  # noqa: F401,F403
import os


DATABASES = {
    "default": {
        "ENGINE": "django.contrib.gis.db.backends.spatialite",
        "NAME": ":memory:",
    }
}


SPATIALITE_LIBRARY_PATH = os.getenv(
    "SPATIALITE_LIBRARY_PATH",
    "/usr/lib/x86_64-linux-gnu/mod_spatialite.so",
)


ROOT_URLCONF = "webmapping_project.urls_test_local"

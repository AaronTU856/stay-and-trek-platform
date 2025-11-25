import sys
import os

# Disable pytest-django plugin for Docker Compose tests
pytest_plugins = []

# Set dummy environment variables to prevent import errors
os.environ.setdefault("GEOS_LIBRARY_PATH", "/usr/lib/libgeos_c.so")
os.environ.setdefault("GDAL_LIBRARY_PATH", "/usr/lib/libgdal.so")
os.environ.setdefault("PROJ_LIB", "/usr/share/proj")
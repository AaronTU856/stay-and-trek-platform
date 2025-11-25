#!/usr/bin/env python
"""Django's command-line utility for administrative tasks."""
import os
import sys
import ctypes
import platform

# Only preload GIS libs on macOS (development), not in Docker
if platform.system() == "Darwin":
    try:
        os.environ["GDAL_LIBRARY_PATH"] = "/opt/homebrew/lib/libgdal.dylib"
        os.environ["GEOS_LIBRARY_PATH"] = "/opt/homebrew/opt/geos/lib/libgeos_c.dylib"
        os.environ["PROJ_LIB"] = "/opt/homebrew/opt/proj/share/proj"

        # Preload before Django imports GIS
        ctypes.CDLL(os.environ["GDAL_LIBRARY_PATH"])
        ctypes.CDLL(os.environ["GEOS_LIBRARY_PATH"])
        print("✅ Preloaded GEOS & GDAL successfully")
    except (OSError, KeyError):
        pass  # Skip if libraries not found

def main():
    """Run administrative tasks."""
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "webmapping_project.settings")
    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "Couldn't import Django. Are you sure it's installed and "
            "available on your PYTHONPATH environment variable? Did you "
            "forget to activate a virtual environment?"
        ) from exc
    execute_from_command_line(sys.argv)

if __name__ == "__main__":
    main()


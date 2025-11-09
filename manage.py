#!/usr/bin/env python
"""Django's command-line utility for administrative tasks."""
import os
import sys
import ctypes

# Preload GIS libs on macOS ARM (Homebrew paths)
os.environ["GDAL_LIBRARY_PATH"] = "/opt/homebrew/lib/libgdal.dylib"
os.environ["GEOS_LIBRARY_PATH"] = "/opt/homebrew/opt/geos/lib/libgeos_c.dylib"
os.environ["PROJ_LIB"] = "/opt/homebrew/opt/proj/share/proj"

# Preload before Django imports GIS
ctypes.CDLL(os.environ["GDAL_LIBRARY_PATH"])
ctypes.CDLL(os.environ["GEOS_LIBRARY_PATH"])
print("✅ Preloaded GEOS & GDAL successfully")
def main():
    """Run administrative tasks."""
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "webmapping_project.settings")
    from django.core.management import execute_from_command_line
    execute_from_command_line(sys.argv)

if __name__ == "__main__":
    main()

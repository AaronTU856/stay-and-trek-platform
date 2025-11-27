from django.http import JsonResponse
import json
import os
from django.shortcuts import render

# Directory path for locating static JSON files
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Root view for maps landing page
def maps_home(request):
    """Landing page for maps app."""
    return render(request, 'maps/home.html')

# API view to add a new location
def add_location_api(request):
    return JsonResponse({"status": "ok", "message": "add_location_api placeholder"})

# API view to check status
def api_status(request):
    return JsonResponse({"status": "ok"})
# Test view to confirm environment is working
def environment_test(request):
    return JsonResponse({"environment": "working"})

# Test view to return static intersection data
def intersect_test(request):
    """Return static intersection data (safe fallback)."""
    try:
        file_path = os.path.join(os.path.dirname(__file__), "intersect_test.json")
        if os.path.exists(file_path):
            with open(file_path, "r") as f:
                data = json.load(f)
        else:
            data = {
                "trail_1": "Clara Esker Loop",
                "trail_2": "Clara Erry Way Loop",
                "intersection": {
                    "type": "Point",
                    "coordinates": [-7.586203962517108, 53.321348451041224]
                }
            }
        return JsonResponse(data)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)



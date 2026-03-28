from django.http import JsonResponse
import json
import os
from django.shortcuts import render

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Shows the landing page for the maps app.
def maps_home(request):
    return render(request, 'maps/home.html')

# Placeholder endpoint for adding a location.
def add_location_api(request):
    return JsonResponse({"status": "ok", "message": "add_location_api placeholder"})

# Simple health check for the maps API.
def api_status(request):
    return JsonResponse({"status": "ok"})

# Quick check that the runtime is working.
def environment_test(request):
    return JsonResponse({"environment": "working"})

# Returns a safe static intersection payload for testing.
def intersect_test(request):
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


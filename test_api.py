#!/usr/bin/env python
import os
import django
import requests

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'webmapping_project.settings')
django.setup()

# Test API directly
url = "http://localhost:8000/api/trails/boundaries/?boundary_type=river&limit=500"
response = requests.get(url)
data = response.json()

print(f"API Response:")
print(f"  Count: {data.get('count')}")
print(f"  Results in page: {len(data.get('results', []))}")
print(f"  Has next: {bool(data.get('next'))}")
print(f"  Next URL: {data.get('next')}")

if data.get('results'):
    first_result = data['results'][0]
    print(f"\nFirst result structure:")
    print(f"  Keys: {list(first_result.keys())}")
    print(f"  Has geom: {'geom' in first_result}")
    print(f"  Has geometry: {'geometry' in first_result}")
    if 'geom' in first_result:
        print(f"  Geom type: {type(first_result['geom'])}")
        print(f"  Geom keys: {list(first_result['geom'].keys()) if isinstance(first_result['geom'], dict) else 'N/A'}")

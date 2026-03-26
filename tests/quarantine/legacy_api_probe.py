#!/usr/bin/env python
"""
Legacy manual API probe.

Quarantined from automated discovery because it depends on a running local
server and is intended for ad hoc inspection rather than isolated test runs.
"""

import os

import django
import requests

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "webmapping_project.settings")
django.setup()

url = "http://localhost:8000/api/trails/boundaries/?boundary_type=river&limit=500"
response = requests.get(url)
data = response.json()

print("API Response:")
print(f"  Count: {data.get('count')}")
print(f"  Results in page: {len(data.get('results', []))}")
print(f"  Has next: {bool(data.get('next'))}")
print(f"  Next URL: {data.get('next')}")

if data.get("results"):
    first_result = data["results"][0]
    print("\nFirst result structure:")
    print(f"  Keys: {list(first_result.keys())}")
    print(f"  Has geom: {'geom' in first_result}")
    print(f"  Has geometry: {'geometry' in first_result}")
    if "geom" in first_result:
        print(f"  Geom type: {type(first_result['geom'])}")
        print(
            "  Geom keys: "
            f"{list(first_result['geom'].keys()) if isinstance(first_result['geom'], dict) else 'N/A'}"
        )

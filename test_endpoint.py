#!/usr/bin/env python
import requests
import json

# Test the API endpoint
response = requests.get('http://localhost:8000/api/trails/boundaries/9888/trails-crossing/geojson/')
print(f"Status: {response.status_code}")
data = response.json()
print(f"Response type: {type(data)}")

if isinstance(data, dict):
    print(f"Keys: {list(data.keys())}")
    if 'features' in data:
        print(f"Features count: {len(data['features'])}")
    else:
        print(f"Response: {json.dumps(data, indent=2)[:1000]}")
elif isinstance(data, list):
    print(f"Is list with {len(data)} items")
    if data:
        print(f"First item: {json.dumps(data[0], indent=2)[:500]}")

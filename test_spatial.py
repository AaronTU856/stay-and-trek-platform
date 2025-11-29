#!/usr/bin/env python
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'webmapping_project.settings')
django.setup()

from trails_api.models import GeographicBoundary, Trail

# Get rivers sorted by extent size (approximate length)
rivers = GeographicBoundary.objects.filter(boundary_type='river').all()
rivers_by_size = sorted(
    rivers,
    key=lambda r: abs(r.geom.extent[2] - r.geom.extent[0]) + abs(r.geom.extent[3] - r.geom.extent[1]),
    reverse=True
)

for boundary in rivers_by_size[:3]:
    print(f"\nTesting: {boundary.name}")
    print(f"  Extent: {boundary.geom.extent}")
    
    # Get crossing trails
    crossing = boundary.trails_crossing()
    print(f"  Crossing trails: {crossing.count()}")
    
    if crossing.count() > 0:
        print("  ✅ FOUND INTERSECTIONS!")
        for trail in crossing[:5]:
            print(f"    - {trail.trail_name}")
        break

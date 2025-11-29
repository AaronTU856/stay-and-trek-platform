#!/usr/bin/env python
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'webmapping_project.settings')
django.setup()

from trails_api.models import GeographicBoundary, Trail

# Find rivers with crossing trails
rivers_with_crossings = []
all_rivers = GeographicBoundary.objects.filter(boundary_type='river')[:100]

for river in all_rivers:
    crossing = river.trails_crossing()
    if crossing.count() > 0:
        rivers_with_crossings.append((river.name, river.id, crossing.count()))

print(f"Checked 100 rivers, found {len(rivers_with_crossings)} with crossing trails:")
for name, rid, count in rivers_with_crossings[:5]:
    print(f"  ID {rid}: {name} - {count} crossing trails")

# Also test Rapemills
try:
    rapemills = GeographicBoundary.objects.get(name='Rapemills River')
    print(f"\nRapemills River: ID {rapemills.id}")
    crossing = rapemills.trails_crossing()
    print(f"Crossing trails: {crossing.count()}")
    
    if crossing.count() == 0:
        # Check nearby trails
        from django.contrib.gis.geos import Polygon
        region = Polygon.from_bbox(rapemills.geom.extent)
        region_expanded = region.buffer(0.05)  # 0.05 degrees buffer
        nearby = Trail.objects.filter(path__intersects=region_expanded)
        print(f"Trails in expanded region: {nearby.count()}")
except:
    pass

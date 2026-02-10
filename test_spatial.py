#!/usr/bin/env python
import os
import django
import pytest

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'webmapping_project.settings')
django.setup()

from trails_api.models import Rivers, Trail

@pytest.mark.django_db
def test_rivers_exist():
    """Test that rivers have been loaded"""
    rivers = Rivers.objects.filter(boundary_type='river').all()
    assert rivers.count() > 0, "No rivers found in database"
    print(f"\n✅ Found {rivers.count()} rivers")

@pytest.mark.django_db
def test_top_rivers():
    """Test the top 3 largest rivers"""
    rivers = Rivers.objects.filter(boundary_type='river').all()
    if rivers.count() == 0:
        pytest.skip("No rivers in database")
    
    rivers_by_size = sorted(
        rivers,
        key=lambda r: abs(r.geom.extent[2] - r.geom.extent[0]) + abs(r.geom.extent[3] - r.geom.extent[1]),
        reverse=True
    )

    for boundary in rivers_by_size[:3]:
        print(f"\nTesting: {boundary.name}")
        print(f"  Extent: {boundary.geom.extent}")
        # Verify geometry exists
        assert boundary.geom is not None, f"River {boundary.name} has no geometry"
        assert boundary.geom.extent is not None, f"River {boundary.name} geometry has no extent"

@pytest.mark.django_db
def test_trails_exist():
    """Test that trails have been loaded"""
    trails = Trail.objects.all()
    assert trails.count() > 0, "No trails found in database"
    print(f"\n✅ Found {trails.count()} trails")

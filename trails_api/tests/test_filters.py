from django.contrib.gis.geos import Point
from django.test import TestCase

from trails_api.filters import TrailFilter
from trails_api.models import Trail


class TrailFilterTests(TestCase):
    """Tests for the TrailFilter configuration and basic filtering."""

    def setUp(self):
        Trail.objects.create(
            trail_name="Bray Head Loop",
            county="Wicklow",
            region="Leinster",
            distance_km=5.5,
            difficulty="easy",
            elevation_gain_m=250,
            start_point=Point(-6.092, 53.200, srid=4326),
        )
        Trail.objects.create(
            trail_name="Croagh Patrick Trail",
            county="Mayo",
            region="Connacht",
            distance_km=7.6,
            difficulty="hard",
            elevation_gain_m=750,
            start_point=Point(-9.667, 53.763, srid=4326),
        )

    def test_filter_meta_fields_match_expected_public_filters(self):
        self.assertEqual(
            TrailFilter.Meta.fields,
            ["county", "difficulty", "region"],
        )

    def test_filter_by_county_returns_matching_trails(self):
        trail_filter = TrailFilter(
            data={"county": "Wicklow"},
            queryset=Trail.objects.all(),
        )

        self.assertEqual(trail_filter.qs.count(), 1)
        self.assertEqual(trail_filter.qs.first().trail_name, "Bray Head Loop")

    def test_filter_by_difficulty_and_region_returns_matching_trails(self):
        trail_filter = TrailFilter(
            data={"difficulty": "hard", "region": "Connacht"},
            queryset=Trail.objects.all(),
        )

        self.assertEqual(trail_filter.qs.count(), 1)
        self.assertEqual(trail_filter.qs.first().trail_name, "Croagh Patrick Trail")


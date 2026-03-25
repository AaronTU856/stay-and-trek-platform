from django.contrib.gis.geos import Point
from django.test import TestCase

from trails_api.models import Town, Trail


class TrailModelTests(TestCase):
    """Model tests for Trail helpers and string output."""

    def setUp(self):
        self.trail = Trail.objects.create(
            trail_name="Bray Head Loop",
            county="Wicklow",
            region="Leinster",
            distance_km=5.5,
            difficulty="easy",
            elevation_gain_m=250,
            description="A scenic coastal loop.",
            start_point=Point(-6.092, 53.200, srid=4326),
        )

    def test_trail_string_representation_returns_name(self):
        self.assertIn("Bray Head Loop", str(self.trail))

    def test_trail_coordinates_properties_match_start_point(self):
        self.assertEqual(self.trail.longitude, -6.092)
        self.assertEqual(self.trail.latitude, 53.200)

    def test_trail_distance_is_numeric_and_positive(self):
        self.assertIsInstance(float(self.trail.distance_km), float)
        self.assertGreater(float(self.trail.distance_km), 0)


class TownModelTests(TestCase):
    """Model tests for Town behaviour."""

    def test_town_string_representation_returns_name(self):
        town = Town.objects.create(
            name="Westport",
            town_type="town",
            population=6000,
            location=Point(-9.5167, 53.8, srid=4326),
        )

        self.assertIn("Westport", str(town))


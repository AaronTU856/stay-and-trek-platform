from django.contrib.auth.models import User
from django.contrib.gis.geos import Point
from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from trails_api.models import Town, Trail


class TrailApiTests(TestCase):
    """API endpoint tests for list, detail, create, and GeoJSON responses."""

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="testuser",
            password="testpass123",
        )
        self.trail1 = Trail.objects.create(
            trail_name="Bray Head Loop",
            county="Wicklow",
            region="Leinster",
            distance_km=5.5,
            difficulty="easy",
            elevation_gain_m=250,
            description="A scenic coastal loop.",
            start_point=Point(-6.092, 53.200, srid=4326),
        )
        self.trail2 = Trail.objects.create(
            trail_name="Croagh Patrick Trail",
            county="Mayo",
            region="Connacht",
            distance_km=7.6,
            difficulty="hard",
            elevation_gain_m=750,
            description="Pilgrimage mountain trail.",
            start_point=Point(-9.667, 53.763, srid=4326),
        )
        self.town = Town.objects.create(
            name="Westport",
            town_type="town",
            population=6000,
            location=Point(-9.5167, 53.8, srid=4326),
        )

    def test_trail_list_endpoint_returns_200(self):
        response = self.client.get(reverse("trails:trail-list-create"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_trail_detail_endpoint_returns_requested_trail(self):
        response = self.client.get(
            reverse("trails:trail-detail", kwargs={"pk": self.trail1.pk})
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["trail_name"], "Bray Head Loop")

    def test_authenticated_user_can_create_trail(self):
        payload = {
            "trail_name": "Glendalough Valley Loop",
            "county": "Wicklow",
            "region": "Leinster",
            "distance_km": 8.2,
            "difficulty": "easy",
            "elevation_gain_m": 180,
            "description": "Scenic loop around the Upper Lake.",
            "latitude": 53.010,
            "longitude": -6.327,
            "dogs_allowed": True,
            "parking_available": "Yes",
        }

        self.client.force_authenticate(user=self.user)
        response = self.client.post(
            reverse("trails:trail-list-create"),
            payload,
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Trail.objects.count(), 3)

    def test_trails_geojson_endpoint_returns_feature_collection(self):
        response = self.client.get(reverse("trails:trails_geojson"))
        payload = response.json()

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(payload["type"], "FeatureCollection")
        self.assertIn("features", payload)
        self.assertGreater(len(payload["features"]), 0)

    def test_towns_geojson_endpoint_returns_200(self):
        response = self.client.get(reverse("trails:towns_geojson"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)


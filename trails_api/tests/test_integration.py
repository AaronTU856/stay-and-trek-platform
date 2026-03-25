from django.contrib.auth.models import User
from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from trails_api.models import Trail


class TrailIntegrationTests(TestCase):
    """Simple end-to-end tests covering multiple trail endpoints together."""

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="integrationuser",
            password="testpass123",
        )

    def test_created_trail_is_available_in_detail_and_geojson_views(self):
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
        create_response = self.client.post(
            reverse("trails:trail-list-create"),
            payload,
            format="json",
        )

        self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)

        trail = Trail.objects.get(trail_name="Glendalough Valley Loop")
        detail_response = self.client.get(
            reverse("trails:trail-detail", kwargs={"pk": trail.pk})
        )
        geojson_response = self.client.get(reverse("trails:trails_geojson"))
        radius_response = self.client.post(
            reverse("trails:trails-within-radius"),
            {"latitude": 53.010, "longitude": -6.327, "radius_km": 10},
            format="json",
        )

        self.assertEqual(detail_response.status_code, status.HTTP_200_OK)
        self.assertEqual(detail_response.data["trail_name"], "Glendalough Valley Loop")
        self.assertEqual(geojson_response.status_code, status.HTTP_200_OK)
        self.assertContains(geojson_response, "Glendalough Valley Loop")
        self.assertEqual(radius_response.status_code, status.HTTP_200_OK)
        self.assertEqual(radius_response.data["total_found"], 1)

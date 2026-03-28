from django.contrib.auth.models import User
from django.contrib.gis.geos import Point
from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from trails_api.models import Accommodation, Trail


class TrailIntegrationTests(TestCase):
    """Simple end-to-end tests covering multiple trail endpoints together."""

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="integrationuser",
            password="testpass123",
        )
        self.accommodation = Accommodation.objects.create(
            name="Lakeside Lodge",
            source="manual",
            external_id="integration-stay-001",
            location=Point(-6.327, 53.010, srid=4326),
            price_per_night=135.00,
            rating=4.8,
            url="https://example.com/stays/lakeside-lodge",
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
            secure=True,
        )

        self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)

        trail = Trail.objects.get(trail_name="Glendalough Valley Loop")
        detail_response = self.client.get(
            reverse("trails:trail-detail", kwargs={"pk": trail.pk}),
            secure=True,
        )
        geojson_response = self.client.get(
            reverse("trails:trails_geojson"),
            secure=True,
        )
        radius_response = self.client.post(
            reverse("trails:trails-within-radius"),
            {"latitude": 53.010, "longitude": -6.327, "radius_km": 10},
            format="json",
            secure=True,
        )

        self.assertEqual(detail_response.status_code, status.HTTP_200_OK)
        self.assertEqual(detail_response.data["trail_name"], "Glendalough Valley Loop")
        self.assertEqual(geojson_response.status_code, status.HTTP_200_OK)
        self.assertContains(geojson_response, "Glendalough Valley Loop")
        self.assertEqual(radius_response.status_code, status.HTTP_200_OK)
        self.assertEqual(radius_response.data["total_found"], 1)

    def test_search_point_returns_matching_trail_and_nearby_accommodation(self):
        trail = Trail.objects.create(
            trail_name="Glendalough Lakeside Walk",
            county="Wicklow",
            region="Leinster",
            distance_km=6.3,
            difficulty="easy",
            elevation_gain_m=140,
            description="A scenic walk with nearby accommodation.",
            start_point=Point(-6.327, 53.010, srid=4326),
        )

        radius_response = self.client.post(
            reverse("trails:trails-within-radius"),
            {"latitude": 53.010, "longitude": -6.327, "radius_km": 10},
            format="json",
            secure=True,
        )
        accommodation_response = self.client.get(
            reverse("trails:nearby-accommodations"),
            {"lat": 53.010, "lng": -6.327, "radius": 10},
            secure=True,
        )

        accommodation_payload = accommodation_response.json()
        feature_collection = accommodation_payload.get("results", accommodation_payload)

        self.assertEqual(radius_response.status_code, status.HTTP_200_OK)
        self.assertIn("search_point", radius_response.data)
        self.assertIn("radius_km", radius_response.data)
        self.assertIn("nearest_trails", radius_response.data)
        self.assertEqual(radius_response.data["search_point"]["lat"], 53.010)
        self.assertEqual(radius_response.data["search_point"]["lng"], -6.327)
        self.assertEqual(radius_response.data["radius_km"], 10.0)
        self.assertEqual(radius_response.data["total_found"], 1)
        self.assertEqual(
            radius_response.data["nearest_trails"][0]["name"],
            trail.trail_name,
        )
        self.assertEqual(
            radius_response.data["nearest_trails"][0]["county"],
            "Wicklow",
        )
        self.assertEqual(
            radius_response.data["nearest_trails"][0]["difficulty"],
            "easy",
        )
        self.assertEqual(
            radius_response.data["nearest_trails"][0]["latitude"],
            53.010,
        )
        self.assertEqual(
            radius_response.data["nearest_trails"][0]["longitude"],
            -6.327,
        )

        self.assertEqual(accommodation_response.status_code, status.HTTP_200_OK)
        self.assertEqual(feature_collection["type"], "FeatureCollection")
        self.assertIn("features", feature_collection)
        self.assertEqual(len(feature_collection["features"]), 1)
        self.assertEqual(
            feature_collection["features"][0]["properties"]["name"],
            "Lakeside Lodge",
        )
        self.assertEqual(
            feature_collection["features"][0]["properties"]["source"],
            "manual",
        )
        self.assertEqual(
            feature_collection["features"][0]["properties"]["price_per_night"],
            "135.00",
        )

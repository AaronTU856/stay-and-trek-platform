from django.contrib.gis.geos import Point
from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from unittest.mock import MagicMock, patch

from trails_api.models import Trail


class TrailViewTests(TestCase):
    """View-focused tests for custom API endpoints."""

    def setUp(self):
        self.client = APIClient()
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

    def test_trails_within_radius_returns_nearby_results(self):
        response = self.client.post(
            reverse("trails:trails-within-radius"),
            {"latitude": 53.2, "longitude": -6.1, "radius_km": 100},
            format="json",
            secure=True,
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("nearest_trails", response.data)
        self.assertGreaterEqual(response.data["total_found"], 1)

    def test_trails_within_radius_missing_fields_returns_400(self):
        response = self.client.post(
            reverse("trails:trails-within-radius"),
            {},
            format="json",
            secure=True,
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("error", response.data)
        self.assertEqual(
            response.data["error"],
            "Latitude and longitude are required.",
        )

    def test_trail_statistics_endpoint_returns_summary_data(self):
        response = self.client.get(
            reverse("trails:trail-statistics"),
            secure=True,
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("total_trails", response.data)
        self.assertIn("average_distance_km", response.data)
        self.assertEqual(response.data["total_trails"], 2)

    @patch("trails_api.views.connection.cursor")
    @patch("trails_api.views.find_route_with_expanding_radius")
    @patch("trails_api.views.get_road_node_for_point")
    def test_route_between_nodes_returns_numeric_route_distance(
        self,
        mock_get_road_node_for_point,
        mock_find_route_with_expanding_radius,
        mock_connection_cursor,
    ):
        mock_get_road_node_for_point.side_effect = [101, 202]
        mock_find_route_with_expanding_radius.return_value = {
            "ok": True,
            "geojson": """
                {
                    "type": "LineString",
                    "coordinates": [[-6.09, 53.21], [-6.07, 53.23], [-6.05, 53.24]]
                }
            """,
            "radius_used": 50000,
            "attempts": 1,
            "elapsed_seconds": 0.12,
        }

        mock_cursor = MagicMock()
        mock_cursor.fetchone.side_effect = [
            ('{"type":"Point","coordinates":[-6.09,53.21]}',),
            ('{"type":"Point","coordinates":[-6.05,53.24]}',),
        ]
        mock_connection_cursor.return_value.__enter__.return_value = mock_cursor

        response = self.client.post(
            reverse("trails:route-between-nodes"),
            {
                "trail_lat": 53.2,
                "trail_lng": -6.1,
                "acc_lat": 53.25,
                "acc_lng": -6.04,
            },
            format="json",
            secure=True,
        )

        payload = response.json()
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("route_distance_km", payload)
        self.assertIsInstance(payload["route_distance_km"], (int, float))
        self.assertGreater(payload["route_distance_km"], 0)

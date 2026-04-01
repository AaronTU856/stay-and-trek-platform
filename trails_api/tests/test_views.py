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

    @patch("trails_api.views.requests.get")
    def test_trail_weather_returns_weather_payload_for_valid_trail(self, mock_requests_get):
        mock_response = MagicMock()
        mock_response.json.return_value = {
            "weather": [{"description": "light rain"}],
            "main": {"temp": 9.4},
            "wind": {"speed": 4.1},
        }
        mock_requests_get.return_value = mock_response

        response = self.client.get(
            reverse("trails:trail-weather", kwargs={"pk": self.trail1.pk}),
            secure=True,
        )
        payload = response.json()

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(payload["weather"][0]["description"], "light rain")
        self.assertEqual(payload["main"]["temp"], 9.4)

    def test_trail_weather_returns_404_for_missing_trail(self):
        response = self.client.get(
            reverse("trails:trail-weather", kwargs={"pk": 999999}),
            secure=True,
        )
        payload = response.json()

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(payload["error"], "Trail not found")

    def test_town_weather_missing_coordinates_returns_400(self):
        response = self.client.get(
            reverse("trails:town-weather"),
            secure=True,
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["error"], "Missing coordinates")

    @patch("trails_api.views.requests.get")
    def test_town_weather_returns_weather_payload_for_valid_coordinates(
        self,
        mock_requests_get,
    ):
        mock_response = MagicMock()
        mock_response.json.return_value = {
            "weather": [{"description": "clear sky"}],
            "main": {"temp": 13.2},
            "wind": {"speed": 2.6},
        }
        mock_requests_get.return_value = mock_response

        response = self.client.get(
            reverse("trails:town-weather"),
            {"lat": 53.3498, "lng": -6.2603},
            secure=True,
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["weather"][0]["description"], "clear sky")
        self.assertEqual(response.data["main"]["temp"], 13.2)

    def test_route_between_nodes_missing_coordinates_returns_400(self):
        response = self.client.post(
            reverse("trails:route-between-nodes"),
            {
                "trail_lat": 53.2,
                "trail_lng": -6.1,
                "acc_lat": 53.25,
            },
            format="json",
            secure=True,
        )

        payload = response.json()
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(payload["error"], "Valid coordinates required")

    def test_route_between_nodes_invalid_coordinates_returns_400(self):
        response = self.client.post(
            reverse("trails:route-between-nodes"),
            {
                "trail_lat": "not-a-latitude",
                "trail_lng": -6.1,
                "acc_lat": 53.25,
                "acc_lng": -6.04,
            },
            format="json",
            secure=True,
        )

        payload = response.json()
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(payload["error"], "Valid coordinates required")

    @patch("trails_api.views.get_transport_route")
    def test_route_between_nodes_returns_fallback_when_no_route_found(
        self,
        mock_get_transport_route,
    ):
        mock_get_transport_route.return_value = {
            "status": "no_route_found",
            "error": "No route found within search radius",
        }

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
        self.assertEqual(payload["status"], "fallback")
        self.assertEqual(payload["route_error"], "No route found within search radius")
        self.assertIsNone(payload["routing_debug"])
        self.assertEqual(payload["type"], "FeatureCollection")
        self.assertEqual(payload["features"][0]["properties"]["segment"], "straight_line")
        self.assertNotIn("route_distance_km", payload)

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

    @patch("trails_api.views.connection.cursor")
    @patch("trails_api.views.get_road_nodes_for_point")
    @patch("trails_api.views.find_route_with_expanding_radius")
    @patch("trails_api.views.get_road_node_for_point")
    def test_route_between_nodes_tries_alternate_end_nodes_when_first_fails(
        self,
        mock_get_road_node_for_point,
        mock_find_route_with_expanding_radius,
        mock_get_road_nodes_for_point,
        mock_connection_cursor,
    ):
        mock_get_road_node_for_point.side_effect = [101, 202]
        mock_get_road_nodes_for_point.return_value = [202, 303]
        mock_find_route_with_expanding_radius.side_effect = [
            {
                "ok": False,
                "geojson": None,
                "radius_used": 140680,
                "attempts": 4,
                "elapsed_seconds": 1.9,
                "error": "No route found before time limit was reached",
            },
            {
                "ok": True,
                "geojson": """
                    {
                        "type": "LineString",
                        "coordinates": [[-6.09, 53.21], [-6.07, 53.23], [-6.05, 53.24]]
                    }
                """,
                "radius_used": 15000,
                "attempts": 1,
                "elapsed_seconds": 0.42,
            },
        ]

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
        self.assertEqual(payload["status"], "success_v2")
        self.assertEqual(payload["features"][1]["properties"]["end_node_candidate"], 2)

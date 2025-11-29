from django.urls import reverse
from rest_framework.test import APITestCase
import json

class TrailsWithinRadiusAPITest(APITestCase):
    """Automated test for validating spatial query input handling."""

    def test_missing_fields_returns_400(self):
        url = reverse('trails:trails-within-radius')  # name from urls.py
        response = self.client.post(url, {}, format='json')

        # Assert correct status code
        self.assertEqual(response.status_code, 400)

        # Assert JSON contains the error message
        self.assertIn('error', response.data)
        self.assertEqual(response.data['error'], "Latitude and longitude are required.")
    
    payload = {
    "trail_name": "Test Trail",
    "county": "Donegal",
    "distance_km": 5.0,
    "elevation_gain_m": 120,
    "start_point": "POINT(-8.2 55.0)",
}


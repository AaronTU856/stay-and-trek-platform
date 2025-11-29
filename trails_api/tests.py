from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.gis.geos import Point
from django.contrib.auth.models import User
from trails_api.models import Trail
import json

# Test cases for Trails API
class TrailAPITestCase(APITestCase):
    """Test cases for Trails API endpoints and spatial queries"""

    def setUp(self):
        """Set up test data with sample trails and user authentication"""
        # Create a test user for authentication
        self.user = User.objects.create_user(
            username='testuser',
            password='testpass123'
        )
        
        self.trail1 = Trail.objects.create(
            trail_name="Bray Head Loop",
            county="Wicklow",
            region="Leinster",
            distance_km=5.5,
            difficulty="easy",
            elevation_gain_m=250,
            description="A scenic coastal loop.",
            start_point=Point(-6.092, 53.200, srid=4326)
        )
        self.trail2 = Trail.objects.create(
            trail_name="Croagh Patrick Trail",
            county="Mayo",
            region="Connacht",
            distance_km=7.6,
            difficulty="hard",
            elevation_gain_m=750,
            description="Pilgrimage mountain trail.",
            start_point=Point(-9.667, 53.763, srid=4326)
        )

    # Test trail list endpoint
    def test_trail_list(self):
        """Test trail list endpoint"""
        url = reverse('trails:trail-list-create')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    # Test trail detail endpoint
    def test_trail_detail(self):
        """Test trail detail endpoint retrieves correct trail information"""
        url = reverse('trails:trail-detail', kwargs={'pk': self.trail1.pk})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['trail_name'], 'Bray Head Loop')

    # Test trail creation endpoint
    def test_trail_creation(self):
        """Test creating a new trail requires authentication"""
        url = reverse('trails:trail-list-create')
        data = {
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
            "parking_available": "Yes"
        }

        # Authenticate user for POST request
        self.client.force_authenticate(user=self.user)
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Trail.objects.count(), 3)

    # Test spatial within-radius query
    def test_within_radius_query(self):
        """Test spatial within-radius query finds nearby trails"""
        url = reverse('trails:trails-within-radius')
        data = {'latitude': 53.2, 'longitude': -6.1, 'radius_km': 100}
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('nearest_trails', response.data)
        # Should find at least one trail (Bray Head Loop is at 53.200, -6.092)
        self.assertGreaterEqual(response.data['total_found'], 1)

    # Test statistics endpoint
    def test_statistics_endpoint(self):
        """Test statistics endpoint returns aggregated trail data"""
        url = reverse('trails:trail-statistics')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('total_trails', response.data)
        self.assertIn('average_distance_km', response.data)
        self.assertEqual(response.data['total_trails'], 2)

    # Test string representation of Trail model
    def test_string_representation(self):
        """Test string representation of Trail model"""
        self.assertIn('Bray Head Loop', str(self.trail1))

    # Test latitude and longitude properties
    def test_coordinates_properties(self):
        """Test latitude and longitude properties of trail start point"""
        self.assertEqual(self.trail1.start_point.x, -6.092)
        self.assertEqual(self.trail1.start_point.y, 53.200)

    # Test distance field
    def test_distance_field(self):
        """Test distance field contains valid numeric data"""
        self.assertIsInstance(float(self.trail1.distance_km), float)
        self.assertGreater(float(self.trail1.distance_km), 0)

    # Test GeoJSON format
    def test_geojson_format(self):
        """Test trails return valid GeoJSON format"""
        url = reverse('trails:trails_geojson')
        response = self.client.get(url)
        data = response.json()
        self.assertEqual(data['type'], 'FeatureCollection')
        self.assertIn('features', data)
        self.assertGreater(len(data['features']), 0)


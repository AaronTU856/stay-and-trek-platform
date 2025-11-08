from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.gis.geos import Point
from trails_api.models import Trail


class TrailAPITestCase(APITestCase):
    """Test cases for Trails API"""

    def setUp(self):
        self.trail1 = Trail.objects.create(
            trail_name="Bray Head Loop",
            county="Wicklow",
            region="Leinster",
            distance_km=5.5,
            difficulty="Moderate",
            elevation_gain_m=250,
            description="A scenic coastal loop.",
            start_point=Point(-6.092, 53.200, srid=4326)
        )
        self.trail2 = Trail.objects.create(
            trail_name="Croagh Patrick Trail",
            county="Mayo",
            region="Connacht",
            distance_km=7.6,
            difficulty="Hard",
            elevation_gain_m=750,
            description="Pilgrimage mountain trail.",
            start_point=Point(-9.667, 53.763, srid=4326)
        )

    def test_trail_list(self):
        """Test trail list endpoint"""
        url = reverse('trails:trail-list-create')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_trail_detail(self):
        """Test trail detail endpoint"""
        url = reverse('trails:trail-detail', kwargs={'pk': self.trail1.pk})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['trail_name'], 'Bray Head Loop')

    def test_trail_creation(self):
        """Test creating a new trail"""
        url = reverse('trails:trail-list-create')
        data = {
            "trail_name": "Glendalough Valley Loop",
            "county": "Wicklow",
            "region": "Leinster",
            "distance_km": 8.2,
            "difficulty": "Easy",
            "elevation_gain_m": 180,
            "description": "Scenic loop around the Upper Lake.",
            "latitude": 53.010,
            "longitude": -6.327
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Trail.objects.count(), 3)

    def test_within_radius_query(self):
        """Test spatial within-radius query"""
        url = reverse('trails:trails-within-radius')
        data = {'latitude': 53.0, 'longitude': -6.0, 'radius_km': 100}
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('nearest_trails', response.data)
        self.assertGreaterEqual(response.data['total_found'], 1)

    def test_statistics_endpoint(self):
        """Test statistics endpoint"""
        url = reverse('trails:trail-statistics')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('total_trails', response.data)
        self.assertIn('average_distance_km', response.data)


class TrailModelTestCase(TestCase):
    """Test cases for Trail model"""

    def setUp(self):
        self.trail = Trail.objects.create(
            trail_name='Test Trail',
            county='Test County',
            region='Test Region',
            distance_km=10.5,
            difficulty='Moderate',
            elevation_gain_m=200,
            description='A test trail for unit testing',
            start_point=Point(0, 0, srid=4326)
        )

    def test_string_representation(self):
        self.assertIn('Test Trail', str(self.trail))

    def test_coordinates_properties(self):
        self.assertEqual(self.trail.start_point.x, 0)
        self.assertEqual(self.trail.start_point.y, 0)

    def test_distance_field(self):
        self.assertIsInstance(self.trail.distance_km, float)
        self.assertGreater(self.trail.distance_km, 0)

    def test_geojson_format(self):
        url = reverse('trails_geojson')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['type'], 'FeatureCollection')
        self.assertIn('features', response.data)

from django.db import models
from django.contrib.gis.db import models as gis_models
from django.contrib.gis.geos import Point, Polygon
from django.contrib.gis.measure import Distance
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils import timezone


# Custom manager for Trail model with spatial queries
class TrailManager(models.Manager):
    """Custom manager for trail model with spatial queries"""

    def within_radius(self, center_point, radius_km):
        """
        Find trails within a specified radius of a point.
        """
        return self.filter(
            start_point__distance_lte=(center_point, Distance(km=radius_km))
        )

    def in_bounding_box(self, bbox):
        """
        Find trails within a bounding box.
        """
        min_lng, min_lat, max_lng, max_lat = bbox
        bbox_polygon = Polygon.from_bbox((min_lng, min_lat, max_lng, max_lat))
        return self.filter(start_point__within=bbox_polygon)

    def nearest_to_point(self, point, limit=10):
        """
        Find nearest trails to a point.
        """
        from django.contrib.gis.db.models.functions import Distance as DistanceFunction
        return self.annotate(
            distance=DistanceFunction('location', point)
        ).order_by('distance')[:limit]

    def __str__(self):
        return f"{self.trail_name}, {self.county}"

    @property
    def latitude(self):
        """Return latitude coordinate."""
        return self.start_point.y if self.start_point else None

    @property
    def longitude(self):
        """Return longitude coordinate."""
        return self.start_point.x if self.start_point else None

    @property
    def coordinates(self):
        """Return coordinates as [longitude, latitude] for GeoJSON."""
        return [self.longitude, self.latitude] if self.start_point else None

class Trail(models.Model):
    """Main Trail model containing spatial and descriptive data."""

    DIFFICULTY_CHOICES = [
        ('easy', 'Easy'),
        ('moderate', 'Moderate'),
        ('hard', 'Hard'),
    ]

    YES_NO_CHOICES = [
        ('yes', 'Yes'),
        ('no', 'No'),
    ]
    
    def __str__(self):
        return self.trail_name
    path = gis_models.LineStringField(srid=4326, null=True, blank=True)
    trail_name = models.CharField(max_length=200, db_index=True)
    county = models.CharField(max_length=100, db_index=True)
    region = models.CharField(max_length=200, blank=True)
    distance_km = models.DecimalField(
        max_digits=20,
        decimal_places=2,
        help_text="Trail length in kilometers",
    )
    difficulty = models.CharField(
        max_length=100,
        choices=DIFFICULTY_CHOICES,
        default='moderate',
    )
    elevation_gain_m = models.IntegerField(help_text="Total elevation gain in meters")
    description = models.TextField(blank=True, null=True)
    start_point = gis_models.PointField(
        srid=4326,
        help_text="Trail start coordinates, longitude, latitude",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    activity = models.CharField(max_length=100, blank=True)
    nearest_town = models.CharField(max_length=100, blank=True)
    dogs_allowed = models.CharField(
        max_length=3,
        choices=[('yes', 'Yes'), ('no', 'No')],
        default='yes',
    )
    facilities = models.TextField(blank=True)
    public_transport = models.TextField(blank=True)
    trail_type = models.CharField(max_length=100, blank=True)
    parking_available = models.CharField(max_length=100, blank=True)
    class Meta:
        verbose_name = 'Trail'
        verbose_name_plural = "Trails"
        ordering = ['trail_name']
        indexes = [
            models.Index(fields=['county'], name='trails_api_county_idx'),
            models.Index(fields=['difficulty'], name='trails_api_difficulty_idx'),
        ]


class Town(models.Model):
    """Stores town data with location and population details."""

    name = models.CharField(max_length=100)
    location = gis_models.PointField()
    town_type = models.CharField(max_length=50, blank=True, null=True)
    population = models.IntegerField(blank=True, null=True)
    area = models.FloatField(blank=True, null=True)

    def __str__(self):
        return self.name

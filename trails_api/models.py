from django.db import models
from django.contrib.gis.db import models as gis_models
from django.contrib.gis.geos import Point, Polygon
from django.contrib.gis.measure import Distance
from django.core.validators import MinValueValidator, MaxValueValidator


# CUSTOM MANAGER FOR TRAIL 
class TrailManager(models.Manager):
    """Custom manager for trail model with spatial queries"""
    # Search trails within a radius of a point on the map
    def within_radius(self, center_point, radius_km):
        """Find trails within a specified radius of a point."""
        return self.filter(
            start_point__distance_lte=(center_point, Distance(km=radius_km))
        )
    # Search trails within a bounding box
    def in_bounding_box(self, bbox):
        """Find trails within a bounding box."""
        min_lng, min_lat, max_lng, max_lat = bbox
        # Create Polygon from bbox
        bbox_polygon = Polygon.from_bbox((min_lng, min_lat, max_lng, max_lat))
        return self.filter(start_point__within=bbox_polygon)
    # Find nearest trails to a given point
    def nearest_to_point(self, point, limit=10):
        """Find nearest trails to a point."""
        # Import Distance function here to avoid circular import issues
        from django.contrib.gis.db.models.functions import Distance as DistanceFunction
        # Annotate distance and order by it
        return self.annotate(
            distance=DistanceFunction('start_point', point)
        ).order_by('distance')[:limit]


# TRAIL MODEL 
class Trail(models.Model):
    """Main Trail model containing spatial and descriptive data."""

    DIFFICULTY_CHOICES = [
        ('easy', 'Easy'),
        ('moderate', 'Moderate'),
        ('hard', 'Hard'),
    ]

    # Core Information
    trail_name = models.CharField(max_length=200, db_index=True)
    description = models.TextField(blank=True, null=True)
    activity = models.CharField(max_length=100, blank=True)
    
    # Location
    county = models.CharField(max_length=100, db_index=True)
    region = models.CharField(max_length=200, blank=True)
    nearest_town = models.CharField(max_length=100, blank=True)
    
    # Trail Characteristics
    distance_km = models.DecimalField(
        max_digits=20,
        decimal_places=2,
        validators=[MinValueValidator(0)],
        help_text="Trail length in kilometers",
    )
    difficulty = models.CharField(
        max_length=100,
        choices=DIFFICULTY_CHOICES,
        default='moderate',
        db_index=True,
    )
    elevation_gain_m = models.IntegerField(
        validators=[MinValueValidator(0)],
        help_text="Total elevation gain in meters"
    )
    
    # Spatial Data
    start_point = gis_models.PointField(
        srid=4326,
        help_text="Trail start coordinates (longitude, latitude)",
    )
    path = gis_models.MultiLineStringField(srid=4326, null=True, blank=True)
    
    # Amenities & Features
    dogs_allowed = models.BooleanField(default=True, null=True, blank=True) # Whether dogs are allowed on the trail
    parking_available = models.CharField(max_length=100, blank=True) # Parking information
    public_transport = models.TextField(blank=True) # Public transport options (Not Implemented)
    facilities = models.TextField(blank=True) # Available facilities
    trail_type = models.CharField(max_length=100, blank=True) # Type of trail ( loop, Greenway, out-and-back)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Use custom manager
    objects = TrailManager()
    
    # Meta information for the Trail model
    class Meta:
        verbose_name = 'Trail'
        verbose_name_plural = "Trails"
        ordering = ['trail_name']
        indexes = [
            models.Index(fields=['county'], name='trails_api_county_idx'),
            models.Index(fields=['difficulty'], name='trails_api_difficulty_idx'),
        ]
    
    def __str__(self):
        return self.trail_name
    # Properties to extract latitude and longitude from start_point
    @property
    def latitude(self):
        """Return latitude coordinate."""
        return self.start_point.y if self.start_point else None

    @property
    def longitude(self):
        """Return longitude coordinate."""
        return self.start_point.x if self.start_point else None
    # co-ordinates property for GeoJSON compatibility
    @property
    def coordinates(self):
        """Return coordinates as [longitude, latitude] for GeoJSON."""
        return [self.longitude, self.latitude] if self.start_point else None
    
    @property
    def duration_hours(self):
        """Estimate hiking duration based on distance and difficulty."""
        base_speed = {'easy': 4, 'moderate': 3.5, 'hard': 2.5}
        speed = base_speed.get(self.difficulty, 3)
        return round(float(self.distance_km) / speed, 1)


# TOWN MODEL 
class Town(models.Model):
    """Town/City with location and demographic data."""

    TOWN_TYPE_CHOICES = [
        ('capital', 'Capital'),
        ('city', 'City'),
        ('town', 'Town'),
        ('village', 'Village'),
    ]

    # Core Information
    name = models.CharField(max_length=100, db_index=True)
    country = models.CharField(max_length=100, db_index=True, default='Ireland')
    town_type = models.CharField(
        max_length=50, 
        choices=TOWN_TYPE_CHOICES,
        default='town',
        blank=True, 
        null=True
    )
    is_capital = models.BooleanField(default=False, db_index=True)
    
    # Spatial Data 
    location = gis_models.PointField(srid=4326)
    
    # Demographics
    population = models.IntegerField(
        blank=True, 
        null=True,
        validators=[MinValueValidator(0)],
        db_index=True
    )
    area = models.FloatField(
        blank=True, 
        null=True,
        validators=[MinValueValidator(0)],
        help_text="Area in km²"
    )
    
    # Optional Fields (for enhanced analytics)
    elevation_m = models.IntegerField(null=True, blank=True)
    gdp_per_capita = models.DecimalField(
        max_digits=12, 
        decimal_places=2, 
        null=True, 
        blank=True
    )
    
    # Socioeconomic Data not implemented
    unemployment_rate = models.FloatField(
        null=True, 
        blank=True,
        validators=[MinValueValidator(0), MaxValueValidator(100)]
    )
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # Meta information for the Town model
    class Meta:
        verbose_name = 'Town'
        verbose_name_plural = 'Towns'
        ordering = ['name']
        indexes = [
            models.Index(fields=['country'], name='town_country_idx'),
            models.Index(fields=['population'], name='town_population_idx'),
        ]

    def __str__(self):
        return self.name
    
    @property
    def latitude(self):
        """Get latitude from location point."""
        return self.location.y if self.location else None
    
    @property
    def longitude(self):
        """Get longitude from location point."""
        return self.location.x if self.location else None
    
    @property
    def population_density(self):
        """Calculate population density (people/km²)."""
        if self.area and self.area > 0 and self.population:
            return round(self.population / self.area, 2)
        return None


# POINT OF INTEREST MODEL
class PointOfInterest(models.Model):
    """Model for Points of Interest (POIs) near trails: parking, cafes, attractions, etc."""
    
    POI_TYPE_CHOICES = [
        ('parking', 'Parking'),
        ('cafe', 'Café'),
        ('restaurant', 'Restaurant'),
        ('attraction', 'Attraction'),
        ('viewpoint', 'Viewpoint'),
        ('toilet', 'Toilet Facilities'),
        ('shelter', 'Shelter'),
        ('picnic', 'Picnic Area'),
        ('information', 'Information Center'),
        ('accommodation', 'Accommodation'),
    ]
    
    name = models.CharField(max_length=200, db_index=True)
    poi_type = models.CharField(max_length=50, choices=POI_TYPE_CHOICES, db_index=True)
    description = models.TextField(blank=True, null=True)
    location = gis_models.PointField(geography=True, db_index=True)
    
    # Additional info
    county = models.CharField(max_length=100, blank=True, db_index=True)
    region = models.CharField(max_length=100, blank=True)
    phone = models.CharField(max_length=20, blank=True)
    website = models.URLField(blank=True, null=True)
    opening_hours = models.CharField(max_length=200, blank=True)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        indexes = [
            models.Index(fields=['poi_type', 'county']),
        ]
        verbose_name = "Point of Interest"
        verbose_name_plural = "Points of Interest"
    
    def __str__(self):
        return f"{self.name} ({self.get_poi_type_display()})"
    
    @property
    def latitude(self):
        return self.location.y if self.location else None
    
    @property
    def longitude(self):
        return self.location.x if self.location else None
    
    def distance_to_point(self, point):
        """Calculate distance in km to another point."""
        return self.location.distance(point).km


# TRAIL-POI INTERSECTION MODEL
class TrailPOIIntersection(models.Model):
    """Model to track POIs near trails and their distance/relationship."""
    
    trail = models.ForeignKey(Trail, on_delete=models.CASCADE, related_name='nearby_pois')
    poi = models.ForeignKey(PointOfInterest, on_delete=models.CASCADE, related_name='nearby_trails')
    
    # Distance from trail to POI in meters
    distance_meters = models.IntegerField()
    
    # Whether POI is directly on the trail route
    on_trail_route = models.BooleanField(default=False)
    
    # Proximity category
    PROXIMITY_CHOICES = [
        ('at_start', 'At Trail Start'),
        ('at_end', 'At Trail End'),
        ('very_close', 'Very Close (< 100m)'),
        ('close', 'Close (100m - 500m)'),
        ('moderate', 'Moderate (500m - 2km)'),
        ('far', 'Far (> 2km)'),
    ]
    proximity = models.CharField(max_length=20, choices=PROXIMITY_CHOICES)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ('trail', 'poi')
        ordering = ['distance_meters']
        indexes = [
            models.Index(fields=['trail', 'proximity']),
            models.Index(fields=['poi', 'distance_meters']),
        ]
    
    def __str__(self):
        return f"{self.trail.trail_name} - {self.poi.name} ({self.distance_meters}m)"
    
    @classmethod
    def categorize_proximity(cls, distance_meters):
        """Categorize distance into proximity categories."""
        if distance_meters < 50:
            return 'at_start'
        elif distance_meters < 100:
            return 'very_close'
        elif distance_meters < 500:
            return 'close'
        elif distance_meters < 2000:
            return 'moderate'
        else:
            return 'far'


# GEOGRAPHIC BOUNDARY MODEL
class Rivers(models.Model):
    """Model to represent geographic boundaries (counties, regions, protected areas, rivers)."""
    
    BOUNDARY_TYPE_CHOICES = [
        ('county', 'County'),
        ('region', 'Region'),
        ('protected_area', 'Protected Area'),
        ('national_park', 'National Park'),
        ('nature_reserve', 'Nature Reserve'),
        ('forest', 'Forest'),
        ('river', 'River'),
        ('marine_protected', 'Marine Protected Area'),
    ]
    
    name = models.CharField(max_length=200, db_index=True)
    boundary_type = models.CharField(max_length=50, choices=BOUNDARY_TYPE_CHOICES)
    # Use GeometryField to support both Polygon and LineString
    geom = gis_models.GeometryField(geography=True, db_index=True)
    
    description = models.TextField(blank=True)
    established_date = models.DateField(blank=True, null=True)
    
    class Meta:
        verbose_name = "Geographic Boundary"
        verbose_name_plural = "Geographic Boundaries"
        db_table = 'trails_api_geographicboundary'
    
    def __str__(self):
        return f"{self.name} ({self.get_boundary_type_display()})"
    
    def trails_crossing(self):
        """Get all trails that intersect this boundary (more inclusive than crosses)."""
        return Trail.objects.filter(path__intersects=self.geom, path__isnull=False)
    
    def trails_within(self):
        """Get all trails within this boundary."""
        return Trail.objects.filter(path__within=self.geom, path__isnull=False)
    
    def trail_intersection_points(self, trail):
        """Get points where a trail intersects this boundary."""
        if trail.path:
            return trail.path.intersection(self.geom)
        return None


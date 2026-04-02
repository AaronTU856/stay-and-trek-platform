from django.db import models
from django.contrib.gis.db import models as gis_models
from django.contrib.gis.geos import Point, Polygon
from django.contrib.gis.measure import Distance
from django.core.validators import MinValueValidator, MaxValueValidator
from django.conf import settings


# Spatial helpers used by the trail queryset.
class TrailManager(models.Manager):
    """Custom manager for trail model with spatial queries"""

    # Return trails whose start point falls inside the chosen radius.
    def within_radius(self, center_point, radius_km):
        """Find trails within a specified radius of a point."""
        return self.filter(
            start_point__distance_lte=(center_point, Distance(km=radius_km))
        )

    # Return trails whose start point lies inside the map bounds.
    def in_bounding_box(self, bbox):
        """Find trails within a bounding box."""
        min_lng, min_lat, max_lng, max_lat = bbox
        # Build the search polygon from the supplied bounding box values.
        bbox_polygon = Polygon.from_bbox((min_lng, min_lat, max_lng, max_lat))
        return self.filter(start_point__within=bbox_polygon)

    # Return the nearest trails to the selected point.
    def nearest_to_point(self, point, limit=10):
        """Find nearest trails to a point."""
        # Import here to avoid circular imports during model loading.
        from django.contrib.gis.db.models.functions import Distance as DistanceFunction
        # Add the computed distance so the closest trails appear first.
        return self.annotate(
            distance=DistanceFunction('start_point', point)
        ).order_by('distance')[:limit]


# Main trail record used by the API, admin, and mobile app.
class Trail(models.Model):
    """Main Trail model containing spatial and descriptive data."""
    
    # Description content and moderation notes.
    description = models.TextField(blank=True, null=True)
    # Stores the reason a description was rejected in admin.
    admin_notes = models.TextField(blank=True, null=True, help_text="Internal notes for rejection reason")

    DIFFICULTY_CHOICES = [
        ('easy', 'Easy'),
        ('moderate', 'Moderate'),
        ('hard', 'Hard'),
    ]
    
    
    # Tracks whether a description is approved, missing, or waiting for review.
    STATUS_CHOICES = [
        ('verified', 'Verified'),      # Pre-populated or Admin Approved
        ('scraped', 'Auto-Scraped'),   # From Wiki/SportsIreland
        ('pending', 'Pending'),        # Awaiting Admin Approval
        ('rejected', 'Rejected'),      # Admin rejected description
        ('missing', 'Missing'),        # No description available
       
    ]
    status = models.CharField(
        max_length=20, 
        choices=STATUS_CHOICES, 
        default='missing',
        db_index=True
    )
    
    favorited_by = models.ManyToManyField(
        settings.AUTH_USER_MODEL, 
        related_name='favorite_trails', 
        blank=True
    )

    def save(self, *args, **kwargs):
        # Move rejected text out of the public field before saving.
        if self.status == 'rejected' and self.description:
            # Keep the rejected text in admin notes for review.
            self.admin_notes = f"Rejected content: {self.description}"
            self.description = ""
            
        super().save(*args, **kwargs)
    
    
    
    # Core information.
    trail_name = models.CharField(max_length=200, db_index=True)
    activity = models.CharField(max_length=100, blank=True)
    source_url = models.URLField(max_length=500, null=True, blank=True)
    
    # Location.
    county = models.CharField(max_length=100, db_index=True)
    region = models.CharField(max_length=200, blank=True)
    nearest_town = models.CharField(max_length=100, blank=True)
    
    # Trail characteristics.
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
    
    # Spatial data.
    start_point = gis_models.PointField(
        srid=4326,
        help_text="Trail start coordinates (longitude, latitude)",
    )
    path = gis_models.MultiLineStringField(srid=4326, null=True, blank=True)
    
    # Amenities and visitor features.
    dogs_allowed = models.BooleanField(default=True, null=True, blank=True) # Whether dogs are allowed on the trail
    parking_available = models.CharField(max_length=100, blank=True) # Parking information
    public_transport = models.TextField(blank=True) # Public transport options (Not Implemented)
    facilities = models.TextField(blank=True) # Available facilities
    trail_type = models.CharField(max_length=100, blank=True) # Type of trail ( loop, Greenway, out-and-back)
    
    
    
    # Metadata.
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Custom manager with reusable spatial filters.
    objects = TrailManager()
    
    # Admin and database defaults.
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

    # Convenience accessors for serialisers and GeoJSON output.
    @property
    def latitude(self):
        """Return latitude coordinate."""
        return self.start_point.y if self.start_point else None

    @property
    def longitude(self):
        """Return longitude coordinate."""
        return self.start_point.x if self.start_point else None
    # GeoJSON-style coordinate pair.
    @property
    def coordinates(self):
        """Return coordinates as [longitude, latitude] for GeoJSON."""
        return [self.longitude, self.latitude] if self.start_point else None
    
    @property
    def duration_hours(self):
        """Estimate hiking duration based on distance and difficulty."""
        if self.distance_km in (None, ''):
            return None
        base_speed = {'easy': 4, 'moderate': 3.5, 'hard': 2.5}
        speed = base_speed.get(self.difficulty, 3)
        return round(float(self.distance_km) / speed, 1)


# Town record used for map filters and nearest-town lookup.
class Town(models.Model):
    """Town/City with location and demographic data."""

    TOWN_TYPE_CHOICES = [
        ('capital', 'Capital'),
        ('city', 'City'),
        ('town', 'Town'),
        ('village', 'Village'),
    ]

    # Core information.
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
    
    # Spatial data.
    location = gis_models.PointField(srid=4326)
    
    # Demographics.
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
    
    # Optional analytics fields.
    elevation_m = models.IntegerField(null=True, blank=True)
    gdp_per_capita = models.DecimalField(
        max_digits=12, 
        decimal_places=2, 
        null=True, 
        blank=True
    )
    
    # Additional socioeconomic data.
    unemployment_rate = models.FloatField(
        null=True, 
        blank=True,
        validators=[MinValueValidator(0), MaxValueValidator(100)]
    )
    
    # Metadata.
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # Admin and database defaults.
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


# Points of interest shown near trails and towns.
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
    
    # Visitor details.
    county = models.CharField(max_length=100, blank=True, db_index=True)
    region = models.CharField(max_length=100, blank=True)
    phone = models.CharField(max_length=20, blank=True)
    website = models.URLField(blank=True, null=True)
    opening_hours = models.CharField(max_length=200, blank=True)
    
    # Metadata.
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


# Links trails to nearby points of interest.
class TrailPOIIntersection(models.Model):
    """Model to track POIs near trails and their distance/relationship."""
    
    trail = models.ForeignKey(Trail, on_delete=models.CASCADE, related_name='nearby_pois')
    poi = models.ForeignKey(PointOfInterest, on_delete=models.CASCADE, related_name='nearby_trails')
    
    # Distance from the trail to the POI in metres.
    distance_meters = models.IntegerField()
    
    # Marks POIs that sit directly on the trail geometry.
    on_trail_route = models.BooleanField(default=False)
    
    # Simple bucket used in filtering and display.
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
        
class Accommodation(models.Model):
    """Model for accommodations near trails: hotels, hostels, B&Bs, campsites, etc."""

    ACCOMMODATION_CATEGORY_LABELS = {
        'hotel': 'Hotel',
        'bed_and_breakfast': 'B&B',
        'camping': 'Camping',
        'self_catering': 'Self Catering',
        'apartment': 'Apartment',
        'hostel': 'Hostel',
        'lodge': 'Lodge',
        'welcome_standard': 'Welcome Standard',
        'other': 'Stay',
    }
    
    ACCOMMODATION_SOURCE_CHOICES = [
        ('airbnb', 'Airbnb'),
        ('booking', 'Booking.com'),
        ('trivago', 'Trivago'),
        ('manual', 'Manual Entry'),
    ]
    
    name = models.CharField(max_length=200, db_index=True)
    source = models.CharField(max_length=50, choices=ACCOMMODATION_SOURCE_CHOICES, db_index=True)
    external_id = models.CharField(max_length=100, unique=True, help_text="Unique ID from external source")
    
    # Core spatial data.
    location = gis_models.PointField(geography=True, db_index=True)
    
    # Pricing and listing details.
    price_per_night = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    rating = models.FloatField(null=True, blank=True)
    url = models.URLField(max_length=500, blank=True)
    image_url = models.URLField(max_length=500, blank=True)
    
    nearby_trails = models.ManyToManyField('Trail', related_name='accommodations', blank=True)
    
    def __str__(self):
        return f"{self.name} ({self.source})"

    @staticmethod
    def infer_category(external_id="", name=""):
        external_id = (external_id or "").upper()
        name_lower = (name or "").lower()

        if external_id.startswith("HHS"):
            return "hotel"
        if external_id.startswith("BBL"):
            return "bed_and_breakfast"
        if external_id.startswith("CCS"):
            return "camping"
        if external_id.startswith(("SCL", "SCS")):
            if "apartment" in name_lower:
                return "apartment"
            return "self_catering"
        if external_id.startswith("WSL"):
            return "welcome_standard"

        if "hotel" in name_lower:
            return "hotel"
        if "hostel" in name_lower:
            return "hostel"
        if any(term in name_lower for term in ("b&b", "bed and breakfast", "farmhouse", "guesthouse", "guest lodge")):
            return "bed_and_breakfast"
        if any(term in name_lower for term in ("camping", "campsite", "caravan", "holiday park", "pod", "glamping")):
            return "camping"
        if "apartment" in name_lower:
            return "apartment"
        if any(term in name_lower for term in ("cottage", "cottages", "holiday home", "holiday homes", "self catering")):
            return "self_catering"
        if "lodge" in name_lower:
            return "lodge"
        return "other"

    @property
    def category(self):
        return self.infer_category(self.external_id, self.name)

    @property
    def category_label(self):
        return self.ACCOMMODATION_CATEGORY_LABELS.get(self.category, "Stay")
    
    @property
    def latitude(self):
        return self.location.y
    
    @property
    def longitude(self):
        return self.location.x


# Geographic boundaries used in the spatial analysis views.
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
    # Supports both polygon and line-based boundary data.
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

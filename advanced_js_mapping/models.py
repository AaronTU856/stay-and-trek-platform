from django.db import models
from django.contrib.gis.db import models as gis_models
from django.contrib.gis.geos import GEOSGeometry
from django.core.validators import MinValueValidator, MaxValueValidator


class AdvancedCity(models.Model):
    """
    Enhanced city model with PostGIS spatial features and additional demographics.
    """
    # Base geographic data
    name = models.CharField(max_length=100, help_text="City name")
    country = models.CharField(max_length=100, help_text="Country name")
    population = models.IntegerField(help_text="City population")
    latitude = models.DecimalField(max_digits=9, decimal_places=6)
    longitude = models.DecimalField(max_digits=9, decimal_places=6)
    area_km2 = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)

    # PostGIS spatial field - This is key for spatial queries!
    location = gis_models.PointField(help_text="Geographic location as Point")

    # Enhanced demographic data
    elevation_m = models.IntegerField(null=True, blank=True)
    gdp_per_capita = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    unemployment_rate = models.FloatField(null=True, blank=True)

    CITY_TYPES = [
        ('capital', 'Capital City'),
        ('major', 'Major City'),
        ('medium', 'Medium City'),
        ('small', 'Small City'),
        ('town', 'Town'),
    ]
    city_type = models.CharField(max_length=20, choices=CITY_TYPES, default='medium')

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Advanced City"
        verbose_name_plural = "Advanced Cities"
        ordering = ['name']
        indexes = [
            models.Index(fields=['population']),
            models.Index(fields=['country']),
        ]

    def __str__(self):
        return f"{self.name}, {self.country}"

    def save(self, *args, **kwargs):
        """Automatically create Point geometry from lat/lng"""
        if self.latitude is not None and self.longitude is not None:
            self.location = GEOSGeometry(f'POINT({self.longitude} {self.latitude})')
        super().save(*args, **kwargs)

    @property
    def population_density(self):
        """Calculate population density per square kilometer"""
        if self.area_km2 and self.area_km2 > 0:
            return round(self.population / self.area_km2, 2)
        return None

    def to_geojson_feature(self):
        """Convert city to GeoJSON Feature format"""
        return {
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [float(self.longitude), float(self.latitude)]
            },
            "properties": {
                "id": self.id,
                "name": self.name,
                "country": self.country,
                "population": self.population,
                "population_density": self.population_density,
                "city_type": self.city_type,
                "gdp_per_capita": float(self.gdp_per_capita) if self.gdp_per_capita else None,
            }
        }
        
        
# Add to advanced_js_mapping/models.py

class PolygonAnalysis(models.Model):
    """Store polygon analysis results for performance tracking"""
    polygon_geojson = models.TextField(help_text="GeoJSON polygon data")
    polygon_geometry = gis_models.PolygonField(help_text="PostGIS polygon geometry")

    # Results
    cities_count = models.IntegerField(help_text="Number of cities found")
    total_population = models.BigIntegerField(help_text="Total population in polygon")
    average_population = models.FloatField(help_text="Average population")
    area_analyzed_km2 = models.FloatField(help_text="Polygon area in km²")

    # Metadata
    session_key = models.CharField(max_length=40, null=True, blank=True)
    user_ip = models.GenericIPAddressField(null=True, blank=True)
    analysis_timestamp = models.DateTimeField(auto_now_add=True)
    query_duration_ms = models.IntegerField(help_text="Query execution time")

    class Meta:
        verbose_name = "Polygon Analysis"
        verbose_name_plural = "Polygon Analyses"
        ordering = ['-analysis_timestamp']

class SearchSession(models.Model):
    """Track user sessions for analytics"""
    session_key = models.CharField(max_length=40)
    ip_address = models.GenericIPAddressField()
    user_agent = models.TextField()
    total_searches = models.IntegerField(default=0)
    session_start = models.DateTimeField(auto_now_add=True)
    last_activity = models.DateTimeField(auto_now=True)

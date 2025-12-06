from rest_framework import serializers
from rest_framework_gis.serializers import GeoFeatureModelSerializer
from django.contrib.gis.geos import Point
from .models import Trail, Town, PointOfInterest, TrailPOIIntersection, Rivers  


# Serializer for listing basic trail info in lists
class TrailListSerializer(serializers.ModelSerializer):
    """Serializer for listing basic trail information in list views"""
    latitude = serializers.ReadOnlyField()
    longitude = serializers.ReadOnlyField()
    
    class Meta:
        """Meta configuration specifying model and fields to serialize"""
        model = Trail
        fields = [
            'id', 'trail_name', 'county', 'region', 'distance_km',
            'difficulty', 'elevation_gain_m', 'latitude', 'longitude', 'dogs_allowed',
            'parking_available'
        ]


# Serializer for detailed trail view
class TrailDetailSerializer(serializers.ModelSerializer):
    """Detailed serializer for individual trail"""
    latitude = serializers.ReadOnlyField()
    longitude = serializers.ReadOnlyField()
    
    class Meta:
        model = Trail
        fields = '__all__'
 
        
# Serializer for GeoJSON representation of trails
class TrailGeoJSONSerializer(GeoFeatureModelSerializer):
    """Serializer for rendering trails in GeoJSON format with geographic coordinates"""
    latitude = serializers.SerializerMethodField()
    longitude = serializers.SerializerMethodField()

    class Meta:
        """Meta configuration specifying model and fields for GeoJSON output"""
        model = Trail
        geo_field = 'start_point'
        fields = (
            'id', 'trail_name', 'county',
            'distance_km', 'difficulty',
            'latitude', 'longitude','dogs_allowed',
            'parking_available'
        )
 
    def get_latitude(self, obj):
        """Extract latitude from the start_point geometry field"""
        return obj.start_point.y if obj.start_point else None
  
    def get_longitude(self, obj):
        """Extract longitude from the start_point geometry field"""
        return obj.start_point.x if obj.start_point else None
   
        
# Serializer for creating new trails via API
class TrailCreateSerializer(serializers.ModelSerializer):
    """Serializer for validating and creating new trail records via POST requests"""
    latitude = serializers.FloatField(write_only=True)
    longitude = serializers.FloatField(write_only=True)

    class Meta:
        """Meta configuration specifying Trail model and writable fields"""
        model = Trail
        fields = [
            'trail_name', 'county', 'region', 'distance_km',
            'difficulty', 'elevation_gain_m', 'description',
            'latitude', 'longitude', 'dogs_allowed',
            'parking_available'
        ]

    def validate(self, data):
        """Validate incoming trail data before creation"""
        return data

    def create(self, validated_data):
        """Convert latitude/longitude to GeoDjango Point and create the trail"""
        latitude = validated_data.pop('latitude')
        longitude = validated_data.pop('longitude')
        validated_data['start_point'] = Point(longitude, latitude, srid=4326)
        return super().create(validated_data)

# Serializer for returning summary statistics about trails       
class TrailSummarySerializer(serializers.Serializer):
    """Serializer for aggregated statistics about trails in the database"""
    total_trails = serializers.IntegerField()
    average_distance_km = serializers.FloatField()
    max_elevation_gain = serializers.FloatField()
    easy_count = serializers.IntegerField()
    moderate_count = serializers.IntegerField()
    hard_count = serializers.IntegerField()
           
# Serializer used when searching for trails within a radius
class DistanceSerializer(serializers.Serializer):
    latitude = serializers.FloatField(min_value=-90, max_value=90)
    longitude = serializers.FloatField(min_value=-180, max_value=180)
    radius_km = serializers.FloatField(min_value=0.1, max_value=20000)


# Serializer for bounding box-based spatial searches
class BoundingBoxSerializer(serializers.Serializer):
    min_latitude = serializers.FloatField(min_value=-90, max_value=90)
    min_longitude = serializers.FloatField(min_value=-180, max_value=180)
    max_latitude = serializers.FloatField(min_value=-90, max_value=90)
    max_longitude = serializers.FloatField(min_value=-180, max_value=180)

# Validation ensures the bounding box coordinates make sense
    def validate(self, data):
        if data['min_latitude'] >= data['max_latitude']:
            raise serializers.ValidationError("min_latitude must be less than max_latitude")
        if data['min_longitude'] >= data['max_longitude']:
            raise serializers.ValidationError("min_longitude must be less than max_longitude")
        return data
    
    
# Serializer for converting Town data into GeoJSON
class TownGeoJSONSerializer(GeoFeatureModelSerializer):
    class Meta:
        model = Town
        geo_field = 'location'
        fields = ('id', 'name', 'town_type', 'population', 'area')

  
  # Serializer for Trail path as GeoJSON LineString  
class TrailPathGeoSerializer(GeoFeatureModelSerializer):
    class Meta:
        model = Trail
        geo_field = 'path'  # LineString
        fields = ('id', 'trail_name', 'county', 'distance_km', 'difficulty')


# ===== NEW POI SERIALIZERS =====

class PointOfInterestSerializer(serializers.ModelSerializer):
    """Serializer for Points of Interest"""
    latitude = serializers.ReadOnlyField()
    longitude = serializers.ReadOnlyField()
    
    class Meta:
        model = PointOfInterest
        fields = [
            'id', 'name', 'poi_type', 'description', 'county', 'region',
            'phone', 'website', 'opening_hours', 'latitude', 'longitude'
        ]


class PointOfInterestGeoJSONSerializer(GeoFeatureModelSerializer):
    """GeoJSON serializer for POIs for map display"""
    class Meta:
        model = PointOfInterest
        geo_field = 'location'
        fields = (
            'id', 'name', 'poi_type', 'county', 'phone', 'website'
        )


class TrailPOIIntersectionSerializer(serializers.ModelSerializer):
    """Serializer for trail-POI relationships"""
    poi = PointOfInterestSerializer(read_only=True)
    trail_name = serializers.CharField(source='trail.trail_name', read_only=True)
    
    class Meta:
        model = TrailPOIIntersection
        fields = [
            'id', 'trail_name', 'poi', 'distance_meters', 
            'proximity', 'on_trail_route'
        ]


class TrailWithPOISerializer(serializers.ModelSerializer):
    """Detailed trail serializer including nearby POIs"""
    latitude = serializers.ReadOnlyField()
    longitude = serializers.ReadOnlyField()
    nearby_pois = TrailPOIIntersectionSerializer(many=True, read_only=True)
    
    class Meta:
        model = Trail
        fields = [
            'id', 'trail_name', 'county', 'region', 'distance_km',
            'difficulty', 'elevation_gain_m', 'latitude', 'longitude',
            'dogs_allowed', 'parking_available', 'nearby_pois'
        ]


class GeographicBoundarySerializer(serializers.ModelSerializer):
    """Serializer for geographic boundaries"""
    class Meta:
        model = Rivers
        fields = [
            'id', 'name', 'boundary_type', 'description', 'established_date', 'geom'
        ]


class BoundaryTrailIntersectionSerializer(serializers.Serializer):
    """Serializer for boundary-trail intersection results"""
    boundary = GeographicBoundarySerializer(read_only=True)
    trails_crossing = TrailListSerializer(many=True, read_only=True)
    trails_within = TrailListSerializer(many=True, read_only=True)
    intersection_count = serializers.IntegerField(read_only=True)


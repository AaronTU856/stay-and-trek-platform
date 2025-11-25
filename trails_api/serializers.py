from rest_framework import serializers
from rest_framework_gis.serializers import GeoFeatureModelSerializer
from django.contrib.gis.geos import Point
from .models import Trail, Town  


# Serializer for listing basic trail info in lists
class TrailListSerializer(serializers.ModelSerializer):
    """Serializer for listing cities"""
    latitude = serializers.ReadOnlyField()
    longitude = serializers.ReadOnlyField()
    
    class Meta:
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
    latitude = serializers.SerializerMethodField()
    longitude = serializers.SerializerMethodField()

    class Meta:
        model = Trail
        geo_field = 'start_point'
        fields = (
            'id', 'trail_name', 'county',
            'distance_km', 'difficulty',
            'latitude', 'longitude','dogs_allowed',
            'parking_available'
        )
 
        
# Get latitude from the start_point geometry
    def get_latitude(self, obj):
        return obj.start_point.y if obj.start_point else None
  
    
# Get longitude from the start_point geometry
    def get_longitude(self, obj):
        return obj.start_point.x if obj.start_point else None
   
        
# Serializer for creating new trails via API
class TrailCreateSerializer(serializers.ModelSerializer):
    latitude = serializers.FloatField(write_only=True)
    longitude = serializers.FloatField(write_only=True)

    class Meta:
        model = Trail
        fields = [
            'trail_name', 'county', 'region', 'distance_km',
            'difficulty', 'elevation_gain_m', 'description',
            'latitude', 'longitude', 'dogs_allowed',
            'parking_available'
        ]


# Used for debugging input data during creation
    def validate(self, data):
        print("Incoming data:", data)
        return data


# Converts lat/lon into a GeoDjango Point and saves the new Trail
    def create(self, validated_data):
        latitude = validated_data.pop('latitude')
        longitude = validated_data.pop('longitude')
        validated_data['start_point'] = Point(longitude, latitude, srid=4326)
        return super().create(validated_data)

# Serializer for returning summary statistics about trails       
class TrailSummarySerializer(serializers.Serializer):
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

    
class TrailPathGeoSerializer(GeoFeatureModelSerializer):
    class Meta:
        model = Trail
        geo_field = 'path'  # LineString
        fields = ('id', 'trail_name', 'county', 'distance_km', 'difficulty')

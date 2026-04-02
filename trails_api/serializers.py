from rest_framework import serializers
from rest_framework_gis.serializers import GeoFeatureModelSerializer
from django.contrib.gis.geos import Point
from .models import Trail, Town, PointOfInterest, TrailPOIIntersection, Rivers, Accommodation  


# Trail data used in list endpoints.
class TrailListSerializer(serializers.ModelSerializer):
    latitude = serializers.ReadOnlyField()
    longitude = serializers.ReadOnlyField()
    
    class Meta:
        model = Trail
        fields = [
            'id', 'trail_name', 'county', 'region', 'distance_km',
            'difficulty', 'elevation_gain_m', 'latitude', 'longitude', 'dogs_allowed',
            'parking_available','accommodations', 'description', 'status', 'source_url'
        ]


# Full trail record for detail views.
class TrailDetailSerializer(serializers.ModelSerializer):
    latitude = serializers.ReadOnlyField()
    longitude = serializers.ReadOnlyField()
    
    class Meta:
        model = Trail
        fields = [
            'id', 'trail_name', 'county', 'region', 'distance_km',
            'difficulty', 'elevation_gain_m', 'description', 'status','latitude', 'longitude', 
            'dogs_allowed', 'parking_available','accommodations'
        ]
 
        
# Trail output for the map in GeoJSON format.
class TrailGeoJSONSerializer(GeoFeatureModelSerializer):
    latitude = serializers.SerializerMethodField()
    longitude = serializers.SerializerMethodField()

    class Meta:
        model = Trail
        geo_field = 'start_point'
        fields = (
            'id', 'trail_name', 'county',
            'distance_km', 'difficulty', 'status',
            'latitude', 'longitude','dogs_allowed',
            'parking_available'
        )
 
    def get_latitude(self, obj):
        return obj.start_point.y if obj.start_point else None
  
    def get_longitude(self, obj):
        return obj.start_point.x if obj.start_point else None
   
        
# Writable trail serializer for create requests.
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

    def validate(self, data):
        return data

    def create(self, validated_data):
        latitude = validated_data.pop('latitude')
        longitude = validated_data.pop('longitude')
        validated_data['start_point'] = Point(longitude, latitude, srid=4326)
        return super().create(validated_data)

# Summary figures used by dashboards and quick stats.
class TrailSummarySerializer(serializers.Serializer):
    total_trails = serializers.IntegerField()
    average_distance_km = serializers.FloatField()
    max_elevation_gain = serializers.FloatField()
    easy_count = serializers.IntegerField()
    moderate_count = serializers.IntegerField()
    hard_count = serializers.IntegerField()
           
# Validates map-click coordinates and radius values for proximity search.
class DistanceSerializer(serializers.Serializer):
    latitude = serializers.FloatField(min_value=-90, max_value=90)
    longitude = serializers.FloatField(min_value=-180, max_value=180)
    radius_km = serializers.FloatField(min_value=0.1, max_value=20000)


# Validates the min/max coordinates sent by the bounding-box tools.
class BoundingBoxSerializer(serializers.Serializer):
    min_latitude = serializers.FloatField(min_value=-90, max_value=90)
    min_longitude = serializers.FloatField(min_value=-180, max_value=180)
    max_latitude = serializers.FloatField(min_value=-90, max_value=90)
    max_longitude = serializers.FloatField(min_value=-180, max_value=180)

    # Reject inverted bounding boxes before the spatial query runs.
    def validate(self, data):
        if data['min_latitude'] >= data['max_latitude']:
            raise serializers.ValidationError("min_latitude must be less than max_latitude")
        if data['min_longitude'] >= data['max_longitude']:
            raise serializers.ValidationError("min_longitude must be less than max_longitude")
        return data
    
    
# Town output for map layers.
class TownGeoJSONSerializer(GeoFeatureModelSerializer):
    class Meta:
        model = Town
        geo_field = 'location'
        fields = ('id', 'name', 'town_type', 'population', 'area')

# Serializer for trail path geometry returned to the map as GeoJSON.
class TrailPathGeoSerializer(GeoFeatureModelSerializer):
    class Meta:
        model = Trail
        geo_field = 'path'  # LineString
        fields = ('id', 'trail_name', 'county', 'distance_km', 'difficulty')


# POI serializers.
class PointOfInterestSerializer(serializers.ModelSerializer):
    latitude = serializers.ReadOnlyField()
    longitude = serializers.ReadOnlyField()
    
    class Meta:
        model = PointOfInterest
        fields = [
            'id', 'name', 'poi_type', 'description', 'county', 'region',
            'phone', 'website', 'opening_hours', 'latitude', 'longitude'
        ]


class PointOfInterestGeoJSONSerializer(GeoFeatureModelSerializer):
    class Meta:
        model = PointOfInterest
        geo_field = 'location'
        fields = (
            'id', 'name', 'poi_type', 'county', 'phone', 'website'
        )


class TrailPOIIntersectionSerializer(serializers.ModelSerializer):
    poi = PointOfInterestSerializer(read_only=True)
    trail_name = serializers.CharField(source='trail.trail_name', read_only=True)
    
    class Meta:
        model = TrailPOIIntersection
        fields = [
            'id', 'trail_name', 'poi', 'distance_meters', 
            'proximity', 'on_trail_route'
        ]


class TrailWithPOISerializer(serializers.ModelSerializer):
    latitude = serializers.ReadOnlyField()
    longitude = serializers.ReadOnlyField()
    nearby_pois = TrailPOIIntersectionSerializer(many=True, read_only=True)
    
    class Meta:
        model = Trail
        fields = [
            'id', 'trail_name', 'county', 'region', 'distance_km',
            'difficulty', 'elevation_gain_m','latitude', 'longitude',
            'dogs_allowed', 'parking_available', 'nearby_pois'
        ]


class GeographicBoundarySerializer(serializers.ModelSerializer):
    class Meta:
        model = Rivers
        fields = [
            'id', 'name', 'boundary_type', 'description', 'established_date', 'geom'
        ]


class BoundaryTrailIntersectionSerializer(serializers.Serializer):
    boundary = GeographicBoundarySerializer(read_only=True)
    trails_crossing = TrailListSerializer(many=True, read_only=True)
    trails_within = TrailListSerializer(many=True, read_only=True)
    intersection_count = serializers.IntegerField(read_only=True)
    
    
class AccommodationSerializer(serializers.ModelSerializer):
    # Accommodation data returned to list and detail views.
    latitude = serializers.ReadOnlyField()
    longitude = serializers.ReadOnlyField()
    distance_km = serializers.SerializerMethodField()
    category = serializers.ReadOnlyField()
    category_label = serializers.ReadOnlyField()

    class Meta:
        model = Accommodation
        fields = [
            'id', 'name', 'source', 'price_per_night', 
            'rating', 'url', 'image_url', 'latitude', 'longitude',
            'distance_km', 'category', 'category_label'
        ]

    def get_distance_km(self, obj):
        # Uses the annotated distance added in the view when it is available.
        if hasattr(obj, 'distance') and obj.distance:
            return round(obj.distance.km, 2)
        return None

class AccommodationGeoJSONSerializer(GeoFeatureModelSerializer):
    # Accommodation output for the mobile and web maps.
    category = serializers.ReadOnlyField()
    category_label = serializers.ReadOnlyField()

    class Meta:
        model = Accommodation  
        geo_field = 'location'
        fields = (
            'id', 'name', 'source', 'price_per_night', 'rating', 'url',
            'category', 'category_label'
        )

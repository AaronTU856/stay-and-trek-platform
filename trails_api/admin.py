from django.contrib import admin
from leaflet.admin import LeafletGeoAdmin

from .models import (
    Accommodation,
    PointOfInterest,
    Rivers,
    Town,
    Trail,
    TrailPOIIntersection,
)


@admin.register(Trail)
class TrailAdmin(LeafletGeoAdmin):
    list_display = (
        'trail_name',
        'county',
        'difficulty',
        'status',
        'distance_km',
        'trail_type',
        'dogs_allowed',
        'has_path',
        'updated_at',
    )
    search_fields = ('trail_name', 'county', 'nearest_town', 'description')
    list_filter = ('status', 'county', 'difficulty', 'dogs_allowed', 'activity', 'trail_type')
    ordering = ('county', 'trail_name')
    readonly_fields = ('created_at', 'updated_at', 'duration_hours')
    list_per_page = 50

    fieldsets = (
        ('Basic Information', {
            'fields': (
                'trail_name',
                'status',
                'description',
                'admin_notes',
                'activity',
                'source_url',
            )
        }),
        ('Location Context', {
            'fields': ('county', 'region', 'nearest_town')
        }),
        ('Trail Characteristics', {
            'fields': ('distance_km', 'difficulty', 'elevation_gain_m', 'trail_type', 'duration_hours')
        }),
        ('Spatial Data', {
            'fields': ('start_point', 'path'),
            'classes': ('collapse',),
        }),
        ('Amenities & Features', {
            'fields': ('dogs_allowed', 'parking_available', 'public_transport', 'facilities')
        }),
        ('Metadata', {
            'fields': ('favorited_by', 'created_at', 'updated_at'),
            'classes': ('collapse',),
        }),
    )

    @admin.display(boolean=True, description='Path')
    def has_path(self, obj):
        return bool(obj.path)


@admin.register(Town)
class TownAdmin(LeafletGeoAdmin):
    list_display = (
        'name',
        'country',
        'town_type',
        'population',
        'area',
        'is_capital',
        'has_location',
        'updated_at',
    )
    search_fields = ('name', 'country')
    list_filter = ('town_type', 'country', 'is_capital')
    ordering = ('country', 'name')
    readonly_fields = ('population_density', 'created_at', 'updated_at')
    list_per_page = 50

    fieldsets = (
        ('Basic Information', {
            'fields': ('name', 'country', 'town_type', 'is_capital')
        }),
        ('Location & Geography', {
            'fields': ('location', 'area', 'population_density')
        }),
        ('Demographics', {
            'fields': ('population', 'elevation_m', 'gdp_per_capita', 'unemployment_rate')
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',),
        }),
    )

    @admin.display(boolean=True, description='Location')
    def has_location(self, obj):
        return bool(obj.location)


@admin.register(Accommodation)
class AccommodationAdmin(LeafletGeoAdmin):
    list_display = (
        'name',
        'source',
        'primary_county',
        'price_per_night',
        'rating',
        'has_image',
        'has_url',
        'nearby_trail_count',
    )
    search_fields = ('name', 'external_id', 'url', 'nearby_trails__trail_name', 'nearby_trails__county')
    list_filter = ('source', 'nearby_trails__county')
    ordering = ('source', 'name')
    readonly_fields = ('latitude', 'longitude')
    filter_horizontal = ('nearby_trails',)
    list_per_page = 50

    fieldsets = (
        ('Basic Information', {
            'fields': ('name', 'source', 'external_id')
        }),
        ('Location & Map Data', {
            'fields': ('location', 'latitude', 'longitude')
        }),
        ('Pricing & Listing Details', {
            'fields': ('price_per_night', 'rating', 'url', 'image_url')
        }),
        ('Trail Relationships', {
            'fields': ('nearby_trails',)
        }),
    )

    @admin.display(description='County')
    def primary_county(self, obj):
        trail = obj.nearby_trails.exclude(county='').first()
        return trail.county if trail else 'Unlinked'

    @admin.display(boolean=True, description='Image')
    def has_image(self, obj):
        return bool(obj.image_url)

    @admin.display(boolean=True, description='URL')
    def has_url(self, obj):
        return bool(obj.url)

    @admin.display(description='Nearby Trails')
    def nearby_trail_count(self, obj):
        return obj.nearby_trails.count()


@admin.register(PointOfInterest)
class PointOfInterestAdmin(LeafletGeoAdmin):
    list_display = (
        'name',
        'poi_type',
        'county',
        'region',
        'has_website',
        'updated_at',
    )
    search_fields = ('name', 'county', 'region', 'description')
    list_filter = ('poi_type', 'county', 'region')
    ordering = ('poi_type', 'name')
    readonly_fields = ('created_at', 'updated_at', 'latitude', 'longitude')
    list_per_page = 50

    fieldsets = (
        ('Basic Information', {
            'fields': ('name', 'poi_type', 'description')
        }),
        ('Location & Geography', {
            'fields': ('location', 'latitude', 'longitude', 'county', 'region')
        }),
        ('Contact & Visitor Info', {
            'fields': ('phone', 'website', 'opening_hours')
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',),
        }),
    )

    @admin.display(boolean=True, description='Website')
    def has_website(self, obj):
        return bool(obj.website)


@admin.register(TrailPOIIntersection)
class TrailPOIIntersectionAdmin(admin.ModelAdmin):
    list_display = (
        'trail',
        'poi',
        'proximity',
        'distance_meters',
        'on_trail_route',
        'created_at',
    )
    search_fields = ('trail__trail_name', 'trail__county', 'poi__name', 'poi__county')
    list_filter = ('proximity', 'on_trail_route', 'trail__county', 'poi__poi_type')
    ordering = ('distance_meters',)
    readonly_fields = ('created_at',)
    autocomplete_fields = ('trail', 'poi')
    list_per_page = 50


@admin.register(Rivers)
class RiversAdmin(LeafletGeoAdmin):
    list_display = (
        'name',
        'boundary_type',
        'established_date',
        'has_description',
    )
    search_fields = ('name', 'description')
    list_filter = ('boundary_type', 'established_date')
    ordering = ('boundary_type', 'name')
    list_per_page = 50

    fieldsets = (
        ('Basic Information', {
            'fields': ('name', 'boundary_type', 'description', 'established_date')
        }),
        ('Geometry', {
            'fields': ('geom',)
        }),
    )

    @admin.display(boolean=True, description='Description')
    def has_description(self, obj):
        return bool(obj.description)

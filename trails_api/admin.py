from django.contrib import admin
from .models import Trail, Town


@admin.register(Trail)
class TrailAdmin(admin.ModelAdmin):
    list_display = (
        'trail_name',
        'county',
        'difficulty',
        'distance_km',
        'dogs_allowed',
    )
    
    search_fields = ('trail_name', 'county', 'nearest_town')
    list_filter = ('county', 'difficulty', 'dogs_allowed', 'activity')
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('trail_name', 'description', 'activity', 'county', 'region', 'nearest_town')
        }),
        ('Trail Characteristics', {
            'fields': ('distance_km', 'difficulty', 'elevation_gain_m', 'trail_type')
        }),
        ('Spatial Data', {
            'fields': ('start_point', 'path'),
            'classes': ('collapse',),
        }),
        ('Amenities & Features', {
            'fields': ('dogs_allowed', 'parking_available', 'public_transport', 'facilities'),
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',),
        }),
    )
    
    readonly_fields = ('created_at', 'updated_at')
    ordering = ('trail_name',)


@admin.register(Town)
class TownAdmin(admin.ModelAdmin):
    list_display = ('name', 'population')
    
    search_fields = ('name',)
    list_filter = ('town_type',)
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('name', 'town_type', 'population')
        }),
        ('Location & Geography', {
            'fields': ('location', 'area'),
        }),
        ('Metadata', {
            'fields': (),
            'classes': ('collapse',),
        }),
    )
    
    ordering = ('name',)

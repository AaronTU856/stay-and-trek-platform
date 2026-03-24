from django.contrib import admin
from leaflet.admin import LeafletGeoAdmin

from .models import AdvancedCity, PolygonAnalysis, SearchSession


@admin.register(AdvancedCity)
class AdvancedCityAdmin(LeafletGeoAdmin):
    list_display = (
        'name',
        'country',
        'city_type',
        'population',
        'area_km2',
        'population_density',
        'updated_at',
    )
    search_fields = ('name', 'country')
    list_filter = ('country', 'city_type')
    ordering = ('country', 'name')
    readonly_fields = ('population_density', 'created_at', 'updated_at')
    list_per_page = 50

    fieldsets = (
        ('Basic Information', {
            'fields': ('name', 'country', 'city_type')
        }),
        ('Location Data', {
            'fields': ('latitude', 'longitude', 'location')
        }),
        ('Demographics', {
            'fields': ('population', 'area_km2', 'population_density', 'elevation_m')
        }),
        ('Economic Indicators', {
            'fields': ('gdp_per_capita', 'unemployment_rate')
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',),
        }),
    )


@admin.register(PolygonAnalysis)
class PolygonAnalysisAdmin(admin.ModelAdmin):
    list_display = (
        'analysis_timestamp',
        'cities_count',
        'total_population',
        'area_analyzed_km2',
        'query_duration_ms',
        'session_key',
    )
    search_fields = ('session_key', 'user_ip', 'polygon_geojson')
    list_filter = ('analysis_timestamp',)
    ordering = ('-analysis_timestamp',)
    readonly_fields = (
        'polygon_geojson',
        'polygon_geometry',
        'cities_count',
        'total_population',
        'average_population',
        'area_analyzed_km2',
        'session_key',
        'user_ip',
        'analysis_timestamp',
        'query_duration_ms',
    )
    list_per_page = 50

    fieldsets = (
        ('Summary', {
            'fields': (
                'analysis_timestamp',
                'cities_count',
                'total_population',
                'average_population',
                'area_analyzed_km2',
                'query_duration_ms',
            )
        }),
        ('Session Metadata', {
            'fields': ('session_key', 'user_ip')
        }),
        ('Geometry & Payload', {
            'fields': ('polygon_geometry', 'polygon_geojson'),
            'classes': ('collapse',),
        }),
    )


@admin.register(SearchSession)
class SearchSessionAdmin(admin.ModelAdmin):
    list_display = (
        'session_key',
        'ip_address',
        'total_searches',
        'session_start',
        'last_activity',
    )
    search_fields = ('session_key', 'ip_address', 'user_agent')
    list_filter = ('session_start', 'last_activity')
    ordering = ('-last_activity',)
    readonly_fields = ('session_start', 'last_activity')
    list_per_page = 50

    fieldsets = (
        ('Session Details', {
            'fields': ('session_key', 'ip_address', 'user_agent')
        }),
        ('Usage', {
            'fields': ('total_searches', 'session_start', 'last_activity')
        }),
    )

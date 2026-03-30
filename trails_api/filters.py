import django_filters
from .models import Trail

# Shared query filters for trail list endpoints and related tests.
class TrailFilter(django_filters.FilterSet):
    """Public-facing filters for trail name, location, and numeric ranges."""

    # Lets the list view match partial trail names from the search UI.
    trail_name = django_filters.CharFilter(
        field_name='trail_name',
        lookup_expr='icontains'
    )
    county = django_filters.CharFilter(lookup_expr='iexact')
    difficulty = django_filters.CharFilter(lookup_expr='iexact')
    region = django_filters.CharFilter(lookup_expr='icontains')

    # Supports min/max distance filtering for list and dashboard queries.
    min_distance_km = django_filters.NumberFilter(
        field_name='distance_km',
        lookup_expr='gte'
    )
    max_distance_km = django_filters.NumberFilter(
        field_name='distance_km',
        lookup_expr='lte'
    )

    # Supports min/max elevation filtering without exposing raw SQL details.
    min_elevation_gain_m = django_filters.NumberFilter(
        field_name='elevation_gain_m',
        lookup_expr='gte'
    )
    max_elevation_gain_m = django_filters.NumberFilter(
        field_name='elevation_gain_m',
        lookup_expr='lte'
    )

    class Meta:
        model = Trail
        fields = ['county', 'difficulty', 'region']








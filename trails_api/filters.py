import django_filters
from .models import Trail

# Defines filtering options for the Trail model 
class TrailFilter(django_filters.FilterSet):
    """Filter set for Trail model"""
   # Allow case-insensitive search by name, country, or region
    name = django_filters.CharFilter(lookup_expr='icontains')
    country = django_filters.CharFilter(lookup_expr='icontains')
    region = django_filters.CharFilter(lookup_expr='icontains')
   
   # Filters based on elevation range 
    smallest_mountain = django_filters.NumberFilter(
        field_name='smallest',
        lookup_expr='gte'
    )
    highest_mountain = django_filters.NumberFilter(
        field_name='highest',
        lookup_expr='lte'
    )
    
   # Filters for trail length ranges
    longest_trail = django_filters.NumberFilter(
        field_name='longest_trail',
        lookup_expr='gte'
    )
    shortest_trail = django_filters.NumberFilter(
        field_name='shortest_trail',
        lookup_expr='lte'
    )
   
   
   # Meta class to specify model and fields
    class Meta:
        model = Trail
        fields = ['county', 'difficulty', 'region']
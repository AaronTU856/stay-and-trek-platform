from django.shortcuts import render

from django.shortcuts import render
from trails_api.models import Trail, Town
from django.db.models import Count, Avg, Sum

# Builds the main dashboard with the filter options and totals.
def index(request):
    context = {
        'total_trails': Trail.objects.count(),
        'total_towns': Town.objects.count(),
        'countries': Trail.objects.exclude(county__isnull=True).exclude(county__exact='').values_list('county', flat=True).distinct().order_by('county'),
        'regions': Trail.objects.values_list('region', flat=True).distinct().order_by('region'),
        'difficulties': Trail.objects.values_list('difficulty', flat=True).distinct(),
        'trail_types': Trail.objects.values_list('trail_type', flat=True).distinct(),
    }
    return render(request, 'dashboard/index.html', context)

# Builds the analytics page with trail and stay summary data.
def analytics(request):
    trail_stats = {
        "total_trails": Trail.objects.count(),
        "avg_distance": Trail.objects.aggregate(avg=Avg("distance_km"))["avg"] or 0,
        "avg_elevation": Trail.objects.aggregate(avg=Avg("elevation_gain_m"))["avg"] or 0,
        "total_distance": Trail.objects.aggregate(sum=Sum("distance_km"))["sum"] or 0,
        "easy_count": Trail.objects.filter(difficulty="easy").count(),
        "moderate_count": Trail.objects.filter(difficulty="moderate").count(),
        "hard_count": Trail.objects.filter(difficulty="hard").count(),
    }

    county_data = Trail.objects.values('county').annotate(total=Count('id')).order_by('-total')[:5]

    acc_stats = {
        "total_accommodations": Accommodation.objects.count(),
        "hotels": Accommodation.objects.filter(category='hotel').count(),
        "hostels": Accommodation.objects.filter(category='hostel').count(),
    }

    context = {
        'trail_stats': trail_stats,
        'acc_stats': acc_stats,
        'total_towns': Town.objects.count(),
        'county_labels': [item['county'] for item in county_data],
        'county_counts': [item['total'] for item in county_data],
    }
    return render(request, 'dashboard/analytics.html', context)

from django.shortcuts import render

# Create your views here.
from django.shortcuts import render
from trails_api.models import Trail, Town
from django.db.models import Count, Avg, Sum

# Main dashboard view
def index(request):
    """Main trail dashboard view"""
    context = {
        'total_trails': Trail.objects.count(),
        'total_towns': Town.objects.count(),
        'regions': Trail.objects.values_list('region', flat=True).distinct().order_by('region'),
        'difficulties': Trail.objects.values_list('difficulty', flat=True).distinct(),
        'trail_types': Trail.objects.values_list('trail_type', flat=True).distinct(),
    }
    return render(request, 'dashboard/index.html', context)

# Trail analytics view
def analytics(request):
    """Trail analytics page with real distribution data"""
    
    # 1. High-level Trail Stats
    trail_stats = {
        "total_trails": Trail.objects.count(),
        "avg_distance": Trail.objects.aggregate(avg=Avg("distance_km"))["avg"] or 0,
        "avg_elevation": Trail.objects.aggregate(avg=Avg("elevation_gain_m"))["avg"] or 0,
        "total_distance": Trail.objects.aggregate(sum=Sum("distance_km"))["sum"] or 0,
        "easy_count": Trail.objects.filter(difficulty="easy").count(),
        "moderate_count": Trail.objects.filter(difficulty="moderate").count(),
        "hard_count": Trail.objects.filter(difficulty="hard").count(),
    }

    # 2. County Distribution (For Bar Chart: Trails per County)
    # This groups trails by county and counts them
    county_data = Trail.objects.values('county').annotate(total=Count('id')).order_by('-total')[:5]

    # 3. Accommodation Data (For the "Stay" part of StayAndTrek)
    acc_stats = {
        "total_accommodations": Accommodation.objects.count(),
        "hotels": Accommodation.objects.filter(category='hotel').count(),
        "hostels": Accommodation.objects.filter(category='hostel').count(),
    }

    context = {
        'trail_stats': trail_stats,
        'acc_stats': acc_stats,
        'total_towns': Town.objects.count(),
        # Passing lists directly for Chart.js labels and data
        'county_labels': [item['county'] for item in county_data],
        'county_counts': [item['total'] for item in county_data],
    }
    return render(request, 'dashboard/analytics.html', context)

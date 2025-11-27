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
    """Trail analytics page"""
    trail_stats = {
        "total_trails": Trail.objects.count(),
        "avg_distance": Trail.objects.aggregate(avg=Avg("distance_km"))["avg"] or 0,
        "avg_elevation": Trail.objects.aggregate(avg=Avg("elevation_gain_m"))["avg"] or 0,
        "total_distance": Trail.objects.aggregate(sum=Sum("distance_km"))["sum"] or 0,
        "easy_count": Trail.objects.filter(difficulty="easy").count(),
        "moderate_count": Trail.objects.filter(difficulty="moderate").count(),
        "hard_count": Trail.objects.filter(difficulty="hard").count(),
    }

# Render the analytics template with computed statistics that provide insights into the trails
    context = {
        'trail_stats': trail_stats,
        'total_towns': Town.objects.count(),
    }
    return render(request, 'dashboard/analytics.html', context)


from django.contrib.auth.decorators import login_required
from django.shortcuts import render
# Create your views here.
def home(request):
    """
    Public Landing Page.
    Anyone can see the 'Stay and Trek' banner here.
    """
    return render(request, 'index.html')

@login_required
def trail_map(request):
    # This is the view for your 'advanced_js_mapping:map'
    return render(request, 'advanced_js_mapping/map.html')
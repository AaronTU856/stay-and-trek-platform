from django.contrib.auth.decorators import login_required
from django.shortcuts import render

# Renders the public landing page for the web app.
def home(request):
    return render(request, 'index.html')

@login_required
def trail_map(request):
    # Opens the main trail map for signed-in users.
    return render(request, 'advanced_js_mapping/map.html')

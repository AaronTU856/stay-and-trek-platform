from django.shortcuts import render

def home(request):
    """Project-level homepage linking to main pages."""
    return render(request, "index.html")
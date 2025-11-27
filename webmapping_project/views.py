from django.shortcuts import render
# Create your views here.
def home(request):
    """Project-level homepage linking to main pages."""
    return render(request, "index.html")
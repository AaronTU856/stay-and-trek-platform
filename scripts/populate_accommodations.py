import random
from django.contrib.gis.geos import Point
from trails_api.models import Accommodation, Trail

def run():
    """Main execution for manage.py runscript to populate_accommodations. 
    Finds all existing trails and creates mock accommodation points nearby for testing mobile map interface"""
    
    print("Populating accommodations near trails...")
    
    trails = Trail.objects.all()
    if not trails.exists():
        print("No trails found. Exiting.")
        return
    
    accommodation_types = [
        {"name": "Hikers' Rest B&B", "source": "booking"},
        {"name": "The Wicklow Inn", "source": "airbnb"},
        {"name": "Connemara Hostel", "source": "trivago"},
        {"name": "Dingle Lodge", "source": "manual"},
        ]
    
    
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
    
    new_records = 0
    for trail in trails:
        # Create 2 accommodations near each trail start point
        for i in range(2):
            # Shift the lat/lng by approx 1-3km
            lat_offset = random.uniform(-0.02, 0.02)
            lng_offset = random.uniform(-0.02, 0.02)
            
            # Using trail.latitude/longitude properties from your model
            t_lat = float(trail.latitude)
            t_lng = float(trail.longitude)
            
            lodging = random.choice(accommodation_types)
            ext_id = f"sim_{trail.id}_{i}" # Unique ID to prevent duplicates
            
            # get_or_create ensures we don't double-up if you run this twice
            obj, created = Accommodation.objects.get_or_create(
                external_id=ext_id,
                defaults={
                    'name': f"{lodging['name']} - {trail.trail_name}",
                    'accommodation_source': lodging['source'],
                    'location': Point(t_lng + lng_offset, t_lat + lat_offset, srid=4326),
                    'price_per_night': random.randint(65, 220),
                    'rating': round(random.uniform(3.8, 5.0), 1),
                }
            )
            if created:
                new_records += 1
    
    print(f"Added {new_records} new accommodation records near trails.")
    
    
    
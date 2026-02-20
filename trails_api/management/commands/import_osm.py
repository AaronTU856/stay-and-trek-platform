import json
import os
from django.core.management.base import BaseCommand
from django.conf import settings
from django.contrib.gis.geos import Point
from trails_api.models import Accommodation

class Command(BaseCommand):
    help = 'Imports real Irish accommodations from GeoJSON'

    def handle(self, *args, **options):
        # Path to the JSON file at the project root
        file_path = os.path.join(settings.BASE_DIR, 'osm_accommodations.json')
        
        try:
            with open(file_path, 'r') as f:
                data = json.load(f)
            
            count = 0
            for feature in data['features']:
                props = feature['properties']
                coords = feature['geometry']['coordinates'] # [lng, lat]
                
                # Use name from OSM, or a fallback
                name = props.get('name', 'Trailside Accommodation')
                osm_id = feature.get('id', count)

                # update_or_create prevents duplicates if you run this twice
                Accommodation.objects.update_or_create(
                    external_id=f"osm_{osm_id}",
                    defaults={
                        'name': name,
                        'source': 'manual', # Or update choices to include 'osm'
                        'location': Point(coords[0], coords[1], srid=4326),
                        'price_per_night': 55.00, # Mock price
                        'rating': 4.5,
                        'url': f"https://www.booking.com/searchresults.html?ss={name.replace(' ', '+')}+Ireland"
                    }
                )
                count += 1
            
            self.stdout.write(self.style.SUCCESS(f'Successfully imported {count} real Irish stays!'))
            
        except FileNotFoundError:
            self.stdout.write(self.style.ERROR(f'File not found: {file_path}'))
            
            
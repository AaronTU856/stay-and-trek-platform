"""
Management command to load sample POI data for demonstration
Run with: python manage.py load_sample_pois
"""

from django.core.management.base import BaseCommand
from django.contrib.gis.geos import Point
from trails_api.models import PointOfInterest


class Command(BaseCommand):
    help = "Load sample POI data for map demonstration"

    def handle(self, *args, **options):
        # Sample POI data - Parking, Cafes, Attractions near popular Irish trails
        sample_pois = [
            {
                "name": "Wicklow Gap Car Park",
                "poi_type": "parking",
                "county": "Wicklow",
                "region": "East",
                "description": "Free parking at the start of Wicklow Gap trail",
                "location": Point(-6.31, 53.0, srid=4326),
            },
            {
                "name": "Glendalough Upper Lake Parking",
                "poi_type": "parking",
                "county": "Wicklow",
                "region": "East",
                "description": "Parking at upper lake entrance",
                "phone": "+353 404 45352",
                "location": Point(-6.3119, 53.0083, srid=4326),
            },
            {
                "name": "Powerscourt Estate Café",
                "poi_type": "cafe",
                "county": "Wicklow",
                "region": "East",
                "description": "Café near Powerscourt waterfall trail",
                "opening_hours": "09:00-17:00",
                "website": "https://www.powerscourt.ie",
                "location": Point(-6.1728, 53.1097, srid=4326),
            },
            {
                "name": "Glendalough Visitor Centre",
                "poi_type": "information",
                "county": "Wicklow",
                "region": "East",
                "description": "Information about the valley and trails",
                "phone": "+353 404 45352",
                "opening_hours": "09:30-17:00",
                "location": Point(-6.3119, 53.0083, srid=4326),
            },
            {
                "name": "Powerscourt Waterfall",
                "poi_type": "viewpoint",
                "county": "Wicklow",
                "region": "East",
                "description": "Beautiful waterfall viewpoint",
                "location": Point(-6.1728, 53.1097, srid=4326),
            },
            {
                "name": "Roundwood Village Café",
                "poi_type": "cafe",
                "county": "Wicklow",
                "region": "East",
                "description": "Cozy village café",
                "opening_hours": "08:00-18:00",
                "location": Point(-6.2, 53.15, srid=4326),
            },
            {
                "name": "Dublin Mountains Parking",
                "poi_type": "parking",
                "county": "Dublin",
                "region": "East",
                "description": "Free parking for Dublin mountains trails",
                "location": Point(-6.25, 53.28, srid=4326),
            },
            {
                "name": "Three Rock Mountain Summit Shelter",
                "poi_type": "shelter",
                "county": "Dublin",
                "region": "East",
                "description": "Weather shelter at summit",
                "location": Point(-6.24, 53.29, srid=4326),
            },
            {
                "name": "Wicklow Town Visitor Centre",
                "poi_type": "information",
                "county": "Wicklow",
                "region": "East",
                "description": "Town center visitor information",
                "phone": "+353 404 69117",
                "opening_hours": "09:00-17:00",
                "location": Point(-6.281, 52.975, srid=4326),
            },
            {
                "name": "Avoca Valley Picnic Area",
                "poi_type": "picnic",
                "county": "Wicklow",
                "region": "East",
                "description": "Scenic picnic spot in Avoca valley",
                "location": Point(-6.417, 52.883, srid=4326),
            },
            {
                "name": "Glenveagh National Park Parking",
                "poi_type": "parking",
                "county": "Donegal",
                "region": "North",
                "description": "Main parking for Glenveagh trails",
                "phone": "+353 74 913 7090",
                "location": Point(-8.06, 55.07, srid=4326),
            },
            {
                "name": "Glenveagh Castle Tea Rooms",
                "poi_type": "cafe",
                "county": "Donegal",
                "region": "North",
                "description": "Tea rooms at historic castle",
                "opening_hours": "10:00-17:00",
                "location": Point(-8.06, 55.07, srid=4326),
            },
            {
                "name": "Gap of Dunloe Parking",
                "poi_type": "parking",
                "county": "Kerry",
                "region": "Southwest",
                "description": "Parking for Gap of Dunloe trail",
                "location": Point(-9.84, 52.06, srid=4326),
            },
            {
                "name": "Kate Kearney's Cottage",
                "poi_type": "restaurant",
                "county": "Kerry",
                "region": "Southwest",
                "description": "Historic pub and restaurant",
                "phone": "+353 64 664 4036",
                "opening_hours": "10:00-23:00",
                "website": "https://www.katekearneyscottage.com",
                "location": Point(-9.84, 52.06, srid=4326),
            },
            {
                "name": "Torc Mountain Viewpoint",
                "poi_type": "viewpoint",
                "county": "Kerry",
                "region": "Southwest",
                "description": "360° views of Killarney National Park",
                "location": Point(-9.54, 52.0, srid=4326),
            },
            {
                "name": "Muckross House Tea Rooms",
                "poi_type": "cafe",
                "county": "Kerry",
                "region": "Southwest",
                "description": "Historic house with café",
                "opening_hours": "09:00-17:00",
                "location": Point(-9.523, 52.02, srid=4326),
            },
            {
                "name": "Connemara National Park Visitor Centre",
                "poi_type": "information",
                "county": "Galway",
                "region": "West",
                "description": "Visitor information and facilities",
                "phone": "+353 95 41054",
                "opening_hours": "09:00-17:30",
                "location": Point(-9.866, 53.54, srid=4326),
            },
            {
                "name": "Diamond Hill Trail Parking",
                "poi_type": "parking",
                "county": "Galway",
                "region": "West",
                "description": "Parking for popular Diamond Hill trail",
                "location": Point(-9.87, 53.54, srid=4326),
            },
            {
                "name": "Quay Street Café - Galway",
                "poi_type": "cafe",
                "county": "Galway",
                "region": "West",
                "description": "Café near coastal trails",
                "opening_hours": "08:00-19:00",
                "location": Point(-9.267, 53.273, srid=4326),
            },
            {
                "name": "Achill Head Toilet Facilities",
                "poi_type": "toilet",
                "county": "Mayo",
                "region": "West",
                "description": "Public facilities near Achill Head",
                "location": Point(-10.03, 53.677, srid=4326),
            },
        ]

        created_count = 0
        for poi_data in sample_pois:
            poi, created = PointOfInterest.objects.get_or_create(
                name=poi_data["name"],
                defaults={
                    "poi_type": poi_data.get("poi_type", "attraction"),
                    "county": poi_data.get("county", ""),
                    "region": poi_data.get("region", ""),
                    "description": poi_data.get("description", ""),
                    "phone": poi_data.get("phone", ""),
                    "website": poi_data.get("website", ""),
                    "opening_hours": poi_data.get("opening_hours", ""),
                    "location": poi_data["location"],
                },
            )
            if created:
                created_count += 1
                self.stdout.write(
                    self.style.SUCCESS(f"✅ Created: {poi.name}")
                )
            else:
                self.stdout.write(
                    self.style.WARNING(f"⚠️ Already exists: {poi.name}")
                )

        self.stdout.write(
            self.style.SUCCESS(
                f"\n✅ Successfully loaded {created_count} new POIs"
            )
        )

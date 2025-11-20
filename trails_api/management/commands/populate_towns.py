from django.core.management.base import BaseCommand
from trails_api.models import Town
from django.contrib.gis.geos import Point


class Command(BaseCommand):
    help = 'Populate database with Irish towns and cities'

    def handle(self, *args, **options):
        towns_data = [
            {
                'name': 'Dublin',
                'country': 'Ireland',
                'town_type': 'capital',
                'is_capital': True,
                'location': Point(-6.2603, 53.3498, srid=4326),
                'population': 1256121,
                'area': 114.99,
            },
            {
                'name': 'Cork',
                'country': 'Ireland',
                'town_type': 'city',
                'location': Point(-8.4953, 51.8973, srid=4326),
                'population': 210348,
                'area': 37.39,
            },
            # Add more towns as needed
        ]

        for town_data in towns_data:
            town, created = Town.objects.get_or_create(
                name=town_data['name'],
                defaults=town_data
            )
            status = "Created" if created else "Already exists"
            self.stdout.write(f"{status}: {town.name}")

        self.stdout.write(self.style.SUCCESS('Successfully populated towns'))
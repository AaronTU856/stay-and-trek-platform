from django.core.management.base import BaseCommand

class Command(BaseCommand):
    help = 'Populate weathermap cities using direct model import'

    def handle(self, *args, **kwargs):
        # Import the specific weathermap City model to avoid conflicts
        from weathermap.models import City as WeathermapCity

        cities_data = [
            {"name": "London", "country": "United Kingdom", "lat": 51.5074, "lon": -0.1278},
            {"name": "Paris", "country": "France", "lat": 48.8566, "lon": 2.3522},
            {"name": "New York", "country": "United States", "lat": 40.7128, "lon": -74.0060},
            {"name": "Tokyo", "country": "Japan", "lat": 35.6762, "lon": 139.6503},
            {"name": "Sydney", "country": "Australia", "lat": -33.8688, "lon": 151.2093},
            {"name": "Dubai", "country": "UAE", "lat": 25.2048, "lon": 55.2708},
            {"name": "São Paulo", "country": "Brazil", "lat": -23.5505, "lon": -46.6333},
            {"name": "Mumbai", "country": "India", "lat": 19.0760, "lon": 72.8777},
            {"name": "Cairo", "country": "Egypt", "lat": 30.0444, "lon": 31.2357},
            {"name": "Moscow", "country": "Russia", "lat": 55.7558, "lon": 37.6173},
            {'name': 'Dublin',
                'country': 'Ireland',
                'population': 1388000,
                'lat': 53.349805,
                'lon': -6.26031,},
            
            {'name': 'Cork',
                'country': 'Ireland',
                'population': 224004,
                'lat': 51.8985,
                'lon': -8.4756,},
            
            { 'name': 'London',
                'country': 'United Kingdom',
                'population': 8982000,
                'lat': 51.5074,
                'lon': -0.1278,},
            {'name': 'Paris',
                'country': 'France',
                'population': 2161000,
                'lat': 48.8566,
                'lon': 2.3522,},
            
            {'name': 'Berlin',
                'country': 'Germany',
                'population': 3669000,
                'lat': 52.5200,
                'lon': 13.4050,},
        ]
        
        
        
        
        

        # Show which model we're using
        self.stdout.write(f'Using model: {WeathermapCity._meta.app_label}.{WeathermapCity.__name__}')
        self.stdout.write(f'Table name: {WeathermapCity._meta.db_table}')
        self.stdout.write(f'Fields: {[f.name for f in WeathermapCity._meta.fields]}')

        # Clear existing data
        self.stdout.write('Clearing existing cities...')
        deleted_count = WeathermapCity.objects.count()
        WeathermapCity.objects.all().delete()
        self.stdout.write(f'Deleted {deleted_count} existing cities')

        # Create cities
        created_count = 0
        for city_data in cities_data:
            try:
                city = WeathermapCity.objects.create(
                    name=city_data["name"],
                    country=city_data["country"],
                    latitude=city_data["lat"],
                    longitude=city_data["lon"]
                )
                created_count += 1
                self.stdout.write(f'✅ Created: {city.name}, {city.country}')

            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(f'❌ Error creating {city_data["name"]}: {str(e)}')
                )

        self.stdout.write(
            self.style.SUCCESS(f'Successfully created {created_count} cities in weathermap app')
        )

        # Verify the data
        final_count = WeathermapCity.objects.count()
        self.stdout.write(f'Final count in weathermap.City: {final_count}')
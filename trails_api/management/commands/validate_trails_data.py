# filepath: trails_api/management/commands/validate_trails_data.py
from django.core.management.base import BaseCommand
from django.contrib.gis.geos import Point
from trails_api.models import Trail, Town

# Management command to validate trails and towns spatial data
class Command(BaseCommand):
    help = 'Validate trails and towns spatial data'

    # Handle method to perform validations
    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS("Starting trails & towns validation..."))

        # Count records
        trails_count = Trail.objects.count()
        towns_count = Town.objects.count()
        self.stdout.write(f"✓ Trails: {trails_count}")
        self.stdout.write(f"✓ Towns: {towns_count}")

        # Check for invalid geometries (if any)
        invalid_towns = Town.objects.exclude(location__isnull=False)
        self.stdout.write(f"✓ Valid town geometries: {towns_count - invalid_towns.count()}")

        # Example: trails that allow dogs
        dog_friendly = Trail.objects.filter(dogs_allowed='yes').count()
        self.stdout.write(f"✓ Dog-friendly trails: {dog_friendly}")

        # Example: long or hard trails
        hard_trails = Trail.objects.filter(difficulty='Hard', distance_km__gte=10).count()
        self.stdout.write(f"✓ Hard trails over 10 km: {hard_trails}")

        # Example spatial test — trails near Galway
        galway = Point(-9.05, 53.27, srid=4326)
        nearby_towns = Town.objects.filter(location__distance_lte=(galway, 20000)).count()
        self.stdout.write(f"✓ Towns within 20km of Galway: {nearby_towns}")

        self.stdout.write(self.style.SUCCESS("Validation complete!"))

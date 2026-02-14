from django.core.management.base import BaseCommand
from trails_api.models import Trail
from trails_api.utils import fetch_external_description

class Command(BaseCommand):
    help = 'Bulk scrapes descriptions for trails with missing data'

    def handle(self, *args, **options):
        # Find all trails where description is empty or null
        missing_trails = Trail.objects.filter(description__isnull=True) | Trail.objects.filter(description='')
        
        self.stdout.write(self.style.SUCCESS(f"Found {missing_trails.count()} trails to process."))

        for trail in missing_trails:
            self.stdout.write(f"Processing: {trail.trail_name}...")
            
            desc, status = fetch_external_description(trail.trail_name)
            
            if desc:
                trail.description = desc
                trail.status = status
                trail.save()
                self.stdout.write(self.style.SUCCESS(f"Successfully updated {trail.trail_name}"))
            else:
                self.stdout.write(self.style.WARNING(f"Could not find info for {trail.trail_name}"))

        self.stdout.write(self.style.SUCCESS("Scraping task complete."))
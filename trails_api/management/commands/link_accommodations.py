from django.core.management.base import BaseCommand
from django.contrib.gis.measure import D
from trails_api.models import Trail, Accommodation

class Command(BaseCommand):
    help = 'Links accommodations to trails within a 2km radius'

    def handle(self, *args, **options):
        self.stdout.write("Linking accommodations to nearby trails...")
        
        trails = Trail.objects.all()
        link_count = 0

        for trail in trails:
            # We use 'path' here because that is your geometry field
            nearby_stays = Accommodation.objects.filter(
                location__distance_lte=(trail.path, D(m=2000))
            )
            
            if nearby_stays.exists():
                trail.accommodations.add(*nearby_stays)
                link_count += nearby_stays.count()
                self.stdout.write(f"Linked {nearby_stays.count()} stays to {trail.trail_name}")

        self.stdout.write(self.style.SUCCESS(f"Finished! Created {link_count} total links."))
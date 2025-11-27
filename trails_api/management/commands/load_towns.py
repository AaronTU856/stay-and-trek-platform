from django.core.management.base import BaseCommand
from django.contrib.gis.geos import Point
from trails_api.models import Town
import json

# Management command to load towns from a simplified GeoJSON file
class Command(BaseCommand):
    help = "Load towns from simplified GeoJSON"

# Handle method to read GeoJSON and populate Town model
    def handle(self, *args, **kwargs):
        file_path = "trails_api/data/sample_towns.geojson"


        with open(file_path, "r") as f:
            data = json.load(f)

        count = 0
        for feature in data["features"]:
            props = feature["properties"]
            geom = feature["geometry"]
            # Get town name
            name = props.get("ENGLISH")
            county = props.get("COUNTY")
            gaeltacht = props.get("GAELTACHT")
            area = props.get("AREA")
            # Only proceed if geometry is a Point
            if geom and geom["type"] == "Point":
                lon, lat = geom["coordinates"]
                point = Point(lon, lat, srid=4326)
                # Create or get Town entry
                Town.objects.get_or_create(
                    name=name,
                    defaults={
                        "location": point,
                        "town_type": county,
                        "area": area,
                        "population": props.get("POPULATION"),
                    },
                )
                count += 1

        self.stdout.write(self.style.SUCCESS(f"✅ Imported {count} towns successfully"))

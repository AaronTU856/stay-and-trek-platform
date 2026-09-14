"""Fictional records for the standalone local demo database only."""
import os

from django.conf import settings
from django.contrib.gis.geos import LineString, MultiLineString, Point
from django.core.management.base import BaseCommand, CommandError
from django.db import connection, transaction

from trails_api.models import Accommodation, Town, Trail


class Command(BaseCommand):
    help = "Add fictional demo records to the isolated stayandtrek_demo database."

    def handle(self, *args, **options):
        db = connection.settings_dict
        if not (
            settings.DEBUG and os.getenv("STAY_TREK_DEMO") == "1"
            and os.getenv("ACTIVE_DB") == "local"
            and not os.getenv("K_SERVICE")
            and os.getenv("USE_CLOUD_PROXY") != "true"
            and db["ENGINE"] == "django.contrib.gis.db.backends.postgis"
            and db["HOST"] == "db" and db["NAME"] == "stayandtrek_demo"
        ):
            raise CommandError("Demo seeding is restricted to the isolated local demo stack.")

        with transaction.atomic():
            with connection.cursor() as cursor:
                cursor.execute("SELECT current_database()")
                if cursor.fetchone()[0] != "stayandtrek_demo":
                    raise CommandError("Connected database is not the demo database.")
                # Serialise seed runs so simultaneous invocations cannot duplicate records.
                cursor.execute("SELECT pg_advisory_xact_lock(8562026)")

            created = 0
            for name, lon, lat in [
                ("DEMO Willow Village", -6.32, 53.01),
                ("DEMO Fern Town", -6.28, 53.03),
            ]:
                _, added = Town.objects.get_or_create(
                    name=name, defaults={"location": Point(lon, lat, srid=4326)},
                )
                created += added

            trails = []
            for name, difficulty, distance, elevation, lon, lat in [
                ("DEMO Willow Loop", "easy", 3, 50, -6.32, 53.01),
                ("DEMO Fern Walk", "moderate", 6, 200, -6.30, 53.02),
                ("DEMO Ridge Trail", "hard", 10, 500, -6.28, 53.03),
            ]:
                line = LineString((lon, lat), (lon + .005, lat + .003),
                                  (lon + .01, lat), srid=4326)
                trail, added = Trail.objects.get_or_create(
                    trail_name=name,
                    defaults={"county": "Wicklow", "region": "Leinster",
                              "difficulty": difficulty, "distance_km": distance,
                              "elevation_gain_m": elevation,
                              "description": "Fictional development fixture, not a real walking route.",
                              "status": "verified", "start_point": Point(lon, lat, srid=4326),
                              "path": MultiLineString(line, srid=4326)},
                )
                trails.append(trail)
                created += added

            for index, name in enumerate(["DEMO Willow Hotel", "DEMO Fern Hostel", "DEMO Ridge Campsite"]):
                stay, added = Accommodation.objects.get_or_create(
                    external_id=f"stay-trek-demo-{index + 1}",
                    defaults={"name": name, "source": "manual",
                              "location": Point(-6.32 + index * .02, 53.011 + index * .01, srid=4326)},
                )
                if added:
                    stay.nearby_trails.add(trails[index])
                created += added

        self.stdout.write(self.style.SUCCESS(f"Demo seed complete: {created} records created. Existing records preserved."))

import math
from typing import Optional, Tuple

from django.core.management.base import BaseCommand
from django.db import transaction
from django.contrib.gis.geos import LineString, MultiLineString, GEOSGeometry, Point

import requests
import json

from trails_api.models import Trail


ARCGIS_QUERY_URL = (
    "https://services-eu1.arcgis.com/CltcWyRoZmdwaB7T/arcgis/rest/services/"
    "GetIrelandActiveTrailRoutes/FeatureServer/0/query"
)


def map_difficulty(value: Optional[str]) -> str:
    if not value:
        return "moderate"
    v = value.strip().lower()
    if v in {"easy", "facile"}:
        return "easy"
    if v in {"moderate", "moderato"}:
        return "moderate"
    # Map any stronger terms to hard
    if "challenging" in v or "difficult" in v or "very" in v or v in {"hard"}:
        return "hard"
    return "moderate"


def coerce_float(val, default: float = 0.0) -> float:
    try:
        if val is None:
            return default
        if isinstance(val, (int, float)):
            return float(val)
        s = str(val).strip().replace(",", "")
        # Extract first number in string
        for tok in s.split():
            try:
                return float(tok)
            except ValueError:
                continue
        return default
    except Exception:
        return default


def to_multilinestring(geom: GEOSGeometry) -> Optional[MultiLineString]:
    """Convert geometry to MultiLineString for storage, preserving multi-part routes.

    - If LineString: wrap in MultiLineString
    - If MultiLineString: return as-is
    - Otherwise: None
    """
    if geom is None:
        return None
    if isinstance(geom, LineString):
        return MultiLineString([geom])
    if isinstance(geom, MultiLineString):
        return geom
    return None


def first_point_of_geometry(geom: GEOSGeometry) -> Optional[Point]:
    mls = to_multilinestring(geom)
    if not mls or len(mls) == 0:
        return None
    ls = mls[0]
    coords = ls.coords
    if not coords:
        return None
    x, y = coords[0]
    return Point(x, y, srid=4326)


class Command(BaseCommand):
    help = "Import/update Trail.path from ArcGIS FeatureServer (Ireland Active Trail Routes)."

    def add_arguments(self, parser):
        parser.add_argument("--limit", type=int, default=0, help="Max features to process (0 = no limit)")
        parser.add_argument("--offset", type=int, default=0, help="Starting resultOffset for paging")
        parser.add_argument(
            "--update-only",
            action="store_true",
            help="Only update existing trails by name; do not create new records",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Run without saving changes to the database",
        )

    def handle(self, *args, **options):
        limit = options["limit"]
        offset = options["offset"]
        update_only = options["update_only"]
        dry_run = options["dry_run"]

        processed = 0
        created = 0
        updated = 0
        skipped = 0

        params = {
            "where": "1=1",
            "outFields": "OBJECTID,Name,County,Activity,TrailActivity,Format,Grade,Difficulty,TrailType,LengthKm,AscentMetres,DogsAllowed,Latitude,Longitude",
            "f": "geojson",
            "outSR": 4326,
            "resultRecordCount": 2000,
        }

        self.stdout.write(self.style.NOTICE("Fetching trail routes from ArcGIS (WGS84 GeoJSON)..."))

        session = requests.Session()
        while True:
            if limit and processed >= limit:
                break

            params["resultOffset"] = offset
            try:
                resp = session.get(ARCGIS_QUERY_URL, params=params, timeout=60)
                resp.raise_for_status()
            except Exception as e:
                self.stderr.write(self.style.ERROR(f"Request failed at offset {offset}: {e}"))
                break

            data = resp.json()

            features = data.get("features", [])
            if not features:
                # no more results
                break

            for feat in features:
                if limit and processed >= limit:
                    break

                props = feat.get("properties", {})
                name = (props.get("Name") or "").strip()
                if not name:
                    skipped += 1
                    continue

                county = (props.get("County") or "").strip()
                activity = (props.get("TrailActivity") or props.get("Activity") or "").strip()
                trail_type = (props.get("TrailType") or props.get("Format") or "").strip()
                length_km = coerce_float(props.get("LengthKm"), default=0.0)
                ascent_m = int(coerce_float(props.get("AscentMetres"), default=0.0))
                dogs_allowed_raw = (props.get("DogsAllowed") or "").strip().lower()
                dogs_allowed = True if dogs_allowed_raw in {"yes", "y", "true", "allowed"} else False
                difficulty_raw = props.get("Difficulty") or props.get("Grade")
                difficulty = map_difficulty(difficulty_raw)

                geom_obj = None
                if feat.get("geometry"):
                    try:
                        geom_obj = GEOSGeometry(json.dumps(feat["geometry"]))
                        geom_obj.srid = 4326
                    except Exception:
                        geom_obj = None

                path = None
                if geom_obj is not None:
                    path = to_multilinestring(geom_obj)

                # Find existing by trail_name (case-insensitive)
                qs = Trail.objects.filter(trail_name__iexact=name)
                trail = qs.first()

                if not trail:
                    if update_only:
                        skipped += 1
                        continue
                    # Create a new trail with minimal required fields
                    start_pt = first_point_of_geometry(geom_obj) if geom_obj else None
                    if not start_pt:
                        # Fallback: if latitude/longitude fields available
                        lat = props.get("Latitude")
                        lon = props.get("Longitude")
                        if lat is not None and lon is not None:
                            try:
                                start_pt = Point(float(lon), float(lat), srid=4326)
                            except Exception:
                                start_pt = None
                    if not start_pt:
                        # Cannot create without a start_point as model requires it
                        skipped += 1
                        continue

                    trail = Trail(
                        trail_name=name,
                        county=county[:100] if county else "",
                        region="",
                        nearest_town="",
                        distance_km=length_km,
                        difficulty=difficulty,
                        elevation_gain_m=ascent_m,
                        start_point=start_pt,
                        activity=activity,
                        trail_type=trail_type,
                        dogs_allowed=dogs_allowed,
                    )
                    if path is not None:
                        trail.path = path
                    if not dry_run:
                        trail.save()
                    created += 1
                else:
                    # Update selected fields; leave existing values when missing
                    changed = False
                    if county and trail.county != county:
                        trail.county = county[:100]
                        changed = True
                    if activity and trail.activity != activity:
                        trail.activity = activity
                        changed = True
                    if trail_type and trail.trail_type != trail_type:
                        trail.trail_type = trail_type
                        changed = True
                    if length_km and float(trail.distance_km) != float(length_km):
                        trail.distance_km = length_km
                        changed = True
                    if ascent_m and trail.elevation_gain_m != ascent_m:
                        trail.elevation_gain_m = ascent_m
                        changed = True
                    if difficulty and trail.difficulty != difficulty:
                        trail.difficulty = difficulty
                        changed = True
                    if path is not None:
                        trail.path = path
                        changed = True
                    if trail.start_point is None and geom_obj is not None:
                        sp = first_point_of_geometry(geom_obj)
                        if sp:
                            trail.start_point = sp
                            changed = True
                    if dogs_allowed is not None and trail.dogs_allowed != dogs_allowed:
                        trail.dogs_allowed = dogs_allowed
                        changed = True
                    if changed and not dry_run:
                        trail.save()
                        updated += 1
                    elif changed:
                        updated += 1

                processed += 1

            offset += params["resultRecordCount"]

        self.stdout.write(
            self.style.SUCCESS(
                f"ArcGIS import complete. processed={processed}, created={created}, updated={updated}, skipped={skipped}"
            )
        )

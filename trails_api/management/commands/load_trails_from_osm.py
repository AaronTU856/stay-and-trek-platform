"""
Import full trail paths from OpenStreetMap (Overpass API) and update Trail.path.

Usage examples:
  - Import by name (relation preferred, falls back to ways):
      python manage.py load_trails_from_osm --name "Wicklow Way"

  - Create trail if not found locally (minimal fields):
      python manage.py load_trails_from_osm --name "Wicklow Way" --create-if-missing

Notes:
  - Uses Ireland bbox by default: 51.5,-10.5,55.4,-5.4
  - Tries relations route=hiking/foot/walking first, then ways with matching name.
  - Merges member ways into a LineString/MultiLineString geometry.
"""

import json
import time
import requests
from django.core.management.base import BaseCommand, CommandError
from django.contrib.gis.geos import LineString, MultiLineString, GEOSGeometry, Point
from django.db import transaction

from trails_api.models import Trail

IRELAND_BBOX = "51.5,-10.5,55.4,-5.4"  # minlat,minlon,maxlat,maxlon
OVERPASS_URL = "https://overpass-api.de/api/interpreter"


class Command(BaseCommand):
    help = "Import full trail paths from OSM Overpass API and update Trail.path"

    def add_arguments(self, parser):
        parser.add_argument("--name", type=str, help="Trail name to import (exact or case-insensitive)")
        parser.add_argument("--bbox", type=str, default=IRELAND_BBOX, help="BBox as minlat,minlon,maxlat,maxlon")
        parser.add_argument("--timeout", type=int, default=90, help="Overpass timeout seconds")
        parser.add_argument("--create-if-missing", action="store_true", help="Create a Trail if none exists locally")

    def handle(self, *args, **opts):
        name = opts.get("name")
        if not name:
            raise CommandError("--name is required (e.g., --name 'Wicklow Way')")
        bbox = opts.get("bbox")
        timeout = int(opts.get("timeout") or 90)
        create_if_missing = bool(opts.get("create_if_missing"))

        self.stdout.write(self.style.WARNING(f"🔎 Importing trail geometry for: {name}"))

        # First, try relation-based route (preferred for long trails)
        geom = self._fetch_relation_geometry(name, bbox, timeout)
        if geom is None:
            # Fall back to named ways
            self.stdout.write("  ℹ️ No relation match; trying named ways...")
            geom = self._fetch_way_geometry(name, bbox, timeout)

        if geom is None:
            raise CommandError("No geometry found from Overpass for given name.")

        # Update or create Trail record
        with transaction.atomic():
            qs = Trail.objects.filter(trail_name__iexact=name)
            if qs.exists():
                trail = qs.first()
                trail.path = geom
                # If start_point missing, set from first coordinate
                if not trail.start_point:
                    try:
                        first_pt = self._first_point_from_geom(geom)
                        if first_pt:
                            trail.start_point = first_pt
                    except Exception:
                        pass
                trail.save(update_fields=["path", "start_point"])
                self.stdout.write(self.style.SUCCESS(f"✅ Updated existing trail path: {trail.trail_name}"))
            else:
                if not create_if_missing:
                    raise CommandError("Trail not found locally. Re-run with --create-if-missing to create it.")
                # Create minimal Trail
                first_pt = self._first_point_from_geom(geom) or Point(-8.5, 53.3, srid=4326)
                trail = Trail.objects.create(
                    trail_name=name,
                    county="",
                    region="",
                    distance_km=0,
                    difficulty="moderate",
                    elevation_gain_m=0,
                    start_point=first_pt,
                    path=geom,
                )
                self.stdout.write(self.style.SUCCESS(f"✅ Created new trail with path: {trail.trail_name}"))

        self.stdout.write(self.style.SUCCESS("🎉 Import complete"))

    def _first_point_from_geom(self, geom: GEOSGeometry):
        try:
            if geom.geom_type == "LineString":
                x, y = geom.coords[0]
                return Point(x, y, srid=4326)
            elif geom.geom_type == "MultiLineString":
                ls = list(geom)[0]
                x, y = ls.coords[0]
                return Point(x, y, srid=4326)
        except Exception:
            return None
        return None

    def _fetch_relation_geometry(self, name: str, bbox: str, timeout: int):
        """Fetch geometry from OSM relations with route=hiking/foot/walking and given name.
        Builds MultiLineString from member ways.
        """
        query = f"""
[out:json][timeout:{timeout}];
rel["route"~"^(hiking|foot|walking)$"]["name"~"^{name}$",i]({bbox});
(._;>;);  // fetch members (ways + nodes)
way(r);
out geom;
"""
        data = self._overpass(query)
        if not data:
            return None

        ways = [el for el in data.get("elements", []) if el.get("type") == "way" and el.get("geometry")]
        lines = []
        for w in ways:
            coords = [(pt["lon"], pt["lat"]) for pt in w["geometry"] if "lon" in pt and "lat" in pt]
            if len(coords) >= 2:
                try:
                    lines.append(LineString(coords, srid=4326))
                except Exception:
                    continue
        if not lines:
            return None
        mls = MultiLineString(lines, srid=4326)
        try:
            merged = mls.unary_union  # may return LineString or MultiLineString
            return merged
        except Exception:
            return mls

    def _fetch_way_geometry(self, name: str, bbox: str, timeout: int):
        """Fetch geometry from ways with highway=path/footway and matching name."""
        query = f"""
[out:json][timeout:{timeout}];
way["highway"~"^(path|footway)$"]["name"~"^{name}$",i]({bbox});
out geom;
"""
        data = self._overpass(query)
        if not data:
            return None
        ways = [el for el in data.get("elements", []) if el.get("type") == "way" and el.get("geometry")]
        lines = []
        for w in ways:
            coords = [(pt["lon"], pt["lat"]) for pt in w["geometry"] if "lon" in pt and "lat" in pt]
            if len(coords) >= 2:
                try:
                    lines.append(LineString(coords, srid=4326))
                except Exception:
                    continue
        if not lines:
            return None
        mls = MultiLineString(lines, srid=4326)
        try:
            return mls.unary_union
        except Exception:
            return mls

    def _overpass(self, query: str):
        self.stdout.write("  🌐 Querying Overpass...")
        try:
            resp = requests.post(OVERPASS_URL, data={"data": query}, timeout=120)
            resp.raise_for_status()
            return resp.json()
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"  ❌ Overpass request failed: {e}"))
            return None

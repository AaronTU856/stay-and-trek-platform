"""
Management command to load geographic features (rivers, protected areas) from external APIs
Run with: python manage.py load_geographic_features
"""

import requests
import json
from django.core.management.base import BaseCommand
from django.contrib.gis.geos import GEOSGeometry, Polygon, MultiPolygon, LineString, MultiLineString
from trails_api.models import GeographicBoundary


class Command(BaseCommand):
    help = "Load geographic features (rivers, protected areas) from external APIs"

    def add_arguments(self, parser):
        parser.add_argument(
            '--rivers',
            action='store_true',
            help='Load rivers from Overpass API',
        )
        parser.add_argument(
            '--protected-areas',
            action='store_true',
            help='Load protected areas (land)',
        )
        parser.add_argument(
            '--marine',
            action='store_true',
            help='Load marine protected areas',
        )
        parser.add_argument(
            '--all',
            action='store_true',
            help='Load all geographic features',
        )

    def handle(self, *args, **options):
        """Main command handler"""
        
        # Default to loading all if no options specified
        if not any([options['rivers'], options['protected_areas'], options['marine'], options['all']]):
            options['all'] = True

        if options['rivers'] or options['all']:
            self.stdout.write("🌊 Loading rivers...")
            self.load_rivers()

        if options['protected_areas'] or options['all']:
            self.stdout.write("🏞️ Loading protected areas...")
            self.load_protected_areas()

        if options['marine'] or options['all']:
            self.stdout.write("🐠 Loading marine protected areas...")
            self.load_marine_protected_areas()

        self.stdout.write(self.style.SUCCESS("✅ Geographic features loading complete!"))

    def load_rivers(self):
        """Load rivers from Overpass API"""
        self.stdout.write("📡 Attempting to load rivers from Overpass API...")

        overpass_url = "https://overpass-api.de/api/interpreter"
        
        # Query for major rivers in Ireland
        query = """
        [bbox:51.3,-10.5,55.4,-5.3];
        (
          way["waterway"="river"]["name"];
        );
        out geom;
        """
        
        rivers_data = []
        
        try:
            self.stdout.write("  Sending request to Overpass API...")
            response = requests.post(overpass_url, data={'data': query}, timeout=180)
            response.raise_for_status()
            
            data = response.json()
            elements = data.get('elements', [])
            
            self.stdout.write(f"✅ Got {len(elements)} river features from Overpass API")
            
            for element in elements:
                tags = element.get('tags', {})
                river_name = tags.get('name')
                if not river_name:
                    continue
                    
                geometry = element.get('geometry', [])
                if len(geometry) < 2:
                    continue
                
                coords = [(g['lon'], g['lat']) for g in geometry]
                rivers_data.append({'name': river_name, 'coords': coords})

        except Exception as e:
            self.stdout.write(self.style.ERROR(f"❌ Overpass API failed ({str(e)}). No fallback data available. Please try again later."))
            return
        
        # Load rivers from API data
        if not rivers_data:
            self.stdout.write(self.style.WARNING("⚠️ No rivers returned from API"))
            return
        
        created_count = 0
        for river in rivers_data:
            try:
                coords = river['coords']
                geom = LineString(coords, srid=4326)
                
                # Check if already exists
                if not GeographicBoundary.objects.filter(name=str(river['name']), boundary_type='river').exists():
                    boundary = GeographicBoundary.objects.create(
                        name=str(river['name']),
                        boundary_type='river',
                        geom=geom,
                        description=f"River in Ireland - from OpenStreetMap"
                    )
                    created_count += 1
                    self.stdout.write(f"  ✅ Created: {river['name']}")
                    
            except Exception as e:
                self.stdout.write(self.style.WARNING(f"  ⚠️ Error creating {river['name']}: {str(e)}"))
                continue

        self.stdout.write(self.style.SUCCESS(f"✅ Loaded {created_count} rivers"))

    def load_protected_areas(self):
        """Load land protected areas (national parks, nature reserves) from Overpass API"""
        self.stdout.write("📡 Attempting to load protected areas from Overpass API...")

        overpass_url = "https://overpass-api.de/api/interpreter"
        
        # Query for national parks and nature reserves
        query = """
        [bbox:51.3,-10.5,55.4,-5.3];
        (
          relation["boundary"="national_park"];
          relation["leisure"="nature_reserve"];
          way["boundary"="national_park"];
          way["leisure"="nature_reserve"];
        );
        out geom;
        """

        protected_areas_data = []
        
        try:
            self.stdout.write("  Sending request to Overpass API...")
            response = requests.post(overpass_url, data={'data': query}, timeout=120)
            response.raise_for_status()
            
            data = response.json()
            elements = data.get('elements', [])
            self.stdout.write(f"✅ Got {len(elements)} protected area features from Overpass API")
            
            for element in elements:
                tags = element.get('tags', {})
                name = tags.get('name')
                if not name:
                    continue
                
                # Determine boundary type
                if tags.get('boundary') == 'national_park':
                    boundary_type = 'national_park'
                elif tags.get('leisure') == 'nature_reserve':
                    boundary_type = 'nature_reserve'
                else:
                    continue
                
                geometry = element.get('geometry', [])
                if len(geometry) < 3:
                    continue
                
                coords = [(g['lon'], g['lat']) for g in geometry]
                protected_areas_data.append({
                    'name': name,
                    'boundary_type': boundary_type,
                    'coords': coords
                })

        except Exception as e:
            self.stdout.write(self.style.ERROR(f"❌ Overpass API failed ({str(e)}). No fallback data available. Please try again later."))
            return
        
        # Load protected areas from API data
        if not protected_areas_data:
            self.stdout.write(self.style.WARNING("⚠️ No protected areas returned from API"))
            return
        
        created_count = 0
        for area in protected_areas_data:
            try:
                coords = area['coords']
                if coords[0] != coords[-1]:
                    coords.append(coords[0])
                
                geom = Polygon(coords, srid=4326)
                
                # Check if already exists
                if not GeographicBoundary.objects.filter(name=str(area['name']), boundary_type=area['boundary_type']).exists():
                    boundary = GeographicBoundary.objects.create(
                        name=str(area['name']),
                        boundary_type=area['boundary_type'],
                        geom=geom,
                        description=f"Protected area: {area['boundary_type'].replace('_', ' ').title()}"
                    )
                    created_count += 1
                    self.stdout.write(f"  ✅ Created: {area['name']}")
                    
            except Exception as e:
                self.stdout.write(self.style.WARNING(f"  ⚠️ Error creating {area['name']}: {str(e)}"))
                continue

        self.stdout.write(self.style.SUCCESS(f"✅ Loaded {created_count} protected areas"))
    # Marine Protected Areas
    def load_marine_protected_areas(self):
        """Load marine protected areas from ArcGIS endpoint"""
        self.stdout.write("📡 Querying ArcGIS for marine protected areas...")

        arcgis_url = "https://services-eu1.arcgis.com/JD89j6JX786MpRBU/arcgis/rest/services/NMPF_5_1_2_Protected_Marine_Sites_96195/FeatureServer/4/query"
        
        params = {
            'where': '1=1',
            'outFields': '*',
            'f': 'geojson',
            'resultRecordCount': 1000,
        }

        try:
            response = requests.get(arcgis_url, params=params, timeout=60)
            response.raise_for_status()
            
            geojson = response.json()
            features = geojson.get('features', [])
            
            self.stdout.write(f"Found {len(features)} marine protected area features")
            
            created_count = 0
            for feature in features:
                props = feature.get('properties', {})
                geometry = feature.get('geometry', {})
                
                name = props.get('name', props.get('OBJECTID', 'Unnamed Marine Area'))
                
                try:
                    # Convert GeoJSON geometry to GEOS geometry
                    if geometry['type'] == 'Polygon':
                        coords = geometry['coordinates'][0]
                        # Swap lon/lat to lat/lon and create polygon
                        coords = [(lon, lat) for lon, lat in coords]
                        if coords[0] != coords[-1]:
                            coords.append(coords[0])
                        geom = Polygon(coords, srid=4326)
                    elif geometry['type'] == 'MultiPolygon':
                        polys = []
                        for poly_coords in geometry['coordinates']:
                            coords = [(lon, lat) for lon, lat in poly_coords[0]]
                            if coords[0] != coords[-1]:
                                coords.append(coords[0])
                            polys.append(Polygon(coords, srid=4326))
                        geom = MultiPolygon(polys, srid=4326)
                    else:
                        continue
                    
                    # Check if already exists
                    if not GeographicBoundary.objects.filter(name=str(name), boundary_type='marine_protected').exists():
                        boundary = GeographicBoundary.objects.create(
                            name=str(name),
                            boundary_type='marine_protected',
                            geom=geom,
                            description="Marine Protected Area in Irish waters"
                        )
                        created_count += 1
                        self.stdout.write(f"  ✅ Created: {name}")
                        
                except Exception as e:
                    self.stdout.write(self.style.WARNING(f"  ⚠️ Error creating {name}: {str(e)}"))
                    continue

            self.stdout.write(self.style.SUCCESS(f"✅ Loaded {created_count} marine protected areas"))

        except requests.exceptions.RequestException as e:
            self.stdout.write(self.style.ERROR(f"❌ Error querying ArcGIS: {str(e)}"))

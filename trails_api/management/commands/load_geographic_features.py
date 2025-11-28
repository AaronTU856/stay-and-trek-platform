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
        """Load rivers from Marine Plan ArcGIS API (data.gov.ie)"""
        self.stdout.write("📡 Querying Marine Plan ArcGIS API for rivers...")

        # ArcGIS API endpoint for rivers
        arcgis_url = "https://msp-opendata-marineplan.hub.arcgis.com/datasets/marineplan::rivers-ireland-1.json"
        
        try:
            response = requests.get(arcgis_url, timeout=60)
            response.raise_for_status()
            
            data = response.json()
            features = data.get('features', [])
            
            self.stdout.write(f"Found {len(features)} river features from Marine Plan API")
            
            created_count = 0
            for feature in features:
                props = feature.get('properties', {})
                geometry = feature.get('geometry', {})
                
                river_name = props.get('name', props.get('OBJECTID', 'Unnamed River'))
                
                try:
                    # Handle different geometry types
                    if geometry['type'] == 'LineString':
                        coords = geometry['coordinates']
                        # GeoJSON is lon/lat, convert to (lon, lat) tuples
                        coords = [(lon, lat) for lon, lat in coords]
                        geom = LineString(coords, srid=4326)
                    elif geometry['type'] == 'MultiLineString':
                        lines = []
                        for line_coords in geometry['coordinates']:
                            coords = [(lon, lat) for lon, lat in line_coords]
                            lines.append(LineString(coords, srid=4326))
                        geom = MultiLineString(lines, srid=4326)
                    else:
                        continue
                    
                    # Check if already exists
                    if not GeographicBoundary.objects.filter(name=str(river_name), boundary_type='river').exists():
                        boundary = GeographicBoundary.objects.create(
                            name=str(river_name),
                            boundary_type='river',
                            geom=geom,
                            description=f"River in Ireland - from Marine Plan"
                        )
                        created_count += 1
                        self.stdout.write(f"  ✅ Created: {river_name}")
                        
                except Exception as e:
                    self.stdout.write(self.style.WARNING(f"  ⚠️ Error creating {river_name}: {str(e)}"))
                    continue

            self.stdout.write(self.style.SUCCESS(f"✅ Loaded {created_count} rivers from Marine Plan API"))

        except requests.exceptions.RequestException as e:
            self.stdout.write(self.style.ERROR(f"❌ Error querying Marine Plan API: {str(e)}"))

    def load_protected_areas(self):
        """Load land protected areas (national parks, nature reserves) from Overpass API"""
        self.stdout.write("📡 Querying Overpass API for protected areas...")

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

        try:
            response = requests.post(overpass_url, data={'data': query}, timeout=60)
            response.raise_for_status()
            
            data = response.json()
            elements = data.get('elements', [])
            
            self.stdout.write(f"Found {len(elements)} protected area features")
            
            created_count = 0
            for element in elements:
                tags = element.get('tags', {})
                name = tags.get('name', 'Unnamed Protected Area')
                
                # Determine boundary type
                if tags.get('boundary') == 'national_park':
                    boundary_type = 'national_park'
                elif tags.get('leisure') == 'nature_reserve':
                    boundary_type = 'nature_reserve'
                else:
                    boundary_type = 'protected_area'
                
                try:
                    geometry = element.get('geometry', [])
                    if not geometry:
                        continue
                    
                    # Convert to polygon
                    coords = [(g['lon'], g['lat']) for g in geometry]
                    if len(coords) < 3:
                        continue
                    
                    # Close polygon if needed
                    if coords[0] != coords[-1]:
                        coords.append(coords[0])
                    
                    poly = Polygon(coords, srid=4326)
                    
                    # Check if already exists
                    if not GeographicBoundary.objects.filter(name=name, boundary_type=boundary_type).exists():
                        boundary = GeographicBoundary.objects.create(
                            name=name,
                            boundary_type=boundary_type,
                            geom=poly,
                            description=f"Protected area: {boundary_type.replace('_', ' ').title()}"
                        )
                        created_count += 1
                        self.stdout.write(f"  ✅ Created: {name}")
                        
                except Exception as e:
                    self.stdout.write(self.style.WARNING(f"  ⚠️ Error creating {name}: {str(e)}"))
                    continue

            self.stdout.write(self.style.SUCCESS(f"✅ Loaded {created_count} protected areas"))

        except requests.exceptions.RequestException as e:
            self.stdout.write(self.style.ERROR(f"❌ Error querying Overpass API: {str(e)}"))
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

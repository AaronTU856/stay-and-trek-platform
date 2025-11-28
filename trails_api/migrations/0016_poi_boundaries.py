# Generated migration for POI and Geographic Boundary models

from django.db import migrations, models
import django.contrib.gis.db.models.fields


class Migration(migrations.Migration):

    dependencies = [
        ('trails_api', '0015_alter_town_options_town_country_town_created_at_and_more'),
    ]

    operations = [
        migrations.CreateModel(
            name='PointOfInterest',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(db_index=True, max_length=200)),
                ('poi_type', models.CharField(choices=[('parking', 'Parking'), ('cafe', 'Café'), ('restaurant', 'Restaurant'), ('attraction', 'Attraction'), ('viewpoint', 'Viewpoint'), ('toilet', 'Toilet Facilities'), ('shelter', 'Shelter'), ('picnic', 'Picnic Area'), ('information', 'Information Center'), ('accommodation', 'Accommodation')], db_index=True, max_length=50)),
                ('description', models.TextField(blank=True, null=True)),
                ('location', django.contrib.gis.db.models.fields.PointField(geography=True, db_index=True, srid=4326)),
                ('county', models.CharField(blank=True, db_index=True, max_length=100)),
                ('region', models.CharField(blank=True, max_length=100)),
                ('phone', models.CharField(blank=True, max_length=20)),
                ('website', models.URLField(blank=True, null=True)),
                ('opening_hours', models.CharField(blank=True, max_length=200)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'verbose_name': 'Point of Interest',
                'verbose_name_plural': 'Points of Interest',
            },
        ),
        migrations.CreateModel(
            name='GeographicBoundary',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(db_index=True, max_length=200)),
                ('boundary_type', models.CharField(choices=[('county', 'County'), ('region', 'Region'), ('protected_area', 'Protected Area'), ('national_park', 'National Park'), ('nature_reserve', 'Nature Reserve'), ('forest', 'Forest')], max_length=50)),
                ('geom', django.contrib.gis.db.models.fields.PolygonField(geography=True, db_index=True, srid=4326)),
                ('description', models.TextField(blank=True)),
                ('established_date', models.DateField(blank=True, null=True)),
            ],
            options={
                'verbose_name': 'Geographic Boundary',
                'verbose_name_plural': 'Geographic Boundaries',
            },
        ),
        migrations.CreateModel(
            name='TrailPOIIntersection',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('distance_meters', models.IntegerField()),
                ('on_trail_route', models.BooleanField(default=False)),
                ('proximity', models.CharField(choices=[('at_start', 'At Trail Start'), ('at_end', 'At Trail End'), ('very_close', 'Very Close (< 100m)'), ('close', 'Close (100m - 500m)'), ('moderate', 'Moderate (500m - 2km)'), ('far', 'Far (> 2km)')], max_length=20)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('poi', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='nearby_trails', to='trails_api.pointofinterest')),
                ('trail', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='nearby_pois', to='trails_api.trail')),
            ],
            options={
                'ordering': ['distance_meters'],
                'unique_together': {('trail', 'poi')},
            },
        ),
        migrations.AddIndex(
            model_name='pointofinterest',
            index=models.Index(fields=['poi_type', 'county'], name='poi_type_county_idx'),
        ),
        migrations.AddIndex(
            model_name='trailpoiintersection',
            index=models.Index(fields=['trail', 'proximity'], name='trail_prox_idx'),
        ),
        migrations.AddIndex(
            model_name='trailpoiintersection',
            index=models.Index(fields=['poi', 'distance_meters'], name='poi_dist_idx'),
        ),
    ]

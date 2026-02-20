# Generated migration - add nearby_trails field to accommodation

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('trails_api', '0020_accommodation_trail_status'),
    ]

    operations = [
        migrations.AddField(
            model_name='accommodation',
            name='nearby_trails',
            field=models.ManyToManyField(blank=True, related_name='accommodations', to='trails_api.trail'),
        ),
    ]

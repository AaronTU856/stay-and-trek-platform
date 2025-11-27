# Placeholder to satisfy import
from django.contrib.gis.db import models

# Create your models here that represent geographical entities.
class Trail(models.Model):
    name = models.CharField(max_length=200)
    county = models.CharField(max_length=100)
    distance_km = models.FloatField()
    difficulty = models.CharField(max_length=50)
    geom = models.LineStringField(srid=4326)

    def __str__(self):
        return self.name

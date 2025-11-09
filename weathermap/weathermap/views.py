from django.shortcuts import render
from django.http import JsonResponse
from django.conf import settings
from .models import City
import requests

def map_view(request):
    """Render the main map page"""
    cities = City.objects.all()
    context = {
        'cities': cities,
    }
    return render(request, 'weathermap/map.html', context)

def get_cities_json(request):
    """Return all cities as JSON"""
    cities = City.objects.all().values('id', 'name', 'country', 'latitude', 'longitude')
    return JsonResponse(list(cities), safe=False)

def get_weather(request, city_id):
    """Fetch weather data for a specific city from OpenWeatherMap API"""
    try:
        city = City.objects.get(id=city_id)
    except City.DoesNotExist:
        return JsonResponse({'error': 'City not found'}, status=404)

    api_key = settings.OPENWEATHERMAP_API_KEY
    url = f"https://api.openweathermap.org/data/2.5/weather"

    params = {
        'lat': city.latitude,
        'lon': city.longitude,
        'appid': api_key,
        'units': 'metric'  # Use metric units
    }

    try:
        response = requests.get(url, params=params, timeout=5)
        response.raise_for_status()
        weather_data = response.json()

        # Extract relevant information
        result = {
            'city': city.name,
            'country': city.country,
            'temperature': weather_data['main']['temp'],
            'feels_like': weather_data['main']['feels_like'],
            'humidity': weather_data['main']['humidity'],
            'pressure': weather_data['main']['pressure'],
            'wind_speed': weather_data['wind']['speed'],
            'description': weather_data['weather'][0]['description'],
            'icon': weather_data['weather'][0]['icon'],
        }

        return JsonResponse(result)

    except requests.exceptions.RequestException as e:
        return JsonResponse({'error': f'API request failed: {str(e)}'}, status=500)
    except KeyError as e:
        return JsonResponse({'error': f'Unexpected API response format: {str(e)}'}, status=500)
import requests
from bs4 import BeautifulSoup

def fetch_external_description(trail_name):
    """Waterfall logic: Wikipedia -> SportsIreland -> None"""
    
    # 1. Try Wikipedia
    wiki_url = f"https://en.wikipedia.org/api/rest_v1/page/summary/{trail_name.replace(' ', '_')}"
    try:
        response = requests.get(wiki_url, timeout=5)
        if response.status_code == 200:
            return response.json().get('extract'), 'scraped'
    except Exception:
        pass

    # 2. Add SportsIreland logic here if Wikipedia fails
    # ... scraper code ...

    return None, 'missing'
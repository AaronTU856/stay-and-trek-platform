import requests
from bs4 import BeautifulSoup
from urllib.parse import quote
import re

def fetch_external_description(trail_name):
    headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}
    
    # 1. CLEAN THE NAME 
    search_name = re.split(r' - | \(', trail_name)[0].strip()
    
    # 2. VALIDATION SETTINGS
    trail_keywords = ['trail', 'walk', 'loop', 'waymarked', 'hiking', 'mountain', 'nature', 'path', 'cycle', 'hub']
    blacklist = ['theatre', 'drama', 'actor', 'playwright', 'film', 'abbey theatre', 'company', 'accident', 'incident']

    # 3. SPORT IRELAND SLUG GENERATION
    slug = search_name.lower().replace(' ', '-')
    variants = [f"{slug}-trail", slug, slug.replace('island', '')]

    # --- PHASE 1: SPORT IRELAND ---
    for v in variants:
        si_url = f"https://www.sportireland.ie/outdoors/walking/trails/{v.strip('-')}"
        try:
            res = requests.get(si_url, headers=headers, timeout=4)
            if res.status_code == 200:
                soup = BeautifulSoup(res.content, 'html.parser')
                div = soup.find('div', class_='field--name-field-trail-description')
                if div:
                    return div.get_text(strip=True), si_url, 'scraped'
        except: continue

    # --- PHASE 2: WIKIPEDIA (Strict Fallback) ---
    try:
        # Search with "Ireland" to anchor the location
        search_query = quote(f"{search_name} Ireland")
        search_url = f"https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch={search_query}&format=json"
        s_data = requests.get(search_url, headers=headers, timeout=4).json()
        
        for result in s_data.get('query', {}).get('search', [])[:3]:
            # Skip if title is blacklisted
            if any(bad in result['title'].lower() for bad in blacklist):
                continue
            
            wiki_api_url = f"https://en.wikipedia.org/api/rest_v1/page/summary/{result['title'].replace(' ', '_')}"
            w_res = requests.get(wiki_api_url, headers=headers, timeout=4).json()
            
            if 'extract' in w_res:
                extract = w_res['extract']
                # Valid if it has trail words and NO blacklist words
                if any(word in extract.lower() for word in trail_keywords) and not any(bad in extract.lower() for bad in blacklist):
                    return extract, w_res['content_urls']['desktop']['page'], 'scraped'
    except: pass

    return None, None, 'missing'
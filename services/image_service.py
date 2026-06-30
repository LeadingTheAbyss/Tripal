import os
import requests
import threading
import concurrent.futures
import base64
import re

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

IMAGE_CACHE = {}

# Allow max 2 simultaneous Wikipedia requests to prevent rate limiting (429 Too Many Requests)
WIKI_SEMAPHORE = threading.Semaphore(2)

def fetch_real_image(query: str) -> str:
    """
    Fetch a real photo of a tourist attraction using Wikimedia/Wikipedia.
    """
    import time
    import random

    if query in IMAGE_CACHE:
        return IMAGE_CACHE[query]

    headers = {"User-Agent": "TripEasy/1.0 (https://github.com/LeadingTheAbyss/Tripal; admin@tripeasy.com)"}

    # Helper function to make rate-limited Wikipedia/Wikimedia requests
    def _wiki_get(url, params):
        with WIKI_SEMAPHORE:
            for attempt in range(3):
                res = requests.get(url, params=params, headers=headers, timeout=5)
                if res.status_code == 429:
                    time.sleep(random.uniform(0.5, 1.5) * (2 ** attempt))
                    continue
                res.raise_for_status()
                return res.json()
        return {}

    def _try_wikipedia_pageimages(q: str):
        params = {
            "action": "query", "prop": "pageimages", "generator": "search",
            "gsrsearch": q, "format": "json", "pithumbsize": 800, "gsrlimit": 1
        }
        try:
            data = _wiki_get("https://en.wikipedia.org/w/api.php", params)
            pages = data.get("query", {}).get("pages", {})
            if pages:
                page = list(pages.values())[0]
                if "thumbnail" in page:
                    return page["thumbnail"]["source"]
        except Exception as e:
            print(f"[ImageService] Wikipedia Strategy failed for '{q}': {e}")
        return None

    def _try_commons_search(q: str):
        params = {
            "action": "query", "list": "search", "srsearch": q,
            "srnamespace": 6, "srlimit": 5, "format": "json"
        }
        try:
            data = _wiki_get("https://commons.wikimedia.org/w/api.php", params)
            hits = data.get("query", {}).get("search", [])
            
            exclusions = ["map", "logo", "flag", "portrait", "graph", "chart", "diagram"]
            
            for h in hits:
                title = h.get("title", "")
                title_lower = title.lower()
                if title_lower.endswith(('.jpg', '.jpeg', '.png')) and not any(excl in title_lower for excl in exclusions):
                    info_params = {
                        "action": "query", "titles": title,
                        "prop": "imageinfo", "iiprop": "url", "format": "json"
                    }
                    info_data = _wiki_get("https://commons.wikimedia.org/w/api.php", info_params)
                    for p in info_data.get("query", {}).get("pages", {}).values():
                        if "imageinfo" in p:
                            return p["imageinfo"][0].get("url")
        except Exception as e:
            print(f"[ImageService] Commons Strategy failed for '{q}': {e}")
        return None

    # Simplify query: Remove the last word (usually the city name added by the frontend)
    parts = query.split()
    simplified_query = " ".join(parts[:-1]) if len(parts) > 1 else query
    
    # 4-Strategy Pipeline for Wiki
    strategies = [
        (query, _try_commons_search),
        (simplified_query, _try_commons_search),
        (query, _try_wikipedia_pageimages),
        (simplified_query, _try_wikipedia_pageimages)
    ]
    
    wiki_url = None
    for q, strategy in strategies:
        url = strategy(q)
        if url:
            wiki_url = url
            break

    if wiki_url:
        IMAGE_CACHE[query] = wiki_url
    
    return wiki_url



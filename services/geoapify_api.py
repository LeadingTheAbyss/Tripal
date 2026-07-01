import os
import requests
import hashlib
from typing import List, Optional
from models.entities import Place
from models.enums import CrowdLevel, Weather

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

PLACE_CACHE: dict = {}

CATEGORY_MAP = {
    "tourism.sights": "Sightseeing",
    "tourism.attraction": "Attraction",
    "entertainment.museum": "Museum",
    "religion.place_of_worship": "Spiritual",
    "natural": "Nature",
    "commercial.shopping_mall": "Shopping",
    "entertainment.theme_park": "Amusement"
}

def _get_geoapify_key() -> Optional[str]:
    key = os.getenv("GEOAPIFY_API_KEY")
    if not key or "your_" in key:
        return None
    return key

def _geocode_city_geoapify(city_name: str, api_key: str) -> Optional[tuple]:
    try:
        url = "https://api.geoapify.com/v1/geocode/search"
        params = {
            "text": city_name,
            "format": "json",
            "apiKey": api_key,
            "limit": 1
        }
        res = requests.get(url, params=params, timeout=10)
        res.raise_for_status()
        results = res.json().get("results", [])
        if results:
            return float(results[0].get("lat")), float(results[0].get("lon"))
    except Exception as e:
        print(f"[Geoapify] Geocoding failed for '{city_name}': {e}")
    return None

def search_geoapify_places(city_name: str) -> List[Place]:
    if city_name in PLACE_CACHE:
        print(f"[Geoapify] Returning cached results for '{city_name}'")
        return PLACE_CACHE[city_name]

    api_key = _get_geoapify_key()
    if not api_key:
        print("[Geoapify] No API key found. Fallback to OpenTripMap.")
        return []

    print(f"\n[Geoapify] Fetching attractions for '{city_name}'...")

    coords = _geocode_city_geoapify(city_name, api_key)
    if not coords:
        print(f"[Geoapify] Could not geocode '{city_name}'.")
        return []

    lat, lon = coords
    
    try:
        url = "https://api.geoapify.com/v2/places"
        categories = "tourism.sights,tourism.attraction,entertainment.museum,religion.place_of_worship,natural,entertainment.theme_park"
        params = {
            "categories": categories,
            "filter": f"circle:{lon},{lat},15000",
            "limit": 30,
            "apiKey": api_key
        }
        
        res = requests.get(url, params=params, timeout=15)
        res.raise_for_status()
        raw_places = res.json().get("features", [])
        
        if not raw_places:
            print(f"[Geoapify] No attractions found for '{city_name}'.")
            return []
            
        places = []
        for item in raw_places:
            props = item.get("properties", {})
            name = props.get("name")
            
            if not name or len(name.strip()) < 3:
                continue
                
            categories_list = props.get("categories", [])
            
            # Map kinds to a readable category
            category = "Attraction"
            for geo_cat in categories_list:
                if geo_cat in CATEGORY_MAP:
                    category = CATEGORY_MAP[geo_cat]
                    break
                    
            place_id = props.get("place_id", "")
            p_lat = props.get("lat", 0.0)
            p_lon = props.get("lon", 0.0)
            
            is_historic = "tourism.sights.history" in categories_list or "religion" in categories_list
            hash_val = int(hashlib.md5(name.encode("utf-8")).hexdigest(), 16)
            
            duration = 2.0 if is_historic else 1.5
            fee = 0.0 if hash_val % 2 == 0 else float(50 + (hash_val % 450))
            
            places.append(Place(
                id=place_id if place_id else str(hash_val),
                name=name.strip(),
                category=category,
                coordinates=(float(p_lat), float(p_lon)),
                entry_fee=fee,
                visit_duration_hours=duration,
                safe_hours=(7, 19) if is_historic else (9, 21),
                crowd_estimate=CrowdLevel.HIGH if (hash_val % 3 == 0) else CrowdLevel.MEDIUM,
                family_friendly=True,
                safety_score_base=7 + (hash_val % 3),
                weather_sensitive=True if (hash_val % 5 == 0) else False,
                bad_weather_types=[Weather.RAINY]
            ))
            
        print(f"[Geoapify] Found {len(places)} valid attractions for '{city_name}'.")
        PLACE_CACHE[city_name] = places
        return places

    except Exception as e:
        print(f"[Geoapify] API Error for '{city_name}': {e}")
        return []

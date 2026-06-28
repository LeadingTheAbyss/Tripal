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
    "cultural": "Cultural",
    "historic": "Historical",
    "natural": "Nature",
    "architecture": "Architecture",
    "religion": "Spiritual",
    "museums": "Museum",
    "amusements": "Amusement",
    "sport": "Sports",
    "shops": "Shopping",
    "foods": "Food",
    "adult": None,  # Filter out
}

def _geocode_city(city_name: str) -> Optional[tuple]:
    """Use Photon API to get coordinates for an Indian city."""
    try:
        url = "https://photon.komoot.io/api/"
        params = {
            "q": f"{city_name} India",
            "limit": 1,
            "osm_tag": ["place:city", "place:town"]
        }
        headers = {"User-Agent": "TripEasy/1.0 (TravelApp)"}
        res = requests.get(url, params=params, headers=headers, timeout=8)
        res.raise_for_status()
        features = res.json().get("features", [])
        if features:
            coords = features[0].get("geometry", {}).get("coordinates", [])
            if len(coords) == 2:
                return float(coords[1]), float(coords[0])  # (lat, lon)
    except Exception as e:
        print(f"[OpenTripMap] Geocoding failed for '{city_name}': {e}")
    return None

def _get_otm_key() -> Optional[str]:
    key = os.getenv("OPENTRIPMAP_API_KEY")
    if not key or key == "your_opentripmap_key_here":
        return None
    return key

def search_opentripmap_places(city_name: str) -> List[Place]:
    """
    Fetch real tourist attractions from OpenTripMap API.
    Falls back gracefully to empty list if API key is missing.
    """
    if city_name in PLACE_CACHE:
        print(f"[OpenTripMap] Returning cached results for '{city_name}'")
        return PLACE_CACHE[city_name]

    api_key = _get_otm_key()
    if not api_key:
        print("[OpenTripMap] No API key found. Register free at https://opentripmap.io/product")
        return []

    print(f"\n[OpenTripMap] Fetching attractions for '{city_name}'...")

    coords = _geocode_city(city_name)
    if not coords:
        print(f"[OpenTripMap] Could not geocode '{city_name}'.")
        return []

    lat, lon = coords

    try:
        # Tiered fallback: try strict popularity filter first, then relax if needed
        raw_places = []
        for rate_filter in ["2h", "1h", ""]:
            params = {
                "radius": 15000,
                "lon": lon,
                "lat": lat,
                "kinds": "interesting_places,cultural,historic,natural,architecture,religion,museums,amusements",
                "limit": 30,
                "apikey": api_key,
                "format": "json"
            }
            if rate_filter:
                params["rate"] = rate_filter
            
            radius_url = "https://api.opentripmap.com/0.1/en/places/radius"
            res = requests.get(radius_url, params=params, timeout=15)
            res.raise_for_status()
            raw_places = res.json()
            
            if len(raw_places) >= 5:
                break
            print(f"[OpenTripMap] Only {len(raw_places)} places found with rate={rate_filter!r}, trying next tier...")

        if not raw_places:
            print(f"[OpenTripMap] No attractions found for '{city_name}'.")
            return []

        places = []
        for item in raw_places:
            name = item.get("name")
            if not name or len(name.strip()) < 3:
                continue

            # Skip adult categories
            kinds = item.get("kinds", "")
            if "adult" in kinds:
                continue

            xid = item.get("xid", "")
            p_lat = item.get("point", {}).get("lat", 0.0)
            p_lon = item.get("point", {}).get("lon", 0.0)

            if p_lat == 0.0 and p_lon == 0.0:
                continue

            # Map kinds to a readable category
            category = "Attraction"
            for kind_key, kind_label in CATEGORY_MAP.items():
                if kind_key in kinds and kind_label:
                    category = kind_label
                    break

            is_historic = "historic" in kinds or "cultural" in kinds
            hash_val = int(hashlib.md5(name.encode("utf-8")).hexdigest(), 16)

            duration = 2.0 if is_historic else 1.5
            fee = 0.0 if hash_val % 2 == 0 else float(50 + (hash_val % 450))

            places.append(Place(
                id=xid if xid else str(hash_val),
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

        print(f"[OpenTripMap] Found {len(places)} valid attractions for '{city_name}'.")
        PLACE_CACHE[city_name] = places
        return places

    except Exception as e:
        print(f"[OpenTripMap] API Error for '{city_name}': {e}")
        return []

import os
import requests
import hashlib
from typing import List
from models.entities import Place
from models.enums import CrowdLevel, Weather
from dotenv import load_dotenv

load_dotenv()

def get_rapidapi_key():
    key = os.getenv("RAPIDAPI_KEY")
    if not key:
        print("[Warning] No RAPIDAPI_KEY found in environment.")
        return None
    return key

def search_live_places(city_name: str) -> List[Place]:
    print(f"\n[API Call] Fetching live Tourist Attractions (via TripAdvisor RapidAPI) for {city_name}...")
    
    api_key = get_rapidapi_key()
    if not api_key:
        print("[Fallback] No API key. Falling back to Overpass/Mock DB logic is expected upstream.")
        return []

    url = "https://travel-advisor.p.rapidapi.com/locations/search"
    querystring = {
        "query": city_name,
        "limit": "30",
        "offset": "0",
        "units": "km",
        "location_id": "1",
        "currency": "INR",
        "sort": "relevance",
        "lang": "en_US"
    }
    headers = {
        "x-rapidapi-key": api_key,
        "x-rapidapi-host": "travel-advisor.p.rapidapi.com"
    }

    places = []
    try:
        response = requests.get(url, headers=headers, params=querystring, timeout=15)
        response.raise_for_status()
        data = response.json()
        
        for item in data.get("data", []):
            if "result_object" not in item:
                continue
            
            result = item["result_object"]
            location_id = result.get("location_id")
            name = result.get("name")
            if not location_id or not name:
                continue
                
            # Filter mostly for attractions, museums, points of interest, etc.
            # TripAdvisor returns hotels, restaurants, and attractions mixed in 'search'
            # We check result_type or category to ensure it's not a generic location like the city itself
            category_info = result.get("category", {})
            cat_name = category_info.get("name", "").lower()
            
            if cat_name == "geocoordinate" or cat_name == "destination":
                # Skip the city itself
                continue

            lat = float(result.get("latitude", 0.0))
            lon = float(result.get("longitude", 0.0))
            if lat == 0.0 and lon == 0.0:
                continue

            # Parse subcategory for a better description
            sub_category_list = result.get("subcategory", [])
            place_type = "Attraction"
            if sub_category_list and len(sub_category_list) > 0:
                place_type = sub_category_list[0].get("name", "Attraction")
            
            # Generate stable pseudo-values for fields TripAdvisor doesn't give directly on the search endpoint
            hash_val = int(hashlib.md5(name.encode('utf-8')).hexdigest(), 16)
            
            is_historic = "historic" in place_type.lower() or "museum" in place_type.lower()
            duration = 2.0 if is_historic else 1.5
            fee = 0.0 if hash_val % 2 == 0 else float(50 + (hash_val % 450))
            
            places.append(Place(
                id=str(location_id),
                name=name,
                category=place_type,
                coordinates=(lat, lon),
                entry_fee=fee,
                visit_duration_hours=duration,
                safe_hours=(7, 19) if is_historic else (9, 21),
                crowd_estimate=CrowdLevel.HIGH if (hash_val % 3 == 0) else CrowdLevel.MEDIUM,
                family_friendly=True,
                safety_score_base=7 + (hash_val % 3),
                weather_sensitive=True if (hash_val % 5 == 0) else False,
                bad_weather_types=[Weather.RAINY]
            ))
            
        return places

    except Exception as e:
        print(f"TripAdvisor API Error: {e}")
        return []

def fetch_live_reviews(location_id: str) -> List[dict]:
    print(f"[API Call] Fetching reviews for location_id: {location_id}")
    api_key = get_rapidapi_key()
    if not api_key:
        return []

    url = "https://travel-advisor.p.rapidapi.com/reviews/list"
    querystring = {
        "location_id": location_id,
        "limit": "10",
        "currency": "USD",
        "lang": "en_US"
    }
    headers = {
        "x-rapidapi-key": api_key,
        "x-rapidapi-host": "travel-advisor.p.rapidapi.com"
    }

    try:
        response = requests.get(url, headers=headers, params=querystring, timeout=10)
        if response.status_code != 200:
            return []
            
        data = response.json()
        reviews = []
        
        for rev in data.get("data", []):
            author = rev.get("user", {}).get("username", "Anonymous")
            rating = float(rev.get("rating", 5.0))
            text = rev.get("text", "")
            title = rev.get("title", "")
            if not text:
                continue
                
            reviews.append({
                "id": str(rev.get("id", "rev_1")),
                "author": author,
                "rating": rating,
                "text": text,
                "title": title,
                "date": rev.get("published_date", "")
            })
            
        return reviews
    except Exception as e:
        print(f"Error fetching reviews: {e}")
        return []

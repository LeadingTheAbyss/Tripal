import requests
from typing import List
from models.entities import Place
from models.enums import CrowdLevel, Weather
import hashlib

def fetch_overpass_places(city_name: str) -> List[Place]:
    print(f"\n[API Call] Fetching live Tourist Attractions from Overpass API for {city_name}...")
    endpoint = "https://overpass-api.de/api/interpreter"
    
    # Overpass QL Query searching for attractions and museums inside the city area
    query = f"""
    [out:json][timeout:30];
    area["name"="{city_name}"]->.searchArea;
    (
      node["tourism"~"attraction|museum"](area.searchArea);
      way["tourism"~"attraction|museum"](area.searchArea);
    );
    out center;
    """
    
    places = []
    try:
        headers = {
            "User-Agent": "GhumiGhumiTravelApp/1.0 (test@example.com)"
        }
        response = requests.post(endpoint, data={"data": query}, headers=headers, timeout=15)
        response.raise_for_status()
        data = response.json()
        
        for element in data.get("elements", []):
            tags = element.get("tags", {})
            
            # Prefer English name, fallback to local name, ignore if unnamed
            name = tags.get("name:en") or tags.get("name")
            if not name or len(name) < 4 or name.lower() in ['hindi', 'english', 'urdu', 'unknown', 'library', 'gate', 'office']:
                continue
                
            # Extract coordinates
            lat = element.get("lat") or element.get("center", {}).get("lat")
            lon = element.get("lon") or element.get("center", {}).get("lon")
            if not lat or not lon:
                continue
                
            place_type = tags.get("tourism", "attraction").capitalize()
            is_historic = tags.get("historic", "no") != "no"
            
            # Pseudo-random generation for fields Overpass doesn't provide based on ID/name
            hash_val = int(hashlib.md5(name.encode('utf-8')).hexdigest(), 16)
            
            # Historic places might take longer
            duration = 2.0 if is_historic else 1.5
            
            # Pseudo-random entry fee (free for 50%, else 50 to 500)
            fee = 0.0 if hash_val % 2 == 0 else float(50 + (hash_val % 450))
            
            places.append(Place(
                id=str(element.get("id", hash_val)),
                name=name,
                category=place_type,
                coordinates=(float(lat), float(lon)),
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
        print(f"Overpass API Error: {e}")
        return []

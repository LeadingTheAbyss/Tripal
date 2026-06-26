import requests
from typing import List
from models.entities import Place
from models.enums import CrowdLevel, Weather
import hashlib

def fetch_overpass_places(city_name: str) -> List[Place]:
    print(f"\n[API Call] Fetching live Tourist Attractions from Overpass API for {city_name}...")
    
    # 1. First geocode the city using Nominatim
    lat, lon = None, None
    try:
        nom_headers = {"User-Agent": "GhumiGhumiTravelApp/1.0 (test@example.com)"}
        nom_res = requests.get(f"https://nominatim.openstreetmap.org/search?q={city_name}&format=json", headers=nom_headers, timeout=10)
        if nom_res.ok and len(nom_res.json()) > 0:
            lat = nom_res.json()[0]["lat"]
            lon = nom_res.json()[0]["lon"]
    except Exception as e:
        print(f"Nominatim Error: {e}")
        
    endpoint = "https://overpass-api.de/api/interpreter"
    
    if lat and lon:
        query = f"""
        [out:json][timeout:30];
        (
          node["tourism"~"attraction|museum|viewpoint|monument"](around:15000,{lat},{lon});
          way["tourism"~"attraction|museum|viewpoint|monument"](around:15000,{lat},{lon});
        );
        out center;
        """
    else:
        # Fallback to area/node search
        query = f"""
        [out:json][timeout:30];
        area["name"="{city_name}"]->.a;
        node["name"="{city_name}"]["place"]->.n;
        (
          node["tourism"~"attraction|museum|viewpoint|monument"](area.a);
          way["tourism"~"attraction|museum|viewpoint|monument"](area.a);
          node["tourism"~"attraction|museum|viewpoint|monument"](around.n:15000);
          way["tourism"~"attraction|museum|viewpoint|monument"](around.n:15000);
        );
        out center;
        """
    
    places = []
    try:
        headers = {
            "User-Agent": "GhumiGhumiTravelApp/1.0 (test@example.com)"
        }
        response = requests.post(endpoint, data={"data": query}, headers=headers, timeout=15)
        
        with open("overpass_debug.log", "w") as f:
            f.write(f"Lat: {lat}, Lon: {lon}\n")
            f.write(f"Query: {query}\n")
            f.write(f"Response status: {response.status_code}\n")
            f.write(f"Response text: {response.text[:1000]}\n")
            
        response.raise_for_status()
        data = response.json()
        
        for element in data.get("elements", []):
            tags = element.get("tags", {})
            
            # Prefer English name, fallback to local name, ignore if unnamed
            name = tags.get("name:en") or tags.get("name")
            if not name:
                continue
            name = str(name)
            if len(name) < 4 or name.lower() in ['hindi', 'english', 'urdu', 'unknown', 'library', 'gate', 'office', 'water']:
                continue
                
            # Extract coordinates
            p_lat = element.get("lat") or element.get("center", {}).get("lat")
            p_lon = element.get("lon") or element.get("center", {}).get("lon")
            if not p_lat or not p_lon:
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
            
        with open("overpass_debug.log", "a") as f:
            f.write(f"Places parsed: {len(places)}\n")
            
        return places
    except Exception as e:
        with open("overpass_debug.log", "a") as f:
            f.write(f"Exception: {e}\n")
        print(f"Overpass API Error: {e}")
        return []

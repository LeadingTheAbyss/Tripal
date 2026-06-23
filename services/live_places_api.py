import requests
import hashlib
from typing import List
from models.entities import Place
from models.enums import CrowdLevel, Weather

def fetch_live_bonus_places(city: str, remaining_budget: float) -> List[Place]:
    print(f"\n[API Call] Fetching live tourist attractions in {city} from OpenStreetMap...")
    queries = [f"fort in {city}", f"museum in {city}", f"beach in {city}", f"park in {city}"]
    places_found = []
    
    headers = {"User-Agent": "TravelPlannerApp/1.0"}
    
    for q in queries:
        try:
            url = "https://nominatim.openstreetmap.org/search"
            response = requests.get(url, params={"q": q, "format": "json", "limit": 3}, headers=headers)
            if response.status_code == 200:
                places_found.extend(response.json())
        except Exception as e:
            continue
            
    bonus_places = []
    seen = set()
    for item in places_found:
        name = item.get("name")
        if not name:
            name = item.get("display_name", "").split(",")[0]
            
        if not name or name in seen: 
            continue
            
        seen.add(name)
        lat, lon = float(item.get("lat", 0)), float(item.get("lon", 0))
        
        # Deterministic pseudo-random generation for realistic simulation
        hash_val = int(hashlib.md5(name.encode('utf-8')).hexdigest(), 16)
        entry_fee = (hash_val % 1000) # Price between ₹0 and ₹1000
        
        if entry_fee > remaining_budget:
            continue # Skip if it breaks the remaining budget
            
        bonus_places.append(Place(
            id=str(item.get("place_id", hash_val)),
            name=name,
            category="Attraction",
            coordinates=(lat, lon),
            entry_fee=entry_fee,
            visit_duration_hours=1.0 + (hash_val % 3),
            safe_hours=(6, 18),
            crowd_estimate=CrowdLevel.MEDIUM,
            family_friendly=True,
            safety_score_base=8,
            weather_sensitive=False
        ))
        
    # Sort by cheapest first
    return sorted(bonus_places, key=lambda x: x.entry_fee)

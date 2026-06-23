import requests
import hashlib
from typing import List
from datetime import datetime
from models.entities import Hotel

def fetch_live_hotels(city: str, checkin_date: datetime, nights: int) -> List[Hotel]:
    print(f"[API Call] Fetching real hotel locations from OpenStreetMap (Nominatim) for {city}...")
    
    url = "https://nominatim.openstreetmap.org/search"
    params = {
        "q": f"hotels in {city}",
        "format": "json",
        "limit": 10
    }
    headers = {
        "User-Agent": "TravelPlannerApp/1.0"
    }
    
    try:
        response = requests.get(url, params=params, headers=headers)
        response.raise_for_status()
        data = response.json()
    except Exception as e:
        print(f"Error calling live API: {e}")
        data = []
        
    hotels = []
    for item in data:
        name = item.get("name", "")
        if not name or "Hotel" not in item.get("display_name", ""):
            name = item.get("display_name", "").split(",")[0]
            
        lat = float(item.get("lat", 0.0))
        lon = float(item.get("lon", 0.0))
        
        # We use the hotel name to deterministically generate realistic prices and ratings
        # because OpenStreetMap does not provide commercial live booking data (like OYO/MakeMyTrip).
        hash_val = int(hashlib.md5(name.encode('utf-8')).hexdigest(), 16)
        
        # Pseudo-random price between 1500 and 10000
        price = 1500 + (hash_val % 8500)
        
        # Pseudo-random rating between 3.0 and 5.0
        rating = 3.0 + ((hash_val % 20) / 10.0)
        
        # Pseudo-random safety score between 6 and 10
        safety = 6 + (hash_val % 5)
        
        hotels.append(Hotel(
            id=str(item.get("place_id", hash_val)),
            name=name,
            coordinates=(lat, lon),
            price_per_night=price,
            comfort_score=int(rating * 2),
            safety_score=safety,
            rating=round(rating, 1)
        ))
        
    return hotels

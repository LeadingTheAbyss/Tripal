import os
import requests
from typing import List
from datetime import datetime, timedelta
from dotenv import load_dotenv
from models.entities import Hotel

load_dotenv()

def get_serpapi_key():
    key = os.getenv("SERPAPI_KEY")
    if not key or key == "your_serpapi_key_here":
        raise ValueError("\n❌ MISSING API KEY: Please put your SERPAPI_KEY in the .env file!")
    return key

def search_live_hotels(city: str, check_in_date: str = None, check_out_date: str = None) -> List[Hotel]:
    print(f"\n[API Call] Fetching live hotels (via SerpApi) for: {city}...")
    
    try:
        api_key = get_serpapi_key()
        
        # Default dates if none provided (e.g. tomorrow to day after)
        if not check_in_date:
            check_in_date = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
        if not check_out_date:
            check_out_date = (datetime.now() + timedelta(days=2)).strftime("%Y-%m-%d")
        
        params = {
            "engine": "google_hotels",
            "q": city,
            "check_in_date": check_in_date,
            "check_out_date": check_out_date,
            "currency": "INR",
            "hl": "en",
            "gl": "in",
            "api_key": api_key
        }
        
        response = requests.get("https://serpapi.com/search", params=params)
        response.raise_for_status()
        
        data = response.json()
        properties = data.get("properties", [])
        
        hotels = []
        for item in properties[:10]: # Take top 10 hotels
            name = item.get("name", "Unknown Hotel")
            
            # Safely extract price
            rate_info = item.get("rate_per_night", {})
            try:
                price_str = rate_info.get("lowest", "2500").replace("₹", "").replace(",", "").strip()
                price = float(price_str)
            except Exception:
                price = 2500.0
                
            # Safely extract rating
            rating = float(item.get("overall_rating", 4.0))
            
            # Safely extract coordinates
            gps = item.get("gps_coordinates", {})
            lat = gps.get("latitude", 0.0)
            lon = gps.get("longitude", 0.0)
            
            # Generate realistic pseudo-scores
            comfort = min(10, int(rating * 2))
            safety = min(10, int(rating * 2) + 1)
            
            hotels.append(Hotel(
                id=item.get("property_token", name),
                name=name,
                coordinates=(lat, lon),
                price_per_night=price,
                comfort_score=comfort,
                safety_score=safety,
                rating=round(rating, 1)
            ))
            
        return sorted(hotels, key=lambda x: x.price_per_night)
        
    except Exception as e:
        print(f"Error fetching live hotels via SerpApi: {e}")
        return []

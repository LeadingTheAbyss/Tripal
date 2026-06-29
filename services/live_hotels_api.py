import os
import httpx
from typing import List
from datetime import datetime, timedelta
from dotenv import load_dotenv
from models.entities import Hotel
from services.db import get_db_connection
import uuid

load_dotenv()

def get_serpapi_key():
    key = os.getenv("SERPAPI_HOTELS_KEY")
    if not key:
        raise ValueError("\n[ERROR] MISSING API KEY: Please put your SERPAPI_HOTELS_KEY in the .env file!")
    return key

async def search_live_hotels(city: str, check_in_date: str = None, check_out_date: str = None) -> List[Hotel]:
    print(f"\n[API Call] Fetching live hotels (via SerpApi) for: {city}...")
    
    try:
        api_key = get_serpapi_key()
        
        # Default dates if none provided (e.g. tomorrow to day after)
        if not check_in_date:
            check_in_date = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
        if not check_out_date:
            check_out_date = (datetime.now() + timedelta(days=2)).strftime("%Y-%m-%d")
            
        # --- Check DB Cache ---
        try:
            conn = await get_db_connection()
            rows = await conn.fetch('SELECT hotel_id, name, price, rating, lat, lon FROM "Hotel" WHERE city = $1 AND check_in_date = $2 AND check_out_date = $3', city.upper(), check_in_date, check_out_date)
            await conn.close()
            
            if rows:
                print("[Cache Hit] Returning hotels from NeonDB.")
                cached_hotels = []
                for r in rows:
                    h_id = r['hotel_id']
                    name = r['name']
                    price = r['price']
                    rating = r['rating']
                    lat = r['lat']
                    lon = r['lon']
                    comfort = min(10, int(rating * 2))
                    safety = min(10, int(rating * 2) + 1)
                    cached_hotels.append(Hotel(
                        id=h_id,
                        name=name,
                        coordinates=(lat, lon),
                        price_per_night=price,
                        comfort_score=comfort,
                        safety_score=safety,
                        rating=rating
                    ))
                return sorted(cached_hotels, key=lambda x: x.price_per_night)
        except Exception as e:
            print(f"[Warning] Hotel DB cache check failed: {e}")
        # --- End DB Cache Check ---
        
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
        
        async with httpx.AsyncClient() as client:
            response = await client.get("https://serpapi.com/search", params=params, timeout=15.0)
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
            
        sorted_hotels = sorted(hotels, key=lambda x: x.price_per_night)
        
        # --- Save to DB Cache ---
        if sorted_hotels:
            try:
                conn = await get_db_connection()
                for h in sorted_hotels:
                    db_id = uuid.uuid4().hex
                    await conn.execute('''
                        INSERT INTO "Hotel" (id, hotel_id, city, check_in_date, check_out_date, name, price, rating, lat, lon)
                        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                        ON CONFLICT (hotel_id, city, check_in_date, check_out_date) DO NOTHING
                    ''', db_id, h.id, city.upper(), check_in_date, check_out_date, h.name, h.price_per_night, h.rating, h.coordinates[0], h.coordinates[1])
                await conn.close()
            except Exception as e:
                print(f"[Warning] Failed to cache hotels to DB: {e}")
                
        return sorted_hotels
        
    except Exception as e:
        print(f"Error fetching live hotels via SerpApi: {e}")
        return []

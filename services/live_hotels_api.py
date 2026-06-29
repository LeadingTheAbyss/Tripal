import os
import requests
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

def search_live_hotels(city: str, check_in_date: str = None, check_out_date: str = None) -> List[Hotel]:
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
            conn = get_db_connection()
            cur = conn.cursor()
            cur.execute('''
                CREATE TABLE IF NOT EXISTS "Hotel" (
                    id VARCHAR(255) PRIMARY KEY,
                    hotel_id VARCHAR(255),
                    city VARCHAR(255),
                    check_in_date VARCHAR(255),
                    check_out_date VARCHAR(255),
                    name VARCHAR(255),
                    price DOUBLE PRECISION,
                    rating DOUBLE PRECISION,
                    lat DOUBLE PRECISION,
                    lon DOUBLE PRECISION,
                    UNIQUE (hotel_id, city, check_in_date, check_out_date)
                )
            ''')
            cur.execute('SELECT hotel_id, name, price, rating, lat, lon FROM "Hotel" WHERE city = %s AND check_in_date = %s AND check_out_date = %s', 
                       (city.upper(), check_in_date, check_out_date))
            rows = cur.fetchall()
            cur.close()
            conn.close()
            
            if rows:
                print("[Cache Hit] Returning hotels from NeonDB.")
                cached_hotels = []
                for r in rows:
                    h_id, name, price, rating, lat, lon = r
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
            
        sorted_hotels = sorted(hotels, key=lambda x: x.price_per_night)
        
        # --- Save to DB Cache ---
        if sorted_hotels:
            try:
                conn = get_db_connection()
                cur = conn.cursor()
                for h in sorted_hotels:
                    db_id = uuid.uuid4().hex
                    cur.execute('''
                        INSERT INTO "Hotel" (id, hotel_id, city, check_in_date, check_out_date, name, price, rating, lat, lon)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                        ON CONFLICT (hotel_id, city, check_in_date, check_out_date) DO NOTHING
                    ''', (db_id, h.id, city.upper(), check_in_date, check_out_date, h.name, h.price_per_night, h.rating, h.coordinates[0], h.coordinates[1]))
                conn.commit()
                cur.close()
                conn.close()
            except Exception as e:
                print(f"[Warning] Failed to cache hotels to DB: {e}")
                
        return sorted_hotels
        
    except Exception as e:
        print(f"Error fetching live hotels via SerpApi: {e}")
        return []

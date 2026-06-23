from typing import List
from datetime import datetime
from models.entities import Hotel

def fetch_oyo_hotels(city: str, checkin_date: datetime, nights: int) -> List[Hotel]:
    print(f"[API Call] Fetching hotels from OYO API for {city}...")
    
    # Mock API Response payload from OYO
    oyo_api_response = [
        {"id": "oyo1", "name": "OYO 12345 City Center", "lat": 15.55, "lng": 73.76, "price": 1200, "rating": 3.8, "safety": 7},
        {"id": "oyo2", "name": "OYO Townhouse 045", "lat": 15.49, "lng": 73.80, "price": 2500, "rating": 4.5, "safety": 8},
        {"id": "oyo3", "name": "OYO Flagship 789", "lat": 15.60, "lng": 73.74, "price": 900, "rating": 3.2, "safety": 5}
    ]
    
    hotels = []
    for h in oyo_api_response:
        hotels.append(Hotel(
            id=h["id"], name=h["name"], coordinates=(h["lat"], h["lng"]),
            price_per_night=h["price"], comfort_score=int(h["rating"]*2),
            safety_score=h["safety"], rating=h["rating"]
        ))
    return hotels

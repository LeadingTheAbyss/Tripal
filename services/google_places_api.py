import os
import requests
from typing import List, Dict
from dotenv import load_dotenv
import hashlib
from models.entities import Place, Hotel
from models.enums import CrowdLevel

load_dotenv()

def get_google_key():
    key = os.getenv("GOOGLE_PLACES_API_KEY")
    if not key or key == "your_google_places_api_key_here":
        raise ValueError("\n❌ MISSING API KEY: Please put your GOOGLE_PLACES_API_KEY in the .env file!")
    return key

def fetch_live_tourist_places(city: str) -> List[Place]:
    print(f"\n[API Call] Fetching live Tourist Attractions from Google Places API for {city}...")
    api_key = get_google_key()
    
    url = "https://places.googleapis.com/v1/places:searchText"
    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": api_key,
        "X-Goog-FieldMask": "places.id,places.displayName,places.rating,places.location"
    }
    payload = {"textQuery": f"top tourist attractions in {city}"}
    
    response = requests.post(url, json=payload, headers=headers)
    if response.status_code != 200:
        raise Exception(f"Google Places API Error: {response.text}")
        
    places_data = response.json().get('places', [])
    bonus_places = []
    
    for item in places_data:
        name = item.get('displayName', {}).get('text', 'Unknown')
        lat = item.get('location', {}).get('latitude', 0.0)
        lon = item.get('location', {}).get('longitude', 0.0)
        rating = item.get('rating', 4.0)
        
        bonus_places.append(Place(
            id=item.get('id', name),
            name=name,
            category="Attraction",
            coordinates=(lat, lon),
            entry_fee=100, # Mocked as Google doesn't provide exact entry fees in the basic search
            visit_duration_hours=2.0,
            safe_hours=(6, 18),
            crowd_estimate=CrowdLevel.MEDIUM,
            family_friendly=True,
            safety_score_base=int(rating * 2),
            weather_sensitive=False
        ))
        
    return bonus_places

def fetch_live_taxi_services(city: str) -> List[Dict]:
    print(f"\n[API Call] Fetching live Taxi Services from Google Places API for {city}...")
    api_key = get_google_key()
    
    url = "https://places.googleapis.com/v1/places:searchText"
    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": api_key,
        "X-Goog-FieldMask": "places.displayName,places.formattedAddress,places.nationalPhoneNumber"
    }
    payload = {"textQuery": f"taxi services in {city}"}
    
    response = requests.post(url, json=payload, headers=headers)
    if response.status_code != 200:
        raise Exception(f"Google Places API Error: {response.text}")
        
    places_data = response.json().get('places', [])
    providers = []
    
    for item in places_data:
        name = item.get('displayName', {}).get('text', 'Unknown')
        address = item.get('formattedAddress', 'No Address')
        phone = item.get('nationalPhoneNumber', 'No Phone Number')
        
        providers.append({
            "name": name,
            "address": address,
            "phone": phone
        })
        
    return providers[:3]

def search_live_hotels(city: str) -> List[Hotel]:
    print(f"\n[API Call] Fetching live Hotels from Google Places API for {city}...")
    api_key = get_google_key()
    
    url = "https://places.googleapis.com/v1/places:searchText"
    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": api_key,
        "X-Goog-FieldMask": "places.id,places.displayName,places.rating,places.location"
    }
    payload = {"textQuery": f"top hotels in {city}"}
    
    response = requests.post(url, json=payload, headers=headers)
    if response.status_code != 200:
        raise Exception(f"Google Places API Error: {response.text}")
        
    places_data = response.json().get('places', [])
    hotels = []
    
    for item in places_data:
        name = item.get('displayName', {}).get('text', 'Unknown Hotel')
        lat = item.get('location', {}).get('latitude', 0.0)
        lon = item.get('location', {}).get('longitude', 0.0)
        
        # We use the hotel name to deterministically generate realistic prices and ratings
        # because Google Places basic search does not provide commercial live booking data
        hash_val = int(hashlib.md5(name.encode('utf-8')).hexdigest(), 16)
        
        # Pseudo-random price between 1500 and 10000
        price = 1500 + (hash_val % 8500)
        
        # Pseudo-random rating based on Google's actual rating or default
        rating = float(item.get('rating', 4.0))
        
        # Pseudo-random safety score between 6 and 10
        safety = 6 + (hash_val % 5)
        
        hotels.append(Hotel(
            id=item.get('id', str(hash_val)),
            name=name,
            coordinates=(lat, lon),
            price_per_night=price,
            comfort_score=int(rating * 2),
            safety_score=safety,
            rating=round(rating, 1)
        ))
        
    return hotels

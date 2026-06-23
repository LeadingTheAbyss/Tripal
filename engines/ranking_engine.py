from typing import List
from datetime import datetime, timedelta
from models.entities import Passenger, TransportOption, Place, Hotel
from models.enums import TransportType, Weather
from models.state import TripState
from data.mock_db import MOCK_PLACES_DB, MOCK_HOTEL_DB
from engines.safety_engine import calculate_safety_score
from services.google_places_api import fetch_live_tourist_places, fetch_live_taxi_services
from services.live_hotels_api import search_live_hotels
from services.live_flights_api import search_live_flights
from services.live_trains_api import search_live_trains
from services.osrm_cab_api import search_live_cabs

def rank_transport(source: str, dest: str, date: datetime, passengers: List[Passenger]) -> List[TransportOption]:
    # Simple IATA mapping for the simulation
    iata_map = {"Delhi": "DEL", "Mumbai": "BOM", "Goa": "GOI"}
    origin_iata = iata_map.get(source, "DEL")
    dest_iata = iata_map.get(dest, "GOI")
    
    # 1. Fetch live flights
    live_flights = search_live_flights(origin_iata, dest_iata, date.strftime("%Y-%m-%d"))
    
    # 2. Fetch live trains
    live_trains = search_live_trains(source, dest, date.strftime("%Y-%m-%d"))

    # 3. Fetch live cabs (by road)
    live_cabs = search_live_cabs(source, dest, date.strftime("%Y-%m-%d"))
    
    # 4. Fetch live buses (Multi-source redundancy)
    from services.live_bus_api import search_live_buses
    live_buses = search_live_buses(source, dest, date.strftime("%Y-%m-%d"))
    
    transports = live_flights + live_trains + live_cabs + live_buses
    
    def transport_score(t: TransportOption):
        score = 0
        has_elderly = any(p.age > 60 for p in passengers)
        if has_elderly and t.type == TransportType.BUS:
            score -= 20 # Heavily penalize buses for elderly
        score += (20 - t.duration_hours) * 2
        score += (10000 - t.price) / 1000
        score += t.safety_score * 2
        return score
        
    transports.sort(key=transport_score, reverse=True)
    return transports

def rank_places(city: str, trip: TripState, weather: Weather) -> List[Place]:
    places = MOCK_PLACES_DB.get(city, [])
    scored_places = []
    
    for p in places:
        if p.entry_fee > trip.remaining_budget: continue
        if p.weather_sensitive and weather in p.bad_weather_types: continue
        
        safety = calculate_safety_score(p, trip.passengers, planned_hour=14)
        if safety < 4: continue
        
        score = safety * 3 + (4 - p.crowd_estimate.value) * 2
        scored_places.append((score, p))
        
    scored_places.sort(key=lambda x: x[0], reverse=True)
    return [p for s, p in scored_places]

def rank_hotels(city: str, trip: TripState) -> List[Hotel]:
    # 1. Hit the Live API (or fallback to local DB)
    try:
        hotels = search_live_hotels(
            city, 
            trip.start_date.strftime("%Y-%m-%d"), 
            trip.end_date.strftime("%Y-%m-%d")
        )
    except Exception as e:
        print(f"[Fallback] Live API failed: {e}. Using local DB.")
        hotels = MOCK_HOTEL_DB.get(city, [])
    
    # 2. Filter by remaining budget
    valid_hotels = [h for h in hotels if (h.price_per_night * trip.days) <= trip.remaining_budget]
    
    # 3. Score & Rank
    def hotel_score(h: Hotel):
        return h.rating * 5 + h.safety_score * 3 + h.comfort_score * 2
        
    valid_hotels.sort(key=hotel_score, reverse=True)
    return valid_hotels

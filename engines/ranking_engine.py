from typing import List
from datetime import datetime, timedelta
from models.entities import Passenger, TransportOption, Place, Hotel
from models.enums import TransportType, Weather, CrowdLevel
from models.state import TripState
from data.mock_db import MOCK_PLACES_DB, MOCK_HOTEL_DB
from engines.safety_engine import calculate_safety_score
from services.live_places_api import search_live_places
from services.live_hotels_api import search_live_hotels
from services.live_flights_api import search_live_flights
from services.live_trains_api import search_live_trains
from services.osrm_cab_api import search_live_cabs

def rank_transport(source: str, dest: str, date: datetime, passengers: List[Passenger]) -> List[TransportOption]:
    # Simple IATA mapping for the simulation
    iata_map = {"Delhi": "DEL", "Mumbai": "BOM", "Goa": "GOI", "Lucknow": "LKO"}
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

from services.overpass_places_api import fetch_overpass_places
from services.opentripmap_api import search_opentripmap_places
from services.geoapify_api import search_geoapify_places

def rank_places(city: str, trip: TripState, weather: Weather) -> List[Place]:
    # 1. Primary: Overpass
    places = fetch_overpass_places(city)
        
    if not places:
        # 3. Tertiary: OpenTripMap
        places = search_opentripmap_places(city)
        
    if not places:
        # 4. Quaternary: Geoapify
        places = search_geoapify_places(city)
        
    if not places:
        # 5. Last resort: curated mock DB
        print(f"[Fallback] All APIs returned nothing. Using mock DB for '{city}'.")
        places = MOCK_PLACES_DB.get(city, [])

    scored_places = []
    
    for p in places:
        if p.weather_sensitive and weather in p.bad_weather_types: continue
        
        score = (4 - p.crowd_estimate.value)
        scored_places.append((score, p))
        
    scored_places.sort(key=lambda x: x[0], reverse=True)
    return [p for s, p in scored_places][:40]

from services.overpass_places_api import fetch_overpass_food

def rank_food(city: str, trip: TripState, weather: Weather) -> List[Place]:
    # 1. Primary: Overpass
    places = fetch_overpass_food(city)
        
    if not places:
        print(f"[Fallback] All APIs returned nothing for food. Using mock DB for '{city}'.")
        places = [p for p in MOCK_PLACES_DB.get(city, []) if p.category == "Food"]
        if not places:
            # Generate generic fallback food
            places = [
                Place(id=f"f1_{city}", name=f"{city} Central Cafe", category="Cafe", coordinates=(0.0,0.0), entry_fee=300, visit_duration_hours=1, safe_hours=(8,22), crowd_estimate=CrowdLevel.MEDIUM, family_friendly=True, safety_score_base=9, weather_sensitive=False, bad_weather_types=[]),
                Place(id=f"f2_{city}", name=f"The Great {city} Diner", category="Restaurant", coordinates=(0.0,0.0), entry_fee=800, visit_duration_hours=1.5, safe_hours=(11,23), crowd_estimate=CrowdLevel.HIGH, family_friendly=True, safety_score_base=8, weather_sensitive=False, bad_weather_types=[])
            ]

    scored_places = []
    
    for p in places:
        score = 0
        scored_places.append((score, p))
        
    scored_places.sort(key=lambda x: x[0], reverse=True)
    return [p for s, p in scored_places][:40]

def rank_hotels(city: str, trip: TripState) -> List[Hotel]:
    hotels = search_live_hotels(city, 
                              trip.start_date.strftime("%Y-%m-%d"), 
                              trip.end_date.strftime("%Y-%m-%d"))
    
    if not hotels:
        # Fallback: Mock DB
        hotels = MOCK_HOTEL_DB.get(city, [])
        if not hotels:
            # Generate generic fallback hotels so the UI doesn't break
            hotels = [
                Hotel(id=f"h1_{city}", name=f"The Grand {city} Resort", rating=4.5, price_per_night=8500, distance_to_cluster=1.2, safety_score=9, comfort_score=9, coordinates=(0.0,0.0)),
                Hotel(id=f"h2_{city}", name=f"{city} Central Inn", rating=4.2, price_per_night=4500, distance_to_cluster=0.5, safety_score=8, comfort_score=7, coordinates=(0.0,0.0)),
                Hotel(id=f"h3_{city}", name=f"Budget Stay {city}", rating=3.8, price_per_night=1500, distance_to_cluster=3.5, safety_score=7, comfort_score=6, coordinates=(0.0,0.0)),
            ]
    
    # 2. Filter by remaining budget
    valid_hotels = [h for h in hotels if (h.price_per_night * trip.days) <= trip.remaining_budget]
    
    # 3. Score & Rank
    def hotel_score(h: Hotel):
        return h.rating * 5 + h.safety_score * 3 + h.comfort_score * 2
        
    valid_hotels.sort(key=hotel_score, reverse=True)
    return valid_hotels

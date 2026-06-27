from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime, timedelta

from models.entities import Passenger
from models.state import TripState
from models.enums import Weather
from services.geo_service import geo_lookup
from engines.ranking_engine import rank_transport, rank_places, rank_hotels

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/pincode/{pincode}")
def get_pincode(pincode: str):
    return geo_lookup(pincode)

@app.get("/api/test-import")
def test_import():
    from services.live_places_api import search_live_places
    import traceback
    try:
        res = search_live_places("New Delhi")
        return {"count": len(res), "places": [p.name for p in res]}
    except Exception as e:
        return {"error": str(e), "trace": traceback.format_exc()}

@app.get("/api/transport")
def get_transport(source: str, destination: str):
    # Dummy passenger to satisfy backend requirements
    p1 = Passenger(id="1", name="Dummy", age=25, gender="M", pincode="110001", city=source)
    date = datetime.now() + timedelta(days=10)
    
    options = rank_transport(source, destination, date, [p1])
    
    result = []
    for i, o in enumerate(options):
        rec_score = 100 - (i * 5)
        if rec_score < 50: rec_score = 50
            
        result.append({
            "id": o.id,
            "type": o.type.value.lower(),
            "source": source,
            "destination": destination,
            "price": o.price,
            "duration": f"{int(o.duration_hours)}h {int((o.duration_hours % 1)*60)}m",
            "departure": o.departure.strftime("%b %d, %H:%M"),
            "arrival": o.arrival.strftime("%b %d, %H:%M"),
            "comfortScore": o.comfort_score,
            "safetyScore": o.safety_score,
            "recommendationScore": rec_score,
            "provider": o.provider
        })
    return result

from services.live_trains_api import get_train_route, get_live_train_status, get_station_board

@app.get("/api/trains/{train_number}/route")
def api_get_train_route(train_number: str):
    return get_train_route(train_number)

@app.get("/api/trains/{train_number}/live")
def api_get_live_train_status(train_number: str, date: str):
    return get_live_train_status(train_number, date)

@app.get("/api/stations/{station_code}/board")
def api_get_station_board(station_code: str):
    return get_station_board(station_code)

@app.get("/api/places")
def get_places(destination: str):
    trip = TripState(
        trip_id="T1", mode="direct", passengers=[],
        source_city="Delhi", destination_city=destination,
        start_date=datetime.now(), end_date=datetime.now() + timedelta(days=3),
        total_budget=50000
    )
    places = rank_places(destination, trip, Weather.SUNNY)
    
    result = []
    for i, p in enumerate(places):
        result.append({
            "id": p.id,
            "name": p.name,
            "category": p.category.lower() if isinstance(p.category, str) else str(p.category),
            "entryFee": p.entry_fee,
            "visitDurationHours": p.visit_duration_hours,
            "travelTimeHours": 1,
            "rating": 4.5,
            "safetyScore": p.safety_score_base,
            "weatherScore": 8,
            "crowdScore": p.crowd_estimate.value,
            "recommendationScore": 90 - i
        })
    return result

from services.live_places_api import fetch_live_reviews

@app.get("/api/places/reviews")
def get_place_reviews(location_id: str):
    return fetch_live_reviews(location_id)

@app.get("/api/hotels")
def get_hotels(destination: str):
    trip = TripState(
        trip_id="T1", mode="direct", passengers=[],
        source_city="Delhi", destination_city=destination,
        start_date=datetime.now(), end_date=datetime.now() + timedelta(days=3),
        total_budget=50000
    )
    hotels = rank_hotels(destination, trip)
    
    result = []
    for i, h in enumerate(hotels):
        result.append({
            "id": h.id,
            "name": h.name,
            "pricePerNight": h.price_per_night,
            "distanceToCluster": 2.5,
            "safetyScore": h.safety_score,
            "comfortScore": h.comfort_score,
            "recommendationScore": 90 - i,
            "rating": h.rating
        })
    return result

from engines.ollama_engine import recommend as get_ai_recommendations

@app.post("/api/recommendations")
def get_recommendations(preferences: dict):
    passengers = preferences.get("passengers", [])
    total_budget = preferences.get("total_budget", 50000)
    days = preferences.get("days", 3)
    preference = preferences.get("preference", "any")
    
    return get_ai_recommendations(passengers, total_budget, days, preference)

@app.get("/api/image")
def get_place_image(q: str):
    from services.image_service import fetch_real_image
    url = fetch_real_image(q)
    return {"url": url}

import requests
from typing import List, Dict, Any

@app.get("/api/search-city")
def search_city(q: str = "") -> List[Dict[str, Any]]:
    """
    Handles location autocomplete queries using the free Photon API with a local fallback.
    """
    if not q or len(q) < 2:
        return []

    url = "https://photon.komoot.io/api/?osm_tag=place:city&osm_tag=place:town"
    params = {
        "q": f"{q} India",
        "limit": 5
    }
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
    }
    
    try:
        response = requests.get(url, params=params, headers=headers, timeout=3.0)
        response.raise_for_status()
        data = response.json()
        
        results = []
        features = data.get("features", [])
        
        if not features:
            print(f"[Debug] Photon returned no features for query: '{q}'")
            
        for feature in features:
            props = feature.get("properties", {})
            geom = feature.get("geometry", {})
            
            name = props.get("name", "Unknown")
            
            state = props.get("state")
            if not state:
                state = props.get("county", "")
            
            formatted_name = f"{name}, {state}" if state else name
            
            coords = geom.get("coordinates", [])
            osrm_coords = ""
            if len(coords) == 2:
                osrm_coords = f"{coords[0]},{coords[1]}"
                
            results.append({
                "name": name,
                "state": state,
                "formatted_name": formatted_name,
                "osrm_coords": osrm_coords
            })
            
        return results
        
    except Exception as e:
        print(f"[Error] Failed to fetch city autocomplete from Photon API: {str(e)}")
        
        # Local Fallback for top Indian cities if Photon goes down
        q_lower = q.lower()
        fallback_cities = [
            {"name": "New Delhi", "state": "Delhi", "osrm_coords": "77.2090,28.6139"},
            {"name": "Mumbai", "state": "Maharashtra", "osrm_coords": "72.8777,19.0760"},
            {"name": "Bangalore", "state": "Karnataka", "osrm_coords": "77.5946,12.9716"},
            {"name": "Hyderabad", "state": "Telangana", "osrm_coords": "78.4747,17.3616"},
            {"name": "Chennai", "state": "Tamil Nadu", "osrm_coords": "80.2707,13.0827"},
            {"name": "Kolkata", "state": "West Bengal", "osrm_coords": "88.3639,22.5726"},
            {"name": "Lucknow", "state": "Uttar Pradesh", "osrm_coords": "80.9462,26.8467"},
            {"name": "Jaipur", "state": "Rajasthan", "osrm_coords": "75.7873,26.9124"},
            {"name": "Pune", "state": "Maharashtra", "osrm_coords": "73.8567,18.5204"},
            {"name": "Ahmedabad", "state": "Gujarat", "osrm_coords": "72.5714,23.0225"},
        ]
        
        matched_cities = [c for c in fallback_cities if q_lower in c["name"].lower()]
        
        if matched_cities:
            return [{
                "name": c["name"],
                "state": c["state"],
                "formatted_name": f"{c['name']}, {c['state']}",
                "osrm_coords": c["osrm_coords"]
            } for c in matched_cities]
            
        # Return graceful failure if no fallback matches
        return [{
            "name": f"Error: Network issue",
            "state": "API Error",
            "formatted_name": f"Error: Connection to mapping service failed",
            "osrm_coords": ""
        }]

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

@app.post("/api/recommendations")
def get_recommendations(preferences: dict):
    travelers = int(preferences.get("travelers", 1))
    budget = int(preferences.get("budget", 50000))
    setting = preferences.get("setting", "any").lower()
    
    destinations = [
        {"id": "dest_1", "name": "Manali, Himachal Pradesh", "tags": ["mountains", "adventure", "cool weather"], "base_cost": 15000, "why": "Perfect match for mountains with great adventure spots."},
        {"id": "dest_2", "name": "Goa", "tags": ["beaches", "nightlife", "relaxation"], "base_cost": 20000, "why": "Famous for its vibrant nightlife and relaxing beaches."},
        {"id": "dest_3", "name": "Jaipur, Rajasthan", "tags": ["history", "culture", "budget friendly"], "base_cost": 10000, "why": "Rich in cultural heritage and very budget-friendly."},
        {"id": "dest_4", "name": "Shimla, Himachal Pradesh", "tags": ["mountains", "family", "cool weather"], "base_cost": 12000, "why": "Beautiful hill station with stunning colonial architecture."},
        {"id": "dest_5", "name": "Andaman Islands", "tags": ["beaches", "adventure", "nature"], "base_cost": 30000, "why": "Pristine beaches and world-class scuba diving."},
        {"id": "dest_6", "name": "Varanasi, Uttar Pradesh", "tags": ["history", "culture", "religious"], "base_cost": 8000, "why": "Deep cultural roots and spiritually enriching experience."},
        {"id": "dest_7", "name": "Munnar, Kerala", "tags": ["mountains", "nature", "relaxation"], "base_cost": 18000, "why": "Lush green tea gardens and a peaceful relaxing vibe."},
        {"id": "dest_8", "name": "Udaipur, Rajasthan", "tags": ["history", "culture", "romantic"], "base_cost": 15000, "why": "The City of Lakes offers a regal and romantic escape."},
    ]

    results = []
    for d in destinations:
        # Basic filtering by setting
        if setting != "any" and setting not in d["tags"]:
            continue
            
        est_cost = d["base_cost"] * travelers
        
        # Scoring logic based on budget match
        if est_cost > budget:
            # Over budget, lower score
            penalty = ((est_cost - budget) / budget) * 100
            score = max(30, int(90 - penalty))
            why = d["why"] + " Note: This pushes slightly above your specified budget."
        else:
            # Within budget
            savings = ((budget - est_cost) / budget) * 100
            score = min(99, int(85 + (savings * 0.5)))
            why = d["why"] + " Fits perfectly within your budget constraints!"
            
        results.append({
            "id": d["id"],
            "name": d["name"],
            "score": score,
            "budgetEstimate": est_cost,
            "why": why,
            "tags": [t.title() for t in d["tags"]]
        })
        
    results.sort(key=lambda x: x["score"], reverse=True)
    return results[:4] # Return top 4 matches

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
    Handles location autocomplete queries using the free Photon API.
    """
    if not q or len(q) < 2:
        return []

    url = "https://photon.komoot.io/api/?osm_tag=place:city&osm_tag=place:town"
    params = {
        "q": f"{q} India",
        "limit": 5
    }
    headers = {
        "User-Agent": "Ghumi-Ghumi/1.0 (TravelApp)"
    }
    
    try:
        # Reasonable request timeout of 3 seconds
        response = requests.get(url, params=params, headers=headers, timeout=3.0)
        response.raise_for_status()
        data = response.json()
        
        results = []
        features = data.get("features", [])
        
        # If no features are returned, log it for debugging
        if not features:
            print(f"[Debug] Photon returned no features for query: '{q}'")
            
        for feature in features:
            props = feature.get("properties", {})
            geom = feature.get("geometry", {})
            
            name = props.get("name", "Unknown")
            
            # Fallback cleanly if state is missing
            state = props.get("state")
            if not state:
                state = props.get("county", "")
            
            formatted_name = f"{name}, {state}" if state else name
            
            # Extract coordinates
            # Note: Photon natively outputs [longitude, latitude] which aligns perfectly with OSRM requirements!
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
        err_msg = str(e)
        if hasattr(e, 'response') and e.response is not None:
            err_msg += f" - {e.response.text}"
        print(f"[Error] Failed to fetch city autocomplete from Photon API: {err_msg}")
        return [{
            "name": f"Error: {err_msg[:50]}",
            "state": "API Error",
            "formatted_name": f"Error: {err_msg[:80]}",
            "osrm_coords": ""
        }]

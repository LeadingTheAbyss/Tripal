import requests
from typing import Dict, Any, List
from datetime import datetime, timedelta
from models.entities import TransportOption
from models.enums import TransportType

# Rough coordinates for common cities used in the simulation
CITY_COORDINATES = {
    "Delhi": {"lat": 28.6139, "lng": 77.2090},
    "Mumbai": {"lat": 19.0760, "lng": 72.8777},
    "Goa": {"lat": 15.2993, "lng": 74.1240},
    "Bangalore": {"lat": 12.9716, "lng": 77.5946},
    "Chennai": {"lat": 13.0827, "lng": 80.2707},
    "Kolkata": {"lat": 22.5726, "lng": 88.3639}
}

def calculate_cab_fare(
    start_lat: float,
    start_lng: float,
    end_lat: float,
    end_lng: float,
    driver_allowance: float = 300.0,
    estimated_tolls: float = 1000.0
) -> Dict[str, Any]:
    """
    Calculates on-road travel distance between two coordinates using the OSRM API
    and estimates tiered cab fares based on distance, allowance, and tolls.
    """
    # CRITICAL: OSRM expects coordinates strictly in "longitude,latitude" order!
    url = f"http://router.project-osrm.org/route/v1/driving/{start_lng},{start_lat};{end_lng},{end_lat}?overview=false"

    try:
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        data = response.json()

        if "routes" not in data or not data["routes"]:
            return {"status": "error", "message": "No route found."}

        distance_meters = data["routes"][0].get("distance")
        if distance_meters is None:
            return {"status": "error", "message": "Distance missing in response."}
            
        distance_km = round(distance_meters / 1000.0, 2)

        sedan_rate_per_km = 13.0
        suv_rate_per_km = 20.0

        sedan_base_charge = distance_km * sedan_rate_per_km
        suv_base_charge = distance_km * suv_rate_per_km

        sedan_total_fare = sedan_base_charge + driver_allowance + estimated_tolls
        suv_total_fare = suv_base_charge + driver_allowance + estimated_tolls

        return {
            "status": "success",
            "distance_km": distance_km,
            "fares": {
                "sedan": round(sedan_total_fare, 2),
                "suv": round(suv_total_fare, 2)
            }
        }

    except Exception as e:
        return {"status": "error", "message": str(e)}

def search_live_cabs(source_city: str, dest_city: str, date: str) -> List[TransportOption]:
    print(f"\n[API Call] Fetching live cabs (via OSRM): {source_city} -> {dest_city} on {date}...")
    
    source_coords = CITY_COORDINATES.get(source_city)
    dest_coords = CITY_COORDINATES.get(dest_city)
    
    if not source_coords or not dest_coords:
        print(f"[Warning] Coordinates not found for {source_city} or {dest_city}.")
        return []

    fare_data = calculate_cab_fare(
        source_coords["lat"], source_coords["lng"],
        dest_coords["lat"], dest_coords["lng"]
    )
    
    if fare_data["status"] == "error":
        print(f"[Warning] OSRM API failed: {fare_data['message']}")
        return []
        
    distance_km = fare_data["distance_km"]
    # Roughly assume 60 km/h average speed for driving time
    duration_hours = round(distance_km / 60.0, 1)
    
    try:
        base_date = datetime.strptime(date, "%Y-%m-%d")
    except ValueError:
        base_date = datetime.now()
        
    dep_time = base_date.replace(hour=8, minute=0) # Assume 8 AM departure
    arr_time = dep_time + timedelta(hours=duration_hours)
    
    options = [
        TransportOption(
            id=f"cab_sedan_{source_city}_{dest_city}",
            type=TransportType.CAB,
            departure=dep_time,
            arrival=arr_time,
            duration_hours=duration_hours,
            price=fare_data["fares"]["sedan"],
            safety_score=7,
            comfort_score=7
        ),
        TransportOption(
            id=f"cab_suv_{source_city}_{dest_city}",
            type=TransportType.CAB,
            departure=dep_time,
            arrival=arr_time,
            duration_hours=duration_hours,
            price=fare_data["fares"]["suv"],
            safety_score=8,
            comfort_score=9
        )
    ]
    return options

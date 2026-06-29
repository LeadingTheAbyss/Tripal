import requests
import math
from typing import Dict, Any, List
from datetime import datetime, timedelta
from models.entities import TransportOption
from models.enums import TransportType

def get_coordinates(city_name: str) -> Dict[str, float]:
    """Dynamically fetch coordinates using Nominatim API."""
    url = f"https://nominatim.openstreetmap.org/search?q={city_name},+India&format=json&limit=1"
    headers = {"User-Agent": "GhumiGhumiTravelApp/1.0 (contact@ghumighumi.com)"}
    try:
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()
        data = response.json()
        if data and len(data) > 0:
            return {"lat": float(data[0]["lat"]), "lng": float(data[0]["lon"])}
    except Exception as e:
        print(f"[Warning] Failed to geocode {city_name}: {e}")
    return {}

def calculate_cab_fare(
    start_lat: float,
    start_lng: float,
    end_lat: float,
    end_lng: float
) -> Dict[str, Any]:
    """
    Calculates exact driving distance using OSRM and applies 2026 Indian Cab Math.
    """
    # OSRM expects coordinates in "longitude,latitude" order
    url = f"http://router.project-osrm.org/route/v1/driving/{start_lng},{start_lat};{end_lng},{end_lat}?overview=false"

    try:
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        data = response.json()

        if "routes" not in data or not data["routes"]:
            return {"status": "error", "message": "No route found."}

        route = data["routes"][0]
        distance_meters = route.get("distance")
        duration_seconds = route.get("duration")
        
        if distance_meters is None or duration_seconds is None:
            return {"status": "error", "message": "Distance or duration missing in response."}
            
        distance_km = round(distance_meters / 1000.0, 2)
        duration_hours = round(duration_seconds / 3600.0, 1)

        # --- 2026 Advanced Cab Pricing Math ---
        
        # 1. Minimum billable distance per day (Standard India Policy)
        min_billable_km = 250.0
        billable_distance = max(distance_km, min_billable_km)
        
        # 2. Base Rates (2026)
        rates = {
            "hatchback": 12.0,
            "sedan": 15.0,
            "suv": 22.0
        }
        
        # 3. Driver Allowance (₹400 per day)
        # Assuming 1 calendar day if < 12 hrs, otherwise 2 days for extreme distances
        days = 2 if duration_hours > 12 else 1
        total_driver_allowance = 400.0 * days
        
        # 4. Estimated Tolls (₹2.5 per actual km)
        tolls = distance_km * 2.5
        
        # 5. GST (5% on Base + Driver Allowance)
        gst_rate = 0.05
        
        fares = {}
        for vehicle, rate in rates.items():
            base_charge = billable_distance * rate
            subtotal = base_charge + total_driver_allowance
            gst = subtotal * gst_rate
            total_fare = subtotal + gst + tolls
            fares[vehicle] = round(total_fare, 2)

        return {
            "status": "success",
            "distance_km": distance_km,
            "duration_hours": duration_hours,
            "fares": fares
        }

    except Exception as e:
        return {"status": "error", "message": str(e)}

def search_live_cabs(source_city: str, dest_city: str, date: str) -> List[TransportOption]:
    print(f"\n[API Call] Fetching live cabs (via OSRM + Nominatim): {source_city} -> {dest_city} on {date}...")
    
    source_coords = get_coordinates(source_city)
    dest_coords = get_coordinates(dest_city)
    
    if not source_coords or not dest_coords:
        print(f"[Warning] Could not resolve coordinates for {source_city} or {dest_city}.")
        return []

    fare_data = calculate_cab_fare(
        source_coords["lat"], source_coords["lng"],
        dest_coords["lat"], dest_coords["lng"]
    )
    
    if fare_data["status"] == "error":
        print(f"[Warning] OSRM API failed: {fare_data['message']}")
        return []
        
    duration_hours = fare_data["duration_hours"]
    
    try:
        base_date = datetime.strptime(date, "%Y-%m-%d")
    except ValueError:
        base_date = datetime.now()
        
    dep_time = base_date.replace(hour=8, minute=0) # Assume 8 AM departure
    arr_time = dep_time + timedelta(hours=duration_hours)
    
    fares = fare_data["fares"]
    
    options = [
        TransportOption(
            id=f"cab_hatchback_{source_city}_{dest_city}",
            type=TransportType.CAB,
            departure=dep_time,
            arrival=arr_time,
            duration_hours=duration_hours,
            price=fares["hatchback"],
            safety_score=6,
            comfort_score=5,
            provider="Hatchback (Mini)"
        ),
        TransportOption(
            id=f"cab_sedan_{source_city}_{dest_city}",
            type=TransportType.CAB,
            departure=dep_time,
            arrival=arr_time,
            duration_hours=duration_hours,
            price=fares["sedan"],
            safety_score=7,
            comfort_score=7,
            provider="Sedan (Dzire/Etios)"
        ),
        TransportOption(
            id=f"cab_suv_{source_city}_{dest_city}",
            type=TransportType.CAB,
            departure=dep_time,
            arrival=arr_time,
            duration_hours=duration_hours,
            price=fares["suv"],
            safety_score=8,
            comfort_score=9,
            provider="SUV (Innova/Ertiga)"
        )
    ]
    return options

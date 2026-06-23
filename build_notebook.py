import json

notebook = {
 "cells": [],
 "metadata": {
  "kernelspec": {
   "display_name": "Python 3",
   "language": "python",
   "name": "python3"
  },
  "language_info": {
   "name": "python",
   "version": "3.8"
  }
 },
 "nbformat": 4,
 "nbformat_minor": 4
}

def add_markdown(text):
    notebook["cells"].append({
        "cell_type": "markdown",
        "metadata": {},
        "source": [line + "\n" for line in text.split("\n")]
    })

def add_code(text):
    notebook["cells"].append({
        "cell_type": "code",
        "execution_count": None,
        "metadata": {},
        "outputs": [],
        "source": [line + "\n" for line in text.split("\n")]
    })

# Add cells
add_markdown("# Travel Planner Simulation Engine Pipeline\nThis notebook contains the backend mock and logic for the budgeted travel simulation.")

add_code("""import pandas as pd
from pydantic import BaseModel, Field
from typing import List, Optional, Dict
from datetime import datetime, timedelta
import random
import math
import json""")

add_markdown("## 1. Core Data Models (State & Entities)\nUsing `pydantic` to define strict schemas for our entities, ensuring a robust API design.")

add_code("""class Passenger(BaseModel):
    id: str
    name: str
    age: int
    gender: str
    pincode: str
    city: Optional[str] = None
    transport_pref: Optional[str] = "Any"
    
class TripState(BaseModel):
    trip_id: str
    mode: str  # "recommend" or "direct"
    source: str
    destination: Optional[str] = None
    start_date: datetime
    end_date: datetime
    passengers: List[Passenger]
    total_budget: float
    preferences: List[str] = []

class BudgetPurse(BaseModel):
    total: float
    transport_spend: float = 0.0
    hotel_spend: float = 0.0
    activity_spend: float = 0.0
    
    @property
    def remaining(self) -> float:
        return self.total - (self.transport_spend + self.hotel_spend + self.activity_spend)

class TransportOption(BaseModel):
    id: str
    type: str # flight, train, bus
    departure: datetime
    arrival: datetime
    price: float
    safety_score: int # 1-10
    duration_hours: float
    
class Place(BaseModel):
    id: str
    name: str
    category: str
    entry_fee: float
    visit_duration_hours: float
    safety_score: int
    crowd_level: str # "Low", "Medium", "High"
    coordinates: tuple # (lat, lon)

class Hotel(BaseModel):
    id: str
    name: str
    price_per_night: float
    rating: float
    safety_score: int
    coordinates: tuple""")

add_markdown("## 2. Mock Database\nSince we don't have a live DB connected, we simulate places, hotels, and transport records.")

add_code("""MOCK_PLACES = [
    Place(id="p1", name="City Museum", category="History", entry_fee=500, visit_duration_hours=3.0, safety_score=9, crowd_level="Medium", coordinates=(28.6, 77.2)),
    Place(id="p2", name="Sunset Point", category="Nature", entry_fee=0, visit_duration_hours=1.5, safety_score=7, crowd_level="High", coordinates=(28.65, 77.25)),
    Place(id="p3", name="Local Market", category="Shopping", entry_fee=0, visit_duration_hours=2.0, safety_score=6, crowd_level="High", coordinates=(28.62, 77.21)),
    Place(id="p4", name="Ancient Fort", category="History", entry_fee=800, visit_duration_hours=4.0, safety_score=8, crowd_level="Medium", coordinates=(28.7, 77.3)),
    Place(id="p5", name="Lakeside Cafe", category="Food", entry_fee=1500, visit_duration_hours=2.0, safety_score=9, crowd_level="Low", coordinates=(28.61, 77.22))
]

MOCK_HOTELS = [
    Hotel(id="h1", name="Grand Palace", price_per_night=5000, rating=4.8, safety_score=9, coordinates=(28.63, 77.22)),
    Hotel(id="h2", name="Budget Stay", price_per_night=1500, rating=3.5, safety_score=6, coordinates=(28.65, 77.26)),
    Hotel(id="h3", name="Family Inn", price_per_night=3000, rating=4.2, safety_score=8, coordinates=(28.6, 77.2))
]""")

add_markdown("## 3. Microservices (Geo, Transport, Recommendation)\nSimulating the individual service domains that process data.")

add_code("""def pincode_to_city(pincode: str) -> str:
    # Mock Geo Service
    lookup = {"110001": "New Delhi", "400001": "Mumbai", "560001": "Bangalore"}
    return lookup.get(pincode, "Unknown City")

def get_transport_options(source: str, dest: str, date: datetime) -> List[TransportOption]:
    # Mock Transport Service - Returns available paths
    return [
        TransportOption(id="t1", type="flight", departure=date.replace(hour=8), arrival=date.replace(hour=10), price=4500, safety_score=9, duration_hours=2.0),
        TransportOption(id="t2", type="train", departure=date.replace(hour=20), arrival=date + timedelta(days=1, hours=8), price=1200, safety_score=8, duration_hours=12.0),
        TransportOption(id="t3", type="bus", departure=date.replace(hour=22), arrival=date + timedelta(days=1, hours=10), price=800, safety_score=6, duration_hours=14.0)
    ]

def get_recommended_places(budget_purse: BudgetPurse, max_places: int = 5) -> List[Place]:
    # Recommendation logic: filters out places that would exceed the remaining budget
    valid_places = [p for p in MOCK_PLACES if p.entry_fee <= budget_purse.remaining]
    # Rank by safety score descending
    valid_places.sort(key=lambda x: x.safety_score, reverse=True)
    return valid_places[:max_places]

def get_recommended_hotels(budget_purse: BudgetPurse, nights: int) -> List[Hotel]:
    valid_hotels = [h for h in MOCK_HOTELS if (h.price_per_night * nights) <= budget_purse.remaining]
    # Rank by rating descending
    valid_hotels.sort(key=lambda x: x.rating, reverse=True)
    return valid_hotels""")


add_markdown("## 4. Itinerary Optimizer\nThe smartest part of the app. It clusters places based on coordinates to reduce travel time, and splits them across days ensuring no day is over-packed.")

add_code("""def calculate_distance(coord1, coord2):
    # Mock euclidean distance logic, scaled to approx km for local mapping
    return math.sqrt((coord1[0] - coord2[0])**2 + (coord1[1] - coord2[1])**2) * 100 

def generate_itinerary(places: List[Place], start_date: datetime, days: int):
    unassigned = places.copy()
    itinerary = {}
    
    for day in range(1, days + 1):
        daily_plan = []
        hours_used = 0.0
        current_loc = None
        
        # We enforce a maximum of 8 hours of active touring per day
        while unassigned and hours_used < 8.0:
            if current_loc is None:
                # Pick the first unassigned for the day
                nxt = unassigned.pop(0)
            else:
                # Pick the spatially closest one to minimize backtracking
                unassigned.sort(key=lambda p: calculate_distance(current_loc, p.coordinates))
                nxt = unassigned[0]
                
                # Calculate the commute
                dist = calculate_distance(current_loc, nxt.coordinates)
                travel_time = dist / 30.0 # Simulate 30km/h traffic speed
                
                # Check if this place pushes us over the daily limit
                if hours_used + travel_time + nxt.visit_duration_hours > 8.0:
                    break # Stop and leave remaining places for the next day
                
                hours_used += travel_time
                unassigned.pop(0)
                
            daily_plan.append(nxt)
            hours_used += nxt.visit_duration_hours
            current_loc = nxt.coordinates
            
        itinerary[f"Day {day}"] = {
            "places": [p.name for p in daily_plan],
            "total_active_hours": round(hours_used, 2)
        }
    
    return itinerary""")

add_markdown("## 5. End-to-End Pipeline Execution\nRun the cell below to test the entire flow (Direct Trip Mode) from start to finish. Watch the Budget Purse update in real time.")

add_code("""print("--- ✈️ BUDGETED TRAVEL SIMULATION PIPELINE ---")

# 1. Identity & Trip Setup
print("\\n[1] Setting up Trip & Passengers...")
p1 = Passenger(id="pas1", name="Rahul", age=30, gender="M", pincode="110001", transport_pref="flight")
p2 = Passenger(id="pas2", name="Priya", age=28, gender="F", pincode="110001", transport_pref="flight")

# Pincode Resolution
p1.city = pincode_to_city(p1.pincode)
p2.city = pincode_to_city(p2.pincode)

trip = TripState(
    trip_id="TRP001", mode="direct", source=p1.city, destination="Goa",
    start_date=datetime(2024, 12, 10), end_date=datetime(2024, 12, 13),
    passengers=[p1, p2], total_budget=50000.0, preferences=["History", "Nature"]
)

purse = BudgetPurse(total=trip.total_budget)
print(f"✅ Trip created! Budget Purse initialized at: ₹{purse.remaining}")

# 2. Transport Selection
print("\\n[2] Fetching Transport Options...")
options = get_transport_options(trip.source, trip.destination, trip.start_date)
selected_transport = options[0] # Select flight
transport_cost = selected_transport.price * len(trip.passengers)
purse.transport_spend += transport_cost # Update wallet
print(f"✅ Selected {selected_transport.type} (Cost: ₹{transport_cost}). Remaining Budget: ₹{purse.remaining}")

# 3. Hotel Selection
print("\\n[3] Fetching Hotels...")
nights = (trip.end_date - trip.start_date).days
hotels = get_recommended_hotels(purse, nights)
selected_hotel = hotels[0]
hotel_cost = selected_hotel.price_per_night * nights
purse.hotel_spend += hotel_cost # Update wallet
print(f"✅ Selected Hotel: {selected_hotel.name} (Cost for {nights} nights: ₹{hotel_cost}). Remaining Budget: ₹{purse.remaining}")

# 4. Places Recommendation
print("\\n[4] Recommending Places based on safety & budget...")
places = get_recommended_places(purse, max_places=4)
places_cost = sum([p.entry_fee for p in places])
purse.activity_spend += places_cost # Update wallet
print(f"✅ Selected Places: {[p.name for p in places]} (Entry cost: ₹{places_cost}). Remaining Budget: ₹{purse.remaining}")

# 5. Itinerary Optimization
print("\\n[5] Generating Smart Itinerary...")
itinerary = generate_itinerary(places, trip.start_date, days=nights)

print(json.dumps(itinerary, indent=2))

print(f"\\n✅ Pipeline Complete! Final Budget Remaining: ₹{purse.remaining}")""")

# Save the notebook
with open('c:/Users/Apoorv/Desktop/endtoendplanner/pipeline1.ipynb', 'w') as f:
    json.dump(notebook, f, indent=1)
print("Notebook pipeline1.ipynb generated successfully.")

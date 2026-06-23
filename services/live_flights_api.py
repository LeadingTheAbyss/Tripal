import os
import requests
from typing import List
from datetime import datetime, timedelta
from dotenv import load_dotenv
from models.entities import TransportOption
from models.enums import TransportType

load_dotenv()

def get_serpapi_key():
    key = os.getenv("SERPAPI_KEY")
    if not key or key == "your_serpapi_key_here":
        raise ValueError("\n❌ MISSING API KEY: Please put your SERPAPI_KEY in the .env file!")
    return key

def search_live_flights(origin_iata: str, dest_iata: str, date: str) -> List[TransportOption]:
    print(f"\n[API Call] Fetching live flights (via SerpApi): {origin_iata} -> {dest_iata} on {date}...")
    
    try:
        api_key = get_serpapi_key()
        
        params = {
            "engine": "google_flights",
            "departure_id": origin_iata,
            "arrival_id": dest_iata,
            "outbound_date": date,
            "currency": "INR",
            "hl": "en",
            "type": "2", # 2 = One-way
            "api_key": api_key
        }
        
        response = requests.get("https://serpapi.com/search", params=params)
        response.raise_for_status()
        
        data = response.json()
        best_flights = data.get("best_flights", [])
        
        options = []
        for idx, flight in enumerate(best_flights[:5]): # Take top 5
            flights_leg = flight.get("flights", [{}])[0]
            
            # Extract price
            price = flight.get("price", 5000)
            
            # Extract duration
            duration_minutes = flights_leg.get("duration", 120)
            duration_hours = duration_minutes / 60.0
            
            # Serpapi provides departure and arrival time as string '2025-07-10 08:00'
            departure_time_str = flights_leg.get("departure_airport", {}).get("time", "")
            if departure_time_str:
                try:
                    dep_time = datetime.strptime(departure_time_str, "%Y-%m-%d %H:%M")
                except ValueError:
                    base_date = datetime.strptime(date, "%Y-%m-%d")
                    dep_time = base_date.replace(hour=8 + idx)
            else:
                base_date = datetime.strptime(date, "%Y-%m-%d")
                dep_time = base_date.replace(hour=8 + idx) # Stagger flights
            
            arr_time = dep_time + timedelta(hours=duration_hours)
            # Extract airline name
            airline = flights_leg.get("airline", "Unknown Airline")
            flight_number = flights_leg.get("flight_number", "")
            provider_str = f"{airline} {flight_number}".strip()
            
            options.append(TransportOption(
                id=f"fl_{idx}",
                type=TransportType.FLIGHT,
                departure=dep_time,
                arrival=arr_time,
                duration_hours=round(duration_hours, 1),
                price=float(price), 
                safety_score=9,
                comfort_score=8,
                provider=provider_str
            ))
            
        return sorted(options, key=lambda x: x.price)
        
    except Exception as e:
        print(f"Error fetching live flights: {e}")
        return []

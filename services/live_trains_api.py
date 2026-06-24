import os
import requests
from typing import List
from datetime import datetime, timedelta
from dotenv import load_dotenv
from models.entities import TransportOption
from models.enums import TransportType

load_dotenv()

# Expanded city to station mapping for Indian Railways
CITY_TO_STATION = {
    "Delhi": "NDLS", "New Delhi": "NDLS",
    "Mumbai": "BCT",
    "Goa": "MAO",
    "Bangalore": "SBC", "Bengaluru": "SBC",
    "Chennai": "MAS",
    "Kolkata": "HWH",
    "Lucknow": "LKO",
    "Pune": "PUNE",
    "Ahmedabad": "ADI",
    "Jaipur": "JP",
    "Surat": "ST",
    "Kanpur": "CNB",
    "Nagpur": "NGP",
    "Indore": "INDB",
    "Bhopal": "BPL",
    "Patna": "PNBE",
    "Vadodara": "BRC",
    "Ludhiana": "LDH",
    "Agra": "AGC",
    "Varanasi": "BSB",
    "Amritsar": "ASR",
    "Allahabad": "PRYJ",
    "Prayagraj": "PRYJ",
    "Ranchi": "RNC",
    "Guwahati": "GHY",
    "Chandigarh": "CDG",
    "Manali": "CDG",  # Nearest major station
    "Shimla": "SML",
    "Udaipur": "UDZ",
    "Jodhpur": "JU",
    "Dehradun": "DDN"
}

def search_live_trains(origin_city: str, dest_city: str, date: str) -> List[TransportOption]:
    print(f"\n[API Call] Fetching live trains (via IRCTC RapidAPI): {origin_city} -> {dest_city} on {date}...")
    
    # Strip any states from formatted names (e.g. "Lucknow, Uttar Pradesh" -> "Lucknow")
    clean_origin = origin_city.split(",")[0].strip()
    clean_dest = dest_city.split(",")[0].strip()
    
    origin_code = CITY_TO_STATION.get(clean_origin)
    dest_code = CITY_TO_STATION.get(clean_dest)
    
    if not origin_code or not dest_code:
        print(f"[Warning] Could not map {clean_origin} or {clean_dest} to a station code.")
        return _get_fallback_trains(origin_city, dest_city, date)

    api_key = os.getenv("RAPIDAPI_KEY")
    if not api_key:
        print("[Warning] No RAPIDAPI_KEY found in environment. Falling back to mock trains.")
        return _get_fallback_trains(origin_city, dest_city, date)

    # Format date from YYYY-MM-DD to DD-MM-YYYY for IRCTC RapidAPI
    try:
        formatted_date = datetime.strptime(date, "%Y-%m-%d").strftime("%d-%m-%Y")
    except Exception:
        formatted_date = date

    url = "https://irctc1.p.rapidapi.com/api/v3/trainBetweenStations"
    querystring = {
        "fromStationCode": origin_code,
        "toStationCode": dest_code,
        "dateOfJourney": formatted_date
    }
    headers = {
        "x-rapidapi-key": api_key,
        "x-rapidapi-host": "irctc1.p.rapidapi.com"
    }

    try:
        response = requests.get(url, headers=headers, params=querystring, timeout=15)
        response.raise_for_status()
        data = response.json()
        
        options = []
        if not data.get("status") or not data.get("data"):
            print(f"[Warning] API returned failure or no trains found: {data.get('message', 'Unknown error')}")
            return _get_fallback_trains(origin_city, dest_city, date)
            
        train_list = data.get("data", [])
        
        for idx, train in enumerate(train_list[:5]): # Take top 5
            train_num = train.get("train_number", f"T{idx}")
            train_name = train.get("train_name", f"Train {train_num}")
            dep_time_str = train.get("from_std", "08:00")
            arr_time_str = train.get("to_sta", "20:00")
            
            try:
                base_date = datetime.strptime(date, "%Y-%m-%d")
                dep_hour, dep_minute = map(int, dep_time_str.split(":"))
                dep_time = base_date.replace(hour=dep_hour, minute=dep_minute)
                
                arr_hour, arr_minute = map(int, arr_time_str.split(":"))
                arr_time = base_date.replace(hour=arr_hour, minute=arr_minute)
                
                # Check for day crossing
                from_day = int(train.get("from_day", 0))
                to_day = int(train.get("to_day", 0))
                if to_day > from_day or arr_time < dep_time:
                    days_diff = max(to_day - from_day, 1)
                    arr_time += timedelta(days=days_diff)
                    
                duration_hours = (arr_time - dep_time).total_seconds() / 3600.0
            except Exception:
                base_date = datetime.strptime(date, "%Y-%m-%d")
                dep_time = base_date.replace(hour=8 + idx)
                duration_hours = 14.0
                arr_time = dep_time + timedelta(hours=duration_hours)
            
            # Since IRCTC v3 betweenStations doesn't return exact fare without a specific fare query,
            # we estimate realistic Indian Railways base fare (approx ₹80-120 per hour for 3A/2A average)
            price = 500 + (duration_hours * 80)
            
            options.append(TransportOption(
                id=f"tr_{train_num}_{idx}",
                type=TransportType.TRAIN,
                departure=dep_time,
                arrival=arr_time,
                duration_hours=round(duration_hours, 1),
                price=float(price), 
                safety_score=8,
                comfort_score=7,
                provider=train_name
            ))
            
        return sorted(options, key=lambda x: x.price)
        
    except Exception as e:
        print(f"Error fetching live trains from IRCTC RapidAPI: {e}")
        return _get_fallback_trains(origin_city, dest_city, date)

def _get_fallback_trains(source, dest, date_str):
    """Provides graceful fallback if the API fails or rate-limits so the planner doesn't crash."""
    d = datetime.strptime(date_str, "%Y-%m-%d")
    return [
        TransportOption(id="t2_fallback", type=TransportType.TRAIN, departure=d.replace(hour=18), arrival=d+timedelta(days=1, hours=8), duration_hours=14.0, price=1500, safety_score=8, comfort_score=6, provider="Shatabdi Express (Fallback)"),
    ]

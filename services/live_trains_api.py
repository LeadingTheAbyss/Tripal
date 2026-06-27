import os
import requests
import time
from collections import deque
from typing import List
from datetime import datetime, timedelta
from dotenv import load_dotenv
from models.entities import TransportOption
from models.enums import TransportType

load_dotenv(override=True)

# Rate Limiting Queue for RailRadar (10 requests / minute burst)
_request_timestamps = deque()
MAX_REQUESTS_PER_MINUTE = 9 # Keep it at 9 to be safe

# Expanded city to station mapping for Indian Railways
CITY_TO_STATION = {
    "Delhi": "NDLS", "New Delhi": "NDLS",
    "Mumbai": "CSMT",
    "Bangalore": "SBC", "Bengaluru": "SBC",
    "Chennai": "MAS",
    "Kolkata": "HWH",
    "Lucknow": "LKO",
    "Jaipur": "JP",
    "Agra": "AGC",
    "Varanasi": "BSB",
    "Ahmedabad": "ADI",
    "Pune": "PUNE",
    "Hyderabad": "SC",
    "Chandigarh": "CDG",
    "Amritsar": "ASR",
    "Kochi": "ERS", "Cochin": "ERS",
    "Goa": "MAO",
    "Trivandrum": "TVC",
    "Guwahati": "GHY",
    "Patna": "PNBE",
    "Bhopal": "BPL",
    "Indore": "INDB",
    "Nagpur": "NGP",
    "Kanpur": "CNB",
    "Ludhiana": "LDH",
    "Dehradun": "DDN",
    "Ranchi": "RNC",
    "Bhubaneswar": "BBS",
    "Raipur": "R",
    "Surat": "ST",
    "Vadodara": "BRC",
    "Udaipur": "UDZ",
    "Jodhpur": "JU"
}

# Clustered stations for major cities to fetch more trains
STATION_CLUSTERS = {
    "Delhi": ["NDLS", "ANVT", "DLI"],
    "New Delhi": ["NDLS", "ANVT", "DLI"],
    "Lucknow": ["LKO", "LJN"]
}

def get_station_code(city_name: str) -> str:
    # First check our fast-path dict
    if city_name in CITY_TO_STATION:
        return CITY_TO_STATION[city_name]
        
    # Attempt dynamic lookup using the Datameet stations JSON
    import json
    import os
    
    stations_file = os.path.join("data", "stations.json")
    
    # Download if not exists
    if not os.path.exists(stations_file):
        try:
            print(f"Downloading stations database for dynamic lookup...")
            # We use a short timeout so we don't block forever
            res = requests.get("https://raw.githubusercontent.com/datameet/railways/master/stations.json", timeout=10)
            res.raise_for_status()
            os.makedirs("data", exist_ok=True)
            with open(stations_file, 'w', encoding='utf-8') as f:
                f.write(res.text)
        except Exception as e:
            print(f"[Warning] Failed to fetch stations JSON: {e}")
            return None
            
    # Load and search
    try:
        with open(stations_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
            
        features = data.get("features", [])
        city_lower = city_name.lower()
        
        for feature in features:
            props = feature.get("properties", {})
            if not props: continue
            name = (props.get("name") or "").lower()
            code = props.get("code")
            
            # If exact match or city name is prominently in the station name
            if city_lower == name or city_lower + " jn" == name or city_lower + " cant" == name:
                return code
                
            # If address contains the city
            address = (props.get("address") or "").lower()
            if city_lower in address and code:
                # We can return the first match
                return code
                
    except Exception as e:
        print(f"[Warning] Error parsing stations JSON: {e}")
        
    return None


def search_live_trains(origin_city: str, dest_city: str, date: str) -> List[TransportOption]:
    print(f"\n[API Call] Fetching live trains (via IRCTC RapidAPI): {origin_city} -> {dest_city} on {date}...")
    
    # Strip any states from formatted names (e.g. "Lucknow, Uttar Pradesh" -> "Lucknow")
    clean_origin = origin_city.split(",")[0].strip()
    clean_dest = dest_city.split(",")[0].strip()
    
    origin_code = get_station_code(clean_origin)
    dest_code = get_station_code(clean_dest)
    
    if not origin_code or not dest_code:
        print(f"[Warning] Could not dynamically map {clean_origin} or {clean_dest} to a station code.")
        return _get_fallback_trains(origin_city, dest_city, date)

    api_key = os.getenv("RAILRADAR_API_KEY")
    if not api_key:
        print("[Warning] No RAILRADAR_API_KEY found in .env. Falling back to mock trains.")
        return _get_fallback_trains(origin_city, dest_city, date)

    # 1. Determine station combinations to check (max 3 to avoid rate limit)
    origins = STATION_CLUSTERS.get(clean_origin, [origin_code])
    dests = STATION_CLUSTERS.get(clean_dest, [dest_code])
    
    combinations = []
    for o in origins:
        for d in dests:
            combinations.append((o, d))
            
    # Strictly limit to 3 requests so we don't blow the 10 req/min limit instantly
    combinations = combinations[:3]
    
    options = []
    seen_trains = set()
    
    for (o_code, d_code) in combinations:
        # Enforce Rate Limiting per request
        current_time = time.time()
        while _request_timestamps and current_time - _request_timestamps[0] > 60:
            _request_timestamps.popleft()
            
        if len(_request_timestamps) >= MAX_REQUESTS_PER_MINUTE:
            print("[Warning] Rate limit exceeded (10 req/min) during cluster search. Stopping further fetches.")
            break
            
        _request_timestamps.append(current_time)

        # 2. Fetch from RailRadar
        url = f"https://api.railradar.in/v1/trains/between/{o_code}/{d_code}?date={date}"
        headers = {
            "Authorization": f"Bearer {api_key}"
        }

        try:
            response = requests.get(url, headers=headers, timeout=15)
            response.raise_for_status()
            json_resp = response.json()
            
            if not json_resp.get("success"):
                continue
                
            data_obj = json_resp.get("data", {})
            if isinstance(data_obj, list):
                train_list = data_obj
            else:
                train_list = data_obj.get("trains", [])
            
            for idx, train_obj in enumerate(train_list):
                train_info = train_obj.get("train", {})
                from_info = train_obj.get("from", {})
                to_info = train_obj.get("to", {})

                train_num = train_info.get("number", f"T{idx}")
                train_name = train_info.get("name", f"Train {train_num}")
                
                if train_name in seen_trains:
                    continue
                seen_trains.add(train_name)
                
                if len(options) >= 20: # Expanded max limit since we're clustering
                    break
                    
                dep_time_str = from_info.get("departure", "08:00")
                arr_time_str = to_info.get("arrival", "20:00")
                
                try:
                    base_date = datetime.strptime(date, "%Y-%m-%d")
                    dep_hour, dep_minute = map(int, dep_time_str.split(":"))
                    dep_time = base_date.replace(hour=dep_hour, minute=dep_minute)
                    
                    arr_hour, arr_minute = map(int, arr_time_str.split(":"))
                    arr_time = base_date.replace(hour=arr_hour, minute=arr_minute)
                    
                    from_day = int(from_info.get("day", 1))
                    to_day = int(to_info.get("day", 1))
                    
                    if to_day > from_day or arr_time < dep_time:
                        days_diff = max(to_day - from_day, 1)
                        arr_time += timedelta(days=days_diff)
                        
                    duration_hours = (arr_time - dep_time).total_seconds() / 3600.0
                    
                    api_duration = train_obj.get("duration")
                    if api_duration:
                        duration_hours = float(api_duration) / 60.0
                        
                except Exception:
                    base_date = datetime.strptime(date, "%Y-%m-%d")
                    dep_time = base_date.replace(hour=8 + idx)
                    duration_hours = 14.0
                    arr_time = dep_time + timedelta(hours=duration_hours)
                
                price = round(500 + (duration_hours * 80))
                
                options.append(TransportOption(
                    id=f"tr_{train_num}_{len(options)}",
                    type=TransportType.TRAIN,
                    departure=dep_time,
                    arrival=arr_time,
                    duration_hours=round(duration_hours, 1),
                    price=float(price), 
                    safety_score=8,
                    comfort_score=7,
                    provider=train_name
                ))
                
        except Exception as e:
            print(f"Error fetching live trains from RailRadar API for {o_code}-{d_code}: {e}")
            
    if not options:
        return _get_fallback_trains(origin_city, dest_city, date)
        
    return sorted(options, key=lambda x: x.price)

def _get_fallback_trains(source, dest, date_str):
    """Provides graceful fallback if the API fails or rate-limits so the planner doesn't crash."""
    d = datetime.strptime(date_str, "%Y-%m-%d")
    return [
        TransportOption(id="t2_fallback", type=TransportType.TRAIN, departure=d.replace(hour=18), arrival=d+timedelta(days=1, hours=8), duration_hours=14.0, price=1500, safety_score=8, comfort_score=6, provider="Shatabdi Express (Fallback)"),
    ]

def get_train_route(train_number: str):
    """Fetches the full timetable (stops) of a specific train from RailRadar."""
    api_key = os.getenv("RAILRADAR_API_KEY")
    if not api_key: return {"error": "API key missing"}
    
    url = f"https://api.railradar.in/v1/trains/{train_number}"
    try:
        res = requests.get(url, headers={"Authorization": f"Bearer {api_key}"}, timeout=10)
        return res.json()
    except Exception as e:
        return {"error": str(e)}

def get_live_train_status(train_number: str, date: str):
    """Fetches the real-time position and delay of a running train."""
    api_key = os.getenv("RAILRADAR_API_KEY")
    if not api_key: return {"error": "API key missing"}
    
    url = f"https://api.railradar.in/v1/trains/{train_number}/live?date={date}"
    try:
        res = requests.get(url, headers={"Authorization": f"Bearer {api_key}"}, timeout=10)
        return res.json()
    except Exception as e:
        return {"error": str(e)}

def get_station_board(station_code: str):
    """Fetches the live arrivals/departures board for a station in the next 4 hours."""
    api_key = os.getenv("RAILRADAR_API_KEY")
    if not api_key: return {"error": "API key missing"}
    
    # Clean the station code if it's passed as a city name
    code = CITY_TO_STATION.get(station_code, station_code)
    
    url = f"https://api.railradar.in/v1/stations/{code}/trains"
    try:
        res = requests.get(url, headers={"Authorization": f"Bearer {api_key}"}, timeout=10)
        return res.json()
    except Exception as e:
        return {"error": str(e)}

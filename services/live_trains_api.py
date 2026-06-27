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

    url = f"https://erail.in/rail/getTrains.aspx?Station_From={origin_code}&Station_To={dest_code}&DataSource=0&Language=0&Cache=true"

    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36"
    }

    try:
        response = requests.get(url, headers=headers, timeout=15)
        response.raise_for_status()
        text_data = response.text
        
        if "No direct trains found" in text_data or "Please try again" in text_data or "station not found" in text_data:
            print("[Warning] erail.in returned no trains or error.")
            return _get_fallback_trains(origin_city, dest_city, date)
            
        # Parse the custom erail format
        train_blocks = text_data.split("~~~~~~~~")
        parsed_trains = []
        
        for block in train_blocks:
            if not block.strip(): continue
            parts = block.split("~^")
            if len(parts) == 2:
                fields = [f for f in parts[1].split("~") if f]
                if len(fields) >= 14:
                    parsed_trains.append({
                        "train_no": fields[0],
                        "train_name": fields[1],
                        "from_time": fields[10],
                        "to_time": fields[11],
                        "travel_time": fields[12],
                        "running_days": fields[13]
                    })
                    
        options = []
        if not parsed_trains:
            print("[Warning] No trains parsed from erail.in.")
            return _get_fallback_trains(origin_city, dest_city, date)
            
        for idx, train in enumerate(parsed_trains[:10]):
            train_num = train.get("train_no", f"T{idx}")
            train_name = train.get("train_name", f"Train {train_num}")
            dep_time_str = train.get("from_time", "08:00")
            arr_time_str = train.get("to_time", "20:00")
            
            try:
                base_date = datetime.strptime(date, "%Y-%m-%d")
                dep_hour, dep_minute = map(int, dep_time_str.split(":"))
                dep_time = base_date.replace(hour=dep_hour, minute=dep_minute)
                
                arr_hour, arr_minute = map(int, arr_time_str.split(":"))
                arr_time = base_date.replace(hour=arr_hour, minute=arr_minute)
                
                # Check for day crossing
                if arr_time < dep_time:
                    arr_time += timedelta(days=1)
                    
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
            
        if not options:
            return _get_fallback_trains(origin_city, dest_city, date)
            
        return sorted(options, key=lambda x: x.price)
        
    except Exception as e:
        print(f"Error fetching live trains directly from erail.in: {e}")
        return _get_fallback_trains(origin_city, dest_city, date)

def _get_fallback_trains(source, dest, date_str):
    """Provides graceful fallback if the API fails or rate-limits so the planner doesn't crash."""
    d = datetime.strptime(date_str, "%Y-%m-%d")
    return [
        TransportOption(id="t2_fallback", type=TransportType.TRAIN, departure=d.replace(hour=18), arrival=d+timedelta(days=1, hours=8), duration_hours=14.0, price=1500, safety_score=8, comfort_score=6, provider="Shatabdi Express (Fallback)"),
    ]

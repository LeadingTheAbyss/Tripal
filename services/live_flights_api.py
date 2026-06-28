import os
import json
import requests
from typing import List
from datetime import datetime, timedelta
import random
from models.entities import TransportOption
from models.enums import TransportType
from services.dgca_pdf_parser import load_cached_flights

def _parse_days_of_operation(days_str: str) -> List[int]:
    """Parses a days of operation string into a list of Python weekday integers (0 = Mon, 6 = Sun)."""
    days = []
    days_str = str(days_str).strip()
    if not days_str or days_str.lower() in ['nan', 'none']:
        return [0, 1, 2, 3, 4, 5, 6]
    
    for i in range(1, 8):
        if str(i) in days_str:
            days.append(i - 1)
    return days if days else [0, 1, 2, 3, 4, 5, 6]

def search_live_flights(origin_iata: str, dest_iata: str, date: str) -> List[TransportOption]:
    print(f"\n[API Call] Fetching live flights (DGCA PDF): {origin_iata} -> {dest_iata} on {date}...")
    
    options = []
    try:
        base_date = datetime.strptime(date, "%Y-%m-%d")
        target_weekday = base_date.weekday()
    except ValueError:
        base_date = datetime.now()
        target_weekday = base_date.weekday()
        
    cached_flights = load_cached_flights()
    
    for idx, flight in enumerate(cached_flights):
        if flight["origin"].upper() == origin_iata.upper() and flight["dest"].upper() == dest_iata.upper():
            days_of_op = _parse_days_of_operation(flight["freq"])
            
            if target_weekday not in days_of_op:
                continue
                
            dep_time_raw = flight["dep_time"]
            arr_time_raw = flight["arr_time"]
            
            try:
                if len(dep_time_raw) >= 4 and ':' not in dep_time_raw:
                    dep_time_raw = f"{dep_time_raw[:2]}:{dep_time_raw[2:4]}"
                elif len(dep_time_raw) > 5:
                    dep_time_raw = dep_time_raw[:5]
                    
                if len(arr_time_raw) >= 4 and ':' not in arr_time_raw:
                    arr_time_raw = f"{arr_time_raw[:2]}:{arr_time_raw[2:4]}"
                elif len(arr_time_raw) > 5:
                    arr_time_raw = arr_time_raw[:5]
                    
                dep_dt = datetime.strptime(f"{date} {dep_time_raw}", "%Y-%m-%d %H:%M")
                arr_dt = datetime.strptime(f"{date} {arr_time_raw}", "%Y-%m-%d %H:%M")
                
                # Handle overnight flights
                if arr_dt < dep_dt:
                    arr_dt += timedelta(days=1)
                    
                duration_hours = (arr_dt - dep_dt).total_seconds() / 3600.0
            except Exception as e:
                print(f"[DGCA Error] Time parsing failed for {flight['flight_no']}: {e}")
                continue
                
            price = 3000 + (duration_hours * 1500)
            
            options.append(TransportOption(
                id=f"dgca_fl_{idx}",
                type=TransportType.FLIGHT,
                departure=dep_dt,
                arrival=arr_dt,
                duration_hours=duration_hours,
                price=float(round(price, -2)), 
                safety_score=9,
                comfort_score=8,
                provider=f"{flight['airline']} {flight['flight_no']} *"
            ))
            
    # Fallback to FlightAPI if no flights found
    if not options:
        print(f"[API Call] Route {origin_iata} -> {dest_iata} not found in DGCA. Falling back to FlightAPI...")
        api_key = "6a40cc228466d4877c15a08c"
        url = f"https://api.flightapi.io/onewaytrip/{api_key}/{origin_iata}/{dest_iata}/{date}/1/0/0/Economy/USD"
        try:
            resp = requests.get(url)
            if resp.status_code == 200:
                data = resp.json()
                carriers = {c['id']: c.get('name', c.get('display_code', 'Unknown Airline')) for c in data.get('carriers', [])}
                segments = {s['id']: s for s in data.get('segments', [])}
                
                new_flights = []
                for leg in data.get('legs', []):
                    if leg.get('stop_count', 0) == 0 and leg.get('segment_ids'):
                        segment_id = leg['segment_ids'][0]
                        segment = segments.get(segment_id)
                        if segment:
                            carrier_name = carriers.get(segment.get('marketing_carrier_id'), 'Unknown Airline')
                            flight_no = f"{carrier_name[:2].upper()} {segment.get('marketing_flight_number', '')}".strip()
                            
                            dep_time_full = segment.get('departure', '')
                            arr_time_full = segment.get('arrival', '')
                            
                            if 'T' in dep_time_full and 'T' in arr_time_full:
                                dep_time = dep_time_full.split('T')[1][:5]
                                arr_time = arr_time_full.split('T')[1][:5]
                                
                                new_flight = {
                                    "flight_no": flight_no,
                                    "origin": origin_iata.upper(),
                                    "dest": dest_iata.upper(),
                                    "airline": carrier_name,
                                    "freq": "1234567",
                                    "arr_time": arr_time,
                                    "dep_time": dep_time
                                }
                                # Add to memory so we can parse it right now
                                new_flights.append(new_flight)
                
                if new_flights:
                    # De-duplicate
                    unique_flights = {f["flight_no"] + f["dep_time"]: f for f in new_flights}.values()
                    
                    # Append to JSON
                    cache_file = "data/parsed_flights.json"
                    if os.path.exists(cache_file):
                        with open(cache_file, "r") as f:
                            all_flights = json.load(f)
                    else:
                        all_flights = []
                        
                    all_flights.extend(unique_flights)
                    with open(cache_file, "w") as f:
                        json.dump(all_flights, f, indent=4)
                        
                    # Now build TransportOptions for them directly
                    for idx, flight in enumerate(unique_flights):
                        try:
                            dep_dt = datetime.strptime(f"{date} {flight['dep_time']}", "%Y-%m-%d %H:%M")
                            arr_dt = datetime.strptime(f"{date} {flight['arr_time']}", "%Y-%m-%d %H:%M")
                            if arr_dt < dep_dt:
                                arr_dt += timedelta(days=1)
                            duration_hours = (arr_dt - dep_dt).total_seconds() / 3600.0
                            price = 3000 + (duration_hours * 1500)
                            
                            options.append(TransportOption(
                                id=f"dgca_fl_fb_{idx}",
                                type=TransportType.FLIGHT,
                                departure=dep_dt,
                                arrival=arr_dt,
                                duration_hours=duration_hours,
                                price=float(round(price, -2)), 
                                safety_score=9,
                                comfort_score=8,
                                provider=f"{flight['airline']} {flight['flight_no']} *"
                            ))
                        except Exception as e:
                            print(f"[Fallback Error] Parsing new flight failed: {e}")
                            
        except Exception as e:
            print(f"[API Error] FlightAPI fallback failed: {e}")

    return sorted(options, key=lambda x: x.price)

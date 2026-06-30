import os
import json
import pdfplumber
from typing import Dict, List, Any

AIRLINE_MAP = {
    "AirIndiaLtd": "Air India",
    "AirIndiaExpress": "Air India Express",
    "AllianceAir": "Alliance Air",
    "INTERGLOBE": "IndiGo",
    "SNVAviation": "Akasa Air",
    "SpiceJet": "SpiceJet"
}

CITY_TO_IATA = {
    "DELHI": "DEL", "NEW DELHI": "DEL", "MUMBAI": "BOM", "NAVI MUMBAI": "BOM", "BENGALURU": "BLR", "BANGALORE": "BLR", 
    "HYDERABAD": "HYD", "CHENNAI": "MAA", "KOLKATA": "CCU", "AHMEDABAD": "AMD", 
    "PUNE": "PNQ", "GOA": "GOI", "MOPA": "GOX", "LUCKNOW": "LKO", "JAIPUR": "JAI", 
    "PATNA": "PAT", "CHANDIGARH": "IXC", "KOCHI": "COK", "COCHIN": "COK", 
    "BHUBANESWAR": "BBI", "GUWAHATI": "GAU", "AMRITSAR": "ATQ", 
    "THIRUVANANTHAPURAM": "TRV", "TRIVANDRUM": "TRV", "INDORE": "IDR", 
    "SRINAGAR": "SXR", "MANGALORE": "IXE", "VARANASI": "VNS", "COIMBATORE": "CJB", 
    "NAGPUR": "NAG", "BAGDOGRA": "IXB", "PORT BLAIR": "IXZ", "VISHAKHAPATNAM": "VTZ", 
    "VIZAG": "VTZ", "SURAT": "STV", "MADURAI": "IXM", "TIRUCHIRAPPALLI": "TRZ", 
    "TRICHY": "TRZ", "RAIPUR": "RPR", "JAMMU": "IXJ", "AGARTALA": "IXA", 
    "DEHRADUN": "DED", "UDAIPUR": "UDR", "VADODARA": "BDQ", "LEH": "IXL", 
    "BHOPAL": "BHO", "VIJAYAWADA": "VGA", "RANCHI": "IXR", "TIRUPATI": "TIR", 
    "RAJAHMUNDRY": "RJA", "SHILLONG": "SHL", "KANPUR": "KNU", "GORAKHPUR": "GOP", 
    "AGRA": "AGR", "GWALIOR": "GWL", "JODHPUR": "JDH", "DIBRUGARH": "DIB", 
    "SILCHAR": "IXS", "DIMAPUR": "DMU", "IMPHAL": "IMF", "AURANGABAD": "IXU", 
    "RAJKOT": "RAJ", "AYODHYA": "AYJ", "SHIRDI": "SAG", "HUBLI": "HBX", 
    "BELGAUM": "IXG", "TUTICORIN": "TCR", "PONDICHERRY": "PNY", "DHARAMSHALA": "DHM", 
    "PANTNAGAR": "PGH", "DARBHANGA": "DBR", "DEOGHAR": "DGH", "KANNUR": "CNN",
    "BAREILLY": "BEK", "KISHANGARH": "KQH", "JABALPUR": "JLR", "KHAJURAHO": "HJR",
    "GAYA": "GAY", "MYSORE": "MYQ", "RAJAHMUNDRY": "RJA", "JHARSUGUDA": "JRG",
    "DURGAPUR": "RDP", "GWALIOR": "GWL", "JALGAON": "JLG", "KANDLA": "IXY",
    "PORBANDAR": "PBR", "BHAVNAGAR": "BHU", "BHUJ": "BHJ", "DIU": "DIU",
    "KESHOD": "IXK", "SALEM": "SXV", "KADAPA": "CDP", "KURNOOL": "KJB",
    "BIDAR": "IXX", "BELLARY": "BEP", "SINDHUDURG": "SDW", "KOLHAPUR": "KLH",
    "NASIK": "ISK", "SHOLAPUR": "SSE", "PRAYAGRAJ": "IXD", "ALLAHABAD": "IXD",
    "HINDON": "HDO", "BHATINDA": "BUP", "LUDHIANA": "LUH", "PATHANKOT": "IXP",
    "ADAMPUR": "AIP", "SHIMLA": "SLV", "KULLU": "KUU", "AGATTI": "AGX",
    "ROURKELA": "RRK", "JEYPORE": "PYB", "PASIGHAT": "IXT", "TEZU": "TEI",
    "LILABARI": "IXI", "RUPASI": "RUP", "TEZPUR": "TEZ", "Ziro": "ZER"
}

def get_airline_name(filename: str) -> str:
    for key, name in AIRLINE_MAP.items():
        if key.lower() in filename.lower():
            return name
    return "Unknown Airline"

def parse_all_pdfs(cache_file: str = "data/parsed_flights.json") -> List[Dict[str, Any]]:
    pdf_dir = os.path.join("data", "dgca_schedules")
    if not os.path.exists(pdf_dir):
        return []

    flights_dict = {}

    for file in os.listdir(pdf_dir):
        if not file.endswith(".pdf"):
            continue
            
        airline_name = get_airline_name(file)
        pdf_path = os.path.join(pdf_dir, file)
        
        try:
            with pdfplumber.open(pdf_path) as pdf:
                current_station = None
                station_iata = None
                for page in pdf.pages:
                    table = page.extract_table()
                    if not table:
                        continue
                        
                    for row in table:
                        if not row or len(row) < 9:
                            continue
                            
                        col0 = str(row[0]).strip() if row[0] is not None else ""
                        col1 = str(row[1]).strip() if row[1] is not None else ""
                        
                        if col0 and not col1:
                            if col0 not in ["Sl. No", "Approved Summer Schedule Domestic", "Operator"]:
                                current_station = col0.upper()
                                # Clean up station name if needed (e.g. "AHMEDABAD " -> "AHMEDABAD")
                                clean_station = current_station.split('(')[0].strip()
                                station_iata = CITY_TO_IATA.get(clean_station)
                            continue
                        
                        if not station_iata:
                            continue
                            
                        flight_no = col1
                        if not flight_no or flight_no == "Flight No." or flight_no == "None":
                            continue
                            
                        freq = str(row[4]).strip() if row[4] is not None else ""
                        arr_from = str(row[5]).strip() if row[5] is not None else ""
                        arr_time = str(row[6]).strip() if row[6] is not None else ""
                        dep_to = str(row[7]).strip() if row[7] is not None else ""
                        dep_time = str(row[8]).strip() if row[8] is not None else ""
                        
                        # Arrival leg
                        if arr_from and arr_time and arr_from != "None" and arr_time != "None":
                            key = f"{flight_no}_{arr_from}_{station_iata}"
                            if key not in flights_dict:
                                flights_dict[key] = {"flight_no": flight_no, "origin": arr_from, "dest": station_iata, "airline": airline_name, "freq": freq}
                            flights_dict[key]["arr_time"] = arr_time
                            
                        # Departure leg
                        if dep_to and dep_time and dep_to != "None" and dep_time != "None":
                            key = f"{flight_no}_{station_iata}_{dep_to}"
                            if key not in flights_dict:
                                flights_dict[key] = {"flight_no": flight_no, "origin": station_iata, "dest": dep_to, "airline": airline_name, "freq": freq}
                            flights_dict[key]["dep_time"] = dep_time

        except Exception as e:
            print(f"[DGCA Parser] Error parsing {file}: {e}")

    # Filter complete legs
    valid_flights = []
    for k, v in flights_dict.items():
        if "dep_time" in v and "arr_time" in v:
            valid_flights.append(v)
            
    with open(cache_file, "w") as f:
        json.dump(valid_flights, f, indent=4)
        
    return valid_flights

def load_cached_flights(cache_file: str = "data/parsed_flights.json") -> List[Dict[str, Any]]:
    if os.path.exists(cache_file):
        with open(cache_file, "r") as f:
            return json.load(f)
    else:
        return parse_all_pdfs(cache_file)

if __name__ == "__main__":
    flights = parse_all_pdfs()
    print(f"Parsed {len(flights)} complete flight legs.")

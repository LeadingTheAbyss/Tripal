import requests
import json
import re

def build_prompt(passengers: list, total_budget: int, days: int, preference: str) -> str:
    cities = [p.get("city", "Unknown") for p in passengers if p.get("city")]
    city_str = ", ".join(cities) if cities else "various locations"
    num_pax = len(cities) if cities else 1
    
    per_person = total_budget // num_pax if num_pax > 0 else total_budget

    return f"""
A group of {num_pax} travelers want to take a trip.
- Their home cities are: {city_str}
- Total budget for the entire group: ₹{total_budget}
- Budget per person: ₹{per_person}
- Duration: {days} days (excluding travel days)
- Primary preference: {preference} (e.g. mountains, beaches, heritage, desert, wildlife, spiritual)

Recommend 6 destinations in India. 
- The first 3 destinations MUST match their primary preference ("{preference}"). 
- The other 3 destinations MUST be of different categories (e.g., if they like beaches, show mountains or heritage) to give them alternative options.

Respond ONLY with a JSON object containing a "destinations" array, where each item matches this EXACT structure:
{{
  "destinations": [
    {{
      "id": "slug_name",
      "name": "Destination Name",
      "state": "State Name",
      "category": "mountains|beaches|heritage|desert|wildlife|spiritual|hills|any",
      "tags": ["Tag1", "Tag2", "Tag3"],
      "why": "A 1-2 sentence personal explanation referencing their cities and budget.",
      "budgetEstimate": 0,
      "perPersonEstimate": 0,
      "matchScore": 92,
      "isPrimaryMatch": true
    }}
  ]
}}

Rules:
- budgetEstimate MUST be a realistic calculated total cost in INR for ALL {num_pax} people for {days} days (including transport from {city_str}, stay, and food). Do NOT just copy 0 from the example! Provide a real number.
- budgetEstimate MUST NOT exceed ₹{total_budget}.
- perPersonEstimate MUST be mathematically equal to (budgetEstimate / {num_pax}).
- matchScore is 0-100. Primary preference destinations score 80-100, others score 50-79.
- isPrimaryMatch is true ONLY for destinations matching "{preference}".
- Return EXACTLY 6 destinations.
"""

def call_ollama(prompt: str) -> str:
    system_prompt = "You are an expert Indian travel planner. Respond ONLY with valid JSON."
    
    try:
        res = requests.post("http://localhost:11434/api/generate", json={
            "model": "gemma2:2b",
            "prompt": f"{system_prompt}\n\n{prompt}",
            "stream": False,
            "options": {
                "temperature": 0.4
            }
        }, timeout=180)
        res.raise_for_status()
        return res.json().get("response", "")
    except Exception as e:
        print(f"[Error] Ollama call failed: {e}")
        return f"EXCEPTION: {str(e)}"

def parse_response(raw: str) -> list:
    if not raw:
        return []
    
    # Attempt 1: Direct parsing
    try:
        data = json.loads(raw)
        if isinstance(data, dict) and "destinations" in data:
            return data["destinations"]
        elif isinstance(data, list):
            return data
    except json.JSONDecodeError:
        pass
        
    # Attempt 2: Extract JSON object using regex
    try:
        match = re.search(r'\{.*\}', raw, re.DOTALL)
        if match:
            data = json.loads(match.group(0))
            if isinstance(data, dict) and "destinations" in data:
                return data["destinations"]
    except json.JSONDecodeError:
        pass
        
    print("[Error] Failed to parse Ollama response as JSON array")
    print(raw.encode('ascii', 'replace').decode('ascii'))
    return []

def recommend(passengers: list, total_budget: int, days: int, preference: str) -> list:
    prompt = build_prompt(passengers, total_budget, days, preference)
    raw_response = call_ollama(prompt)
    destinations = parse_response(raw_response)
    
    # Fallback if Ollama fails or returns invalid response
    if not destinations or not isinstance(destinations, list):
        error_details = raw_response[:300] if raw_response else "Empty response"
        return [
            {
                "id": "fallback_error",
                "name": "Service Unavailable",
                "state": "N/A",
                "category": preference,
                "tags": ["Error"],
                "why": f"Ollama failed. Details: {error_details}",
                "budgetEstimate": 0,
                "perPersonEstimate": 0,
                "matchScore": 0,
                "isPrimaryMatch": False
            }
        ]
        
    # Enforce correct math manually (LLMs often hallucinate basic division)
    cities = [p for p in passengers if p.get("city")]
    num_pax = len(cities) if cities else 1
    
    for dest in destinations:
        if isinstance(dest, dict) and "budgetEstimate" in dest:
            try:
                dest["budgetEstimate"] = int(dest["budgetEstimate"])
                dest["perPersonEstimate"] = dest["budgetEstimate"] // num_pax
            except:
                pass
                
    return destinations

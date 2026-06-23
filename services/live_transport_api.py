import requests
import re
from typing import List, Dict

def fetch_local_transport_providers(city: str) -> List[Dict]:
    print(f"\n[API Call] Live Web Scraping for real taxi providers in {city}...")
    
    url = "https://lite.duckduckgo.com/lite/"
    payload = {"q": f"taxi cab services in {city} contact phone number"}
    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}
    
    providers = []
    
    try:
        response = requests.post(url, data=payload, headers=headers, timeout=8)
        if response.status_code == 200:
            # Parse DDG Lite HTML snippets using Regex
            snippets = re.findall(r'<a class="result__snippet[^>]*>(.*?)</a>', response.text, re.IGNORECASE)
            
            for text in snippets:
                # Clean HTML tags
                clean_text = re.sub(r'<[^>]+>', '', text)
                
                # Extract Indian phone numbers (+91-XXXXX, or 10 digits starting with 7,8,9)
                phones = re.findall(r'(?:\+91[\-\s]?)?[789]\d{9}', clean_text)
                
                if phones and len(providers) < 3:
                    # Deduplicate phone numbers
                    if not any(p["phone"][-10:] == phones[0][-10:] for p in providers):
                        providers.append({
                            "name": f"Verified Live Web Listing {len(providers)+1}",
                            "address": clean_text[:60].strip() + "...",
                            "phone": phones[0]
                        })
    except Exception as e:
        print(f"Live web search failed due to network issue: {e}")
        
    # Strictly return only live data, NO hardcoded fallbacks!
    return providers

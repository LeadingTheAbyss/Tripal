from playwright.sync_api import sync_playwright
from bs4 import BeautifulSoup
import re
from typing import List, Dict
from datetime import datetime, timedelta

def parse_duration(duration_str: str) -> float:
    """Parses duration like '2 hr 15 min' into hours (float)."""
    hours = 0
    minutes = 0
    hr_match = re.search(r'(\d+)\s*hr', duration_str)
    min_match = re.search(r'(\d+)\s*min', duration_str)
    
    if hr_match:
        hours = int(hr_match.group(1))
    if min_match:
        minutes = int(min_match.group(1))
        
    return hours + (minutes / 60.0)

def scrape_flights(origin_iata: str, dest_iata: str, date_str: str) -> List[Dict]:
    """
    Scrapes Google Flights for the given origin, destination, and date.
    Returns a list of dictionaries with flight data.
    """
    print(f"\n[Scraper] Initializing Playwright scraper for {origin_iata} -> {dest_iata} on {date_str}")
    
    url = f"https://www.google.com/travel/flights?q=Flights%20to%20{dest_iata}%20from%20{origin_iata}%20on%20{date_str}"
    
    results = []
    
    try:
        with sync_playwright() as p:
            # Launch in headless mode
            browser = p.chromium.launch(headless=True)
            page = browser.new_page(
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            )
            
            print(f"[Scraper] Navigating to URL: {url}")
            page.goto(url, wait_until="networkidle", timeout=20000)
            
            # Wait for flight results list to load. 
            # Google flights results usually have the role="listitem"
            try:
                page.wait_for_selector('li[role="listitem"]', timeout=10000)
            except Exception as e:
                print("[Scraper Warning] Could not find flight list items. Page might not have loaded correctly or we got blocked.")
                browser.close()
                return results

            # Get the page source and parse with BeautifulSoup
            html = page.content()
            soup = BeautifulSoup(html, 'html.parser')
            
            # Find all flight cards
            flight_items = soup.find_all('li', role='listitem')
            
            for item in flight_items:
                # We need to extract: Departure, Arrival, Airline, Price, Duration
                text_content = item.get_text(separator='|', strip=True)
                
                # A naive approach to parse the text since Google's classes change
                # Usually text is like: "10:45 AM|–|12:00 PM|IndiGo|1 hr 15 min|Non-stop|₹4,500"
                
                parts = [p.strip() for p in text_content.split('|')]
                
                try:
                    # Look for price
                    price_str = next((p for p in parts if '₹' in p or 'INR' in p or '$' in p), "0")
                    price = float(re.sub(r'[^\d.]', '', price_str))
                    if price == 0:
                        continue # Skip items without price (like headers)
                        
                    # Look for duration
                    duration_str = next((p for p in parts if 'hr' in p and 'min' in p), "")
                    duration_hours = parse_duration(duration_str) if duration_str else 2.0
                    
                    # Heuristics to find airline and times
                    # Usually time is the first 3 parts if there is a '–' (dash)
                    # e.g., ['10:45 AM', '–', '12:00 PM', 'IndiGo']
                    if len(parts) >= 4:
                        dep_time_str = parts[0]
                        arr_time_str = parts[2]
                        airline = parts[3]
                        
                        # Sometimes airline is the second item if there's no dash
                        if '–' not in parts:
                           pass # Needs better heuristic, but this works for standard layout
                           
                        results.append({
                            "airline": airline,
                            "flight_number": "", # Google flights usually doesn't show flight number directly in the top card
                            "dep_time": dep_time_str,
                            "arr_time": arr_time_str,
                            "price": price,
                            "duration_hours": duration_hours
                        })
                except Exception as ex:
                    print(f"[Scraper] Failed to parse item: {ex}")
                    continue
            
            browser.close()
            
    except Exception as e:
        print(f"[Scraper Error] Playwright execution failed: {e}")
        
    print(f"[Scraper] Successfully extracted {len(results)} flights.")
    return results

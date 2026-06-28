from services.live_flights_api import search_live_flights

flights = search_live_flights("BOM", "DEL", "2026-07-12")
for f in flights:
    print(f"[{f.provider}] {f.departure.strftime('%H:%M')} -> {f.arrival.strftime('%H:%M')} | {f.duration_hours}h | INR {f.price}")
print(f"Total flights found: {len(flights)}")

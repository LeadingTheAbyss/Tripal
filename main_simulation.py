from datetime import datetime
from models.entities import Passenger
from models.state import TripState
from services.geo_service import geo_lookup
from services.weather_service import get_weather
from engines.ranking_engine import rank_transport, rank_places, rank_hotels
from engines.optimizer import generate_itinerary, move_place
from services.live_places_api import fetch_live_bonus_places

def run_simulation():
    print("--- 🚀 BUDGETED TRAVEL SIMULATION (PRO) ---")

    # 1. Identity & Setup
    p1 = Passenger(id="1", name="Apoorv", age=25, gender="M", pincode="110001")
    p2 = Passenger(id="2", name="Mom", age=65, gender="F", pincode="110001", mobility_constraints=True)
    p1.city = geo_lookup(p1.pincode)

    trip = TripState(
        trip_id="TRP1", mode="direct", passengers=[p1, p2],
        source_city=p1.city, destination_city="Goa",
        start_date=datetime(2026, 7, 10), end_date=datetime(2026, 7, 13), # July is rainy
        total_budget=80000
    )

    print(f"\n[1] Trip Created: {trip.source_city} -> {trip.destination_city}. \n💰 Initial Budget: ₹{trip.remaining_budget}")

    # 2. Weather Engine
    weather = get_weather(trip.destination_city, trip.start_date)
    print(f"\n[2] Weather Forecast: {weather.value}")

    # 3. Transport Engine (Notices elderly passenger, avoids bus)
    transports = rank_transport(trip.source_city, trip.destination_city, trip.start_date, trip.passengers)
    t_sel = transports[0]
    trip.transport_spend += t_sel.price * len(trip.passengers)
    print(f"\n[3] Selected Transport: {t_sel.type.value} (Safety: {t_sel.safety_score}). \n💰 Remaining Budget: ₹{trip.remaining_budget}")

    # 4. Hotel Engine (Using Live API)
    hotels = rank_hotels(trip.destination_city, trip)
    h_sel = hotels[0]
    trip.hotel_spend += h_sel.price_per_night * trip.days
    print(f"\n[4] Selected Hotel: {h_sel.name} (Rating: {h_sel.rating}). \n💰 Remaining Budget: ₹{trip.remaining_budget}")

    # 5. Place Engine (Weather & Safety Filters out Dudhsagar & Tito's)
    places = rank_places(trip.destination_city, trip, weather)
    selected_places = places[:3] # Pick top matches
    trip.activity_spend += sum(p.entry_fee for p in selected_places)
    print(f"\n[5] Selected Places: {[p.name for p in selected_places]}. \n💰 Remaining Budget: ₹{trip.remaining_budget}")

    # 6. Smart Itinerary
    generate_itinerary(trip, selected_places)
    print("\n[6] --- 📅 SMART ITINERARY ---")
    for day in trip.itinerary:
        print(f"Day {day.day_number}:")
        print(f"  Active Time: {day.total_active_time}h | Travel Time: {day.total_travel_time:.1f}h")
        for p in day.places:
            print(f"  - {p.name} (Entry: ₹{p.entry_fee}, Stay: {p.visit_duration_hours}h)")

    # 7. Drag-Drop Override Simulation
    print("\n[7] --- 🔄 TESTING MANUAL OVERRIDE ---")
    move_place(trip, selected_places[0].id, from_day=1, to_day=2)
    print(f"Day 1 Active Time: {trip.itinerary[0].total_active_time}h")
    print(f"Day 2 Active Time: {trip.itinerary[1].total_active_time}h")

    # 8. Bonus Recommendations
    print("\n[8] --- 🎁 BONUS RECOMMENDATIONS (LIVE) ---")
    if trip.remaining_budget > 0:
        bonus_places = fetch_live_bonus_places(trip.destination_city, trip.remaining_budget)
        if bonus_places:
            print(f"\nYou have ₹{trip.remaining_budget} left! Here are real extra attractions you can easily afford:")
            for p in bonus_places[:5]: # Limit to top 5
                print(f"  - {p.name} (Entry Cost: ₹{p.entry_fee}, Needs {p.visit_duration_hours}h)")
        else:
            print("No extra places found within the remaining budget.")
    else:
        print("Budget is completely exhausted. No bonus places available.")


if __name__ == "__main__":
    run_simulation()

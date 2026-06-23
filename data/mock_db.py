from models.entities import Place, Hotel
from models.enums import CrowdLevel, Weather

MOCK_PLACES_DB = {
    "Goa": [
        Place(id="g1", name="Baga Beach", category="Beach", coordinates=(15.55, 73.75), entry_fee=0, visit_duration_hours=3.0, safe_hours=(6, 18), crowd_estimate=CrowdLevel.HIGH, family_friendly=True, safety_score_base=8, weather_sensitive=True, bad_weather_types=[Weather.RAINY]),
        Place(id="g2", name="Aguada Fort", category="History", coordinates=(15.49, 73.77), entry_fee=200, visit_duration_hours=2.0, safe_hours=(9, 17), crowd_estimate=CrowdLevel.MEDIUM, family_friendly=True, safety_score_base=9, weather_sensitive=False),
        Place(id="g3", name="Tito's Lane", category="Nightlife", coordinates=(15.55, 73.75), entry_fee=1500, visit_duration_hours=4.0, safe_hours=(18, 2), crowd_estimate=CrowdLevel.HIGH, family_friendly=False, safety_score_base=6, weather_sensitive=False),
        Place(id="g4", name="Dudhsagar Falls", category="Nature", coordinates=(15.31, 74.31), entry_fee=400, visit_duration_hours=5.0, safe_hours=(8, 15), crowd_estimate=CrowdLevel.MEDIUM, family_friendly=False, safety_score_base=7, weather_sensitive=True, bad_weather_types=[Weather.RAINY]),
    ]
}

MOCK_HOTEL_DB = {
    "Goa": [
        Hotel(id="h1", name="Taj Exotica", coordinates=(15.22, 73.94), price_per_night=12000, comfort_score=10, safety_score=10, rating=4.9),
        Hotel(id="h2", name="Seaside Inn", coordinates=(15.54, 73.76), price_per_night=3000, comfort_score=7, safety_score=8, rating=4.1),
        Hotel(id="h3", name="Backpacker Hostel", coordinates=(15.56, 73.74), price_per_night=800, comfort_score=4, safety_score=6, rating=3.8)
    ]
}

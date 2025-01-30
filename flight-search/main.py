from typing import Union
from fast_flights import FlightData, Passengers, Result, get_flights
from fastapi import FastAPI

app = FastAPI()

@app.get("/flights")
def search_flights(
    date: str,
    from_airport: str,
    to_airport: str,
    trip: str,
    seat: str,
    adults: int = 0,
    children: int = 0,
    infants_in_seat: int = 0,
    infants_on_lap: int = 0,
    max_stops: Union[int, None] = None
):
    flight_data = FlightData(
        date=date,
        from_airport=from_airport,
        to_airport=to_airport,
        max_stops=max_stops
    )
    
    passengers = Passengers(
        adults=adults,
        children=children, 
        infants_in_seat=infants_in_seat,
        infants_on_lap=infants_on_lap
    )

    result: Result = get_flights(
        flight_data=[flight_data],
        trip=trip,
        seat=seat,
        passengers=passengers,
        fetch_mode="fallback",
    )
    return result
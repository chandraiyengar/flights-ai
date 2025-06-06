from typing import Union
from fast_flights import FlightData, Passengers, Result, get_flights, search_airport
from fastapi import FastAPI, HTTPException
import logging

logger = logging.getLogger("uvicorn")

app = FastAPI()

@app.get("/airports")
def get_airports(location: str):
    return search_airport(location)

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
    logger.info(f"Searching for flights on {date} from {from_airport} to {to_airport} with {adults} adults, {children} children, {infants_in_seat} infants in seat, {infants_on_lap} infants on lap, and {max_stops} max stops")
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
    try:
        result: Result = get_flights(
            flight_data=[flight_data],
            trip=trip,
            seat=seat,
            passengers=passengers,
            fetch_mode="fallback",
        )
    except Exception as e:
        logger.error(e)
        raise HTTPException(status_code=500, detail="Error fetching flights")

    return result
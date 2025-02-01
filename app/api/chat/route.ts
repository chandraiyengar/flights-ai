import { anthropic } from '@ai-sdk/anthropic';
import { streamText, tool } from 'ai';
import { z } from 'zod';

const SearchFlightsParams = z.object({
  date: z.string().describe('Flight date in YYYY-MM-DD format'),
  fromAirport: z.string().describe('Departure airport code (e.g. "LAX")'),
  toAirport: z.string().describe('Arrival airport code (e.g. "JFK")'),
  trip: z.enum(['one-way', 'round']).default('one-way').describe('Trip type: one-way or round'),
  seat: z.enum(['economy', 'business', 'first']).default('economy').describe('Seat class preference'),
  adults: z.number().min(0).default(1).describe('Number of adult passengers'),
  children: z.number().min(0).default(0).optional().describe('Number of child passengers'),
  infantsInSeat: z.number().min(0).default(0).optional().describe('Number of infants requiring their own seat'),
  infantsOnLap: z.number().min(0).default(0).optional().describe('Number of lap infants'),
  maxStops: z.number().min(0).default(0).optional().describe('Maximum number of stops allowed')
});

type SearchFlightsParams = z.infer<typeof SearchFlightsParams>;

export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = streamText({
    model: anthropic('claude-3-5-sonnet-20241022'),
    system: 'You are a helpful assistant that can search for flights and provide information about them.' + 
    'If someone asks for information about a flight and there are multiple options, ' + 
    'you should provide a list of the options and ask the user to select one.' + 
    'Disregard any is_best information you receive from the searchFlights tool.' +
    'Assume the user is asking for flights in the year 2025 if no year is specified.' +
    'If the user doesn\'t specify what format they want the answer, ' +
    'give them a summary of the flights, as one piece of text.' +
    'For each flight, you should say the time it is leaving and the price.' +
    'If there are more than 4 flights, just say the range of prices and times.' +
    'Do not give a list of more than 4 flights!' +
    'If there are flights from different airports, make sure to mention which airports they are from.',
    messages,
    tools: {
      weather: tool({
        description: 'Get the weather in a location (fahrenheit)',
        parameters: z.object({
          location: z.string().describe('The location to get the weather for'),
        }),
        execute: async ({ location }) => {
          const temperature = Math.round(Math.random() * (90 - 32) + 32);
          return {
            location,
            temperature,
          };
        },
      }),
      searchFlights: tool({
        description: 'Search for available flights between airports',
        parameters: SearchFlightsParams,
        execute: (searchFlightParams) => searchFlights(searchFlightParams),
      }),
      findPlaceCode: tool({
        description: 'Find the place code for a location which has more than one airport.',
        parameters: z.object({
          location: z.string().describe('The location to find the place code for'),
        }),
        execute: async ({ location }) => {
          const params = new URLSearchParams({
            query: location,
            key: process.env.GOOGLE_API_KEY || '',
            limit: '1',
            types: 'Place'
          });

          const response = await fetch(
            `https://kgsearch.googleapis.com/v1/entities:search?${params}`
          );

          if (!response.ok) {
            throw new Error('Failed to fetch place data');
          }

          const data = await response.json();
          const result = data.itemListElement[0]?.result;

          if (!result) {
            throw new Error('No results found');
          }
          return {
            placeCode: result['@id'].slice(3),
          };
        },
      }),
    },
    maxSteps: 10,
  });

  return result.toDataStreamResponse();
}

const searchFlights = async ({ 
  date, 
  fromAirport, 
  toAirport, 
  trip = 'one-way', 
  seat = 'economy', 
  adults = 1, 
  children = 0, 
  infantsInSeat = 0, 
  infantsOnLap = 0,
  maxStops = 0
}: SearchFlightsParams) => {
  const url = `http://localhost:8000/flights?` + new URLSearchParams({
    date,
    from_airport: fromAirport,
    to_airport: toAirport,
    trip,
    seat,
    adults: adults.toString(),
    children: children.toString(),
    infants_in_seat: infantsInSeat.toString(),
    infants_on_lap: infantsOnLap.toString(),
    max_stops: maxStops.toString()
  })
  console.log("Calling flight search API");
  console.log("URL: ", url);
  
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error('Failed to fetch flight data');
  }

  console.log("Response: ", response);
  const data = await response.json();
  const firstTenFlights = data.flights.slice(0, 10);

  return firstTenFlights;
};

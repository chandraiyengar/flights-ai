import { openai } from '@ai-sdk/openai';
import { streamText, tool } from 'ai';
import { z } from 'zod';

export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = streamText({
    model: openai('gpt-4o'),
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
        parameters: z.object({
          date: z.string().describe('Flight date in YYYY-MM-DD format'),
          fromAirport: z.string().describe('Departure airport code (e.g. "LAX")'),
          toAirport: z.string().describe('Arrival airport code (e.g. "JFK")'),
          trip: z.enum(['one-way', 'round']).describe('Trip type: one-way or round'),
          seat: z.enum(['economy', 'business', 'first']).describe('Seat class preference'),
          adults: z.number().min(0).optional().describe('Number of adult passengers'),
          children: z.number().min(0).optional().describe('Number of child passengers'),
          infantsInSeat: z.number().min(0).optional().describe('Number of infants requiring their own seat'),
          infantsOnLap: z.number().min(0).optional().describe('Number of lap infants'),
          maxStops: z.number().min(0).optional().describe('Maximum number of stops allowed')
        }),
        execute: async ({ 
          date, 
          fromAirport, 
          toAirport, 
          trip, 
          seat, 
          adults = 1, 
          children = 0, 
          infantsInSeat = 0, 
          infantsOnLap = 0,
          maxStops
        }) => {
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
            ...(maxStops !== undefined && { max_stops: maxStops.toString() })
          })
          console.log("Calling flight search API");
          console.log("URL: ", url);
          
          const response = await fetch(url);

          if (!response.ok) {
            throw new Error('Failed to fetch flight data');
          }

          console.log("Response: ", response);

          return await response.json();
        },
      }),
    },
  });

  return result.toDataStreamResponse();
}
import { NextRequest, NextResponse } from 'next/server'
import { searchFlights } from '@/lib/serpapi-client'
import { getLocationByDestination, saveSearchResults } from '@/lib/supabase/locations'

export async function POST(request: NextRequest) {
  try {
    const {
      retreatId,
      destination,
      outboundDate,
      returnDate,
      departureAirportCode,
    } = await request.json()

    if (!retreatId || !destination || !outboundDate || !returnDate) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      )
    }

    // Get location mapping
    const location = await getLocationByDestination(destination)
    if (!location?.airportCode) {
      return NextResponse.json(
        { error: `Could not find airport for: ${destination}` },
        { status: 400 }
      )
    }

    // Use provided departure or default to common hub
    const departure = departureAirportCode || 'JFK'

    // Search flights
    const flights = await searchFlights(
      departure,
      location.airportCode,
      outboundDate,
      returnDate
    )

    // Cache results
    await saveSearchResults(retreatId, 'flight', flights)

    return NextResponse.json({ flights })
  } catch (error) {
    console.error('Flight search error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Flight search failed' },
      { status: 500 }
    )
  }
}

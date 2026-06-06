import { NextRequest, NextResponse } from 'next/server'
import { searchFlights } from '@/lib/serpapi-client'
import { getDestination } from '@/lib/destinations'

export async function POST(request: NextRequest) {
  try {
    const { retreatId, destination, outboundDate, returnDate, departureAirportCode } =
      await request.json()

    if (!retreatId || !destination || !outboundDate || !returnDate) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
    }

    const dest = getDestination(destination)
    if (!dest) {
      return NextResponse.json({ error: `Unknown destination: ${destination}` }, { status: 400 })
    }

    const result = await searchFlights(
      departureAirportCode || 'JFK',
      dest.iataCode,
      outboundDate.split('T')[0],
      returnDate.split('T')[0]
    )

    return NextResponse.json(result)
  } catch (error) {
    console.error('Flight search error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Flight search failed' },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { searchHotels } from '@/lib/serpapi-client'
import { getDestination } from '@/lib/destinations'

export async function POST(request: NextRequest) {
  try {
    const { retreatId, destination, checkInDate, checkOutDate, numberOfAdult } =
      await request.json()

    if (!retreatId || !destination || !checkInDate || !checkOutDate || !numberOfAdult) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
    }

    const dest = getDestination(destination)
    const searchQuery = dest ? dest.label : destination

    // SerpAPI requires YYYY-MM-DD — strip any time component
    const checkIn  = checkInDate.split('T')[0]
    const checkOut = checkOutDate.split('T')[0]

    const properties = await searchHotels(searchQuery, checkIn, checkOut, numberOfAdult)

    return NextResponse.json({ hotels: properties })
  } catch (error) {
    console.error('Hotel search error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Hotel search failed' },
      { status: 500 }
    )
  }
}

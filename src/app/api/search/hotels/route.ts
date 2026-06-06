import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { searchHotels, buildCitySearchRequest } from '@/lib/agoda-client'
import { getLocationByDestination } from '@/lib/supabase/locations'

export async function POST(request: NextRequest) {
  try {
    const { retreatId, destination, checkInDate, checkOutDate, numberOfAdult, maxDailyRate } =
      await request.json()

    if (!retreatId || !destination || !checkInDate || !checkOutDate || !numberOfAdult) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      )
    }

    // Get location mapping
    const location = await getLocationByDestination(destination)
    if (!location?.cityId) {
      return NextResponse.json(
        { error: `Could not find destination: ${destination}` },
        { status: 400 }
      )
    }

    // Build Agoda request
    const agodaRequest = buildCitySearchRequest(
      location.cityId,
      checkInDate,
      checkOutDate,
      numberOfAdult,
      maxDailyRate
    )

    // Search hotels
    const hotels = await searchHotels(agodaRequest)

    return NextResponse.json({ hotels })
  } catch (error) {
    console.error('Hotel search error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Hotel search failed' },
      { status: 500 }
    )
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { getLocationByDestination } from '@/lib/supabase/locations'

export async function GET(request: NextRequest) {
  try {
    const destination = request.nextUrl.searchParams.get('destination')

    if (!destination) {
      return NextResponse.json(
        { error: 'Missing destination parameter' },
        { status: 400 }
      )
    }

    const location = await getLocationByDestination(destination)

    if (!location) {
      return NextResponse.json(
        { error: `Could not find destination: ${destination}` },
        { status: 404 }
      )
    }

    return NextResponse.json(location)
  } catch (error) {
    console.error('Location resolution error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Location resolution failed' },
      { status: 500 }
    )
  }
}

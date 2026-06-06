interface FlightLeg {
  departure_airport: { name: string; id: string; time: string }
  arrival_airport: { name: string; id: string; time: string }
  duration: number
  airplane: string
  airline: string
  airline_logo: string
  travel_class: string
  flight_number: string
  legroom: string
  extensions: string[]
}

export interface FlightOption {
  flights: FlightLeg[]
  layovers?: Array<{ duration: number; name: string; id: string }>
  total_duration: number
  carbon_emissions: {
    this_flight: number
    typical_for_this_route: number
    difference_percent: number
  }
  price: number
  type: string
  airline_logo: string
  departure_token: string
}

export interface FlightSearchResult {
  best_flights: FlightOption[]
  other_flights: FlightOption[]
  price_insights?: {
    lowest_price: number
    price_level: string
    typical_price_range: [number, number]
  }
}

interface SerpAPIResponse extends FlightSearchResult {
  error?: string
}

export interface HotelProperty {
  name: string
  overall_rating: number
  reviews: number
  rate_per_night: { extracted_lowest: number }
  total_rate: { extracted_lowest: number }
  images: Array<{ thumbnail: string }>
  amenities: string[]
  property_token: string
  type: string
}

export async function searchHotels(
  destination: string,
  checkInDate: string,
  checkOutDate: string,
  adults: number
): Promise<HotelProperty[]> {
  const apiKey = process.env.SERPAPI_KEY
  if (!apiKey) throw new Error('Missing SerpAPI key')

  const params = new URLSearchParams({
    engine: 'google_hotels',
    q: `Hotels in ${destination}`,
    check_in_date: checkInDate,
    check_out_date: checkOutDate,
    adults: String(adults),
    currency: 'USD',
    hl: 'en',
    api_key: apiKey,
  })

  const response = await fetch(`https://serpapi.com/search?${params}`)
  const data = await response.json()
  if (!response.ok || data.error) {
    throw new Error(data.error ?? `Hotel search failed (${response.status})`)
  }

  return data.properties ?? []
}

export async function searchFlights(
  departureId: string,
  arrivalId: string,
  outboundDate: string,
  returnDate: string
): Promise<FlightSearchResult> {
  const apiKey = process.env.SERPAPI_KEY

  if (!apiKey) {
    throw new Error('Missing SerpAPI key')
  }

  const params = new URLSearchParams({
    engine: 'google_flights',
    departure_id: departureId,
    arrival_id: arrivalId,
    outbound_date: outboundDate,
    return_date: returnDate,
    hl: 'en',
    currency: 'USD',
    api_key: apiKey,
  })

  const response = await fetch(`https://serpapi.com/search?${params}`)

  if (!response.ok) {
    throw new Error(`SerpAPI error: ${response.statusText}`)
  }

  const data: SerpAPIResponse = await response.json()

  if (data.error) {
    throw new Error(`SerpAPI error: ${data.error}`)
  }

  return {
    best_flights: data.best_flights ?? [],
    other_flights: data.other_flights ?? [],
    price_insights: data.price_insights,
  }
}

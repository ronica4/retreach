export interface SerpAPIFlightResponse {
  best_flights?: Array<{
    departure_airport: {
      name: string
      time: string
    }
    arrival_airport: {
      name: string
      time: string
    }
    duration: number
    price: number
    airline: string
    flight_number: string
    link: string
  }>
  error?: string
}

export async function searchFlights(
  departureId: string,
  arrivalId: string,
  outboundDate: string,
  returnDate: string
): Promise<SerpAPIFlightResponse['best_flights'] | []> {
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
    api_key: apiKey,
  })

  const response = await fetch(`https://serpapi.com/search?${params}`, {
    headers: {
      'Accept-Encoding': 'gzip,deflate',
    },
  })

  if (!response.ok) {
    throw new Error(`SerpAPI error: ${response.statusText}`)
  }

  const data: SerpAPIFlightResponse = await response.json()

  if (data.error) {
    throw new Error(`SerpAPI error: ${data.error}`)
  }

  return data.best_flights || []
}

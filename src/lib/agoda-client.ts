interface AgodaRequest {
  criteria: {
    checkInDate: string
    checkOutDate: string
    cityId?: number
    hotelId?: number[]
    additional: {
      currency: string
      language: string
      occupancy: {
        numberOfAdult: number
        numberOfChildren?: number
      }
      dailyRate?: {
        minimum?: number
        maximum?: number
      }
      maxResult?: number
      sortBy?: string
      minimumStarRating?: number
      minimumReviewScore?: number
    }
  }
}

export async function searchHotels(request: AgodaRequest) {
  const siteid = process.env.AGODA_SITEID
  const apikey = process.env.AGODA_APIKEY

  if (!siteid || !apikey) {
    throw new Error('Missing Agoda credentials')
  }

  const response = await fetch('http://affiliateapi7643.agoda.com/affiliateservice/lt_v1', {
    method: 'POST',
    headers: {
      'Authorization': `${siteid}:${apikey}`,
      'Accept-Encoding': 'gzip,deflate',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  })

  if (!response.ok) {
    throw new Error(`Agoda API error: ${response.statusText}`)
  }

  const data = await response.json()

  if (data.error) {
    throw new Error(`Agoda error: ${data.error.message}`)
  }

  return data.results || []
}

export function buildCitySearchRequest(
  cityId: number,
  checkInDate: string,
  checkOutDate: string,
  numberOfAdult: number,
  maxDailyRate?: number
): AgodaRequest {
  return {
    criteria: {
      checkInDate,
      checkOutDate,
      cityId,
      additional: {
        currency: 'USD',
        language: 'en-us',
        occupancy: {
          numberOfAdult,
          numberOfChildren: 0,
        },
        dailyRate: {
          minimum: 0,
          maximum: maxDailyRate || 10000,
        },
        maxResult: 20,
        sortBy: 'PriceAsc',
        minimumStarRating: 0,
        minimumReviewScore: 0,
      },
    },
  }
}

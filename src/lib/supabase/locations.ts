import { createClient } from './client'

export async function getAgodaCityId(destination: string) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('agoda_city_ids')
    .select('agoda_city_id, iata_code:city')
    .ilike('city_name', `%${destination}%`)
    .limit(1)
    .single()

  if (error) return null
  return data?.agoda_city_id
}

export async function getAirportCode(city: string) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('flight_airport_codes')
    .select('iata_code')
    .ilike('city', `%${city}%`)
    .limit(1)
    .single()

  if (error) return null
  return data?.iata_code
}

export async function getLocationByDestination(destination: string) {
  const supabase = createClient()

  const { data: cityData } = await supabase
    .from('agoda_city_ids')
    .select('city_name, agoda_city_id')
    .ilike('city_name', `%${destination}%`)
    .limit(1)
    .single()

  if (!cityData) return null

  // Extract just the city name (before the comma) for airport lookup
  const cityNameOnly = cityData.city_name.split(',')[0].trim()

  const { data: airportData } = await supabase
    .from('flight_airport_codes')
    .select('iata_code')
    .ilike('city', `%${cityNameOnly}%`)
    .limit(1)
    .single()

  return {
    cityId: cityData.agoda_city_id,
    airportCode: airportData?.iata_code,
  }
}

export async function saveSearchResults(
  retreatId: string,
  searchType: 'hotel' | 'flight',
  results: any
) {
  const supabase = createClient()

  const { error } = await supabase
    .from('vendor_search_results')
    .insert({
      retreat_id: retreatId,
      search_type: searchType,
      api_response_json: results,
    })

  if (error) throw error
}

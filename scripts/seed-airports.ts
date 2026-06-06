import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Major international airports with IATA codes
const airports = [
  { iata_code: 'BKK', airport_name: 'Suvarnabhumi Airport', city: 'Bangkok', country: 'Thailand', latitude: 13.6923, longitude: 100.7501 },
  { iata_code: 'NRT', airport_name: 'Narita International Airport', city: 'Tokyo', country: 'Japan', latitude: 35.7647, longitude: 140.3863 },
  { iata_code: 'HND', airport_name: 'Haneda Airport', city: 'Tokyo', country: 'Japan', latitude: 35.5494, longitude: 139.7798 },
  { iata_code: 'JFK', airport_name: 'John F Kennedy International', city: 'New York', country: 'United States', latitude: 40.6413, longitude: -73.7781 },
  { iata_code: 'LHR', airport_name: 'London Heathrow', city: 'London', country: 'United Kingdom', latitude: 51.4700, longitude: -0.4543 },
  { iata_code: 'CDG', airport_name: 'Paris Charles de Gaulle', city: 'Paris', country: 'France', latitude: 49.0097, longitude: 2.5479 },
  { iata_code: 'DXB', airport_name: 'Dubai International', city: 'Dubai', country: 'United Arab Emirates', latitude: 25.2528, longitude: 55.3643 },
  { iata_code: 'SIN', airport_name: 'Singapore Changi', city: 'Singapore', country: 'Singapore', latitude: 1.3592, longitude: 103.9851 },
  { iata_code: 'BCN', airport_name: 'Barcelona-El Prat', city: 'Barcelona', country: 'Spain', latitude: 41.2974, longitude: 2.0833 },
  { iata_code: 'AMS', airport_name: 'Amsterdam Airport Schiphol', city: 'Amsterdam', country: 'Netherlands', latitude: 52.3086, longitude: 4.7639 },
  { iata_code: 'FCO', airport_name: 'Rome Fiumicino', city: 'Rome', country: 'Italy', latitude: 41.8002, longitude: 12.2388 },
  { iata_code: 'TXL', airport_name: 'Berlin Tegel', city: 'Berlin', country: 'Germany', latitude: 52.5597, longitude: 13.2877 },
  { iata_code: 'IST', airport_name: 'Istanbul International', city: 'Istanbul', country: 'Turkey', latitude: 41.2619, longitude: 28.7278 },
  { iata_code: 'LAX', airport_name: 'Los Angeles International', city: 'Los Angeles', country: 'United States', latitude: 33.9425, longitude: -118.4081 },
  { iata_code: 'SFO', airport_name: 'San Francisco International', city: 'San Francisco', country: 'United States', latitude: 37.6213, longitude: -122.3790 },
  { iata_code: 'MIA', airport_name: 'Miami International', city: 'Miami', country: 'United States', latitude: 25.7959, longitude: -80.2870 },
  { iata_code: 'LAS', airport_name: 'Harry Reid International', city: 'Las Vegas', country: 'United States', latitude: 36.0840, longitude: -115.1537 },
  { iata_code: 'DPS', airport_name: 'Ngurah Rai', city: 'Bali', country: 'Indonesia', latitude: -8.7674, longitude: 115.1671 },
  { iata_code: 'HKT', airport_name: 'Phuket International', city: 'Phuket', country: 'Thailand', latitude: 8.1136, longitude: 98.3071 },
  { iata_code: 'SGN', airport_name: 'Tan Son Nhat', city: 'Ho Chi Minh City', country: 'Vietnam', latitude: 10.8180, longitude: 106.6522 },
  { iata_code: 'HAN', airport_name: 'Noi Bai', city: 'Hanoi', country: 'Vietnam', latitude: 21.2213, longitude: 105.8045 },
  { iata_code: 'ICN', airport_name: 'Incheon International', city: 'Seoul', country: 'South Korea', latitude: 37.4602, longitude: 126.4407 },
  { iata_code: 'HKG', airport_name: 'Hong Kong International', city: 'Hong Kong', country: 'Hong Kong', latitude: 22.3080, longitude: 113.9185 },
  { iata_code: 'SYD', airport_name: 'Sydney Kingsford Smith', city: 'Sydney', country: 'Australia', latitude: -33.9461, longitude: 151.1772 },
  { iata_code: 'MEL', airport_name: 'Melbourne Tullamarine', city: 'Melbourne', country: 'Australia', latitude: -37.6733, longitude: 144.8433 },
  { iata_code: 'YYZ', airport_name: 'Toronto Pearson', city: 'Toronto', country: 'Canada', latitude: 43.6777, longitude: -79.6248 },
  { iata_code: 'YVR', airport_name: 'Vancouver International', city: 'Vancouver', country: 'Canada', latitude: 49.1959, longitude: -123.1794 },
  { iata_code: 'MEX', airport_name: 'Mexico City International', city: 'Mexico City', country: 'Mexico', latitude: 19.4363, longitude: -99.0720 },
  { iata_code: 'CUN', airport_name: 'Cancun International', city: 'Cancun', country: 'Mexico', latitude: 21.0087, longitude: -86.8760 },
  { iata_code: 'GIG', airport_name: 'Rio de Janeiro Galeão', city: 'Rio de Janeiro', country: 'Brazil', latitude: -22.8122, longitude: -43.2506 },
  { iata_code: 'GRU', airport_name: 'São Paulo Guarulhos', city: 'São Paulo', country: 'Brazil', latitude: -23.4356, longitude: -46.4731 },
]

async function seed() {
  try {
    console.log('🌱 Seeding airport codes...')
    const { error } = await supabase.from('flight_airport_codes').insert(airports)

    if (error) {
      console.error('Error seeding:', error)
      process.exit(1)
    }

    console.log(`✅ Successfully seeded ${airports.length} airports`)
  } catch (err) {
    console.error('Unexpected error:', err)
    process.exit(1)
  }
}

seed()

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Popular cities with Agoda city IDs
const cities = [
  { city_name: 'Bangkok, Thailand', country: 'Thailand', agoda_city_id: 9395, latitude: 13.7563, longitude: 100.5018 },
  { city_name: 'Tokyo, Japan', country: 'Japan', agoda_city_id: 25378, latitude: 35.6762, longitude: 139.6503 },
  { city_name: 'New York, USA', country: 'United States', agoda_city_id: 28865, latitude: 40.7128, longitude: -74.0060 },
  { city_name: 'London, United Kingdom', country: 'United Kingdom', agoda_city_id: 27234, latitude: 51.5074, longitude: -0.1278 },
  { city_name: 'Paris, France', country: 'France', agoda_city_id: 27266, latitude: 48.8566, longitude: 2.3522 },
  { city_name: 'Dubai, United Arab Emirates', country: 'United Arab Emirates', agoda_city_id: 26018, latitude: 25.2048, longitude: 55.2708 },
  { city_name: 'Singapore', country: 'Singapore', agoda_city_id: 29405, latitude: 1.3521, longitude: 103.8198 },
  { city_name: 'Barcelona, Spain', country: 'Spain', agoda_city_id: 26881, latitude: 41.3851, longitude: 2.1734 },
  { city_name: 'Amsterdam, Netherlands', country: 'Netherlands', agoda_city_id: 27031, latitude: 52.3676, longitude: 4.9041 },
  { city_name: 'Rome, Italy', country: 'Italy', agoda_city_id: 27246, latitude: 41.9028, longitude: 12.4964 },
  { city_name: 'Berlin, Germany', country: 'Germany', agoda_city_id: 27140, latitude: 52.5200, longitude: 13.4050 },
  { city_name: 'Istanbul, Turkey', country: 'Turkey', agoda_city_id: 26924, latitude: 41.0082, longitude: 28.9784 },
  { city_name: 'Los Angeles, USA', country: 'United States', agoda_city_id: 28866, latitude: 34.0522, longitude: -118.2437 },
  { city_name: 'San Francisco, USA', country: 'United States', agoda_city_id: 28867, latitude: 37.7749, longitude: -122.4194 },
  { city_name: 'Miami, USA', country: 'United States', agoda_city_id: 28868, latitude: 25.7617, longitude: -80.1918 },
  { city_name: 'Las Vegas, USA', country: 'United States', agoda_city_id: 28869, latitude: 36.1699, longitude: -115.1398 },
  { city_name: 'Bali, Indonesia', country: 'Indonesia', agoda_city_id: 24928, latitude: -8.6705, longitude: 115.2126 },
  { city_name: 'Phuket, Thailand', country: 'Thailand', agoda_city_id: 29423, latitude: 8.1079, longitude: 98.3019 },
  { city_name: 'Ho Chi Minh City, Vietnam', country: 'Vietnam', agoda_city_id: 26550, latitude: 10.7769, longitude: 106.7009 },
  { city_name: 'Hanoi, Vietnam', country: 'Vietnam', agoda_city_id: 26541, latitude: 21.0285, longitude: 105.8542 },
  { city_name: 'Seoul, South Korea', country: 'South Korea', agoda_city_id: 28265, latitude: 37.5665, longitude: 126.9780 },
  { city_name: 'Hong Kong', country: 'Hong Kong', agoda_city_id: 25432, latitude: 22.3193, longitude: 114.1694 },
  { city_name: 'Sydney, Australia', country: 'Australia', agoda_city_id: 28897, latitude: -33.8688, longitude: 151.2093 },
  { city_name: 'Melbourne, Australia', country: 'Australia', agoda_city_id: 28898, latitude: -37.8136, longitude: 144.9631 },
  { city_name: 'Toronto, Canada', country: 'Canada', agoda_city_id: 28670, latitude: 43.6532, longitude: -79.3832 },
  { city_name: 'Vancouver, Canada', country: 'Canada', agoda_city_id: 28671, latitude: 49.2827, longitude: -123.1207 },
  { city_name: 'Mexico City, Mexico', country: 'Mexico', agoda_city_id: 28747, latitude: 19.4326, longitude: -99.1332 },
  { city_name: 'Cancun, Mexico', country: 'Mexico', agoda_city_id: 28748, latitude: 21.1672, longitude: -86.8511 },
  { city_name: 'São Paulo, Brazil', country: 'Brazil', agoda_city_id: 28812, latitude: -23.5505, longitude: -46.6333 },
  { city_name: 'Rio de Janeiro, Brazil', country: 'Brazil', agoda_city_id: 28813, latitude: -22.9068, longitude: -43.1729 },
]

async function seed() {
  try {
    console.log('🌱 Seeding Agoda cities...')
    const { error } = await supabase.from('agoda_city_ids').insert(cities)

    if (error) {
      console.error('Error seeding:', error)
      process.exit(1)
    }

    console.log(`✅ Successfully seeded ${cities.length} cities`)
  } catch (err) {
    console.error('Unexpected error:', err)
    process.exit(1)
  }
}

seed()

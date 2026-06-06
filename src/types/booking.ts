export interface HotelResult {
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

export interface ProvisionalHotel {
  name: string
  ratePerNight: number
  nights: number
  totalCost: number
  property_token: string
}

export interface FlightResult {
  price: number
  total_duration: number
  airline: string
  airline_logo: string
  flight_number: string
  departure_airport: { name: string; id: string; time: string }
  arrival_airport: { name: string; id: string; time: string }
  stops: number
  departure_token: string
}

export interface ProvisionalFlight extends FlightResult {
  id: string
}

export interface BudgetAllocation {
  totalBudget: number
  hotelPercentage: number
  flightPercentage: number
  hotelBudget: number
  flightBudget: number
}

export interface SearchResults {
  hotels: HotelResult[]
  flights: FlightResult[]
  hotelSearchError: string | null
  flightSearchError: string | null
}

export interface ProvisionalSelections {
  hotels: ProvisionalHotel[]
  flights: ProvisionalFlight[]
}

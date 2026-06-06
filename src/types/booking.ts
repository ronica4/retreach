export interface HotelResult {
  hotelId: number
  hotelName: string
  starRating: number
  reviewScore: number
  reviewCount: number
  currency: string
  dailyRate: number
  crossedOutRate: number
  discountPercentage: number
  imageURL: string
  landingURL: string
  includeBreakfast: boolean
  freeWifi: boolean
}

export interface ProvisionalHotel extends HotelResult {
  nights: number
  totalCost: number
}

export interface FlightResult {
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

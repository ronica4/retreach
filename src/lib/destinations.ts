export interface Destination {
  label: string
  value: string       // what gets stored on the retreat and passed to the search APIs
  iataCode: string    // for SerpAPI Google Flights
  agodaCityId: number // for Agoda hotel search
}

export const DESTINATIONS: Destination[] = [
  // United States
  { label: 'Sedona, AZ',            value: 'Sedona, AZ',            iataCode: 'FLG', agodaCityId: 16742 },
  { label: 'Asheville, NC',         value: 'Asheville, NC',         iataCode: 'AVL', agodaCityId: 28787 },
  { label: 'Santa Barbara, CA',     value: 'Santa Barbara, CA',     iataCode: 'SBA', agodaCityId: 18265 },
  { label: 'Ojai, CA',              value: 'Ojai, CA',              iataCode: 'SBA', agodaCityId:  5337 },
  { label: 'Palm Springs, CA',      value: 'Palm Springs, CA',      iataCode: 'PSP', agodaCityId:  3718 },
  { label: 'Carmel, CA',            value: 'Carmel, CA',            iataCode: 'MRY', agodaCityId:  5336 },
  { label: 'Lake Tahoe, CA',        value: 'Lake Tahoe, CA',        iataCode: 'RNO', agodaCityId:  4019 },
  { label: 'Santa Fe, NM',          value: 'Santa Fe, NM',          iataCode: 'SAF', agodaCityId: 13274 },
  { label: 'Taos, NM',              value: 'Taos, NM',              iataCode: 'ABQ', agodaCityId: 10743 },
  { label: 'Berkshires, MA',        value: 'Berkshires, MA',        iataCode: 'BDL', agodaCityId: 12345 },
  { label: 'Hudson Valley, NY',     value: 'Hudson Valley, NY',     iataCode: 'SWF', agodaCityId: 12346 },
  // Mexico
  { label: 'Tulum, Mexico',         value: 'Tulum, Mexico',         iataCode: 'CUN', agodaCityId: 61665 },
  { label: 'Playa del Carmen, Mexico', value: 'Playa del Carmen, Mexico', iataCode: 'CUN', agodaCityId: 1039 },
  // Central America
  { label: 'Costa Rica',            value: 'Costa Rica',            iataCode: 'SJO', agodaCityId: 13987 },
  { label: 'Nosara, Costa Rica',    value: 'Nosara, Costa Rica',    iataCode: 'LIR', agodaCityId: 39861 },
  // Indonesia
  { label: 'Ubud, Bali',            value: 'Ubud, Bali',            iataCode: 'DPS', agodaCityId: 17314 },
  { label: 'Seminyak, Bali',        value: 'Seminyak, Bali',        iataCode: 'DPS', agodaCityId:  3588 },
  // Thailand
  { label: 'Phuket, Thailand',      value: 'Phuket, Thailand',      iataCode: 'HKT', agodaCityId:  3940 },
  { label: 'Koh Samui, Thailand',   value: 'Koh Samui, Thailand',   iataCode: 'USM', agodaCityId:  1185 },
  // Europe
  { label: 'Tuscany, Italy',        value: 'Tuscany, Italy',        iataCode: 'FLR', agodaCityId: 15266 },
  { label: 'Barcelona, Spain',      value: 'Barcelona, Spain',      iataCode: 'BCN', agodaCityId:   636 },
  { label: 'Lisbon, Portugal',      value: 'Lisbon, Portugal',      iataCode: 'LIS', agodaCityId:  1393 },
  // South Asia
  { label: 'Rishikesh, India',      value: 'Rishikesh, India',      iataCode: 'DEL', agodaCityId:  3698 },
  { label: 'Goa, India',            value: 'Goa, India',            iataCode: 'GOI', agodaCityId:   546 },
]

export function getDestination(value: string): Destination | undefined {
  return DESTINATIONS.find(d => d.value === value)
}

export type RetreatStage = 'planning' | 'active' | 'closed'

export interface Retreat {
  id: string
  manager_id: string
  name: string
  destination: string
  concept: string | null
  start_date: string
  end_date: string
  budget: number
  number_of_participants: number | null
  hotel_budget: number | null
  flight_budget: number | null
  stage_override: RetreatStage | null
  created_at: string
  updated_at: string
}

export interface Vendor {
  id: string
  retreat_id: string
  name: string
  category: 'hotel' | 'food' | 'transport' | 'flights' | 'merch' | 'attraction' | 'other'
  contact_name: string | null
  contact_email: string | null
  contact_phone: string | null
  deliverables: string | null
  deadline: string | null
  cost: number | null
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled'
  rating: number | null
  rating_notes: string | null
  created_at: string
}

export interface Participant {
  id: string
  retreat_id: string
  // Basic Information
  name: string
  email: string
  phone: string | null
  age: number | null
  gender: string | null
  city_country: string | null
  // About You
  occupation: string | null
  languages: string | null
  first_retreat: boolean | null
  how_heard: string | null
  // Community & Connection
  motivation: string | null
  hoping_to_gain: string | null
  skills_to_share: string | null
  hobbies: string | null
  fun_fact: string | null
  // Retreat Preferences
  dietary_needs: string | null
  food_preferences: string | null
  tshirt_size: string | null
  activity_level: 'Beginner' | 'Intermediate' | 'Advanced' | null
  wellness_experience: string | null
  rooming_preference: 'Private' | 'Shared' | null
  // Emergency Contact
  emergency_contact_name: string | null
  emergency_contact_relationship: string | null
  emergency_contact_phone: string | null
  // Additional
  additional_info: string | null
  photo_consent: boolean | null
  stay_connected: boolean | null
  custom_answers: Record<string, string> | null
  // Payment
  payment_status: 'unpaid' | 'partial' | 'paid'
  payment_amount: number | null
  notes: string | null
  created_at: string
}

export interface CustomQuestion {
  id: string
  label: string
  type: 'text' | 'textarea' | 'single' | 'multi'
  options?: string[]
  required: boolean
}

export interface Questionnaire {
  id: string
  retreat_id: string
  custom_questions: CustomQuestion[]
  registration_price: number
  created_at: string
  updated_at: string
}

export interface ScheduleItem {
  id: string
  retreat_id: string
  title: string
  description: string | null
  day_number: number | null
  date: string
  start_time: string
  end_time: string | null
  vendor_id: string | null
  location: string | null
  item_type: 'session' | 'meal' | 'transport' | 'activity' | 'other'
  track: string | null
  created_at: string
  vendor?: Vendor
}

export interface Notification {
  id: string
  retreat_id: string
  recipient_type: 'vendor' | 'participant' | 'manager'
  recipient_id: string
  recipient_name: string | null
  recipient_email: string | null
  channel: 'email' | 'sms' | 'push'
  subject: string
  body: string
  status: 'pending' | 'sent' | 'failed'
  scheduled_for: string | null
  sent_at: string | null
  trigger_key: string | null
  created_at: string
}

export interface ParticipantFeedback {
  id: string
  retreat_id: string
  participant_name: string | null
  participant_email: string | null
  nps_score: number | null
  what_loved: string | null
  what_to_improve: string | null
  custom_answers: Record<string, string> | null
  submitted_at: string
}

export interface ManagerFeedback {
  id: string
  retreat_id: string
  manager_id: string
  overall_rating: number | null
  what_went_well: string | null
  what_to_improve: string | null
  lessons_learned: string | null
  would_run_again: boolean | null
  created_at: string
  updated_at: string
}

export interface FeedbackQuestionnaire {
  id: string
  retreat_id: string
  custom_questions: CustomQuestion[]
  created_at: string
  updated_at: string
}

export interface AiInteraction {
  id: string
  retreat_id: string
  manager_id: string
  prompt: string
  response: string
  action_taken: string | null
  accepted: boolean | null
  created_at: string
}

export interface Profile {
  id: string
  email: string
  full_name: string
  created_at: string
}

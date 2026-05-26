import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string

export const supabase = createClient(url, key)

// ── Type helpers for our tables ────────────────────────────────────────────

export interface DbProfile {
  id: string
  username: string
  name: string
  role: 'elderly' | 'family'
  wake_up_time: string
}

export interface DbMedication {
  id: string
  elderly_user_id: string
  name: string
  times: string[]
  days: number[]
  notes: string
  active: boolean
}

export interface DbMedicationLog {
  id: string
  elderly_user_id: string
  medication_names: string[]
  scheduled_time: string | null
  taken_at: string
}

export interface DbFamilyMember {
  id: string
  elderly_user_id: string
  name: string
  relation: string
  phone: string
  email: string
}

export interface DbFamilyLink {
  family_user_id: string
  elderly_user_id: string
}

export interface DbCalendarEvent {
  id: string
  elderly_user_id: string
  title: string
  date: string
  time: string
  is_holiday: boolean
  is_birthday: boolean
}

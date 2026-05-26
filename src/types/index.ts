export type UserRole = 'elderly' | 'family'

export interface User {
  id: string
  name: string
  username: string
  passwordHash: string
  role: UserRole
  avatar?: string
  // Elderly only
  wakeUpTime?: string // "HH:MM"
  googleCalendarConnected?: boolean
  googleAccessToken?: string
  googleRefreshToken?: string
  /** IDs of registered family-member users linked to this elderly person */
  linkedFamilyUserIds?: string[]
  // Family only
  /** IDs of elderly users this family member is following */
  linkedElderlyIds?: string[]
}

export interface FamilyMember {
  id: string
  name: string
  relation: string
  phone: string
  email?: string
  /** If this family member has a registered app account, store their userId */
  appUserId?: string
}

export interface Medication {
  id: string
  name: string
  times: string[] // ["08:00", "14:00", "20:00"]
  days: number[] // 0=Sun…6=Sat  (empty = every day)
  notes?: string
  active: boolean
}

export interface MedicationLog {
  id: string
  elderlyUserId: string
  medicationIds: string[]
  medicationNames: string[]
  scheduledTime: string // ISO string
  takenAt?: string // ISO string
  notifiedFamily: boolean
}

/** Per-elderly data bucket */
export interface UserData {
  familyMembers: FamilyMember[]
  medications: Medication[]
  medicationLogs: MedicationLog[]
  calendarEvents: CalendarEvent[]
}

export type AppScreen =
  | 'login'
  | 'dashboard'          // elderly home
  | 'medications'
  | 'family'
  | 'settings'
  | 'calendar'
  | 'family-dashboard'   // family member home
  | 'elderly-detail'     // family viewing one elderly person

export interface AlarmEvent {
  id: string
  elderlyUserId: string
  medicationIds: string[]
  medicationNames: string[]
  scheduledTime: string // HH:MM
  triggerDate: string // YYYY-MM-DD
  dismissed: boolean
  takenAt?: string
}

export interface CalendarEvent {
  id: string
  title: string
  date: string // YYYY-MM-DD
  time?: string // HH:MM
  isHoliday?: boolean
  isBirthday?: boolean
}

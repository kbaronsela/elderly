import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  User, UserData, FamilyMember, Medication,
  MedicationLog, AppScreen, AlarmEvent, CalendarEvent,
} from '../types'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function hashPassword(password: string): string {
  let hash = 0
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash
  }
  return hash.toString(36)
}

function uid(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

const emptyUserData = (): UserData => ({
  familyMembers: [],
  medications: [],
  medicationLogs: [],
  calendarEvents: [],
})

// ─── State shape ─────────────────────────────────────────────────────────────

interface AppState {
  currentUser: User | null
  users: User[]
  /** Data for each elderly user, keyed by their userId */
  userData: Record<string, UserData>
  screen: AppScreen
  activeAlarm: AlarmEvent | null
  /** For family members: which elderly userId are they currently viewing */
  viewingElderlyId: string | null

  // ── Auth ──────────────────────────────────────────────────────────────────
  login: (username: string, password: string) => boolean
  logout: () => void
  registerElderly: (name: string, username: string, password: string) => void
  registerFamily: (name: string, username: string, password: string) => void

  // ── Navigation ────────────────────────────────────────────────────────────
  setScreen: (screen: AppScreen) => void
  setViewingElderlyId: (id: string | null) => void

  // ── User profile ──────────────────────────────────────────────────────────
  updateUser: (updates: Partial<User>) => void

  // ── Linking ───────────────────────────────────────────────────────────────
  /** Family member links to an elderly person by username. Returns true if found. */
  linkToElderly: (elderlyUsername: string) => boolean
  /** Elderly person unlinks a family user */
  unlinkFamilyUser: (familyUserId: string) => void

  // ── Family contacts (elderly's address book) ──────────────────────────────
  addFamilyMember: (member: Omit<FamilyMember, 'id'>) => void
  updateFamilyMember: (id: string, updates: Partial<FamilyMember>) => void
  deleteFamilyMember: (id: string) => void

  // ── Medications ───────────────────────────────────────────────────────────
  addMedication: (med: Omit<Medication, 'id'>) => void
  updateMedication: (id: string, updates: Partial<Medication>) => void
  deleteMedication: (id: string) => void

  // ── Alarm / logs ──────────────────────────────────────────────────────────
  triggerAlarm: (alarm: AlarmEvent) => void
  dismissAlarm: () => void
  logMedicationTaken: (alarm: AlarmEvent) => void

  // ── Calendar ──────────────────────────────────────────────────────────────
  addCalendarEvent: (event: Omit<CalendarEvent, 'id'>) => void
  setCalendarEvents: (events: CalendarEvent[]) => void

  // ── Selectors (computed helpers) ──────────────────────────────────────────
  getElderlyData: (elderlyUserId: string) => UserData
  getLinkedElderlyUsers: () => User[]
}

// ─── Store ───────────────────────────────────────────────────────────────────

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      currentUser: null,
      users: [],
      userData: {},
      screen: 'login',
      activeAlarm: null,
      viewingElderlyId: null,

      // ── Auth ───────────────────────────────────────────────────────────────

      login: (username, password) => {
        const hash = hashPassword(password)
        const user = get().users.find(u => u.username === username && u.passwordHash === hash)
        if (!user) return false
        const screen = user.role === 'family' ? 'family-dashboard' : 'dashboard'
        set({ currentUser: user, screen })
        return true
      },

      logout: () => set({ currentUser: null, screen: 'login', activeAlarm: null, viewingElderlyId: null }),

      registerElderly: (name, username, password) => {
        const newUser: User = {
          id: uid(), name, username,
          passwordHash: hashPassword(password),
          role: 'elderly',
          wakeUpTime: '07:00',
          googleCalendarConnected: false,
          linkedFamilyUserIds: [],
        }
        set(s => ({
          users: [...s.users, newUser],
          userData: { ...s.userData, [newUser.id]: emptyUserData() },
          currentUser: newUser,
          screen: 'dashboard',
        }))
      },

      registerFamily: (name, username, password) => {
        const newUser: User = {
          id: uid(), name, username,
          passwordHash: hashPassword(password),
          role: 'family',
          linkedElderlyIds: [],
        }
        set(s => ({
          users: [...s.users, newUser],
          currentUser: newUser,
          screen: 'family-dashboard',
        }))
      },

      // ── Navigation ─────────────────────────────────────────────────────────

      setScreen: (screen) => set({ screen }),
      setViewingElderlyId: (id) => set({ viewingElderlyId: id }),

      // ── User profile ───────────────────────────────────────────────────────

      updateUser: (updates) => {
        const { currentUser, users } = get()
        if (!currentUser) return
        const updated = { ...currentUser, ...updates }
        set({ currentUser: updated, users: users.map(u => u.id === currentUser.id ? updated : u) })
      },

      // ── Linking ────────────────────────────────────────────────────────────

      linkToElderly: (elderlyUsername) => {
        const { currentUser, users } = get()
        if (!currentUser || currentUser.role !== 'family') return false
        const elderly = users.find(u => u.username === elderlyUsername && u.role === 'elderly')
        if (!elderly) return false
        // Already linked?
        if (currentUser.linkedElderlyIds?.includes(elderly.id)) return true

        // Update family user's linked list
        const updatedFamily = {
          ...currentUser,
          linkedElderlyIds: [...(currentUser.linkedElderlyIds ?? []), elderly.id],
        }
        // Update elderly user's linked family list
        const updatedElderly = {
          ...elderly,
          linkedFamilyUserIds: [...(elderly.linkedFamilyUserIds ?? []), currentUser.id],
        }
        set(s => ({
          currentUser: updatedFamily,
          users: s.users.map(u =>
            u.id === currentUser.id ? updatedFamily :
            u.id === elderly.id ? updatedElderly : u
          ),
        }))
        return true
      },

      unlinkFamilyUser: (familyUserId) => {
        const { currentUser, users } = get()
        if (!currentUser || currentUser.role !== 'elderly') return
        const familyUser = users.find(u => u.id === familyUserId)
        const updatedElderly = {
          ...currentUser,
          linkedFamilyUserIds: (currentUser.linkedFamilyUserIds ?? []).filter(id => id !== familyUserId),
        }
        const updatedFamily = familyUser ? {
          ...familyUser,
          linkedElderlyIds: (familyUser.linkedElderlyIds ?? []).filter(id => id !== currentUser.id),
        } : null
        set(s => ({
          currentUser: updatedElderly,
          users: s.users.map(u =>
            u.id === currentUser.id ? updatedElderly :
            updatedFamily && u.id === familyUserId ? updatedFamily : u
          ),
        }))
      },

      // ── Family contacts ────────────────────────────────────────────────────

      addFamilyMember: (member) => {
        const { currentUser, userData } = get()
        if (!currentUser || currentUser.role !== 'elderly') return
        const bucket = userData[currentUser.id] ?? emptyUserData()
        set(s => ({
          userData: {
            ...s.userData,
            [currentUser.id]: {
              ...bucket,
              familyMembers: [...bucket.familyMembers, { ...member, id: uid() }],
            },
          },
        }))
      },

      updateFamilyMember: (id, updates) => {
        const { currentUser, userData } = get()
        if (!currentUser || currentUser.role !== 'elderly') return
        const bucket = userData[currentUser.id] ?? emptyUserData()
        set(s => ({
          userData: {
            ...s.userData,
            [currentUser.id]: {
              ...bucket,
              familyMembers: bucket.familyMembers.map(m => m.id === id ? { ...m, ...updates } : m),
            },
          },
        }))
      },

      deleteFamilyMember: (id) => {
        const { currentUser, userData } = get()
        if (!currentUser || currentUser.role !== 'elderly') return
        const bucket = userData[currentUser.id] ?? emptyUserData()
        set(s => ({
          userData: {
            ...s.userData,
            [currentUser.id]: {
              ...bucket,
              familyMembers: bucket.familyMembers.filter(m => m.id !== id),
            },
          },
        }))
      },

      // ── Medications ────────────────────────────────────────────────────────

      addMedication: (med) => {
        const { currentUser, userData } = get()
        if (!currentUser || currentUser.role !== 'elderly') return
        const bucket = userData[currentUser.id] ?? emptyUserData()
        set(s => ({
          userData: {
            ...s.userData,
            [currentUser.id]: { ...bucket, medications: [...bucket.medications, { ...med, id: uid() }] },
          },
        }))
      },

      updateMedication: (id, updates) => {
        const { currentUser, userData } = get()
        if (!currentUser || currentUser.role !== 'elderly') return
        const bucket = userData[currentUser.id] ?? emptyUserData()
        set(s => ({
          userData: {
            ...s.userData,
            [currentUser.id]: {
              ...bucket,
              medications: bucket.medications.map(m => m.id === id ? { ...m, ...updates } : m),
            },
          },
        }))
      },

      deleteMedication: (id) => {
        const { currentUser, userData } = get()
        if (!currentUser || currentUser.role !== 'elderly') return
        const bucket = userData[currentUser.id] ?? emptyUserData()
        set(s => ({
          userData: {
            ...s.userData,
            [currentUser.id]: { ...bucket, medications: bucket.medications.filter(m => m.id !== id) },
          },
        }))
      },

      // ── Alarm / logs ───────────────────────────────────────────────────────

      triggerAlarm: (alarm) => set({ activeAlarm: alarm }),

      dismissAlarm: () => set({ activeAlarm: null }),

      logMedicationTaken: (alarm) => {
        const { userData } = get()
        const bucket = userData[alarm.elderlyUserId] ?? emptyUserData()
        const log: MedicationLog = {
          id: uid(),
          elderlyUserId: alarm.elderlyUserId,
          medicationIds: alarm.medicationIds,
          medicationNames: alarm.medicationNames,
          scheduledTime: `${alarm.triggerDate}T${alarm.scheduledTime}:00`,
          takenAt: new Date().toISOString(),
          notifiedFamily: false,
        }
        set(s => ({
          activeAlarm: null,
          userData: {
            ...s.userData,
            [alarm.elderlyUserId]: { ...bucket, medicationLogs: [...bucket.medicationLogs, log] },
          },
        }))
      },

      // ── Calendar ───────────────────────────────────────────────────────────

      addCalendarEvent: (event) => {
        const { currentUser, userData } = get()
        if (!currentUser || currentUser.role !== 'elderly') return
        const bucket = userData[currentUser.id] ?? emptyUserData()
        set(s => ({
          userData: {
            ...s.userData,
            [currentUser.id]: {
              ...bucket,
              calendarEvents: [...bucket.calendarEvents, { ...event, id: uid() }],
            },
          },
        }))
      },

      setCalendarEvents: (events) => {
        const { currentUser, userData } = get()
        if (!currentUser || currentUser.role !== 'elderly') return
        const bucket = userData[currentUser.id] ?? emptyUserData()
        set(s => ({
          userData: { ...s.userData, [currentUser.id]: { ...bucket, calendarEvents: events } },
        }))
      },

      // ── Selectors ──────────────────────────────────────────────────────────

      getElderlyData: (elderlyUserId) => {
        return get().userData[elderlyUserId] ?? emptyUserData()
      },

      getLinkedElderlyUsers: () => {
        const { currentUser, users } = get()
        if (!currentUser || currentUser.role !== 'family') return []
        return (currentUser.linkedElderlyIds ?? [])
          .map(id => users.find(u => u.id === id))
          .filter(Boolean) as User[]
      },
    }),
    {
      name: 'elderly-app-storage-v2',
      partialize: (state) => ({
        users: state.users,
        userData: state.userData,
        currentUser: state.currentUser,
      }),
    }
  )
)

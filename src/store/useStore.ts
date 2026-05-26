import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import type {
  User, UserData, FamilyMember, Medication,
  MedicationLog, AppScreen, AlarmEvent, CalendarEvent,
} from '../types'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function uid(): string {
  return crypto.randomUUID()
}

const emptyUserData = (): UserData => ({
  familyMembers: [], medications: [], medicationLogs: [], calendarEvents: [],
})

// ─── State ───────────────────────────────────────────────────────────────────

interface AppState {
  currentUser: User | null
  allUsers: User[]           // cached profiles visible to current user
  userData: Record<string, UserData>
  screen: AppScreen
  activeAlarm: AlarmEvent | null
  viewingElderlyId: string | null
  loading: boolean
  error: string | null

  // Auth
  login: (username: string, password: string) => Promise<boolean>
  logout: () => Promise<void>
  registerElderly: (name: string, username: string, password: string) => Promise<void>
  registerFamily: (name: string, username: string, password: string, phone?: string) => Promise<void>
  initSession: () => Promise<void>

  // Navigation
  setScreen: (screen: AppScreen) => void
  setViewingElderlyId: (id: string | null) => void

  // Profile
  updateUser: (updates: Partial<User>) => Promise<void>

  // Linking
  linkToElderly: (elderlyUsername: string) => Promise<boolean>
  unlinkFamilyUser: (familyUserId: string) => Promise<void>
  updateElderlyAvatar: (elderlyId: string, avatar: string) => Promise<void>
  refreshLinkedFamilyUsers: () => Promise<void>

  // Medications
  addMedication: (med: Omit<Medication, 'id'>) => Promise<void>
  updateMedication: (id: string, updates: Partial<Medication>) => Promise<void>
  deleteMedication: (id: string) => Promise<void>

  // Family contacts
  addFamilyMember: (member: Omit<FamilyMember, 'id'>) => Promise<void>
  updateFamilyMember: (id: string, updates: Partial<FamilyMember>) => Promise<void>
  deleteFamilyMember: (id: string) => Promise<void>

  // Alarm / logs
  triggerAlarm: (alarm: AlarmEvent) => void
  dismissAlarm: () => void
  logMedicationTaken: (alarm: AlarmEvent) => Promise<void>

  // Calendar
  addCalendarEvent: (event: Omit<CalendarEvent, 'id'>) => Promise<void>
  setCalendarEvents: (events: CalendarEvent[]) => void

  // Selectors
  getElderlyData: (elderlyUserId: string) => UserData
  getLinkedElderlyUsers: () => User[]
}

// ─── Data loader helpers ──────────────────────────────────────────────────────

async function loadElderlyData(elderlyId: string): Promise<UserData> {
  const [meds, logs, fam, cal] = await Promise.all([
    supabase.from('medications').select('*').eq('elderly_user_id', elderlyId),
    supabase.from('medication_logs').select('*').eq('elderly_user_id', elderlyId).order('taken_at', { ascending: false }).limit(100),
    supabase.from('family_members').select('*').eq('elderly_user_id', elderlyId),
    supabase.from('calendar_events').select('*').eq('elderly_user_id', elderlyId),
  ])

  return {
    medications: (meds.data ?? []).map(m => ({
      id: m.id, name: m.name, times: m.times, days: m.days, notes: m.notes, active: m.active,
    })),
    medicationLogs: (logs.data ?? []).map(l => ({
      id: l.id, elderlyUserId: l.elderly_user_id, medicationIds: [],
      medicationNames: l.medication_names, scheduledTime: l.scheduled_time ?? '',
      takenAt: l.taken_at, notifiedFamily: false,
    })),
    familyMembers: (fam.data ?? []).map(f => ({
      id: f.id, name: f.name, relation: f.relation, phone: f.phone, email: f.email,
    })),
    calendarEvents: (cal.data ?? []).map(e => ({
      id: e.id, title: e.title, date: e.date, time: e.time,
      isHoliday: e.is_holiday, isBirthday: e.is_birthday,
    })),
  }
}

async function buildUserFromProfile(profile: { id: string; username: string; name: string; role: string; wake_up_time: string; avatar?: string; phone?: string }, linkedElderlyIds?: string[], linkedFamilyUserIds?: string[]): Promise<User> {
  return {
    id: profile.id,
    username: profile.username,
    name: profile.name,
    passwordHash: '',
    role: profile.role as 'elderly' | 'family',
    avatar: profile.avatar ?? (profile.role === 'elderly' ? '👴' : '👨‍👩‍👧'),
    phone: profile.phone ?? '',
    wakeUpTime: profile.wake_up_time,
    googleCalendarConnected: false,
    linkedElderlyIds,
    linkedFamilyUserIds,
  }
}

// ─── Store ───────────────────────────────────────────────────────────────────

export const useStore = create<AppState>((set, get) => ({
  currentUser: null,
  allUsers: [],
  userData: {},
  screen: 'login',
  activeAlarm: null,
  viewingElderlyId: null,
  loading: false,
  error: null,

  // ── initSession: called on app load to restore existing session ────────────
  initSession: async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) return

    const { data: profile } = await supabase
      .from('profiles').select('*').eq('id', session.user.id).single()
    if (!profile) return

    if (profile.role === 'elderly') {
      const { data: links } = await supabase.from('family_links').select('family_user_id').eq('elderly_user_id', profile.id)
      const familyIds = (links ?? []).map((l: { family_user_id: string }) => l.family_user_id)
      const user = await buildUserFromProfile(profile, [], familyIds)
      const data = await loadElderlyData(profile.id)
      // Load family user profiles so they appear in allUsers
      const familyProfiles = await Promise.all(familyIds.map(async (fid: string) => {
        const { data: fp } = await supabase.from('profiles').select('*').eq('id', fid).single()
        return fp ? buildUserFromProfile(fp) : null
      }))
      const allUsers = [user, ...familyProfiles.filter(Boolean) as Awaited<ReturnType<typeof buildUserFromProfile>>[]]
      set({ currentUser: user, allUsers, userData: { [user.id]: data }, screen: 'dashboard' })
    } else {
      const { data: links } = await supabase.from('family_links').select('elderly_user_id').eq('family_user_id', profile.id)
      const elderlyIds = (links ?? []).map((l: { elderly_user_id: string }) => l.elderly_user_id)
      const user = await buildUserFromProfile(profile, elderlyIds, [])

      // Load all linked elderly profiles + data
      const allUsers: User[] = [user]
      const userData: Record<string, UserData> = {}
      await Promise.all(elderlyIds.map(async (eid: string) => {
        const { data: ep } = await supabase.from('profiles').select('*').eq('id', eid).single()
        if (ep) {
          allUsers.push(await buildUserFromProfile(ep))
          userData[eid] = await loadElderlyData(eid)
        }
      }))
      set({ currentUser: user, allUsers, userData, screen: 'family-dashboard' })
    }
  },

  // ── login ──────────────────────────────────────────────────────────────────
  login: async (username, password) => {
    set({ loading: true, error: null })
    try {
      const email = `${username}@elderlycare.com`
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) { set({ loading: false, error: 'שם משתמש או סיסמה שגויים' }); return false }
      await get().initSession()
      set({ loading: false })
      return true
    } catch {
      set({ loading: false, error: 'שגיאה בחיבור' })
      return false
    }
  },

  // ── logout ─────────────────────────────────────────────────────────────────
  logout: async () => {
    await supabase.auth.signOut()
    set({ currentUser: null, allUsers: [], userData: {}, screen: 'login', activeAlarm: null, viewingElderlyId: null })
  },

  // ── registerElderly ────────────────────────────────────────────────────────
  registerElderly: async (name, username, password) => {
    set({ loading: true, error: null })
    const email = `${username}@elderlycare.com`
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error || !data.user) { set({ loading: false, error: error?.message ?? 'שגיאה בהרשמה' }); return }

    await supabase.from('profiles').insert({
      id: data.user.id, username, name, role: 'elderly', wake_up_time: '07:00',
    })
    const user = await buildUserFromProfile({ id: data.user.id, username, name, role: 'elderly', wake_up_time: '07:00' }, [], [])
    set({ currentUser: user, userData: { [user.id]: emptyUserData() }, screen: 'dashboard', loading: false })
  },

  // ── registerFamily ─────────────────────────────────────────────────────────
  registerFamily: async (name, username, password, phone?) => {
    set({ loading: true, error: null })
    const email = `${username}@elderlycare.com`
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error || !data.user) { set({ loading: false, error: error?.message ?? 'שגיאה בהרשמה' }); return }

    await supabase.from('profiles').insert({
      id: data.user.id, username, name, role: 'family', wake_up_time: '07:00', phone: phone ?? '',
    })
    const user = await buildUserFromProfile({ id: data.user.id, username, name, role: 'family', wake_up_time: '07:00', phone: phone ?? '' }, [], [])
    set({ currentUser: user, allUsers: [user], screen: 'family-dashboard', loading: false })
  },

  // ── navigation ─────────────────────────────────────────────────────────────
  setScreen: (screen) => set({ screen }),
  setViewingElderlyId: (id) => set({ viewingElderlyId: id }),

  // ── updateUser ─────────────────────────────────────────────────────────────
  updateUser: async (updates) => {
    const { currentUser } = get()
    if (!currentUser) return
    const updated = { ...currentUser, ...updates }
    await supabase.from('profiles').update({
      name: updated.name,
      wake_up_time: updated.wakeUpTime,
      phone: updated.phone,
    }).eq('id', currentUser.id)
    // If family member updated their phone, sync it to all elderly contacts
    if (currentUser.role === 'family' && updates.phone !== undefined) {
      await supabase.from('family_members')
        .update({ phone: updates.phone })
        .eq('email', currentUser.username)
    }
    set({ currentUser: updated })
  },

  // ── linkToElderly ──────────────────────────────────────────────────────────
  linkToElderly: async (elderlyUsername) => {
    const { currentUser } = get()
    if (!currentUser || currentUser.role !== 'family') return false

    const { data: profile } = await supabase
      .from('profiles').select('*').eq('username', elderlyUsername).eq('role', 'elderly').single()
    if (!profile) return false

    const { error } = await supabase.from('family_links').insert({
      family_user_id: currentUser.id,
      elderly_user_id: profile.id,
    })
    if (error && error.code !== '23505') return false

    // Auto-add family member as a contact for the elderly user (if not already there)
    const existingContact = await supabase.from('family_members')
      .select('id').eq('elderly_user_id', profile.id).eq('email', currentUser.username).maybeSingle()
    if (!existingContact.data) {
      await supabase.from('family_members').insert({
        id: uid(),
        elderly_user_id: profile.id,
        name: currentUser.name,
        relation: 'בן/בת משפחה',
        phone: currentUser.phone ?? '',
        email: currentUser.username,
      })
    } else if (currentUser.phone) {
      // Update phone if we have it
      await supabase.from('family_members')
        .update({ phone: currentUser.phone })
        .eq('id', existingContact.data.id)
    }

    // Load elderly data
    const elderlyUser = await buildUserFromProfile(profile)
    const data = await loadElderlyData(profile.id)
    const updatedIds = [...(currentUser.linkedElderlyIds ?? []).filter(id => id !== profile.id), profile.id]
    const updatedUser = { ...currentUser, linkedElderlyIds: updatedIds }
    set(s => ({
      currentUser: updatedUser,
      allUsers: [...s.allUsers.filter(u => u.id !== profile.id), elderlyUser],
      userData: { ...s.userData, [profile.id]: data },
    }))
    return true
  },

  // ── updateElderlyAvatar ────────────────────────────────────────────────────
  updateElderlyAvatar: async (elderlyId, avatar) => {
    await supabase.from('profiles').update({ avatar }).eq('id', elderlyId)
    set(s => ({
      allUsers: s.allUsers.map(u => u.id === elderlyId ? { ...u, avatar } : u),
      currentUser: s.currentUser?.id === elderlyId ? { ...s.currentUser, avatar } : s.currentUser,
    }))
  },

  // ── unlinkFamilyUser ───────────────────────────────────────────────────────
  unlinkFamilyUser: async (familyUserId) => {
    const { currentUser } = get()
    if (!currentUser || currentUser.role !== 'elderly') return
    await supabase.from('family_links').delete()
      .eq('family_user_id', familyUserId).eq('elderly_user_id', currentUser.id)
    const updated = { ...currentUser, linkedFamilyUserIds: (currentUser.linkedFamilyUserIds ?? []).filter(id => id !== familyUserId) }
    set({ currentUser: updated })
  },

  // ── refreshLinkedFamilyUsers ───────────────────────────────────────────────
  refreshLinkedFamilyUsers: async () => {
    const { currentUser, userData } = get()
    if (!currentUser || currentUser.role !== 'elderly') return

    // Refresh linked app-users
    const { data: links } = await supabase.from('family_links').select('family_user_id').eq('elderly_user_id', currentUser.id)
    const familyIds = (links ?? []).map((l: { family_user_id: string }) => l.family_user_id)
    const familyProfiles = await Promise.all(familyIds.map(async (fid: string) => {
      const { data: fp } = await supabase.from('profiles').select('*').eq('id', fid).single()
      return fp ? buildUserFromProfile(fp) : null
    }))
    const resolvedProfiles = (await Promise.all(familyProfiles)).filter(Boolean) as User[]
    const updatedUser = { ...currentUser, linkedFamilyUserIds: familyIds }

    // Also refresh family contacts list
    const { data: contacts } = await supabase.from('family_members').select('*').eq('elderly_user_id', currentUser.id)
    const familyMembers = (contacts ?? []).map((f: { id: string; name: string; relation: string; phone: string; email: string }) => ({
      id: f.id, name: f.name, relation: f.relation, phone: f.phone ?? '', email: f.email ?? '',
    }))

    set(s => ({
      currentUser: updatedUser,
      allUsers: [updatedUser, ...resolvedProfiles, ...s.allUsers.filter(u => u.id !== currentUser.id && !familyIds.includes(u.id))],
      userData: { ...s.userData, [currentUser.id]: { ...(userData[currentUser.id] ?? emptyUserData()), familyMembers } },
    }))
  },

  // ── Medications ────────────────────────────────────────────────────────────
  addMedication: async (med) => {
    const { currentUser, userData } = get()
    if (!currentUser || currentUser.role !== 'elderly') return
    const newMed = { ...med, id: uid() }
    const bucket = userData[currentUser.id] ?? emptyUserData()
    set(s => ({ userData: { ...s.userData, [currentUser.id]: { ...bucket, medications: [...bucket.medications, newMed] } } }))
    await supabase.from('medications').insert({
      id: newMed.id, elderly_user_id: currentUser.id,
      name: med.name, times: med.times, days: med.days, notes: med.notes, active: med.active,
    })
  },

  updateMedication: async (id, updates) => {
    const { currentUser, userData } = get()
    if (!currentUser || currentUser.role !== 'elderly') return
    const bucket = userData[currentUser.id] ?? emptyUserData()
    set(s => ({ userData: { ...s.userData, [currentUser.id]: { ...bucket, medications: bucket.medications.map(m => m.id === id ? { ...m, ...updates } : m) } } }))
    await supabase.from('medications').update({ name: updates.name, times: updates.times, days: updates.days, notes: updates.notes, active: updates.active }).eq('id', id)
  },

  deleteMedication: async (id) => {
    const { currentUser, userData } = get()
    if (!currentUser || currentUser.role !== 'elderly') return
    const bucket = userData[currentUser.id] ?? emptyUserData()
    set(s => ({ userData: { ...s.userData, [currentUser.id]: { ...bucket, medications: bucket.medications.filter(m => m.id !== id) } } }))
    await supabase.from('medications').delete().eq('id', id)
  },

  // ── Family contacts ────────────────────────────────────────────────────────
  addFamilyMember: async (member) => {
    const { currentUser, userData } = get()
    if (!currentUser || currentUser.role !== 'elderly') return
    const newMember = { ...member, id: uid() }
    const bucket = userData[currentUser.id] ?? emptyUserData()
    set(s => ({ userData: { ...s.userData, [currentUser.id]: { ...bucket, familyMembers: [...bucket.familyMembers, newMember] } } }))
    await supabase.from('family_members').insert({ id: newMember.id, elderly_user_id: currentUser.id, name: member.name, relation: member.relation, phone: member.phone, email: member.email ?? '' })
  },

  updateFamilyMember: async (id, updates) => {
    const { currentUser, userData } = get()
    if (!currentUser || currentUser.role !== 'elderly') return
    const bucket = userData[currentUser.id] ?? emptyUserData()
    set(s => ({ userData: { ...s.userData, [currentUser.id]: { ...bucket, familyMembers: bucket.familyMembers.map(m => m.id === id ? { ...m, ...updates } : m) } } }))
    await supabase.from('family_members').update({ name: updates.name, relation: updates.relation, phone: updates.phone, email: updates.email }).eq('id', id)
  },

  deleteFamilyMember: async (id) => {
    const { currentUser, userData } = get()
    if (!currentUser || currentUser.role !== 'elderly') return
    const bucket = userData[currentUser.id] ?? emptyUserData()
    set(s => ({ userData: { ...s.userData, [currentUser.id]: { ...bucket, familyMembers: bucket.familyMembers.filter(m => m.id !== id) } } }))
    await supabase.from('family_members').delete().eq('id', id)
  },

  // ── Alarm ──────────────────────────────────────────────────────────────────
  triggerAlarm: (alarm) => set({ activeAlarm: alarm }),
  dismissAlarm: () => set({ activeAlarm: null }),

  logMedicationTaken: async (alarm) => {
    const { userData } = get()
    const bucket = userData[alarm.elderlyUserId] ?? emptyUserData()
    const log: MedicationLog = {
      id: uid(), elderlyUserId: alarm.elderlyUserId,
      medicationIds: alarm.medicationIds, medicationNames: alarm.medicationNames,
      scheduledTime: `${alarm.triggerDate}T${alarm.scheduledTime}:00`,
      takenAt: new Date().toISOString(), notifiedFamily: false,
    }
    set(s => ({
      activeAlarm: null,
      userData: { ...s.userData, [alarm.elderlyUserId]: { ...bucket, medicationLogs: [log, ...bucket.medicationLogs] } },
    }))
    await supabase.from('medication_logs').insert({
      id: log.id, elderly_user_id: alarm.elderlyUserId,
      medication_names: alarm.medicationNames,
      scheduled_time: `${alarm.triggerDate}T${alarm.scheduledTime}:00`,
      taken_at: log.takenAt,
    })
  },

  // ── Calendar ───────────────────────────────────────────────────────────────
  addCalendarEvent: async (event) => {
    const { currentUser, userData } = get()
    if (!currentUser || currentUser.role !== 'elderly') return
    const newEvent = { ...event, id: uid() }
    const bucket = userData[currentUser.id] ?? emptyUserData()
    set(s => ({ userData: { ...s.userData, [currentUser.id]: { ...bucket, calendarEvents: [...bucket.calendarEvents, newEvent] } } }))
    await supabase.from('calendar_events').insert({ id: newEvent.id, elderly_user_id: currentUser.id, title: event.title, date: event.date, time: event.time ?? '', is_holiday: event.isHoliday ?? false, is_birthday: event.isBirthday ?? false })
  },

  setCalendarEvents: (events) => {
    const { currentUser } = get()
    if (!currentUser) return
    const bucket = get().userData[currentUser.id] ?? emptyUserData()
    const removed = bucket.calendarEvents.filter(e => !events.find(ne => ne.id === e.id))
    removed.forEach(e => supabase.from('calendar_events').delete().eq('id', e.id))
    set(s => ({ userData: { ...s.userData, [currentUser.id]: { ...bucket, calendarEvents: events } } }))
  },

  // ── Selectors ──────────────────────────────────────────────────────────────
  getElderlyData: (elderlyUserId) => get().userData[elderlyUserId] ?? emptyUserData(),

  getLinkedElderlyUsers: () => {
    const { currentUser, allUsers } = get()
    if (!currentUser || currentUser.role !== 'family') return []
    return (currentUser.linkedElderlyIds ?? []).map(id => allUsers.find(u => u.id === id)).filter(Boolean) as User[]
  },
}))

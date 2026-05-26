import { useEffect, useRef, useState } from 'react'
import { useStore } from './store/useStore'
import Login from './components/Login'
import Dashboard from './components/Dashboard'
import Medications from './components/Medications'
import FamilyMembers from './components/FamilyMembers'
import Settings from './components/Settings'
import CalendarPage from './components/CalendarPage'
import AlarmModal from './components/AlarmModal'
import MorningGreeting from './components/MorningGreeting'
import BottomNav from './components/BottomNav'
import FamilyDashboard from './components/FamilyDashboard'
import ElderlyDetail from './components/ElderlyDetail'
import type { AlarmEvent } from './types'

// ── Helpers ──────────────────────────────────────────────────────────────────

async function requestNotificationPermission() {
  if (!('Notification' in window)) return
  if (Notification.permission === 'default') {
    await Notification.requestPermission()
  }
}

function getSW(): ServiceWorker | null {
  return navigator.serviceWorker?.controller ?? null
}

function sendToSW(msg: object) {
  const sw = getSW()
  if (sw) sw.postMessage(msg)
}

// ── Alarm scheduler (runs only for elderly users) ─────────────────────────────
function useAlarmScheduler() {
  const { currentUser, getElderlyData, triggerAlarm, activeAlarm } = useStore()
  const firedRef = useRef<Set<string>>(new Set())

  // Request notification permission once on login
  useEffect(() => {
    if (currentUser?.role === 'elderly') {
      requestNotificationPermission()
    }
  }, [currentUser?.id])

  useEffect(() => {
    if (!currentUser || currentUser.role !== 'elderly') return

    const check = () => {
      const now = new Date()
      const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
      const today = now.toISOString().slice(0, 10)
      const dayOfWeek = now.getDay()
      const { medications } = getElderlyData(currentUser.id)

      // Always keep SW in sync with current schedules
      sendToSW({ type: 'MEDICATION_SCHEDULES', schedules: medications })
      // Tell SW to check right now too
      sendToSW({ type: 'CHECK_ALARMS' })

      const byTime: Record<string, { ids: string[]; names: string[] }> = {}
      medications
        .filter(m => m.active && (m.days.length === 0 || m.days.includes(dayOfWeek)))
        .forEach(m => {
          m.times.forEach(t => {
            if (t === hhmm) {
              if (!byTime[t]) byTime[t] = { ids: [], names: [] }
              byTime[t].ids.push(m.id)
              byTime[t].names.push(m.name)
            }
          })
        })

      Object.entries(byTime).forEach(([time, { ids, names }]) => {
        const key = `${today}_${time}`
        if (!firedRef.current.has(key) && !activeAlarm) {
          firedRef.current.add(key)
          const alarm: AlarmEvent = {
            id: key,
            elderlyUserId: currentUser.id,
            medicationIds: ids,
            medicationNames: names,
            scheduledTime: time,
            triggerDate: today,
            dismissed: false,
          }
          triggerAlarm(alarm)
        }
      })
    }

    check()
    const interval = setInterval(check, 30000)
    return () => clearInterval(interval)
  }, [currentUser, getElderlyData, triggerAlarm, activeAlarm])
}

// ── Morning greeting (runs only for elderly users) ────────────────────────────
function useMorningGreeting() {
  const { currentUser } = useStore()
  const [showGreeting, setShowGreeting] = useState(false)
  const firedDateRef = useRef<string>('')

  useEffect(() => {
    if (!currentUser || currentUser.role !== 'elderly') return

    const check = () => {
      const now = new Date()
      const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
      const today = now.toISOString().slice(0, 10)
      if (hhmm === (currentUser.wakeUpTime ?? '07:00') && firedDateRef.current !== today) {
        firedDateRef.current = today
        setShowGreeting(true)
      }
    }

    check()
    const interval = setInterval(check, 30000)
    return () => clearInterval(interval)
  }, [currentUser])

  return { showGreeting, setShowGreeting }
}

// ── Authenticated app shell ───────────────────────────────────────────────────
function AuthenticatedApp() {
  const { screen, currentUser } = useStore()
  useAlarmScheduler()
  const { showGreeting, setShowGreeting } = useMorningGreeting()
  const activeAlarm = useStore(s => s.activeAlarm)

  if (!currentUser) return null

  // Family member flow
  if (currentUser.role === 'family') {
    return (
      <div className="max-w-2xl mx-auto">
        {screen === 'family-dashboard' && <FamilyDashboard />}
        {screen === 'elderly-detail' && <ElderlyDetail />}
        {activeAlarm && <AlarmModal alarm={activeAlarm} />}
      </div>
    )
  }

  // Elderly user flow
  return (
    <div className="max-w-2xl mx-auto">
      {screen === 'dashboard' && <Dashboard />}
      {screen === 'medications' && <Medications />}
      {screen === 'family' && <FamilyMembers />}
      {screen === 'calendar' && <CalendarPage />}
      {screen === 'settings' && <Settings />}

      <BottomNav />

      {showGreeting && <MorningGreeting onClose={() => setShowGreeting(false)} />}
      {activeAlarm && <AlarmModal alarm={activeAlarm} />}
    </div>
  )
}

export default function App() {
  const { screen, initSession } = useStore()

  useEffect(() => {
    initSession()
  }, [])

  if (screen === 'login') return <Login />
  return <AuthenticatedApp />
}

/// <reference lib="webworker" />
import { precacheAndRoute } from 'workbox-precaching'

declare const self: ServiceWorkerGlobalScope

// Precache all build assets
precacheAndRoute(self.__WB_MANIFEST)

// ── State kept in service worker memory ──────────────────────────────────────

interface MedSchedule {
  id: string
  name: string
  times: string[]
  days: number[]
  active: boolean
}

let schedules: MedSchedule[] = []
const firedKeys = new Set<string>()
let lastDate = ''

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

function resetIfNewDay() {
  const today = todayStr()
  if (today !== lastDate) {
    firedKeys.clear()
    lastDate = today
  }
}

// ── Check and show notifications ─────────────────────────────────────────────

function checkAndNotify() {
  resetIfNewDay()
  const now = new Date()
  const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  const today = todayStr()
  const dow = now.getDay()

  const byTime: Record<string, string[]> = {}
  schedules.forEach(med => {
    if (!med.active) return
    if (med.days.length > 0 && !med.days.includes(dow)) return
    med.times.forEach(t => {
      if (t === hhmm) {
        if (!byTime[t]) byTime[t] = []
        byTime[t].push(med.name)
      }
    })
  })

  Object.entries(byTime).forEach(([time, names]) => {
    const key = `${today}_${time}`
    if (firedKeys.has(key)) return
    firedKeys.add(key)

    self.registration.showNotification('⏰ זמן לתרופות!', {
      body: `הגיע הזמן לקחת: ${names.join(', ')}`,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: key,
      requireInteraction: true,
      // @ts-ignore – vibrate is valid in Chrome
      vibrate: [400, 150, 400, 150, 400],
      actions: [
        { action: 'taken', title: '✅ לקחתי' },
        { action: 'snooze', title: '⏰ +10 דקות' },
      ],
    })
  })
}

// ── Messages from the page ────────────────────────────────────────────────────

self.addEventListener('message', (event: ExtendableMessageEvent) => {
  if (!event.data) return

  if (event.data.type === 'MEDICATION_SCHEDULES') {
    schedules = event.data.schedules ?? []
  }

  if (event.data.type === 'CHECK_ALARMS') {
    checkAndNotify()
  }
})

// ── Notification click ────────────────────────────────────────────────────────

self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close()
  const tag = event.notification.tag

  if (event.action === 'snooze') {
    // Snooze: re-fire in 10 minutes by removing the key so it can re-trigger
    setTimeout(() => {
      firedKeys.delete(tag)
    }, 10 * 60 * 1000)
    return
  }

  // Open or focus the app
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      if (clients.length > 0) {
        const client = clients[0]
        client.focus()
        if (event.action === 'taken') {
          client.postMessage({ type: 'NOTIFICATION_TAKEN', tag })
        }
      } else {
        self.clients.openWindow('/')
      }
    })
  )
})

// ── Push (future server-side push) ───────────────────────────────────────────

self.addEventListener('push', (event: PushEvent) => {
  const data = event.data?.json?.() ?? {}
  event.waitUntil(
    self.registration.showNotification(data.title ?? '⏰ זמן לתרופות!', {
      body: data.body ?? '',
      icon: '/icons/icon-192.png',
      requireInteraction: true,
      tag: data.tag ?? 'push',
      // @ts-ignore
      vibrate: [400, 150, 400],
    })
  )
})

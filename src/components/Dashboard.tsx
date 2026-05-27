import { useEffect, useState } from 'react'
import { useStore } from '../store/useStore'
import { formatDateHe, formatTimeHe } from '../utils/dateHe'
import { fetchIsraeliHolidays, getTodayHoliday, getUpcomingHolidays } from '../utils/holidays'
import type { IsraeliHoliday } from '../utils/holidays'

export default function Dashboard() {
  const { currentUser, getElderlyData, setScreen } = useStore()
  const [now, setNow] = useState(new Date())
  const [holidays, setHolidays] = useState<IsraeliHoliday[]>([])

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 30000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    fetchIsraeliHolidays(new Date().getFullYear()).then(setHolidays)
  }, [])

  if (!currentUser || currentUser.role !== 'elderly') return null
  const { medications, calendarEvents } = getElderlyData(currentUser.id)

  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

  const todayMeds = medications
    .filter(m => m.active && (m.days.length === 0 || m.days.includes(now.getDay())))
    .flatMap(m => m.times.map(t => ({ time: t, name: m.name, id: m.id })))
    .sort((a, b) => a.time.localeCompare(b.time))

  const todayEvents = calendarEvents.filter(e => e.date === todayStr)
  const todayHoliday = getTodayHoliday(holidays)
  const upcomingHolidays = getUpcomingHolidays(holidays, 14).filter(h => h.date !== todayStr)

  const hour = now.getHours()
  const greeting = hour < 12 ? 'בוקר טוב' : hour < 17 ? 'צהריים טובים' : 'ערב טוב'

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-sky-50 p-4 pb-28">
      {/* Greeting */}
      <div className="bg-white rounded-3xl shadow-lg p-6 mb-5 text-center">
        <p className="text-3xl font-black text-blue-700">{greeting}, {currentUser.name}! 😊</p>
        <p className="text-2xl text-gray-600 mt-2">{formatDateHe(now)}</p>
        <p className="text-4xl font-bold text-blue-800 mt-1">{formatTimeHe(now)}</p>
      </div>

      {/* Today's Israeli holiday */}
      {todayHoliday && (
        <div className="bg-blue-600 rounded-3xl p-5 mb-5 text-white text-center shadow-lg">
          <p className="text-4xl mb-1">🇮🇱</p>
          <p className="text-2xl font-black">{todayHoliday.hebrew}</p>
          <p className="text-lg opacity-80">חג שמח!</p>
        </div>
      )}

      {/* Upcoming holidays in next 14 days */}
      {upcomingHolidays.length > 0 && (
        <div className="bg-indigo-50 border-2 border-indigo-200 rounded-3xl p-4 mb-5">
          <h2 className="text-xl font-bold text-indigo-800 mb-2">🗓️ חגים קרובים</h2>
          <div className="space-y-1">
            {upcomingHolidays.slice(0, 3).map(h => {
              const d = new Date(h.date + 'T12:00:00')
              const days = Math.round((d.getTime() - Date.now()) / 86400000)
              return (
                <div key={h.date} className="flex justify-between items-center text-lg text-indigo-700">
                  <span>🇮🇱 {h.hebrew}</span>
                  <span className="text-sm text-indigo-400">בעוד {days} ימים</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Calendar events today */}
      {todayEvents.length > 0 && (
        <div className="bg-yellow-50 border-2 border-yellow-300 rounded-3xl p-5 mb-5">
          <h2 className="text-2xl font-bold text-yellow-800 mb-3">📅 היום בלוח השנה</h2>
          <div className="space-y-2">
            {todayEvents.map(ev => (
              <div key={ev.id} className="flex items-center gap-3 text-xl text-yellow-900">
                <span>{ev.isBirthday ? '🎂' : ev.isHoliday ? '🎉' : '📌'}</span>
                <span>{ev.title}{ev.time ? ` – שעה ${ev.time}` : ''}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Medications today */}
      <div className="bg-white rounded-3xl shadow-lg p-5 mb-5">
        <h2 className="text-2xl font-bold text-blue-800 mb-4">💊 תרופות היום</h2>
        {todayMeds.length === 0 ? (
          <p className="text-xl text-gray-500 text-center py-4">אין תרופות מתוכננות להיום</p>
        ) : (
          <div className="space-y-3">
            {todayMeds.map((med, i) => {
              const [h, m] = med.time.split(':').map(Number)
              const medTime = new Date(now); medTime.setHours(h, m, 0, 0)
              const isPast = medTime < now
              const isSoon = !isPast && (medTime.getTime() - now.getTime()) < 30 * 60 * 1000
              return (
                <div
                  key={`${med.id}-${i}`}
                  className={`flex items-center justify-between p-4 rounded-2xl text-xl font-semibold
                    ${isPast ? 'bg-green-50 text-green-700' : isSoon ? 'bg-orange-50 text-orange-700 border-2 border-orange-300' : 'bg-blue-50 text-blue-700'}`}
                >
                  <span>{med.name}</span>
                  <span className="text-2xl font-bold">{med.time}</span>
                  {isPast ? <span>✅</span> : isSoon ? <span>⏰</span> : null}
                </div>
              )
            })}
          </div>
        )}
      </div>

    </div>
  )
}

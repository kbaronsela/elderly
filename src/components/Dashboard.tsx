import { useEffect, useState } from 'react'
import { useStore } from '../store/useStore'
import { formatDateHe, formatTimeHe } from '../utils/dateHe'

export default function Dashboard() {
  const { currentUser, getElderlyData, setScreen } = useStore()
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 30000)
    return () => clearInterval(interval)
  }, [])

  if (!currentUser || currentUser.role !== 'elderly') return null
  const { medications, calendarEvents } = getElderlyData(currentUser.id)

  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

  const todayMeds = medications
    .filter(m => m.active && (m.days.length === 0 || m.days.includes(now.getDay())))
    .flatMap(m => m.times.map(t => ({ time: t, name: m.name, id: m.id })))
    .sort((a, b) => a.time.localeCompare(b.time))

  const todayEvents = calendarEvents.filter(e => e.date === todayStr)

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

      {/* Quick buttons */}
      <div className="grid grid-cols-2 gap-4">
        {[
          { screen: 'medications' as const, icon: '💊', label: 'ניהול תרופות', color: 'purple' },
          { screen: 'family' as const, icon: '👨‍👩‍👧', label: 'בני משפחה', color: 'green' },
          { screen: 'calendar' as const, icon: '📅', label: 'לוח שנה', color: 'yellow' },
          { screen: 'settings' as const, icon: '⚙️', label: 'הגדרות', color: 'gray' },
        ].map(({ screen, icon, label, color }) => (
          <button
            key={screen}
            onClick={() => setScreen(screen)}
            className={`bg-${color}-100 hover:bg-${color}-200 rounded-3xl p-6 text-center transition-all active:scale-95`}
          >
            <div className="text-5xl mb-2">{icon}</div>
            <div className={`text-xl font-bold text-${color}-700`}>{label}</div>
          </button>
        ))}
      </div>
    </div>
  )
}

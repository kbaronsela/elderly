import { useStore } from '../store/useStore'
import { formatDateHe } from '../utils/dateHe'

interface Props {
  onClose: () => void
}

export default function MorningGreeting({ onClose }: Props) {
  const { currentUser, getElderlyData } = useStore()
  if (!currentUser || currentUser.role !== 'elderly') return null

  const now = new Date()
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  const { calendarEvents } = getElderlyData(currentUser.id)
  const todayEvents = calendarEvents.filter(e => e.date === todayStr)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-b from-orange-100 to-yellow-50 p-6">
      <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-lg text-center">
        <div className="text-7xl mb-4">🌅</div>
        <h1 className="text-4xl font-black text-orange-600 mb-2">
          בוקר טוב, {currentUser.name}!
        </h1>
        <p className="text-2xl text-gray-600 mb-6">{formatDateHe(now)}</p>

        {todayEvents.length > 0 && (
          <div className="bg-yellow-50 border-2 border-yellow-300 rounded-2xl p-5 mb-6 text-right">
            <h2 className="text-xl font-bold text-yellow-800 mb-3">📅 מה יש היום:</h2>
            <div className="space-y-2">
              {todayEvents.map(ev => (
                <div key={ev.id} className="flex items-center gap-3 text-xl text-yellow-900">
                  <span>{ev.isBirthday ? '🎂' : ev.isHoliday ? '🎉' : '📌'}</span>
                  <span>
                    {ev.isBirthday
                      ? `היום יום ההולדת של ${ev.title}!`
                      : ev.isHoliday
                      ? `היום ${ev.title}`
                      : ev.time
                      ? `בשעה ${ev.time} – ${ev.title}`
                      : ev.title}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {todayEvents.length === 0 && (
          <p className="text-xl text-gray-500 mb-6">אין אירועים מיוחדים היום. יום נעים! 😊</p>
        )}

        <button onClick={onClose} className="btn-big w-full bg-orange-500 hover:bg-orange-600 text-white shadow-lg">
          תודה, בוקר טוב! ☀️
        </button>
      </div>
    </div>
  )
}

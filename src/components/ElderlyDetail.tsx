import { useState } from 'react'
import { useStore } from '../store/useStore'
import { DAYS_HE, MONTHS_HE } from '../utils/dateHe'
import AvatarPicker from './AvatarPicker'

const TABS = ['תרופות', 'היסטוריה', 'יומן'] as const
type Tab = typeof TABS[number]

export default function ElderlyDetail() {
  const { viewingElderlyId, allUsers, getElderlyData, setScreen, setViewingElderlyId, updateElderlyAvatar } = useStore()
  const [tab, setTab] = useState<Tab>('תרופות')
  const [showAvatarPicker, setShowAvatarPicker] = useState(false)

  const elderly = allUsers.find(u => u.id === viewingElderlyId)
  if (!elderly) return null
  const data = getElderlyData(elderly.id)

  const now = new Date()
  const todayStr = now.toISOString().slice(0, 10)

  function back() { setScreen('family-dashboard'); setViewingElderlyId(null) }

  // ── Medications tab ───────────────────────────────────────────────────────
  function MedsTab() {
    const todayMeds = data.medications
      .filter(m => m.active && (m.days.length === 0 || m.days.includes(now.getDay())))
      .flatMap(m => m.times.map(t => ({ time: t, name: m.name, id: m.id, notes: m.notes })))
      .sort((a, b) => a.time.localeCompare(b.time))

    const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`

    // Which were taken today?
    const todayLogs = data.medicationLogs.filter(l => l.scheduledTime?.startsWith(todayStr))
    const takenNames = new Set(todayLogs.flatMap(l => l.medicationNames))

    return (
      <div className="space-y-4">
        <h3 className="text-xl font-bold text-gray-600 mb-3">לוח התרופות של היום</h3>
        {todayMeds.length === 0 && (
          <p className="text-lg text-gray-400 text-center py-6">אין תרופות מתוכננות להיום</p>
        )}
        {todayMeds.map((med, i) => {
          const isPast = med.time <= hhmm
          const taken = takenNames.has(med.name)
          return (
            <div key={`${med.id}-${i}`} className={`rounded-2xl p-4 flex items-center justify-between
              ${taken ? 'bg-green-50 border-2 border-green-200' :
                isPast ? 'bg-red-50 border-2 border-red-200' :
                'bg-blue-50 border-2 border-blue-100'}`}>
              <div>
                <p className="text-xl font-bold text-gray-800">💊 {med.name}</p>
                {med.notes && <p className="text-base text-gray-500">{med.notes}</p>}
              </div>
              <div className="text-right">
                <p className="text-2xl font-black text-gray-700">{med.time}</p>
                <p className={`text-base font-bold ${taken ? 'text-green-600' : isPast ? 'text-red-500' : 'text-blue-500'}`}>
                  {taken ? '✅ נלקח' : isPast ? '⚠️ לא נלקח' : '⏳ ממתין'}
                </p>
              </div>
            </div>
          )
        })}

        <h3 className="text-xl font-bold text-gray-600 mt-6 mb-3">כל התרופות הפעילות</h3>
        {data.medications.filter(m => m.active).map(med => (
          <div key={med.id} className="bg-white rounded-2xl p-4 shadow">
            <div className="flex justify-between">
              <p className="text-xl font-bold text-gray-800">{med.name}</p>
              <div className="flex flex-wrap gap-1 justify-end">
                {med.times.map(t => (
                  <span key={t} className="bg-blue-100 text-blue-700 text-base font-bold px-3 py-0.5 rounded-full">{t}</span>
                ))}
              </div>
            </div>
            {med.notes && <p className="text-gray-500 text-base mt-1">{med.notes}</p>}
            <p className="text-gray-400 text-base mt-1">
              {med.days.length === 0 ? 'כל יום' : med.days.map(d => DAYS_HE[d]).join(', ')}
            </p>
          </div>
        ))}
      </div>
    )
  }

  // ── History tab ───────────────────────────────────────────────────────────
  function HistoryTab() {
    const logs = [...data.medicationLogs]
      .filter(l => l.takenAt)
      .sort((a, b) => (b.takenAt ?? '').localeCompare(a.takenAt ?? ''))
      .slice(0, 50)

    // Group by date
    const grouped: Record<string, typeof logs> = {}
    logs.forEach(l => {
      const date = l.takenAt!.slice(0, 10)
      if (!grouped[date]) grouped[date] = []
      grouped[date].push(l)
    })

    if (logs.length === 0) return (
      <p className="text-center text-xl text-gray-400 py-10">אין היסטוריה עדיין</p>
    )

    return (
      <div className="space-y-5">
        {Object.entries(grouped).map(([date, dayLogs]) => {
          const d = new Date(date + 'T12:00:00')
          const label = date === todayStr ? 'היום' :
            date === new Date(Date.now() - 86400000).toISOString().slice(0, 10) ? 'אתמול' :
            `${d.getDate()} ${MONTHS_HE[d.getMonth()]}`
          return (
            <div key={date}>
              <h3 className="text-xl font-bold text-gray-600 mb-2">📅 {label}</h3>
              <div className="space-y-2">
                {dayLogs.map(log => (
                  <div key={log.id} className="bg-white rounded-2xl p-4 shadow flex items-center gap-3">
                    <span className="text-2xl">✅</span>
                    <div className="flex-1">
                      <p className="text-xl font-semibold text-gray-800">{log.medicationNames.join(', ')}</p>
                      <p className="text-base text-gray-500">
                        נלקח בשעה {new Date(log.takenAt!).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                        {log.scheduledTime && ` (מתוכנן: ${log.scheduledTime.slice(11, 16)})`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  // ── Calendar tab ──────────────────────────────────────────────────────────
  function CalendarTab() {
    const upcoming = data.calendarEvents
      .filter(e => e.date >= todayStr)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 20)

    if (upcoming.length === 0) return (
      <p className="text-center text-xl text-gray-400 py-10">אין אירועים קרובים</p>
    )

    return (
      <div className="space-y-3">
        {upcoming.map(ev => {
          const d = new Date(ev.date + 'T12:00:00')
          return (
            <div key={ev.id} className="bg-white rounded-2xl p-4 shadow flex items-center gap-3">
              <span className="text-3xl">{ev.isBirthday ? '🎂' : ev.isHoliday ? '🎉' : '📌'}</span>
              <div>
                <p className="text-xl font-bold text-gray-800">{ev.title}</p>
                <p className="text-base text-gray-500">
                  {d.getDate()} {MONTHS_HE[d.getMonth()]} {d.getFullYear()}
                  {ev.time && ` בשעה ${ev.time}`}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 pb-24">
      {/* Header */}
      <div className="bg-white rounded-3xl shadow-lg p-5 mb-5">
        <div className="flex items-center gap-4 mb-3">
          <button onClick={back} className="text-3xl p-1 text-gray-500">→</button>
          <div className="relative flex-shrink-0">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-4xl">
              {elderly.avatar ?? '👴'}
            </div>
            <button
              onClick={() => setShowAvatarPicker(true)}
              className="absolute -bottom-1 -right-1 bg-white border-2 border-blue-200 rounded-full w-7 h-7 flex items-center justify-center text-sm shadow hover:bg-blue-50 active:scale-95"
              title="שנה תמונה"
            >✏️</button>
          </div>
          <div>
            <h1 className="text-3xl font-black text-gray-800">{elderly.name}</h1>
            <p className="text-lg text-gray-400">מעקב תרופות ויומן</p>
          </div>
        </div>

        {showAvatarPicker && (
          <AvatarPicker
            current={elderly.avatar ?? '👴'}
            onSelect={avatar => updateElderlyAvatar(elderly.id, avatar)}
            onClose={() => setShowAvatarPicker(false)}
          />
        )}

        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-3">
          {(() => {
            const todayMeds = data.medications
              .filter(m => m.active && (m.days.length === 0 || m.days.includes(now.getDay())))
            const todayLogs = data.medicationLogs.filter(l => l.takenAt?.startsWith(todayStr))
            const lastLog = [...data.medicationLogs]
              .filter(l => l.takenAt)
              .sort((a, b) => (b.takenAt ?? '').localeCompare(a.takenAt ?? ''))[0]
            const lastTakenTime = lastLog?.takenAt
              ? new Date(lastLog.takenAt).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })
              : '—'
            return (
              <>
                <div className="bg-blue-50 rounded-2xl p-3 text-center">
                  <p className="text-3xl font-black text-blue-700">{todayMeds.length}</p>
                  <p className="text-sm text-blue-500">תרופות היום</p>
                </div>
                <div className="bg-green-50 rounded-2xl p-3 text-center">
                  <p className="text-3xl font-black text-green-700">{todayLogs.length}</p>
                  <p className="text-sm text-green-500">נלקחו היום</p>
                </div>
                <div className="bg-purple-50 rounded-2xl p-3 text-center">
                  <p className="text-lg font-black text-purple-700">{lastTakenTime}</p>
                  <p className="text-sm text-purple-500">נלקח לאחרונה</p>
                </div>
              </>
            )
          })()}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex rounded-2xl bg-white shadow p-1 mb-5 gap-1">
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-3 rounded-xl text-xl font-bold transition-all ${tab === t ? 'bg-blue-600 text-white shadow' : 'text-gray-500'}`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'תרופות' && <MedsTab />}
      {tab === 'היסטוריה' && <HistoryTab />}
      {tab === 'יומן' && <CalendarTab />}
    </div>
  )
}

import { useState } from 'react'
import { useStore } from '../store/useStore'
import type { CalendarEvent } from '../types'

const MONTHS_HE = ['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר']

const emptyEvent: Omit<CalendarEvent, 'id'> = {
  title: '', date: new Date().toISOString().slice(0, 10), time: '', isHoliday: false, isBirthday: false,
}

export default function CalendarPage() {
  const { currentUser, getElderlyData, addCalendarEvent, setCalendarEvents, setScreen } = useStore()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<Omit<CalendarEvent, 'id'>>(emptyEvent)
  const [gcalNote, setGcalNote] = useState(false)

  if (!currentUser || currentUser.role !== 'elderly') return null
  const { calendarEvents } = getElderlyData(currentUser.id)
  const sorted = [...calendarEvents].sort((a, b) => a.date.localeCompare(b.date))

  const grouped: Record<string, CalendarEvent[]> = {}
  sorted.forEach(ev => {
    const month = ev.date.slice(0, 7)
    if (!grouped[month]) grouped[month] = []
    grouped[month].push(ev)
  })

  function formatEventDate(dateStr: string) {
    const d = new Date(dateStr + 'T12:00:00')
    return `${d.getDate()} ${MONTHS_HE[d.getMonth()]} ${d.getFullYear()}`
  }

  function deleteEvent(id: string) {
    setCalendarEvents(calendarEvents.filter(e => e.id !== id))
  }

  function save() {
    if (!form.title.trim() || !form.date) return
    addCalendarEvent(form)
    setShowForm(false)
    setForm(emptyEvent)
  }

  return (
    <div className="min-h-screen bg-yellow-50 p-4 pb-28">
      <div className="flex items-center mb-6">
        <button onClick={() => setScreen('dashboard')} className="text-3xl p-2 text-yellow-700">→</button>
        <h1 className="text-3xl font-black text-yellow-800 mr-2">📅 לוח שנה</h1>
      </div>

      <div className="bg-white rounded-3xl shadow p-5 mb-5">
        <h2 className="text-xl font-bold text-gray-700 mb-3">🔗 חיבור לגוגל קלנדר</h2>
        {gcalNote ? (
          <div className="bg-blue-50 rounded-2xl p-4 text-lg text-blue-800">
            <p className="font-bold mb-1">איך מחברים:</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>פתח Google Calendar במחשב</li>
              <li>ייצא אירועים חשובים לפורמט ICS</li>
              <li>הוסף ידנית אירועים חשובים כאן למטה</li>
            </ol>
            <p className="mt-3 text-gray-500 text-base">חיבור מלא דורש שרת – כרגע ניתן להוסיף ידנית.</p>
            <button onClick={() => setGcalNote(false)} className="mt-3 text-blue-600 font-bold">סגור</button>
          </div>
        ) : (
          <button onClick={() => setGcalNote(true)}
            className="w-full bg-blue-600 text-white font-bold text-xl py-4 rounded-2xl hover:bg-blue-700 active:scale-95 transition-all">
            📲 חיבור לגוגל קלנדר
          </button>
        )}
      </div>

      <button onClick={() => { setForm(emptyEvent); setShowForm(true) }}
        className="btn-big w-full bg-yellow-500 text-white mb-6 shadow">
        ➕ הוסף אירוע
      </button>

      {sorted.length === 0 && (
        <div className="text-center text-xl text-gray-500 py-10">
          <div className="text-6xl mb-4">📅</div>
          <p>אין אירועים בלוח השנה</p>
        </div>
      )}

      {Object.entries(grouped).map(([month, events]) => {
        const [y, m] = month.split('-')
        return (
          <div key={month} className="mb-6">
            <h3 className="text-xl font-bold text-yellow-800 mb-3">{MONTHS_HE[parseInt(m) - 1]} {y}</h3>
            <div className="space-y-3">
              {events.map(ev => {
                const isPast = ev.date < new Date().toISOString().slice(0, 10)
                return (
                  <div key={ev.id} className={`bg-white rounded-2xl p-4 shadow flex items-center justify-between ${isPast ? 'opacity-60' : ''}`}>
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{ev.isBirthday ? '🎂' : ev.isHoliday ? '🎉' : '📌'}</span>
                      <div>
                        <p className="text-xl font-bold text-gray-800">{ev.title}</p>
                        <p className="text-lg text-gray-500">{formatEventDate(ev.date)}{ev.time && ` בשעה ${ev.time}`}</p>
                      </div>
                    </div>
                    <button onClick={() => deleteEvent(ev.id)} className="text-red-400 text-2xl p-2 hover:text-red-600">🗑️</button>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}

      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end justify-center">
          <div className="bg-white rounded-t-3xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-black text-yellow-800 mb-5">אירוע חדש</h2>

            <label className="block text-xl font-semibold text-gray-700 mb-1">כותרת *</label>
            <input type="text" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="למשל: פגישה עם הרופא"
              className="w-full border-2 border-yellow-200 rounded-xl p-4 text-xl mb-4 focus:border-yellow-500 outline-none" />

            <label className="block text-xl font-semibold text-gray-700 mb-1">תאריך *</label>
            <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
              className="w-full border-2 border-yellow-200 rounded-xl p-4 text-xl mb-4 focus:border-yellow-500 outline-none" dir="ltr" />

            <label className="block text-xl font-semibold text-gray-700 mb-1">שעה (אופציונלי)</label>
            <input type="time" value={form.time ?? ''} onChange={e => setForm(f => ({ ...f, time: e.target.value }))}
              className="w-full border-2 border-yellow-200 rounded-xl p-4 text-xl mb-4 focus:border-yellow-500 outline-none" dir="ltr" />

            <div className="flex gap-4 mb-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.isBirthday} onChange={e => setForm(f => ({ ...f, isBirthday: e.target.checked, isHoliday: false }))} className="w-6 h-6" />
                <span className="text-xl">🎂 יום הולדת</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.isHoliday} onChange={e => setForm(f => ({ ...f, isHoliday: e.target.checked, isBirthday: false }))} className="w-6 h-6" />
                <span className="text-xl">🎉 חג</span>
              </label>
            </div>

            <div className="flex gap-3">
              <button onClick={save} className="flex-1 btn-big bg-yellow-500 text-white">💾 שמור</button>
              <button onClick={() => setShowForm(false)} className="flex-1 btn-big bg-gray-200 text-gray-700">ביטול</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

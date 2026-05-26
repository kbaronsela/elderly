import { useEffect, useRef, useState } from 'react'
import { useStore } from '../store/useStore'
import type { CalendarEvent } from '../types'
import { parseIcs, exportToIcs, downloadIcs } from '../utils/ics'
import { fetchIsraeliHolidays } from '../utils/holidays'
import type { IsraeliHoliday } from '../utils/holidays'

const MONTHS_HE = ['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר']

const emptyEvent: Omit<CalendarEvent, 'id'> = {
  title: '', date: new Date().toISOString().slice(0, 10), time: '', isHoliday: false, isBirthday: false,
}

export default function CalendarPage() {
  const { currentUser, getElderlyData, addCalendarEvent, setCalendarEvents, setScreen } = useStore()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<Omit<CalendarEvent, 'id'>>(emptyEvent)
  const [importMsg, setImportMsg] = useState('')
  const [showSyncHelp, setShowSyncHelp] = useState(false)
  const [israeliHolidays, setIsraeliHolidays] = useState<IsraeliHoliday[]>([])
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchIsraeliHolidays(new Date().getFullYear()).then(setIsraeliHolidays)
  }, [])

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

  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      const text = ev.target?.result as string
      const parsed = parseIcs(text)
      if (parsed.length === 0) {
        setImportMsg('⚠️ לא נמצאו אירועים בקובץ')
      } else {
        parsed.forEach(ev => addCalendarEvent(ev))
        setImportMsg(`✅ יובאו ${parsed.length} אירועים`)
      }
      setTimeout(() => setImportMsg(''), 3000)
    }
    reader.readAsText(file, 'UTF-8')
    e.target.value = ''
  }

  function handleExport() {
    const ics = exportToIcs(calendarEvents)
    downloadIcs(ics, 'my-calendar.ics')
  }

  return (
    <div className="min-h-screen bg-yellow-50 p-4 pb-28">
      <div className="flex items-center mb-6">
        <button onClick={() => setScreen('dashboard')} className="text-3xl p-2 text-yellow-700">→</button>
        <h1 className="text-3xl font-black text-yellow-800 mr-2">📅 לוח שנה</h1>
      </div>

      {/* Sync section */}
      <div className="bg-white rounded-3xl shadow p-5 mb-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-700">🔗 סנכרון לוח שנה</h2>
          <button onClick={() => setShowSyncHelp(v => !v)} className="text-blue-500 text-sm font-bold">
            {showSyncHelp ? 'סגור ✕' : 'איך? ❓'}
          </button>
        </div>

        {showSyncHelp && (
          <div className="bg-blue-50 rounded-2xl p-4 text-base text-blue-800 mb-4">
            <p className="font-bold mb-2">📥 יבוא מגוגל קלנדר:</p>
            <ol className="list-decimal list-inside space-y-1 mb-3">
              <li>פתח <strong>Google Calendar</strong> במחשב</li>
              <li>הגדרות ← לחץ על שם הלוח ← "ייצא לוח שנה"</li>
              <li>תקבל קובץ <strong>.ics</strong> – הכנס אותו כאן</li>
            </ol>
            <p className="font-bold mb-2">📤 ייצוא לגוגל קלנדר:</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>לחץ "ייצוא" למטה לקבלת קובץ .ics</li>
              <li>ב-Google Calendar: הגדרות ← "ייבוא"</li>
            </ol>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={() => fileRef.current?.click()}
            className="flex-1 bg-blue-600 text-white font-bold text-lg py-3 rounded-2xl hover:bg-blue-700 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            📥 יבוא .ics
          </button>
          <button
            onClick={handleExport}
            disabled={calendarEvents.length === 0}
            className="flex-1 bg-green-600 text-white font-bold text-lg py-3 rounded-2xl hover:bg-green-700 active:scale-95 transition-all disabled:opacity-40 flex items-center justify-center gap-2"
          >
            📤 ייצוא .ics
          </button>
        </div>

        <input ref={fileRef} type="file" accept=".ics" className="hidden" onChange={handleImport} />

        {importMsg && (
          <p className="text-center text-lg font-bold mt-3 text-green-700">{importMsg}</p>
        )}
      </div>

      <button onClick={() => { setForm(emptyEvent); setShowForm(true) }}
        className="btn-big w-full bg-yellow-500 text-white mb-6 shadow">
        ➕ הוסף אירוע
      </button>

      {/* Israeli holidays */}
      {israeliHolidays.length > 0 && (
        <div className="bg-white rounded-3xl shadow p-5 mb-5">
          <h2 className="text-xl font-bold text-indigo-700 mb-3">🇮🇱 חגים ישראליים – {new Date().getFullYear()}</h2>
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {[...israeliHolidays]
              .filter(h => h.date >= new Date().toISOString().slice(0, 10))
              .sort((a, b) => a.date.localeCompare(b.date))
              .map(h => {
              const d = new Date(h.date + 'T12:00:00')
              const todayStr = new Date().toISOString().slice(0, 10)
              const isToday = h.date === todayStr
              return (
                <div key={h.date + h.title} className={`flex items-center justify-between rounded-2xl px-4 py-2 ${isToday ? 'bg-blue-100 ring-2 ring-blue-400' : 'bg-gray-50'}`}>
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🇮🇱</span>
                    <span className={`text-lg ${isToday ? 'font-black text-blue-800' : 'text-gray-800'}`}>{h.hebrew}</span>
                    {isToday && <span className="text-blue-600 text-sm font-bold">היום!</span>}
                  </div>
                  <span className="text-base text-gray-500">
                    {d.getDate()}/{d.getMonth() + 1}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {sorted.length === 0 && (
        <div className="text-center text-xl text-gray-500 py-10">
          <div className="text-6xl mb-4">📅</div>
          <p>אין אירועים אישיים בלוח השנה</p>
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

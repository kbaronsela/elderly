import { useState } from 'react'
import { useStore } from '../store/useStore'
import type { Medication } from '../types'

const DAYS_SHORT = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש']
const DAYS_FULL = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת']

const emptyMed: Omit<Medication, 'id'> = {
  name: '',
  times: ['08:00'],
  days: [],
  notes: '',
  active: true,
}

export default function Medications() {
  const { currentUser, getElderlyData, addMedication, updateMedication, deleteMedication, setScreen } = useStore()
  const [editing, setEditing] = useState<string | null>(null)
  const [form, setForm] = useState<Omit<Medication, 'id'>>(emptyMed)
  const [showForm, setShowForm] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  if (!currentUser || currentUser.role !== 'elderly') return null
  const { medications } = getElderlyData(currentUser.id)

  function openNew() { setForm(emptyMed); setEditing(null); setShowForm(true) }
  function openEdit(med: Medication) {
    setForm({ name: med.name, times: [...med.times], days: [...med.days], notes: med.notes, active: med.active })
    setEditing(med.id); setShowForm(true)
  }
  function save() {
    if (!form.name.trim()) return
    if (editing) updateMedication(editing, form)
    else addMedication(form)
    setShowForm(false)
  }
  function addTime() { setForm(f => ({ ...f, times: [...f.times, '12:00'] })) }
  function removeTime(i: number) { setForm(f => ({ ...f, times: f.times.filter((_, idx) => idx !== i) })) }
  function setTime(i: number, val: string) { setForm(f => ({ ...f, times: f.times.map((t, idx) => idx === i ? val : t) })) }
  function toggleDay(d: number) {
    setForm(f => ({ ...f, days: f.days.includes(d) ? f.days.filter(x => x !== d) : [...f.days, d] }))
  }

  return (
    <div className="min-h-screen bg-blue-50 p-4 pb-28">
      <div className="flex items-center mb-6">
        <button onClick={() => setScreen('dashboard')} className="text-3xl p-2 text-blue-600">→</button>
        <h1 className="text-3xl font-black text-blue-800 mr-2">💊 ניהול תרופות</h1>
      </div>

      <button onClick={openNew} className="btn-big w-full bg-blue-600 text-white mb-6 shadow">
        ➕ הוסף תרופה חדשה
      </button>

      {medications.length === 0 && (
        <div className="text-center text-xl text-gray-500 py-10">
          <div className="text-6xl mb-4">💊</div>
          <p>עדיין לא הוספת תרופות</p>
        </div>
      )}

      <div className="space-y-4">
        {medications.map(med => (
          <div key={med.id} className={`bg-white rounded-2xl p-5 shadow ${!med.active ? 'opacity-50' : ''}`}>
            <div className="flex justify-between items-start mb-2">
              <div>
                <h3 className="text-2xl font-bold text-gray-800">{med.name}</h3>
                {med.notes && <p className="text-gray-500 text-lg">{med.notes}</p>}
              </div>
              <div
                onClick={() => updateMedication(med.id, { active: !med.active })}
                className={`w-14 h-8 rounded-full relative transition-colors cursor-pointer flex-shrink-0 ${med.active ? 'bg-green-500' : 'bg-gray-300'}`}
              >
                <div className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow transition-all ${med.active ? 'right-1' : 'left-1'}`} />
              </div>
            </div>
            <div className="flex flex-wrap gap-2 mb-2">
              {med.times.map(t => (
                <span key={t} className="bg-blue-100 text-blue-700 font-bold text-xl px-4 py-1 rounded-full">⏰ {t}</span>
              ))}
            </div>
            <div className="flex gap-1 mb-3">
              {med.days.length === 0
                ? <span className="text-gray-400 text-lg">כל יום</span>
                : DAYS_SHORT.map((d, i) => (
                  <span key={i} className={`px-2 py-1 rounded-lg text-lg font-bold ${med.days.includes(i) ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-300'}`}>{d}</span>
                ))
              }
            </div>
            {confirmDelete === med.id ? (
              <div className="bg-red-50 rounded-2xl p-3">
                <p className="text-lg font-bold text-red-700 mb-3 text-center">למחוק את "{med.name}"?</p>
                <div className="flex gap-2">
                  <button onClick={() => { deleteMedication(med.id); setConfirmDelete(null) }}
                    className="flex-1 bg-red-600 text-white font-bold text-lg py-2 rounded-xl hover:bg-red-700">
                    כן, מחק
                  </button>
                  <button onClick={() => setConfirmDelete(null)}
                    className="flex-1 bg-gray-200 text-gray-700 font-bold text-lg py-2 rounded-xl hover:bg-gray-300">
                    ביטול
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex gap-3">
                <button onClick={() => openEdit(med)} className="flex-1 bg-blue-50 text-blue-700 font-bold text-xl py-3 rounded-xl hover:bg-blue-100">✏️ ערוך</button>
                <button onClick={() => setConfirmDelete(med.id)} className="flex-1 bg-red-50 text-red-600 font-bold text-xl py-3 rounded-xl hover:bg-red-100">🗑️ מחק</button>
              </div>
            )}
          </div>
        ))}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end justify-center"
          onKeyDown={e => { if (e.key === 'Escape') setShowForm(false) }}>
          <div className="bg-white rounded-t-3xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-black text-blue-800 mb-5">{editing ? 'עריכת תרופה' : 'תרופה חדשה'}</h2>

            <label className="block text-xl font-semibold text-gray-700 mb-1">שם התרופה *</label>
            <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setShowForm(false) }}
              placeholder="למשל: אמלודיפין" autoFocus
              className="w-full border-2 border-blue-200 rounded-xl p-4 text-xl mb-4 focus:border-blue-500 outline-none" />

            <label className="block text-xl font-semibold text-gray-700 mb-1">הערות</label>
            <input type="text" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setShowForm(false) }}
              placeholder="למשל: עם אוכל"
              className="w-full border-2 border-blue-200 rounded-xl p-4 text-xl mb-4 focus:border-blue-500 outline-none" />

            <label className="block text-xl font-semibold text-gray-700 mb-2">שעות לקיחה</label>
            <div className="space-y-2 mb-3">
              {form.times.map((t, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <input type="time" value={t} onChange={e => setTime(i, e.target.value)}
                    className="border-2 border-blue-200 rounded-xl p-3 text-xl flex-1 focus:border-blue-500 outline-none" />
                  {form.times.length > 1 && (
                    <button onClick={() => removeTime(i)} className="text-red-500 text-2xl font-bold p-2">✕</button>
                  )}
                </div>
              ))}
            </div>
            <button onClick={addTime} className="text-blue-600 font-bold text-lg mb-5">➕ הוסף שעה</button>

            <label className="block text-xl font-semibold text-gray-700 mb-2">ימי לקיחה (ריק = כל יום)</label>
            <div className="flex gap-2 mb-6 flex-wrap">
              {DAYS_FULL.map((d, i) => (
                <button key={i} onClick={() => toggleDay(i)}
                  className={`px-4 py-2 rounded-xl text-lg font-bold border-2 transition-all
                    ${form.days.includes(i) ? 'bg-blue-500 text-white border-blue-500' : 'bg-white text-gray-600 border-gray-300'}`}>
                  {d}
                </button>
              ))}
            </div>

            <div className="flex gap-3">
              <button onClick={save} className="flex-1 btn-big bg-green-500 text-white">💾 שמור</button>
              <button onClick={() => setShowForm(false)} className="flex-1 btn-big bg-gray-200 text-gray-700">ביטול</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

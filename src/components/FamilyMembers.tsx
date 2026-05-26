import { useState } from 'react'
import { useStore } from '../store/useStore'
import type { FamilyMember } from '../types'

const RELATIONS = ['בן/בת', 'אח/אחות', 'נכד/נכדה', 'חבר/חברה', 'שכן/שכנה', 'מטפל/מטפלת', 'אחר']
const emptyMember: Omit<FamilyMember, 'id'> = { name: '', relation: 'בן/בת', phone: '', email: '', appUserId: '' }

export default function FamilyMembers() {
  const { currentUser, users, getElderlyData, addFamilyMember, updateFamilyMember, deleteFamilyMember, setScreen } = useStore()
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<string | null>(null)
  const [form, setForm] = useState<Omit<FamilyMember, 'id'>>(emptyMember)

  if (!currentUser || currentUser.role !== 'elderly') return null
  const { familyMembers } = getElderlyData(currentUser.id)

  function openNew() { setForm(emptyMember); setEditing(null); setShowForm(true) }
  function openEdit(m: FamilyMember) {
    setForm({ name: m.name, relation: m.relation, phone: m.phone, email: m.email ?? '', appUserId: m.appUserId ?? '' })
    setEditing(m.id); setShowForm(true)
  }
  function save() {
    if (!form.name.trim() || !form.phone.trim()) return
    if (editing) updateFamilyMember(editing, form)
    else addFamilyMember(form)
    setShowForm(false)
  }

  // Lookup registered app user for a contact
  function getAppUser(appUserId?: string) {
    if (!appUserId) return null
    return users.find(u => u.id === appUserId) ?? null
  }

  return (
    <div className="min-h-screen bg-green-50 p-4 pb-28">
      <div className="flex items-center mb-6">
        <button onClick={() => setScreen('dashboard')} className="text-3xl p-2 text-green-700">→</button>
        <h1 className="text-3xl font-black text-green-800 mr-2">👨‍👩‍👧 בני משפחה</h1>
      </div>

      {/* How family connects */}
      <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-4 mb-5 text-lg text-blue-800">
        <p className="font-bold mb-1">💡 כיצד בן משפחה מתחבר לאפליקציה?</p>
        <p>בן המשפחה נרשם כ"בן משפחה" ומזין את שם המשתמש שלך: <strong dir="ltr">{currentUser.username}</strong></p>
      </div>

      <button onClick={openNew} className="btn-big w-full bg-green-600 text-white mb-6 shadow">
        ➕ הוסף איש קשר
      </button>

      {familyMembers.length === 0 && (
        <div className="text-center text-xl text-gray-500 py-10">
          <div className="text-6xl mb-4">👪</div>
          <p>עדיין לא הוספת אנשי קשר</p>
        </div>
      )}

      <div className="space-y-4">
        {familyMembers.map(m => {
          const appUser = getAppUser(m.appUserId)
          return (
            <div key={m.id} className="bg-white rounded-2xl p-5 shadow">
              <div className="flex items-center gap-4 mb-3">
                <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center text-3xl">
                  {m.relation.includes('בן') || m.relation.includes('אח') ? '👨' : '👩'}
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-gray-800">{m.name}</h3>
                  <p className="text-lg text-gray-500">{m.relation}</p>
                </div>
                {appUser && (
                  <span className="bg-green-100 text-green-700 text-base font-bold px-3 py-1 rounded-full">✅ מחובר לאפליקציה</span>
                )}
              </div>
              <div className="space-y-1 text-xl text-gray-600 mb-4">
                <p>📞 {m.phone}</p>
                {m.email && <p>📧 {m.email}</p>}
                {appUser && <p className="text-green-600 text-base">👤 חשבון: {appUser.username}</p>}
              </div>
              <div className="flex gap-3">
                <button onClick={() => openEdit(m)} className="flex-1 bg-green-50 text-green-700 font-bold text-xl py-3 rounded-xl hover:bg-green-100">✏️ ערוך</button>
                <button onClick={() => deleteFamilyMember(m.id)} className="flex-1 bg-red-50 text-red-600 font-bold text-xl py-3 rounded-xl hover:bg-red-100">🗑️ מחק</button>
              </div>
            </div>
          )
        })}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end justify-center">
          <div className="bg-white rounded-t-3xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-black text-green-800 mb-5">{editing ? 'עריכה' : 'איש קשר חדש'}</h2>

            <label className="block text-xl font-semibold text-gray-700 mb-1">שם מלא *</label>
            <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="שם מלא"
              className="w-full border-2 border-green-200 rounded-xl p-4 text-xl mb-4 focus:border-green-500 outline-none" />

            <label className="block text-xl font-semibold text-gray-700 mb-1">קשר משפחתי</label>
            <select value={form.relation} onChange={e => setForm(f => ({ ...f, relation: e.target.value }))}
              className="w-full border-2 border-green-200 rounded-xl p-4 text-xl mb-4 focus:border-green-500 outline-none bg-white">
              {RELATIONS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>

            <label className="block text-xl font-semibold text-gray-700 mb-1">טלפון (WhatsApp) *</label>
            <input type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
              placeholder="+972501234567"
              className="w-full border-2 border-green-200 rounded-xl p-4 text-xl mb-1 focus:border-green-500 outline-none" dir="ltr" />
            <p className="text-gray-400 text-base mb-4">כולל קידומת מדינה, למשל: +972501234567</p>

            <label className="block text-xl font-semibold text-gray-700 mb-1">דוא"ל (אופציונלי)</label>
            <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              placeholder="email@example.com"
              className="w-full border-2 border-green-200 rounded-xl p-4 text-xl mb-6 focus:border-green-500 outline-none" dir="ltr" />

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

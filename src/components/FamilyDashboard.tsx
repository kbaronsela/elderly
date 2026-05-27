import { useEffect, useState } from 'react'
import { useStore } from '../store/useStore'
import { formatDateHe } from '../utils/dateHe'
import { supabase } from '../lib/supabase'
import { subscribeToPush } from '../utils/pushSubscription'
import type { User } from '../types'

export default function FamilyDashboard() {
  const { currentUser, getLinkedElderlyUsers, getElderlyData, linkToElderly, updateUser, unlinkFromElderly, setScreen, setViewingElderlyId, logout } = useStore()
  const [confirmUnlink, setConfirmUnlink] = useState<string | null>(null)
  const [pushStatus, setPushStatus] = useState<'idle' | 'subscribed' | 'denied'>('idle')
  const [linkUsername, setLinkUsername] = useState('')
  const [linkError, setLinkError] = useState('')
  const [linkSuccess, setLinkSuccess] = useState('')
  const [showLinkForm, setShowLinkForm] = useState(false)
  const [showPhoneEdit, setShowPhoneEdit] = useState(false)
  const [phoneInput, setPhoneInput] = useState(currentUser?.phone ?? '')

  // Subscribe to push notifications automatically on first load
  useEffect(() => {
    if (!currentUser || currentUser.role !== 'family') return
    if (Notification.permission === 'granted') {
      setPushStatus('subscribed')
      subscribeToPush(currentUser.id)
      return
    }
    if (Notification.permission === 'denied') {
      setPushStatus('denied')
    }
  }, [currentUser?.id])

  async function enablePush() {
    if (!currentUser) return
    const ok = await subscribeToPush(currentUser.id)
    setPushStatus(ok ? 'subscribed' : 'denied')
  }

  async function savePhone() {
    await updateUser({ phone: phoneInput.trim() })
    setShowPhoneEdit(false)
  }

  // ── Supabase Realtime: get notified when linked elderly takes medication ────
  useEffect(() => {
    if (!currentUser || currentUser.role !== 'family') return
    const linkedIds = currentUser.linkedElderlyIds ?? []
    if (linkedIds.length === 0) return

    const channel = supabase
      .channel('family-med-logs')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'medication_logs',
        filter: linkedIds.length === 1
          ? `elderly_user_id=eq.${linkedIds[0]}`
          : undefined,
      }, payload => {
        const row = payload.new as { elderly_user_id: string; medication_names: string[]; taken_at: string }
        if (!linkedIds.includes(row.elderly_user_id)) return

        // Show system notification
        const elderlyUser = getLinkedElderlyUsers().find(u => u.id === row.elderly_user_id)
        const name = elderlyUser?.name ?? 'הקשיש'
        const meds = (row.medication_names ?? []).join(', ')
        const time = new Date(row.taken_at).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })

        if (Notification.permission === 'granted') {
          navigator.serviceWorker?.ready.then(reg => {
            reg.showNotification(`✅ ${name} לקח/ה תרופות`, {
              body: `${meds} – שעה ${time}`,
              icon: '/icons/icon-192.png',
              tag: `med-taken-${row.elderly_user_id}-${time}`,
            })
          })
        }

        // Also refresh local data so dashboard updates live
        useStore.getState().initSession()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [currentUser?.id, (currentUser?.linkedElderlyIds ?? []).join(',')])

  if (!currentUser || currentUser.role !== 'family') return null
  const linkedElderly = getLinkedElderlyUsers()

  async function handleLink() {
    setLinkError('')
    setLinkSuccess('')
    if (!linkUsername.trim()) { setLinkError('הכנס שם משתמש'); return }
    const ok = await linkToElderly(linkUsername.trim())
    if (!ok) {
      setLinkError('לא נמצא משתמש קשיש עם שם זה')
    } else {
      setLinkSuccess('✅ חיבור בוצע בהצלחה!')
      setLinkUsername('')
      setTimeout(() => { setLinkSuccess(''); setShowLinkForm(false) }, 2000)
    }
  }

  function openElderly(u: User) {
    setViewingElderlyId(u.id)
    setScreen('elderly-detail')
  }

  const now = new Date()
  const todayStr = now.toISOString().slice(0, 10)

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-emerald-50 p-4 pb-24">
      {/* Header */}
      <div className="bg-white rounded-3xl shadow-lg p-6 mb-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-2xl font-black text-green-700">שלום, {currentUser.name}! 👋</p>
            <p className="text-lg text-gray-500">{formatDateHe(now)}</p>
          </div>
          <button onClick={logout} className="text-gray-400 text-sm font-bold px-3 py-2 hover:text-red-500">יציאה</button>
        </div>

        {/* Phone section */}
        {!showPhoneEdit ? (
          <button
            onClick={() => { setPhoneInput(currentUser.phone ?? ''); setShowPhoneEdit(true) }}
            className="flex items-center gap-2 text-base text-gray-500 hover:text-green-700 transition-colors"
          >
            <span>📱</span>
            <span>{currentUser.phone ? currentUser.phone : 'הוסף מספר טלפון לעדכוני וואטסאפ'}</span>
            <span className="text-green-600 font-bold text-sm">{currentUser.phone ? '✏️ ערוך' : '➕ הוסף'}</span>
          </button>
        ) : (
          <div className="mt-2">
            <input
              type="tel"
              value={phoneInput}
              onChange={e => setPhoneInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') savePhone(); if (e.key === 'Escape') setShowPhoneEdit(false) }}
              placeholder="050-0000000"
              className="w-full border-2 border-green-300 rounded-xl p-3 text-lg focus:border-green-500 outline-none mb-2"
              dir="ltr"
              autoFocus
            />
            <div className="flex gap-2">
              <button onClick={savePhone} className="flex-1 bg-green-600 text-white font-bold py-2 rounded-xl text-lg hover:bg-green-700">
                שמור
              </button>
              <button onClick={() => setShowPhoneEdit(false)} className="flex-1 bg-gray-100 text-gray-600 font-bold py-2 rounded-xl text-lg hover:bg-gray-200">
                ביטול
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Push notification banner */}
      {pushStatus === 'idle' && Notification.permission === 'default' && (
        <div className="bg-blue-50 border-2 border-blue-200 rounded-3xl p-4 mb-5 flex items-center justify-between gap-3">
          <div>
            <p className="text-lg font-bold text-blue-800">🔔 קבל התראות כשהקשיש לוקח תרופה</p>
            <p className="text-base text-blue-600">גם כשהאפליקציה סגורה</p>
          </div>
          <button onClick={enablePush} className="bg-blue-600 text-white font-bold px-4 py-2 rounded-2xl text-base whitespace-nowrap hover:bg-blue-700">
            הפעל
          </button>
        </div>
      )}
      {pushStatus === 'subscribed' && (
        <div className="bg-green-50 border-2 border-green-200 rounded-3xl p-3 mb-5 text-center text-green-700 font-semibold text-base">
          🔔 התראות פעילות – תקבל עדכון כשהקשיש לוקח תרופה
        </div>
      )}
      {pushStatus === 'denied' && (
        <div className="bg-orange-50 border-2 border-orange-200 rounded-3xl p-3 mb-5 text-center text-orange-700 font-semibold text-base">
          🔕 התראות חסומות – הפעל בהגדרות הדפדפן
        </div>
      )}

      {/* Link to elderly */}
      <div className="bg-white rounded-3xl shadow p-5 mb-5">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xl font-bold text-gray-700">🔗 התחבר לקרוב משפחה</h2>
          <button onClick={() => setShowLinkForm(v => !v)} className="text-blue-600 font-bold text-lg">
            {showLinkForm ? 'סגור ✕' : 'הוסף ➕'}
          </button>
        </div>
        {showLinkForm && (
          <div className="mt-3">
            <p className="text-lg text-gray-500 mb-3">הכנס את שם המשתמש של הקשיש באפליקציה:</p>
            <input
              type="text"
              value={linkUsername}
              onChange={e => setLinkUsername(e.target.value.toLowerCase())}
              onKeyDown={e => e.key === 'Enter' && handleLink()}
              placeholder="שם משתמש של הקשיש"
              className="w-full border-2 border-green-200 rounded-xl p-3 text-xl focus:border-green-500 outline-none mb-3"
              dir="ltr"
            />
            <button onClick={handleLink} className="w-full bg-green-600 text-white font-bold text-xl py-3 rounded-xl hover:bg-green-700 active:scale-95">
              🔗 חיבור
            </button>
            {linkError && <p className="text-red-500 text-lg mt-2">⚠️ {linkError}</p>}
            {linkSuccess && <p className="text-green-600 text-lg mt-2 font-bold">{linkSuccess}</p>}
          </div>
        )}
      </div>

      {/* Linked elderly list */}
      <h2 className="text-2xl font-bold text-gray-700 mb-4">
        {linkedElderly.length === 0 ? 'עדיין לא מחובר לאף קשיש' : `מעקב אחר ${linkedElderly.length} ${linkedElderly.length === 1 ? 'קשיש' : 'קשישים'}`}
      </h2>

      {linkedElderly.length === 0 && (
      <div className="text-center text-xl text-gray-400 py-12">
        <div className="text-7xl mb-4">👴👵</div>
          <p>לחץ "הוסף" כדי להתחבר לקרוב משפחה</p>
        </div>
      )}

      <div className="space-y-4">
        {linkedElderly.map(elderly => {
          const data = getElderlyData(elderly.id)
          const todayMeds = data.medications
            .filter(m => m.active && (m.days.length === 0 || m.days.includes(now.getDay())))
          const todayLogs = data.medicationLogs.filter(l => l.takenAt?.startsWith(todayStr))
          const allTaken = todayMeds.length > 0 && todayLogs.length >= todayMeds.length

          // Next medication today
          const hhmm = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`
          const upcoming = todayMeds
            .flatMap(m => m.times.map(t => ({ name: m.name, time: t })))
            .filter(x => x.time > hhmm)
            .sort((a, b) => a.time.localeCompare(b.time))

          // Last taken log
          const lastLog = [...data.medicationLogs]
            .filter(l => l.takenAt)
            .sort((a, b) => (b.takenAt ?? '').localeCompare(a.takenAt ?? ''))[0]

          return (
            <div key={elderly.id} className="bg-white rounded-3xl shadow-lg overflow-hidden border-2 border-transparent">

              {/* Unlink confirm bar */}
              {confirmUnlink === elderly.id && (
                <div className="bg-red-50 border-b border-red-200 p-4 flex items-center justify-between">
                  <p className="text-lg text-red-700 font-bold">להתנתק מ-{elderly.name}?</p>
                  <div className="flex gap-2">
                    <button onClick={() => { unlinkFromElderly(elderly.id); setConfirmUnlink(null) }}
                      className="bg-red-600 text-white font-bold px-4 py-2 rounded-xl text-base">כן, נתק</button>
                    <button onClick={() => setConfirmUnlink(null)}
                      className="bg-gray-200 text-gray-700 font-bold px-4 py-2 rounded-xl text-base">ביטול</button>
                  </div>
                </div>
              )}

              <div
                onClick={() => openElderly(elderly)}
                className="p-5 cursor-pointer hover:shadow-xl transition-all active:scale-98"
              >
              {/* Name & status badge */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center text-3xl">{elderly.avatar ?? '👴'}</div>
                  <div>
                    <h3 className="text-2xl font-black text-gray-800">{elderly.name}</h3>
                    <p className="text-base text-gray-400">לחץ לפרטים מלאים</p>
                  </div>
                </div>
                <div className={`px-4 py-2 rounded-2xl text-base font-bold ${
                  todayMeds.length === 0 ? 'bg-gray-100 text-gray-500' :
                  allTaken ? 'bg-green-100 text-green-700' :
                  todayLogs.length > 0 ? 'bg-yellow-100 text-yellow-700' :
                  'bg-red-100 text-red-600'
                }`}>
                  {todayMeds.length === 0 ? 'אין תרופות' :
                   allTaken ? '✅ לקח הכל' :
                   todayLogs.length > 0 ? `⏳ ${todayLogs.length}/${todayMeds.length}` :
                   '⚠️ טרם לקח'}
                </div>
              </div>

              {/* Last taken */}
              {lastLog?.takenAt && (
                <div className="bg-green-50 rounded-2xl p-3 mb-3 flex items-center gap-2">
                  <span className="text-xl">✅</span>
                  <div>
                    <p className="text-lg font-semibold text-green-800">
                      לקח: {lastLog.medicationNames.join(', ')}
                    </p>
                    <p className="text-base text-green-600">
                      {new Date(lastLog.takenAt).toLocaleDateString('he-IL')} בשעה {new Date(lastLog.takenAt).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              )}

              {/* Upcoming medication */}
              {upcoming.length > 0 && (
                <div className="bg-orange-50 rounded-2xl p-3 flex items-center gap-2">
                  <span className="text-xl">⏰</span>
                  <p className="text-lg text-orange-800">
                    הבא: <strong>{upcoming[0].name}</strong> בשעה {upcoming[0].time}
                  </p>
                </div>
              )}
              </div>

              {/* Unlink button */}
              <button
                onClick={e => { e.stopPropagation(); setConfirmUnlink(elderly.id) }}
                className="w-full text-center text-sm text-red-400 hover:text-red-600 py-2 border-t border-gray-100 font-medium"
              >
                🔗 התנתק מ-{elderly.name}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

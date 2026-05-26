import { useEffect, useRef, useState } from 'react'
import { useStore } from '../store/useStore'
import { playAlarmSound, playSuccessSound } from '../utils/sound'
import { buildMedicationTakenMessage, notifyFamilyWhatsApp } from '../utils/messaging'
import type { AlarmEvent } from '../types'

interface Props {
  alarm: AlarmEvent
}

export default function AlarmModal({ alarm }: Props) {
  const { currentUser, getElderlyData, logMedicationTaken, triggerAlarm } = useStore()
  const [secondsLeft, setSecondsLeft] = useState(600)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    playAlarmSound()
    const soundInterval = setInterval(() => playAlarmSound(), 10000)
    return () => clearInterval(soundInterval)
  }, [])

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 1) {
          clearInterval(intervalRef.current!)
          retryRef.current = setTimeout(() => {
            triggerAlarm({ ...alarm, id: alarm.id + '_retry' })
          }, 100)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => {
      clearInterval(intervalRef.current!)
      clearTimeout(retryRef.current!)
    }
  }, [alarm, triggerAlarm])

  function handleTaken() {
    playSuccessSound()
    logMedicationTaken(alarm)

    // WhatsApp to contacts with phone numbers (auto-open; user just taps Send in WhatsApp)
    const data = getElderlyData(alarm.elderlyUserId)
    const phoneContacts = data.familyMembers.filter(m => m.phone?.trim())
    if (phoneContacts.length > 0) {
      const timeStr = new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })
      const msg = buildMedicationTakenMessage(currentUser?.name ?? '', alarm.medicationNames, timeStr)
      // Small delay so the alarm modal can close first, then open WhatsApp
      setTimeout(() => notifyFamilyWhatsApp(phoneContacts, msg), 500)
    }
    // App-users: notified automatically via Supabase Realtime (no action needed)
  }

  const mins = Math.floor(secondsLeft / 60)
  const secs = secondsLeft % 60
  const urgency = secondsLeft < 120

  // Show linked family app-users count
  const linkedFamilyCount = (currentUser?.linkedFamilyUserIds ?? []).length
  const familyPhoneCount = getElderlyData(alarm.elderlyUserId).familyMembers.length

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div
        className={`bg-white rounded-3xl w-full max-w-md p-8 text-center shadow-2xl
          ${urgency ? 'alarm-pulse border-4 border-red-500' : 'border-4 border-orange-400'}`}
      >
        <div className="text-8xl mb-4 animate-bounce">🔔</div>
        <h1 className="text-3xl font-black text-red-600 mb-2">הגיע הזמן לקחת תרופות!</h1>

        <div className="bg-orange-50 rounded-2xl p-4 mb-6">
          {alarm.medicationNames.map((name, i) => (
            <p key={i} className="text-2xl font-bold text-orange-800">💊 {name}</p>
          ))}
          <p className="text-lg text-gray-500 mt-2">שעה מתוכננת: {alarm.scheduledTime}</p>
        </div>

        <p className={`text-xl mb-6 ${urgency ? 'text-red-600 font-bold' : 'text-gray-600'}`}>
          {secondsLeft > 0
            ? `תזכורת חוזרת בעוד ${mins}:${String(secs).padStart(2, '0')}`
            : 'שולח תזכורת חוזרת...'}
        </p>

        <button onClick={handleTaken} className="btn-big w-full bg-green-500 hover:bg-green-600 text-white shadow-lg mb-4">
          ✅ לקחתי את התרופות
        </button>

        {(linkedFamilyCount > 0 || familyPhoneCount > 0) && (
          <p className="text-gray-400 text-base">
            לאחר הלחיצה תישלח הודעה אוטומטית ל-
            {[
              familyPhoneCount > 0 ? `${familyPhoneCount} אנשי קשר (WhatsApp)` : '',
              linkedFamilyCount > 0 ? `${linkedFamilyCount} בני משפחה באפליקציה` : '',
            ].filter(Boolean).join(' ו-')}
          </p>
        )}
      </div>
    </div>
  )
}

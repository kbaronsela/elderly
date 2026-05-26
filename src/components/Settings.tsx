import { useEffect, useState } from 'react'
import { useStore } from '../store/useStore'

export default function Settings() {
  const { currentUser, allUsers, updateUser, unlinkFamilyUser, refreshLinkedFamilyUsers, logout, setScreen } = useStore()
  const [name, setName] = useState(currentUser?.name ?? '')
  const [wakeTime, setWakeTime] = useState(currentUser?.wakeUpTime ?? '07:00')
  const [saved, setSaved] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    refreshLinkedFamilyUsers()
  }, [])

  if (!currentUser || currentUser.role !== 'elderly') return null

  function save() {
    updateUser({ name: name.trim(), wakeUpTime: wakeTime })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  async function handleRefresh() {
    setRefreshing(true)
    await refreshLinkedFamilyUsers()
    setRefreshing(false)
  }

  // Linked family app-users
  const linkedFamilyUsers = (currentUser.linkedFamilyUserIds ?? [])
    .map(id => allUsers.find(u => u.id === id))
    .filter(Boolean) as typeof allUsers

  return (
    <div className="min-h-screen bg-gray-50 p-4 pb-28">
      <div className="flex items-center mb-6">
        <button onClick={() => setScreen('dashboard')} className="text-3xl p-2 text-gray-600">→</button>
        <h1 className="text-3xl font-black text-gray-800 mr-2">⚙️ הגדרות</h1>
      </div>

      {/* Personal info */}
      <div className="bg-white rounded-3xl shadow p-6 mb-5">
        <h2 className="text-2xl font-bold text-gray-700 mb-5">👤 פרטים אישיים</h2>
        <label className="block text-xl font-semibold text-gray-600 mb-1">שם מלא</label>
        <input type="text" value={name} onChange={e => setName(e.target.value)}
          className="w-full border-2 border-gray-200 rounded-xl p-4 text-xl mb-5 focus:border-blue-500 outline-none" />

        <label className="block text-xl font-semibold text-gray-600 mb-1">שם משתמש</label>
        <div className="flex items-center gap-3 bg-gray-50 border-2 border-gray-100 rounded-xl p-4 mb-1">
          <span className="text-xl text-gray-400 flex-1" dir="ltr">{currentUser.username}</span>
          <span className="text-sm text-gray-400">לא ניתן לשינוי</span>
        </div>
        <p className="text-base text-blue-600 mb-0">בני משפחה משתמשים בשם זה כדי להתחבר אליך</p>
      </div>

      {/* Wake-up time */}
      <div className="bg-white rounded-3xl shadow p-6 mb-5">
        <h2 className="text-2xl font-bold text-gray-700 mb-3">🌅 שעת התעוררות</h2>
        <p className="text-lg text-gray-500 mb-3">בשעה זו תוצג הודעת בוקר טוב עם פירוט היום</p>
        <input type="time" value={wakeTime} onChange={e => setWakeTime(e.target.value)}
          className="w-full border-2 border-gray-200 rounded-xl p-4 text-3xl font-bold text-center focus:border-blue-500 outline-none" dir="ltr" />
      </div>

      {saved && (
        <div className="bg-green-100 border-2 border-green-400 rounded-2xl p-4 mb-4 text-center text-xl text-green-700 font-bold">
          ✅ ההגדרות נשמרו!
        </div>
      )}
      <button onClick={save} className="btn-big w-full bg-blue-600 text-white shadow mb-5">💾 שמור הגדרות</button>

      {/* Linked family app-users */}
      <div className="bg-white rounded-3xl shadow p-6 mb-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-2xl font-bold text-gray-700">📱 בני משפחה מחוברים</h2>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="text-blue-500 font-bold text-base px-3 py-1 rounded-xl hover:bg-blue-50 disabled:opacity-50"
          >
            {refreshing ? '⏳' : '🔄 רענן'}
          </button>
        </div>
        {linkedFamilyUsers.length === 0 ? (
          <p className="text-lg text-gray-400">אין עדיין בני משפחה מחוברים</p>
        ) : (
          <div className="space-y-3">
            {linkedFamilyUsers.map(u => (
              <div key={u.id} className="flex items-center justify-between bg-green-50 rounded-2xl p-4">
                <div>
                  <p className="text-xl font-bold text-green-800">{u.name}</p>
                  <p className="text-base text-green-600" dir="ltr">{u.username}</p>
                </div>
                <button
                  onClick={() => unlinkFamilyUser(u.id)}
                  className="text-red-400 hover:text-red-600 text-base font-bold px-3 py-2"
                >
                  ✕ נתק
                </button>
              </div>
            ))}
          </div>
        )}
        <p className="text-base text-gray-400 mt-3">
          שם המשתמש שלך: <strong dir="ltr">{currentUser.username}</strong> – שתף עם בני המשפחה
        </p>
      </div>

      <div className="bg-white rounded-3xl shadow p-6 mb-5">
        <h2 className="text-2xl font-bold text-gray-700 mb-2">ℹ️ אודות</h2>
        <p className="text-lg text-gray-500">עוזר לגיל הזהב – גרסה 2.0</p>
        <p className="text-lg text-gray-400">פועל גם ללא אינטרנט</p>
      </div>

      <button onClick={logout} className="btn-big w-full bg-red-100 text-red-600 border-2 border-red-200 hover:bg-red-200">
        🚪 יציאה מהחשבון
      </button>
    </div>
  )
}

import { useState } from 'react'
import { useStore } from '../store/useStore'

type Mode = 'login' | 'register-elderly' | 'register-family'

export default function Login() {
  const { login, registerElderly, registerFamily, loading, error: storeError } = useStore()
  const [mode, setMode] = useState<Mode>('login')
  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (mode === 'login') {
      const ok = await login(username, password)
      if (!ok) setError(storeError ?? 'שם משתמש או סיסמה שגויים')
      return
    }
    if (!name.trim() || !username.trim() || !password.trim()) {
      setError('יש למלא את כל השדות'); return
    }
    if (password.length < 6) {
      setError('הסיסמה חייבת להכיל לפחות 6 תווים'); return
    }
    if (username.length < 3) {
      setError('שם משתמש חייב להכיל לפחות 3 תווים'); return
    }
    if (!/^[a-z0-9_]+$/.test(username)) {
      setError('שם משתמש: אותיות אנגלית קטנות, מספרים וקו תחתון בלבד'); return
    }
    if (mode === 'register-elderly') await registerElderly(name.trim(), username.trim(), password)
    else await registerFamily(name.trim(), username.trim(), password)
    if (storeError) setError(storeError)
  }

  const isRegister = mode !== 'login'

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-blue-100 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="text-7xl mb-3">👴🌟</div>
          <h1 className="text-4xl font-black text-blue-800">עוזר לגיל הזהב</h1>
          <p className="text-xl text-blue-600 mt-1">האפליקציה לחיים בריאים ומחוברים</p>
        </div>

        <div className="bg-white rounded-3xl shadow-xl p-8">
          {/* Mode tabs */}
          <div className="flex rounded-2xl bg-blue-50 p-1 mb-6 gap-1">
            <button
              onClick={() => setMode('login')}
              className={`flex-1 py-3 rounded-xl text-lg font-bold transition-all ${mode === 'login' ? 'bg-blue-600 text-white shadow' : 'text-blue-600'}`}
            >
              כניסה
            </button>
            <button
              onClick={() => setMode('register-elderly')}
              className={`flex-1 py-2.5 rounded-xl text-base font-bold transition-all leading-tight ${mode === 'register-elderly' ? 'bg-blue-600 text-white shadow' : 'text-blue-600'}`}
            >
              הרשמה<br/>קשיש
            </button>
            <button
              onClick={() => setMode('register-family')}
              className={`flex-1 py-2.5 rounded-xl text-base font-bold transition-all leading-tight ${mode === 'register-family' ? 'bg-green-600 text-white shadow' : 'text-green-700'}`}
            >
              הרשמה<br/>משפחה
            </button>
          </div>

          {/* Role description */}
          {mode === 'register-elderly' && (
            <div className="bg-blue-50 rounded-2xl p-4 mb-5 text-blue-800 text-lg">
              👴 <strong>קשיש</strong> – ניהול תרופות, לוח שנה ותזכורות בוקר
            </div>
          )}
          {mode === 'register-family' && (
            <div className="bg-green-50 rounded-2xl p-4 mb-5 text-green-800 text-lg">
              👨‍👩‍👧 <strong>בן/בת משפחה</strong> – מעקב אחר קרוביך, קבלת עדכונים על תרופות
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {isRegister && (
              <div>
                <label className="block text-xl font-semibold text-gray-700 mb-2">שם מלא</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="למשל: שרה כהן"
                  className="w-full border-2 border-blue-200 rounded-xl p-4 text-xl focus:border-blue-500 outline-none"
                />
              </div>
            )}
            <div>
              <label className="block text-xl font-semibold text-gray-700 mb-2">שם משתמש</label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value.toLowerCase())}
                placeholder="sara123"
                className="w-full border-2 border-blue-200 rounded-xl p-4 text-xl focus:border-blue-500 outline-none"
                autoComplete="username"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                dir="ltr"
              />
            </div>
            <div>
              <label className="block text-xl font-semibold text-gray-700 mb-2">סיסמה</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="לפחות 6 תווים"
                className="w-full border-2 border-blue-200 rounded-xl p-4 text-xl focus:border-blue-500 outline-none"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                dir="ltr"
              />
            </div>

            {error && (
              <div className="bg-red-50 border-2 border-red-300 rounded-xl p-4 text-red-700 text-xl text-center">
                ⚠️ {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className={`btn-big w-full text-white shadow-lg disabled:opacity-60 ${mode === 'register-family' ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'}`}
            >
              {loading ? '⏳ מתחבר...' : mode === 'login' ? '🔑 כניסה' : mode === 'register-elderly' ? '✅ הרשמה כקשיש' : '✅ הרשמה כבן משפחה'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

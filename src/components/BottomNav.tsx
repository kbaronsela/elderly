import { useStore } from '../store/useStore'
import type { AppScreen } from '../types'

const ELDERLY_TABS: { screen: AppScreen; label: string; icon: string }[] = [
  { screen: 'dashboard', label: 'בית', icon: '🏠' },
  { screen: 'medications', label: 'תרופות', icon: '💊' },
  { screen: 'family', label: 'משפחה', icon: '👪' },
  { screen: 'calendar', label: 'יומן', icon: '📅' },
  { screen: 'settings', label: 'הגדרות', icon: '⚙️' },
]

export default function BottomNav() {
  const { screen, setScreen, currentUser } = useStore()
  if (!currentUser || currentUser.role === 'family') return null

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t-2 border-gray-100 flex shadow-2xl">
      {ELDERLY_TABS.map(tab => (
        <button
          key={tab.screen}
          onClick={() => setScreen(tab.screen)}
          className={`relative flex-1 flex flex-col items-center py-3 transition-all active:scale-95
            ${screen === tab.screen ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
        >
          <span className="text-2xl">{tab.icon}</span>
          <span className="text-sm font-semibold mt-0.5">{tab.label}</span>
          {screen === tab.screen && (
            <div className="absolute bottom-0 w-8 h-1 bg-blue-600 rounded-t-full" />
          )}
        </button>
      ))}
    </nav>
  )
}

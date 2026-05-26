interface Props {
  current: string
  onSelect: (avatar: string) => void
  onClose: () => void
}

const AVATARS = [
  { emoji: '👴', label: 'זקן' },
  { emoji: '👵', label: 'זקנה' },
  { emoji: '🧓', label: 'קשיש' },
  { emoji: '👨‍🦳', label: 'שיבה' },
  { emoji: '👩‍🦳', label: 'שיבה' },
  { emoji: '🧔', label: 'זקן' },
  { emoji: '👨‍🦱', label: 'מתולתל' },
  { emoji: '👩‍🦱', label: 'מתולתלת' },
  { emoji: '🧙‍♂️', label: 'קוסם' },
  { emoji: '🧙‍♀️', label: 'קוסמת' },
  { emoji: '👑', label: 'מלכות' },
  { emoji: '🦸', label: 'גיבור' },
  { emoji: '🌟', label: 'כוכב' },
  { emoji: '⭐', label: 'כוכב' },
  { emoji: '🌺', label: 'פרח' },
  { emoji: '🌸', label: 'דובדבן' },
  { emoji: '🌻', label: 'חמנייה' },
  { emoji: '🦋', label: 'פרפר' },
  { emoji: '🐱', label: 'חתול' },
  { emoji: '🐻', label: 'דב' },
  { emoji: '🦊', label: 'שועל' },
  { emoji: '🐼', label: 'פנדה' },
  { emoji: '🦁', label: 'אריה' },
  { emoji: '🐸', label: 'צפרדע' },
  { emoji: '🐧', label: 'פינגווין' },
  { emoji: '🦜', label: 'תוכי' },
  { emoji: '🌈', label: 'קשת' },
  { emoji: '☀️', label: 'שמש' },
]

export default function AvatarPicker({ current, onSelect, onClose }: Props) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50" onClick={onClose}>
      <div
        className="bg-white rounded-t-3xl p-6 w-full max-w-lg"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-2xl font-black text-gray-800">בחרי תמונה</h2>
          <button onClick={onClose} className="text-3xl text-gray-400">✕</button>
        </div>

        <div className="grid grid-cols-5 gap-3">
          {AVATARS.map(({ emoji, label }) => (
            <button
              key={emoji}
              onClick={() => { onSelect(emoji); onClose() }}
              className={`flex flex-col items-center p-3 rounded-2xl transition-all active:scale-95 ${
                current === emoji
                  ? 'bg-blue-100 ring-2 ring-blue-400 scale-110'
                  : 'bg-gray-50 hover:bg-blue-50'
              }`}
            >
              <span className="text-4xl">{emoji}</span>
              <span className="text-xs text-gray-500 mt-1">{label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

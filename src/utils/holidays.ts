export interface IsraeliHoliday {
  date: string   // YYYY-MM-DD
  title: string  // English
  hebrew: string // Hebrew name
  category: string
}

const CACHE_KEY = 'il_holidays_cache'
const CACHE_YEAR_KEY = 'il_holidays_year'

// Map common English names → nicer Hebrew display names
const HEBREW_OVERRIDE: Record<string, string> = {
  "Rosh Hashana":        "ראש השנה",
  "Rosh Hashana II":     "ראש השנה (יום ב')",
  "Yom Kippur":          "יום כיפור",
  "Sukkot I":            "סוכות",
  "Sukkot II":           "סוכות (יום ב')",
  "Shmini Atzeret":      "שמיני עצרת",
  "Simchat Torah":       "שמחת תורה",
  "Chanukah: 1 Candle":  "חנוכה",
  "Chanukah: 8 Candle":  "חנוכה (יום ח')",
  "Tu BiShvat":          "ט\"ו בשבט",
  "Purim":               "פורים",
  "Shushan Purim":       "שושן פורים",
  "Passover I":          "פסח",
  "Passover II":         "פסח (יום ב')",
  "Passover VII":        "שביעי של פסח",
  "Passover VIII":       "אחרון של פסח",
  "Yom HaShoah":         "יום השואה",
  "Yom HaZikaron":       "יום הזיכרון",
  "Yom HaAtzma'ut":      "יום העצמאות",
  "Lag BaOmer":          "ל\"ג בעומר",
  "Yom Yerushalayim":    "יום ירושלים",
  "Shavuot I":           "שבועות",
  "Shavuot II":          "שבועות (יום ב')",
  "Tish'a B'Av":         "תשעה באב",
  "Tu B'Av":             "ט\"ו באב",
}

// Static fallback for 2026 in case API is unavailable
const FALLBACK_2026: IsraeliHoliday[] = [
  { date: '2026-03-05', title: 'Purim', hebrew: 'פורים', category: 'holiday' },
  { date: '2026-04-01', title: 'Passover I', hebrew: 'פסח', category: 'holiday' },
  { date: '2026-04-07', title: 'Passover VII', hebrew: 'שביעי של פסח', category: 'holiday' },
  { date: '2026-04-20', title: "Yom HaShoah", hebrew: 'יום השואה', category: 'holiday' },
  { date: '2026-04-29', title: "Yom HaZikaron", hebrew: 'יום הזיכרון', category: 'holiday' },
  { date: '2026-04-30', title: "Yom HaAtzma'ut", hebrew: 'יום העצמאות', category: 'holiday' },
  { date: '2026-05-19', title: 'Lag BaOmer', hebrew: 'ל"ג בעומר', category: 'holiday' },
  { date: '2026-05-21', title: 'Shavuot I', hebrew: 'שבועות', category: 'holiday' },
  { date: '2026-05-27', title: 'Yom Yerushalayim', hebrew: 'יום ירושלים', category: 'holiday' },
  { date: '2026-08-05', title: "Tish'a B'Av", hebrew: 'תשעה באב', category: 'holiday' },
  { date: '2026-09-10', title: 'Rosh Hashana', hebrew: 'ראש השנה', category: 'holiday' },
  { date: '2026-09-11', title: 'Rosh Hashana II', hebrew: "ראש השנה (יום ב')", category: 'holiday' },
  { date: '2026-09-19', title: 'Yom Kippur', hebrew: 'יום כיפור', category: 'holiday' },
  { date: '2026-09-24', title: 'Sukkot I', hebrew: 'סוכות', category: 'holiday' },
  { date: '2026-10-01', title: 'Shmini Atzeret', hebrew: 'שמיני עצרת', category: 'holiday' },
  { date: '2026-10-02', title: 'Simchat Torah', hebrew: 'שמחת תורה', category: 'holiday' },
  { date: '2026-12-04', title: 'Chanukah: 1 Candle', hebrew: 'חנוכה', category: 'holiday' },
  { date: '2026-12-11', title: 'Chanukah: 8 Candle', hebrew: 'חנוכה (יום ח׳)', category: 'holiday' },
]

export async function fetchIsraeliHolidays(year: number): Promise<IsraeliHoliday[]> {
  // Return cached if same year
  const cachedYear = localStorage.getItem(CACHE_YEAR_KEY)
  const cached = localStorage.getItem(CACHE_KEY)
  if (cached && cachedYear === String(year)) {
    return JSON.parse(cached) as IsraeliHoliday[]
  }

  try {
    // Fetch all 12 months separately to ensure full year coverage
    const url =
      `https://www.hebcal.com/hebcal?v=1&cfg=json` +
      `&maj=on&min=off&mod=on&nx=off&i=off&lg=he` +
      `&year=${year}&month=x&c=off&M=on&s=off`
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const json = await res.json()

    const items = json.items ?? json.events ?? []
    if (items.length === 0) throw new Error('empty response')

    const holidays: IsraeliHoliday[] = items
      .filter((item: { category: string }) => item.category === 'holiday')
      .map((item: { date: string; title: string; hebrew: string; category: string }) => ({
        date: item.date.slice(0, 10),
        title: item.title,
        hebrew: HEBREW_OVERRIDE[item.title] ?? item.hebrew ?? item.title,
        category: item.category,
      }))

    if (holidays.length === 0) throw new Error('no holidays parsed')

    localStorage.setItem(CACHE_KEY, JSON.stringify(holidays))
    localStorage.setItem(CACHE_YEAR_KEY, String(year))
    return holidays
  } catch (e) {
    console.warn('Hebcal API failed, using fallback:', e)
    // Return static fallback for 2026
    const fallback = year === 2026 ? FALLBACK_2026 : FALLBACK_2026
    localStorage.setItem(CACHE_KEY, JSON.stringify(fallback))
    localStorage.setItem(CACHE_YEAR_KEY, String(year))
    return fallback
  }
}

export function getTodayHoliday(holidays: IsraeliHoliday[]): IsraeliHoliday | null {
  const today = new Date().toISOString().slice(0, 10)
  return holidays.find(h => h.date === today) ?? null
}

export function getUpcomingHolidays(holidays: IsraeliHoliday[], days = 30): IsraeliHoliday[] {
  const today = new Date().toISOString().slice(0, 10)
  const limit = new Date(Date.now() + days * 86400000).toISOString().slice(0, 10)
  return holidays.filter(h => h.date >= today && h.date <= limit)
}

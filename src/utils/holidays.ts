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

export async function fetchIsraeliHolidays(year: number): Promise<IsraeliHoliday[]> {
  // Return cached if same year
  const cachedYear = localStorage.getItem(CACHE_YEAR_KEY)
  const cached = localStorage.getItem(CACHE_KEY)
  if (cached && cachedYear === String(year)) {
    return JSON.parse(cached) as IsraeliHoliday[]
  }

  try {
    const url =
      `https://www.hebcal.com/hebcal?v=1&cfg=json` +
      `&maj=on&min=off&mod=on&nx=off` +
      `&year=${year}&month=x&ss=off&mf=off&c=off&geo=none&M=on&s=off`
    const res = await fetch(url)
    const json = await res.json()

    const holidays: IsraeliHoliday[] = (json.items ?? [])
      .filter((item: { category: string }) => item.category === 'holiday')
      .map((item: { date: string; title: string; hebrew: string; category: string }) => ({
        date: item.date.slice(0, 10),
        title: item.title,
        hebrew: HEBREW_OVERRIDE[item.title] ?? item.hebrew ?? item.title,
        category: item.category,
      }))

    localStorage.setItem(CACHE_KEY, JSON.stringify(holidays))
    localStorage.setItem(CACHE_YEAR_KEY, String(year))
    return holidays
  } catch {
    return []
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

import type { CalendarEvent } from '../types'

// ── ICS Parser ────────────────────────────────────────────────────────────────

function parseIcsDate(val: string): string {
  // DTSTART:20240115T100000Z  or  DTSTART;TZID=...:20240115T100000
  const raw = val.includes(':') ? val.split(':').pop()! : val
  const digits = raw.replace(/[^0-9]/g, '')
  const year = digits.slice(0, 4)
  const month = digits.slice(4, 6)
  const day = digits.slice(6, 8)
  return `${year}-${month}-${day}`
}


export function parseIcs(text: string): Omit<CalendarEvent, 'id'>[] {
  const events: Omit<CalendarEvent, 'id'>[] = []
  const lines = text.replace(/\r\n /g, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')

  let inEvent = false
  let current: Partial<Omit<CalendarEvent, 'id'>> = {}

  for (const raw of lines) {
    const line = raw.trim()
    if (line === 'BEGIN:VEVENT') { inEvent = true; current = {}; continue }
    if (line === 'END:VEVENT') {
      inEvent = false
      if (current.title && current.date) {
        events.push({
          title: current.title,
          date: current.date,
          time: current.time ?? '',
          isHoliday: false,
          isBirthday: false,
        })
      }
      continue
    }
    if (!inEvent) continue

    const colonIdx = line.indexOf(':')
    if (colonIdx < 0) continue
    const key = line.slice(0, colonIdx).split(';')[0].toUpperCase()
    const value = line.slice(colonIdx + 1)

    if (key === 'SUMMARY') {
      current.title = value.replace(/\\n/g, ' ').replace(/\\,/g, ',').trim()
    } else if (key === 'DTSTART') {
      current.date = parseIcsDate(line)
      // Extract time if present
      const timeMatch = value.replace(/[^0-9]/g, '')
      if (timeMatch.length >= 8 && !value.includes('VALUE=DATE')) {
        const h = timeMatch.slice(8, 10)
        const m = timeMatch.slice(10, 12)
        if (h && m) current.time = `${h}:${m}`
      }
    }
  }

  return events
}

// ── ICS Exporter ──────────────────────────────────────────────────────────────

function toIcsDate(dateStr: string, timeStr?: string): string {
  const [y, mo, d] = dateStr.split('-')
  if (!timeStr) return `${y}${mo}${d}`
  const [h, mi] = timeStr.split(':')
  return `${y}${mo}${d}T${h}${mi}00`
}

export function exportToIcs(events: CalendarEvent[], calName = 'עוזר לגיל הזהב'): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//עוזר לגיל הזהב//HE',
    `X-WR-CALNAME:${calName}`,
    'X-WR-TIMEZONE:Asia/Jerusalem',
    'CALSCALE:GREGORIAN',
  ]

  for (const ev of events) {
    const hasTime = !!ev.time
    const dtVal = toIcsDate(ev.date, ev.time)
    lines.push('BEGIN:VEVENT')
    lines.push(`UID:${ev.id}@elderly-care`)
    lines.push(`DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').slice(0, 15)}Z`)
    lines.push(hasTime ? `DTSTART;TZID=Asia/Jerusalem:${dtVal}` : `DTSTART;VALUE=DATE:${dtVal}`)
    lines.push(`SUMMARY:${ev.title}`)
    if (ev.isBirthday) lines.push('CATEGORIES:יום הולדת')
    if (ev.isHoliday) lines.push('CATEGORIES:חג')
    lines.push('END:VEVENT')
  }

  lines.push('END:VCALENDAR')
  return lines.join('\r\n')
}

export function downloadIcs(content: string, filename = 'my-calendar.ics') {
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

import type { FamilyMember } from '../types'

/**
 * Sends a WhatsApp message via wa.me links (opens in browser/app).
 * For real SMS/WhatsApp automation you'd need a backend (Twilio, etc.).
 * This opens a tab per family member with a pre-filled message.
 */
export function notifyFamilyWhatsApp(members: FamilyMember[], message: string): void {
  members.forEach(member => {
    if (!member.phone) return
    const phone = member.phone.replace(/\D/g, '')
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
    window.open(url, '_blank', 'noopener,noreferrer')
  })
}

/**
 * Opens mailto: links to email family members.
 */
export function notifyFamilyEmail(members: FamilyMember[], subject: string, body: string): void {
  const emails = members.filter(m => m.email).map(m => m.email).join(',')
  if (!emails) return
  const url = `mailto:${emails}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
  window.location.href = url
}

export function buildMedicationTakenMessage(userName: string, medicationNames: string[], time: string): string {
  return `שלום, ${userName} לקח/ה את התרופות (${medicationNames.join(', ')}) בשעה ${time}. הכל בסדר!`
}

export function buildMedicationMissedMessage(userName: string, medicationNames: string[], time: string): string {
  return `שים/י לב: ${userName} לא אישר/ה לקיחת תרופות (${medicationNames.join(', ')}) שנקבעה לשעה ${time}. אנא בדוק/י.`
}

export type ConsentChoice = 'accepted' | 'rejected'
const MAX_AGE_MS = 180 * 24 * 60 * 60 * 1000
const VERSION = 1

export function consentKey(slug: string, pixelId: string) {
  return `lb_meta_consent:${encodeURIComponent(slug)}:${pixelId}`
}

export function readConsent(key: string): ConsentChoice | null {
  try {
    const record = JSON.parse(localStorage.getItem(key) || 'null')
    if (record?.version !== VERSION || !Number.isFinite(record?.at)) return null
    if (record.at > Date.now() || Date.now() - record.at >= MAX_AGE_MS) return null
    return record.choice === 'accepted' || record.choice === 'rejected' ? record.choice : null
  } catch {
    return null
  }
}

export function saveConsent(key: string, choice: ConsentChoice) {
  try {
    localStorage.setItem(key, JSON.stringify({ version: VERSION, choice, at: Date.now() }))
  } catch {
    // Blocked storage keeps this decision in memory for the current visit.
  }
}

export function smartLinkPrivacyUrl(slug: string) {
  return `/privacy?smartlink=${encodeURIComponent(slug)}`
}

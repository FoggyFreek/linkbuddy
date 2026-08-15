// The socials a band page can link out to, in render order. Icon-free so it
// stays pure — `SocialLinks` pairs each key with its mark.
export interface SocialDefinition { key: string; url: (handle: string) => string }

const atHandle = (h: string) => (h.startsWith('@') ? h : `@${h}`)

export const SOCIALS: SocialDefinition[] = [
  { key: 'instagram', url: (h) => `https://instagram.com/${h}` },
  { key: 'facebook', url: (h) => `https://facebook.com/${h}` },
  { key: 'youtube', url: (h) => `https://youtube.com/${atHandle(h)}` },
  { key: 'tiktok', url: (h) => `https://tiktok.com/${atHandle(h)}` },
  { key: 'spotify', url: (h) => (h.includes('/') ? `https://open.spotify.com/${h}` : `https://open.spotify.com/artist/${h}`) },
]

// A handle may be a full URL (used as-is) or pasted with its host still
// attached, which is stripped before the platform's URL is built.
export function socialHref(social: SocialDefinition, handle: string): string {
  const clean = handle.trim().replace(/^https?:\/\/[^/]+\//, '')
  return handle.startsWith('http') ? handle : social.url(clean)
}

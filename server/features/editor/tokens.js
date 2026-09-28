// Editor tokens. Sessions are HMAC-signed with a key derived from
// LINKBUDDY_SECRET, which never leaves this app. GigBuddy handoffs are Ed25519
// signatures verified against GIGBUDDY_HANDOFF_PUBLIC_KEY, so nothing held here
// can mint one.
//
// Format: base64url(JSON payload) + '.' + base64url(signature).
import crypto from 'node:crypto'

// A per-purpose subkey of LINKBUDDY_SECRET, so no two uses share key material.
export function linkbuddyKey(purpose) {
  const secret = process.env.LINKBUDDY_SECRET
  if (!secret) throw new Error('LINKBUDDY_SECRET is not configured')
  return Buffer.from(crypto.hkdfSync('sha256', secret, '', `linkbuddy:${purpose}`, 32))
}

function decodePayload(body) {
  let payload
  try {
    payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'))
  } catch {
    return null
  }
  if (!payload || typeof payload !== 'object') return null
  if (typeof payload.exp !== 'number' || payload.exp * 1000 < Date.now()) return null
  return payload
}

function splitToken(token) {
  if (typeof token !== 'string') return null
  const dot = token.indexOf('.')
  if (dot <= 0) return null
  return { body: token.slice(0, dot), signature: Buffer.from(token.slice(dot + 1), 'base64url') }
}

export function signSession(payload) {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const mac = crypto.createHmac('sha256', linkbuddyKey('editor-session')).update(body).digest('base64url')
  return `${body}.${mac}`
}

// The payload, or null for anything invalid: bad shape, bad signature, or an
// `exp` (epoch seconds) in the past.
export function verifySession(token) {
  if (!process.env.LINKBUDDY_SECRET) return null
  const parts = splitToken(token)
  if (!parts) return null
  const expected = crypto.createHmac('sha256', linkbuddyKey('editor-session')).update(parts.body).digest()
  if (parts.signature.length !== expected.length || !crypto.timingSafeEqual(parts.signature, expected)) return null
  return decodePayload(parts.body)
}

function handoffPublicKey() {
  const der = process.env.GIGBUDDY_HANDOFF_PUBLIC_KEY
  if (!der) return null
  try {
    return crypto.createPublicKey({ key: Buffer.from(der, 'base64'), format: 'der', type: 'spki' })
  } catch {
    return null
  }
}

export function verifyHandoff(token) {
  const key = handoffPublicKey()
  const parts = splitToken(token)
  if (!key || !parts) return null
  if (!crypto.verify(null, Buffer.from(parts.body), key, parts.signature)) return null
  const payload = decodePayload(parts.body)
  if (payload?.iss !== 'gigbuddy' || payload.aud !== 'linkbuddy') return null
  return payload
}

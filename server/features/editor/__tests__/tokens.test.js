import crypto from 'node:crypto'
import { describe, it, expect, beforeAll, afterEach } from 'vitest'
import { linkbuddyKey, signSession, verifyHandoff, verifySession } from '../tokens.js'
import { TEST_CREDENTIALS, configureCredentials, signHandoff } from '../../../__tests__/credentials.js'

const exp = () => Math.floor(Date.now() / 1000) + 60

beforeAll(configureCredentials)
afterEach(configureCredentials)

describe('editor sessions', () => {
  it('round-trip a payload', () => {
    const token = signSession({ t: 'session', tenantId: 3, mainSlug: 'woods', exp: exp() })
    expect(verifySession(token)).toMatchObject({ t: 'session', tenantId: 3, mainSlug: 'woods' })
  })

  it('reject tampering and expiry', () => {
    const token = signSession({ t: 'session', mainSlug: 'woods', exp: exp() })
    const [body, mac] = token.split('.')
    const forgedBody = Buffer.from(JSON.stringify({ t: 'session', mainSlug: 'other', exp: exp() })).toString('base64url')
    expect(verifySession(`${forgedBody}.${mac}`)).toBeNull()
    expect(verifySession(`${body}.AAAA`)).toBeNull()
    expect(verifySession('garbage')).toBeNull()
    expect(verifySession(signSession({ t: 'session', exp: 1 }))).toBeNull()
  })

  it('cannot be minted with any credential GigBuddy holds', () => {
    const body = Buffer.from(JSON.stringify({ t: 'session', tenantId: 3, exp: exp() })).toString('base64url')
    for (const credential of [TEST_CREDENTIALS.GIGBUDDY_EXPORT_TOKEN, TEST_CREDENTIALS.GIGBUDDY_INTEGRATION_TOKEN]) {
      const mac = crypto.createHmac('sha256', credential).update(body).digest('base64url')
      expect(verifySession(`${body}.${mac}`)).toBeNull()
    }
  })

  it('refuse everything while LinkBuddy has no secret of its own', () => {
    const token = signSession({ t: 'session', exp: exp() })
    process.env.LINKBUDDY_SECRET = ''
    expect(verifySession(token)).toBeNull()
    expect(() => signSession({ t: 'session', exp: exp() })).toThrow('LINKBUDDY_SECRET is not configured')
  })
})

describe('GigBuddy handoffs', () => {
  it('verify against GigBuddy public key', () => {
    const token = signHandoff({ t: 'handoff', slug: 'woods', tenantId: 1, exp: exp() })
    expect(verifyHandoff(token)).toMatchObject({ t: 'handoff', slug: 'woods', tenantId: 1 })
  })

  it('reject another signer, tampering, expiry and the wrong audience', () => {
    const stranger = crypto.generateKeyPairSync('ed25519').privateKey
    const token = signHandoff({ t: 'handoff', slug: 'woods', tenantId: 1, exp: exp() })
    const forgedBody = Buffer.from(JSON.stringify({ t: 'handoff', slug: 'woods', tenantId: 2, exp: exp(), iss: 'gigbuddy', aud: 'linkbuddy' }))
      .toString('base64url')

    expect(verifyHandoff(signHandoff({ t: 'handoff', tenantId: 1, exp: exp() }, { key: stranger }))).toBeNull()
    expect(verifyHandoff(`${forgedBody}.${token.split('.')[1]}`)).toBeNull()
    expect(verifyHandoff(signHandoff({ t: 'handoff', tenantId: 1, exp: 1 }))).toBeNull()
    expect(verifyHandoff(signHandoff({ t: 'handoff', tenantId: 1, exp: exp() }, { claims: { iss: 'gigbuddy', aud: 'elsewhere' } }))).toBeNull()
    expect(verifyHandoff(signHandoff({ t: 'handoff', tenantId: 1, exp: exp() }, { claims: {} }))).toBeNull()
    expect(verifyHandoff('garbage')).toBeNull()
  })

  it('cannot be forged with a LinkBuddy session signature', () => {
    const session = signSession({ t: 'handoff', slug: 'woods', tenantId: 1, exp: exp(), iss: 'gigbuddy', aud: 'linkbuddy' })
    expect(verifyHandoff(session)).toBeNull()
  })
})

describe('derived keys', () => {
  it('differ per purpose', () => {
    expect(linkbuddyKey('visitor-hash').equals(linkbuddyKey('editor-session'))).toBe(false)
  })
})

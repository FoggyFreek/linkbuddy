import crypto from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { generateCredentials } from '../generateCredentials.js'
import { configProblems } from '../../../config.js'

describe('integration credential generator', () => {
  it('produces a LinkBuddy set that passes the startup check', () => {
    const { linkbuddy } = generateCredentials()
    expect(configProblems({ ...linkbuddy, GIGBUDDY_URL: 'https://gigbuddy.example' })).toEqual([])
  })

  it('pairs the handoff keys and shares only the two bearers', () => {
    const { linkbuddy, gigbuddy } = generateCredentials()
    const privateKey = crypto.createPrivateKey({
      key: Buffer.from(gigbuddy.LINKPAGE_HANDOFF_PRIVATE_KEY, 'base64'), format: 'der', type: 'pkcs8',
    })
    const publicKey = crypto.createPublicKey({
      key: Buffer.from(linkbuddy.GIGBUDDY_HANDOFF_PUBLIC_KEY, 'base64'), format: 'der', type: 'spki',
    })
    const signature = crypto.sign(null, Buffer.from('handoff'), privateKey)

    expect(crypto.verify(null, Buffer.from('handoff'), publicKey, signature)).toBe(true)
    expect(gigbuddy.LINKPAGE_EXPORT_TOKEN).toBe(linkbuddy.GIGBUDDY_EXPORT_TOKEN)
    expect(gigbuddy.LINKPAGE_INTEGRATION_TOKEN).toBe(linkbuddy.GIGBUDDY_INTEGRATION_TOKEN)
    const values = [...Object.values(linkbuddy), gigbuddy.LINKPAGE_HANDOFF_PRIVATE_KEY, gigbuddy.LINKPAGE_IMAGE_SECRET]
    expect(new Set(values).size).toBe(values.length)
  })
})

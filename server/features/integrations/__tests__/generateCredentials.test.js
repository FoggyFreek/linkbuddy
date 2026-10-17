import crypto from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { generateCredentials } from '../generateCredentials.js'
import { configProblems } from '../../../config.js'

describe('integration credential generator', () => {
  it('produces a LinkJack set that passes the startup check', () => {
    const { linkjack } = generateCredentials()
    expect(configProblems({ ...linkjack, GIGBUDDY_URL: 'https://gigbuddy.example' })).toEqual([])
  })

  it('pairs the handoff keys and shares only the two bearers', () => {
    const { linkjack, gigbuddy } = generateCredentials()
    const privateKey = crypto.createPrivateKey({
      key: Buffer.from(gigbuddy.LINKPAGE_HANDOFF_PRIVATE_KEY, 'base64'), format: 'der', type: 'pkcs8',
    })
    const publicKey = crypto.createPublicKey({
      key: Buffer.from(linkjack.GIGBUDDY_HANDOFF_PUBLIC_KEY, 'base64'), format: 'der', type: 'spki',
    })
    const signature = crypto.sign(null, Buffer.from('handoff'), privateKey)

    expect(crypto.verify(null, Buffer.from('handoff'), publicKey, signature)).toBe(true)
    expect(gigbuddy.LINKPAGE_EXPORT_TOKEN).toBe(linkjack.GIGBUDDY_EXPORT_TOKEN)
    expect(gigbuddy.LINKPAGE_INTEGRATION_TOKEN).toBe(linkjack.GIGBUDDY_INTEGRATION_TOKEN)
    const values = [...Object.values(linkjack), gigbuddy.LINKPAGE_HANDOFF_PRIVATE_KEY, gigbuddy.LINKPAGE_IMAGE_SECRET]
    expect(new Set(values).size).toBe(values.length)
  })
})

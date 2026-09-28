import crypto from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { configProblems } from '../config.js'
import { TEST_CREDENTIALS } from './credentials.js'

const valid = {
  ...TEST_CREDENTIALS,
  LINKBUDDY_SECRET: 'a'.repeat(32),
  GIGBUDDY_URL: 'https://gigbuddy.example',
}

describe('runtime configuration', () => {
  it('accepts a complete set of per-purpose credentials', () => {
    expect(configProblems(valid)).toEqual([])
  })

  it('names every missing credential', () => {
    expect(configProblems({})).toEqual([
      'LINKBUDDY_SECRET is not set',
      'GIGBUDDY_URL is not set',
      'GIGBUDDY_EXPORT_TOKEN is not set',
      'GIGBUDDY_INTEGRATION_TOKEN is not set',
      'GIGBUDDY_HANDOFF_PUBLIC_KEY is not set',
    ])
  })

  it('refuses a short LinkBuddy secret and a handoff key that is not Ed25519', () => {
    const rsa = crypto.generateKeyPairSync('rsa', { modulusLength: 1024 }).publicKey
    expect(configProblems({
      ...valid,
      LINKBUDDY_SECRET: 'short',
      GIGBUDDY_HANDOFF_PUBLIC_KEY: rsa.export({ format: 'der', type: 'spki' }).toString('base64'),
    })).toEqual([
      'LINKBUDDY_SECRET must be at least 32 characters',
      'GIGBUDDY_HANDOFF_PUBLIC_KEY must be a base64 Ed25519 public key (SPKI DER)',
    ])
    expect(configProblems({ ...valid, GIGBUDDY_HANDOFF_PUBLIC_KEY: 'not-a-key' })).toEqual([
      'GIGBUDDY_HANDOFF_PUBLIC_KEY must be a base64 Ed25519 public key (SPKI DER)',
    ])
  })

  it('refuses any credential reused for a second purpose', () => {
    expect(configProblems({ ...valid, GIGBUDDY_INTEGRATION_TOKEN: valid.GIGBUDDY_EXPORT_TOKEN })).toEqual([
      'GIGBUDDY_EXPORT_TOKEN, GIGBUDDY_INTEGRATION_TOKEN and LINKBUDDY_SECRET must all differ',
    ])
  })
})

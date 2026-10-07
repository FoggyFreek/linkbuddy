// Test credentials, one per purpose, plus the GigBuddy side of the handoff key
// pair so tests can mint handoffs the way GigBuddy does.
import crypto from 'node:crypto'

const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519')

export const TEST_CREDENTIALS = {
  LINKBUDDY_SECRET: 'test-linkbuddy-secret',
  GIGBUDDY_EXPORT_TOKEN: 'test-export-token',
  GIGBUDDY_INTEGRATION_TOKEN: 'test-integration-token',
  GIGBUDDY_HANDOFF_PUBLIC_KEY: publicKey.export({ format: 'der', type: 'spki' }).toString('base64'),
}

export function configureCredentials() {
  Object.assign(process.env, TEST_CREDENTIALS)
}

export function signHandoff(payload, { key = privateKey, claims = { iss: 'gigbuddy', aud: 'linkbuddy' } } = {}) {
  const body = Buffer.from(JSON.stringify({ ...claims, ...payload })).toString('base64url')
  return `${body}.${crypto.sign(null, Buffer.from(body), key).toString('base64url')}`
}


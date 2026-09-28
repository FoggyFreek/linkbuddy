// Startup check of the credentials this app cannot run safely without.
import crypto from 'node:crypto'

const REQUIRED = [
  'LINKBUDDY_SECRET',
  'GIGBUDDY_URL',
  'GIGBUDDY_EXPORT_TOKEN',
  'GIGBUDDY_INTEGRATION_TOKEN',
  'GIGBUDDY_HANDOFF_PUBLIC_KEY',
]
const MIN_SECRET_LENGTH = 32

function isEd25519PublicKey(base64) {
  try {
    const key = crypto.createPublicKey({ key: Buffer.from(base64, 'base64'), format: 'der', type: 'spki' })
    return key.asymmetricKeyType === 'ed25519'
  } catch {
    return false
  }
}

export function configProblems(env) {
  const problems = REQUIRED.filter((key) => !env[key]).map((key) => `${key} is not set`)
  if (problems.length) return problems
  if (env.LINKBUDDY_SECRET.length < MIN_SECRET_LENGTH) {
    problems.push(`LINKBUDDY_SECRET must be at least ${MIN_SECRET_LENGTH} characters`)
  }
  if (!isEd25519PublicKey(env.GIGBUDDY_HANDOFF_PUBLIC_KEY)) {
    problems.push('GIGBUDDY_HANDOFF_PUBLIC_KEY must be a base64 Ed25519 public key (SPKI DER)')
  }
  const secrets = [env.GIGBUDDY_EXPORT_TOKEN, env.GIGBUDDY_INTEGRATION_TOKEN, env.LINKBUDDY_SECRET]
  if (new Set(secrets).size !== secrets.length) {
    problems.push('GIGBUDDY_EXPORT_TOKEN, GIGBUDDY_INTEGRATION_TOKEN and LINKBUDDY_SECRET must all differ')
  }
  return problems
}

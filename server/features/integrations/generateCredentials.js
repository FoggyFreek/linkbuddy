// Prints a fresh, matching set of integration credentials for both apps:
// `npm run credentials:generate`. Only the two bearers appear on both sides.
import crypto from 'node:crypto'
import url from 'node:url'

const randomToken = () => crypto.randomBytes(32).toString('base64url')

export function generateCredentials() {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519')
  const exportToken = randomToken()
  const integrationToken = randomToken()
  return {
    linkbuddy: {
      LINKBUDDY_SECRET: randomToken(),
      GIGBUDDY_HANDOFF_PUBLIC_KEY: publicKey.export({ format: 'der', type: 'spki' }).toString('base64'),
      GIGBUDDY_EXPORT_TOKEN: exportToken,
      GIGBUDDY_INTEGRATION_TOKEN: integrationToken,
    },
    gigbuddy: {
      LINKPAGE_HANDOFF_PRIVATE_KEY: privateKey.export({ format: 'der', type: 'pkcs8' }).toString('base64'),
      LINKPAGE_IMAGE_SECRET: randomToken(),
      LINKPAGE_EXPORT_TOKEN: exportToken,
      LINKPAGE_INTEGRATION_TOKEN: integrationToken,
    },
  }
}

if (process.argv[1] === url.fileURLToPath(import.meta.url)) {
  const { linkbuddy, gigbuddy } = generateCredentials()
  const lines = (values) => Object.entries(values).map(([key, value]) => `${key}=${value}`).join('\n')
  console.log(`# LinkBuddy (GitHub secrets of this repo)\n${lines(linkbuddy)}\n`)
  console.log(`# GigBuddy (GitHub secrets of the gigbuddy repo)\n${lines(gigbuddy)}`)
}

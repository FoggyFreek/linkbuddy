// The outbound integration with GigBuddy: pulling a band's content export and
// confirming an editor's access, over HTTP with the export bearer. See
// README.md for the contract.

const origin = (value) => (value || '').replace(/\/$/, '')

// Where a visitor's browser reaches GigBuddy — the href behind the public
// page's attribution badge. Deliberately not GIGBUDDY_URL: that one is the API
// origin this server pulls exports from, which may be internal-only.
export function gigbuddyWebOrigin() {
  return origin(process.env.GIGBUDDY_WEB_URL)
}

const EXPORT_TIMEOUT_MS = 8000
const ACCESS_TIMEOUT_MS = 5000

function gigbuddyGet(path, timeoutMs) {
  const base = origin(process.env.GIGBUDDY_URL)
  if (!base || !process.env.GIGBUDDY_EXPORT_TOKEN) {
    throw new Error('GIGBUDDY_URL / GIGBUDDY_EXPORT_TOKEN are not configured')
  }
  return fetch(`${base}/api/public/linkpage${path}`, {
    headers: { authorization: `Bearer ${process.env.GIGBUDDY_EXPORT_TOKEN}` },
    signal: AbortSignal.timeout(timeoutMs),
  })
}

export async function fetchExport(slug, { timeoutMs = EXPORT_TIMEOUT_MS } = {}) {
  const res = await gigbuddyGet(`/export/${encodeURIComponent(slug)}`, timeoutMs)
  if (res.status === 404) return { notFound: true }
  if (!res.ok) throw new Error(`GigBuddy export failed with status ${res.status}`)
  return { content: await res.json() }
}

// Whether GigBuddy still lets this member edit the tenant's link page.
export async function fetchEditorAccess(tenantId, userId, { timeoutMs = ACCESS_TIMEOUT_MS } = {}) {
  const res = await gigbuddyGet(`/access/${tenantId}/${userId}`, timeoutMs)
  if (!res.ok) throw new Error(`GigBuddy access check failed with status ${res.status}`)
  const body = await res.json()
  return body?.allowed === true
}

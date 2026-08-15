// Thin fetch wrappers — the only place that knows /api paths. The editor
// session token lives in sessionStorage (editor surface only; the public
// page stores nothing on the visitor's device).

import type { EditorPage, Layout, PageListEntry, ResolvedPage, Stats, UnfurlResult } from '../types.js'
import { ApiError } from '../types.js'

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  // `headers` must be built AFTER spreading options: authed() supplies its own
  // headers object, which would otherwise replace the Content-Type wholesale
  // and leave JSON bodies unparsed by express.json().
  const res = await fetch(path, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
  })
  if (res.status === 204) return null as T
  const body: unknown = await res.json().catch(() => ({}))
  if (!res.ok) {
    const message = typeof body === 'object' && body !== null && 'error' in body && typeof body.error === 'string'
      ? body.error
      : `Request failed (${res.status})`
    const err = new ApiError(message)
    err.status = res.status
    throw err
  }
  return body as T
}

// ---------- public ----------

// A page slug may be one segment (main, 'foo') or two (release, 'foo/bar').
// Encode each segment but keep the '/' so the API path mirrors the page path.
function pagePath(slug: string) {
  return slug.split('/').map(encodeURIComponent).join('/')
}

export function getPublicPage(slug: string) {
  return request<ResolvedPage>(`/api/pages/${pagePath(slug)}`)
}

// Fire-and-forget view beacon; failures must never affect the visitor.
export function sendView(slug: string, { referrer, utmSource }: BeaconContext) {
  return request<null>(`/api/pages/${pagePath(slug)}/view`, {
    method: 'POST',
    body: JSON.stringify({ referrer, utmSource }),
  }).catch(() => null)
}

// Outbound click beacon (conversion stats). sendBeacon survives the page
// being torn down by the navigation the click just triggered.
export function sendClick(slug: string, target: string, { referrer, utmSource }: BeaconContext) {
  const url = `/api/pages/${pagePath(slug)}/click`
  const payload = JSON.stringify({ target, referrer, utmSource })
  try {
    if (navigator.sendBeacon?.(url, new Blob([payload], { type: 'application/json' }))) return
  } catch {
    /* fall through to fetch */
  }
  fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: payload,
    keepalive: true,
  }).catch(() => null)
}

// ---------- editor ----------

const SESSION_KEY = 'lp_editor_session'

export function getStoredSession() {
  try {
    return sessionStorage.getItem(SESSION_KEY)
  } catch {
    return null
  }
}

export function storeSession(token: string) {
  try {
    sessionStorage.setItem(SESSION_KEY, token)
  } catch {
    /* private mode — the session just won't survive a reload */
  }
}

function authed(session: string, options: RequestInit = {}): RequestInit {
  return { ...options, headers: { Authorization: `Bearer ${session}`, ...options.headers } }
}

interface BeaconContext { referrer: string; utmSource: string | null }
interface PageListResponse { pages: PageListEntry[] }
interface SessionResponse extends PageListResponse { session: string; page: EditorPage }

export function exchangeHandoff(token: string) {
  return request<SessionResponse>('/api/editor/session', { method: 'POST', body: JSON.stringify({ token }) })
}

export function listEditorPages(session: string) {
  return request<PageListResponse>('/api/editor/pages', authed(session))
}

export function createReleasePage(session: string, songId: number, slug: string) {
  return request<{ page: EditorPage }>('/api/editor/pages', authed(session, { method: 'POST', body: JSON.stringify({ songId, slug }) }))
}

export function getEditorPage(session: string, pageId: number) {
  return request<EditorPage>(`/api/editor/pages/${pageId}`, authed(session))
}

export function deleteEditorPage(session: string, pageId: number) {
  return request<null>(`/api/editor/pages/${pageId}`, authed(session, { method: 'DELETE' }))
}

export function saveDraft(session: string, pageId: number, layout: Layout) {
  return request<{ saved: true }>(
    `/api/editor/pages/${pageId}/draft`,
    authed(session, { method: 'PUT', body: JSON.stringify({ layout }) }),
  )
}

export function getPreview(session: string, pageId: number) {
  return request<ResolvedPage>(`/api/editor/pages/${pageId}/preview`, authed(session))
}

export function publishPage(session: string, pageId: number) {
  return request<{ publishedAt: string }>(`/api/editor/pages/${pageId}/publish`, authed(session, { method: 'POST' }))
}

export function refreshContent(session: string, pageId: number) {
  return request<EditorPage>(`/api/editor/pages/${pageId}/refresh-content`, authed(session, { method: 'POST' }))
}

// Link enrichment: oEmbed/Open Graph metadata + embed capability for a URL.
export function unfurlUrl(session: string, url: string) {
  return request<UnfurlResult>('/api/editor/unfurl', authed(session, { method: 'POST', body: JSON.stringify({ url }) }))
}

export function getStats(session: string, pageId: number, days: number) {
  return request<Stats>(`/api/editor/pages/${pageId}/stats?days=${days}`, authed(session))
}

// Bootstraps the editor session and holds the tenant's page list. On mount it
// either exchanges a fresh GigBuddy handoff token from the URL fragment
// (#gbtoken=…) for a session, or resumes the session stored from a previous
// visit. Either way it adopts an initial page via the `adoptPage` callback the
// editor supplies. `sessionRef` is owned by the caller so the layout hook can
// read the current token without this hook re-rendering it.
import { useEffect, useState, type Dispatch, type MutableRefObject, type SetStateAction } from 'react'
import type { EditorPage, PageListEntry } from '../../../types.js'
import { errorMessage } from '../../../types.js'
import {
  getStoredSession,
  storeSession,
  exchangeHandoff,
  listEditorPages,
  getEditorPage,
} from '../../../lib/api.js'

export function useEditorSession(
  sessionRef: MutableRefObject<string | null>,
  adoptPage: (page: EditorPage) => void,
): {
  session: string | null
  pages: PageListEntry[]
  setPages: Dispatch<SetStateAction<PageListEntry[]>>
  fatal: string | null
  setFatal: Dispatch<SetStateAction<string | null>>
} {
  const [session, setSession] = useState<string | null>(null)
  const [pages, setPages] = useState<PageListEntry[]>([])
  const [fatal, setFatal] = useState<string | null>(null)

  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''))
    const gbtoken = hash.get('gbtoken')
    const boot = async () => {
      try {
        if (gbtoken) {
          const { session: token, pages: loadedPages, page: loaded } = await exchangeHandoff(gbtoken)
          window.history.replaceState(null, '', window.location.pathname)
          storeSession(token)
          sessionRef.current = token
          setSession(token)
          setPages(loadedPages)
          adoptPage(loaded)
          return
        }
        const stored = getStoredSession()
        if (!stored) {
          setFatal('Open the editor from GigBuddy (Profile → Edit link page).')
          return
        }
        const { pages: loadedPages } = await listEditorPages(stored)
        sessionRef.current = stored
        setSession(stored)
        setPages(loadedPages)
        const main = loadedPages.find((p) => p.pageType === 'main') || loadedPages[0]
        adoptPage(await getEditorPage(stored, main.id))
      } catch (err) {
        setFatal(errorMessage(err))
      }
    }
    boot()
  }, [sessionRef, adoptPage])

  return { session, pages, setPages, fatal, setFatal }
}

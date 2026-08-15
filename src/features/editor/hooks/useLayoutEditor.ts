// Owns the draft layout being edited and its debounced autosave. The editor
// mutates the layout through `applyLayout` (immutable next-state), which marks
// it dirty and schedules a save; `flushSave` forces a pending save through
// before navigation/publish. `loadLayout` swaps in a different page's draft,
// discarding any save still queued for the previous one.
import { useCallback, useEffect, useRef, useState, type MutableRefObject } from 'react'
import { saveDraft } from '../../../lib/api.js'
import { saveErrorState } from '../utils/editorUtils.js'
import type { Layout, SaveState } from '../../../types.js'

const AUTOSAVE_DELAY_MS = 800

export function useLayoutEditor(sessionRef: MutableRefObject<string | null>) {
  const [layout, setLayout] = useState<Layout | null>(null)
  const [saveState, setSaveState] = useState<SaveState>('saved')
  const layoutRef = useRef<Layout | null>(null)
  const pageIdRef = useRef<number | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const doSave = useCallback(async () => {
    if (!layoutRef.current || !sessionRef.current || !pageIdRef.current) return
    setSaveState('saving')
    try {
      await saveDraft(sessionRef.current, pageIdRef.current, layoutRef.current)
      setSaveState('saved')
    } catch (err) {
      setSaveState(saveErrorState(err))
    }
  }, [sessionRef])

  const applyLayout = useCallback((next: Layout) => {
    layoutRef.current = next
    setLayout(next)
    setSaveState('dirty')
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(doSave, AUTOSAVE_DELAY_MS)
  }, [doSave])

  const flushSave = useCallback(async () => {
    clearTimeout(timerRef.current)
    await doSave()
  }, [doSave])

  // Adopt a (freshly loaded) page's draft into the editor. Any autosave queued
  // for the previous page is dropped — it was already flushed before we got
  // here — so a late timer can't write one page's layout onto another.
  const loadLayout = useCallback((pageId: number, draftLayout: Layout) => {
    clearTimeout(timerRef.current)
    layoutRef.current = draftLayout
    pageIdRef.current = pageId
    setLayout(draftLayout)
    setSaveState('saved')
  }, [])

  useEffect(() => () => clearTimeout(timerRef.current), [])

  return { layout, saveState, setSaveState, applyLayout, flushSave, loadLayout }
}

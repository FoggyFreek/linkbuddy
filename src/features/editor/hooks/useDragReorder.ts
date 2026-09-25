import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent, type RefObject } from 'react'
import { findDropTarget, isNoopDrop, type DropTarget, type ListGeometry, type ReorderSpot } from '../utils/dropTarget.js'

// Pointer-driven drag-to-reorder (mouse and touch alike) for one `group` of
// items in the Build tab. Geometry is read from the DOM under `root` at drag
// time: `listProps` mark a list, `itemProps` its direct-child items, and
// `handleProps` the grab thumb. The dragged item follows the pointer by
// transform; every pointer position resolves to a swap or an insert
// (see dropTarget.ts), and `onDrop` is the only mutation. Arrow keys on the
// thumb are the keyboard equivalent.
//
// `onGrab`/`onRelease` let the host change layout for the drag (collapsing
// sections); the grabbed item is held under the pointer for `settleMs` while
// that layout animates.

export interface ItemDropState { active: boolean; dragging: boolean; swap: boolean; before: boolean; after: boolean }

interface Session {
  from: ReorderSpot
  id: string
  el: HTMLElement
  grabOffset: number
  y: number
  dy: number
  raf: number
  target: DropTarget | null
  cleanup: () => void
}

const SCROLL_ZONE = 56
const MAX_SCROLL_STEP = 18

const sameSpot = (a: ReorderSpot | null, b: ReorderSpot | null) => !!a && !!b && a.list === b.list && a.index === b.index
const sameTarget = (a: DropTarget | null, b: DropTarget | null) => a === b || (sameSpot(a, b) && a?.mode === b?.mode)

function scrollStep(y: number) {
  if (y < SCROLL_ZONE) return -Math.min(MAX_SCROLL_STEP, (SCROLL_ZONE - y) / 2)
  const bottom = window.innerHeight - SCROLL_ZONE
  return y > bottom ? Math.min(MAX_SCROLL_STEP, (y - bottom) / 2) : 0
}

export default function useDragReorder({
  group,
  root,
  settleMs = 0,
  onDrop,
  onGrab,
  onRelease,
}: {
  group: string
  root: RefObject<HTMLElement | null>
  settleMs?: number
  onDrop: (from: ReorderSpot, target: DropTarget) => void
  onGrab?: () => void
  onRelease?: () => void
}) {
  const session = useRef<Session | null>(null)
  const pin = useRef<{ id: string; top: number; until: number; started?: boolean } | null>(null)
  const handles = useRef(new Map<string, HTMLElement>())
  const callbacks = useRef({ onDrop, onGrab, onRelease })
  const [dragging, setDragging] = useState<ReorderSpot | null>(null)
  const [target, setTarget] = useState<DropTarget | null>(null)
  const [focusRequest, setFocusRequest] = useState<{ id: string } | null>(null)

  useLayoutEffect(() => {
    callbacks.current = { onDrop, onGrab, onRelease }
  })

  useLayoutEffect(() => {
    if (focusRequest) handles.current.get(focusRequest.id)?.focus()
  }, [focusRequest])

  const measure = (s: Session): ListGeometry[] => {
    const selector = `[data-reorder-list="${group}"]`
    const scope = root.current
    const lists = scope ? [scope, ...scope.querySelectorAll<HTMLElement>(selector)].filter((el) => el.matches(selector)) : []
    return lists.map((list) => {
      const box = list.getBoundingClientRect()
      const items = Array.from(list.children as HTMLCollectionOf<HTMLElement>)
        .filter((el) => el.dataset.reorderItem === group)
        .map((el) => {
          const r = el.getBoundingClientRect()
          const shift = el === s.el ? s.dy : 0
          return { top: r.top - shift, bottom: r.bottom - shift }
        })
      return { id: list.dataset.reorderId ?? '', top: box.top, bottom: box.bottom, items }
    })
  }

  const track = () => {
    const s = session.current
    if (!s) return
    const natural = s.el.getBoundingClientRect().top - s.dy
    s.dy = s.y - s.grabOffset - natural
    s.el.style.transform = `translateY(${s.dy}px)`
    const found = findDropTarget(s.y, measure(s))
    const next = found && !isNoopDrop(s.from, found) ? found : null
    if (!sameTarget(next, s.target)) {
      s.target = next
      setTarget(next)
    }
  }

  // Keeps the grabbed item under the pointer across a host layout change.
  useLayoutEffect(() => {
    const p = pin.current
    if (!p || p.started) return
    p.started = true
    const hold = () => {
      if (pin.current !== p) return
      const el = handles.current.get(p.id)?.closest<HTMLElement>(`[data-reorder-item="${group}"]`)
      if (el) {
        const shift = el === session.current?.el ? session.current.dy : 0
        const delta = el.getBoundingClientRect().top - shift - p.top
        if (Math.abs(delta) > 1) window.scrollBy(0, delta)
      }
      track()
      if (performance.now() < p.until) requestAnimationFrame(hold)
      else pin.current = null
    }
    hold()
  })

  useEffect(() => () => {
    pin.current = null
    session.current?.cleanup()
  }, [])

  const autoScroll = () => {
    const s = session.current
    if (!s || s.raf || !scrollStep(s.y)) return
    const step = () => {
      const current = session.current
      if (!current) return
      const by = scrollStep(current.y)
      current.raf = by ? requestAnimationFrame(step) : 0
      if (by) window.scrollBy(0, by)
    }
    s.raf = requestAnimationFrame(step)
  }

  const end = (commit: boolean) => {
    const s = session.current
    if (!s) return
    session.current = null
    s.cleanup()
    cancelAnimationFrame(s.raf)
    s.el.style.transform = ''
    const { onDrop: drop, onRelease: release } = callbacks.current
    if (commit && s.target) drop(s.from, s.target)
    if (release) pin.current = { id: s.id, top: s.y - s.grabOffset, until: performance.now() + settleMs }
    setDragging(null)
    setTarget(null)
    release?.()
  }

  const grab = (spot: ReorderSpot, id: string, e: ReactPointerEvent<HTMLElement>) => {
    if (e.button !== 0 || session.current) return
    const el = e.currentTarget.closest<HTMLElement>(`[data-reorder-item="${group}"]`)
    if (!el) return
    e.preventDefault()
    const { pointerId } = e
    const onMove = (ev: PointerEvent) => {
      if (ev.pointerId !== pointerId || !session.current) return
      session.current.y = ev.clientY
      track()
      autoScroll()
    }
    const onUp = (ev: PointerEvent) => {
      if (ev.pointerId === pointerId) end(ev.type === 'pointerup')
    }
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') end(false)
    }
    const listeners = [['pointermove', onMove], ['pointerup', onUp], ['pointercancel', onUp], ['keydown', onKey], ['scroll', track]] as const
    listeners.forEach(([type, fn]) => window.addEventListener(type, fn as EventListener, true))
    const top = el.getBoundingClientRect().top
    session.current = {
      from: spot,
      id,
      el,
      grabOffset: e.clientY - top,
      y: e.clientY,
      dy: 0,
      raf: 0,
      target: null,
      cleanup: () => listeners.forEach(([type, fn]) => window.removeEventListener(type, fn as EventListener, true)),
    }
    pin.current = { id, top, until: performance.now() + settleMs }
    setDragging(spot)
    callbacks.current.onGrab?.()
  }

  return {
    active: dragging !== null,
    itemState: (spot: ReorderSpot, last: boolean): ItemDropState => ({
      active: dragging !== null,
      dragging: sameSpot(dragging, spot),
      swap: target?.mode === 'swap' && sameSpot(target, spot),
      before: target?.mode === 'insert' && sameSpot(target, spot),
      after: last && target?.mode === 'insert' && sameSpot(target, { list: spot.list, index: spot.index + 1 }),
    }),
    insertAt: (spot: ReorderSpot) => target?.mode === 'insert' && sameSpot(target, spot),
    handleProps: (spot: ReorderSpot, id: string, onKeyMove: (delta: number) => boolean) => ({
      tabIndex: 0,
      role: 'button',
      'aria-label': `Reorder ${group} — drag, or use the arrow keys`,
      'data-reorder-handle': id,
      ref: (node: HTMLElement | null) => {
        if (node) handles.current.set(id, node)
        else handles.current.delete(id)
      },
      onPointerDown: (e: ReactPointerEvent<HTMLElement>) => grab(spot, id, e),
      onKeyDown: (e: ReactKeyboardEvent<HTMLElement>) => {
        const delta = e.key === 'ArrowUp' ? -1 : e.key === 'ArrowDown' ? 1 : 0
        if (!delta) return
        e.preventDefault()
        if (onKeyMove(delta)) setFocusRequest({ id })
      },
    }),
    listProps: (id: string) => ({ 'data-reorder-list': group, 'data-reorder-id': id }),
    itemProps: { 'data-reorder-item': group },
  }
}

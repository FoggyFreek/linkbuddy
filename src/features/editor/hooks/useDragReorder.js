import { useLayoutEffect, useRef, useState } from 'react'

// Drag-to-reorder for the Build tab's widget rows, on native HTML5 drag events
// (no dependency). Because a widget can be dragged into another section, the
// state lives once in LayoutBuilder and every location is a
// `{ sectionId, index }` pair; `onMove(from, to)` is the only mutation.
//
// `handleProps` go on the grab thumb — the sole draggable element, so the row's
// buttons and text still behave normally. `rowProps` make a widget row a drop
// target; `listProps` catch drops on a section's empty space and append there.
// Rows stop propagation, so the two never fire for the same drop.
const same = (a, b) => !!a && !!b && a.sectionId === b.sectionId && a.index === b.index

export default function useDragReorder(onMove) {
  const from = useRef(null)
  const handles = useRef(new Map())
  const [dragging, setDragging] = useState(null)
  const [over, setOver] = useState(null)
  const [focusRequest, setFocusRequest] = useState(null)

  useLayoutEffect(() => {
    if (focusRequest) handles.current.get(focusRequest.widgetId)?.focus()
  }, [focusRequest])

  const reset = () => {
    from.current = null
    setDragging(null)
    setOver(null)
  }

  const onDragOver = (target) => (e) => {
    if (!from.current) return
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = 'move'
    setOver(target)
  }

  const onDrop = (target) => (e) => {
    if (!from.current) return
    e.preventDefault()
    e.stopPropagation()
    onMove(from.current, target)
    reset()
  }

  return {
    isDragging: (loc) => same(dragging, loc),
    isOver: (loc) => same(over, loc) && !same(dragging, loc),
    focusAfterMove: (widgetId) => setFocusRequest({ widgetId }),
    handleProps: (loc, widgetId, onKeyMove) => ({
      draggable: true,
      tabIndex: 0,
      role: 'button',
      'aria-label': 'Reorder widget — drag, or use the arrow keys',
      'data-reorder-widget': widgetId,
      ref: (node) => {
        if (node) handles.current.set(widgetId, node)
        else handles.current.delete(widgetId)
      },
      onDragStart: (e) => {
        from.current = loc
        setDragging(loc)
        e.dataTransfer.effectAllowed = 'move'
        e.dataTransfer.setData('text/plain', String(loc.index))
        const row = e.currentTarget.closest('li')
        if (row) e.dataTransfer.setDragImage(row, 16, row.offsetHeight / 2)
      },
      onDragEnd: reset,
      onKeyDown: (e) => {
        const delta = e.key === 'ArrowUp' ? -1 : e.key === 'ArrowDown' ? 1 : 0
        if (!delta) return
        e.preventDefault()
        if (onKeyMove(delta)) setFocusRequest({ widgetId })
      },
    }),
    rowProps: (loc) => ({ onDragOver: onDragOver(loc), onDrop: onDrop(loc) }),
    listProps: (sectionId, count) => {
      const end = { sectionId, index: count }
      return { onDragOver: onDragOver(end), onDrop: onDrop(end) }
    },
  }
}

import { useState } from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { userEvent } from 'vitest/browser'
import { ThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import theme from '../../../lib/theme.js'
import LayoutBuilder from '../components/LayoutBuilder.jsx'

// Widgets and sections reorder by dragging their thumb with a pointer (mouse or
// touch): over the middle of another row the two swap, near an edge or in a gap
// the item is inserted there. Grabbing a section collapses every section until
// the drop. These tests drive real pointer events through a stateful
// LayoutBuilder and assert the rendered order, plus the keyboard equivalent.

const initial = [
  {
    id: 's1',
    title: 'Links',
    widgets: [
      { id: 'w1', type: 'link', label: 'Site', url: 'https://a.example', icon: 'globe' },
      { id: 'w2', type: 'link', label: 'Shop', url: 'https://b.example', icon: 'globe' },
      { id: 'w4', type: 'link', label: 'Blog', url: 'https://c.example', icon: 'globe' },
    ],
  },
  { id: 's2', title: 'More', widgets: [{ id: 'w3', type: 'gigs' }] },
  { id: 's3', title: 'Empty', widgets: [] },
]

function StatefulBuilder({ onReorder, padding }) {
  const [sections, setSections] = useState(initial)
  return (
    <div style={{ padding }}>
      <LayoutBuilder
        sections={sections}
        content={{}}
        openWidget={null}
        setOpenWidget={vi.fn()}
        canAdd={() => true}
        pageType="main"
        onUpdateSection={vi.fn()}
        onReorder={(next) => {
          onReorder(next)
          setSections(next)
        }}
        onRemoveSection={vi.fn()}
        onAddWidget={vi.fn()}
        onAddSection={vi.fn()}
        onUnfurl={vi.fn()}
      />
    </div>
  )
}

async function renderBuilder({ padding = '80px 0' } = {}) {
  const onReorder = vi.fn()
  const screen = await render(
    <ThemeProvider theme={theme} defaultMode="light">
      <CssBaseline enableColorScheme />
      <StatefulBuilder onReorder={onReorder} padding={padding} />
    </ThemeProvider>,
  )
  return { screen, onReorder }
}

// Each section as "sectionId widgetId…", in rendered order.
const layout = () => Array.from(document.querySelectorAll('[data-reorder-item="section"]'), (card) =>
  Array.from(card.querySelectorAll('[data-reorder-handle]'), (h) => h.dataset.reorderHandle).join(' '))

const handle = (id) => document.querySelector(`[data-reorder-handle="${id}"]`)
const item = (id) => handle(id).closest('[data-reorder-item]')
const box = (id) => item(id).getBoundingClientRect()
const middle = (id) => box(id).top + box(id).height / 2
const indicators = (kind) => document.querySelectorAll(`[data-drop-indicator="${kind}"]`)
const visible = (id) => item(id).checkVisibility({ visibilityProperty: true })
const collapsed = () => expect.poll(() => visible('w1')).toBe(false)
const frame = () => new Promise((resolve) => requestAnimationFrame(() => resolve()))

const pointer = (clientY) => ({
  bubbles: true, cancelable: true, pointerId: 1, pointerType: 'mouse', isPrimary: true, button: 0, clientX: 20, clientY,
})

async function grab(id) {
  const r = handle(id).getBoundingClientRect()
  handle(id).dispatchEvent(new PointerEvent('pointerdown', pointer(r.top + r.height / 2)))
  await frame()
}

async function moveTo(y) {
  document.dispatchEvent(new PointerEvent('pointermove', pointer(y)))
  await frame()
}

async function drop(y) {
  document.dispatchEvent(new PointerEvent('pointerup', pointer(y)))
  await frame()
}

describe('widget reorder', () => {
  it('offers a drag thumb and a delete control per row, and no move buttons', async () => {
    const { screen } = await renderBuilder()
    expect(document.querySelectorAll('[aria-label^="Reorder widget"]')).toHaveLength(4)
    expect(screen.getByRole('button', { name: 'Delete widget' }).elements()).toHaveLength(4)
    expect(screen.getByRole('button', { name: /^Move widget/ }).elements()).toHaveLength(0)
  })

  it('swaps two rows dropped on the middle of one another, with a swap badge while hovering', async () => {
    await renderBuilder()
    await grab('w1')
    await moveTo(middle('w4'))

    await expect.poll(() => item('w4').querySelector('[data-drop-indicator="swap"]')).not.toBeNull()
    expect(indicators('insert')).toHaveLength(0)
    expect(item('w1').style.transform).toMatch(/translateY/)

    await drop(middle('w4'))
    await expect.poll(layout).toEqual(['s1 w4 w2 w1', 's2 w3', 's3'])
    expect(item('w1').style.transform).toBe('')
    expect(indicators('swap')).toHaveLength(0)
  })

  it('swaps rows across sections', async () => {
    await renderBuilder()
    await grab('w2')
    await moveTo(middle('w3'))
    await drop(middle('w3'))
    await expect.poll(layout).toEqual(['s1 w1 w3 w4', 's2 w2', 's3'])
  })

  it('inserts into the gap between two rows, marked by a line', async () => {
    await renderBuilder()
    await grab('w1')
    const gap = box('w4').top - 4
    await moveTo(gap)

    await expect.poll(() => indicators('insert').length).toBe(1)
    expect(indicators('swap')).toHaveLength(0)

    await drop(gap)
    await expect.poll(layout).toEqual(['s1 w2 w1 w4', 's2 w3', 's3'])
  })

  it('inserts after the last row of a section', async () => {
    await renderBuilder()
    await grab('w1')
    await moveTo(box('w4').bottom - 2)
    await expect.poll(() => indicators('insert').length).toBe(1)
    await drop(box('w4').bottom - 2)
    await expect.poll(layout).toEqual(['s1 w2 w4 w1', 's2 w3', 's3'])
  })

  it('drops into an empty section', async () => {
    const { screen } = await renderBuilder()
    await expect.element(screen.getByText('No widgets yet')).toBeVisible()
    await grab('w3')
    await expect.element(screen.getByText('Drop here')).toBeVisible()
    const zone = screen.getByText('Drop here').element().getBoundingClientRect()
    await moveTo(zone.top + zone.height / 2)
    await expect.poll(() => indicators('empty').length).toBe(1)
    await drop(zone.top + zone.height / 2)
    await expect.poll(layout).toEqual(['s1 w1 w2 w4', 's2', 's3 w3'])
  })

  it('shows no drop indicator over its own spot and changes nothing there', async () => {
    const { onReorder } = await renderBuilder()
    await grab('w2')
    await moveTo(middle('w2') + 3)
    expect(indicators('swap')).toHaveLength(0)
    expect(indicators('insert')).toHaveLength(0)
    await drop(middle('w2') + 3)
    expect(onReorder).not.toHaveBeenCalled()
  })

  it('cancels the drag on Escape', async () => {
    const { onReorder } = await renderBuilder()
    await grab('w1')
    await moveTo(middle('w4'))
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    await drop(middle('w4'))
    expect(onReorder).not.toHaveBeenCalled()
    expect(item('w1').style.transform).toBe('')
    expect(indicators('swap')).toHaveLength(0)
  })

  it('walks a widget through its section and into the next with the arrow keys', async () => {
    await renderBuilder()
    handle('w2').focus()
    await userEvent.keyboard('{ArrowDown}')
    await expect.poll(layout).toEqual(['s1 w1 w4 w2', 's2 w3', 's3'])
    await userEvent.keyboard('{ArrowDown}')
    await expect.poll(layout).toEqual(['s1 w1 w4', 's2 w2 w3', 's3'])
    expect(document.activeElement).toBe(handle('w2'))
  })

  it('ignores arrow keys at the very top of the first section', async () => {
    const { onReorder } = await renderBuilder()
    handle('w1').focus()
    await userEvent.keyboard('{ArrowUp}')
    expect(onReorder).not.toHaveBeenCalled()
  })
})

describe('section reorder', () => {
  it('offers a drag thumb and a delete control per section, and no move buttons', async () => {
    const { screen } = await renderBuilder()
    expect(document.querySelectorAll('[aria-label^="Reorder section"]')).toHaveLength(3)
    expect(screen.getByRole('button', { name: 'Delete section' }).elements()).toHaveLength(3)
    expect(screen.getByRole('button', { name: /^Move section/ }).elements()).toHaveLength(0)
  })

  it('collapses every section while one is grabbed and expands them on drop', async () => {
    const { screen } = await renderBuilder()
    await grab('s2')
    expect(visible('w1')).toBe(true)
    await collapsed()
    await expect.element(screen.getByText('3 widgets')).toBeVisible()
    await expect.element(screen.getByText('1 widget', { exact: true })).toBeVisible()

    await drop(middle('s2'))
    await expect.element(screen.getByRole('button', { name: 'Custom link · Site' })).toBeVisible()
    expect(screen.getByText('3 widgets').elements()).toHaveLength(0)
  })

  it('keeps the grabbed section under the pointer while the others collapse and expand', async () => {
    await renderBuilder({ padding: '1200px 0' })
    window.scrollTo(0, window.scrollY + box('s3').top - 400)
    const before = box('s3').top
    await grab('s3')
    await collapsed()
    await frame()
    expect(Math.abs(box('s3').top - before)).toBeLessThan(2)

    await drop(before + 20)
    await expect.poll(() => visible('w1')).toBe(true)
    await new Promise((resolve) => setTimeout(resolve, 300))
    expect(Math.abs(box('s3').top - before)).toBeLessThan(2)
  })

  it('swaps two sections dropped on the middle of one another', async () => {
    await renderBuilder()
    await grab('s1')
    await collapsed()
    await moveTo(middle('s3'))
    await expect.poll(() => item('s3').querySelector('[data-drop-indicator="swap"]')).not.toBeNull()
    await drop(middle('s3'))
    await expect.poll(layout).toEqual(['s3', 's2 w3', 's1 w1 w2 w4'])
  })

  it('inserts a section into the gap between two others', async () => {
    await renderBuilder()
    await grab('s3')
    await collapsed()
    const gap = box('s2').top - 8
    await moveTo(gap)
    await expect.poll(() => indicators('insert').length).toBe(1)
    await drop(gap)
    await expect.poll(layout).toEqual(['s1 w1 w2 w4', 's3', 's2 w3'])
  })

  it('moves a section with the arrow keys', async () => {
    await renderBuilder()
    handle('s1').focus()
    await userEvent.keyboard('{ArrowDown}')
    await expect.poll(layout).toEqual(['s2 w3', 's1 w1 w2 w4', 's3'])
    expect(document.activeElement).toBe(handle('s1'))
  })
})

import { useState } from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { userEvent } from 'vitest/browser'
import { ThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import theme from '../../src/lib/theme.js'
import LayoutBuilder from '../../src/features/editor/components/LayoutBuilder.jsx'
import { moveWidget } from '../../src/features/editor/utils/editorUtils.js'

// Widget rows reorder by dragging their thumb, and a widget can be dragged into
// another section — so the drag state lives in LayoutBuilder and the only
// mutation is onMoveWidget(from, to) with { sectionId, index } locations. These
// tests drive the real HTML5 drag events, the keyboard equivalent, and the
// explicit buttons that keep reordering available without native drag support.

const sections = [
  {
    id: 's1',
    title: 'Links',
    widgets: [
      { id: 'w1', type: 'link', label: 'Site', url: 'https://a.example', icon: 'globe' },
      { id: 'w2', type: 'link', label: 'Shop', url: 'https://b.example', icon: 'globe' },
    ],
  },
  { id: 's2', title: 'More', widgets: [{ id: 'w3', type: 'gigs' }] },
]

async function renderBuilder() {
  const onMoveWidget = vi.fn()
  const screen = await render(
    <ThemeProvider theme={theme} defaultMode="light">
      <CssBaseline enableColorScheme />
      <LayoutBuilder
        sections={sections}
        content={{}}
        openWidget={null}
        setOpenWidget={vi.fn()}
        canAdd={() => true}
        pageType="main"
        onUpdateSection={vi.fn()}
        onMoveSection={vi.fn()}
        onMoveWidget={onMoveWidget}
        onRemoveSection={vi.fn()}
        onAddWidget={vi.fn()}
        onAddSection={vi.fn()}
        onUnfurl={vi.fn()}
      />
    </ThemeProvider>,
  )
  return { screen, onMoveWidget }
}

function StatefulBuilder() {
  const [current, setCurrent] = useState(sections)
  return (
    <LayoutBuilder
      sections={current}
      content={{}}
      openWidget={null}
      setOpenWidget={vi.fn()}
      canAdd={() => true}
      pageType="main"
      onUpdateSection={vi.fn()}
      onMoveSection={vi.fn()}
      onMoveWidget={(from, to) => setCurrent((value) => moveWidget(value, from, to))}
      onRemoveSection={vi.fn()}
      onAddWidget={vi.fn()}
      onAddSection={vi.fn()}
      onUnfurl={vi.fn()}
    />
  )
}

async function renderStatefulBuilder() {
  return render(
    <ThemeProvider theme={theme} defaultMode="light">
      <CssBaseline enableColorScheme />
      <StatefulBuilder />
    </ThemeProvider>,
  )
}

const thumbs = () => Array.from(document.querySelectorAll('[aria-label^="Reorder widget"]'))
const rows = () => Array.from(document.querySelectorAll('li'))

// One full pointer drag, as the browser fires it: dragstart on the thumb, then
// dragover + drop on the destination row (one DataTransfer throughout).
function drag(thumb, target) {
  const dataTransfer = new DataTransfer()
  const fire = (el, type) => el.dispatchEvent(new DragEvent(type, { dataTransfer, bubbles: true, cancelable: true }))
  fire(thumb, 'dragstart')
  fire(target, 'dragover')
  fire(target, 'drop')
  fire(thumb, 'dragend')
}

describe('widget reorder', () => {
  it('renders a draggable thumb and explicit move controls for every row', async () => {
    const { screen } = await renderBuilder()
    expect(thumbs()).toHaveLength(3)
    expect(thumbs()[0].getAttribute('draggable')).toBe('true')
    await expect.element(screen.getByRole('button', { name: 'Move widget up' }).first()).toBeDisabled()
    await expect.element(screen.getByRole('button', { name: 'Move widget down' }).last()).toBeDisabled()
  })

  it('reports a drop onto another row in the same section', async () => {
    const { onMoveWidget } = await renderBuilder()
    // rows: [s1/w1, s1/w2, s2/w3]
    drag(thumbs()[0], rows()[1])
    expect(onMoveWidget).toHaveBeenCalledWith({ sectionId: 's1', index: 0 }, { sectionId: 's1', index: 1 })
  })

  it('reports a drop onto a row in a different section', async () => {
    const { onMoveWidget } = await renderBuilder()
    drag(thumbs()[0], rows()[2])
    expect(onMoveWidget).toHaveBeenCalledWith({ sectionId: 's1', index: 0 }, { sectionId: 's2', index: 0 })
  })

  it('walks a widget through its section with the arrow keys', async () => {
    const { onMoveWidget } = await renderBuilder()
    thumbs()[0].focus()
    await userEvent.keyboard('{ArrowDown}')
    expect(onMoveWidget).toHaveBeenCalledWith({ sectionId: 's1', index: 0 }, { sectionId: 's1', index: 1 })
  })

  it('carries a widget into the next section when arrowing past the last row', async () => {
    const { onMoveWidget } = await renderBuilder()
    thumbs()[1].focus()
    await userEvent.keyboard('{ArrowDown}')
    expect(onMoveWidget).toHaveBeenCalledWith({ sectionId: 's1', index: 1 }, { sectionId: 's2', index: 0 })
  })

  it('uses the move buttons across section boundaries', async () => {
    const { screen, onMoveWidget } = await renderBuilder()
    await screen.getByRole('button', { name: 'Move widget down' }).nth(1).click()
    expect(onMoveWidget).toHaveBeenCalledWith({ sectionId: 's1', index: 1 }, { sectionId: 's2', index: 0 })
  })

  it('keeps the moved widget focused after crossing into another section', async () => {
    await renderStatefulBuilder()
    document.querySelector('[data-reorder-widget="w2"]').focus()
    await userEvent.keyboard('{ArrowDown}')

    expect(document.activeElement).toBe(document.querySelector('[data-reorder-widget="w2"]'))
    await userEvent.keyboard('{ArrowDown}')
    expect(document.activeElement).toBe(document.querySelector('[data-reorder-widget="w2"]'))
  })

  it('ignores arrow keys at the very top of the first section', async () => {
    const { onMoveWidget } = await renderBuilder()
    thumbs()[0].focus()
    await userEvent.keyboard('{ArrowUp}')
    expect(onMoveWidget).not.toHaveBeenCalled()
  })
})

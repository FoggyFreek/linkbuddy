import { useRef, useState } from 'react'
import Stack from '@mui/material/Stack'
import Button from '@mui/material/Button'
import AddIcon from '@mui/icons-material/Add'
import SectionEditor, { SECTION_COLLAPSE_MS } from './SectionEditor.js'
import useDragReorder from '../hooks/useDragReorder.js'
import { dropItem, dropWidget, moveItem, moveWidget } from '../utils/editorUtils.js'
import type { ContentSnapshot, DraftSection, PageType, UnfurlResult, WidgetType } from '../../../types.js'

// The Build tab body: the ordered list of section cards plus the "Add section"
// button. It maps each section to a SectionEditor and translates the section's
// index/id into the position-independent callbacks Editor owns. (Page-level
// styling — the background — lives in the Appearance tab, see AppearancePanel.)
//
// Both drags live here: a widget can be dragged from one section into another,
// and grabbing a section collapses every card until it is dropped. Every
// reorder reports the whole new section list through `onReorder`.
export default function LayoutBuilder({
  sections,
  content,
  openWidget,
  setOpenWidget,
  canAdd,
  pageType,
  onUpdateSection,
  onReorder,
  onRemoveSection,
  onAddWidget,
  onAddSection,
  onUnfurl,
}: Readonly<{
  sections: DraftSection[]
  content: ContentSnapshot
  openWidget: string | null
  setOpenWidget: (id: string | null) => void
  canAdd: (needs?: 'songs' | 'products') => boolean
  pageType: PageType
  onUpdateSection: (sectionId: string, patch: Partial<DraftSection>) => void
  onReorder: (sections: DraftSection[]) => void
  onRemoveSection: (sectionId: string) => void
  onAddWidget: (section: DraftSection, type: WidgetType) => void
  onAddSection: () => void
  onUnfurl: (url: string) => Promise<UnfurlResult>
}>) {
  const root = useRef<HTMLDivElement>(null)
  const [collapsed, setCollapsed] = useState(false)
  const widgetDrag = useDragReorder({
    group: 'widget',
    root,
    onDrop: (from, target) => onReorder(dropWidget(sections, { sectionId: from.list, index: from.index }, target)),
  })
  const sectionDrag = useDragReorder({
    group: 'section',
    root,
    onDrop: (from, target) => onReorder(dropItem(sections, from.index, target)),
    settleMs: SECTION_COLLAPSE_MS,
    onGrab: () => setCollapsed(true),
    onRelease: () => setCollapsed(false),
  })

  // Keyboard equivalent of a drag: arrow keys walk a widget through its section
  // and then on into the adjacent one, so reordering never needs a pointer.
  const moveWidgetByKey = (sectionIndex: number, index: number, delta: number) => {
    const section = sections[sectionIndex]
    const from = { sectionId: section.id, index }
    const target = index + delta
    if (target >= 0 && target < section.widgets.length) {
      onReorder(moveWidget(sections, from, { sectionId: section.id, index: target }))
      return true
    }
    const neighbour = sections[sectionIndex + delta]
    if (!neighbour) return false
    onReorder(moveWidget(sections, from, { sectionId: neighbour.id, index: delta < 0 ? neighbour.widgets.length : 0 }))
    return true
  }

  const moveSectionByKey = (index: number, delta: number) => {
    const next = moveItem(sections, index, delta)
    if (next === sections) return false
    onReorder(next)
    return true
  }

  return (
    <Stack ref={root} spacing={2} {...sectionDrag.listProps('sections')}>
      {sections.map((section, sectionIndex) => {
        const spot = { list: 'sections', index: sectionIndex }
        return (
          <SectionEditor
            key={section.id}
            section={section}
            content={content}
            openWidget={openWidget}
            setOpenWidget={setOpenWidget}
            canAdd={canAdd}
            pageType={pageType}
            collapsed={collapsed}
            drop={sectionDrag.itemState(spot, sectionIndex === sections.length - 1)}
            handleProps={sectionDrag.handleProps(spot, section.id, (delta) => moveSectionByKey(sectionIndex, delta))}
            itemProps={sectionDrag.itemProps}
            widgetDrag={widgetDrag}
            onUpdate={(patch) => onUpdateSection(section.id, patch)}
            onMoveWidgetByKey={(index, delta) => moveWidgetByKey(sectionIndex, index, delta)}
            onRemove={() => onRemoveSection(section.id)}
            onAddWidget={(type) => onAddWidget(section, type)}
            onUnfurl={onUnfurl}
          />
        )
      })}
      <Button variant="outlined" onClick={onAddSection} startIcon={<AddIcon />} sx={{ alignSelf: 'center' }}>Add section</Button>
    </Stack>
  )
}

import Stack from '@mui/material/Stack'
import Button from '@mui/material/Button'
import AddIcon from '@mui/icons-material/Add'
import SectionEditor from './SectionEditor.js'
import useDragReorder from '../hooks/useDragReorder.js'
import type { ContentSnapshot, DragLocation, DraftSection, PageType, UnfurlResult, WidgetType } from '../../../types.js'

// The Build tab body: the ordered list of section cards plus the "Add section"
// button. It maps each section to a SectionEditor and translates the section's
// index/id into the position-independent callbacks Editor owns. (Page-level
// styling — the background — lives in the Appearance tab, see AppearancePanel.)
//
// Widget drag state lives here rather than in a section because a widget can be
// dragged from one section into another; sections only render what the hook
// hands them.
export default function LayoutBuilder({
  sections,
  content,
  openWidget,
  setOpenWidget,
  canAdd,
  pageType,
  onUpdateSection,
  onMoveSection,
  onMoveWidget,
  onRemoveSection,
  onAddWidget,
  onAddSection,
  onUnfurl,
}: {
  sections: DraftSection[]
  content: ContentSnapshot
  openWidget: string | null
  setOpenWidget: (id: string | null) => void
  canAdd: (needs?: 'songs' | 'products') => boolean
  pageType: PageType
  onUpdateSection: (sectionId: string, patch: Partial<DraftSection>) => void
  onMoveSection: (index: number, delta: number) => void
  onMoveWidget: (from: DragLocation, to: DragLocation) => void
  onRemoveSection: (sectionId: string) => void
  onAddWidget: (section: DraftSection, type: WidgetType) => void
  onAddSection: () => void
  onUnfurl: (url: string) => Promise<UnfurlResult>
}) {
  const drag = useDragReorder(onMoveWidget)

  // Keyboard equivalent of a drag: arrow keys walk a widget through its section
  // and then on into the adjacent one, so reordering never needs a pointer.
  const moveByKey = (sectionIndex: number, index: number, delta: number) => {
    const section = sections[sectionIndex]
    const from = { sectionId: section.id, index }
    const target = index + delta
    if (target >= 0 && target < section.widgets.length) {
      onMoveWidget(from, { sectionId: section.id, index: target })
      return true
    }
    const neighbour = sections[sectionIndex + delta]
    if (!neighbour) return false
    onMoveWidget(from, { sectionId: neighbour.id, index: delta < 0 ? neighbour.widgets.length : 0 })
    return true
  }

  return (
    <Stack spacing={2}>
      {sections.map((section, sectionIndex) => (
        <SectionEditor
          key={section.id}
          section={section}
          content={content}
          index={sectionIndex}
          count={sections.length}
          openWidget={openWidget}
          setOpenWidget={setOpenWidget}
          canAdd={canAdd}
          pageType={pageType}
          drag={drag}
          onUpdate={(patch) => onUpdateSection(section.id, patch)}
          onMove={(delta) => onMoveSection(sectionIndex, delta)}
          onMoveWidgetByKey={(index, delta) => moveByKey(sectionIndex, index, delta)}
          onRemove={() => onRemoveSection(section.id)}
          onAddWidget={(type) => onAddWidget(section, type)}
          onUnfurl={onUnfurl}
        />
      ))}
      <Button variant="outlined" onClick={onAddSection} startIcon={<AddIcon />} sx={{ alignSelf: 'center' }}>Add section</Button>
    </Stack>
  )
}

import Stack from '@mui/material/Stack'
import Button from '@mui/material/Button'
import AddIcon from '@mui/icons-material/Add'
import SectionEditor from './SectionEditor.jsx'

// The Build tab body: the ordered list of section cards plus the "Add section"
// button. It maps each section to a SectionEditor and translates the section's
// index/id into the position-independent callbacks Editor owns.
export default function LayoutBuilder({
  sections,
  content,
  openWidget,
  setOpenWidget,
  canAdd,
  onUpdateSection,
  onMoveSection,
  onRemoveSection,
  onAddWidget,
  onAddSection,
  onUnfurl,
}) {
  return (
    <Stack spacing={2}>
      {sections.map((section, sectionIndex) => (
        <SectionEditor
          key={section.id}
          section={section}
          content={content}
          isFirst={sectionIndex === 0}
          isLast={sectionIndex === sections.length - 1}
          openWidget={openWidget}
          setOpenWidget={setOpenWidget}
          canAdd={canAdd}
          onUpdate={(patch) => onUpdateSection(section.id, patch)}
          onMove={(delta) => onMoveSection(sectionIndex, delta)}
          onRemove={() => onRemoveSection(section.id)}
          onAddWidget={(type) => onAddWidget(section, type)}
          onUnfurl={onUnfurl}
        />
      ))}
      <Button variant="outlined" onClick={onAddSection} startIcon={<AddIcon />} sx={{ alignSelf: 'center' }}>Add section</Button>
    </Stack>
  )
}

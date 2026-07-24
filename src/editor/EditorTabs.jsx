import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'

// The Build / Preview / Statistics tab bar. Selecting Preview needs to (re)load
// the preview, so the parent handles the change event rather than this owning it.
export default function EditorTabs({ value, onChange }) {
  return (
    <Tabs value={value} onChange={onChange} sx={{ mt: 2.5, mb: 1.5, minHeight: 40 }}>
      <Tab value="build" label="Build" />
      <Tab value="preview" label="Preview" />
      <Tab value="stats" label="Statistics" />
    </Tabs>
  )
}

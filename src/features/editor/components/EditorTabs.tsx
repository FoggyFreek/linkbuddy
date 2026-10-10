import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import type { SyntheticEvent } from 'react'
import type { EditorTab, PageType } from '../../../types.js'

// The editor views, including Tracking only for release smart links. Build is the page's
// content, Appearance how it looks. Selecting Preview needs to (re)load the
// preview, so the parent handles the change event rather than this owning it.
export default function EditorTabs({ value, onChange, pageType = 'main' }: Readonly<{ value: EditorTab; pageType?: PageType; onChange: (event: SyntheticEvent, value: EditorTab) => void }>) {
  return (
    <Tabs value={value} onChange={onChange} sx={{ mt: 2.5, mb: 1.5, minHeight: 40 }} variant="scrollable" scrollButtons="auto">
      <Tab value="build" label="Build" />
      <Tab value="appearance" label="Appearance" />
      {pageType === 'release' && <Tab value="tracking" label="Tracking" />}
      <Tab value="preview" label="Preview" />
      <Tab value="stats" label="Statistics" />
    </Tabs>
  )
}

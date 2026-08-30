import type { SyntheticEvent } from 'react'
import Box from '@mui/material/Box'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import Tooltip from '@mui/material/Tooltip'
import AddIcon from '@mui/icons-material/Add'
import type { PageListEntry } from '../../../types.js'

const NEW_RELEASE = 'new-release'

// The tab bar for switching between the tenant's pages, plus a trailing "+" tab
// that starts a new release page instead of selecting one. `labelFor` maps a
// page-list entry to its visitor-facing name; `hasSongs` gates release creation
// (a release needs a song with links).
export default function PageSwitcher({ pages, currentId, hasSongs, labelFor, onSelect, onNewRelease }: Readonly<{
  pages: PageListEntry[]
  currentId: number
  hasSongs: boolean
  labelFor: (page: PageListEntry) => string
  onSelect: (pageId: number) => void
  onNewRelease: () => void
}>) {
  const change = (_event: SyntheticEvent, value: number | typeof NEW_RELEASE) => {
    if (value === NEW_RELEASE) onNewRelease()
    else onSelect(value)
  }

  return (
    <Tabs
      value={currentId}
      onChange={change}
      variant="scrollable"
      scrollButtons="auto"
      sx={{ mt: 2, minHeight: 40, borderBottom: 1, borderColor: 'divider' }}
    >
      {pages.map((p) => (
        <Tab
          key={p.id}
          value={p.id}
          label={`${p.pageType === 'main' ? '★ ' : ''}${labelFor(p)}${!p.publishedAt && p.id !== currentId ? ' (draft)' : ''}`}
        />
      ))}
      <Tab
        value={NEW_RELEASE}
        aria-label="New release page"
        disabled={!hasSongs}
        sx={{ minWidth: 48 }}
        label={(
          <Tooltip title={hasSongs ? 'New release page' : 'Add streaming links to a song in GigBuddy first'}>
            {/* A disabled Tab drops pointer events, which would swallow the hover too. */}
            <Box component="span" sx={{ display: 'flex', pointerEvents: 'auto' }}><AddIcon fontSize="small" /></Box>
          </Tooltip>
        )}
      />
    </Tabs>
  )
}

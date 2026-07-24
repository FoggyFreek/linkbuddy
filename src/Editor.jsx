import { useCallback, useRef, useState } from 'react'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Card from '@mui/material/Card'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import TextField from '@mui/material/TextField'
import IconButton from '@mui/material/IconButton'
import Link from '@mui/material/Link'
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp'
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import CloseIcon from '@mui/icons-material/Close'
import AddIcon from '@mui/icons-material/Add'
import {
  unfurlUrl,
  createReleasePage,
  getEditorPage,
  deleteEditorPage,
  getPreview,
  publishPage,
  refreshContent,
} from './api.js'
import WidgetStack from './WidgetStack.jsx'
import StatsPanel from './StatsPanel.jsx'
import ShareButton from './ShareButton.jsx'
import ColorModeToggle from './ColorModeToggle.jsx'
import { useEditorSession } from './hooks/useEditorSession.js'
import { useLayoutEditor } from './hooks/useLayoutEditor.js'
import { WidgetEditor } from './widgets/WidgetEditors.jsx'
import NewReleaseForm from './widgets/NewReleaseForm.jsx'
import { makeWidget, widgetSummary } from './widgets/widgetModel.js'
import { moveItem, saveErrorState, toListEntry } from './editorUtils.js'

function newId() {
  return crypto.randomUUID()
}

function StatusBox({ children, busy }) {
  return (
    <Box sx={{ maxWidth: 600, mx: 'auto', my: '20vh', px: 3, textAlign: 'center', color: 'text.secondary' }} aria-busy={busy || undefined}>
      {children}
    </Box>
  )
}

const ADD_TYPES = [
  { type: 'song', label: 'Song', needs: 'songs' },
  { type: 'platforms', label: 'Platform buttons', needs: 'songs' },
  { type: 'gigs', label: 'Gigs' },
  { type: 'merch', label: 'Merch', needs: 'products' },
  { type: 'link', label: 'Link' },
  { type: 'embed', label: 'Embed' },
]

// The editor page: a stack of sections, each a stack of widgets that link to
// the band's GigBuddy content. Session/page loading lives in useEditorSession,
// draft persistence in useLayoutEditor; this component wires them to the UI and
// owns the immutable layout transforms.
export default function Editor() {
  const sessionRef = useRef(null)
  const [page, setPage] = useState(null)
  const [tab, setTab] = useState('build')
  const [preview, setPreview] = useState(null)
  const [publishedAt, setPublishedAt] = useState(null)
  const [openWidget, setOpenWidget] = useState(null)
  const [creatingRelease, setCreatingRelease] = useState(false)

  const { layout, saveState, setSaveState, applyLayout, flushSave, loadLayout } = useLayoutEditor(sessionRef)

  // Adopt a loaded page: reset the draft layout and all per-page UI state.
  const adoptPage = useCallback((loaded) => {
    setPage(loaded)
    loadLayout(loaded.id, loaded.draftLayout)
    setPublishedAt(loaded.publishedAt)
    setPreview(null)
    setOpenWidget(null)
    setTab('build')
  }, [loadLayout])

  const { session, pages, setPages, fatal, setFatal } = useEditorSession(sessionRef, adoptPage)

  if (fatal) return <StatusBox>{fatal}</StatusBox>
  if (!page || !layout) return <StatusBox busy />

  const content = page.content || {}
  const mainSlug = pages.find((p) => p.pageType === 'main')?.slug || page.slug

  // ---------- page switching / creation ----------

  const selectPage = async (pageId) => {
    if (pageId === page.id) return
    await flushSave()
    try {
      adoptPage(await getEditorPage(sessionRef.current, pageId))
    } catch (err) {
      setFatal(err.message)
    }
  }

  const createRelease = async (songId, slug) => {
    const { page: created } = await createReleasePage(sessionRef.current, songId, slug)
    setPages((prev) => [...prev, toListEntry(created)])
    setCreatingRelease(false)
    adoptPage(created)
  }

  const removeCurrentPage = async () => {
    if (page.pageType !== 'release') return
    if (!window.confirm(`Delete the release page /${page.slug}? Its statistics are deleted too.`)) return
    try {
      await deleteEditorPage(sessionRef.current, page.id)
      const remaining = pages.filter((p) => p.id !== page.id)
      setPages(remaining)
      const main = remaining.find((p) => p.pageType === 'main') || remaining[0]
      adoptPage(await getEditorPage(sessionRef.current, main.id))
    } catch (err) {
      setFatal(err.message)
    }
  }

  // ---------- layout operations (all immutable) ----------

  const updateSection = (sectionId, patch) => {
    applyLayout({
      ...layout,
      sections: layout.sections.map((s) => (s.id === sectionId ? { ...s, ...patch } : s)),
    })
  }

  const addSection = () => {
    applyLayout({ ...layout, sections: [...layout.sections, { id: newId(), title: null, widgets: [] }] })
  }

  const removeSection = (sectionId) => {
    applyLayout({ ...layout, sections: layout.sections.filter((s) => s.id !== sectionId) })
  }

  const moveSection = (index, delta) => {
    applyLayout({ ...layout, sections: moveItem(layout.sections, index, delta) })
  }

  const addWidget = (section, widget) => {
    updateSection(section.id, { widgets: [...section.widgets, widget] })
    setOpenWidget(widget.id)
  }

  const buildWidget = (section, type) => {
    const widget = makeWidget(type, content)
    if (widget) addWidget(section, widget)
  }

  const publish = async () => {
    await flushSave()
    try {
      const result = await publishPage(sessionRef.current, page.id)
      setPublishedAt(result.publishedAt)
      setPages((prev) => prev.map((p) => (p.id === page.id ? { ...p, publishedAt: result.publishedAt } : p)))
    } catch (err) {
      setSaveState(saveErrorState(err))
    }
  }

  const openPreview = async () => {
    await flushSave()
    try {
      setPreview(await getPreview(sessionRef.current, page.id))
      setTab('preview')
    } catch (err) {
      setSaveState(saveErrorState(err))
    }
  }

  const refresh = async () => {
    try {
      const loaded = await refreshContent(sessionRef.current, page.id)
      setPage(loaded)
    } catch {
      /* keep the current snapshot */
    }
  }

  const saveLabel = {
    saved: 'All changes saved',
    dirty: 'Unsaved changes…',
    saving: 'Saving…',
    error: 'Save failed — retrying on next change',
    expired: 'Session expired — reopen from GigBuddy',
  }[saveState]

  const pageLabel = (p) =>
    p.pageType === 'main' ? (content.band?.name || p.slug) : (p.release?.title || p.slug)

  const canAdd = (needs) => !needs || (content[needs]?.length ?? 0) > 0

  return (
    <Box sx={{ maxWidth: 760, mx: 'auto', px: 2, pt: 3, pb: 10 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2, flexWrap: 'wrap' }}>
        <Box>
          <Typography variant="h2" component="h1">
            {pageLabel(page)} — {page.pageType === 'release' ? 'release page' : 'link page'}
          </Typography>
          <Typography variant="caption" color="text.secondary">{saveLabel}</Typography>
        </Box>
        <Stack direction="row" spacing={1} useFlexGap sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
          <ColorModeToggle />
          {publishedAt && (
            <ShareButton
              variant="inline"
              url={page.publicUrl}
              title={page.pageType === 'release' ? page.release?.title || page.slug : content.band?.name || page.slug}
            />
          )}
          <Button variant="outlined" onClick={refresh}>Refresh content</Button>
          {page.pageType === 'release' && <Button variant="outlined" onClick={removeCurrentPage}>Delete page</Button>}
          <Button variant="outlined" onClick={openPreview}>Preview</Button>
          <Button variant="contained" onClick={publish}>{publishedAt ? 'Publish changes' : 'Publish'}</Button>
        </Stack>
      </Box>

      <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap', mt: 2 }}>
        {pages.map((p) => (
          <Chip
            key={p.id}
            label={`${p.pageType === 'main' ? '★ ' : ''}${pageLabel(p)}${!p.publishedAt && p.id !== page.id ? ' (draft)' : ''}`}
            color={p.id === page.id ? 'primary' : 'default'}
            variant={p.id === page.id ? 'filled' : 'outlined'}
            onClick={() => selectPage(p.id)}
          />
        ))}
        <Chip
          icon={<AddIcon />}
          label="New release page"
          variant="outlined"
          onClick={() => setCreatingRelease(true)}
          disabled={!content.songs?.length}
          title={content.songs?.length ? '' : 'Add streaming links to a song in GigBuddy first'}
          sx={{ borderStyle: 'dashed' }}
        />
      </Stack>

      {creatingRelease && (
        <NewReleaseForm
          songs={content.songs || []}
          mainSlug={mainSlug}
          onCreate={createRelease}
          onCancel={() => setCreatingRelease(false)}
        />
      )}

      <Tabs value={tab} onChange={(e, v) => (v === 'preview' ? openPreview() : setTab(v))} sx={{ mt: 2.5, mb: 1.5, minHeight: 40 }}>
        <Tab value="build" label="Build" />
        <Tab value="preview" label="Preview" />
        <Tab value="stats" label="Statistics" />
      </Tabs>

      {publishedAt && tab === 'build' && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Live at{' '}
          <Link href={page.publicUrl} target="_blank" rel="noopener noreferrer" sx={{ color: 'inherit', textDecoration: 'underline' }}>{page.publicUrl}</Link>
          {' '}(last published {new Date(publishedAt).toLocaleString()})
        </Typography>
      )}

      {tab === 'build' && (
        <Stack spacing={2}>
          {layout.sections.map((section, sectionIndex) => (
            <Card key={section.id} sx={{ p: '14px 16px' }}>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                <TextField
                  size="small"
                  fullWidth
                  placeholder="Section title (optional)"
                  value={section.title || ''}
                  onChange={(e) => updateSection(section.id, { title: e.target.value || null })}
                />
                <IconButton size="small" onClick={() => moveSection(sectionIndex, -1)} disabled={sectionIndex === 0} aria-label="Move section up"><KeyboardArrowUpIcon fontSize="small" /></IconButton>
                <IconButton size="small" onClick={() => moveSection(sectionIndex, 1)} disabled={sectionIndex === layout.sections.length - 1} aria-label="Move section down"><KeyboardArrowDownIcon fontSize="small" /></IconButton>
                <IconButton size="small" onClick={() => removeSection(section.id)} aria-label="Delete section"><CloseIcon fontSize="small" /></IconButton>
              </Stack>

              <Stack component="ul" spacing={1} sx={{ listStyle: 'none', m: '12px 0 0', p: 0 }}>
                {section.widgets.map((widget, widgetIndex) => (
                  <Box component="li" key={widget.id} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '10px', p: '8px 10px' }}>
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                      <Button
                        onClick={() => setOpenWidget(openWidget === widget.id ? null : widget.id)}
                        sx={{ flex: 1, justifyContent: 'flex-start', textAlign: 'left', color: 'text.primary', fontWeight: 400 }}
                      >
                        {widgetSummary(widget, content)}
                      </Button>
                      <IconButton size="small" onClick={() => updateSection(section.id, { widgets: moveItem(section.widgets, widgetIndex, -1) })} disabled={widgetIndex === 0} aria-label="Move widget up"><KeyboardArrowUpIcon fontSize="small" /></IconButton>
                      <IconButton size="small" onClick={() => updateSection(section.id, { widgets: moveItem(section.widgets, widgetIndex, 1) })} disabled={widgetIndex === section.widgets.length - 1} aria-label="Move widget down"><KeyboardArrowDownIcon fontSize="small" /></IconButton>
                      <IconButton size="small" onClick={() => updateSection(section.id, { widgets: section.widgets.filter((w) => w.id !== widget.id) })} aria-label="Delete widget"><CloseIcon fontSize="small" /></IconButton>
                    </Stack>
                    {openWidget === widget.id && (
                      <Box sx={{ mt: 1.25 }}>
                        <WidgetEditor
                          widget={widget}
                          content={content}
                          onUnfurl={(url) => unfurlUrl(sessionRef.current, url)}
                          onChange={(next) =>
                            updateSection(section.id, {
                              widgets: section.widgets.map((w) => (w.id === widget.id ? next : w)),
                            })
                          }
                        />
                      </Box>
                    )}
                  </Box>
                ))}
              </Stack>

              <Stack direction="row" spacing={1} useFlexGap sx={{ alignItems: 'center', flexWrap: 'wrap', mt: 1.5 }}>
                <Typography variant="body2" color="text.secondary">Add:</Typography>
                {ADD_TYPES.map((t) => (
                  <Button key={t.type} size="small" variant="outlined" onClick={() => buildWidget(section, t.type)} disabled={!canAdd(t.needs)} sx={{ borderRadius: 999, borderStyle: 'dashed' }}>
                    {t.label}
                  </Button>
                ))}
              </Stack>
            </Card>
          ))}
          <Button variant="outlined" onClick={addSection} startIcon={<AddIcon />} sx={{ alignSelf: 'center' }}>Add section</Button>
        </Stack>
      )}

      {tab === 'preview' && preview && (
        <Stack spacing={1}>
          <Typography variant="caption" color="text.secondary" align="center">This is exactly what visitors see.</Typography>
          <Box
            data-theme={preview.band?.theme === 'dark' ? 'dark' : 'light'}
            sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '24px', bgcolor: 'background.default', color: 'text.primary', p: '40px 16px 24px' }}
          >
            <WidgetStack page={preview} />
          </Box>
        </Stack>
      )}

      {tab === 'stats' && <StatsPanel session={session} pageId={page.id} />}
    </Box>
  )
}

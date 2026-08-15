import { Suspense, lazy, useCallback, useRef, useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Link from '@mui/material/Link'
import CenteredStatus from '../../components/CenteredStatus.jsx'
import {
  unfurlUrl,
  createReleasePage,
  getEditorPage,
  deleteEditorPage,
  getPreview,
  publishPage,
  refreshContent,
} from '../../lib/api.js'
// Split out: it pulls in the chart library, which no visitor of a public page
// (same bundle entry) should have to download.
const StatsPanel = lazy(() => import('../../features/editor/components/StatsPanel.jsx'))
import EditorHeader from '../../features/editor/components/EditorHeader.jsx'
import PageSwitcher from '../../features/editor/components/PageSwitcher.jsx'
import EditorTabs from '../../features/editor/components/EditorTabs.jsx'
import LayoutBuilder from '../../features/editor/components/LayoutBuilder.jsx'
import AppearancePanel from '../../features/editor/components/AppearancePanel.jsx'
import PagePreview from '../../features/editor/components/PagePreview.jsx'
import { useEditorSession } from '../../features/editor/hooks/useEditorSession.js'
import { useLayoutEditor } from '../../features/editor/hooks/useLayoutEditor.js'
import NewReleaseForm from '../../features/editor/components/NewReleaseForm.jsx'
import { makeWidget } from '../../features/editor/utils/widgetModel.js'
import { moveItem, moveWidget, pageLabel, pageSchemeMode, saveErrorState, toListEntry } from '../../features/editor/utils/editorUtils.js'
import { DEFAULT_PAGE_BACKGROUND } from '../../../shared/pageBackgrounds.js'
import { DEFAULT_PAGE_FONT } from '../../../shared/pageFonts.js'

function newId() {
  return crypto.randomUUID()
}

// The editor page: a stack of sections, each a stack of widgets that link to
// the band's GigBuddy content. Session/page loading lives in useEditorSession,
// draft persistence in useLayoutEditor, and the UI is split across ./editor/*;
// this component wires them together and owns the immutable layout transforms.
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

  if (fatal) return <CenteredStatus>{fatal}</CenteredStatus>
  if (!page || !layout) return <CenteredStatus busy />

  const content = page.content || {}
  const mainSlug = pages.find((p) => p.pageType === 'main')?.slug || page.slug
  const title = pageLabel(page, content)

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

  // The page's backdrop artwork. It lives on the layout rather than in band
  // content, so it saves, publishes and previews through the same path as the
  // sections — and each page (main, per release) can pick its own.
  const setBackground = (background) => {
    applyLayout({ ...layout, background })
  }

  // Whether to show the band's banner image (set in GigBuddy) above the link
  // list, with the avatar overlapping its bottom edge. Lives on the layout for
  // the same reason the background does — same save/publish/preview path.
  const setShowBanner = (showBanner) => {
    applyLayout({ ...layout, showBanner })
  }

  // The page's colour-scheme override: 'light'/'dark' opt-in, or `null` for
  // "auto" (dark on a release page, light on the main page — see
  // pageSchemeMode/server's normalizeTheme). Lives on the layout for the same
  // save/publish/preview path as the background and banner.
  const setTheme = (theme) => {
    applyLayout({ ...layout, theme })
  }

  // The page's typeface, one of the self-hosted faces in src/lib/pageFonts.js. On
  // the layout like the background and theme, so it takes the same
  // save/publish/preview path — and each page can set its own.
  const setFont = (font) => {
    applyLayout({ ...layout, font })
  }

  const moveSection = (index, delta) => {
    applyLayout({ ...layout, sections: moveItem(layout.sections, index, delta) })
  }

  // A widget dragged (or arrow-keyed) to a new slot, possibly in another
  // section; `from`/`to` are { sectionId, index }.
  const relocateWidget = (from, to) => {
    applyLayout({ ...layout, sections: moveWidget(layout.sections, from, to) })
  }

  const addWidget = (section, type) => {
    const widget = makeWidget(type, content)
    if (!widget) return
    updateSection(section.id, { widgets: [...section.widgets, widget] })
    setOpenWidget(widget.id)
  }

  // ---------- save / publish / preview / refresh ----------

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

  const canAdd = (needs) => !needs || (content[needs]?.length ?? 0) > 0

  return (
    <Box sx={{ maxWidth: 760, mx: 'auto', px: 2, pt: 3, pb: 10 }}>
      <EditorHeader
        page={page}
        title={title}
        saveLabel={saveLabel}
        publishedAt={publishedAt}
        onRefresh={refresh}
        onDelete={removeCurrentPage}
        onPublish={publish}
      />

      <PageSwitcher
        pages={pages}
        currentId={page.id}
        hasSongs={!!content.songs?.length}
        labelFor={(p) => pageLabel(p, content)}
        onSelect={selectPage}
        onNewRelease={() => setCreatingRelease(true)}
      />

      <EditorTabs value={tab} onChange={(e, v) => (v === 'preview' ? openPreview() : setTab(v))} />

      {publishedAt && tab === 'build' && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Live at{' '}
          <Link href={page.publicUrl} target="_blank" rel="noopener noreferrer" sx={{ color: 'inherit', textDecoration: 'underline' }}>{page.publicUrl}</Link>
          {' '}(last published {new Date(publishedAt).toLocaleString()})
        </Typography>
      )}

      {tab === 'build' && (
        <LayoutBuilder
          sections={layout.sections}
          content={content}
          openWidget={openWidget}
          setOpenWidget={setOpenWidget}
          canAdd={canAdd}
          pageType={page.pageType}
          onUpdateSection={updateSection}
          onMoveSection={moveSection}
          onMoveWidget={relocateWidget}
          onRemoveSection={removeSection}
          onAddWidget={addWidget}
          onAddSection={addSection}
          onUnfurl={(url) => unfurlUrl(sessionRef.current, url)}
        />
      )}

      {tab === 'appearance' && (
        <AppearancePanel
          background={layout.background || DEFAULT_PAGE_BACKGROUND}
          schemeMode={pageSchemeMode(page, layout)}
          onSetBackground={setBackground}
          bannerUrl={content.band?.bannerUrl}
          showBanner={!!layout.showBanner}
          onSetShowBanner={setShowBanner}
          theme={layout.theme ?? null}
          autoTheme={page.pageType === 'release' ? 'dark' : 'light'}
          onSetTheme={setTheme}
          font={layout.font || DEFAULT_PAGE_FONT}
          onSetFont={setFont}
        />
      )}

      {tab === 'preview' && preview && <PagePreview preview={preview} />}

      {tab === 'stats' && (
        <Suspense fallback={<CenteredStatus busy />}>
          <StatsPanel session={session} pageId={page.id} />
        </Suspense>
      )}

      {/* Mounted only while open so each run starts on a fresh song/slug. */}
      {creatingRelease && (
        <NewReleaseForm
          songs={content.songs || []}
          mainSlug={mainSlug}
          onCreate={createRelease}
          onCancel={() => setCreatingRelease(false)}
        />
      )}
    </Box>
  )
}

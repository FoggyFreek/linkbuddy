import { useCallback, useRef, useState } from 'react'
import Typography from '@mui/material/Typography'
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

  if (fatal) return <div className="page-status">{fatal}</div>
  if (!page || !layout) return <div className="page-status" aria-busy="true" />

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

  return (
    <div className="editor">
      <header className="editor-header">
        <div>
          <Typography variant="h2" component="h1">
            {pageLabel(page)} — {page.pageType === 'release' ? 'release page' : 'link page'}
          </Typography>
          <Typography className="save-state" variant="caption" color="text.secondary" component="span">
            {saveLabel}
          </Typography>
        </div>
        <div className="editor-actions">
          <ColorModeToggle />
          {publishedAt && (
            <ShareButton
              variant="inline"
              url={page.publicUrl}
              title={page.pageType === 'release' ? page.release?.title || page.slug : content.band?.name || page.slug}
            />
          )}
          <button className="btn" onClick={refresh}>Refresh content</button>
          {page.pageType === 'release' && (
            <button className="btn" onClick={removeCurrentPage}>Delete page</button>
          )}
          <button className="btn" onClick={openPreview}>Preview</button>
          <button className="btn btn-primary" onClick={publish}>
            {publishedAt ? 'Publish changes' : 'Publish'}
          </button>
        </div>
      </header>

      <div className="page-switcher">
        {pages.map((p) => (
          <button
            key={p.id}
            className={`page-chip ${p.id === page.id ? 'active' : ''}`}
            onClick={() => selectPage(p.id)}
          >
            {p.pageType === 'main' ? '★ ' : ''}{pageLabel(p)}
            {!p.publishedAt && p.id !== page.id ? ' (draft)' : ''}
          </button>
        ))}
        <button
          className="page-chip page-chip-new"
          onClick={() => setCreatingRelease(true)}
          disabled={!content.songs?.length}
          title={content.songs?.length ? '' : 'Add streaming links to a song in GigBuddy first'}
        >
          + New release page
        </button>
      </div>

      {creatingRelease && (
        <NewReleaseForm
          songs={content.songs || []}
          mainSlug={mainSlug}
          onCreate={createRelease}
          onCancel={() => setCreatingRelease(false)}
        />
      )}

      <nav className="editor-tabs">
        <button className={tab === 'build' ? 'active' : ''} onClick={() => setTab('build')}>Build</button>
        <button className={tab === 'preview' ? 'active' : ''} onClick={openPreview}>Preview</button>
        <button className={tab === 'stats' ? 'active' : ''} onClick={() => setTab('stats')}>Statistics</button>
      </nav>
      {publishedAt && tab === 'build' && (
        <p className="published-note">
          Live at <a href={page.publicUrl} target="_blank" rel="noopener noreferrer">{page.publicUrl}</a>
          {' '}(last published {new Date(publishedAt).toLocaleString()})
        </p>
      )}

      {tab === 'build' && (
        <div className="editor-sections">
          {layout.sections.map((section, sectionIndex) => (
            <div key={section.id} className="editor-section">
              <div className="editor-section-head">
                <input
                  className="section-title-input"
                  placeholder="Section title (optional)"
                  value={section.title || ''}
                  onChange={(e) => updateSection(section.id, { title: e.target.value || null })}
                />
                <div className="row-actions">
                  <button onClick={() => moveSection(sectionIndex, -1)} disabled={sectionIndex === 0} aria-label="Move section up">↑</button>
                  <button onClick={() => moveSection(sectionIndex, 1)} disabled={sectionIndex === layout.sections.length - 1} aria-label="Move section down">↓</button>
                  <button onClick={() => removeSection(section.id)} aria-label="Delete section">✕</button>
                </div>
              </div>
              <ul className="editor-widgets">
                {section.widgets.map((widget, widgetIndex) => (
                  <li key={widget.id} className="editor-widget">
                    <div className="editor-widget-row">
                      <button
                        className="widget-summary"
                        onClick={() => setOpenWidget(openWidget === widget.id ? null : widget.id)}
                      >
                        {widgetSummary(widget, content)}
                      </button>
                      <div className="row-actions">
                        <button
                          onClick={() => updateSection(section.id, { widgets: moveItem(section.widgets, widgetIndex, -1) })}
                          disabled={widgetIndex === 0}
                          aria-label="Move widget up"
                        >↑</button>
                        <button
                          onClick={() => updateSection(section.id, { widgets: moveItem(section.widgets, widgetIndex, 1) })}
                          disabled={widgetIndex === section.widgets.length - 1}
                          aria-label="Move widget down"
                        >↓</button>
                        <button
                          onClick={() => updateSection(section.id, { widgets: section.widgets.filter((w) => w.id !== widget.id) })}
                          aria-label="Delete widget"
                        >✕</button>
                      </div>
                    </div>
                    {openWidget === widget.id && (
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
                    )}
                  </li>
                ))}
              </ul>
              <div className="add-widget-row">
                <span>Add:</span>
                <button onClick={() => buildWidget(section, 'song')} disabled={!content.songs?.length}>Song</button>
                <button onClick={() => buildWidget(section, 'platforms')} disabled={!content.songs?.length}>Platform buttons</button>
                <button onClick={() => buildWidget(section, 'gigs')}>Gigs</button>
                <button onClick={() => buildWidget(section, 'merch')} disabled={!content.products?.length}>Merch</button>
                <button onClick={() => buildWidget(section, 'link')}>Link</button>
                <button onClick={() => buildWidget(section, 'embed')}>Embed</button>
              </div>
            </div>
          ))}
          <button className="btn add-section" onClick={addSection}>+ Add section</button>
        </div>
      )}

      {tab === 'preview' && preview && (
        <div className="preview-frame">
          <div className="preview-note">This is exactly what visitors see.</div>
          <div className="public-page" data-theme={preview.band?.theme === 'dark' ? 'dark' : 'light'}>
            <WidgetStack page={preview} />
          </div>
        </div>
      )}

      {tab === 'stats' && <StatsPanel session={session} pageId={page.id} />}
    </div>
  )
}

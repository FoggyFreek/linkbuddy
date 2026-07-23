// The "new release page" form: pick a song and a slug tail, create a landing
// page at /<mainSlug>/<tail>. Slug defaults to the song title, slugified.
import { useState } from 'react'
import { SongSelect } from './WidgetEditors.jsx'
import { slugify } from '../editorUtils.js'

export default function NewReleaseForm({ songs, mainSlug, onCreate, onCancel }) {
  const [songId, setSongId] = useState(songs[0]?.id ?? 0)
  const [slugTail, setSlugTail] = useState(songs[0] ? slugify(songs[0].title) : '')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  const pickSong = (id) => {
    setSongId(id)
    const song = songs.find((s) => s.id === id)
    if (song) setSlugTail(slugify(song.title))
  }

  const create = async () => {
    setBusy(true)
    setError(null)
    try {
      await onCreate(songId, `${mainSlug}/${slugTail}`)
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  return (
    <div className="editor-section new-release-form">
      <h3>New release page</h3>
      <p className="field-hint">
        A landing page for a song or album launch: one button per streaming platform, plus anything
        else you add. Share its link in your campaign.
      </p>
      <div className="widget-fields">
        <SongSelect value={songId} songs={songs} onChange={pickSong} />
        <label className="inline-field slug-field">
          <span>/{mainSlug}/</span>
          <input value={slugTail} onChange={(e) => setSlugTail(slugify(e.target.value))} />
        </label>
      </div>
      {error && <p className="form-error">{error}</p>}
      <div className="editor-actions">
        <button className="btn" onClick={onCancel} disabled={busy}>Cancel</button>
        <button className="btn btn-primary" onClick={create} disabled={busy || !songId || !slugTail}>
          Create
        </button>
      </div>
    </div>
  )
}

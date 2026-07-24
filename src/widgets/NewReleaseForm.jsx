// The "new release page" form: pick a song and a slug tail, create a landing
// page at /<mainSlug>/<tail>. Slug defaults to the song title, slugified.
import { useState } from 'react'
import Card from '@mui/material/Card'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import InputAdornment from '@mui/material/InputAdornment'
import Button from '@mui/material/Button'
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
    <Card variant="panel" sx={{ mt: 1.5 }}>
      <Typography variant="h5" component="h3" gutterBottom>New release page</Typography>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
        A landing page for a song or album launch: one button per streaming platform, plus anything
        else you add. Share its link in your campaign.
      </Typography>
      <Stack spacing={1.5}>
        <SongSelect value={songId} songs={songs} onChange={pickSong} />
        <TextField
          size="small"
          label="Page address"
          value={slugTail}
          onChange={(e) => setSlugTail(slugify(e.target.value))}
          slotProps={{ input: { startAdornment: <InputAdornment position="start">/{mainSlug}/</InputAdornment> } }}
        />
      </Stack>
      {error && <Typography variant="body2" color="error" sx={{ mt: 1 }}>{error}</Typography>}
      <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end', mt: 1.5 }}>
        <Button variant="outlined" onClick={onCancel} disabled={busy}>Cancel</Button>
        <Button variant="contained" onClick={create} disabled={busy || !songId || !slugTail}>Create</Button>
      </Stack>
    </Card>
  )
}

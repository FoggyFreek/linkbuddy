// The "new release page" dialog: pick a song or album and a slug tail, create a
// landing page at /<mainSlug>/<tail>. Slug defaults to its title, slugified.
import { useState, type FormEvent } from 'react'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogActions from '@mui/material/DialogActions'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import InputAdornment from '@mui/material/InputAdornment'
import Button from '@mui/material/Button'
import { ReleaseSelect } from './WidgetEditors.js'
import { slugify } from '../utils/editorUtils.js'
import type { ReleaseRef, Song, StreamingAlbum } from '../../../types.js'
import { errorMessage } from '../../../types.js'

function firstSource(songs: Song[], albums: StreamingAlbum[]): { ref: ReleaseRef; title: string } | null {
  if (songs[0]) return { ref: { songId: songs[0].id }, title: songs[0].title }
  if (albums[0]) return { ref: { albumId: albums[0].id }, title: albums[0].title }
  return null
}

export default function NewReleaseForm({ songs, albums, mainSlug, onCreate, onCancel }: Readonly<{
  songs: Song[]
  albums: StreamingAlbum[]
  mainSlug: string
  onCreate: (source: ReleaseRef, slug: string) => Promise<void>
  onCancel: () => void
}>) {
  const initial = firstSource(songs, albums)
  const [source, setSource] = useState(initial?.ref ?? null)
  const [slugTail, setSlugTail] = useState(slugify(initial?.title ?? ''))
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const pick = (ref: ReleaseRef, title: string) => {
    setSource(ref)
    setSlugTail(slugify(title))
  }

  const create = async (event: FormEvent) => {
    event.preventDefault()
    if (!source) return
    setBusy(true)
    setError(null)
    try {
      await onCreate(source, `${mainSlug}/${slugTail}`)
    } catch (err) {
      setError(errorMessage(err))
      setBusy(false)
    }
  }

  return (
    <Dialog
      open
      // Creation navigates the editor to the new page; don't let a backdrop
      // click or Escape unmount the dialog while that request is in flight.
      onClose={busy ? undefined : onCancel}
      aria-labelledby="new-release-title"
      aria-describedby="new-release-description"
      fullWidth
      maxWidth="xs"
      slotProps={{ paper: { component: 'form', onSubmit: create } }}
    >
      <DialogTitle id="new-release-title">New release page</DialogTitle>
      <DialogContent>
        <DialogContentText id="new-release-description" variant="body2" sx={{ mb: 2 }}>
          A landing page for a song or album launch: one button per streaming platform, plus anything
          else you add. Share its link in your campaign.
        </DialogContentText>
        <Stack spacing={2}>
          <ReleaseSelect value={source} songs={songs} albums={albums} onChange={pick} />
          <TextField
            size="small"
            label="Page address"
            value={slugTail}
            onChange={(e) => setSlugTail(slugify(e.target.value))}
            slotProps={{ input: { startAdornment: <InputAdornment position="start">/{mainSlug}/</InputAdornment> } }}
          />
        </Stack>
        {error && <Typography variant="body2" color="error" sx={{ mt: 2 }}>{error}</Typography>}
      </DialogContent>
      <DialogActions>
        <Button variant="outlined" onClick={onCancel} disabled={busy}>Cancel</Button>
        <Button type="submit" variant="contained" disabled={busy || !source || !slugTail}>Create</Button>
      </DialogActions>
    </Dialog>
  )
}

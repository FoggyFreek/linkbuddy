// The "new release page" dialog: pick a song and a slug tail, create a landing
// page at /<mainSlug>/<tail>. Slug defaults to the song title, slugified.
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
import { SongSelect } from './WidgetEditors.js'
import { slugify } from '../utils/editorUtils.js'
import type { Song } from '../../../types.js'
import { errorMessage } from '../../../types.js'

export default function NewReleaseForm({ songs, mainSlug, onCreate, onCancel }: {
  songs: Song[]
  mainSlug: string
  onCreate: (songId: number, slug: string) => Promise<void>
  onCancel: () => void
}) {
  const [songId, setSongId] = useState(songs[0]?.id ?? 0)
  const [slugTail, setSlugTail] = useState(songs[0] ? slugify(songs[0].title) : '')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const pickSong = (id: number) => {
    setSongId(id)
    const song = songs.find((s) => s.id === id)
    if (song) setSlugTail(slugify(song.title))
  }

  const create = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await onCreate(songId, `${mainSlug}/${slugTail}`)
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
          <SongSelect value={songId} songs={songs} onChange={pickSong} />
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
        <Button type="submit" variant="contained" disabled={busy || !songId || !slugTail}>Create</Button>
      </DialogActions>
    </Dialog>
  )
}

import { useState } from 'react'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogContentText from '@mui/material/DialogContentText'
import DialogActions from '@mui/material/DialogActions'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import { errorMessage } from '../../../types.js'

export default function DeleteReleaseDialog({ title, slug, onConfirm, onCancel }: Readonly<{
  title: string
  slug: string
  onConfirm: () => Promise<void>
  onCancel: () => void
}>) {
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const confirm = async () => {
    setBusy(true)
    setError(null)
    try {
      await onConfirm()
    } catch (err) {
      setError(errorMessage(err))
      setBusy(false)
    }
  }

  return (
    <Dialog
      open
      onClose={busy ? undefined : onCancel}
      aria-labelledby="delete-release-title"
      aria-describedby="delete-release-description"
      fullWidth
      maxWidth="xs"
    >
      <DialogTitle id="delete-release-title">Delete “{title}”?</DialogTitle>
      <DialogContent>
        <DialogContentText id="delete-release-description" variant="body2">
          The release page at{' '}
          <Typography component="code" variant="inherit" sx={{ fontFamily: 'monospace', color: 'text.primary' }}>/{slug}</Typography>
          {' '}goes offline and its statistics are deleted too. This can’t be undone.
        </DialogContentText>
        {error && <Typography variant="body2" color="error" sx={{ mt: 2 }}>{error}</Typography>}
      </DialogContent>
      <DialogActions>
        <Button variant="outlined" onClick={onCancel} disabled={busy}>Cancel</Button>
        <Button variant="contained" color="error" onClick={confirm} disabled={busy}>Delete</Button>
      </DialogActions>
    </Dialog>
  )
}

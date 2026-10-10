import { useState } from 'react'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Checkbox from '@mui/material/Checkbox'
import FormControlLabel from '@mui/material/FormControlLabel'
import FormGroup from '@mui/material/FormGroup'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import PanelSection from './PanelSection.js'
import { PLATFORMS } from '../../../../shared/features/links/platforms.js'
import { metaTrackingError } from '../../../../shared/features/tracking/metaTracking.js'
import type { MetaTracking } from '../../../types.js'

const OPTIONS = [...PLATFORMS, { id: 'other', label: 'Other streaming platforms' }]

export default function TrackingPanel({ value, onChange }: Readonly<{ value: MetaTracking | null; onChange: (value: MetaTracking | null) => void }>) {
  const [pixelId, setPixelId] = useState(value?.pixelId || '')
  const [platforms, setPlatforms] = useState(value?.platforms || OPTIONS.map(({ id }) => id))
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const save = () => {
    const next = { pixelId: pixelId.trim(), platforms }
    const problem = metaTrackingError(next)
    setError(problem)
    if (problem) return
    onChange(next)
    setSaved(true)
  }

  return (
    <Stack spacing={2}>
      <PanelSection
        title="Meta Pixel"
        hint="Measure when visitors follow a streaming link from your ads. Marketing cookies and Meta tracking start only after the visitor accepts."
      >
        <TextField label="Meta Pixel ID" value={pixelId} size="small" fullWidth sx={{ maxWidth: 420 }}
          onChange={(event) => { setPixelId(event.target.value); setSaved(false) }}
          slotProps={{ htmlInput: { inputMode: 'numeric', maxLength: 30 } }}
          helperText="Find this ID in Meta Events Manager. No access token is needed." />
      </PanelSection>

      <PanelSection title="Count clicks to" hint="The streaming links that send a SmartLinkClick event to Meta.">
        <FormGroup sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
          {OPTIONS.map(({ id, label }) => (
            <FormControlLabel key={id} label={label} slotProps={{ typography: { variant: 'body2' } }} control={<Checkbox size="small" checked={platforms.includes(id)}
              onChange={(_event, checked) => {
                setPlatforms(checked ? [...platforms, id] : platforms.filter((platform) => platform !== id))
                setSaved(false)
              }} />} />
          ))}
        </FormGroup>
      </PanelSection>

      {error && <Alert severity="error">{error}</Alert>}
      {saved && <Alert severity="success">Tracking settings updated. Publish to apply them.</Alert>}
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        <Button variant="contained" onClick={save}>Save tracking settings</Button>
        <Button onClick={() => { onChange(null); setPixelId(''); setError(null); setSaved(false) }}>Disable Meta tracking</Button>
      </Box>

      <PanelSection title="Using it in your ads">
        <Typography variant="body2" color="text.secondary">
          In Events Manager, test a platform click and create a custom conversion for SmartLinkClick.
          Filter by release_id or platform if needed, then select that conversion in your website ad set.
          A click measures an outgoing visit, not a confirmed stream. Previews never send Meta events.
        </Typography>
      </PanelSection>
    </Stack>
  )
}

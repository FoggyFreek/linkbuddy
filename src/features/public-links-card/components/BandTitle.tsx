import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import BandLogo, { hasBandLogo } from '../../../components/BandLogo.js'
import type { Band } from '../../../types.js'

// The title slot: the band's logo when set, otherwise the name in type. The
// scheme-aware swap lives in BandLogo, which resolves against the enclosing
// ColorSchemeScope — this page's scheme, never the document's.
export default function BandTitle({ band }: { band: Band }) {
  if (!hasBandLogo(band)) return <Typography variant="h1" sx={{ mt: '14px', mb: '6px' }}>{band.name}</Typography>

  return (
    <Box component="h1" sx={{ m: 0, mt: '14px', mb: '6px' }}>
      <BandLogo band={band} />
    </Box>
  )
}

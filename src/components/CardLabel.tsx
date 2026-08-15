import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import type { SxProps, Theme } from '@mui/material/styles'

interface CardLabelProps { label: string; sublabel?: string | null; sx?: SxProps<Theme> }

export default function CardLabel({ label, sublabel, sx }: CardLabelProps) {
  return (
    <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '2px', textAlign: 'center', ...sx }}>
      <Typography variant="body1" component="span">{label}</Typography>
      {sublabel && <Typography variant="caption" component="span" color="text.secondary">{sublabel}</Typography>}
    </Box>
  )
}

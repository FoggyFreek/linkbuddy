import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'

export default function CardLabel({ label, sublabel, sx }) {
  return (
    <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '2px', textAlign: 'center', ...sx }}>
      <Typography variant="body1" component="span">{label}</Typography>
      {sublabel && <Typography variant="caption" component="span" color="text.secondary">{sublabel}</Typography>}
    </Box>
  )
}

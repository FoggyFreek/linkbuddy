import Box from '@mui/material/Box'

// The play control on platform rows and embed facades. Its parent row fills it
// on hover, targeting it through the `.play-pill` class.
export default function PlayPill() {
  return (
    <Box
      component="span"
      className="play-pill"
      sx={(theme) => ({
        ml: 'auto', flexShrink: 0, alignSelf: 'center',
        border: '1.5px solid', borderColor: 'text.primary', borderRadius: '12px',
        px: '34px', py: '14px', fontSize: '15px', fontWeight: 600,
        transition: 'background-color .15s, color .15s',
        ...theme.applyStyles('dark', { borderColor: 'rgba(255, 255, 255, 0.16)' }),
      })}
    >
      Play
    </Box>
  )
}

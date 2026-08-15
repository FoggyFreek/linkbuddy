import Box from '@mui/material/Box'

export default function Thumb({ src, size = 56, radius = 8 }: { src?: string | null; size?: number; radius?: number }) {
  return src ? (
    <Box component="img" src={src} alt="" sx={{ width: size, height: size, borderRadius: `${radius}px`, objectFit: 'cover', flexShrink: 0 }} />
  ) : (
    <Box
      aria-hidden
      sx={{
        width: size, height: size, borderRadius: `${radius}px`, flexShrink: 0,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        bgcolor: 'surface.s3', color: 'text.secondary', fontSize: 24,
      }}
    >
      ♪
    </Box>
  )
}

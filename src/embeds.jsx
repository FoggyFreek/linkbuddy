// Embed players. Privacy contract: third-party iframes NEVER mount on page
// load — visitors see a facade (thumbnail + play) and the player only loads
// after they click (see PRIVACY.md). Inline embeds (Spotify, SoundCloud)
// expand in place; video embeds (YouTube) open in a lightbox overlay.
import Box from '@mui/material/Box'
import Dialog from '@mui/material/Dialog'
import IconButton from '@mui/material/IconButton'
import CloseIcon from '@mui/icons-material/Close'

export function InlineEmbed({ embed, title }) {
  return (
    <Box
      component="iframe"
      src={embed.src}
      height={embed.height || 152}
      title={title || 'Audio player'}
      allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
      loading="lazy"
      sx={{ width: '100%', border: 0, borderRadius: '12px', display: 'block' }}
    />
  )
}

export function VideoOverlay({ src, onClose }) {
  return (
    <Dialog
      open={Boolean(src)}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      slotProps={{ paper: { sx: { bgcolor: '#000', position: 'relative', overflow: 'hidden' } } }}
    >
      <IconButton
        onClick={onClose}
        aria-label="Close video"
        sx={{ position: 'absolute', top: 6, right: 6, color: '#fff', zIndex: 1, bgcolor: 'rgba(0,0,0,.4)' }}
      >
        <CloseIcon />
      </IconButton>
      {src && (
        <Box sx={{ aspectRatio: '16 / 9', width: '100%' }}>
          <Box
            component="iframe"
            src={src}
            title="Video player"
            allow="autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
            sx={{ width: '100%', height: '100%', border: 0, display: 'block' }}
          />
        </Box>
      )}
    </Dialog>
  )
}

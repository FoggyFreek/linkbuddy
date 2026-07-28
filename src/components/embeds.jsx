// Embed players. Privacy contract: third-party iframes NEVER mount on page
// load — visitors see a facade (thumbnail + play) and the player only loads
// after they click (see PRIVACY.md). Every embed — audio (Spotify, SoundCloud)
// and video (YouTube) alike — opens in a closable modal overlay; `display`
// only picks the shape of that overlay.
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import IconButton from '@mui/material/IconButton'
import CloseIcon from '@mui/icons-material/Close'
import { useScopedPortalProps } from './ColorSchemeScope.jsx'

// The player is rendered 50% taller than the platform's own default size — the
// stock Spotify/SoundCloud heights read as cramped in a modal. Video keeps its
// 16:9 aspect, so for that shape the scale applies to the dialog width and the
// height follows (capped by the viewport on smaller screens).
const PLAYER_SCALE = 1.5

// Modal player for a resolved embed descriptor. `embed` is null while closed —
// the iframe unmounts with the dialog, so closing genuinely stops the player.
// `url` is the original link; the footer button opens it in a new window for
// visitors who'd rather use the platform itself.
export function EmbedOverlay({ embed, title, url, onOpenExternal, onClose }) {
  const portalProps = useScopedPortalProps()
  const video = embed?.display === 'overlay'
  return (
    <Dialog
      open={Boolean(embed)}
      onClose={onClose}
      maxWidth={false}
      fullWidth
      {...portalProps}
      slotProps={{
        paper: {
          sx: {
            // A video frame is 16:9 of the dialog width, so PLAYER_SCALE has to
            // widen the paper to make it taller; audio scales its own height
            // below and keeps the `sm` width.
            maxWidth: video ? 900 * PLAYER_SCALE : 600,
            position: 'relative',
            overflow: 'hidden',
            // Hug the player: the paper is only as tall as the iframe it holds
            // (16:9 of the dialog width, or the audio player's own height).
            height: 'auto',
            maxHeight: 'calc(100% - 64px)',
            display: 'flex',
            flexDirection: 'column',
            ...(video ? { bgcolor: '#000' } : { bgcolor: 'background.paper', p: '44px 14px 14px' }),
          },
        },
      }}
    >
      <IconButton
        onClick={onClose}
        aria-label="Close player"
        sx={{
          position: 'absolute', top: 6, right: 6, zIndex: 1,
          ...(video ? { color: '#fff', bgcolor: 'rgb(0 0 0 / 0.4)' } : { color: 'text.secondary' }),
        }}
      >
        <CloseIcon />
      </IconButton>
      {embed && (video ? (
        <Box sx={{ aspectRatio: '16 / 9', width: '100%', maxHeight: '100%' }}>
          <Box
            component="iframe"
            src={embed.src}
            title={title || 'Video player'}
            allow="autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
            sx={{ width: '100%', height: '100%', border: 0, display: 'block' }}
          />
        </Box>
      ) : (
        <Box
          component="iframe"
          src={embed.src}
          height={Math.round((embed.height || 152) * PLAYER_SCALE)}
          title={title || 'Audio player'}
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          sx={{ width: '100%', border: 0, borderRadius: '12px', display: 'block' }}
        />
      ))}
      {url && (
        <Box sx={{ display: 'flex', justifyContent: 'center', flexShrink: 0, p: video ? '8px' : '10px 0 0' }}>
          <Button
            component="a"
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onOpenExternal}
            variant="text"
            sx={{ color: video ? '#fff' : 'text.secondary' }}
          >
            Open in a new window ↗
          </Button>
        </Box>
      )}
    </Dialog>
  )
}

import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import type { Theme } from '@mui/material/styles'
import type { SystemStyleObject } from '@mui/system'
import type { Release, Track } from '../../../types.js'

const OVERLAY = '[data-tracklist]'

// An album's tracklist over its cover: hidden until the cover is hovered or the
// list takes focus (keyboard, or a tap on touch screens), then scrollable.
function Tracklist({ tracks }: Readonly<{ tracks: Track[] }>) {
  return (
    <Box
      component="ol"
      data-tracklist=""
      aria-label="Tracklist"
      tabIndex={0}
      sx={{
        position: 'absolute', inset: 0, m: 0, p: { xs: 2.5, sm: 3.5 }, listStyle: 'none', overflowY: 'auto',
        // One column as wide as the longest row, centred; `safe` keeps an overflowing list scrollable from its top.
        display: 'grid', gridTemplateColumns: 'minmax(0, max-content)', justifyContent: 'center', alignContent: 'safe center', rowGap: 0.75,
        bgcolor: 'rgb(12 13 15 / 0.8)', backdropFilter: 'blur(6px)', color: '#fff',
        opacity: 0, transition: 'opacity 180ms ease',
        '&:focus': { outline: 'none' },
        '&:focus-visible': { outline: '2px solid #fff', outlineOffset: '-6px' },
        '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
      }}
    >
      {tracks.map((track, index) => (
        <Box component="li" key={`${index}-${track.title}`} sx={{ display: 'flex', gap: 1.5, alignItems: 'baseline' }}>
          <Typography component="span" variant="body2" sx={{ minWidth: '2ch', textAlign: 'right', fontVariantNumeric: 'tabular-nums', opacity: 0.6 }}>
            {track.number}
          </Typography>
          <Typography component="span" variant="body2" sx={{ fontWeight: 500 }}>{track.title}</Typography>
        </Box>
      ))}
    </Box>
  )
}

// The cover sits on a blurred, stretched copy of itself so the wide desktop
// view fills the space beside it; the blurred layer is hidden when narrow.
export default function ReleaseArt({ release }: Readonly<{ release: Release }>) {
  const tracks = release.tracks ?? []
  const frameSx = (theme: Theme): SystemStyleObject<Theme> => ({
    position: 'relative', width: 'var(--cover-w)', aspectRatio: '1', overflow: 'hidden',
    boxShadow: '0 10px 30px rgb(20 22 26 / 0.18)', bgcolor: '#0c0d0f',
    ...theme.applyStyles('dark', { boxShadow: `0 0 0 1px ${theme.vars!.palette.surface.border}, 0 10px 30px rgb(0 0 0 / 0.35)` }),
    [`&:hover ${OVERLAY}, &:focus-within ${OVERLAY}`]: { opacity: 1 },
    '@container (min-width:840px)': { zIndex: 1, width: 'min(660px, 96cqw)' },
  })
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: '18px', '@container (min-width:840px)': { position: 'relative', flex: '1 1 66%', mb: 0, p: '56px', overflow: 'hidden' } }}>
      {release.coverUrl && (
        <Box
          component="img"
          src={release.coverUrl}
          alt=""
          aria-hidden="true"
          sx={{ display: 'none', '@container (min-width:840px)': { display: 'block', position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', filter: 'blur(42px) saturate(1.3)', transform: 'scale(1.25)', zIndex: 0 } }}
        />
      )}
      <Box sx={frameSx}>
        {release.coverUrl ? (
          <Box component="img" src={release.coverUrl} alt={release.title} sx={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#fff', fontSize: 72 }}>♪</Box>
        )}
        {tracks.length > 0 && <Tracklist tracks={tracks} />}
      </Box>
    </Box>
  )
}

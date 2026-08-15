import Box from '@mui/material/Box'
import type { Theme } from '@mui/material/styles'
import type { SystemStyleObject } from '@mui/system'
import type { Release } from '../../../types.js'

// The cover sits on a blurred, stretched copy of itself so the wide desktop
// view fills the space beside it; the blurred layer is hidden when narrow.
export default function ReleaseArt({ release }: { release: Release }) {
  const coverSx = (theme: Theme): SystemStyleObject<Theme> => ({
    width: 'var(--cover-w)', height: 'var(--cover-w)', borderRadius: 0, objectFit: 'cover',
    boxShadow: '0 10px 30px rgb(20 22 26 / 0.18)', bgcolor: '#0c0d0f',
    ...theme.applyStyles('dark', { boxShadow: `0 0 0 1px ${theme.vars!.palette.surface.border}, 0 10px 30px rgb(0 0 0 / 0.35)` }),
    '@container (min-width:840px)': { position: 'relative', zIndex: 1, width: 'min(660px, 96cqw)', height: 'auto', aspectRatio: '1' },
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
      {release.coverUrl ? (
        <Box component="img" src={release.coverUrl} alt={release.title} sx={coverSx} />
      ) : (
        <Box sx={(theme) => ({ ...coverSx(theme), display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 72 })}>♪</Box>
      )}
    </Box>
  )
}

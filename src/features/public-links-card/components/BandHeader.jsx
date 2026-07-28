import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Avatar from '@mui/material/Avatar'
import BandTitle from './BandTitle.jsx'
import SocialLinks from '../../../components/SocialLinks.jsx'

const AVATAR_SIZE = 128

export default function BandHeader({ band, onLinkClick, bannerShown = false }) {
  if (!band) return null
  return (
    <Box component="header" sx={{ textAlign: 'center', mb: '18px' }}>
      {band.avatarUrl && (
        <Avatar
          src={band.avatarUrl}
          alt={band.name ? `${band.name} profile picture` : 'Profile picture'}
          sx={(theme) => ({
            width: AVATAR_SIZE, height: AVATAR_SIZE, mx: 'auto', bgcolor: '#0c0d0f',
            // Half the avatar overlaps the banner's bottom edge — a ring in the
            // card's own surface keeps it legible against any banner image.
            ...(bannerShown && {
              mt: `-${AVATAR_SIZE / 2}px`,
              border: '4px solid',
              borderColor: 'surface.s2',
            }),
            ...theme.applyStyles('dark', { boxShadow: `0 0 0 1px ${theme.vars.palette.surface.border}, 0 10px 30px rgb(0 0 0 / 0.35)` }),
          })}
        />
      )}
      <BandTitle band={band} />
      {band.bio && (
        <Typography variant="subtitle1" component="p" sx={{ maxWidth: 440, mx: 'auto', mb: '18px' }}>{band.bio}</Typography>
      )}
      <SocialLinks band={band} onLinkClick={onLinkClick} variant="plain" />
    </Box>
  )
}

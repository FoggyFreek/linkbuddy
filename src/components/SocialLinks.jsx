import Stack from '@mui/material/Stack'
import IconButton from '@mui/material/IconButton'
import {
  InstagramIcon,
  FacebookIcon,
  YoutubeIcon,
  TiktokIcon,
  SpotifyIcon,
} from './icons.jsx'
import { SOCIALS, socialHref } from '../utils/socials.js'

const SOCIAL_ICONS = {
  instagram: InstagramIcon,
  facebook: FacebookIcon,
  youtube: YoutubeIcon,
  tiktok: TiktokIcon,
  spotify: SpotifyIcon,
}

// The band's socials: plain icon buttons in the band header, circular outlined
// ones in the smart link's footer. Renders nothing when none are set.
export default function SocialLinks({ band, onLinkClick, variant = 'plain' }) {
  const items = SOCIALS.filter((s) => band?.socials?.[s.key])
  if (!items.length) return null
  const circle = variant === 'circle'
  return (
    <Stack
      direction="row"
      spacing={circle ? 2 : 2.75}
      sx={{ justifyContent: 'center', ...(circle ? { mt: '30px' } : {}) }}
    >
      {items.map((s) => {
        const Icon = SOCIAL_ICONS[s.key]
        return (
          <IconButton
            key={s.key}
            component="a"
            href={socialHref(s, band.socials[s.key])}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={s.key}
            onClick={() => onLinkClick(`social:${s.key}`)}
            sx={[
              // A small lift on hover; `transform` only, so nothing reflows.
              {
                transition: (theme) =>
                  theme.transitions.create(['transform', 'opacity', 'background-color'], {
                    duration: theme.transitions.duration.shorter,
                  }),
                '&:hover': { transform: 'translateY(-2px)' },
                '@media (prefers-reduced-motion: reduce)': {
                  transition: 'none',
                  '&:hover': { transform: 'none' },
                },
              },
              circle
                ? { width: 46, height: 46, color: 'text.primary', border: '1.5px solid', borderColor: 'surface.border', '&:hover': { bgcolor: 'surface.s2' } }
                : { color: 'text.primary', '&:hover': { opacity: 0.7 } },
            ]}
          >
            {/* `mono` puts every mark on the button's `text.primary` ink, so the
                row follows the page's colour scheme. */}
            <Icon size={circle ? 20 : 30} mono />
          </IconButton>
        )
      })}
    </Stack>
  )
}

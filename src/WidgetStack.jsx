// Visitor-facing rendering of a resolved page: band header + sections of
// widget cards. Used verbatim by the public page and the editor's
// preview-as-visitor mode, so preview can never drift from reality.
//
// Built from MUI components (Card/CardActionArea, Box, Stack, Chip, Avatar,
// Accordion, Typography, Link) styled with the `sx` prop and the theme's
// colour-scheme variables — no bespoke stylesheet. Per-scheme tweaks use
// `theme.applyStyles('dark', …)`, the approach MUI recommends over reading
// `palette.mode`.
import { useState } from 'react'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Card from '@mui/material/Card'
import CardActionArea from '@mui/material/CardActionArea'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import Avatar from '@mui/material/Avatar'
import IconButton from '@mui/material/IconButton'
import ButtonBase from '@mui/material/ButtonBase'
import Link from '@mui/material/Link'
import Accordion from '@mui/material/Accordion'
import AccordionSummary from '@mui/material/AccordionSummary'
import AccordionDetails from '@mui/material/AccordionDetails'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import { EmbedOverlay } from './embeds.jsx'
import {
  InstagramIcon,
  FacebookIcon,
  YoutubeIcon,
  TiktokIcon,
  SpotifyIcon,
  CalendarIcon,
  LINK_ICON_COMPONENTS,
  PLATFORM_ICON_COMPONENTS,
} from './icons.jsx'

const OtherPlatformIcon = PLATFORM_ICON_COMPONENTS.other

const atHandle = (h) => (h.startsWith('@') ? h : `@${h}`)

const SOCIALS = [
  { key: 'instagram', Icon: InstagramIcon, url: (h) => `https://instagram.com/${h}` },
  { key: 'facebook', Icon: FacebookIcon, url: (h) => `https://facebook.com/${h}` },
  { key: 'youtube', Icon: YoutubeIcon, url: (h) => `https://youtube.com/${atHandle(h)}` },
  { key: 'tiktok', Icon: TiktokIcon, url: (h) => `https://tiktok.com/${atHandle(h)}` },
  { key: 'spotify', Icon: SpotifyIcon, url: (h) => (h.includes('/') ? `https://open.spotify.com/${h}` : `https://open.spotify.com/artist/${h}`) },
]

function socialHref(social, handle) {
  const clean = handle.trim().replace(/^https?:\/\/[^/]+\//, '')
  return handle.startsWith('http') ? handle : social.url(clean)
}

function formatEur(cents) {
  return `€ ${(cents / 100).toFixed(2).replace('.', ',')}`
}

function formatGigDate(iso) {
  const date = new Date(`${iso}T12:00:00`)
  return {
    month: date.toLocaleDateString(undefined, { month: 'short' }).toUpperCase(),
    day: date.toLocaleDateString(undefined, { day: 'numeric' }),
  }
}

// A 56px square thumbnail, or a note-glyph placeholder on a muted surface.
function Thumb({ src, size = 56, radius = 8 }) {
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

// A card's primary label with an optional dimmer sub-label beneath it, rendered
// through the theme's type scale (body1 label, caption sub-label).
function CardLabel({ label, sublabel, sx }) {
  return (
    <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '2px', textAlign: 'center', ...sx }}>
      <Typography variant="body1" component="span">{label}</Typography>
      {sublabel && <Typography variant="caption" component="span" color="text.secondary">{sublabel}</Typography>}
    </Box>
  )
}

// A centred section heading (MUI h3 scale), rendered as an <h2> to keep a sane
// heading outline under the band/release <h1>.
function SectionTitle({ children }) {
  return (
    <Typography variant="h3" component="h2" sx={{ textAlign: 'center', mt: 1 }}>
      {children}
    </Typography>
  )
}

// The band's social icons, shared by the band header (plain icon buttons) and
// the release page footer (circular outlined buttons). Renders nothing when the
// band has set no socials.
function SocialLinks({ band, onLinkClick, variant = 'plain' }) {
  const items = SOCIALS.filter((s) => band?.socials?.[s.key])
  if (!items.length) return null
  const circle = variant === 'circle'
  return (
    <Stack
      direction="row"
      spacing={circle ? 2 : 2.75}
      sx={{ justifyContent: 'center', ...(circle ? { mt: '30px' } : {}) }}
    >
      {items.map((s) => (
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
          {/* `mono` keeps every social mark on the button's `text.primary`
              ink, so the row flips with the page's colour scheme. Icons
              without a brand colour ignore the prop. */}
          <s.Icon size={circle ? 20 : 30} mono />
        </IconButton>
      ))}
    </Stack>
  )
}

// The page's title slot: the band's logo when one is set, otherwise the name in
// type. Both logos are rendered and toggled with `theme.applyStyles('dark', …)`,
// which resolves against the enclosing ColorSchemeScope's mode — so the right
// one shows for the *page's* scheme even when the document disagrees (a light
// page in a dark editor). `logoUrl` reads on a light page,
// `logoDarkUrl` on a dark one. A band that only uploaded one logo gets that
// one in both schemes. `display: none` also takes the hidden copy out of the
// accessibility tree, so the heading keeps exactly one accessible name.
function BandTitle({ band }) {
  const onLight = band.logoUrl || band.logoDarkUrl
  const onDark = band.logoDarkUrl || band.logoUrl
  if (!onLight) return <Typography variant="h1" sx={{ mt: '14px', mb: '6px' }}>{band.name}</Typography>

  const alt = band.name || 'Band logo'
  const img = { display: 'inline-block', maxWidth: '100%', maxHeight: 83, width: 'auto', objectFit: 'contain' }
  return (
    <Box component="h1" sx={{ m: 0, mt: '14px', mb: '6px' }}>
      <Box
        component="img"
        src={onLight}
        alt={alt}
        sx={(theme) => ({ ...img, ...(onLight === onDark ? {} : theme.applyStyles('dark', { display: 'none' })) })}
      />
      {onLight !== onDark && (
        <Box
          component="img"
          src={onDark}
          alt={alt}
          sx={(theme) => ({ ...img, display: 'none', ...theme.applyStyles('dark', { display: 'inline-block' }) })}
        />
      )}
    </Box>
  )
}

const AVATAR_SIZE = 128

// The band card's own padding, in px, by breakpoint — `CARD_PAD_TOP`/`CARD_PAD_X`
// mirror the `p` shorthand on the Card in WidgetStack so the banner's negative
// margins (which bleed it edge-to-edge) stay exactly in sync with it.
const CARD_PAD_TOP = { xs: 20, sm: 30 }
const CARD_PAD_X = { xs: 14, sm: 28 }

// The band's banner artwork (GigBuddy's `bannerUrl`), bled to the card's full
// width and top edge via negative margins that cancel the card's own padding —
// see CARD_PAD_TOP/CARD_PAD_X above. `overflow: hidden` on the card (set by the
// caller) clips its square corners to the card's rounded shape. It's shown at
// its full height (width fit to the card, height auto) rather than cropped —
// its own bottom margin is zero, so the header that follows starts right at its
// bottom edge, and the avatar pulls itself up over that edge with a negative
// top margin.
function BandBanner({ src }) {
  return (
    <Box
      component="img"
      src={src}
      alt=""
      sx={{
        display: 'block',
        width: { xs: `calc(100% + ${CARD_PAD_X.xs * 2}px)`, sm: `calc(100% + ${CARD_PAD_X.sm * 2}px)` },
        height: 'auto',
        mt: { xs: `-${CARD_PAD_TOP.xs}px`, sm: `-${CARD_PAD_TOP.sm}px` },
        mx: { xs: `-${CARD_PAD_X.xs}px`, sm: `-${CARD_PAD_X.sm}px` },
      }}
    />
  )
}

function BandHeader({ band, onLinkClick, bannerShown = false }) {
  if (!band) return null
  return (
    <Box component="header" sx={{ textAlign: 'center', mb: '18px' }}>
      {band.avatarUrl && (
        <Avatar
          src={band.avatarUrl}
          alt={band.name ? `${band.name} profile picture` : 'Profile picture'}
          sx={(theme) => ({
            width: AVATAR_SIZE, height: AVATAR_SIZE, mx: 'auto', bgcolor: '#0c0d0f',
            // Half the avatar overlaps the banner's bottom edge, half sits below
            // it on the card — a ring in the card's own surface colour keeps it
            // legible against whatever the banner image happens to be.
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

// The rounded, hairline-shadowed play control on a release's platform rows and
// embed facades. It fills on hover of its parent row (see the `.play-pill`
// selector on the row).
const playPillSx = (theme) => ({
  ml: 'auto', flexShrink: 0, alignSelf: 'center',
  border: '1.5px solid', borderColor: 'text.primary', borderRadius: '12px',
  px: '34px', py: '14px', fontSize: '15px', fontWeight: 600,
  transition: 'background-color .15s, color .15s',
  ...theme.applyStyles('dark', { borderColor: 'rgba(255, 255, 255, 0.16)' }),
})

function SongWidget({ widget, onLinkClick }) {
  const primary = widget.links[0]
  const extras = widget.links.slice(1)
  return (
    <Card sx={{ p: '10px 14px' }}>
      <CardActionArea
        component="a"
        href={primary.url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => onLinkClick(`song:${primary.label || 'listen'}`)}
        sx={{ display: 'flex', alignItems: 'center', gap: '12px', borderRadius: '8px' }}
      >
        <Thumb src={widget.coverUrl} />
        <CardLabel label={widget.title} sublabel={widget.artist} sx={{ pr: '56px' }} />
      </CardActionArea>
      {extras.length > 0 && (
        <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap', justifyContent: 'center', pt: '10px', px: '4px' }}>
          {extras.map((link) => {
            // A link that resolves to a known platform renders as that
            // platform's clickable icon; anything else keeps the text pill.
            const platformId = link.platform && link.platform.id !== 'other' ? link.platform.id : null
            const Icon = platformId ? PLATFORM_ICON_COMPONENTS[platformId] : null
            return Icon ? (
              <IconButton
                key={link.url}
                component="a"
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={link.platform.label}
                title={link.platform.label}
                onClick={() => onLinkClick(`platform:${platformId}`)}
                sx={{ color: 'text.primary', borderRadius: '10px', '&:hover': { bgcolor: 'surface.s2' } }}
              >
                <Icon size={26} />
              </IconButton>
            ) : (
              <Chip
                key={link.url}
                component="a"
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                clickable
                size="small"
                label={link.label || 'Listen'}
                onClick={() => onLinkClick(`song:${link.label || 'listen'}`)}
                sx={{ bgcolor: 'surface.s2', '&:hover': { bgcolor: 'surface.s3' } }}
              />
            )
          })}
        </Stack>
      )}
    </Card>
  )
}

function GigsWidget({ widget }) {
  return (
    <Accordion
      // Open on arrival — the gig list is the point of the widget; visitors can
      // still collapse it. Uncontrolled, so `defaultExpanded` only seeds it.
      defaultExpanded
      disableGutters
      elevation={0}
      sx={(theme) => ({
        borderRadius: `${theme.shape.borderRadius}px`,
        overflow: 'hidden',
        boxShadow: '0 1px 3px rgb(20 22 26 / 0.08)',
        '&::before': { display: 'none' },
        ...theme.applyStyles('dark', {
          border: `1px solid ${theme.vars.palette.surface.border}`,
          boxShadow: '0 1px 3px rgb(0 0 0 / 0.35)',
        }),
      })}
    >
      <AccordionSummary
        expandIcon={<ExpandMoreIcon sx={{ color: 'text.secondary' }} />}
        sx={{ px: '16px', '& .MuiAccordionSummary-content': { alignItems: 'center', gap: '12px', my: '18px' } }}
      >
        <Box component="span" sx={{ display: 'inline-flex', color: 'text.primary', flexShrink: 0 }}><CalendarIcon size={26} /></Box>
        <Typography variant="body1" component="span" sx={{ flex: 1 }}>
          {widget.title}
          {/* Summarize the list in the header — "Upcoming shows (3 gigs)" — so a
              collapsed widget still says whether there's anything to see. The
              empty case has its own message inside, so no "(0 gigs)". */}
          {widget.gigs.length > 0 && (
            <Box component="span" sx={{ color: 'text.secondary' }}>
              {` (${widget.gigs.length} ${widget.gigs.length === 1 ? 'gig' : 'gigs'})`}
            </Box>
          )}
        </Typography>
      </AccordionSummary>
      <AccordionDetails sx={{ pt: 0, px: '16px', pb: '12px' }}>
        {widget.gigs.length === 0 ? (
          <Typography color="text.secondary" sx={{ textAlign: 'center' }}>No upcoming gigs announced — check back soon.</Typography>
        ) : (
          <Box component="ul" sx={{ listStyle: 'none', m: 0, p: 0 }}>
            {widget.gigs.map((gig) => {
              const { month, day } = formatGigDate(gig.date)
              return (
                <Box component="li" key={gig.id} sx={{ display: 'flex', alignItems: 'baseline', gap: '14px', py: '10px', borderTop: '1px solid', borderColor: 'surface.s2' }}>
                  <Box sx={{ flex: '0 0 44px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                    <Typography variant="caption" sx={{ fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'text.secondary' }}>{month}</Typography>
                    <Typography sx={{ fontSize: '24px', fontWeight: 700, lineHeight: 1.1 }}>{day}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                    <Typography sx={{ fontWeight: 700 }}>{gig.title}</Typography>
                    {(gig.venue || gig.city) && (
                      <Typography variant="body2" color="text.secondary">{[gig.venue, gig.city].filter(Boolean).join(', ')}</Typography>
                    )}
                  </Box>
                </Box>
              )
            })}
          </Box>
        )}
      </AccordionDetails>
    </Accordion>
  )
}

function MerchProduct({ product, shopUrl, onLinkClick }) {
  const itemSx = {
    flex: '0 0 150px', display: 'flex', flexDirection: 'column',
    alignItems: 'stretch', justifyContent: 'flex-start',
    border: '1px solid', borderColor: 'surface.border', borderRadius: '10px',
    overflow: 'hidden', bgcolor: 'background.paper', textAlign: 'left',
  }
  const body = (
    <>
      <Box sx={{ position: 'relative', height: 140, bgcolor: 'surface.s2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c3c6cc', fontSize: 40 }}>
        {product.imageUrl ? (
          <Box component="img" src={product.imageUrl} alt="" sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <span aria-hidden="true">♪</span>
        )}
        {product.badge && (
          <Box component="span" sx={{ position: 'absolute', top: 10, right: -26, transform: 'rotate(45deg)', bgcolor: 'success.main', color: '#fff', fontSize: 12, fontWeight: 700, px: '28px', py: '3px' }}>
            {product.badge}
          </Box>
        )}
      </Box>
      <Typography variant="body2" sx={{ fontWeight: 500, px: '10px', pt: '8px' }}>{product.name}</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ px: '10px', pb: '10px' }}>{formatEur(product.priceCents)}</Typography>
    </>
  )
  return shopUrl ? (
    <CardActionArea
      component="a"
      href={shopUrl}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => onLinkClick('shop')}
      sx={itemSx}
    >{body}</CardActionArea>
  ) : (
    <Box sx={itemSx}>{body}</Box>
  )
}

function MerchWidget({ widget, onLinkClick }) {
  return (
    <Card sx={{ p: '16px 0 14px' }}>
      {widget.title && <Typography variant="h4" component="h3" sx={{ textAlign: 'center', mx: '16px', mb: '12px' }}>{widget.title}</Typography>}
      <Stack direction="row" spacing={1.5} sx={{ overflowX: 'auto', px: '16px', pt: '2px', pb: '6px', scrollbarWidth: 'thin' }}>
        {widget.products.map((product) => (
          <MerchProduct key={product.id} product={product} shopUrl={widget.shopUrl} onLinkClick={onLinkClick} />
        ))}
      </Stack>
    </Card>
  )
}

function LinkWidget({ widget, onLinkClick }) {
  const Icon = LINK_ICON_COMPONENTS[widget.icon] || LINK_ICON_COMPONENTS.globe
  return (
    <Card>
      <CardActionArea
        component="a"
        href={widget.url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => onLinkClick(`link:${widget.label}`)}
        sx={{ display: 'flex', alignItems: 'center', gap: '12px', minHeight: 64, p: '12px 16px' }}
      >
        {widget.imageUrl ? (
          <Thumb src={widget.imageUrl} />
        ) : (
          <Box component="span" sx={{ display: 'inline-flex', color: 'text.primary', flexShrink: 0 }}><Icon size={26} /></Box>
        )}
        <CardLabel label={widget.label} sublabel={widget.sublabel} sx={{ pr: '26px' }} />
      </CardActionArea>
    </Card>
  )
}

// "Choose your platform" buttons for a release: one full-width row per streaming
// link, labeled and iconed by detected platform. The whole row links out to the
// platform (opening its app/site).
function PlatformsWidget({ widget, onLinkClick }) {
  return (
    <Card sx={{ display: 'flex', flexDirection: 'column', gap: '6px', p: '8px 18px' }}>
      {widget.title && <SectionTitle>{widget.title}</SectionTitle>}
      {widget.platforms.map((platform) => {
        const Icon = PLATFORM_ICON_COMPONENTS[platform.id] || OtherPlatformIcon
        return (
          <Link
            key={platform.url}
            href={platform.url}
            target="_blank"
            rel="noopener noreferrer"
            underline="none"
            onClick={() => onLinkClick(`platform:${platform.id}`)}
            sx={{ display: 'flex', alignItems: 'center', gap: '12px', minHeight: 68, py: '6px', color: 'text.primary', '&:hover .play-pill': { bgcolor: 'text.primary', color: 'background.paper' } }}
          >
            <Box component="span" sx={{ display: 'inline-flex', flexShrink: 0 }}><Icon size={30} /></Box>
            <Typography variant="body1" component="span" sx={{ minWidth: 0 }}>{platform.label}</Typography>
            <Box component="span" className="play-pill" sx={playPillSx}>Play</Box>
          </Link>
        )
      })}
    </Card>
  )
}

// Rich embed card for a pasted URL. Embeddable platforms show a facade that
// opens the player in a closable modal overlay; anything else is a rich Open
// Graph link card.
function EmbedWidget({ widget, onLinkClick }) {
  const [playing, setPlaying] = useState(null)
  const embed = widget.embed
  const label = widget.title || widget.url

  const openPlayer = () => {
    onLinkClick(`embed:${embed.type}`)
    setPlaying(embed)
  }
  const player = (
    <EmbedOverlay
      embed={playing}
      title={widget.title}
      url={widget.url}
      onOpenExternal={() => onLinkClick(`link:${label}`)}
      onClose={() => setPlaying(null)}
    />
  )

  if (embed?.display === 'inline') {
    return (
      <Card sx={{ display: 'flex', flexDirection: 'column', gap: '8px', p: '10px 14px' }}>
        <ButtonBase
          onClick={openPlayer}
          sx={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%', justifyContent: 'flex-start', textAlign: 'inherit' }}
        >
          <Thumb src={widget.imageUrl} />
          <CardLabel label={label} sublabel={widget.description} />
          <Box component="span" className="play-pill" sx={playPillSx}>Play</Box>
        </ButtonBase>
        {player}
      </Card>
    )
  }

  if (embed?.display === 'overlay') {
    return (
      <Card sx={{ p: '0 0 10px', overflow: 'hidden' }}>
        <ButtonBase
          onClick={openPlayer}
          sx={{ position: 'relative', display: 'block', width: '100%', aspectRatio: '16 / 9', bgcolor: '#0c0d0f', overflow: 'hidden' }}
        >
          {widget.imageUrl && <Box component="img" src={widget.imageUrl} alt="" sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
          <Box component="span" aria-hidden="true" sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 64, height: 64, borderRadius: '50%', bgcolor: 'rgb(12 13 15 / 0.75)', color: '#fff', fontSize: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', pl: '5px' }}>▶</Box>
        </ButtonBase>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: '6px', p: '10px 14px 0' }}>
          <CardLabel label={label} sublabel={widget.description} />
        </Box>
        {player}
      </Card>
    )
  }

  return (
    <Card>
      <CardActionArea
        component="a"
        href={widget.url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => onLinkClick(`link:${label}`)}
        sx={{ display: 'flex', alignItems: 'center', gap: '12px', minHeight: 64, p: '12px 16px' }}
      >
        {widget.imageUrl ? (
          <Thumb src={widget.imageUrl} />
        ) : (
          <Box component="span" sx={{ display: 'inline-flex', color: 'text.primary', flexShrink: 0 }}><OtherPlatformIcon size={26} /></Box>
        )}
        <CardLabel label={label} sublabel={widget.description} sx={{ pr: '26px' }} />
      </CardActionArea>
    </Card>
  )
}

// The release artwork: the cover sits on a blurred, stretched copy of itself so
// the wide desktop view fills the space beside the cover. The blurred layer is
// hidden on narrow screens.
function ReleaseArt({ release }) {
  const coverSx = (theme) => ({
    width: 'var(--cover-w)', height: 'var(--cover-w)', borderRadius: 0, objectFit: 'cover',
    boxShadow: '0 10px 30px rgb(20 22 26 / 0.18)', bgcolor: '#0c0d0f',
    ...theme.applyStyles('dark', { boxShadow: `0 0 0 1px ${theme.vars.palette.surface.border}, 0 10px 30px rgb(0 0 0 / 0.35)` }),
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

// Release title and artist.
function ReleaseInfo({ release }) {
  return (
    <Box component="header" sx={{ textAlign: 'center', mb: '4px', '@container (min-width:840px)': { textAlign: 'left', mb: '8px' } }}>
      <Typography variant="h2" sx={{ mb: '4px' }}>{release.title}</Typography>
      {release.artist && <Typography variant="subtitle2" component="p" color="text.secondary" sx={{ mb: '10px' }}>{release.artist}</Typography>}
    </Box>
  )
}

const WIDGETS = {
  song: SongWidget,
  platforms: PlatformsWidget,
  embed: EmbedWidget,
  gigs: GigsWidget,
  merch: MerchWidget,
  link: LinkWidget,
}

const noopClick = () => {}

function Section({ section, onLinkClick }) {
  return (
    <Box component="section" sx={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {section.title && <SectionTitle>{section.title}</SectionTitle>}
      {section.widgets.map((widget) => {
        const Widget = WIDGETS[widget.type]
        return Widget ? <Widget key={widget.id} widget={widget} onLinkClick={onLinkClick} /> : null
      })}
    </Box>
  )
}

// `onLinkClick(target)` reports outbound clicks (public page wires it to the
// click beacon; the editor preview leaves it unset). `corner` is an optional
// node pinned to the band page's content card (the public page's share button);
// the card is its positioned ancestor. `flush` runs the band card's bottom edge
// off the bottom of the page (grows to fill a flex-column parent, square bottom
// corners); the public page sets it, the framed editor preview doesn't.
export default function WidgetStack({ page, onLinkClick = noopClick, footer = null, corner = null, flush = false }) {
  // Release pages use a two-pane layout: artwork on one side, content on the
  // other. The container-query context drives the side-by-side split only when
  // the page itself is wide — so the narrow editor preview and phones keep the
  // single stacked column.
  if (page.release) {
    return (
      <Box sx={{ containerType: 'inline-size', '--cover-w': 'min(320px, 78vw)' }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', '@container (min-width:840px)': { flexDirection: 'row', alignItems: 'stretch', minHeight: '100vh', m: '-40px -16px -24px' } }}>
          <ReleaseArt release={page.release} />
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: '14px', width: '100%', maxWidth: 'var(--cover-w)', mx: 'auto', '@container (min-width:840px)': { flex: '0 0 33%', maxWidth: 'none', mx: 0, p: '56px 44px', overflowY: 'auto' } }}>
            <ReleaseInfo release={page.release} />
            {page.sections.map((section) => <Section key={section.id} section={section} onLinkClick={onLinkClick} />)}
            {/* The band header normally hosts the socials; the release header
                replaces it, so they live at the foot of the content pane. */}
            <SocialLinks band={page.band} onLinkClick={onLinkClick} variant="circle" />
            {/* The footer lives inside the content pane so the desktop split
                keeps the whole viewport as artwork + content. */}
            {footer}
          </Box>
        </Box>
      </Box>
    )
  }

  // The band page is one centered card on the scope's canvas. Its `surface.s2`
  // shell keeps the widget cards inside it — which use `background.paper` —
  // reading as distinct surfaces in both schemes. Living here rather than in
  // PublicPage means the editor preview shows the same card.
  const bannerShown = !!(page.showBanner && page.band?.bannerUrl)
  return (
    <Card
      sx={(theme) => ({
        position: 'relative',
        width: '100%', maxWidth: 612, mx: 'auto',
        bgcolor: 'surface.s2',
        borderRadius: `${theme.shape.preview}px`,
        p: { xs: `${CARD_PAD_TOP.xs}px ${CARD_PAD_X.xs}px 26px`, sm: `${CARD_PAD_TOP.sm}px ${CARD_PAD_X.sm}px 34px` },
        // Clips the banner's square corners to the card's rounded shape.
        ...(bannerShown && { overflow: 'hidden' }),
        ...(flush && {
          flexGrow: 1,
          borderBottomLeftRadius: 0, borderBottomRightRadius: 0,
        }),
      })}
    >
      {corner}
      {bannerShown && <BandBanner src={page.band.bannerUrl} />}
      <Stack spacing={1.75} sx={{ maxWidth: 600, mx: 'auto' }}>
        <BandHeader band={page.band} onLinkClick={onLinkClick} bannerShown={bannerShown} />
        {page.sections.map((section) => <Section key={section.id} section={section} onLinkClick={onLinkClick} />)}
      </Stack>
      {footer}
    </Card>
  )
}

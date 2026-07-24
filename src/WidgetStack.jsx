// Visitor-facing rendering of a resolved page: band header + sections of
// widget cards. Used verbatim by the public page and the editor's
// preview-as-visitor mode, so preview can never drift from reality.
import { useState } from 'react'
import { InlineEmbed, VideoOverlay } from './embeds.jsx'
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

const SOCIALS = [
  { key: 'instagram', Icon: InstagramIcon, url: (h) => `https://instagram.com/${h}` },
  { key: 'facebook', Icon: FacebookIcon, url: (h) => `https://facebook.com/${h}` },
  { key: 'youtube', Icon: YoutubeIcon, url: (h) => `https://youtube.com/${h.startsWith('@') ? h : `@${h}`}` },
  { key: 'tiktok', Icon: TiktokIcon, url: (h) => `https://tiktok.com/${h.startsWith('@') ? h : `@${h}`}` },
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

// The band's social icons, shared by the band header (plain icons) and the
// release page footer (circular buttons). Renders nothing when the band has
// set no socials.
function SocialLinks({ band, onLinkClick, className, linkClassName, size }) {
  const items = SOCIALS.filter((s) => band?.socials?.[s.key])
  if (!items.length) return null
  return (
    <div className={className}>
      {items.map((s) => (
        <a
          key={s.key}
          className={linkClassName}
          href={socialHref(s, band.socials[s.key])}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={s.key}
          onClick={() => onLinkClick(`social:${s.key}`)}
        >
          <s.Icon size={size} />
        </a>
      ))}
    </div>
  )
}

function BandHeader({ band, onLinkClick }) {
  if (!band) return null
  return (
    <header className="band-header">
      {band.logoUrl && <img className="band-avatar" src={band.logoUrl} alt={band.name || 'Band logo'} />}
      <h1 className="band-name">{band.name}</h1>
      {band.bio && <p className="band-bio">{band.bio}</p>}
      <SocialLinks band={band} onLinkClick={onLinkClick} className="band-socials" linkClassName="social-link" size={30} />
    </header>
  )
}

function SongWidget({ widget, onLinkClick }) {
  const primary = widget.links[0]
  const extras = widget.links.slice(1)
  return (
    <div className="card song-card">
      <a
        className="song-main"
        href={primary.url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => onLinkClick(`song:${primary.label || 'listen'}`)}
      >
        {widget.coverUrl ? (
          <img className="song-cover" src={widget.coverUrl} alt="" />
        ) : (
          <div className="song-cover song-cover-placeholder">♪</div>
        )}
        <span className="card-label">
          {widget.title}
          {widget.artist && <span className="card-sublabel">{widget.artist}</span>}
        </span>
      </a>
      {extras.length > 0 && (
        <div className="song-extra-links">
          {extras.map((link, i) => {
            // A link that resolves to a known platform renders as that
            // platform's clickable icon; anything else keeps the text pill.
            const platformId = link.platform && link.platform.id !== 'other' ? link.platform.id : null
            const Icon = platformId ? PLATFORM_ICON_COMPONENTS[platformId] : null
            return Icon ? (
              <a
                key={i}
                className="song-platform-icon"
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={link.platform.label}
                title={link.platform.label}
                onClick={() => onLinkClick(`platform:${platformId}`)}
              >
                <Icon size={26} />
              </a>
            ) : (
              <a
                key={i}
                className="pill"
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => onLinkClick(`song:${link.label || 'listen'}`)}
              >
                {link.label || 'Listen'}
              </a>
            )
          })}
        </div>
      )}
    </div>
  )
}

function GigsWidget({ widget }) {
  return (
    <details className="card gigs-card">
      <summary className="gigs-summary">
        <span className="card-icon"><CalendarIcon size={26} /></span>
        <span className="card-label">{widget.title}</span>
        <span className="gigs-chevron" aria-hidden="true">▾</span>
      </summary>
      {widget.gigs.length === 0 ? (
        <p className="gigs-empty">No upcoming gigs announced — check back soon.</p>
      ) : (
        <ul className="gigs-list">
          {widget.gigs.map((gig) => {
            const { month, day } = formatGigDate(gig.date)
            return (
              <li key={gig.id} className="gig-row">
                <span className="gig-date">
                  <span className="gig-month">{month}</span>
                  <span className="gig-day">{day}</span>
                </span>
                <span className="gig-info">
                  <span className="gig-title">{gig.title}</span>
                  {(gig.venue || gig.city) && (
                    <span className="gig-venue">{[gig.venue, gig.city].filter(Boolean).join(', ')}</span>
                  )}
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </details>
  )
}

function MerchProduct({ product, shopUrl, onLinkClick }) {
  const body = (
    <>
      <div className="merch-image">
        {product.imageUrl ? <img src={product.imageUrl} alt="" /> : <span aria-hidden="true">♪</span>}
        {product.badge && <span className="merch-badge">{product.badge}</span>}
      </div>
      <span className="merch-name">{product.name}</span>
      <span className="merch-price">{formatEur(product.priceCents)}</span>
    </>
  )
  return shopUrl ? (
    <a
      className="merch-item"
      href={shopUrl}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => onLinkClick('shop')}
    >{body}</a>
  ) : (
    <div className="merch-item">{body}</div>
  )
}

function MerchWidget({ widget, onLinkClick }) {
  return (
    <div className="card merch-card">
      {widget.title && <h3 className="merch-title">{widget.title}</h3>}
      <div className="merch-scroll">
        {widget.products.map((product) => (
          <MerchProduct key={product.id} product={product} shopUrl={widget.shopUrl} onLinkClick={onLinkClick} />
        ))}
      </div>
    </div>
  )
}

function LinkWidget({ widget, onLinkClick }) {
  const Icon = LINK_ICON_COMPONENTS[widget.icon] || LINK_ICON_COMPONENTS.globe
  return (
    <a
      className="card link-card"
      href={widget.url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => onLinkClick(`link:${widget.label}`)}
    >
      {widget.imageUrl ? (
        <img className="link-thumb" src={widget.imageUrl} alt="" />
      ) : (
        <span className="card-icon"><Icon size={26} /></span>
      )}
      <span className="card-label">
        {widget.label}
        {widget.sublabel && <span className="card-sublabel">{widget.sublabel}</span>}
      </span>
    </a>
  )
}

// "Choose your platform" buttons for a release: one full-width button per
// streaming link, labeled and iconed by detected platform. Embeddable
// platforms additionally get a click-to-play preview: Spotify expands an
// inline player under the row, YouTube opens a lightbox overlay.
function PlatformsWidget({ widget, onLinkClick }) {
  const [inlineIndex, setInlineIndex] = useState(null)
  const [overlaySrc, setOverlaySrc] = useState(null)

  const preview = (platform, index) => {
    onLinkClick(`embed:${platform.embed.type}`)
    if (platform.embed.display === 'inline') {
      setInlineIndex(inlineIndex === index ? null : index)
    } else {
      setOverlaySrc(platform.embed.src)
    }
  }

  return (
    <div className="platforms">
      {widget.title && <h3 className="section-title">{widget.title}</h3>}
      {widget.platforms.map((platform, i) => {
        const Icon = PLATFORM_ICON_COMPONENTS[platform.id] || PLATFORM_ICON_COMPONENTS.other
        return (
          <div key={i} className="platform-row">
            <div className="platform-row-main">
              <a
                className="platform-card"
                href={platform.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => onLinkClick(`platform:${platform.id}`)}
              >
                <span className="platform-logo"><Icon size={30} /></span>
                <span className="platform-name">{platform.label}</span>
                <span className="platform-play">Play</span>
              </a>
              {platform.embed && (
                <button
                  className="platform-preview"
                  onClick={() => preview(platform, i)}
                  aria-label={`Preview on ${platform.label}`}
                  title="Preview here"
                >▶</button>
              )}
            </div>
            {inlineIndex === i && platform.embed?.display === 'inline' && (
              <InlineEmbed embed={platform.embed} title={platform.label} />
            )}
          </div>
        )
      })}
      <VideoOverlay src={overlaySrc} onClose={() => setOverlaySrc(null)} />
    </div>
  )
}

// Rich embed card for a pasted URL. Inline platforms show a facade that
// swaps to the player; video platforms open the overlay; anything else is a
// rich Open Graph link card.
function EmbedWidget({ widget, onLinkClick }) {
  const [inlineOpen, setInlineOpen] = useState(false)
  const [overlaySrc, setOverlaySrc] = useState(null)
  const embed = widget.embed
  const label = widget.title || widget.url

  if (embed?.display === 'inline') {
    return (
      <div className="card embed-card">
        {inlineOpen ? (
          <InlineEmbed embed={embed} title={widget.title} />
        ) : (
          <button
            className="embed-facade"
            onClick={() => {
              onLinkClick(`embed:${embed.type}`)
              setInlineOpen(true)
            }}
          >
            {widget.imageUrl ? (
              <img className="song-cover" src={widget.imageUrl} alt="" />
            ) : (
              <span className="song-cover song-cover-placeholder">♪</span>
            )}
            <span className="card-label">
              {label}
              {widget.description && <span className="card-sublabel">{widget.description}</span>}
            </span>
            <span className="platform-play">Play</span>
          </button>
        )}
        <a
          className="embed-external"
          href={widget.url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => onLinkClick(`link:${label}`)}
        >
          Open in app ↗
        </a>
      </div>
    )
  }

  if (embed?.display === 'overlay') {
    return (
      <div className="card embed-card embed-video-card">
        <button
          className="embed-video-facade"
          onClick={() => {
            onLinkClick(`embed:${embed.type}`)
            setOverlaySrc(embed.src)
          }}
        >
          {widget.imageUrl && <img src={widget.imageUrl} alt="" />}
          <span className="embed-play-badge" aria-hidden="true">▶</span>
        </button>
        <div className="embed-caption">
          <span className="card-label">
            {label}
            {widget.description && <span className="card-sublabel">{widget.description}</span>}
          </span>
          <a
            className="embed-external"
            href={widget.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => onLinkClick(`link:${label}`)}
          >
            Watch on the platform ↗
          </a>
        </div>
        <VideoOverlay src={overlaySrc} onClose={() => setOverlaySrc(null)} />
      </div>
    )
  }

  return (
    <a
      className="card link-card"
      href={widget.url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => onLinkClick(`link:${label}`)}
    >
      {widget.imageUrl ? (
        <img className="link-thumb" src={widget.imageUrl} alt="" />
      ) : (
        <span className="card-icon"><PLATFORM_ICON_COMPONENTS.other size={26} /></span>
      )}
      <span className="card-label">
        {label}
        {widget.description && <span className="card-sublabel">{widget.description}</span>}
      </span>
    </a>
  )
}

// The release artwork (left pane on desktop, top on mobile): the cover sits on
// a blurred, stretched copy of itself so the wide desktop view fills the space
// beside the cover instead of leaving dead canvas. The blurred layer is hidden
// on narrow screens (see .release-art-bg in styles.css).
function ReleaseArt({ release }) {
  return (
    <div className="release-art">
      {release.coverUrl && (
        <img className="release-art-bg" src={release.coverUrl} alt="" aria-hidden="true" />
      )}
      {release.coverUrl ? (
        <img className="release-cover" src={release.coverUrl} alt={release.title} />
      ) : (
        <div className="release-cover release-cover-placeholder">♪</div>
      )}
    </div>
  )
}

// Release title, artist, and a small link back to the band's main page. On
// desktop this is the head of the right-hand content pane; on mobile it sits
// under the artwork.
function ReleaseInfo({ release, band }) {
  return (
    <header className="release-header">
      <h1 className="release-title">{release.title}</h1>
      {release.artist && <p className="release-artist">{release.artist}</p>}
      {band?.slug && (
        <a className="release-band-link" href={`/${band.slug}`}>
          More from {band.name || 'this band'} →
        </a>
      )}
    </header>
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

function Sections({ sections, onLinkClick }) {
  return sections.map((section) => (
    <section key={section.id} className="stack-section">
      {section.title && <h2 className="section-title">{section.title}</h2>}
      {section.widgets.map((widget) => {
        const Widget = WIDGETS[widget.type]
        return Widget ? <Widget key={widget.id} widget={widget} onLinkClick={onLinkClick} /> : null
      })}
    </section>
  ))
}

// `onLinkClick(target)` reports outbound clicks (public page wires it to the
// click beacon; the editor preview leaves it unset).
export default function WidgetStack({ page, onLinkClick = noopClick, footer = null }) {
  // Release pages use a two-pane layout: artwork on one side, content on the
  // other. The `.release-frame` container-query context (styles.css) drives the
  // side-by-side split only when the page itself is wide — so the narrow editor
  // preview and phones keep the single stacked column.
  if (page.release) {
    return (
      <div className="release-frame">
        <div className="release-layout">
          <ReleaseArt release={page.release} />
          <div className="release-main">
            <ReleaseInfo release={page.release} band={page.band} />
            <Sections sections={page.sections} onLinkClick={onLinkClick} />
            {/* The band header normally hosts the socials; the release header
                replaces it, so they live at the foot of the content pane. */}
            <SocialLinks band={page.band} onLinkClick={onLinkClick} className="release-socials" linkClassName="release-social" size={20} />
            {/* The page footer lives inside the content pane so the desktop
                split keeps the whole viewport as artwork + content, with no
                plain page background below the two panes. */}
            {footer}
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="stack">
        <BandHeader band={page.band} onLinkClick={onLinkClick} />
        <Sections sections={page.sections} onLinkClick={onLinkClick} />
      </div>
      {footer}
    </>
  )
}

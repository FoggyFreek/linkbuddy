// Per-widget-type editing controls, plus the WidgetEditor dispatcher that
// renders the right one. Each editor is a controlled component: it receives the
// widget and calls `onChange` with the next widget. `onUnfurl(url)` fetches
// link metadata (used by the link and embed editors).
import { useState } from 'react'
import { LINK_ICON_KEYS } from '../../shared/linkIcons.js'

const ICON_OPTIONS = LINK_ICON_KEYS

export function SongSelect({ value, songs, onChange }) {
  return (
    <select value={value} onChange={(e) => onChange(Number(e.target.value))}>
      {songs.map((song) => (
        <option key={song.id} value={song.id}>
          {song.title}
          {song.artist ? ` — ${song.artist}` : ''}
        </option>
      ))}
    </select>
  )
}

function SongWidgetEditor({ widget, songs, onChange }) {
  return <SongSelect value={widget.songId} songs={songs} onChange={(songId) => onChange({ ...widget, songId })} />
}

function PlatformsWidgetEditor({ widget, songs, onChange }) {
  return (
    <div className="widget-fields">
      <input
        placeholder="Title (optional)"
        value={widget.title || ''}
        onChange={(e) => onChange({ ...widget, title: e.target.value || null })}
      />
      <SongSelect value={widget.songId} songs={songs} onChange={(songId) => onChange({ ...widget, songId })} />
      <p className="field-hint">One button per streaming link of this song, platform detected automatically.</p>
    </div>
  )
}

function GigsWidgetEditor({ widget, onChange }) {
  return (
    <div className="widget-fields">
      <input
        placeholder="Title (Upcoming Gigs)"
        value={widget.title || ''}
        onChange={(e) => onChange({ ...widget, title: e.target.value })}
      />
      <label className="inline-field">
        Max gigs
        <input
          type="number"
          min="1"
          max="50"
          value={widget.limit}
          onChange={(e) => onChange({ ...widget, limit: Number(e.target.value) || 10 })}
        />
      </label>
    </div>
  )
}

function MerchWidgetEditor({ widget, products, onChange }) {
  const included = new Map(widget.items.map((item) => [item.productId, item]))
  const toggle = (productId) => {
    const items = included.has(productId)
      ? widget.items.filter((item) => item.productId !== productId)
      : [...widget.items, { productId, imageUrl: null, badge: null }]
    onChange({ ...widget, items })
  }
  const updateItem = (productId, patch) => {
    onChange({
      ...widget,
      items: widget.items.map((item) => (item.productId === productId ? { ...item, ...patch } : item)),
    })
  }
  return (
    <div className="widget-fields">
      <input
        placeholder="Title (e.g. Album CDs and LPs)"
        value={widget.title || ''}
        onChange={(e) => onChange({ ...widget, title: e.target.value })}
      />
      <input
        placeholder="Shop URL the items link to (optional)"
        value={widget.shopUrl || ''}
        onChange={(e) => onChange({ ...widget, shopUrl: e.target.value || null })}
      />
      <ul className="merch-editor-list">
        {products.map((product) => {
          const item = included.get(product.id)
          return (
            <li key={product.id}>
              <label className="inline-field">
                <input type="checkbox" checked={!!item} onChange={() => toggle(product.id)} />
                {product.name}
              </label>
              {item && (
                <div className="merch-item-fields">
                  <input
                    placeholder="Image URL (optional)"
                    value={item.imageUrl || ''}
                    onChange={(e) => updateItem(product.id, { imageUrl: e.target.value || null })}
                  />
                  <input
                    placeholder="Badge (e.g. NEW)"
                    maxLength={20}
                    value={item.badge || ''}
                    onChange={(e) => updateItem(product.id, { badge: e.target.value || null })}
                  />
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function LinkWidgetEditor({ widget, onChange, onUnfurl }) {
  const [fetching, setFetching] = useState(false)
  const [fetchError, setFetchError] = useState(null)
  const fill = async () => {
    setFetching(true)
    setFetchError(null)
    try {
      const meta = await onUnfurl(widget.url)
      onChange({
        ...widget,
        imageUrl: meta.imageUrl || widget.imageUrl,
        label: widget.label || meta.title || widget.label,
        sublabel: widget.sublabel || meta.siteName || null,
      })
    } catch (err) {
      setFetchError(err.message)
    } finally {
      setFetching(false)
    }
  }
  return (
    <div className="widget-fields">
      <input
        placeholder="Label"
        value={widget.label || ''}
        onChange={(e) => onChange({ ...widget, label: e.target.value })}
      />
      <input
        placeholder="https://…"
        value={widget.url || ''}
        onChange={(e) => onChange({ ...widget, url: e.target.value })}
      />
      <input
        placeholder="Sublabel (optional)"
        value={widget.sublabel || ''}
        onChange={(e) => onChange({ ...widget, sublabel: e.target.value || null })}
      />
      <input
        placeholder="Thumbnail image URL (optional)"
        value={widget.imageUrl || ''}
        onChange={(e) => onChange({ ...widget, imageUrl: e.target.value || null })}
      />
      <label className="inline-field">
        Icon
        <select value={widget.icon} onChange={(e) => onChange({ ...widget, icon: e.target.value })}>
          {ICON_OPTIONS.map((icon) => (
            <option key={icon} value={icon}>{icon}</option>
          ))}
        </select>
      </label>
      <div className="unfurl-row">
        <button className="btn" onClick={fill} disabled={fetching || !widget.url}>
          {fetching ? 'Fetching…' : 'Fetch image & info from link'}
        </button>
        {fetchError && <span className="form-error">{fetchError}</span>}
      </div>
    </div>
  )
}

// Embed widget: paste a URL, load its metadata (oEmbed / Open Graph), and it
// renders as a player (Spotify inline, YouTube overlay) or a rich link card.
function EmbedWidgetEditor({ widget, onChange, onUnfurl }) {
  const [fetching, setFetching] = useState(false)
  const [fetchError, setFetchError] = useState(null)
  const [provider, setProvider] = useState(null)
  const load = async () => {
    setFetching(true)
    setFetchError(null)
    try {
      const meta = await onUnfurl(widget.url)
      setProvider(meta.embed ? meta.embed.type : meta.siteName || 'link card')
      onChange({
        ...widget,
        title: meta.title || widget.title,
        description: meta.description || widget.description,
        imageUrl: meta.imageUrl || widget.imageUrl,
      })
    } catch (err) {
      setFetchError(err.message)
    } finally {
      setFetching(false)
    }
  }
  return (
    <div className="widget-fields">
      <input
        placeholder="Paste a Spotify, YouTube, SoundCloud or any other URL"
        value={widget.url || ''}
        onChange={(e) => onChange({ ...widget, url: e.target.value })}
      />
      <div className="unfurl-row">
        <button className="btn" onClick={load} disabled={fetching || !widget.url}>
          {fetching ? 'Fetching…' : 'Load info from link'}
        </button>
        {provider && <span className="field-hint">Renders as: {provider}</span>}
        {fetchError && <span className="form-error">{fetchError}</span>}
      </div>
      <input
        placeholder="Title"
        value={widget.title || ''}
        onChange={(e) => onChange({ ...widget, title: e.target.value || null })}
      />
      <input
        placeholder="Description (optional)"
        value={widget.description || ''}
        onChange={(e) => onChange({ ...widget, description: e.target.value || null })}
      />
      <input
        placeholder="Image URL (auto-filled from the link)"
        value={widget.imageUrl || ''}
        onChange={(e) => onChange({ ...widget, imageUrl: e.target.value || null })}
      />
      <p className="field-hint">
        Spotify/SoundCloud play inline, YouTube opens in an overlay — always click-to-play.
      </p>
    </div>
  )
}

// Dispatches to the editor for `widget.type`; unknown types render nothing.
export function WidgetEditor({ widget, content, onChange, onUnfurl }) {
  switch (widget.type) {
    case 'song':
      return <SongWidgetEditor widget={widget} songs={content.songs || []} onChange={onChange} />
    case 'platforms':
      return <PlatformsWidgetEditor widget={widget} songs={content.songs || []} onChange={onChange} />
    case 'gigs':
      return <GigsWidgetEditor widget={widget} onChange={onChange} />
    case 'merch':
      return <MerchWidgetEditor widget={widget} products={content.products || []} onChange={onChange} />
    case 'link':
      return <LinkWidgetEditor widget={widget} onChange={onChange} onUnfurl={onUnfurl} />
    case 'embed':
      return <EmbedWidgetEditor widget={widget} onChange={onChange} onUnfurl={onUnfurl} />
    default:
      return null
  }
}

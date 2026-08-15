// Per-widget-type editing controls, plus the WidgetEditor dispatcher that
// renders the right one. Each editor is a controlled component: it receives the
// widget and calls `onChange` with the next widget. `onUnfurl(url)` fetches
// link metadata (used by the link and embed editors). Built from MUI form
// components (TextField, Select, Checkbox, Button).
import { useState, type ReactNode } from 'react'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
import Button from '@mui/material/Button'
import Checkbox from '@mui/material/Checkbox'
import FormControlLabel from '@mui/material/FormControlLabel'
import Typography from '@mui/material/Typography'
import { LINK_ICON_KEYS } from '../../../../shared/linkIcons.js'
import { LINK_ICON_COMPONENTS } from '../../../components/icons.js'
import type {
  ContentSnapshot, DraftWidget, EmbedWidgetDraft, GigsWidgetDraft, LinkWidgetDraft,
  MerchItemDraft, MerchWidgetDraft, PlatformsWidgetDraft, Product, Song,
  SongWidgetDraft, UnfurlResult,
} from '../../../types.js'
import { errorMessage } from '../../../types.js'

const ICON_OPTIONS = LINK_ICON_KEYS

// The icon picker shows the glyph itself rather than its key. The SVGs are
// aria-hidden, so each option carries the key as its accessible name.
function IconOption({ icon }: { icon: string }) {
  const Icon = LINK_ICON_COMPONENTS[icon] || LINK_ICON_COMPONENTS.globe
  return <Box sx={{ display: 'flex', color: 'text.primary' }} aria-label={icon}><Icon size={20} /></Box>
}

const Hint = ({ children }: { children: ReactNode }) => (
  <Typography variant="caption" color="text.secondary">{children}</Typography>
)

export function SongSelect({ value, songs, onChange, label = 'Song' }: { value: number; songs: Song[]; onChange: (id: number) => void; label?: string }) {
  return (
    <TextField
      select
      size="small"
      fullWidth
      label={label}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
    >
      {songs.map((song) => (
        <MenuItem key={song.id} value={song.id}>
          {song.title}
          {song.artist ? ` — ${song.artist}` : ''}
        </MenuItem>
      ))}
    </TextField>
  )
}

function SongWidgetEditor({ widget, songs, onChange }: { widget: SongWidgetDraft; songs: Song[]; onChange: (widget: SongWidgetDraft) => void }) {
  return <SongSelect value={widget.songId} songs={songs} onChange={(songId) => onChange({ ...widget, songId })} />
}

function PlatformsWidgetEditor({ widget, songs, onChange }: { widget: PlatformsWidgetDraft; songs: Song[]; onChange: (widget: PlatformsWidgetDraft) => void }) {
  return (
    <Stack spacing={1}>
      <TextField
        size="small"
        fullWidth
        label="Title (optional)"
        value={widget.title || ''}
        onChange={(e) => onChange({ ...widget, title: e.target.value || null })}
      />
      <SongSelect value={widget.songId} songs={songs} onChange={(songId) => onChange({ ...widget, songId })} />
      <Hint>One button per streaming link of this song, platform detected automatically.</Hint>
    </Stack>
  )
}

function GigsWidgetEditor({ widget, onChange }: { widget: GigsWidgetDraft; onChange: (widget: GigsWidgetDraft) => void }) {
  return (
    <Stack spacing={1}>
      <TextField
        size="small"
        fullWidth
        label="Title (Upcoming Gigs)"
        value={widget.title || ''}
        onChange={(e) => onChange({ ...widget, title: e.target.value })}
      />
      <TextField
        type="number"
        size="small"
        label="Max gigs"
        value={widget.limit}
        onChange={(e) => onChange({ ...widget, limit: Number(e.target.value) || 10 })}
        slotProps={{ htmlInput: { min: 1, max: 50 } }}
        sx={{ width: 120 }}
      />
    </Stack>
  )
}

function MerchWidgetEditor({ widget, products, onChange }: { widget: MerchWidgetDraft; products: Product[]; onChange: (widget: MerchWidgetDraft) => void }) {
  const included = new Map(widget.items.map((item) => [item.productId, item]))
  const toggle = (productId: number) => {
    const items = included.has(productId)
      ? widget.items.filter((item) => item.productId !== productId)
      : [...widget.items, { productId, imageUrl: null, badge: null }]
    onChange({ ...widget, items })
  }
  const updateItem = (productId: number, patch: Partial<MerchItemDraft>) => {
    onChange({
      ...widget,
      items: widget.items.map((item) => (item.productId === productId ? { ...item, ...patch } : item)),
    })
  }
  return (
    <Stack spacing={1}>
      <TextField
        size="small"
        fullWidth
        label="Title (e.g. Album CDs and LPs)"
        value={widget.title || ''}
        onChange={(e) => onChange({ ...widget, title: e.target.value })}
      />
      <TextField
        size="small"
        fullWidth
        label="Shop URL the items link to (optional)"
        value={widget.shopUrl || ''}
        onChange={(e) => onChange({ ...widget, shopUrl: e.target.value || null })}
      />
      <Stack component="ul" spacing={0.5} sx={{ listStyle: 'none', m: 0, p: 0 }}>
        {products.map((product) => {
          const item = included.get(product.id)
          return (
            <Box component="li" key={product.id}>
              <FormControlLabel
                control={<Checkbox size="small" checked={!!item} onChange={() => toggle(product.id)} />}
                label={product.name}
              />
              {item && (
                <Stack direction="row" spacing={1} sx={{ ml: '24px', mt: 0.5, mb: 0.5 }}>
                  <TextField
                    size="small"
                    fullWidth
                    label="Image URL (optional)"
                    value={item.imageUrl || ''}
                    onChange={(e) => updateItem(product.id, { imageUrl: e.target.value || null })}
                  />
                  <TextField
                    size="small"
                    label="Badge (e.g. NEW)"
                    value={item.badge || ''}
                    onChange={(e) => updateItem(product.id, { badge: e.target.value || null })}
                    slotProps={{ htmlInput: { maxLength: 20 } }}
                  />
                </Stack>
              )}
            </Box>
          )
        })}
      </Stack>
    </Stack>
  )
}

interface UnfurlEditorProps<T extends LinkWidgetDraft | EmbedWidgetDraft> {
  widget: T
  onChange: (widget: T) => void
  onUnfurl: (url: string) => Promise<UnfurlResult>
}

function LinkWidgetEditor({ widget, onChange, onUnfurl }: UnfurlEditorProps<LinkWidgetDraft>) {
  const [fetching, setFetching] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
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
      setFetchError(errorMessage(err))
    } finally {
      setFetching(false)
    }
  }
  return (
    <Stack spacing={1}>
      <TextField size="small" fullWidth label="Label" value={widget.label || ''} onChange={(e) => onChange({ ...widget, label: e.target.value })} />
      <TextField size="small" fullWidth label="https://…" value={widget.url || ''} onChange={(e) => onChange({ ...widget, url: e.target.value })} />
      <TextField size="small" fullWidth label="Sublabel (optional)" value={widget.sublabel || ''} onChange={(e) => onChange({ ...widget, sublabel: e.target.value || null })} />
      <TextField size="small" fullWidth label="Thumbnail image URL (optional)" value={widget.imageUrl || ''} onChange={(e) => onChange({ ...widget, imageUrl: e.target.value || null })} />
      <TextField
        select
        size="small"
        label="Icon"
        value={widget.icon}
        onChange={(e) => onChange({ ...widget, icon: e.target.value })}
        sx={{ width: 110 }}
        slotProps={{ select: { renderValue: (icon: unknown) => <IconOption icon={String(icon)} /> } }}
      >
        {ICON_OPTIONS.map((icon) => (
          <MenuItem key={icon} value={icon}><IconOption icon={icon} /></MenuItem>
        ))}
      </TextField>
      <Stack direction="row" spacing={1} useFlexGap sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
        <Button variant="outlined" onClick={fill} disabled={fetching || !widget.url}>
          {fetching ? 'Fetching…' : 'Fetch image & info from link'}
        </Button>
        {fetchError && <Typography variant="caption" color="error">{fetchError}</Typography>}
      </Stack>
    </Stack>
  )
}

// Embed widget: paste a URL, load its metadata (oEmbed / Open Graph), and it
// renders as a player (Spotify inline, YouTube overlay) or a rich link card.
function EmbedWidgetEditor({ widget, onChange, onUnfurl }: UnfurlEditorProps<EmbedWidgetDraft>) {
  const [fetching, setFetching] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [provider, setProvider] = useState<string | null>(null)
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
      setFetchError(errorMessage(err))
    } finally {
      setFetching(false)
    }
  }
  return (
    <Stack spacing={1}>
      <TextField
        size="small"
        fullWidth
        label="Paste a Spotify, YouTube, SoundCloud or any other URL"
        value={widget.url || ''}
        onChange={(e) => onChange({ ...widget, url: e.target.value })}
      />
      <Stack direction="row" spacing={1} useFlexGap sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
        <Button variant="outlined" onClick={load} disabled={fetching || !widget.url}>
          {fetching ? 'Fetching…' : 'Load info from link'}
        </Button>
        {provider && <Hint>Renders as: {provider}</Hint>}
        {fetchError && <Typography variant="caption" color="error">{fetchError}</Typography>}
      </Stack>
      <TextField size="small" fullWidth label="Title" value={widget.title || ''} onChange={(e) => onChange({ ...widget, title: e.target.value || null })} />
      <TextField size="small" fullWidth label="Description (optional)" value={widget.description || ''} onChange={(e) => onChange({ ...widget, description: e.target.value || null })} />
      <TextField size="small" fullWidth label="Image URL (auto-filled from the link)" value={widget.imageUrl || ''} onChange={(e) => onChange({ ...widget, imageUrl: e.target.value || null })} />
      <Hint>Spotify/SoundCloud play inline, YouTube opens in an overlay — always click-to-play.</Hint>
    </Stack>
  )
}

// Dispatches to the editor for `widget.type`; unknown types render nothing.
export function WidgetEditor({ widget, content, onChange, onUnfurl }: {
  widget: DraftWidget
  content: ContentSnapshot
  onChange: (widget: DraftWidget) => void
  onUnfurl: (url: string) => Promise<UnfurlResult>
}) {
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

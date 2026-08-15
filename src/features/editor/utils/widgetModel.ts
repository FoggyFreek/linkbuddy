// The widget "model": how the editor creates a default widget of each type
// and how it labels an existing one in the section list. Pure (no React) so
// it can be unit-tested and reused. Widget rendering lives in components,
// editing in WidgetEditors, and validation server-side in layout.js.
import type { ContentSnapshot, DraftWidget, WidgetType } from '../../../types.js'

function newId() {
  return crypto.randomUUID()
}

// A default widget seeded from the synced content snapshot. Returns null when
// the content required by the selected widget type is missing.
export function makeWidget(type: WidgetType, content: ContentSnapshot): DraftWidget | null {
  const firstSong = (content.songs || [])[0]
  switch (type) {
    case 'song':
      return firstSong ? { id: newId(), type: 'song', songId: firstSong.id } : null
    case 'platforms':
      return firstSong ? { id: newId(), type: 'platforms', songId: firstSong.id, title: null } : null
    case 'gigs':
      return { id: newId(), type: 'gigs', title: 'Upcoming Gigs', limit: 10 }
    case 'merch': {
      const items = (content.products || []).map((product) => ({ productId: product.id, imageUrl: null, badge: null }))
      return items.length ? { id: newId(), type: 'merch', title: null, shopUrl: null, items } : null
    }
    case 'link':
      return { id: newId(), type: 'link', label: '', url: '', sublabel: null, imageUrl: null, icon: 'globe' }
    case 'embed':
      return { id: newId(), type: 'embed', url: '', title: null, description: null, imageUrl: null }
    default:
      return null
  }
}

const productCount = (count: number) => `${count} products`

// One-line label for a widget in the editor's section list. The fallback is
// intentional: old or future widget records remain identifiable in diagnostics.
export function widgetSummary(widget: DraftWidget, content: ContentSnapshot): string {
  const songTitle = (songId: number) => (content.songs || []).find((song) => song.id === songId)?.title || 'missing song'
  switch (widget.type) {
    case 'song':
      return `Song · ${songTitle(widget.songId)}`
    case 'platforms':
      return `Platform buttons · ${songTitle(widget.songId)}`
    case 'gigs':
      return `Gigs · ${widget.title || 'Upcoming Gigs'}`
    case 'merch':
      return `Merch · ${widget.title || productCount(widget.items.length)}`
    case 'link':
      return `Custom link · ${widget.label || widget.url}`
    case 'embed':
      return `Embed · ${widget.title || widget.url || 'new'}`
    default:
      return (widget as { type: string }).type
  }
}

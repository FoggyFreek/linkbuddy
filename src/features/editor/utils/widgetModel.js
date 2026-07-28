// The widget "model": how the editor creates a default widget of each type
// and how it labels an existing one in the section list. Pure (no React) so
// it can be unit-tested and reused. Widget *rendering* lives in
// features/public-links-card, *editing* in WidgetEditors, and *validation*
// server-side in layout.js — this module is the shared client vocabulary
// between the editor's controls.

function newId() {
  return crypto.randomUUID()
}

// A default widget of `type`, seeded from the synced content snapshot (first
// song, all products). Returns null when the content the widget needs is
// missing (a song/platforms widget with no songs, a merch widget with no
// products) so the caller can simply skip it.
export function makeWidget(type, content) {
  const firstSong = (content.songs || [])[0]
  switch (type) {
    case 'song':
      return firstSong ? { id: newId(), type: 'song', songId: firstSong.id } : null
    case 'platforms':
      return firstSong ? { id: newId(), type: 'platforms', songId: firstSong.id, title: null } : null
    case 'gigs':
      return { id: newId(), type: 'gigs', title: 'Upcoming Gigs', limit: 10 }
    case 'merch': {
      const items = (content.products || []).map((p) => ({ productId: p.id, imageUrl: null, badge: null }))
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

const productCount = (n) => `${n} products`

// One-line label for a widget in the editor's section list.
export function widgetSummary(widget, content) {
  const songTitle = (songId) => (content.songs || []).find((s) => s.id === songId)?.title || 'missing song'
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
      return widget.type
  }
}

import SongWidget from './SongWidget.jsx'
import PlatformsWidget from './PlatformsWidget.jsx'
import EmbedWidget from './EmbedWidget.jsx'
import GigsWidget from './GigsWidget.jsx'
import MerchWidget from './MerchWidget.jsx'
import LinkWidget from './LinkWidget.jsx'

// Widget type → renderer. The types are the ones `server/layout.js` validates
// and `resolve.js` emits, and any of them is legal on either page kind.
export const WIDGETS = {
  song: SongWidget,
  platforms: PlatformsWidget,
  embed: EmbedWidget,
  gigs: GigsWidget,
  merch: MerchWidget,
  link: LinkWidget,
}

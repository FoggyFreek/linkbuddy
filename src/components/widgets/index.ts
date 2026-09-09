import AccoladesWidget from './AccoladesWidget.js'
import SongWidget from './SongWidget.js'
import PlatformsWidget from './PlatformsWidget.js'
import EmbedWidget from './EmbedWidget.js'
import GigsWidget from './GigsWidget.js'
import MerchWidget from './MerchWidget.js'
import LinkWidget from './LinkWidget.js'

// Widget type → renderer. The types are the ones `server/features/editor/layout.js` validates
// and `resolve.js` emits, and any of them is legal on either page kind.
export const WIDGETS = {
  song: SongWidget,
  platforms: PlatformsWidget,
  embed: EmbedWidget,
  gigs: GigsWidget,
  accolades: AccoladesWidget,
  merch: MerchWidget,
  link: LinkWidget,
}

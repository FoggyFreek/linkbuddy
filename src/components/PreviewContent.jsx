// The editor preview's shell switch: picks the same shell a visitor would get
// for this payload, so the Preview tab can't drift from the real page. It lives
// here rather than in features/editor because a feature may not import another
// feature, and it reaches into two — that's the one deliberate exception to the
// import direction; don't copy the pattern elsewhere.
//
// Content only. The public routes (ReleasePage, BandPage) own their own chrome —
// share button, attribution, footer, viewport spacing — which the preview
// deliberately omits, and they render these shells directly.
import LinksCard from '../features/public-links-card/components/LinksCard.jsx'
import SmartLinkPage from '../features/smart-link/components/SmartLinkPage.jsx'

const noopClick = () => {}

export default function PreviewContent({ page, onLinkClick = noopClick }) {
  if (page.release) {
    return <SmartLinkPage page={page} onLinkClick={onLinkClick} />
  }
  return <LinksCard page={page} onLinkClick={onLinkClick} />
}

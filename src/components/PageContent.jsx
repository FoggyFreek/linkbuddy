// The one entry point for visitor-facing rendering — the public page and the
// editor preview both go through here, so preview can't drift from reality.
// `onLinkClick(target)` reports outbound clicks (the public page wires it to the
// click beacon, the preview leaves it unset); `corner`/`flush` mean nothing to a
// smart link, which fills the viewport itself.
import LinksCard from '../features/public-links-card/components/LinksCard.jsx'
import SmartLinkPage from '../features/smart-link/components/SmartLinkPage.jsx'

const noopClick = () => {}

export default function PageContent({ page, onLinkClick = noopClick, footer = null, corner = null, flush = false }) {
  if (page.release) {
    return <SmartLinkPage page={page} onLinkClick={onLinkClick} footer={footer} />
  }
  return <LinksCard page={page} onLinkClick={onLinkClick} footer={footer} corner={corner} flush={flush} />
}

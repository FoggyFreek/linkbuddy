import ReleasePage from './routes/ReleasePage.jsx'
import BandPage from './routes/BandPage.jsx'
import Editor from './routes/Editor.jsx'
import Privacy from './routes/Privacy.jsx'
import CenteredStatus from '../components/CenteredStatus.jsx'
import PageStatus from '../components/PageStatus.jsx'
import { parsePagePath } from '../utils/pathSlug.js'
import { trimEnd } from '../utils/trimChars.js'

// Path-based routing without a router: three fixed routes and the catch-all
// page slug. The segment count picks the page kind — one segment is a band's
// link page (/foo), two are a release smart link (/foo/bar) — and the two are
// separate components down to their chrome. Navigation is full page loads.
export default function App() {
  const path = trimEnd(window.location.pathname, '/') || '/'
  if (path === '/edit') return <Editor />
  if (path === '/privacy') return <Privacy />
  if (path === '/') {
    return <CenteredStatus>This is a GigBuddy band link page server. Open a band&apos;s page via its own address.</CenteredStatus>
  }
  // Malformed percent-encoding (e.g. /%E0%A4%A) yields null → not-found,
  // rather than throwing a URIError during render.
  const page = parsePagePath(path)
  if (page === null) return <PageStatus status="notfound" />
  return page.isRelease ? <ReleasePage slug={page.slug} /> : <BandPage slug={page.slug} />
}

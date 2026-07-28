import PublicPage from './routes/PublicPage.jsx'
import Editor from './routes/Editor.jsx'
import Privacy from './routes/Privacy.jsx'
import CenteredStatus from '../components/CenteredStatus.jsx'
import { slugFromPath } from '../utils/pathSlug.js'
import { trimEnd } from '../utils/trimChars.js'

// Path-based routing without a router: three fixed routes and the catch-all
// band slug. A page path is one segment (main, /foo) or two (release,
// /foo/bar); the slug is the decoded path. Navigation is full page loads.
export default function App() {
  const path = trimEnd(window.location.pathname, '/') || '/'
  if (path === '/edit') return <Editor />
  if (path === '/privacy') return <Privacy />
  if (path === '/') {
    return <CenteredStatus>This is a GigBuddy band link page server. Open a band&apos;s page via its own address.</CenteredStatus>
  }
  // Malformed percent-encoding (e.g. /%E0%A4%A) yields null → not-found,
  // rather than throwing a URIError during render.
  const slug = slugFromPath(path)
  if (slug === null) {
    return <CenteredStatus>This page doesn&apos;t exist (or isn&apos;t published yet).</CenteredStatus>
  }
  return <PublicPage slug={slug} />
}

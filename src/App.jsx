import Typography from '@mui/material/Typography'
import PublicPage from './PublicPage.jsx'
import Editor from './Editor.jsx'
import Privacy from './Privacy.jsx'
import { slugFromPath } from './pathSlug.js'

// Path-based routing without a router: three fixed routes and the catch-all
// band slug. A page path is one segment (main, /foo) or two (release,
// /foo/bar); the slug is the decoded path. Navigation is full page loads.
export default function App() {
  const path = window.location.pathname.replace(/\/+$/, '') || '/'
  if (path === '/edit') return <Editor />
  if (path === '/privacy') return <Privacy />
  if (path === '/') {
    return (
      <Typography className="page-status" variant="body1" component="div">
        This is a GigBuddy band link page server. Open a band&apos;s page via its own address.
      </Typography>
    )
  }
  // Malformed percent-encoding (e.g. /%E0%A4%A) yields null → not-found,
  // rather than throwing a URIError during render.
  const slug = slugFromPath(path)
  if (slug === null) {
    return (
      <Typography className="page-status" variant="body1" component="div">
        This page doesn&apos;t exist (or isn&apos;t published yet).
      </Typography>
    )
  }
  return <PublicPage slug={slug} />
}

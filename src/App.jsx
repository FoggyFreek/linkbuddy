import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import PublicPage from './PublicPage.jsx'
import Editor from './Editor.jsx'
import Privacy from './Privacy.jsx'
import { slugFromPath } from './pathSlug.js'

// Centred, muted status message shown for the server-root and not-found routes.
function PageStatus({ children }) {
  return (
    <Box sx={{ maxWidth: 600, mx: 'auto', my: '20vh', px: 3, textAlign: 'center', color: 'text.secondary' }}>
      <Typography variant="body1" component="div">{children}</Typography>
    </Box>
  )
}

// Path-based routing without a router: three fixed routes and the catch-all
// band slug. A page path is one segment (main, /foo) or two (release,
// /foo/bar); the slug is the decoded path. Navigation is full page loads.
export default function App() {
  const path = window.location.pathname.replace(/\/+$/, '') || '/'
  if (path === '/edit') return <Editor />
  if (path === '/privacy') return <Privacy />
  if (path === '/') {
    return <PageStatus>This is a GigBuddy band link page server. Open a band&apos;s page via its own address.</PageStatus>
  }
  // Malformed percent-encoding (e.g. /%E0%A4%A) yields null → not-found,
  // rather than throwing a URIError during render.
  const slug = slugFromPath(path)
  if (slug === null) {
    return <PageStatus>This page doesn&apos;t exist (or isn&apos;t published yet).</PageStatus>
  }
  return <PublicPage slug={slug} />
}

import Typography from '@mui/material/Typography'
import Link from '@mui/material/Link'
import Alert from '@mui/material/Alert'
import { useEffect, useState } from 'react'
import AppShell from '../../components/AppShell.js'
import { getPublicPage } from '../../lib/api.js'

// Visitor-facing privacy notice. Keep in sync with PRIVACY.md (the operator
// document); this is the plain-language version linked from every page footer.
// Text is rendered through the MUI type scale (h2 title, h3 section headings,
// body1 prose) so it tracks the same typography and colour scheme as the rest
// of the app.
export default function Privacy() {
  const slug = new URLSearchParams(window.location.search).get('smartlink')
  const [advertising, setAdvertising] = useState(false)
  const [loading, setLoading] = useState(Boolean(slug))
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!slug) return
    let cancelled = false
    void getPublicPage(slug).then((page) => {
      if (!cancelled) setAdvertising(Boolean(page.release && page.metaTracking))
    }).catch(() => { if (!cancelled) setFailed(true) }).finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [slug])

  if (loading) return <AppShell maxWidth={640}><Typography role="status">Loading privacy notice…</Typography></AppShell>
  if (failed) return (
    <AppShell maxWidth={640} sx={{ px: '20px', pt: '40px', pb: '60px' }}>
      <Typography variant="h2" component="h1" gutterBottom>Privacy notice</Typography>
      <Alert severity="warning">Unable to load this smart link’s privacy settings. Please reload this page to try again.</Alert>
    </AppShell>
  )
  return (
    <AppShell maxWidth={640} sx={{ px: '20px', pt: '40px', pb: '60px' }}>
      <Typography variant="h2" component="h1" gutterBottom>Privacy notice</Typography>
      <Typography variant="body1" sx={{ mb: 2 }}>
        {advertising ? (
          <>This smart link uses cookieless LinkBuddy statistics and optional Meta advertising. You can
            visit and follow links without accepting marketing cookies. Your privacy choice is remembered
            on this device for this smart link and Pixel for up to 180 days.</>
        ) : (
          <>This is a band&apos;s public link page. You can visit it without an account, and it sets{' '}
            <strong>no cookies</strong> and stores nothing on your device.</>
        )}
      </Typography>

      <Typography variant="h3" component="h2" sx={{ mt: 3.5, mb: 1 }}>What we measure</Typography>
      <Typography variant="body1" sx={{ mb: 2 }}>
        To show the band how their page is doing, each page view is counted with three coarse,
        anonymous facts: the <strong>device class</strong> (phone, tablet or desktop), the{' '}
        <strong>traffic source</strong> (the website that linked here, or a campaign tag — never the
        full address you came from), and the <strong>country</strong> the visit came from. When you
        follow an outgoing button, we also count <strong>which platform button was clicked</strong>{' '}
        (for example &quot;Spotify&quot;) with the same three facts — nothing about you, only that
        the button was used.
      </Typography>

      <Typography variant="h3" component="h2" sx={{ mt: 3.5, mb: 1 }}>{advertising ? 'What LinkBuddy statistics do not collect' : 'What we do not collect'}</Typography>
      <Typography variant="body1" component="ul">
        <li>No IP addresses are stored.</li>
        <li>No full user-agent strings, no fingerprinting, no cross-site tracking.</li>
        <li>{advertising ? 'No advertising identifiers are stored in LinkBuddy statistics.' : 'No cookies, local storage, or any other identifiers on your device.'}</li>
        <li>Nothing that identifies you as a person.</li>
      </Typography>
      <Typography variant="body1" sx={{ mb: 2 }}>
        To estimate unique visitors, a truncated, keyed hash of connection data is kept for a single
        day; it rotates daily, cannot be linked across days, and cannot be traced back to you. Raw
        counts are automatically deleted after at most 90 days (30 days for most pages); only
        aggregate totals remain.
      </Typography>

      {advertising && (
        <>
          <Typography variant="h3" component="h2" sx={{ mt: 3.5, mb: 1 }}>Optional Meta advertising</Typography>
          <Typography variant="body1" sx={{ mb: 2 }}>
            If you accept marketing cookies, this artist&apos;s Meta Pixel sends page visits and selected
            streaming-platform clicks to Meta to measure Facebook and Instagram ads and help personalise
            advertising. A click records a visit to a music service, not a confirmed stream.
          </Typography>
          <Typography variant="body1" sx={{ mb: 2 }}>
            Meta can receive your IP address, browser and device information, the page address (including
            campaign parameters), and cookie identifiers, and may associate them with your Meta account.
            Its Pixel can use cookies such as _fbp and _fbc. This information goes directly to Meta;
            LinkBuddy&apos;s statistics database does not store it. Meta&apos;s processing and retention are
            described in its{' '}<Link href="https://www.facebook.com/privacy/policy/" target="_blank" rel="noopener noreferrer">Privacy Policy</Link>.
          </Typography>
          <Typography variant="body1" sx={{ mb: 2 }}>
            Meta is not loaded before you accept. Rejecting keeps marketing tracking off. We store your
            acceptance or rejection and its date in local storage for up to 180 days, separately for this
            smart link and Pixel. If storage is blocked, your choice lasts for this visit only.
          </Typography>
          <Typography variant="body1" sx={{ mb: 2 }}>
            Use Cookie settings in the smart link&apos;s footer to change or withdraw consent. Withdrawal
            stops further Meta events and removes the first-party Meta cookies accessible to this site.
            It cannot undo information already sent to Meta. The artist operates the advertising Pixel;
            contact them about its use of your data.
          </Typography>
        </>
      )}

      <Typography variant="h3" component="h2" sx={{ mt: 3.5, mb: 1 }}>External links and embedded players</Typography>
      <Typography variant="body1" sx={{ mb: 2 }}>
        Cards on this page link to external platforms (music services, shops, social networks). Once
        you follow a link, that platform&apos;s own privacy policy applies.
      </Typography>
      <Typography variant="body1" sx={{ mb: 2 }}>
        Some cards can play music or video right here. Those players are <strong>click-to-play</strong>:
        nothing from the platform loads until you press play. When you do, the player is provided by
        that platform (for example Spotify or YouTube), its privacy policy applies, and it may set its
        own cookies. Images on this page may be served from the linked platforms.
      </Typography>

      <Typography variant="h3" component="h2" sx={{ mt: 3.5, mb: 1 }}>Contact</Typography>
      <Typography variant="body1" sx={{ mb: 2 }}>
        For questions about this page&apos;s data, contact the band that operates it; for questions
        about the platform, contact the site operator.
      </Typography>
    </AppShell>
  )
}

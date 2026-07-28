import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'

// Visitor-facing privacy notice. Keep in sync with PRIVACY.md (the operator
// document); this is the plain-language version linked from every page footer.
// Text is rendered through the MUI type scale (h2 title, h3 section headings,
// body1 prose) so it tracks the same typography and colour scheme as the rest
// of the app.
export default function Privacy() {
  return (
    <Box sx={{ maxWidth: 640, mx: 'auto', px: '20px', pt: '40px', pb: '60px' }}>
      <Typography variant="h2" component="h1" gutterBottom>Privacy notice</Typography>
      <Typography variant="body1" sx={{ mb: 2 }}>
        This is a band&apos;s public link page. You can visit it without an account, and it sets{' '}
        <strong>no cookies</strong> and stores nothing on your device.
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

      <Typography variant="h3" component="h2" sx={{ mt: 3.5, mb: 1 }}>What we do not collect</Typography>
      <Typography variant="body1" component="ul">
        <li>No IP addresses are stored.</li>
        <li>No full user-agent strings, no fingerprinting, no cross-site tracking.</li>
        <li>No cookies, local storage, or any other identifiers on your device.</li>
        <li>Nothing that identifies you as a person.</li>
      </Typography>
      <Typography variant="body1" sx={{ mb: 2 }}>
        To estimate unique visitors, a truncated, keyed hash of connection data is kept for a single
        day; it rotates daily, cannot be linked across days, and cannot be traced back to you. Raw
        counts are automatically deleted after at most 90 days (30 days for most pages); only
        aggregate totals remain.
      </Typography>

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
    </Box>
  )
}

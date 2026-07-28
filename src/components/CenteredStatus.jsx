import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'

// Centred, muted status/error/loading message. Shared by the router's
// server-root and not-found routes (App) and the editor's fatal/loading states
// (Editor). `busy` sets aria-busy for loading states; `role` lets callers mark
// it an alert; `variant`/`component` pick the Typography wrapper — pass
// `variant={null}` to render the children raw, without one.
export default function CenteredStatus({
  children,
  busy = false,
  role,
  variant = 'body1',
  component = 'div',
}) {
  return (
    <Box
      role={role}
      aria-busy={busy || undefined}
      sx={{ maxWidth: 600, mx: 'auto', my: '20vh', px: 3, textAlign: 'center', color: 'text.secondary' }}
    >
      {variant ? <Typography variant={variant} component={component}>{children}</Typography> : children}
    </Box>
  )
}

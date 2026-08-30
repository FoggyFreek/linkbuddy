import Paper from '@mui/material/Paper'
import type { PaperProps } from '@mui/material/Paper'

// The application chrome's container: one vertical paper column, centred on the
// darker `surface.canvas` backdrop the theme paints on `body`. It runs the full
// viewport height so the column reads as a continuous strip rather than a card,
// and it sits a step below the `background.paper` cards inside it — canvas →
// column → card — which holds in both colour schemes because all three are
// palette tokens.
export default function AppShell({ maxWidth = 760, sx, children, ...props }: Readonly<PaperProps & { maxWidth?: number }>) {
  return (
    <Paper
      elevation={0}
      square
      sx={[
        {
          width: '100%', maxWidth, mx: 'auto', minHeight: '100dvh',
          bgcolor: 'background.default',
          backgroundImage: 'none',
          borderInline: '1px solid',
          borderColor: 'divider',
        },
        ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
      ]}
      {...props}
    >
      {children}
    </Paper>
  )
}

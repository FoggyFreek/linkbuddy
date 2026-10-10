import Card from '@mui/material/Card'
import Typography from '@mui/material/Typography'
import type { ReactNode } from 'react'

// One titled settings card: the shared chrome of the editor's settings tabs.
export default function PanelSection({ title, hint, children }: Readonly<{ title: string; hint?: ReactNode; children: ReactNode }>) {
  return (
    <Card variant="panel">
      <Typography variant="h6" component="h2">{title}</Typography>
      {hint && <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>{hint}</Typography>}
      {children}
    </Card>
  )
}

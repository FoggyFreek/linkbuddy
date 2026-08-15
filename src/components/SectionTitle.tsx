import Typography from '@mui/material/Typography'
import type { ReactNode } from 'react'

// Centred section heading: h3 scale, <h2> element, to keep the outline under
// the band/release <h1>.
export default function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <Typography variant="h3" component="h2" sx={{ textAlign: 'center', mt: 1 }}>
      {children}
    </Typography>
  )
}

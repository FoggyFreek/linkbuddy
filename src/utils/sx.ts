import type { SxProps, Theme } from '@mui/material/styles'

// An `sx` prop as a list, so a component can spread it after its own styles.
export function toSxArray(sx: SxProps<Theme> | undefined) {
  if (Array.isArray(sx)) return sx
  return sx ? [sx] : []
}

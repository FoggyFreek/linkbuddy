import '@mui/material/styles'
import '@mui/material/Button'
import '@mui/material/Paper'
import '@mui/material/styles/createThemeFoundation'
import '@mui/system/createTheme/shape'

interface SurfacePalette {
  s2: string
  s3: string
  border: string
  field: string
  canvas: string
}

interface ChartPalette {
  c1: string
  c2: string
  c3: string
  c4: string
  c5: string
  c6: string
  c7: string
  c8: string
}

declare module '@mui/material/styles' {
  interface Shape {
    pill: number
    preview: number
    item: number
  }
  interface ShapeOptions {
    pill?: number
    preview?: number
    item?: number
  }
  interface Palette {
    surface: SurfacePalette
    chart: ChartPalette
  }
  interface PaletteOptions {
    surface?: SurfacePalette
    chart?: ChartPalette
  }
}

declare module '@mui/system/createTheme/shape' {
  interface Shape {
    pill: number
    preview: number
    item: number
  }
}

declare module '@mui/material/styles/createThemeFoundation' {
  interface Shape {
    pill: number
    preview: number
    item: number
  }
  interface ShapeOptions {
    pill?: number
    preview?: number
    item?: number
  }
}

declare module '@mui/material/Button' {
  interface ButtonPropsVariantOverrides { pill: true }
}

declare module '@mui/material/Paper' {
  interface PaperPropsVariantOverrides { panel: true }
}

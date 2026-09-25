import Box from '@mui/material/Box'
import Chip from '@mui/material/Chip'
import SwapVertIcon from '@mui/icons-material/SwapVert'
import type { Theme } from '@mui/material/styles'
import type { ItemDropState } from '../hooks/useDragReorder.js'

// Drop feedback for the Build tab's drag-to-reorder: an insertion line centred
// in the gap (`gap` in theme spacing units) and a badge on a row it would swap with.

export function DropLine({ edge, gap }: Readonly<{ edge: 'top' | 'bottom'; gap: number }>) {
  return (
    <Box
      aria-hidden
      data-drop-indicator="insert"
      sx={(theme) => ({
        position: 'absolute',
        left: 0,
        right: 0,
        [edge]: `calc(${theme.spacing(gap)} / -2 - 1.5px)`,
        height: 3,
        borderRadius: 3,
        bgcolor: 'primary.main',
        pointerEvents: 'none',
        zIndex: 3,
        '&::before': {
          content: '""',
          position: 'absolute',
          left: -4,
          top: -3,
          width: 9,
          height: 9,
          borderRadius: '50%',
          bgcolor: 'primary.main',
        },
      })}
    />
  )
}

export function SwapBadge() {
  return (
    <Chip
      data-drop-indicator="swap"
      size="small"
      color="primary"
      icon={<SwapVertIcon />}
      label="Swap"
      sx={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', zIndex: 3 }}
    />
  )
}

export function DropMarkers({ state, gap }: Readonly<{ state: ItemDropState; gap: number }>) {
  return (
    <>
      {state.before && <DropLine edge="top" gap={gap} />}
      {state.after && <DropLine edge="bottom" gap={gap} />}
      {state.swap && <SwapBadge />}
    </>
  )
}

// Row styling while a drag is in progress: the lifted item, a highlighted swap
// target, and a dashed outline on every other drop candidate.
export function dropItemSx(theme: Theme, state: ItemDropState) {
  if (state.dragging) {
    return { zIndex: 2, opacity: 0.8, boxShadow: theme.shadows[8], bgcolor: 'background.paper', pointerEvents: 'none' as const }
  }
  if (state.swap) {
    return {
      outline: `2px solid ${theme.vars!.palette.primary.main}`,
      outlineOffset: -1,
      bgcolor: `rgba(${theme.vars!.palette.primary.mainChannel} / 0.08)`,
    }
  }
  return state.active ? { outline: `1px dashed ${theme.vars!.palette.text.disabled}`, outlineOffset: -1 } : {}
}

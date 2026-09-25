import Box from '@mui/material/Box'
import DragIndicatorIcon from '@mui/icons-material/DragIndicator'
import type { HTMLAttributes, RefCallback } from 'react'

// The grab thumb for a reorderable row; spread useDragReorder's handleProps on it.
export default function DragHandle(props: Readonly<HTMLAttributes<HTMLElement> & { ref: RefCallback<HTMLElement> }>) {
  return (
    <Box
      {...props}
      sx={{
        display: 'flex',
        alignItems: 'center',
        alignSelf: 'stretch',
        px: 0.25,
        color: 'text.secondary',
        cursor: 'grab',
        borderRadius: 1,
        touchAction: 'none',
        userSelect: 'none',
        '&:active': { cursor: 'grabbing' },
        '&:hover': { color: 'text.primary' },
        '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.main', outlineOffset: 2 },
      }}
    >
      <DragIndicatorIcon fontSize="small" />
    </Box>
  )
}

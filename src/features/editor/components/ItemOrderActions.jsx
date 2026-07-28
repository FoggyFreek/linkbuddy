import IconButton from '@mui/material/IconButton'
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp'
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import CloseIcon from '@mui/icons-material/Close'

// The move-up / move-down / delete control trio shared by section and widget
// rows. Widgets can override the local index boundaries because they continue
// into adjacent sections. Renders as sibling buttons so it drops straight into
// the row's existing Stack and inherits its spacing.
export default function ItemOrderActions({
  index,
  count,
  itemLabel,
  onMove,
  onDelete,
  canMoveUp = index > 0,
  canMoveDown = index < count - 1,
}) {
  return (
    <>
      <IconButton size="small" onClick={() => onMove(-1)} disabled={!canMoveUp} aria-label={`Move ${itemLabel} up`}><KeyboardArrowUpIcon fontSize="small" /></IconButton>
      <IconButton size="small" onClick={() => onMove(1)} disabled={!canMoveDown} aria-label={`Move ${itemLabel} down`}><KeyboardArrowDownIcon fontSize="small" /></IconButton>
      <IconButton size="small" onClick={onDelete} aria-label={`Delete ${itemLabel}`}><CloseIcon fontSize="small" /></IconButton>
    </>
  )
}

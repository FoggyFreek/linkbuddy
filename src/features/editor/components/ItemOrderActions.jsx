import IconButton from '@mui/material/IconButton'
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp'
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import CloseIcon from '@mui/icons-material/Close'

// The move-up / move-down / delete control trio shared by section rows and
// widget rows. Boundary-disabling is derived from `index`/`count`, and every
// aria-label is generated from `itemLabel` here, so the two call sites can't
// drift apart on accessibility. Renders as sibling buttons (a Fragment) so it
// drops straight into the row's existing Stack and inherits its spacing.
export default function ItemOrderActions({ index, count, itemLabel, onMove, onDelete }) {
  return (
    <>
      <IconButton size="small" onClick={() => onMove(-1)} disabled={index === 0} aria-label={`Move ${itemLabel} up`}><KeyboardArrowUpIcon fontSize="small" /></IconButton>
      <IconButton size="small" onClick={() => onMove(1)} disabled={index === count - 1} aria-label={`Move ${itemLabel} down`}><KeyboardArrowDownIcon fontSize="small" /></IconButton>
      <IconButton size="small" onClick={onDelete} aria-label={`Delete ${itemLabel}`}><CloseIcon fontSize="small" /></IconButton>
    </>
  )
}

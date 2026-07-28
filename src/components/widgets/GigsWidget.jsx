import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Accordion from '@mui/material/Accordion'
import AccordionSummary from '@mui/material/AccordionSummary'
import AccordionDetails from '@mui/material/AccordionDetails'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import IconButton from '@mui/material/IconButton'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import { CalendarIcon } from '../icons.jsx'
import { formatGigDate } from '../../utils/format.js'

export default function GigsWidget({ widget, onLinkClick }) {
  return (
    <Accordion
      // Open on arrival — the list is the point; visitors can still collapse it.
      defaultExpanded
      disableGutters
      elevation={0}
      sx={(theme) => ({
        borderRadius: `${theme.shape.borderRadius}px`,
        overflow: 'hidden',
        boxShadow: '0 1px 3px rgb(20 22 26 / 0.08)',
        '&::before': { display: 'none' },
        ...theme.applyStyles('dark', {
          border: `1px solid ${theme.vars.palette.surface.border}`,
          boxShadow: '0 1px 3px rgb(0 0 0 / 0.35)',
        }),
      })}
    >
      <AccordionSummary
        expandIcon={<ExpandMoreIcon sx={{ color: 'text.secondary' }} />}
        sx={{ px: '16px', '& .MuiAccordionSummary-content': { alignItems: 'center', gap: '12px', my: '18px' } }}
      >
        <Box component="span" sx={{ display: 'inline-flex', color: 'text.primary', flexShrink: 0 }}><CalendarIcon size={26} /></Box>
        <Typography variant="body1" component="span" sx={{ flex: 1 }}>
          {widget.title}
          {/* "(3 gigs)" so a collapsed widget still says whether there's
              anything to see. The empty case has its own message inside. */}
          {widget.gigs.length > 0 && (
            <Box component="span" sx={{ color: 'text.secondary' }}>
              {` (${widget.gigs.length} ${widget.gigs.length === 1 ? 'gig' : 'gigs'})`}
            </Box>
          )}
        </Typography>
      </AccordionSummary>
      <AccordionDetails sx={{ pt: 0, px: '16px', pb: '12px' }}>
        {widget.gigs.length === 0 ? (
          <Typography color="text.secondary" sx={{ textAlign: 'center' }}>No upcoming gigs announced — check back soon.</Typography>
        ) : (
          <Box component="ul" sx={{ listStyle: 'none', m: 0, p: 0 }}>
            {widget.gigs.map((gig) => {
              const { month, day } = formatGigDate(gig.date)
              return (
                <Box
                  component="li"
                  key={gig.id}
                  // Two rows: the title sits on the month's baseline, the venue on
                  // the day number's. Every cell is placed explicitly — the optional
                  // third column must never pull a date cell out of its row.
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: gig.eventUrl ? '44px minmax(0, 1fr) auto' : '44px minmax(0, 1fr)',
                    columnGap: '14px', alignItems: 'baseline', py: '10px',
                    borderTop: '1px solid', borderColor: 'surface.s2',
                  }}
                >
                  <Typography variant="caption" sx={{ gridColumn: 1, gridRow: 1, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'text.secondary', textAlign: 'center' }}>{month}</Typography>
                  <Typography sx={{ gridColumn: 2, gridRow: 1, fontWeight: 700 }}>{gig.title}</Typography>
                  <Typography sx={{ gridColumn: 1, gridRow: 2, fontSize: '24px', fontWeight: 700, lineHeight: 1.1, textAlign: 'center' }}>{day}</Typography>
                  {(gig.venue || gig.city) && (
                    <Typography variant="body2" color="text.secondary" sx={{ gridColumn: 2, gridRow: 2 }}>{[gig.venue, gig.city].filter(Boolean).join(', ')}</Typography>
                  )}
                  {gig.eventUrl && (
                    <IconButton
                      component="a"
                      href={gig.eventUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => onLinkClick(`gig:${gig.title}`)}
                      aria-label={`Event page for ${gig.title} (opens in a new tab)`}
                      size="small"
                      sx={{ gridColumn: 3, gridRow: '1 / span 2', alignSelf: 'center', color: 'text.secondary' }}
                    >
                      <OpenInNewIcon fontSize="small" />
                    </IconButton>
                  )}
                </Box>
              )
            })}
          </Box>
        )}
      </AccordionDetails>
    </Accordion>
  )
}

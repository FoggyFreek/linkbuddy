import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Accordion from '@mui/material/Accordion'
import AccordionSummary from '@mui/material/AccordionSummary'
import AccordionDetails from '@mui/material/AccordionDetails'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import { CalendarIcon } from '../icons.jsx'
import { formatGigDate } from '../../utils/format.js'

export default function GigsWidget({ widget }) {
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
                <Box component="li" key={gig.id} sx={{ display: 'flex', alignItems: 'baseline', gap: '14px', py: '10px', borderTop: '1px solid', borderColor: 'surface.s2' }}>
                  <Box sx={{ flex: '0 0 44px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                    <Typography variant="caption" sx={{ fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'text.secondary' }}>{month}</Typography>
                    <Typography sx={{ fontSize: '24px', fontWeight: 700, lineHeight: 1.1 }}>{day}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                    <Typography sx={{ fontWeight: 700 }}>{gig.title}</Typography>
                    {(gig.venue || gig.city) && (
                      <Typography variant="body2" color="text.secondary">{[gig.venue, gig.city].filter(Boolean).join(', ')}</Typography>
                    )}
                  </Box>
                </Box>
              )
            })}
          </Box>
        )}
      </AccordionDetails>
    </Accordion>
  )
}

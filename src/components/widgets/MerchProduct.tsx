import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import CardActionArea from '@mui/material/CardActionArea'
import { formatEur } from '../../utils/format.js'
import type { LinkClickHandler, ResolvedMerchProduct } from '../../types.js'

// One tile in the merch carousel, clickable only when a shop URL is known.
export default function MerchProduct({ product, shopUrl, onLinkClick }: { product: ResolvedMerchProduct; shopUrl?: string | null; onLinkClick: LinkClickHandler }) {
  const itemSx = {
    flex: '0 0 150px', display: 'flex', flexDirection: 'column',
    alignItems: 'stretch', justifyContent: 'flex-start',
    border: '1px solid', borderColor: 'surface.border', borderRadius: '10px',
    overflow: 'hidden', bgcolor: 'background.paper', textAlign: 'left',
  }
  const body = (
    <>
      <Box sx={{ position: 'relative', height: 140, bgcolor: 'surface.s2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c3c6cc', fontSize: 40 }}>
        {product.imageUrl ? (
          <Box component="img" src={product.imageUrl} alt="" sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <span aria-hidden="true">♪</span>
        )}
        {product.badge && (
          <Box component="span" sx={{ position: 'absolute', top: 10, right: -26, transform: 'rotate(45deg)', bgcolor: 'success.main', color: '#fff', fontSize: 12, fontWeight: 700, px: '28px', py: '3px' }}>
            {product.badge}
          </Box>
        )}
      </Box>
      <Typography variant="body2" sx={{ fontWeight: 500, px: '10px', pt: '8px' }}>{product.name}</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ px: '10px', pb: '10px' }}>{formatEur(product.priceCents)}</Typography>
    </>
  )
  return shopUrl ? (
    <CardActionArea
      component="a"
      href={shopUrl}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => onLinkClick('shop')}
      sx={itemSx}
    >{body}</CardActionArea>
  ) : (
    <Box sx={itemSx}>{body}</Box>
  )
}

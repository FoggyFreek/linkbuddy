import Stack from '@mui/material/Stack'
import Card from '@mui/material/Card'
import Typography from '@mui/material/Typography'
import MerchProduct from './MerchProduct.js'
import type { LinkClickHandler, ResolvedMerchWidget } from '../../types.js'

export default function MerchWidget({ widget, onLinkClick }: { widget: ResolvedMerchWidget; onLinkClick: LinkClickHandler }) {
  return (
    <Card sx={{ p: '16px 0 14px' }}>
      {widget.title && <Typography variant="h4" component="h3" sx={{ textAlign: 'center', mx: '16px', mb: '12px' }}>{widget.title}</Typography>}
      <Stack direction="row" spacing={1.5} sx={{ overflowX: 'auto', px: '16px', pt: '2px', pb: '6px', scrollbarWidth: 'thin' }}>
        {widget.products.map((product) => (
          <MerchProduct key={product.id} product={product} shopUrl={widget.shopUrl} onLinkClick={onLinkClick} />
        ))}
      </Stack>
    </Card>
  )
}

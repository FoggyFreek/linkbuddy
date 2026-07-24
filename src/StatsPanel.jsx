import { useEffect, useState } from 'react'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Link from '@mui/material/Link'
import LinearProgress from '@mui/material/LinearProgress'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import { getStats } from './api.js'
import CenteredStatus from './CenteredStatus.jsx'
import { PLATFORM_LABELS } from '../shared/platforms.js'

// Statistics live in a rolling window (30 days, 90 on gold) — ranges beyond
// the page's window are disabled.
const RANGES = [7, 30, 90]

// Platform display names come from the shared registry; 'other' is the local
// label for links that didn't match a known platform.
const PLATFORM_NAMES = { ...PLATFORM_LABELS, other: 'Other' }

const SHARE_NAMES = {
  native: 'device menu',
  copy: 'copy link',
  x: 'X',
  whatsapp: 'WhatsApp',
  facebook: 'Facebook',
  telegram: 'Telegram',
  email: 'Email',
}

// Click targets are stored as compact machine keys ('platform:spotify',
// 'share:whatsapp', 'link:our website'); render them as readable labels.
function formatTarget(key) {
  const colon = key.indexOf(':')
  const kind = colon === -1 ? key : key.slice(0, colon)
  const value = colon === -1 ? '' : key.slice(colon + 1)
  switch (kind) {
    case 'platform':
      return PLATFORM_NAMES[value] || value
    case 'share':
      return `Share · ${SHARE_NAMES[value] || value}`
    case 'social':
      return `Social · ${value.charAt(0).toUpperCase()}${value.slice(1)}`
    case 'link':
      return `Link · ${value}`
    case 'song':
      return `Song · ${value}`
    case 'embed':
      return `Preview · ${PLATFORM_NAMES[value] || value}`
    case 'shop':
      return 'Merch shop'
    default:
      return key
  }
}

function StatsBlock({ title, children }) {
  return (
    <Card variant="panel">
      <Typography variant="h6" sx={{ mb: '10px' }}>{title}</Typography>
      {children}
    </Card>
  )
}

function BarList({ title, rows, total, valueKey = 'views', formatKey = (key) => key }) {
  return (
    <StatsBlock title={title}>
      {rows.length === 0 ? (
        <Typography variant="body2" color="text.secondary">No data yet</Typography>
      ) : (
        <Stack spacing={0.75}>
          {rows.map((row) => (
            <Box key={row.key} sx={{ display: 'grid', gridTemplateColumns: '118px 1fr 34px', alignItems: 'center', gap: 1 }}>
              <Typography variant="caption" noWrap title={formatKey(row.key)}>{formatKey(row.key)}</Typography>
              <LinearProgress
                variant="determinate"
                value={total ? Math.min(Math.max((row[valueKey] / total) * 100, 2), 100) : 0}
                sx={(theme) => ({ height: 8, borderRadius: theme.shape.pill, bgcolor: 'surface.s2', '& .MuiLinearProgress-bar': { bgcolor: 'text.primary', borderRadius: theme.shape.pill } })}
              />
              <Typography variant="caption" color="text.secondary" align="right">{row[valueKey]}</Typography>
            </Box>
          ))}
        </Stack>
      )}
    </StatsBlock>
  )
}

// Aggregate-only statistics: views + outbound clicks (conversion) by device
// class, source, country, and click target (platform).
export default function StatsPanel({ session, pageId }) {
  const [days, setDays] = useState(30)
  const [stats, setStats] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    setStats(null)
    getStats(session, pageId, days)
      .then((data) => {
        if (!cancelled) setStats(data)
      })
      .catch((err) => {
        if (!cancelled) setError(err.message)
      })
    return () => {
      cancelled = true
    }
  }, [session, pageId, days])

  if (error) return <CenteredStatus>{error}</CenteredStatus>
  if (!stats) return <CenteredStatus busy />

  const maxDay = Math.max(...stats.byDay.map((d) => d.views), 1)
  const hasConversion = stats.conversionBySource.some((r) => r.clicks > 0)

  const tiles = [
    { value: stats.totalViews, label: 'Views' },
    { value: stats.uniqueVisits, label: 'Est. unique visits' },
    { value: stats.totalClicks, label: 'Link clicks' },
    { value: stats.clickThroughRate == null ? '—' : `${stats.clickThroughRate}%`, label: 'Click-through rate' },
  ]

  return (
    <Stack spacing={2.5}>
      <ToggleButtonGroup
        value={days}
        exclusive
        size="small"
        onChange={(e, value) => value && setDays(value)}
        sx={{ alignSelf: 'flex-start', flexWrap: 'wrap' }}
      >
        {RANGES.map((range) => (
          <ToggleButton
            key={range}
            value={range}
            disabled={range > stats.retentionDays}
            sx={(theme) => ({ borderRadius: theme.shape.pill, textTransform: 'none' })}
            title={range > stats.retentionDays ? 'Available on the gold plan' : undefined}
          >
            {range} days
          </ToggleButton>
        ))}
      </ToggleButtonGroup>

      {!stats.enabled && <Typography variant="body2" color="text.secondary">Statistics collection is disabled on this server.</Typography>}

      <Stack direction="row" spacing={1.5} sx={{ flexWrap: 'wrap' }}>
        {tiles.map((tile) => (
          <Card key={tile.label} sx={{ p: '16px 22px', display: 'flex', flexDirection: 'column' }}>
            <Typography sx={{ fontSize: 28, fontWeight: 700, lineHeight: 1.2 }}>{tile.value}</Typography>
            <Typography variant="caption" color="text.secondary">{tile.label}</Typography>
          </Card>
        ))}
      </Stack>

      {stats.byDay.length > 0 && (
        <StatsBlock title="Views per day">
          <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: '2px', height: 90 }}>
            {stats.byDay.map((d) => (
              <Box
                key={d.day}
                title={`${d.day}: ${d.views}`}
                sx={{ flex: 1, minHeight: 2, height: `${(d.views / maxDay) * 100}%`, bgcolor: 'text.primary', borderRadius: '2px 2px 0 0' }}
              />
            ))}
          </Box>
        </StatsBlock>
      )}

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 1.5 }}>
        <BarList title="Clicks by platform / target" rows={stats.byTarget} total={stats.totalClicks} valueKey="clicks" formatKey={formatTarget} />
        <BarList title="Devices" rows={stats.byDevice} total={stats.totalViews} />
        <BarList title="Countries" rows={stats.byCountry} total={stats.totalViews} />
      </Box>

      <StatsBlock title="Conversion by source">
        {!hasConversion && stats.totalViews === 0 ? (
          <Typography variant="body2" color="text.secondary">No data yet</Typography>
        ) : (
          <Table size="small" sx={{ '& td, & th': { px: 1, py: 0.75 }, '& td:not(:first-of-type), & th:not(:first-of-type)': { textAlign: 'right' } }}>
            <TableHead>
              <TableRow>
                <TableCell>Source</TableCell>
                <TableCell>Views</TableCell>
                <TableCell>Clicks</TableCell>
                <TableCell>CTR</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {stats.conversionBySource.map((row) => (
                <TableRow key={row.key} sx={{ '&:nth-of-type(odd)': { bgcolor: 'surface.s2' } }}>
                  <TableCell>{row.key}</TableCell>
                  <TableCell>{row.views}</TableCell>
                  <TableCell>{row.clicks}</TableCell>
                  <TableCell>{row.ctr == null ? '—' : `${row.ctr}%`}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </StatsBlock>

      <Typography variant="caption" color="text.secondary">
        Anonymous and cookieless: device class, source, country and clicked platform only — no IPs,
        no personal data (see <Link href="/privacy" sx={{ color: 'inherit', textDecoration: 'underline' }}>privacy notice</Link>).
      </Typography>
    </Stack>
  )
}

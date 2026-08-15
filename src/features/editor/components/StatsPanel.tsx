import { useEffect, useState, type ReactNode } from 'react'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import Link from '@mui/material/Link'
import LinearProgress from '@mui/material/LinearProgress'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import { BarChart, type BarSeries } from '@mui/x-charts/BarChart'
import { PieChart } from '@mui/x-charts/PieChart'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import { getStats } from '../../../lib/api.js'
import CenteredStatus from '../../../components/CenteredStatus.js'
import { PLATFORM_LABELS } from '../../../../shared/platforms.js'
import type { DailyStatsRow, Stats, StatsRow, TargetStatsRow } from '../../../types.js'
import { errorMessage } from '../../../types.js'

// Statistics live in a rolling window (30 days, 90 on gold) — ranges beyond
// the page's window are disabled.
const RANGES = [7, 30, 90]

// Platform display names come from the shared registry; 'other' is the local
// label for links that didn't match a known platform.
const PLATFORM_NAMES: Record<string, string> = { ...PLATFORM_LABELS, other: 'Other' }

const SHARE_NAMES: Record<string, string> = {
  native: 'device menu',
  copy: 'copy link',
  x: 'X',
  whatsapp: 'WhatsApp',
  facebook: 'Facebook',
  telegram: 'Telegram',
  email: 'Email',
}

// The theme's validated categorical slots. Colours are assigned by *identity*
// (a category always keeps its slot) rather than by rank, so a range change
// can't repaint the survivors of a chart.
const SLOT = (n: number) => `var(--mui-palette-chart-c${n})`
// Ink, not a series colour: the views baseline and the folded 'Other' bucket
// are deliberately colourless so they never read as one more category.
const NEUTRAL = 'var(--mui-palette-text-secondary)'

// Click targets are stored as 'kind:value'; the kind drives the daily stack.
// Order here is the stacking order (and the slot assignment).
const CLICK_KINDS = [
  { kind: 'platform', label: 'Streaming', color: SLOT(1) },
  { kind: 'song', label: 'Songs', color: SLOT(2) },
  { kind: 'link', label: 'Links', color: SLOT(3) },
  { kind: 'embed', label: 'Previews', color: SLOT(4) },
  { kind: 'share', label: 'Shares', color: SLOT(5) },
  { kind: 'social', label: 'Socials', color: SLOT(6) },
  { kind: 'shop', label: 'Merch shop', color: SLOT(7) },
  { kind: 'other', label: 'Other', color: SLOT(8) },
]
const KNOWN_KINDS = new Set(CLICK_KINDS.map((k) => k.kind))

const DEVICE_SLOTS: Record<string, string> = { mobile: SLOT(1), desktop: SLOT(2), tablet: SLOT(3), bot: SLOT(7) }
const DEVICE_LABELS: Record<string, string> = { mobile: 'Mobile', desktop: 'Desktop', tablet: 'Tablet', bot: 'Bots', unknown: 'Unknown' }

// Day buckets arrive as 'YYYY-MM-DD'; parse as local time so the label doesn't
// slip a day for visitors behind UTC.
const DAY_FORMAT = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short' })
const REGION_NAMES = new Intl.DisplayNames(undefined, { type: 'region' })

function formatDay(day: string): string {
  const parsed = new Date(`${day}T00:00:00`)
  return Number.isNaN(parsed.getTime()) ? day : DAY_FORMAT.format(parsed)
}

// 'NL' → 'Netherlands'; anything that isn't a region code (notably 'unknown',
// what a visit without a CDN geo header records) is shown as-is.
function formatCountry(code: string): string {
  if (!/^[A-Z]{2}$/.test(code)) return code === 'unknown' ? 'Unknown' : code
  try {
    return REGION_NAMES.of(code) || code
  } catch {
    return code
  }
}

// Click targets are stored as compact machine keys ('platform:spotify',
// 'share:whatsapp', 'link:our website'); render them as readable labels.
function formatTarget(key: string): string {
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

function StatsBlock({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card variant="panel">
      <Typography variant="h6" sx={{ mb: '10px' }}>{title}</Typography>
      {children}
    </Card>
  )
}

type CountRow = StatsRow | TargetStatsRow

function rowCount(row: CountRow, valueKey: 'views' | 'clicks'): number {
  return valueKey === 'views' && 'views' in row ? row.views : valueKey === 'clicks' && 'clicks' in row ? row.clicks : 0
}

function BarList({ title, rows, total, valueKey = 'views', formatKey = (key) => key }: {
  title: string
  rows: CountRow[]
  total: number
  valueKey?: 'views' | 'clicks'
  formatKey?: (key: string) => string
}) {
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
                value={total ? Math.min(Math.max((rowCount(row, valueKey) / total) * 100, 2), 100) : 0}
                sx={(theme) => ({ height: 8, borderRadius: theme.shape.pill, bgcolor: 'surface.s2', '& .MuiLinearProgress-bar': { bgcolor: 'text.primary', borderRadius: theme.shape.pill } })}
              />
              <Typography variant="caption" color="text.secondary" align="right">{rowCount(row, valueKey)}</Typography>
            </Box>
          ))}
        </Stack>
      )}
    </StatsBlock>
  )
}

// Keep a pie readable (and its colours inside the slots that clear the
// colour-blind gates): the long tail folds into one neutral 'Other' slice.
const PIE_SLICES = 5

interface PieRow extends StatsRow { label?: string; color: string }

function foldTail(rows: StatsRow[], colorFor: (key: string, index: number) => string): PieRow[] {
  const head = rows.slice(0, PIE_SLICES).map((row, i) => ({ ...row, color: colorFor(row.key, i) }))
  const tail = rows.slice(PIE_SLICES)
  if (tail.length === 0) return head
  return [...head, { key: 'other', label: `Other (${tail.length})`, views: tail.reduce((sum, r) => sum + r.views, 0), color: NEUTRAL }]
}

// Share of a dimension as a donut, with the exact counts kept in the table
// underneath — that table doubles as the pie's legend (swatch + name) and as
// the readable fallback for slices too thin to carry a label.
function SharePie({ title, rows, formatKey, colorFor }: {
  title: string
  rows: StatsRow[]
  formatKey: (key: string) => string
  colorFor: (key: string, index: number) => string
}) {
  const slices = foldTail(rows, colorFor)
  const total = slices.reduce((sum, row) => sum + row.views, 0)
  const share = (value: number) => (total ? Math.round((value / total) * 1000) / 10 : 0)

  return (
    <StatsBlock title={title}>
      {slices.length === 0 ? (
        <Typography variant="body2" color="text.secondary">No data yet</Typography>
      ) : (
        <>
          <PieChart
            height={190}
            hideLegend
            margin={{ top: 4, right: 48, bottom: 4, left: 48 }}
            series={[{
              data: slices.map((row) => ({
                id: row.key,
                value: row.views,
                label: row.label ?? formatKey(row.key),
                color: row.color,
              })),
              innerRadius: 38,
              outerRadius: 72,
              paddingAngle: 1.5,
              cornerRadius: 3,
              arcLabelRadius: 88,
              // Percentages on the arcs; slivers under 5% (18° of the circle)
              // stay unlabelled and are read off the table instead.
              arcLabel: (item) => `${Math.round(share(item.value))}%`,
              arcLabelMinAngle: 18,
              valueFormatter: (item) => `${item.value} (${share(item.value)}%)`,
              highlightScope: { fade: 'global', highlight: 'item' },
            }]}
            sx={{ '& .MuiPieChart-arcLabel': { fill: 'var(--mui-palette-text-secondary)', fontSize: 11 } }}
          />
          <Table size="small" sx={{ mt: 0.5, '& td': { px: 0.5, py: 0.5, border: 0 }, '& td:not(:first-of-type)': { textAlign: 'right', width: 56, fontVariantNumeric: 'tabular-nums' } }}>
            <TableBody>
              {slices.map((row) => (
                <TableRow key={row.key}>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, minWidth: 0 }}>
                      <Box sx={{ width: 10, height: 10, borderRadius: '2px', flex: '0 0 auto', bgcolor: row.color }} />
                      <Typography variant="caption" noWrap title={row.label ?? formatKey(row.key)}>{row.label ?? formatKey(row.key)}</Typography>
                    </Box>
                  </TableCell>
                  <TableCell><Typography variant="caption">{row.views}</Typography></TableCell>
                  <TableCell><Typography variant="caption" color="text.secondary">{share(row.views)}%</Typography></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </>
      )}
    </StatsBlock>
  )
}

// One row per day for the chart: views plus a column per click kind, since the
// dataset a stacked BarChart reads has to be flat.
interface DailyChartRow { day: string; views: number; [key: string]: string | number }

function dailyDataset(byDay: DailyStatsRow[]): DailyChartRow[] {
  return byDay.map((d) => {
    const row: DailyChartRow = { day: d.day, views: d.views }
    for (const [kind, clicks] of Object.entries(d.clicks || {})) {
      const key = KNOWN_KINDS.has(kind) ? kind : 'other'
      row[key] = Number(row[key] || 0) + clicks
    }
    return row
  })
}

// Aggregate-only statistics: views + outbound clicks (conversion) by device
// class, source, country, and click target (platform).
export default function StatsPanel({ session, pageId }: { session: string | null; pageId: number }) {
  const [days, setDays] = useState<number>(30)
  const [stats, setStats] = useState<Stats | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setStats(null)
    if (!session) return () => { cancelled = true }
    getStats(session, pageId, days)
      .then((data) => {
        if (!cancelled) setStats(data)
      })
      .catch((err) => {
        if (!cancelled) setError(errorMessage(err))
      })
    return () => {
      cancelled = true
    }
  }, [session, pageId, days])

  if (error) return <CenteredStatus>{error}</CenteredStatus>
  if (!stats) return <CenteredStatus busy />

  const hasConversion = stats.conversionBySource.some((r) => r.clicks > 0)
  // Only days with activity come back from the API, so the axis is dense: thin
  // the date ticks to ~8, anchored on the last day.
  const tickStep = Math.max(1, Math.ceil(stats.byDay.length / 8))
  const dataset = dailyDataset(stats.byDay)
  // Views are the baseline of the stack; a click kind only earns a series (and
  // a legend entry) once it actually happened in this window.
  const daySeries: BarSeries[] = [
    { dataKey: 'views', label: 'Views', color: NEUTRAL, stack: 'day', barLabel: (item, context) => (context.bar.width >= 22 && context.bar.height >= 16 && item.value != null ? String(item.value) : null) },
    ...CLICK_KINDS
      .filter(({ kind }) => dataset.some((row) => row[kind]))
      .map(({ kind, label, color }): BarSeries => ({ dataKey: kind, label, color, stack: 'day' })),
  ]

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
        onChange={(_event, value: number | null) => value && setDays(value)}
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

      {/* Same grid metrics as the panels below, so the tiles line up with them. */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 1.5 }}>
        {tiles.map((tile) => (
          <Card key={tile.label} sx={{ p: '16px 22px', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            <Typography noWrap sx={{ fontSize: 28, fontWeight: 700, lineHeight: 1.2 }}>{tile.value}</Typography>
            <Typography variant="caption" color="text.secondary" noWrap title={tile.label}>{tile.label}</Typography>
          </Card>
        ))}
      </Box>

      {stats.byDay.length > 0 && (
        <StatsBlock title="Views and clicks per day">
          <BarChart
            dataset={dataset}
            height={260}
            grid={{ horizontal: true }}
            // Right margin is the room the last date tick needs: MUI ellipsizes a
            // tick label that would cross the drawing area's edge.
            margin={{ top: 8, right: 24, bottom: 0, left: 0 }}
            xAxis={[{
              dataKey: 'day',
              scaleType: 'band',
              valueFormatter: formatDay,
              // Count from the end so the most recent day always keeps its label.
              tickInterval: (value, index) => (stats.byDay.length - 1 - index) % tickStep === 0,
              disableTicks: true,
            }]}
            yAxis={[{ width: 32, disableLine: true, disableTicks: true, tickMinStep: 1 }]}
            series={daySeries.map((series): BarSeries => ({
              ...series,
              stack: 'day',
              // The day's view count, printed in the baseline segment when it has
              // room. Only that one: a number per click segment would both clutter
              // the stack and sit on colours it can't stay legible against — those
              // are read from the tooltip.
              barLabel: series.dataKey === 'views'
                ? (item, context) => (context.bar.width >= 22 && context.bar.height >= 16 && item.value != null ? String(item.value) : null)
                : undefined,
            }))}
            borderRadius={3}
            sx={{
              '& .MuiBarChart-label': { fontSize: 11, fill: 'var(--mui-palette-background-paper)' },
              '& .MuiChartsAxis-tickLabel': { fontSize: 11 },
              // A hairline of the card surface between stacked segments, so two
              // touching categories never blend into one block.
              '& .MuiBarChart-element': { stroke: 'var(--mui-palette-background-paper)', strokeWidth: 1 },
            }}
          />
        </StatsBlock>
      )}

      {/* The target list is a long, full-width list; the two share pies split the
          row below it. */}
      <BarList title="Clicks by platform / target" rows={stats.byTarget} total={stats.totalClicks} valueKey="clicks" formatKey={formatTarget} />

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 1.5 }}>
        <SharePie
          title="Devices"
          rows={stats.byDevice}
          formatKey={(key) => DEVICE_LABELS[key] || key}
          colorFor={(key) => DEVICE_SLOTS[key] || NEUTRAL}
        />
        <SharePie
          title="Countries"
          rows={stats.byCountry}
          formatKey={formatCountry}
          // No fixed vocabulary to pin slots to, so countries take the slots in
          // rank order — except 'unknown', which stays neutral like 'Other'.
          colorFor={(key, i) => (key === 'unknown' ? NEUTRAL : SLOT(i + 1))}
        />
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
        Anonymous and cookieless: device class, source, country and clicked platform only (see <Link href="/privacy" sx={{ color: 'inherit', textDecoration: 'underline' }}>privacy notice</Link>).
      </Typography>
    </Stack>
  )
}

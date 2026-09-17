// Prices arrive from GigBuddy in cents; gig dates are plain ISO days, read at
// noon so no time zone can shift them onto the neighbouring day.
// Merch prices stay euro-only and always show cents, unlike formatMoney.
export function formatEur(cents: number): string {
  return `€ ${(cents / 100).toFixed(2).replace('.', ',')}`
}

// A booking fee in the band's own currency, in the visitor's locale. Whole
// amounts drop the decimals: a fee indication is a round number, not a price.
export function formatMoney(cents: number, currency = 'EUR'): string {
  const fraction = cents % 100 === 0 ? 0 : 2
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
    minimumFractionDigits: fraction,
    maximumFractionDigits: fraction,
  }).format(cents / 100)
}

export function formatGigDate(iso: string): { month: string; day: string } {
  const date = new Date(`${iso}T12:00:00`)
  return {
    month: date.toLocaleDateString(undefined, { month: 'short' }).toUpperCase(),
    day: date.toLocaleDateString(undefined, { day: 'numeric' }),
  }
}

// Prices arrive from GigBuddy in cents; gig dates are plain ISO days, read at
// noon so no time zone can shift them onto the neighbouring day.
export function formatEur(cents: number): string {
  return `€ ${(cents / 100).toFixed(2).replace('.', ',')}`
}

export function formatGigDate(iso: string): { month: string; day: string } {
  const date = new Date(`${iso}T12:00:00`)
  return {
    month: date.toLocaleDateString(undefined, { month: 'short' }).toUpperCase(),
    day: date.toLocaleDateString(undefined, { day: 'numeric' }),
  }
}

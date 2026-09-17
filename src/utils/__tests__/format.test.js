import { describe, it, expect } from 'vitest'
import { formatMoney } from '../format.js'

// Formatting follows the visitor's locale, so the expectations are built the
// same way rather than pinned to one locale's separators.
const intl = (cents, currency, fraction) => new Intl.NumberFormat(undefined, {
  style: 'currency',
  currency,
  minimumFractionDigits: fraction,
  maximumFractionDigits: fraction,
}).format(cents / 100)

describe('formatMoney', () => {
  it('drops the decimals on a whole amount', () => {
    expect(formatMoney(50000)).toBe(intl(50000, 'EUR', 0))
    expect(formatMoney(0)).toBe(intl(0, 'EUR', 0))
  })

  it('keeps both decimals when there are cents', () => {
    expect(formatMoney(50050)).toBe(intl(50050, 'EUR', 2))
  })

  it('formats in the currency it is given, defaulting to euro', () => {
    expect(formatMoney(50000, 'GBP')).toBe(intl(50000, 'GBP', 0))
    expect(formatMoney(1234, 'USD')).toBe(intl(1234, 'USD', 2))
  })
})

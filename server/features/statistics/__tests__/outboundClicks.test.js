import { describe, expect, it } from 'vitest'
import { isOutboundClick, OUTBOUND_CLICK_SQL } from '../statsRepo.js'

describe('isOutboundClick', () => {
  it('counts a click that sent the visitor somewhere', () => {
    for (const target of ['platform:spotify', 'song:12', 'link:3', 'shop', 'social:instagram']) {
      expect(isOutboundClick(target)).toBe(true)
    }
  })

  it('excludes amplification and on-page engagement', () => {
    for (const target of ['share:native', 'share:copy', 'embed:youtube']) {
      expect(isOutboundClick(target)).toBe(false)
    }
  })

  // Opening the booking dialog is engagement; acting on a contact is the
  // conversion, and counting both would double up one visitor's intent.
  it('excludes opening the booking dialog but counts the contact acted on', () => {
    expect(isOutboundClick('book:open')).toBe(false)
    expect(isOutboundClick('book:email')).toBe(true)
    expect(isOutboundClick('book:phone')).toBe(true)
  })

  it('states the same rule in the SQL the aggregates filter with', () => {
    expect(OUTBOUND_CLICK_SQL).toContain("target NOT LIKE 'share:%'")
    expect(OUTBOUND_CLICK_SQL).toContain("target NOT LIKE 'embed:%'")
    expect(OUTBOUND_CLICK_SQL).toContain("target <> 'book:open'")
  })
})

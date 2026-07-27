import { describe, it, expect } from 'vitest'
import { mergeDailyActivity } from '../server/statsRepo.js'

// The daily chart stacks clicks-by-kind on top of views, so the two SQL series
// have to be zipped into one row per day before they reach the client.
describe('mergeDailyActivity', () => {
  it('puts each day\'s views and per-kind clicks in one row, oldest first', () => {
    const merged = mergeDailyActivity(
      [{ day: '2026-06-02', views: 4 }, { day: '2026-06-01', views: 9 }],
      [
        { day: '2026-06-01', kind: 'platform', clicks: 3 },
        { day: '2026-06-01', kind: 'share', clicks: 1 },
        { day: '2026-06-02', kind: 'platform', clicks: 2 },
      ],
    )
    expect(merged).toEqual([
      { day: '2026-06-01', views: 9, clicks: { platform: 3, share: 1 } },
      { day: '2026-06-02', views: 4, clicks: { platform: 2 } },
    ])
  })

  it('normalizes pg date objects to plain ISO days', () => {
    const merged = mergeDailyActivity([{ day: new Date(Date.UTC(2026, 5, 3)), views: 2 }], [])
    expect(merged).toEqual([{ day: '2026-06-03', views: 2, clicks: {} }])
  })

  it('keeps a day that recorded clicks but no views', () => {
    // The view beacon can be blocked while the click beacon gets through —
    // dropping the day would silently lose the clicks it did record.
    const merged = mergeDailyActivity([], [{ day: '2026-06-04', kind: 'link', clicks: 5 }])
    expect(merged).toEqual([{ day: '2026-06-04', views: 0, clicks: { link: 5 } }])
  })

  it('has no days at all when nothing happened', () => {
    expect(mergeDailyActivity([], [])).toEqual([])
  })
})

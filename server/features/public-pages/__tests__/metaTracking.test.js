import { describe, expect, it } from 'vitest'
import { validateLayout } from '../../editor/layout.js'
import { resolvePage } from '../resolve.js'

const settings = { pixelId: '123456789012345', platforms: ['spotify', 'apple'] }

describe('smart-link Meta configuration', () => {
  it('validates and publishes only the allowed fields for releases', () => {
    const result = validateLayout({ sections: [], metaTracking: { ...settings, accessToken: 'secret' } }, 'release')
    expect(result.layout.metaTracking).toEqual(settings)
    expect(resolvePage({}, result.layout, { songId: 12, title: 'Single' }).metaTracking)
      .toEqual({ ...settings, releaseId: 'song:12' })
  })

  it('never enables tracking on a main page', () => {
    expect(validateLayout({ sections: [], metaTracking: settings }, 'main').error).toMatch(/smart links/i)
    expect(resolvePage({}, { sections: [], metaTracking: settings }).metaTracking).toBeUndefined()
  })

  it.each(['<script>', '123abc', 123456, '0', '1'.repeat(31)])('rejects invalid Pixel IDs: %s', (pixelId) => {
    expect(validateLayout({ sections: [], metaTracking: { ...settings, pixelId } }, 'release').error).toMatch(/pixel/i)
  })

  it('normalizes the platform selection and rejects unknown platforms', () => {
    expect(validateLayout({ sections: [], metaTracking: { ...settings, platforms: ['spotify', 'spotify'] } }, 'release').layout.metaTracking.platforms).toEqual(['spotify'])
    expect(validateLayout({ sections: [], metaTracking: { ...settings, platforms: ['evil'] } }, 'release').error).toMatch(/platform/i)
    expect(validateLayout({ sections: [], metaTracking: { ...settings, platforms: [] } }, 'release').error).toMatch(/platform/i)
  })

  it('leaves unconfigured pages unchanged and drops malformed stored configuration', () => {
    expect(validateLayout({ sections: [] }).layout.metaTracking).toBeUndefined()
    expect(resolvePage({}, { sections: [], metaTracking: { ...settings, pixelId: 'bad' } }, { albumId: 5 }).metaTracking).toBeUndefined()
    expect(resolvePage({}, { sections: [], metaTracking: settings }, { albumId: 5 }).metaTracking.releaseId).toBe('album:5')
  })
})

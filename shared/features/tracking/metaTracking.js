import { PLATFORMS } from '../links/platforms.js'

const PLATFORM_IDS = new Set([...PLATFORMS.map(({ id }) => id), 'other'])

export function metaTrackingError(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return 'Invalid Meta tracking settings'
  if (typeof value.pixelId !== 'string' || !/^[1-9]\d{4,29}$/.test(value.pixelId.trim())) {
    return 'Enter a valid numeric Meta Pixel ID.'
  }
  if (!Array.isArray(value.platforms) || !value.platforms.length || value.platforms.length > PLATFORM_IDS.size || value.platforms.some((id) => !PLATFORM_IDS.has(id))) {
    return 'Select at least one valid streaming platform.'
  }
  return null
}

export function normalizeMetaTracking(value) {
  if (metaTrackingError(value)) return null
  return { pixelId: value.pixelId.trim(), platforms: [...new Set(value.platforms)] }
}

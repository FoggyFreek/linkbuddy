export interface MetaTracking { pixelId: string; platforms: string[] }
export function metaTrackingError(value: unknown): string | null
export function normalizeMetaTracking(value: unknown): MetaTracking | null

export const PAGE_THEME_KEYS: readonly string[]
export const DEFAULT_PAGE_THEMES: Record<'light' | 'dark', string>
export function pageThemeForScheme(key: string | null | undefined, scheme: 'light' | 'dark'): string

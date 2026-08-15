// Character trimming without regex: `/^\/+/` and `/\/+$/` backtrack
// super-linearly on a long run of the trimmed character, and every caller here
// trims something derived from the URL.

export function trimEnd(value: string, char: string): string {
  let end = value.length
  while (end > 0 && value[end - 1] === char) end--
  return value.slice(0, end)
}

export function trimStart(value: string, char: string): string {
  let start = 0
  while (start < value.length && value[start] === char) start++
  return value.slice(start)
}

export function trim(value: string, char: string): string {
  return trimEnd(trimStart(value, char), char)
}

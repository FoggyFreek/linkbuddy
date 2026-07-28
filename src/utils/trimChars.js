// Character trimming without regex: `/^\/+/` and `/\/+$/` backtrack
// super-linearly on a long run of the trimmed character, and every caller here
// trims something derived from the URL.

export function trimEnd(value, char) {
  let end = value.length
  while (end > 0 && value[end - 1] === char) end--
  return value.slice(0, end)
}

export function trimStart(value, char) {
  let start = 0
  while (start < value.length && value[start] === char) start++
  return value.slice(start)
}

export function trim(value, char) {
  return trimEnd(trimStart(value, char), char)
}

const sanitize = (segment: string | number) => {
  return String(segment)
    .trim()
    .replace(/[^A-Za-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export const themeClass = (...segments: Array<string | number | null | undefined | false>) => {
  const normalized = segments
    .filter((segment): segment is string | number => segment !== undefined && segment !== null && segment !== '' && segment !== false)
    .map(sanitize)
    .filter(Boolean)

  if (!normalized.length) {
    return ''
  }

  return `theme-${normalized.join('-')}`
}

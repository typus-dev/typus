/**
 * Theme Color Utilities
 * Pure functions for color manipulation
 */

export interface RGB {
  r: number
  g: number
  b: number
}

export interface HSL {
  h: number
  s: number
  l: number
}

/**
 * Parse hex color (with optional alpha) to CSS rgba string
 */
export const parseColor = (color: string): string => {
  if (color.startsWith('#') && color.length === 9) {
    // Hex with alpha (#rrggbbaa)
    const r = parseInt(color.slice(1, 3), 16)
    const g = parseInt(color.slice(3, 5), 16)
    const b = parseInt(color.slice(5, 7), 16)
    const a = parseInt(color.slice(7, 9), 16) / 255
    return `rgba(${r}, ${g}, ${b}, ${a.toFixed(2)})`
  }
  return color
}

/**
 * Apply alpha to any color (hex or rgba)
 */
export const applyAlpha = (color: string, alpha: number): string => {
  if (color.startsWith('#')) {
    const hex = color.replace('#', '')
    const r = parseInt(hex.slice(0, 2), 16)
    const g = parseInt(hex.slice(2, 4), 16)
    const b = parseInt(hex.slice(4, 6), 16)
    return `rgba(${r}, ${g}, ${b}, ${alpha})`
  }
  const rgbaMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i)
  if (rgbaMatch) {
    const [, r, g, b] = rgbaMatch
    return `rgba(${r}, ${g}, ${b}, ${alpha})`
  }
  return color
}

/**
 * Convert color to RGB object
 */
export const toRgb = (color: string): RGB => {
  if (color.startsWith('#')) {
    const hex = color.replace('#', '')
    const normalized = hex.length >= 6 ? hex.slice(0, 6) : hex.padEnd(6, '0')
    return {
      r: parseInt(normalized.slice(0, 2), 16),
      g: parseInt(normalized.slice(2, 4), 16),
      b: parseInt(normalized.slice(4, 6), 16)
    }
  }
  const rgbaMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i)
  if (rgbaMatch) {
    const [, r, g, b] = rgbaMatch
    return { r: parseInt(r), g: parseInt(g), b: parseInt(b) }
  }
  return { r: 255, g: 255, b: 255 }
}

/**
 * Mix color with white by amount (0-1)
 */
export const mixWithWhite = (color: string, amount: number, alpha = 1): string => {
  const { r, g, b } = toRgb(color)
  const blend = (value: number) => Math.round(value + (255 - value) * amount)
  return `rgba(${blend(r)}, ${blend(g)}, ${blend(b)}, ${alpha})`
}

/**
 * Convert RGB to HSL
 */
export const rgbToHsl = (r: number, g: number, b: number): HSL => {
  r /= 255
  g /= 255
  b /= 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0
  let s = 0
  const l = (max + min) / 2

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6
        break
      case g:
        h = ((b - r) / d + 2) / 6
        break
      case b:
        h = ((r - g) / d + 4) / 6
        break
    }
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100)
  }
}

/**
 * Convert HSL to RGB
 */
export const hslToRgb = (h: number, s: number, l: number): RGB => {
  h /= 360
  s /= 100
  l /= 100

  let r: number, g: number, b: number

  if (s === 0) {
    r = g = b = l
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1
      if (t > 1) t -= 1
      if (t < 1 / 6) return p + (q - p) * 6 * t
      if (t < 1 / 2) return q
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
      return p
    }

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s
    const p = 2 * l - q
    r = hue2rgb(p, q, h + 1 / 3)
    g = hue2rgb(p, q, h)
    b = hue2rgb(p, q, h - 1 / 3)
  }

  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255)
  }
}

/**
 * Convert RGB to hex string
 */
export const rgbToHex = (r: number, g: number, b: number): string => {
  const toHex = (n: number) => Math.min(255, Math.max(0, n)).toString(16).padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

/**
 * Get luminance of a color (0-1)
 */
export const getLuminance = (color: string): number => {
  const { r, g, b } = toRgb(color)
  // Using relative luminance formula
  const rsRGB = r / 255
  const gsRGB = g / 255
  const bsRGB = b / 255

  const rL = rsRGB <= 0.03928 ? rsRGB / 12.92 : Math.pow((rsRGB + 0.055) / 1.055, 2.4)
  const gL = gsRGB <= 0.03928 ? gsRGB / 12.92 : Math.pow((gsRGB + 0.055) / 1.055, 2.4)
  const bL = bsRGB <= 0.03928 ? bsRGB / 12.92 : Math.pow((bsRGB + 0.055) / 1.055, 2.4)

  return 0.2126 * rL + 0.7152 * gL + 0.0722 * bL
}

/**
 * Check if color is dark
 */
export const isDark = (color: string): boolean => {
  return getLuminance(color) < 0.5
}

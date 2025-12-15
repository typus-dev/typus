/**
 * Theme Generator Composable
 * Functions to generate theme colors from base colors
 */

import type { ThemeState, PaletteMode } from '../types/theme.types'
import { toRgb, rgbToHex, hslToRgb, rgbToHsl, isDark } from './useThemeColors'

/**
 * Helper to convert hex with alpha to rgba string
 */
const toRgba = (hex: string, alpha: number): string => {
  const { r, g, b } = toRgb(hex)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

/**
 * Helper to convert HSL to hex
 */
const hslToHex = (h: number, s: number, l: number): string => {
  const { r, g, b } = hslToRgb(h, s, l)
  return rgbToHex(r, g, b)
}

const clampAmount = (value: number): number => {
  if (Number.isNaN(value)) return 0
  return Math.min(1, Math.max(0, value))
}

const mixChannel = (a: number, b: number, amount: number) => {
  return Math.round(a + (b - a) * amount)
}

const mixColors = (colorA: string, colorB: string, weight: number): string => {
  const amount = clampAmount(weight)
  const start = toRgb(colorA)
  const end = toRgb(colorB)
  return rgbToHex(
    mixChannel(start.r, end.r, amount),
    mixChannel(start.g, end.g, amount),
    mixChannel(start.b, end.b, amount)
  )
}

const lightenColor = (color: string, amount: number): string => {
  return mixColors(color, '#ffffff', amount)
}

const darkenColor = (color: string, amount: number): string => {
  return mixColors(color, '#000000', amount)
}

const getReadableText = (color: string): string => {
  return isDark(color) ? '#f8fafc' : '#0f172a'
}

const applyDerivedComponentTokens = (theme: ThemeState): void => {
  const baseBg = theme.bgPrimary || theme.colorBackground
  const accent = theme.accent || theme.textPrimary
  const borderFocus = theme.borderFocus || accent
  const isBaseDark = baseBg ? isDark(baseBg) : true

  const outlineSurface = isBaseDark ? lightenColor(baseBg, 0.14) : darkenColor(baseBg, 0.05)
  const outlineHoverSurface = isBaseDark ? lightenColor(baseBg, 0.22) : darkenColor(baseBg, 0.1)
  const subtleBorder = mixColors(theme.border || baseBg, baseBg, 0.4)
  const focusBorder = mixColors(borderFocus, accent, 0.25)

  theme.accentText = getReadableText(accent)
  theme.hoverColor = accent
  theme.hoverOpacity = isBaseDark ? '0.14' : '0.08'

  theme.outlineText = getReadableText(outlineSurface)
  theme.outlineBackground = outlineSurface
  theme.outlineBorder = mixColors(borderFocus, outlineSurface, 0.35)
  theme.outlineHoverBackground = outlineHoverSurface
  theme.outlineHoverBorder = focusBorder

  const checkboxSurface = isBaseDark ? lightenColor(baseBg, 0.18) : darkenColor(baseBg, 0.04)
  theme.checkboxBorder = subtleBorder
  theme.checkboxBorderChecked = mixColors(accent, '#ffffff', isBaseDark ? 0.15 : 0.3)
  theme.checkboxFill = checkboxSurface
  theme.checkboxFillChecked = accent

  const inputSurface = isBaseDark ? lightenColor(baseBg, 0.12) : darkenColor(baseBg, 0.03)
  theme.inputBackground = inputSurface
  theme.inputBorderColor = mixColors(subtleBorder, borderFocus, 0.25)
}

/**
 * Generate theme from 2 base colors (background + foreground)
 * This is the simple 2-color mode
 */
export const generateFromBaseColors = (theme: ThemeState): void => {
  const bg = theme.colorBackground
  const fg = theme.colorForeground

  // Parse background color to HSL
  const { r: bgR, g: bgG, b: bgB } = toRgb(bg)
  const { h: bgH, s: bgS, l: bgL } = rgbToHsl(bgR, bgG, bgB)

  // Generate backgrounds (variations of background color)
  theme.bgPrimary = bg
  theme.bgSecondary = hslToHex(bgH, bgS, Math.min(bgL + 5, 95))

  // Foreground for text, borders, accents
  theme.textPrimary = fg
  theme.textMuted = toRgba(fg, 0.65)
  theme.accent = fg
  theme.accentLight = toRgba(fg, 0.1)
  theme.border = toRgba(fg, 0.12)

  // Button primary - NOT auto-generated, set by presets or manually
  // accentSolid is controlled separately in presets
  theme.accentText = getReadableText(fg)
  theme.borderFocus = fg

  // Hover color
  theme.hoverColor = fg
  theme.hoverOpacity = isDark(bg) ? '0.14' : '0.08'

  // Update glow
  theme.glowColor = fg

  // Semantic colors - hue shifted from foreground
  const { r: fgR, g: fgG, b: fgB } = toRgb(fg)
  const { h: fgH, s: fgS, l: fgL } = rgbToHsl(fgR, fgG, fgB)

  // Shift hues for semantic meaning
  const successHue = (fgH + 120) % 360  // Towards green
  const warningHue = (fgH + 45) % 360   // Towards yellow/orange
  const errorHue = (fgH + 340) % 360    // Towards red (-20°)
  const infoHue = fgH                    // Keep original

  // Ensure good saturation for semantic colors (min 50%)
  const semanticSat = Math.max(fgS, 50)
  const semanticLight = Math.min(Math.max(fgL, 45), 70)  // Clamp 45-70%

  const successColor = hslToHex(successHue, semanticSat, semanticLight)
  const warningColor = hslToHex(warningHue, semanticSat, semanticLight)
  const errorColor = hslToHex(errorHue, semanticSat, semanticLight)
  const infoColor = hslToHex(infoHue, semanticSat, semanticLight)

  theme.successBg = toRgba(successColor, 0.15)
  theme.successText = successColor
  theme.warningBg = toRgba(warningColor, 0.15)
  theme.warningText = warningColor
  theme.errorBg = toRgba(errorColor, 0.15)
  theme.errorText = errorColor
  theme.infoBg = toRgba(infoColor, 0.15)
  theme.infoText = infoColor

  applyDerivedComponentTokens(theme)
}

/**
 * Generate palette based on base color and mode
 * This is the advanced palette mode with monochrome/warm/cool/vibrant options
 */
export const generatePalette = (theme: ThemeState): void => {
  const base = theme.paletteBase
  const { r, g, b } = toRgb(base)
  const { h, s, l } = rgbToHsl(r, g, b)

  // Convert h to 0-1 range for calculations
  const hNorm = h / 360
  const sNorm = s / 100
  const lNorm = l / 100

  // Generate backgrounds (very dark variations of base color)
  const bgDark = hslToHex(h, Math.round(sNorm * 30), 8)
  const bgSecondary = hslToHex(h, Math.round(sNorm * 25), 12)

  theme.bgPrimary = toRgba(bgDark, 0.95)
  theme.bgSecondary = toRgba(bgSecondary, 0.9)

  // Text colors
  theme.textPrimary = '#f5f5f5'
  theme.textMuted = 'rgba(245, 245, 245, 0.65)'

  // Accent colors
  theme.accent = base
  theme.accentLight = toRgba(base, 0.1)

  // Borders
  theme.border = toRgba(base, 0.12)

  // Glow color follows palette
  theme.glowColor = base

  const mode = theme.paletteMode

  if (mode === 'monochrome') {
    applyMonochromePalette(theme, h, sNorm, lNorm, hslToHex, toRgba)
  } else if (mode === 'warm') {
    applyWarmPalette(theme, hNorm, sNorm, lNorm, hslToHex, toRgba)
  } else if (mode === 'cool') {
    applyCoolPalette(theme, hNorm, sNorm, lNorm, hslToHex, toRgba)
  } else if (mode === 'vibrant') {
    applyVibrantPalette(theme, h, hNorm, sNorm, lNorm, hslToHex, toRgba)
  }

  applyDerivedComponentTokens(theme)
}

/**
 * Monochrome palette - same hue, different lightness
 */
const applyMonochromePalette = (
  theme: ThemeState,
  h: number,
  s: number,
  l: number,
  hslToHex: (h: number, s: number, l: number) => string,
  toRgba: (hex: string, alpha: number) => string
): void => {
  const base = theme.paletteBase
  theme.accentSolid = base
  theme.borderFocus = base
  theme.successBg = toRgba(base, 0.15)
  theme.successText = base
  theme.warningBg = toRgba(hslToHex(h, Math.round(s * 50), Math.round(l * 80)), 0.15)
  theme.warningText = hslToHex(h, Math.round(s * 50), Math.round(l * 80))
  theme.errorBg = toRgba(hslToHex(h, Math.round(s * 100), Math.round(l * 60)), 0.15)
  theme.errorText = hslToHex(h, Math.round(s * 100), Math.round(l * 60))
  theme.infoBg = toRgba(hslToHex(h, Math.round(s * 100), Math.min(Math.round(l * 110), 90)), 0.15)
  theme.infoText = hslToHex(h, Math.round(s * 100), Math.min(Math.round(l * 110), 90))
}

/**
 * Warm palette - shift towards red/orange tones
 */
const applyWarmPalette = (
  theme: ThemeState,
  hNorm: number,
  s: number,
  l: number,
  hslToHex: (h: number, s: number, l: number) => string,
  toRgba: (hex: string, alpha: number) => string
): void => {
  const warmHue = ((hNorm + 0.08) % 1) * 360
  theme.accentSolid = hslToHex(warmHue, Math.min(Math.round(s * 120), 100), Math.round(l * 100))
  theme.borderFocus = theme.accentSolid

  // Generate backgrounds with warm tint
  const bgWarm = hslToHex(warmHue, Math.round(s * 40), 8)
  const bgSecondaryWarm = hslToHex(warmHue, Math.round(s * 35), 12)
  theme.bgPrimary = toRgba(bgWarm, 0.95)
  theme.bgSecondary = toRgba(bgSecondaryWarm, 0.9)

  theme.successBg = toRgba(hslToHex(((hNorm + 0.23) % 1) * 360, Math.round(s * 80), Math.round(l * 90)), 0.15)
  theme.successText = hslToHex(((hNorm + 0.23) % 1) * 360, Math.round(s * 80), Math.round(l * 90))
  theme.warningBg = toRgba(hslToHex(((hNorm + 0.16) % 1) * 360, Math.round(s * 90), Math.round(l * 85)), 0.15)
  theme.warningText = hslToHex(((hNorm + 0.16) % 1) * 360, Math.round(s * 90), Math.round(l * 85))
  theme.errorBg = toRgba(hslToHex(((hNorm + 0.03) % 1) * 360, Math.round(s * 100), Math.round(l * 70)), 0.15)
  theme.errorText = hslToHex(((hNorm + 0.03) % 1) * 360, Math.round(s * 100), Math.round(l * 70))
  theme.infoBg = toRgba(hslToHex(warmHue, Math.round(s * 70), Math.round(l * 95)), 0.15)
  theme.infoText = hslToHex(warmHue, Math.round(s * 70), Math.round(l * 95))
}

/**
 * Cool palette - shift towards blue/cyan tones
 */
const applyCoolPalette = (
  theme: ThemeState,
  hNorm: number,
  s: number,
  l: number,
  hslToHex: (h: number, s: number, l: number) => string,
  toRgba: (hex: string, alpha: number) => string
): void => {
  const coolHue = ((hNorm - 0.08 + 1) % 1) * 360
  theme.accentSolid = hslToHex(coolHue, Math.min(Math.round(s * 120), 100), Math.round(l * 100))
  theme.borderFocus = theme.accentSolid

  // Generate backgrounds with cool tint
  const bgCool = hslToHex(coolHue, Math.round(s * 40), 8)
  const bgSecondaryCool = hslToHex(coolHue, Math.round(s * 35), 12)
  theme.bgPrimary = toRgba(bgCool, 0.95)
  theme.bgSecondary = toRgba(bgSecondaryCool, 0.9)

  theme.successBg = toRgba(hslToHex(((hNorm + 0.12) % 1) * 360, Math.round(s * 80), Math.round(l * 90)), 0.15)
  theme.successText = hslToHex(((hNorm + 0.12) % 1) * 360, Math.round(s * 80), Math.round(l * 90))
  theme.warningBg = toRgba(hslToHex(((hNorm - 0.16 + 1) % 1) * 360, Math.round(s * 70), Math.round(l * 85)), 0.15)
  theme.warningText = hslToHex(((hNorm - 0.16 + 1) % 1) * 360, Math.round(s * 70), Math.round(l * 85))
  theme.errorBg = toRgba(hslToHex(((hNorm - 0.23 + 1) % 1) * 360, Math.round(s * 90), Math.round(l * 70)), 0.15)
  theme.errorText = hslToHex(((hNorm - 0.23 + 1) % 1) * 360, Math.round(s * 90), Math.round(l * 70))
  theme.infoBg = toRgba(hslToHex(((hNorm - 0.18 + 1) % 1) * 360, Math.round(s * 80), Math.round(l * 95)), 0.15)
  theme.infoText = hslToHex(((hNorm - 0.18 + 1) % 1) * 360, Math.round(s * 80), Math.round(l * 95))
}

/**
 * Vibrant palette - high saturation variants
 */
const applyVibrantPalette = (
  theme: ThemeState,
  h: number,
  hNorm: number,
  s: number,
  l: number,
  hslToHex: (h: number, s: number, l: number) => string,
  toRgba: (hex: string, alpha: number) => string
): void => {
  theme.accentSolid = hslToHex(h, Math.min(Math.round(s * 150), 100), Math.round(l * 100))
  theme.borderFocus = theme.accentSolid

  // Generate backgrounds with vibrant tint
  const bgVibrant = hslToHex(h, Math.round(s * 50), 8)
  const bgSecondaryVibrant = hslToHex(h, Math.round(s * 45), 12)
  theme.bgPrimary = toRgba(bgVibrant, 0.95)
  theme.bgSecondary = toRgba(bgSecondaryVibrant, 0.9)

  theme.successBg = toRgba(hslToHex(((hNorm + 0.3) % 1) * 360, 90, 60), 0.15)
  theme.successText = hslToHex(((hNorm + 0.3) % 1) * 360, 90, 60)
  theme.warningBg = toRgba(hslToHex(((hNorm + 0.15) % 1) * 360, 95, 65), 0.15)
  theme.warningText = hslToHex(((hNorm + 0.15) % 1) * 360, 95, 65)
  theme.errorBg = toRgba(hslToHex(((hNorm - 0.05 + 1) % 1) * 360, 90, 55), 0.15)
  theme.errorText = hslToHex(((hNorm - 0.05 + 1) % 1) * 360, 90, 55)
  theme.infoBg = toRgba(hslToHex(((hNorm - 0.15 + 1) % 1) * 360, 85, 70), 0.15)
  theme.infoText = hslToHex(((hNorm - 0.15 + 1) % 1) * 360, 85, 70)
}

export const useThemeGenerator = (theme: ThemeState) => {
  return {
    generateFromBaseColors: () => generateFromBaseColors(theme),
    generatePalette: () => generatePalette(theme)
  }
}

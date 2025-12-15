/**
 * Theme Presets Composable
 * All preset configurations for style, glass, neon, tilt, and border effects
 */

import type { ThemeState } from '../types/theme.types'

// ========== PALETTE SYSTEM ==========
// Pure 2-color system: everything derives from Background + Foreground

export type PaletteMode = 'dark' | 'light'
export type PaletteStyle = 'mono' | 'warm' | 'cool' | 'vibrant'

export interface PalettePreset {
  colorBackground: string
  colorForeground: string
}

// 8 presets: 2 modes × 4 styles
// All derived colors (accent, border, buttons) come from Foreground
export const palettePresets: Record<PaletteMode, Record<PaletteStyle, PalettePreset>> = {
  dark: {
    mono: {
      colorBackground: '#171717',  // Neutral dark
      colorForeground: '#f5f5f5'   // Neutral light
    },
    warm: {
      colorBackground: '#1c1410',  // Warm dark brown
      colorForeground: '#fef3c7'   // Warm cream/amber
    },
    cool: {
      colorBackground: '#0c1929',  // Cool dark blue
      colorForeground: '#bae6fd'   // Cool light cyan
    },
    vibrant: {
      colorBackground: '#18181b',  // Near black
      colorForeground: '#a78bfa'   // Vibrant purple
    }
  },
  light: {
    mono: {
      colorBackground: '#fafafa',  // Neutral light
      colorForeground: '#171717'   // Neutral dark
    },
    warm: {
      colorBackground: '#fffbeb',  // Warm cream
      colorForeground: '#92400e'   // Warm brown
    },
    cool: {
      colorBackground: '#f0f9ff',  // Cool light blue
      colorForeground: '#0c4a6e'   // Cool dark blue
    },
    vibrant: {
      colorBackground: '#faf5ff',  // Light purple tint
      colorForeground: '#7c3aed'   // Vibrant purple
    }
  }
}

// ========== STYLE PRESETS ==========

export const stylePresets = {
  snowWhite: {
    name: 'Snow White',
    colorBackground: '#ffffff',
    colorForeground: '#202124',
    bgPrimary: '#ffffff',
    bgSecondary: '#f8f9fa',
    textPrimary: '#202124',
    textMuted: 'rgba(32, 33, 36, 0.6)',
    accent: '#202124',
    accentLight: 'rgba(32, 33, 36, 0.1)',
    accentSolid: '#d9d9d9',  // bgPrimary darkened
    accentText: '#ffffff',
    border: 'rgba(0, 0, 0, 0.12)',
    borderFocus: '#202124',
    hoverColor: '#f472b6',
    hoverOpacity: '0.05',
    radiusBase: '0.5',
    uiScale: '1.0',
    outlineText: '#202124',
    outlineBackground: '#ffffff',
    outlineBorder: '#e0e0e0',
    outlineHoverBackground: '#fdf2f8',
    outlineHoverBorder: '#f472b6',
    checkboxBorder: '#e4e4e4',
    checkboxBorderChecked: '#f472b6',
    checkboxFill: '#ffffff',
    checkboxFillChecked: '#f472b6',
    inputBackground: '#ffffff',
    inputBorderColor: '#e0e0e0'
  },
  oceanWave: {
    name: 'Ocean Wave',
    colorBackground: '#17212b',
    colorForeground: '#ffffff',
    bgPrimary: '#17212b',
    bgSecondary: '#0e1621',
    textPrimary: '#ffffff',
    textMuted: 'rgba(255, 255, 255, 0.5)',
    accent: '#ffffff',
    accentLight: 'rgba(255, 255, 255, 0.15)',
    accentSolid: '#2d3d4d',  // bgPrimary lightened
    accentText: '#0b1520',
    border: 'rgba(255, 255, 255, 0.1)',
    borderFocus: '#38bdf8',
    hoverColor: '#38bdf8',
    hoverOpacity: '0.08',
    radiusBase: '0.75',
    uiScale: '1.0',
    outlineText: '#e0f2fe',
    outlineBackground: '#0f1924',
    outlineBorder: '#1f2e41',
    outlineHoverBackground: '#1a2f46',
    outlineHoverBorder: '#38bdf8',
    checkboxBorder: '#203049',
    checkboxBorderChecked: '#38bdf8',
    checkboxFill: '#0b1520',
    checkboxFillChecked: '#0ea5e9',
    inputBackground: '#0f1924',
    inputBorderColor: '#1e293b'
  },
  blackGloss: {
    name: 'Black Gloss',
    colorBackground: '#000000',
    colorForeground: '#ffffff',
    bgPrimary: '#000000',
    bgSecondary: '#16181c',
    textPrimary: '#e7e9ea',
    textMuted: 'rgba(231, 233, 234, 0.6)',
    accent: '#ffffff',
    accentLight: 'rgba(255, 255, 255, 0.1)',
    accentSolid: '#262626',  // bgPrimary lightened
    accentText: '#0b0b0b',
    border: 'rgba(255, 255, 255, 0.2)',
    borderFocus: '#ffffff',
    hoverColor: '#ffffff',
    hoverOpacity: '0.03',
    radiusBase: '1',
    uiScale: '1.0',
    outlineText: '#f8fafc',
    outlineBackground: '#101114',
    outlineBorder: '#2d3035',
    outlineHoverBackground: '#1a1c21',
    outlineHoverBorder: '#ffffff',
    checkboxBorder: '#2a2d32',
    checkboxBorderChecked: '#f8fafc',
    checkboxFill: '#050505',
    checkboxFillChecked: '#f5f5f5',
    inputBackground: '#090909',
    inputBorderColor: '#2a2d32'
  },
  rubyRed: {
    name: 'Ruby Red',
    colorBackground: '#0f0f0f',
    colorForeground: '#ffffff',
    bgPrimary: '#0f0f0f',
    bgSecondary: '#212121',
    textPrimary: '#f1f1f1',
    textMuted: 'rgba(241, 241, 241, 0.6)',
    accent: '#ffffff',
    accentLight: 'rgba(255, 255, 255, 0.1)',
    accentSolid: '#2a2a2a',  // bgPrimary lightened
    accentText: '#130a0a',
    border: 'rgba(255, 255, 255, 0.1)',
    borderFocus: '#f87171',
    hoverColor: '#f87171',
    hoverOpacity: '0.1',
    radiusBase: '0.75',
    uiScale: '1.0',
    outlineText: '#fff5f5',
    outlineBackground: '#1a1a1a',
    outlineBorder: '#353535',
    outlineHoverBackground: '#211115',
    outlineHoverBorder: '#f87171',
    checkboxBorder: '#3d3d3d',
    checkboxBorderChecked: '#f87171',
    checkboxFill: '#151515',
    checkboxFillChecked: '#dc2626',
    inputBackground: '#151515',
    inputBorderColor: '#3d3d3d'
  },
  nightSky: {
    name: 'Night Sky',
    colorBackground: '#0d1117',
    colorForeground: '#c9d1d9',
    bgPrimary: '#0d1117',
    bgSecondary: '#161b22',
    textPrimary: '#c9d1d9',
    textMuted: 'rgba(201, 209, 217, 0.6)',
    accent: '#c9d1d9',
    accentLight: 'rgba(201, 209, 217, 0.1)',
    accentSolid: '#232830',  // bgPrimary lightened
    accentText: '#0d1117',
    border: 'rgba(240, 246, 252, 0.1)',
    borderFocus: '#60a5fa',
    hoverColor: '#60a5fa',
    hoverOpacity: '0.06',
    radiusBase: '0.375',
    uiScale: '1.0',
    outlineText: '#f8fafc',
    outlineBackground: '#111826',
    outlineBorder: '#2f3a4b',
    outlineHoverBackground: '#172235',
    outlineHoverBorder: '#60a5fa',
    checkboxBorder: '#334155',
    checkboxBorderChecked: '#3b82f6',
    checkboxFill: '#0f172a',
    checkboxFillChecked: '#2563eb',
    inputBackground: '#0f172a',
    inputBorderColor: '#273447'
  }
} as const

export type StylePresetName = keyof typeof stylePresets

// ========== GLASS PRESETS ==========

export type GlassPresetName = 'off' | 'subtle' | 'frosted' | 'neon' | 'cyber'

export const glassPresets: Record<GlassPresetName, Partial<ThemeState>> = {
  off: {
    pageBackground: 'solid',
    glassBlur: '0',
    glassOpacity: '1',
    glassGradient: '0',
    glassGradientType: 'radial',
    glassBorder: '0',
    glassShadow: '0',
    glowIntensity: '0',
    neonIntensity: '0'
  },
  subtle: {
    pageBackground: 'gradient',
    glassBlur: '8',
    glassOpacity: '0.9',
    glassGradient: '0.4',
    glassGradientType: 'vertical',
    glassBorder: '0.5',
    glassShadow: '0.2',
    glowIntensity: '0.5',
    glowColor: '#94a3b8',
    neonIntensity: '0'
  },
  frosted: {
    pageBackground: 'gradient',
    glassBlur: '32',
    glassOpacity: '0.7',
    glassGradient: '0.6',
    glassGradientType: 'radial',
    glassBorder: '1.5',
    glassShadow: '0.5',
    glowIntensity: '0',
    shimmerEnabled: true
  },
  neon: {
    pageBackground: 'solid',
    glassBlur: '20',
    glassOpacity: '0.85',
    glassGradient: '0.8',
    glassGradientType: 'diagonal',
    glassBorder: '1.8',
    glassShadow: '0.7',
    glowIntensity: '0',
    neonEnabled: true
  },
  cyber: {
    pageBackground: 'solid',
    glassBlur: '24',
    glassOpacity: '0.75',
    glassGradient: '1',
    glassGradientType: 'diagonal',
    glassBorder: '2',
    glassShadow: '0.9',
    glowIntensity: '0',
    tiltEnabled: true
  }
}

// ========== NEON PRESETS ==========

export type NeonPresetName = 'cyber' | 'synthwave' | 'matrix' | 'sunset'

export const neonPresets: Record<NeonPresetName, Partial<ThemeState>> = {
  cyber: {
    neonIntensity: '0.5',
    neonColor: '#22d3ee',
    neonPulse: true,
    glowIntensity: '0'
  },
  synthwave: {
    neonIntensity: '0.5',
    neonColor: '#f472b6',
    neonPulse: false,
    glowIntensity: '0'
  },
  matrix: {
    neonIntensity: '0.5',
    neonColor: '#22c55e',
    neonPulse: true,
    glowIntensity: '0'
  },
  sunset: {
    neonIntensity: '0.5',
    neonColor: '#f97316',
    neonPulse: false,
    glowIntensity: '0'
  }
}

// ========== TILT PRESETS ==========

export type TiltPresetName = 'subtle' | 'dramatic' | 'floating' | 'immersive'

export const tiltPresets: Record<TiltPresetName, Partial<ThemeState>> = {
  subtle: {
    tiltIntensity: '0.3',
    tiltPerspective: '1500',
    glassShadow: '0.3'
  },
  dramatic: {
    tiltIntensity: '0.7',
    tiltPerspective: '800',
    glassShadow: '0.7'
  },
  floating: {
    tiltIntensity: '0.5',
    tiltPerspective: '1200',
    glassShadow: '0.9',
    glassBlur: '15'
  },
  immersive: {
    tiltIntensity: '1',
    tiltPerspective: '600',
    glassShadow: '1',
    glassGradient: '0.8'
  }
}

// ========== BORDER PRESETS ==========

export type BorderPresetName = 'rainbow' | 'fire' | 'ocean' | 'monochrome'

export const borderPresets: Record<BorderPresetName, Partial<ThemeState>> = {
  rainbow: {
    gradientBorderIntensity: '0.5',
    gradientBorderAnimated: true,
    gradientBorderSpeed: '3',
    neonColor: '#60a5fa'
  },
  fire: {
    gradientBorderIntensity: '0.5',
    gradientBorderAnimated: true,
    gradientBorderSpeed: '2',
    neonColor: '#f97316'
  },
  ocean: {
    gradientBorderIntensity: '0.5',
    gradientBorderAnimated: false,
    gradientBorderSpeed: '5',
    neonColor: '#06b6d4'
  },
  monochrome: {
    gradientBorderIntensity: '0.5',
    gradientBorderAnimated: false,
    gradientBorderSpeed: '4',
    neonColor: '#f5f5f5'
  }
}

// ========== APPLY PRESET FUNCTIONS ==========

const applyPresetToTheme = (theme: ThemeState, preset: Partial<ThemeState>): void => {
  Object.entries(preset).forEach(([key, value]) => {
    if (value !== undefined && key in theme) {
      ;(theme as unknown as Record<string, unknown>)[key] = value
    }
  })
}

// Helper to generate random harmonious color pairs based on mode
// Pure 2-color system: bg + fg only, all other colors derived
const generateRandomPalette = (mode: PaletteMode): { bg: string; fg: string } => {
  // Random hue 0-360
  const hue = Math.floor(Math.random() * 360)
  // Random saturation style (mono, tinted, vibrant)
  const styleRoll = Math.random()
  const isMono = styleRoll < 0.3
  const isVibrant = styleRoll > 0.7

  if (mode === 'dark') {
    // Dark background with light foreground
    const bgLightness = 5 + Math.floor(Math.random() * 10)   // 5-15%
    const bgSaturation = isMono ? 0 : Math.floor(Math.random() * 25)
    const fgLightness = 85 + Math.floor(Math.random() * 15)  // 85-100%
    const fgSaturation = isMono ? 0 : (isVibrant ? 50 + Math.floor(Math.random() * 50) : Math.floor(Math.random() * 30))

    return {
      bg: `hsl(${hue}, ${bgSaturation}%, ${bgLightness}%)`,
      fg: `hsl(${hue}, ${fgSaturation}%, ${fgLightness}%)`
    }
  } else {
    // Light background with dark foreground
    const bgLightness = 95 + Math.floor(Math.random() * 5)   // 95-100%
    const bgSaturation = isMono ? 0 : Math.floor(Math.random() * 15)
    const fgLightness = 10 + Math.floor(Math.random() * 15)  // 10-25%
    const fgSaturation = isMono ? 0 : (isVibrant ? 50 + Math.floor(Math.random() * 50) : Math.floor(Math.random() * 30))

    return {
      bg: `hsl(${hue}, ${bgSaturation}%, ${bgLightness}%)`,
      fg: `hsl(${hue}, ${fgSaturation}%, ${fgLightness}%)`
    }
  }
}

const randomBetween = (min: number, max: number): number => {
  return Math.random() * (max - min) + min
}

const pickRandom = <T>(items: T[]): T => {
  return items[Math.floor(Math.random() * items.length)]
}

const applyRandomSizing = (theme: ThemeState) => {
  const baseRadius = randomBetween(0.2, 1.2)
  const cardRadius = Math.min(2, baseRadius + randomBetween(0.15, 1))
  const transitionSpeed = Math.round(randomBetween(100, 400))

  theme.radiusBase = baseRadius.toFixed(2)
  theme.cardRadius = cardRadius.toFixed(2)
  theme.transitionSpeed = transitionSpeed.toString()
}

const formatRem = (value: number): string => `${value.toFixed(2)}rem`

const applyRandomTypographySpacing = (theme: ThemeState) => {
  const baseFonts = [
    "'Inter', system-ui, sans-serif",
    "system-ui, sans-serif",
    "'Work Sans', system-ui, sans-serif"
  ]
  const headingFonts = [
    "'Playfair Display', serif",
    "'Space Grotesk', sans-serif",
    "'Georgia', serif"
  ]
  const monoFonts = [
    "'JetBrains Mono', monospace",
    "'IBM Plex Mono', monospace"
  ]

  theme.fontBase = pickRandom(baseFonts)
  theme.fontHeading = pickRandom(headingFonts)
  theme.fontMono = pickRandom(monoFonts)

  theme.fontSizeBase = randomBetween(0.9, 1.1).toFixed(2)
  theme.lineHeightBase = randomBetween(1.3, 1.7).toFixed(2)
  theme.fontWeightHeading = (Math.round(randomBetween(4, 9)) * 100).toString()

  theme.spacingBase = randomBetween(0.85, 1.15).toFixed(2)
  const inputV = randomBetween(0.45, 0.75)
  const inputH = randomBetween(0.6, 1.15)
  const buttonV = randomBetween(0.5, 0.85)
  const buttonH = randomBetween(0.9, 1.4)
  const cardPad = randomBetween(1.1, 2.2)

  theme.inputPadding = `${formatRem(inputV)} ${formatRem(inputH)}`
  theme.buttonPadding = `${formatRem(buttonV)} ${formatRem(buttonH)}`
  theme.cardPadding = formatRem(cardPad)
}

// Convert HSL string to hex
const hslToHex = (hsl: string): string => {
  const match = hsl.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/)
  if (!match) return hsl

  const h = parseInt(match[1]) / 360
  const s = parseInt(match[2]) / 100
  const l = parseInt(match[3]) / 100

  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1
    if (t > 1) t -= 1
    if (t < 1/6) return p + (q - p) * 6 * t
    if (t < 1/2) return q
    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6
    return p
  }

  let r, g, b
  if (s === 0) {
    r = g = b = l
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s
    const p = 2 * l - q
    r = hue2rgb(p, q, h + 1/3)
    g = hue2rgb(p, q, h)
    b = hue2rgb(p, q, h - 1/3)
  }

  const toHex = (x: number) => Math.round(x * 255).toString(16).padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

export const useThemePresets = (theme: ThemeState, generateFromBaseColors?: () => void) => {
  // Current mode tracking (not persisted in theme, just UI state)
  let currentMode: PaletteMode = 'dark'
  let currentStyle: PaletteStyle = 'mono'

  // Detect mode from current background color
  const detectMode = (): PaletteMode => {
    const bg = theme.colorBackground
    if (!bg) return 'dark'
    // Simple lightness check - if hex starts with high values, it's light
    const hex = bg.replace('#', '')
    const r = parseInt(hex.slice(0, 2), 16)
    const g = parseInt(hex.slice(2, 4), 16)
    const b = parseInt(hex.slice(4, 6), 16)
    const lightness = (r + g + b) / 3
    return lightness > 128 ? 'light' : 'dark'
  }

  // Apply preset and generate (all derived colors come from generateFromBaseColors)
  const applyPreset = (preset: PalettePreset) => {
    theme.colorBackground = preset.colorBackground
    theme.colorForeground = preset.colorForeground

    if (generateFromBaseColors) {
      generateFromBaseColors()
    }
  }

  // Set mode (Dark/Light)
  const setMode = (mode: PaletteMode) => {
    currentMode = mode
    const preset = palettePresets[mode][currentStyle]
    applyPreset(preset)
  }

  // Set style (Mono/Warm/Cool/Vibrant)
  const setStyle = (style: PaletteStyle) => {
    currentStyle = style
    currentMode = detectMode() // Auto-detect current mode
    const preset = palettePresets[currentMode][style]
    applyPreset(preset)
  }

  // Generate random palette respecting current mode
  // All derived colors come from generateFromBaseColors (pure 2-color system)
  const randomizePalette = () => {
    currentMode = detectMode()
    const palette = generateRandomPalette(currentMode)

    theme.colorBackground = hslToHex(palette.bg)
    theme.colorForeground = hslToHex(palette.fg)

    if (generateFromBaseColors) {
      generateFromBaseColors()
    }

    applyRandomSizing(theme)
    applyRandomTypographySpacing(theme)
  }

  // Get current mode for UI
  const getMode = () => detectMode()
  const getStyle = () => currentStyle

  const applyStylePreset = (presetName: StylePresetName) => {
    const preset = stylePresets[presetName]
    if (preset) {
      applyPresetToTheme(theme, preset as Partial<ThemeState>)
    }
  }

  const applyGlassPreset = (presetName: GlassPresetName) => {
    // Reset all effects first
    theme.neonEnabled = false
    theme.tiltEnabled = false
    theme.shimmerEnabled = false

    const preset = glassPresets[presetName]
    if (preset) {
      applyPresetToTheme(theme, preset)
    }
  }

  const applyNeonPreset = (presetName: NeonPresetName) => {
    const preset = neonPresets[presetName]
    if (preset) {
      applyPresetToTheme(theme, preset)
    }
  }

  const applyTiltPreset = (presetName: TiltPresetName) => {
    const preset = tiltPresets[presetName]
    if (preset) {
      applyPresetToTheme(theme, preset)
    }
  }

  const applyBorderPreset = (presetName: BorderPresetName) => {
    const preset = borderPresets[presetName]
    if (preset) {
      applyPresetToTheme(theme, preset)
    }
  }

  return {
    // Presets data
    palettePresets,
    stylePresets,
    glassPresets,
    neonPresets,
    tiltPresets,
    borderPresets,
    // Palette functions
    setMode,
    setStyle,
    getMode,
    getStyle,
    randomizePalette,
    // Other apply functions
    applyStylePreset,
    applyGlassPreset,
    applyNeonPreset,
    applyTiltPreset,
    applyBorderPreset
  }
}

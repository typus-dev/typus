/**
 * Theme State Composable
 * Manages reactive theme state and cleanup
 */

import { reactive, ref } from 'vue'
import type { ThemeState, SaveStatus, GlassModeStatus } from '../types/theme.types'

// Read current theme values from CSS variables
const getThemeFromCSS = (): Partial<ThemeState> => {
  if (typeof window === 'undefined') return {}

  const style = getComputedStyle(document.documentElement)
  const get = (name: string) => style.getPropertyValue(name).trim()

  // Helper to convert rgb/rgba to hex
  const rgbToHex = (rgb: string): string => {
    if (!rgb || rgb.startsWith('#')) return rgb || ''
    const match = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/)
    if (!match) return rgb
    const [, r, g, b] = match
    return `#${[r, g, b].map(x => parseInt(x).toString(16).padStart(2, '0')).join('')}`
  }

  return {
    colorBackground: rgbToHex(get('--color-bg-primary')) || undefined,
    colorForeground: rgbToHex(get('--color-text-primary')) || undefined,
    bgPrimary: rgbToHex(get('--color-bg-primary')) || undefined,
    bgSecondary: rgbToHex(get('--color-bg-secondary')) || undefined,
    textPrimary: rgbToHex(get('--color-text-primary')) || undefined,
    textMuted: get('--color-text-secondary') || undefined,
    accent: rgbToHex(get('--color-accent')) || undefined,
    accentLight: get('--color-accent-light') || undefined,
    accentSolid: rgbToHex(get('--color-bg-accent-solid')) || undefined,
    accentText: rgbToHex(get('--color-text-on-accent')) || undefined,
    border: get('--color-border-secondary') || undefined,
    borderFocus: rgbToHex(get('--color-border-focus')) || undefined,
    buttonGradient: get('--button-primary-fill') || undefined,
    buttonGradientEnabled: get('--button-gradient-active') === '1',
    cardGradient: get('--card-surface-fill') || undefined,
    cardGradientEnabled: get('--card-gradient-active') === '1',
    shellGradient: get('--app-background-fill') || undefined,
    shellGradientEnabled: get('--app-background-gradient-active') === '1',
    buttonGradientIntensity: get('--button-gradient-intensity') || undefined,
    cardGradientIntensity: get('--card-gradient-intensity') || undefined,
    buttonGlossGradient: get('--button-gloss-gradient') || undefined,
    buttonGlossOpacity: get('--button-gloss-opacity') || undefined,
    buttonGlossHoverOpacity: get('--button-gloss-hover-opacity') || undefined,
    buttonGlossActiveOpacity: get('--button-gloss-active-opacity') || undefined,
    buttonGlossEnabled: get('--button-gloss-enabled') === '1',
    successBg: get('--color-bg-success') || undefined,
    successText: get('--color-text-success') || undefined,
    warningBg: get('--color-bg-warning') || undefined,
    warningText: get('--color-text-warning') || undefined,
    errorBg: get('--color-bg-error') || undefined,
    errorText: get('--color-text-error') || undefined,
    infoBg: get('--color-bg-info') || undefined,
    infoText: get('--color-text-info') || undefined,
    fontHeading: get('--font-family-heading') || undefined,
    fontMono: get('--font-family-mono') || undefined,
    fontWeightHeading: get('--font-weight-heading') || undefined,
    inputPadding: get('--input-padding') || undefined,
    buttonPadding: get('--button-padding') || undefined,
    cardPadding: get('--card-padding') || undefined,
    radiusBase: get('--radius-md')?.replace('rem', '') || undefined,
    cardRadius: get('--radius-card')?.replace('rem', '') || undefined,
    outlineText: rgbToHex(get('--component-outline-text')) || undefined,
    outlineBackground: rgbToHex(get('--component-outline-bg')) || undefined,
    outlineBorder: rgbToHex(get('--component-outline-border')) || undefined,
    outlineHoverBackground: rgbToHex(get('--component-outline-hover-bg')) || undefined,
    outlineHoverBorder: rgbToHex(get('--component-outline-hover-border')) || undefined,
    checkboxBorder: rgbToHex(get('--component-checkbox-border')) || undefined,
    checkboxBorderChecked: rgbToHex(get('--component-checkbox-border-checked')) || undefined,
    checkboxFill: rgbToHex(get('--component-checkbox-fill')) || undefined,
    checkboxFillChecked: rgbToHex(get('--component-checkbox-fill-checked')) || undefined,
    inputBackground: rgbToHex(get('--component-input-background')) || undefined,
    inputBorderColor: rgbToHex(get('--component-input-border')) || undefined,
  }
}

// Fallback default theme values (used if CSS vars not available)
const fallbackTheme: ThemeState = {
  // Base color scheme (2-color system)
  colorBackground: '#181410',
  colorForeground: '#f5f5f5',

  // Palette base (advanced mode)
  paletteBase: '#f5f5f5',
  paletteMode: 'monochrome',

  // Colors
  bgPrimary: '#181410',
  bgSecondary: '#201c18',
  textPrimary: '#f5f5f5',
  textMuted: '#f5f5f580',
  accent: '#f5f5f5',
  accentLight: '#f5f5f51a',
  accentSolid: '#3b82f6',
  accentText: '#ffffff',
  border: '#f5f5f51f',
  borderFocus: '#3b82f6',

  // Hover color
  hoverColor: '#f5f5f5',
  hoverOpacity: '0.1',

  // Semantic
  successBg: '#86efaccc',
  successText: '#86efaccc',
  warningBg: '#f5f5f5b3',
  warningText: '#f5f5f5b3',
  errorBg: '#fca5a5cc',
  errorText: '#fca5a5cc',
  infoBg: '#93c5fdcc',
  infoText: '#93c5fdcc',

  // Typography
  fontBase: "'Inter', system-ui, sans-serif",
  fontHeading: "'Playfair Display', serif",
  fontMono: "'JetBrains Mono', monospace",
  fontSizeBase: '1',
  lineHeightBase: '1.5',
  fontWeightHeading: '600',

  // Spacing
  spacingBase: '1',
  radiusBase: '0.25',
  cardRadius: '0.5',

  // Component padding
  inputPadding: '0.5rem 0.75rem',
  buttonPadding: '0.625rem 1.25rem',
  cardPadding: '1.5rem',
  cardRadius: '0.5',

  // Sizing & Scale
  uiScale: '1.0',

  // Interactions
  transitionSpeed: '150',

  // Gradient fills
  buttonGradient: '',
  buttonGradientEnabled: false,
  buttonGradientIntensity: '1',
  cardGradient: '',
  cardGradientEnabled: false,
  cardGradientIntensity: '1',
  shellGradient: '',
  shellGradientEnabled: false,
  buttonGlossGradient: 'radial-gradient(circle at 20% 20%, rgba(255,255,255,0.45), transparent 55%), radial-gradient(circle at 80% 0%, rgba(255,255,255,0.15), transparent 65%), linear-gradient(135deg, rgba(255,255,255,0.35), rgba(255,255,255,0.05))',
  buttonGlossOpacity: '0.15',
  buttonGlossHoverOpacity: '0.25',
  buttonGlossActiveOpacity: '0.1',
  buttonGlossEnabled: true,

  // Effects
  glassBlur: '0',
  glassOpacity: '1',
  glowIntensity: '0',
  glowColor: '#3b82f6',
  animationScale: '1',

  // Glassmorphism effects
  glassGradient: '0',
  glassGradientType: 'radial',
  glassBorder: '0.5',
  glassShadow: '0',
  glassApplyToCards: true,
  glassApplyToShell: true,

  // Page background
  pageBackground: 'solid',

  // === ADVANCED EFFECTS ===

  // Neon effects (intensity 0 = off, >0 = on)
  neonEnabled: false,
  neonColor: '#60a5fa',
  neonIntensity: '0',
  neonPulse: false,

  // 3D/Tilt effects (intensity 0 = off, >0 = on)
  tiltEnabled: false,
  tiltIntensity: '0',
  tiltPerspective: '1000',

  // Gradient borders (intensity 0 = off, >0 = on)
  gradientBorderEnabled: false,
  gradientBorderIntensity: '0',
  gradientBorderAnimated: false,
  gradientBorderSpeed: '3',

  // Shimmer (intensity 0 = off, >0 = on)
  shimmerEnabled: false,
  shimmerIntensity: '0',

  // Noise texture
  noiseEnabled: false,
  noiseOpacity: '0.03',

  // === EXTENDED EFFECTS ===
  animatedGradient: false,
  parallaxEnabled: false,
  rippleEnabled: true,
  frostedGlass: false,
  meshGradient: false,
  particleGrid: false,
  blobShapes: false,
  mouseGlow: false,
  magneticButtons: false,
  cards3D: false,

  // Component overrides
  outlineText: '#f5f5f5',
  outlineBackground: '#201c18',
  outlineBorder: '#f5f5f51f',
  outlineHoverBackground: '#f5f5f540',
  outlineHoverBorder: '#3b82f6',
  checkboxBorder: '#f5f5f51f',
  checkboxBorderChecked: '#3b82f6',
  checkboxFill: 'transparent',
  checkboxFillChecked: '#3b82f6',
  inputBackground: '#201c18',
  inputBorderColor: '#f5f5f51f'
}

// Build default theme from CSS vars with fallback
const buildDefaultTheme = (): ThemeState => {
  const fromCSS = getThemeFromCSS()
  // Filter out undefined values and merge with fallback
  const filtered = Object.fromEntries(
    Object.entries(fromCSS).filter(([, v]) => v !== undefined && v !== '')
  )
  return { ...fallbackTheme, ...filtered }
}

// CSS variables that may need cleanup on unmount
const CSS_VARS_TO_CLEAN = [
  '--color-text-primary',
  '--color-text-secondary',
  '--color-bg-primary',
  '--color-bg-secondary',
  '--color-accent',
  '--color-accent-light',
  '--color-bg-accent-solid',
  '--color-border',
  '--color-border-focus',
  '--button-primary-fill',
  '--button-secondary-fill',
  '--card-surface-fill',
  '--app-background-fill',
  '--button-gradient-intensity',
  '--card-gradient-intensity',
  '--button-gloss-gradient',
  '--button-gloss-opacity',
  '--button-gloss-hover-opacity',
  '--button-gloss-active-opacity',
  '--button-gloss-enabled',
  '--glass-blur',
  '--glass-opacity',
  '--glass-gradient',
  '--glass-border',
  '--glass-shadow',
  '--card-backdrop',
  '--effect-neon',
  '--effect-shimmer',
  '--effect-tilt',
  '--glow-intensity',
  '--neon-primary',
  '--radius-card',
  '--component-outline-text',
  '--component-outline-bg',
  '--component-outline-border',
  '--component-outline-hover-bg',
  '--component-outline-hover-border',
  '--component-checkbox-border',
  '--component-checkbox-border-checked',
  '--component-checkbox-fill',
  '--component-checkbox-fill-checked',
  '--component-input-background',
  '--component-input-border'
]

export const useThemeState = () => {
  const defaultTheme = buildDefaultTheme()
  // Reactive theme state
  const theme = reactive<ThemeState>({ ...defaultTheme })

  // Save state
  const saveStatus = ref<SaveStatus>('idle')
  const saveMessage = ref('')

  // Glass mode status for UI display
  const glassModeStatus = ref<GlassModeStatus>('disabled')

  // Toggle effect helper
  const toggleEffect = (key: keyof ThemeState) => {
    const current = theme[key]
    if (typeof current === 'boolean') {
      ;(theme as unknown as Record<string, unknown>)[key] = !current
    }
  }

  // Reset theme to current CSS values (re-reads from active theme)
  const resetTheme = () => {
    const freshDefaults = buildDefaultTheme()
    Object.assign(theme, freshDefaults)
    saveStatus.value = 'idle'
    saveMessage.value = ''
  }

  // Update glass mode status for UI
  const updateGlassModeStatus = () => {
    const blur = parseFloat(theme.glassBlur)
    const opacity = parseFloat(theme.glassOpacity)
    glassModeStatus.value = (blur > 0 || opacity < 1) ? 'enabled' : 'disabled'
  }

  // Cleanup function for unmount
  const cleanup = () => {
    const root = document.documentElement
    CSS_VARS_TO_CLEAN.forEach(varName => {
      root.style.removeProperty(varName)
    })
    root.style.removeProperty('font-size')
    document.body.style.background = ''
  }

  return {
    theme,
    saveStatus,
    saveMessage,
    glassModeStatus,
    toggleEffect,
    resetTheme,
    updateGlassModeStatus,
    cleanup,
    defaultTheme,
    fallbackTheme
  }
}

export type { ThemeState }

/**
 * Theme Editor Types
 * Extracted from theme-editor.vue for modular architecture
 */

export type GlassGradientType = 'radial' | 'vertical' | 'diagonal' | 'corner'
export type PaletteMode = 'monochrome' | 'warm' | 'cool' | 'vibrant'
export type PageBackground = 'solid' | 'gradient' | 'image'
export type SaveStatus = 'idle' | 'saving' | 'success' | 'error'
export type GlassModeStatus = 'enabled' | 'disabled'

export interface ThemeState {
  // Base color scheme (2-color system)
  colorBackground: string
  colorForeground: string

  // Palette base (advanced mode)
  paletteBase: string
  paletteMode: PaletteMode

  // Colors
  bgPrimary: string
  bgSecondary: string
  textPrimary: string
  textMuted: string
  accent: string
  accentLight: string
  accentSolid: string
  accentText: string
  border: string
  borderFocus: string

  // Hover color
  hoverColor: string
  hoverOpacity: string

  // Semantic
  successBg: string
  successText: string
  warningBg: string
  warningText: string
  errorBg: string
  errorText: string
  infoBg: string
  infoText: string

  // Typography
  fontBase: string
  fontHeading: string
  fontMono: string
  fontSizeBase: string
  lineHeightBase: string
  fontWeightHeading: string

  // Spacing
  spacingBase: string
  radiusBase: string
  cardRadius: string
  cardRadius: string

  // Sizing & Scale
  uiScale: string

  // Interactions
  transitionSpeed: string
  inputPadding: string
  buttonPadding: string
  cardPadding: string

  // Gradient fills
  buttonGradient: string
  buttonGradientEnabled: boolean
  buttonGradientIntensity: string
  cardGradient: string
  cardGradientEnabled: boolean
  cardGradientIntensity: string
  shellGradient: string
  shellGradientEnabled: boolean
  buttonGlossGradient: string
  buttonGlossOpacity: string
  buttonGlossHoverOpacity: string
  buttonGlossActiveOpacity: string
  buttonGlossEnabled: boolean

  // Effects
  glassBlur: string
  glassOpacity: string
  glowIntensity: string
  glowColor: string
  animationScale: string

  // Glassmorphism effects
  glassGradient: string
  glassGradientType: GlassGradientType
  glassBorder: string
  glassShadow: string
  glassApplyToCards: boolean
  glassApplyToShell: boolean

  // Page background
  pageBackground: PageBackground

  // === ADVANCED EFFECTS ===

  // Neon effects
  neonEnabled: boolean
  neonColor: string
  neonIntensity: string
  neonPulse: boolean

  // 3D/Tilt effects
  tiltEnabled: boolean
  tiltIntensity: string
  tiltPerspective: string

  // Gradient borders
  gradientBorderEnabled: boolean
  gradientBorderIntensity: string
  gradientBorderAnimated: boolean
  gradientBorderSpeed: string

  // Shimmer
  shimmerEnabled: boolean
  shimmerIntensity: string

  // Noise texture
  noiseEnabled: boolean
  noiseOpacity: string

  // === EXTENDED EFFECTS ===
  // Animations
  animatedGradient: boolean
  parallaxEnabled: boolean
  rippleEnabled: boolean

  // Visual
  frostedGlass: boolean

  // Background
  meshGradient: boolean
  particleGrid: boolean
  blobShapes: boolean

  // Interactivity
  mouseGlow: boolean
  magneticButtons: boolean
  cards3D: boolean

  // Component overrides
  outlineText: string
  outlineBackground: string
  outlineBorder: string
  outlineHoverBackground: string
  outlineHoverBorder: string
  checkboxBorder: string
  checkboxBorderChecked: string
  checkboxFill: string
  checkboxFillChecked: string
  inputBackground: string
  inputBorderColor: string
}

// Preset types
export type StylePresetName = 'dark' | 'light' | 'blue' | 'purple' | 'green' | 'orange' | 'rose' | 'monochrome'
export type GlassPresetName = 'off' | 'subtle' | 'frosted' | 'neon' | 'cyber'
export type NeonPresetName = 'off' | 'blue' | 'purple' | 'green' | 'orange' | 'multicolor'
export type TiltPresetName = 'off' | 'subtle' | 'medium' | 'strong'
export type BorderPresetName = 'off' | 'rainbow' | 'neon' | 'sunset'

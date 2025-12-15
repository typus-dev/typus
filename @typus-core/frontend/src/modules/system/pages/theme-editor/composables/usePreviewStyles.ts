/**
 * Preview Styles Composable
 * Creates isolated CSS custom properties for theme preview
 * Applied via :style binding - does NOT affect global document styles
 */

import { computed } from 'vue'
import type { ThemeState } from '../types/theme.types'
import { parseColor, toRgb } from './useThemeColors'

export const usePreviewStyles = (theme: ThemeState) => {
  const previewStyles = computed(() => {
    // Helper to compute hover rgba
    const hoverRgb = toRgb(theme.hoverColor)
    const hoverRgba = `rgba(${hoverRgb.r}, ${hoverRgb.g}, ${hoverRgb.b}, ${theme.hoverOpacity})`

    // Gradient fills
    const buttonPrimaryFill = theme.buttonGradientEnabled && theme.buttonGradient
      ? theme.buttonGradient
      : parseColor(theme.accentSolid)
    const buttonSecondaryFill = theme.buttonGradientEnabled && theme.buttonGradient
      ? theme.buttonGradient
      : parseColor(theme.bgSecondary)
    const cardSurfaceFill = theme.cardGradientEnabled && theme.cardGradient
      ? theme.cardGradient
      : parseColor(theme.bgSecondary)
    const appBackgroundFill = theme.shellGradientEnabled && theme.shellGradient
      ? theme.shellGradient
      : parseColor(theme.bgPrimary)

    // Glassmorphism computed values
    const glassBlur = parseFloat(theme.glassBlur) || 0
    const glassOpacity = parseFloat(theme.glassOpacity) || 1
    const gradientStrength = Math.min(Math.max(parseFloat(theme.glassGradient) || 0, 0), 1)
    const borderBrightness = parseFloat(theme.glassBorder) || 0.5
    const borderOpacity = Math.min(borderBrightness * 0.2, 0.4)

    // Glass shadow computed
    const shadowDepth = parseFloat(theme.glassShadow) || 0
    const shadowSize = shadowDepth * 20
    const shadowOpacity = shadowDepth * 0.4
    const bgRgb = toRgb(theme.bgPrimary)
    const insetOpacity = shadowDepth * 0.05
    const glassShadow = shadowDepth > 0
      ? `0 ${shadowSize}px ${shadowSize * 2}px rgba(0, 0, 0, ${shadowOpacity}), inset 0 0 40px rgba(${bgRgb.r}, ${bgRgb.g}, ${bgRgb.b}, ${insetOpacity})`
      : 'none'

    // Glass gradient based on type
    let glassGradient = 'none'
    if (gradientStrength > 0) {
      const spotOpacity1 = gradientStrength * 0.08
      const spotOpacity2 = gradientStrength * 0.05
      const gradientType = theme.glassGradientType || 'radial'

      switch (gradientType) {
        case 'vertical':
          glassGradient = `linear-gradient(to bottom, rgba(255, 255, 255, ${spotOpacity1}) 0%, transparent 30%, transparent 70%, rgba(255, 255, 255, ${spotOpacity2}) 100%)`
          break
        case 'diagonal':
          glassGradient = `linear-gradient(135deg, rgba(255, 255, 255, ${spotOpacity1}) 0%, transparent 40%, transparent 60%, rgba(255, 255, 255, ${spotOpacity2}) 100%)`
          break
        case 'corner':
          glassGradient = `linear-gradient(135deg, rgba(255, 255, 255, ${spotOpacity1 * 1.5}) 0%, transparent 25%), linear-gradient(315deg, rgba(255, 255, 255, ${spotOpacity2 * 1.5}) 0%, transparent 25%)`
          break
        case 'radial':
        default:
          glassGradient = `radial-gradient(circle at 20% 30%, rgba(255, 255, 255, ${spotOpacity1}) 0%, transparent 50%), radial-gradient(circle at 80% 70%, rgba(255, 255, 255, ${spotOpacity2}) 0%, transparent 50%)`
          break
      }
    }

    // Neon colors
    const neonPrimary = parseColor(theme.neonColor)
    const neonSecondary = parseColor('#a78bfa')

    return {
      // ========== TEXT COLORS ==========
      '--color-text-primary': parseColor(theme.textPrimary),
      '--color-text-secondary': parseColor(theme.textMuted),
      '--color-text-tertiary': parseColor(theme.textMuted),
      '--color-text-accent': parseColor(theme.accent),
      '--color-text-contrast': parseColor(theme.accentText),
      '--color-text-success': parseColor(theme.successText),
      '--color-text-warning': parseColor(theme.warningText),
      '--color-text-error': parseColor(theme.errorText),
      '--color-text-info': parseColor(theme.infoText),

      // ========== BACKGROUND COLORS ==========
      '--color-bg-primary': parseColor(theme.bgPrimary),
      '--color-bg-secondary': parseColor(theme.bgSecondary),
      '--color-bg-tertiary': parseColor(theme.bgSecondary),
      '--color-bg-accent': parseColor(theme.accentLight),
      '--color-bg-accent-solid': parseColor(theme.accentSolid),
      '--color-bg-hover': hoverRgba,
      '--color-bg-success': parseColor(theme.successBg),
      '--color-bg-warning': parseColor(theme.warningBg),
      '--color-bg-error': parseColor(theme.errorBg),
      '--color-bg-info': parseColor(theme.infoBg),
      '--button-primary-fill': buttonPrimaryFill,
      '--button-secondary-fill': buttonSecondaryFill,
      '--button-gradient-active': theme.buttonGradientEnabled ? '1' : '0',
      '--card-surface-fill': cardSurfaceFill,
      '--card-gradient-active': theme.cardGradientEnabled ? '1' : '0',
      '--app-background-fill': appBackgroundFill,
      '--app-background-gradient-active': theme.shellGradientEnabled ? '1' : '0',
      '--button-gradient-intensity': theme.buttonGradientIntensity || '1',
      '--card-gradient-intensity': theme.cardGradientIntensity || '1',
      '--button-gloss-gradient': theme.buttonGlossGradient,
      '--button-gloss-opacity': theme.buttonGlossOpacity || '0',
      '--button-gloss-hover-opacity': theme.buttonGlossHoverOpacity || theme.buttonGlossOpacity || '0',
      '--button-gloss-active-opacity': theme.buttonGlossActiveOpacity || '0',
      '--button-gloss-enabled': theme.buttonGlossEnabled ? '1' : '0',

      // ========== BORDERS ==========
      '--color-border-primary': parseColor(theme.border),
      '--color-border-secondary': parseColor(theme.border),
      '--color-border-focus': parseColor(theme.borderFocus),
      '--color-ring-focus': parseColor(theme.borderFocus),

      // ========== TYPOGRAPHY ==========
      '--font-family-base': theme.fontBase,
      '--font-family-heading': theme.fontHeading,
      '--font-family-mono': theme.fontMono,
      '--font-size-base': `${theme.fontSizeBase}rem`,
      '--line-height-base': theme.lineHeightBase,
      '--font-weight-heading': theme.fontWeightHeading,
      'fontFamily': theme.fontBase,
      'fontSize': `${theme.fontSizeBase}rem`,
      'lineHeight': theme.lineHeightBase,

      // ========== SPACING ==========
      '--spacing-base': `${theme.spacingBase}rem`,
      '--input-padding': theme.inputPadding,
      '--button-padding': theme.buttonPadding,
      '--card-padding': theme.cardPadding,

      // ========== RADIUS ==========
      '--radius-sm': `calc(${theme.radiusBase}rem * 0.5)`,
      '--radius-md': `${theme.radiusBase}rem`,
      '--radius-lg': `calc(${theme.radiusBase}rem * 1.5)`,
      '--radius-xl': `calc(${theme.radiusBase}rem * 2)`,
      '--radius-button': `${theme.radiusBase}rem`,
      '--radius-card': `${theme.cardRadius}rem`,

      // ========== TRANSITIONS ==========
      '--transition-fast': `${theme.transitionSpeed}ms cubic-bezier(0.4, 0, 0.2, 1)`,

      // ========== GLASSMORPHISM ==========
      '--glass-blur': `${glassBlur}px`,
      '--glass-opacity': String(glassOpacity),
      '--glass-gradient': glassGradient,
      '--glass-gradient-strength': String(gradientStrength),
      '--glass-border': `rgba(255, 255, 255, ${borderOpacity})`,
      '--glass-shadow': glassShadow,
      '--glass-apply-to-cards': theme.glassApplyToCards ? '1' : '0',
      '--glass-apply-to-shell': theme.glassApplyToShell ? '1' : '0',
      '--card-backdrop': glassBlur > 0 ? `blur(${glassBlur}px)` : 'none',
      '--card-bg-opacity': String(glassOpacity),
      '--glow-intensity': theme.glowIntensity,
      '--glow-color': parseColor(theme.glowColor),

      // ========== EFFECT FLAGS ==========
      '--effect-neon': theme.neonEnabled ? '1' : '0',
      '--effect-shimmer': theme.shimmerEnabled ? '1' : '0',
      '--effect-tilt': theme.tiltEnabled ? '1' : '0',
      '--effect-button-glow': theme.neonEnabled ? '1' : '0',
      '--effect-heading-glow': theme.neonEnabled ? '1' : '0',
      '--effect-input-glow': theme.neonEnabled ? '1' : '0',

      // ========== EFFECT COLORS ==========
      '--neon-primary': neonPrimary,
      '--neon-secondary': neonSecondary,

      // ========== TILT ==========
      '--tilt-perspective': `${theme.tiltPerspective}px`,

      // ========== COMPONENT OVERRIDES ==========
      '--component-outline-text': parseColor(theme.outlineText),
      '--component-outline-bg': parseColor(theme.outlineBackground),
      '--component-outline-border': parseColor(theme.outlineBorder),
      '--component-outline-hover-bg': parseColor(theme.outlineHoverBackground),
      '--component-outline-hover-border': parseColor(theme.outlineHoverBorder),
      '--component-checkbox-border': parseColor(theme.checkboxBorder),
      '--component-checkbox-border-checked': parseColor(theme.checkboxBorderChecked),
      '--component-checkbox-fill': parseColor(theme.checkboxFill),
      '--component-checkbox-fill-checked': parseColor(theme.checkboxFillChecked),
      '--component-input-background': parseColor(theme.inputBackground),
      '--component-input-border': parseColor(theme.inputBorderColor)
    }
  })

  return { previewStyles }
}

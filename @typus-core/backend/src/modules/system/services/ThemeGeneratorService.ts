import { injectable } from 'tsyringe';
import path from 'path';
import fs from 'fs';

/**
 * ThemeGeneratorService - Generates CSS themes from parameters
 * All logic is built-in, no external scripts needed
 */
@injectable()
export class ThemeGeneratorService {
  private projectRoot: string;
  private themesDir: string;
  private templateDir: string;

  constructor() {
    this.projectRoot = process.env.PROJECT_ROOT || '/app';
    this.themesDir = path.join(this.projectRoot, 'public/styles/themes');
    this.templateDir = path.join(this.projectRoot, 'public/styles/_template');
  }

  /**
   * Generate theme from parameters
   */
  async generateTheme(params: ThemeParams): Promise<ThemeGenerationResult> {
    const { name, overwrite = false } = params;

    // Validate name
    if (!name || !/^[a-z0-9-]+$/.test(name)) {
      return {
        success: false,
        message: 'Invalid theme name. Use only lowercase letters, numbers, and hyphens.'
      };
    }

    // Check if theme exists
    const themeDir = path.join(this.themesDir, name);
    if (fs.existsSync(themeDir) && !overwrite) {
      return {
        success: false,
        message: `Theme "${name}" already exists. Set overwrite=true to replace it.`
      };
    }

    // Validate required params
    const required = ['name', 'bgPrimary', 'textPrimary', 'accent'];
    for (const field of required) {
      if (!params[field as keyof ThemeParams]) {
        return {
          success: false,
          message: `Missing required field: ${field}`
        };
      }
    }

    try {
      // Generate tokens
      const tokens = this.generateTokens(params);

      // Create output directory
      if (!fs.existsSync(themeDir)) {
        fs.mkdirSync(themeDir, { recursive: true });
      }

      // Generate 00-tokens.css
      const tokensCSS = this.generateTokensCSS(tokens);
      fs.writeFileSync(path.join(themeDir, '00-tokens.css'), tokensCSS);

      // Copy and transform template CSS files
      if (fs.existsSync(this.templateDir)) {
        const refFiles = fs.readdirSync(this.templateDir)
          .filter(f => f.endsWith('.css') && f !== '00-tokens.css');

        for (const file of refFiles) {
          let content = fs.readFileSync(path.join(this.templateDir, file), 'utf8');
          // Replace template selector with theme name
          content = content.replace(/\[data-theme="_template"\]/g, `[data-theme="${name}"]`);
          fs.writeFileSync(path.join(themeDir, file), content, { mode: 0o664 });
        }
      }

      // Generate manifest
      const manifest = {
        name,
        title: name.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
        type: this.isDarkTheme(params.bgPrimary) ? 'dark' : 'light',
        icon: 'ri:brush-line',
        version: '1.0.0',
        description: `Generated theme: ${name}`,
        author: 'Theme Editor',
        generated: new Date().toISOString()
      };

      fs.writeFileSync(
        path.join(themeDir, 'manifest.json'),
        JSON.stringify(manifest, null, 2)
      );

      // Regenerate themes manifest
      await this.regenerateManifest();

      return {
        success: true,
        message: `Theme "${name}" generated successfully`,
        themePath: themeDir
      };
    } catch (error: any) {
      logger.error('[ThemeGenerator] Error:', error);
      return {
        success: false,
        message: `Failed to generate theme: ${error.message}`
      };
    }
  }

  /**
   * Generate all token values from parameters
   */
  private generateTokens(config: ThemeParams): Record<string, string> {
    const dark = this.isDarkTheme(config.bgPrimary);

    // Compute derived values
    const accent = config.accent;
    const accentSolid = config.accentSolid || accent;
    const accentLight = config.accentLight || (dark ? this.darken(accent, 0.7) : this.lighten(accent, 0.9));
    const accentText = config.accentText || '#ffffff';
    const accentGlow = config.accentGlow || this.withAlpha(accent, 0.15);

    const success = config.success || '#22c55e';
    const successLight = config.successLight || (dark ? this.darken(success, 0.7) : this.lighten(success, 0.9));

    const warning = config.warning || '#f59e0b';
    const warningLight = config.warningLight || (dark ? this.darken(warning, 0.7) : this.lighten(warning, 0.9));

    const error = config.error || '#ef4444';
    const errorLight = config.errorLight || (dark ? this.darken(error, 0.7) : this.lighten(error, 0.9));

    const info = config.info || '#3b82f6';
    const infoLight = config.infoLight || (dark ? this.darken(info, 0.7) : this.lighten(info, 0.9));

    const bgSecondary = config.bgSecondary || (dark ? this.lighten(config.bgPrimary, 0.05) : '#ffffff');
    const bgTertiary = config.bgTertiary || (dark ? this.lighten(config.bgPrimary, 0.1) : this.darken(bgSecondary, 0.03));
    const surface = config.surface || bgSecondary;

    const textMuted = config.textMuted || config.textSecondary || (dark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)');

    const border = config.border || (dark ? '#374151' : '#e4e4e7');
    const borderLight = config.borderLight || (dark ? this.darken(border, 0.2) : this.lighten(border, 0.3));

    // Spacing & sizing
    const radiusBase = config.radiusBase || '0.5rem';
    const buttonRadius = config.buttonRadius || radiusBase;
    const spacingBase = config.spacingBase || '1rem';
    const inputPadding = config.inputPadding || '0.5rem 0.75rem';
    const buttonPadding = config.buttonPadding || '0.625rem 1rem';
    const cardPadding = config.cardPadding || '1.5rem';

    // Component options
    const navActiveStyle = config.navActiveStyle || 'light';
    const focusRingWidth = config.focusRingWidth || '2px';
    const cardBorder = config.cardBorder || '1px';
    const inputBorder = config.inputBorder || '1px';

    // Interactions
    const hoverScale = config.hoverScale || '1';
    const hoverBrightness = config.hoverBrightness || '1';
    const hoverTranslateY = config.hoverTranslateY || '0';
    const transitionSpeed = config.transitionSpeed || '150ms';

    // Outline + checkbox + inputs
    const outlineText = config.outlineText || config.textPrimary || '#0f172a';
    const outlineBackground = config.outlineBackground || surface;
    const outlineBorder = config.outlineBorder || border;
    const outlineHoverBackground = config.outlineHoverBackground || accentLight;
    const outlineHoverBorder = config.outlineHoverBorder || accent;

    const checkboxBorder = config.checkboxBorder || borderLight;
    const checkboxBorderChecked = config.checkboxBorderChecked || accent;
    const checkboxFill = config.checkboxFill || 'transparent';
    const checkboxFillChecked = config.checkboxFillChecked || accent;

    const inputBackground = config.inputBackground || surface;
    const inputBorderColor = config.inputBorderColor || borderLight;

    const cardRadiusValue = config.cardRadius || `calc(${radiusBase} * 2)`;

    // Gradient controls
    const buttonGradientActive = Boolean(config.buttonGradientEnabled && config.buttonGradient);
    const cardGradientActive = Boolean(config.cardGradientEnabled && config.cardGradient);
    const shellGradientActive = Boolean(config.shellGradientEnabled && config.shellGradient);

    const buttonFillPrimary = buttonGradientActive ? config.buttonGradient! : accentSolid;
    const buttonFillSecondary = buttonGradientActive ? config.buttonGradient! : bgSecondary;
    const cardSurfaceFill = cardGradientActive ? config.cardGradient! : surface;
    const appBackgroundFill = shellGradientActive ? config.shellGradient! : config.bgPrimary;
    const buttonGradientIntensity = config.buttonGradientIntensity || '1';
    const cardGradientIntensity = config.cardGradientIntensity || '1';

    const buttonGlossGradient = config.buttonGlossGradient || 'radial-gradient(circle at 20% 20%, rgba(255, 255, 255, 0.45), transparent 55%), radial-gradient(circle at 80% 0%, rgba(255, 255, 255, 0.15), transparent 65%), linear-gradient(135deg, rgba(255, 255, 255, 0.35), rgba(255, 255, 255, 0.05))';
    const buttonGlossOpacity = config.buttonGlossOpacity || '0.35';
    const buttonGlossHoverOpacity = config.buttonGlossHoverOpacity || '0.55';
    const buttonGlossActiveOpacity = config.buttonGlossActiveOpacity || '0.25';
    const buttonGlossEnabled = config.buttonGlossEnabled !== undefined ? config.buttonGlossEnabled : true;

    return {
      name: config.name,
      'color-text-primary': config.textPrimary,
      'color-text-secondary': textMuted,
      'color-text-tertiary': dark ? this.lighten(textMuted, 0.3) : this.darken(textMuted, 0.4),
      'color-text-disabled': dark ? this.lighten(textMuted, 0.5) : this.darken(textMuted, 0.5),
      'color-text-contrast': dark ? '#000000' : '#ffffff',
      'color-text-accent': accent,
      'color-text-on-accent': accentText,
      'color-text-success': success,
      'color-text-on-success': '#ffffff',
      'color-text-warning': warning,
      'color-text-error': error,
      'color-text-info': info,

      'color-bg-primary': config.bgPrimary,
      'color-bg-secondary': bgSecondary,
      'color-bg-tertiary': bgTertiary,
      'color-bg-surface': surface,
      'color-bg-hover': dark ? this.withAlpha('#ffffff', 0.05) : this.darken(bgSecondary, 0.05),
      'color-bg-disabled': dark ? this.lighten(config.bgPrimary, 0.1) : this.darken(bgSecondary, 0.1),

      'color-bg-accent': navActiveStyle === 'light' ? accentLight : accent,
      'color-bg-accent-solid': accentSolid,
      'color-bg-accent-light': accentLight,
      'color-bg-accent-hover': dark ? this.lighten(accent, 0.1) : this.darken(accent, 0.1),
      'color-bg-accent-glow': accentGlow,

      'color-bg-success': success,
      'color-bg-success-light': successLight,
      'color-bg-success-hover': dark ? this.lighten(success, 0.1) : this.darken(success, 0.1),
      'color-bg-warning': warning,
      'color-bg-warning-light': warningLight,
      'color-bg-warning-hover': dark ? this.lighten(warning, 0.1) : this.darken(warning, 0.1),
      'color-bg-error': error,
      'color-bg-error-light': errorLight,
      'color-bg-error-hover': dark ? this.lighten(error, 0.1) : this.darken(error, 0.1),
      'color-bg-info': info,
      'color-bg-info-light': infoLight,
      'color-bg-info-hover': dark ? this.lighten(info, 0.1) : this.darken(info, 0.1),

      'color-border-primary': border,
      'color-border-secondary': borderLight,
      'color-border-tertiary': dark ? this.darken(border, 0.4) : this.lighten(border, 0.5),
      'color-border-disabled': dark ? this.darken(border, 0.3) : this.lighten(border, 0.4),
      'color-border-focus': border,
      'color-border-error': error,
      'color-border-info': info,
      'color-border-success': success,
      'color-border-warning': warning,

      'color-ring-focus': this.withAlpha(accent, 0.5),
      'color-ring-error': this.withAlpha(error, 0.5),
      'color-ring-offset': config.bgPrimary,

      'color-accent-primary': accent,
      'color-accent-secondary': config.accentSecondary || (dark ? this.lighten(accent, 0.2) : this.darken(accent, 0.1)),

      'shadow-sm': config.shadowSm !== undefined ? config.shadowSm : 'none',
      'shadow-md': config.shadowMd !== undefined ? config.shadowMd : 'none',
      'shadow-lg': config.shadowLg !== undefined ? config.shadowLg : 'none',
      'shadow-xl': config.shadowXl !== undefined ? config.shadowXl : 'none',
      'shadow-accent': config.shadowAccent || `0 4px 20px ${accentGlow}`,

      'font-family-base': config.fontBase || "'Inter', system-ui, sans-serif",
      'font-family-heading': config.fontHeading || config.fontBase || "'Inter', system-ui, sans-serif",
      'font-family-mono': config.fontMono || "'JetBrains Mono', monospace",
      'font-size-base': config.fontSizeBase || '1rem',
      'line-height-base': config.lineHeightBase || '1.5',
      'font-weight-heading': config.fontWeightHeading || '600',

      'radius-base': radiusBase,
      'radius-button': buttonRadius,
      'radius-card': cardRadiusValue,
      'spacing-base': spacingBase,
      'input-padding': inputPadding,
      'button-padding': buttonPadding,
      'card-padding': cardPadding,

      'focus-ring-width': focusRingWidth,
      'card-border-width': cardBorder,
      'input-border-width': inputBorder,

      'hover-scale': hoverScale,
      'hover-brightness': hoverBrightness,
      'hover-translate-y': hoverTranslateY,
      'transition-speed': transitionSpeed,

      // Gradient fills
      'button-fill-primary': buttonFillPrimary,
      'button-fill-secondary': buttonFillSecondary,
      'button-gradient-active': buttonGradientActive ? '1' : '0',
      'card-surface-fill': cardSurfaceFill,
      'card-gradient-active': cardGradientActive ? '1' : '0',
      'app-background-fill': appBackgroundFill,
      'app-background-gradient-active': shellGradientActive ? '1' : '0',
      'button-gradient-intensity': buttonGradientIntensity,
      'card-gradient-intensity': cardGradientIntensity,
      'button-gloss-gradient': buttonGlossGradient,
      'button-gloss-opacity': buttonGlossOpacity,
      'button-gloss-hover-opacity': buttonGlossHoverOpacity,
      'button-gloss-active-opacity': buttonGlossActiveOpacity,
      'button-gloss-enabled': buttonGlossEnabled ? '1' : '0',
      'component-outline-text': outlineText,
      'component-outline-bg': outlineBackground,
      'component-outline-border': outlineBorder,
      'component-outline-hover-bg': outlineHoverBackground,
      'component-outline-hover-border': outlineHoverBorder,
      'component-checkbox-border': checkboxBorder,
      'component-checkbox-border-checked': checkboxBorderChecked,
      'component-checkbox-fill': checkboxFill,
      'component-checkbox-fill-checked': checkboxFillChecked,
      'component-input-background': inputBackground,
      'component-input-border': inputBorderColor,

      // Glassmorphism - compute actual CSS values (mirrors theme-editor.vue applyTheme())
      ...this.computeGlassmorphismTokens(config, bgSecondary, config.bgPrimary),

      // Effect flags (0 = disabled, 1 = enabled)
      'effect-neon': config.neonEnabled ? '1' : '0',
      'effect-shimmer': config.shimmerEnabled ? '1' : '0',
      'effect-tilt': config.tiltEnabled ? '1' : '0',
      'effect-magnetic': config.magneticEnabled ? '1' : '0',
      'effect-glow-badges': config.glowBadgesEnabled ? '1' : '0',
      'effect-neon-scrollbar': config.neonScrollbarEnabled ? '1' : '0',
      'effect-link-glow': config.linkGlowEnabled ? '1' : '0',
      'effect-table-glow': config.tableGlowEnabled ? '1' : '0',
      'effect-progress-glow': config.progressGlowEnabled ? '1' : '0',
      'effect-input-glow': config.inputGlowEnabled ? '1' : '0',
      'effect-modal-glass': config.modalGlassEnabled ? '1' : '0',
      'effect-dropdown-glass': config.dropdownGlassEnabled ? '1' : '0',
      'effect-checkbox-glow': config.checkboxGlowEnabled ? '1' : '0',
      'effect-heading-glow': config.headingGlowEnabled ? '1' : '0',
      'effect-button-glow': config.buttonGlowEnabled ? '1' : '0',

      // Effect colors
      'neon-primary': config.neonPrimary || 'rgba(96, 165, 250, 0.5)',
      'neon-secondary': config.neonSecondary || 'rgba(167, 139, 250, 0.5)'
    };
  }

  /**
   * Generate 00-tokens.css content
   */
  private generateTokensCSS(tokens: Record<string, string>): string {
    return `/* 00 - Tokens: CSS custom properties for ${tokens.name} */
[data-theme="${tokens.name}"] {
  /* Text colors */
  --color-text-primary: ${tokens['color-text-primary']};
  --color-text-secondary: ${tokens['color-text-secondary']};
  --color-text-tertiary: ${tokens['color-text-tertiary']};
  --color-text-disabled: ${tokens['color-text-disabled']};
  --color-text-contrast: ${tokens['color-text-contrast']};
  --color-text-accent: ${tokens['color-text-accent']};
  --color-text-on-accent: ${tokens['color-text-on-accent']};
  --color-text-success: ${tokens['color-text-success']};
  --color-text-on-success: ${tokens['color-text-on-success']};
  --color-text-warning: ${tokens['color-text-warning']};
  --color-text-error: ${tokens['color-text-error']};
  --color-text-info: ${tokens['color-text-info']};

  /* Background colors */
  --color-bg-primary: ${tokens['color-bg-primary']};
  --color-bg-secondary: ${tokens['color-bg-secondary']};
  --color-bg-tertiary: ${tokens['color-bg-tertiary']};
  --color-bg-surface: ${tokens['color-bg-surface']};
  --color-bg-hover: ${tokens['color-bg-hover']};
  --color-bg-disabled: ${tokens['color-bg-disabled']};

  /* Accent backgrounds */
  --color-bg-accent: ${tokens['color-bg-accent']};
  --color-bg-accent-solid: ${tokens['color-bg-accent-solid']};
  --color-bg-accent-light: ${tokens['color-bg-accent-light']};
  --color-bg-accent-hover: ${tokens['color-bg-accent-hover']};
  --color-bg-accent-glow: ${tokens['color-bg-accent-glow']};

  /* Semantic backgrounds */
  --color-bg-success: ${tokens['color-bg-success']};
  --color-bg-success-light: ${tokens['color-bg-success-light']};
  --color-bg-success-hover: ${tokens['color-bg-success-hover']};
  --color-bg-warning: ${tokens['color-bg-warning']};
  --color-bg-warning-light: ${tokens['color-bg-warning-light']};
  --color-bg-warning-hover: ${tokens['color-bg-warning-hover']};
  --color-bg-error: ${tokens['color-bg-error']};
  --color-bg-error-light: ${tokens['color-bg-error-light']};
  --color-bg-error-hover: ${tokens['color-bg-error-hover']};
  --color-bg-info: ${tokens['color-bg-info']};
  --color-bg-info-light: ${tokens['color-bg-info-light']};
  --color-bg-info-hover: ${tokens['color-bg-info-hover']};

  /* Border colors */
  --color-border-primary: ${tokens['color-border-primary']};
  --color-border-secondary: ${tokens['color-border-secondary']};
  --color-border-tertiary: ${tokens['color-border-tertiary']};
  --color-border-disabled: ${tokens['color-border-disabled']};
  --color-border-focus: ${tokens['color-border-focus']};
  --color-border-error: ${tokens['color-border-error']};
  --color-border-info: ${tokens['color-border-info']};
  --color-border-success: ${tokens['color-border-success']};
  --color-border-warning: ${tokens['color-border-warning']};

  /* Ring colors */
  --color-ring-focus: ${tokens['color-ring-focus']};
  --color-ring-error: ${tokens['color-ring-error']};
  --color-ring-offset: ${tokens['color-ring-offset']};

  /* Accent colors */
  --color-accent-primary: ${tokens['color-accent-primary']};
  --color-accent-secondary: ${tokens['color-accent-secondary']};

  /* Spacing */
  --spacing-xs: 0.25rem;
  --spacing-sm: 0.5rem;
  --spacing-md: ${tokens['spacing-base']};
  --spacing-lg: 1.5rem;
  --spacing-xl: 2rem;
  --spacing-2xl: 3rem;
  --spacing-3xl: 4rem;
  --spacing-4xl: 6rem;
  --spacing-5xl: 8rem;

  /* Component spacing */
  --input-padding: ${tokens['input-padding']};
  --button-padding: ${tokens['button-padding']};
  --card-padding: ${tokens['card-padding']};

  /* Border radius */
  --radius-sm: calc(${tokens['radius-base']} * 0.5);
  --radius-md: ${tokens['radius-base']};
  --radius-lg: calc(${tokens['radius-base']} * 1.5);
  --radius-xl: calc(${tokens['radius-base']} * 2);
  --radius-full: 9999px;
  --radius-button: ${tokens['radius-button']};
  --radius-card: ${tokens['radius-card']};

  /* Shadows */
  --shadow-sm: ${tokens['shadow-sm']};
  --shadow-md: ${tokens['shadow-md']};
  --shadow-lg: ${tokens['shadow-lg']};
  --shadow-xl: ${tokens['shadow-xl']};
  --shadow-accent: ${tokens['shadow-accent']};

  /* Typography */
  --font-family-base: ${tokens['font-family-base']};
  --font-family-heading: ${tokens['font-family-heading']};
  --font-family-mono: ${tokens['font-family-mono']};
  --font-size-base: ${tokens['font-size-base']};
  --line-height-base: ${tokens['line-height-base']};
  --font-weight-heading: ${tokens['font-weight-heading']};

  /* Component settings */
  --focus-ring-width: ${tokens['focus-ring-width']};
  --card-border-width: ${tokens['card-border-width']};
  --input-border-width: ${tokens['input-border-width']};
  --component-outline-text: ${tokens['component-outline-text']};
  --component-outline-bg: ${tokens['component-outline-bg']};
  --component-outline-border: ${tokens['component-outline-border']};
  --component-outline-hover-bg: ${tokens['component-outline-hover-bg']};
  --component-outline-hover-border: ${tokens['component-outline-hover-border']};
  --component-checkbox-border: ${tokens['component-checkbox-border']};
  --component-checkbox-border-checked: ${tokens['component-checkbox-border-checked']};
  --component-checkbox-fill: ${tokens['component-checkbox-fill']};
  --component-checkbox-fill-checked: ${tokens['component-checkbox-fill-checked']};
  --component-input-background: ${tokens['component-input-background']};
  --component-input-border: ${tokens['component-input-border']};

  /* Transitions */
  --transition-fast: ${tokens['transition-speed']} cubic-bezier(0.4, 0, 0.2, 1);
  --transition-normal: 300ms cubic-bezier(0.4, 0, 0.2, 1);
  --transition-slow: 500ms cubic-bezier(0.4, 0, 0.2, 1);

  /* Interaction effects */
  --hover-scale: ${tokens['hover-scale']};
  --hover-brightness: ${tokens['hover-brightness']};
  --hover-translate-y: ${tokens['hover-translate-y']};

  /* Gradient controls */
  --button-primary-fill: ${tokens['button-fill-primary']};
  --button-secondary-fill: ${tokens['button-fill-secondary']};
  --button-gradient-active: ${tokens['button-gradient-active']};
  --card-surface-fill: ${tokens['card-surface-fill']};
  --card-gradient-active: ${tokens['card-gradient-active']};
  --app-background-fill: ${tokens['app-background-fill']};
  --app-background-gradient-active: ${tokens['app-background-gradient-active']};
  --button-gradient-intensity: ${tokens['button-gradient-intensity']};
  --card-gradient-intensity: ${tokens['card-gradient-intensity']};
  --button-gloss-gradient: ${tokens['button-gloss-gradient']};
  --button-gloss-opacity: ${tokens['button-gloss-opacity']};
  --button-gloss-hover-opacity: ${tokens['button-gloss-hover-opacity']};
  --button-gloss-active-opacity: ${tokens['button-gloss-active-opacity']};
  --button-gloss-enabled: ${tokens['button-gloss-enabled']};

  /* Glassmorphism - computed CSS values */
  --glass-blur: ${tokens['glass-blur']};
  --glass-opacity: ${tokens['glass-opacity']};
  --glass-gradient: ${tokens['glass-gradient']};
  --glass-gradient-strength: ${tokens['glass-gradient-strength']};
  --glass-border: ${tokens['glass-border']};
  --glass-shadow: ${tokens['glass-shadow']};
  --glass-card-overlay: ${tokens['glass-card-overlay']};
  --card-backdrop: ${tokens['card-backdrop']};
  --card-bg-opacity: ${tokens['card-bg-opacity']};
  --glow-intensity: ${tokens['glow-intensity']};
  --glass-apply-to-cards: ${tokens['glass-apply-to-cards']};
  --glass-apply-to-shell: ${tokens['glass-apply-to-shell']};
  --color-bg-secondary-glass: ${tokens['color-bg-secondary-glass']};
  --color-bg-primary-glass: ${tokens['color-bg-primary-glass']};

  /* Effect flags (0 = disabled, 1 = enabled) */
  --effect-neon: ${tokens['effect-neon']};
  --effect-shimmer: ${tokens['effect-shimmer']};
  --effect-tilt: ${tokens['effect-tilt']};
  --effect-magnetic: ${tokens['effect-magnetic']};
  --effect-glow-badges: ${tokens['effect-glow-badges']};
  --effect-neon-scrollbar: ${tokens['effect-neon-scrollbar']};
  --effect-link-glow: ${tokens['effect-link-glow']};
  --effect-table-glow: ${tokens['effect-table-glow']};
  --effect-progress-glow: ${tokens['effect-progress-glow']};
  --effect-input-glow: ${tokens['effect-input-glow']};
  --effect-modal-glass: ${tokens['effect-modal-glass']};
  --effect-dropdown-glass: ${tokens['effect-dropdown-glass']};
  --effect-checkbox-glow: ${tokens['effect-checkbox-glow']};
  --effect-heading-glow: ${tokens['effect-heading-glow']};
  --effect-button-glow: ${tokens['effect-button-glow']};

  /* Effect colors */
  --neon-primary: ${tokens['neon-primary']};
  --neon-secondary: ${tokens['neon-secondary']};
}
`;
  }

  // Color utilities
  private parseColor(color: string): { r: number; g: number; b: number; a: number } | null {
    const hexResult = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(color);
    if (hexResult) {
      return {
        r: parseInt(hexResult[1], 16),
        g: parseInt(hexResult[2], 16),
        b: parseInt(hexResult[3], 16),
        a: 1
      };
    }

    const rgbaResult = /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+))?\s*\)/i.exec(color);
    if (rgbaResult) {
      return {
        r: parseInt(rgbaResult[1]),
        g: parseInt(rgbaResult[2]),
        b: parseInt(rgbaResult[3]),
        a: rgbaResult[4] ? parseFloat(rgbaResult[4]) : 1
      };
    }

    return null;
  }

  private colorToString(color: { r: number; g: number; b: number; a: number }): string {
    if (color.a < 1) {
      return `rgba(${Math.round(color.r)}, ${Math.round(color.g)}, ${Math.round(color.b)}, ${color.a})`;
    }
    return '#' + [color.r, color.g, color.b].map(x => {
      const hex = Math.round(Math.max(0, Math.min(255, x))).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    }).join('');
  }

  private lighten(color: string, amount: number): string {
    const parsed = this.parseColor(color);
    if (!parsed) return color;
    return this.colorToString({
      r: parsed.r + (255 - parsed.r) * amount,
      g: parsed.g + (255 - parsed.g) * amount,
      b: parsed.b + (255 - parsed.b) * amount,
      a: parsed.a
    });
  }

  private darken(color: string, amount: number): string {
    const parsed = this.parseColor(color);
    if (!parsed) return color;
    return this.colorToString({
      r: parsed.r * (1 - amount),
      g: parsed.g * (1 - amount),
      b: parsed.b * (1 - amount),
      a: parsed.a
    });
  }

  private withAlpha(color: string, alpha: number): string {
    const parsed = this.parseColor(color);
    if (!parsed) return color;
    return `rgba(${parsed.r}, ${parsed.g}, ${parsed.b}, ${alpha})`;
  }

  private isDarkTheme(bgPrimary: string): boolean {
    const parsed = this.parseColor(bgPrimary);
    if (!parsed) return false;
    const luminance = (0.299 * parsed.r + 0.587 * parsed.g + 0.114 * parsed.b) / 255;
    return luminance < 0.5;
  }

  /**
   * Compute glassmorphism CSS values (mirrors theme-editor.vue applyTheme())
   */
  private computeGlassmorphismTokens(
    config: ThemeParams,
    bgSecondary: string,
    bgPrimary: string
  ): Record<string, string> {
    const glassBlur = parseFloat(config.glassBlur || '0');
    const glassOpacity = parseFloat(config.glassOpacity || '1');
    const glassGradient = Math.min(Math.max(parseFloat(config.glassGradient || '0'), 0), 1);
    const glassBorder = parseFloat(config.glassBorder || '0.5');
    const glassShadow = parseFloat(config.glassShadow || '0');
    const glowIntensity = parseFloat(config.glowIntensity || '0');

    // Parse background colors for rgba conversion
    const bgSecParsed = this.parseColor(bgSecondary);
    const bgPriParsed = this.parseColor(bgPrimary);
    const hoverColor = config.accentGlow || config.accent || '#f5f5f5';
    const hoverParsed = this.parseColor(hoverColor);

    // --glass-gradient: different gradient types based on glassGradientType
    let glassGradientValue = 'none';
    if (glassGradient > 0) {
      const spotOpacity1 = glassGradient * 0.08;
      const spotOpacity2 = glassGradient * 0.05;
      const gradientType = config.glassGradientType || 'radial';

      switch (gradientType) {
        case 'vertical':
          // Top-to-bottom vertical light gradient
          glassGradientValue = `linear-gradient(to bottom, rgba(255, 255, 255, ${spotOpacity1}) 0%, transparent 30%, transparent 70%, rgba(255, 255, 255, ${spotOpacity2}) 100%)`;
          break;
        case 'diagonal':
          // Diagonal light beam from top-left to bottom-right
          glassGradientValue = `linear-gradient(135deg, rgba(255, 255, 255, ${spotOpacity1}) 0%, transparent 40%, transparent 60%, rgba(255, 255, 255, ${spotOpacity2}) 100%)`;
          break;
        case 'corner':
          // Corner light spots (top-left and bottom-right)
          glassGradientValue = `linear-gradient(135deg, rgba(255, 255, 255, ${spotOpacity1 * 1.5}) 0%, transparent 25%), linear-gradient(315deg, rgba(255, 255, 255, ${spotOpacity2 * 1.5}) 0%, transparent 25%)`;
          break;
        case 'radial':
        default:
          // Classic radial light spots
          glassGradientValue = `radial-gradient(circle at 20% 30%, rgba(255, 255, 255, ${spotOpacity1}) 0%, transparent 50%), radial-gradient(circle at 80% 70%, rgba(255, 255, 255, ${spotOpacity2}) 0%, transparent 50%)`;
          break;
      }
    }

    // --glass-border: rgba with computed opacity
    const borderOpacity = Math.min(glassBorder * 0.2, 0.4);
    const glassBorderValue = `rgba(255, 255, 255, ${borderOpacity})`;

    // --glass-shadow: outer shadow + inset glow
    let glassShadowValue = 'none';
    if (glassShadow > 0 && hoverParsed) {
      const shadowSize = glassShadow * 20;
      const shadowOpacity = glassShadow * 0.4;
      const insetOpacity = glassShadow * 0.05;
      glassShadowValue = `0 ${shadowSize}px ${shadowSize * 2}px rgba(0, 0, 0, ${shadowOpacity}),
       inset 0 0 40px rgba(${hoverParsed.r}, ${hoverParsed.g}, ${hoverParsed.b}, ${insetOpacity})`;
    }

    // --glass-card-overlay: linear gradient overlay
    let glassCardOverlay = 'none';
    if (bgSecParsed) {
      const overlayOpacity1 = 0.08 + glassGradient * 0.04;
      const overlayOpacity2 = 0.02 + glassGradient * 0.02;
      glassCardOverlay = `linear-gradient(150deg, rgba(${bgSecParsed.r + 20}, ${bgSecParsed.g + 20}, ${bgSecParsed.b + 20}, ${overlayOpacity1}), rgba(${bgSecParsed.r + 40}, ${bgSecParsed.g + 40}, ${bgSecParsed.b + 40}, ${overlayOpacity2}))`;
    }

    // --card-backdrop: blur value
    const cardBackdrop = glassBlur > 0 ? `blur(${glassBlur}px)` : 'none';

    // Background colors with glass opacity applied
    const colorBgSecondaryWithOpacity = bgSecParsed
      ? `rgba(${bgSecParsed.r}, ${bgSecParsed.g}, ${bgSecParsed.b}, ${glassOpacity})`
      : bgSecondary;
    const colorBgPrimaryWithOpacity = bgPriParsed
      ? `rgba(${bgPriParsed.r}, ${bgPriParsed.g}, ${bgPriParsed.b}, ${glassOpacity})`
      : bgPrimary;

    return {
      'glass-blur': `${glassBlur}px`,
      'glass-opacity': String(glassOpacity),
      'glass-gradient': glassGradientValue,
      'glass-gradient-strength': String(glassGradient),
      'glass-border': glassBorderValue,
      'glass-shadow': glassShadowValue,
      'glass-card-overlay': glassCardOverlay,
      'glass-apply-to-cards': config.glassApplyToCards ? '1' : '0',
      'glass-apply-to-shell': config.glassApplyToShell ? '1' : '0',
      'card-backdrop': cardBackdrop,
      'card-bg-opacity': String(glassOpacity),
      'glow-intensity': String(glowIntensity),
      // Override bg colors with opacity applied (for glass effect)
      'color-bg-secondary-glass': colorBgSecondaryWithOpacity,
      'color-bg-primary-glass': colorBgPrimaryWithOpacity,
    };
  }

  /**
   * Regenerate auto-themes.json manifest
   */
  async regenerateManifest(): Promise<void> {
    try {
      const { execSync } = await import('child_process');
      const manifestScript = path.join(
        this.projectRoot,
        '@typus-core/frontend/scripts/generate-themes-manifest.ts'
      );

      execSync(`npx tsx "${manifestScript}"`, {
        cwd: this.projectRoot,
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe']
      });
      logger.info('[ThemeGenerator] Manifest regenerated');
    } catch (error) {
      logger.warn('[ThemeGenerator] Failed to regenerate manifest:', error);
    }
  }

  /**
   * List available themes
   */
  listThemes(): string[] {
    if (!fs.existsSync(this.themesDir)) {
      return [];
    }

    return fs.readdirSync(this.themesDir)
      .filter(dir => {
        const manifestPath = path.join(this.themesDir, dir, 'manifest.json');
        return fs.existsSync(manifestPath);
      });
  }

  /**
   * Delete theme
   */
  async deleteTheme(name: string): Promise<ThemeGenerationResult> {
    // Validate theme name to prevent path traversal
    if (!name || !/^[a-z0-9-]+$/.test(name)) {
      return {
        success: false,
        message: 'Invalid theme name. Use only lowercase letters, numbers, and hyphens.'
      };
    }

    const themeDir = path.join(this.themesDir, name);

    // Additional check: ensure resolved path is within themesDir
    const resolvedPath = path.resolve(themeDir);
    const resolvedThemesDir = path.resolve(this.themesDir);
    if (!resolvedPath.startsWith(resolvedThemesDir + path.sep)) {
      return {
        success: false,
        message: 'Invalid theme path'
      };
    }

    if (!fs.existsSync(themeDir)) {
      return {
        success: false,
        message: `Theme "${name}" not found`
      };
    }

    // Don't allow deleting default themes
    const protectedThemes = ['dark-theme', 'light-theme'];
    if (protectedThemes.includes(name)) {
      return {
        success: false,
        message: `Cannot delete protected theme "${name}"`
      };
    }

    try {
      fs.rmSync(themeDir, { recursive: true, force: true });
      await this.regenerateManifest();

      return {
        success: true,
        message: `Theme "${name}" deleted`
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Failed to delete theme: ${error.message}`
      };
    }
  }
}

export interface ThemeParams {
  name: string;
  overwrite?: boolean;

  // Required
  bgPrimary: string;
  textPrimary: string;
  accent: string;

  // Base colors
  bgSecondary?: string;
  bgTertiary?: string;
  surface?: string;
  textSecondary?: string;
  textMuted?: string;
  border?: string;
  borderLight?: string;

  // Accent system
  accentSolid?: string;
  accentLight?: string;
  accentText?: string;
  accentGlow?: string;
  accentSecondary?: string;

  // Semantic colors
  success?: string;
  successLight?: string;
  warning?: string;
  warningLight?: string;
  error?: string;
  errorLight?: string;
  info?: string;
  infoLight?: string;

  // Typography
  fontBase?: string;
  fontHeading?: string;
  fontMono?: string;
  fontSizeBase?: string;
  lineHeightBase?: string;
  fontWeightHeading?: string;

  // Sizing
  radiusBase?: string;
  buttonRadius?: string;
  spacingBase?: string;
  inputPadding?: string;
  buttonPadding?: string;
  cardPadding?: string;
  cardRadius?: string;

  // Shadows
  shadowSm?: string;
  shadowMd?: string;
  shadowLg?: string;
  shadowXl?: string;
  shadowAccent?: string;

  // Components
  navActiveStyle?: 'light' | 'solid';
  focusRingWidth?: string;
  cardBorder?: string;
  inputBorder?: string;
  inputBackground?: string;
  inputBorderColor?: string;

  // Interactions
  hoverScale?: string;
  hoverBrightness?: string;
  hoverTranslateY?: string;
  transitionSpeed?: string;

  // Gradient fills
  buttonGradient?: string;
  buttonGradientEnabled?: boolean;
  buttonGradientIntensity?: string;
  cardGradient?: string;
  cardGradientEnabled?: boolean;
  cardGradientIntensity?: string;
  shellGradient?: string;
  shellGradientEnabled?: boolean;
  buttonGlossGradient?: string;
  buttonGlossOpacity?: string;
  buttonGlossHoverOpacity?: string;
  buttonGlossActiveOpacity?: string;
  buttonGlossEnabled?: boolean;

  // Glassmorphism
  glassBlur?: string;
  glassOpacity?: string;
  glassGradient?: string;
  glassGradientType?: 'radial' | 'vertical' | 'diagonal' | 'corner';
  glassBorder?: string;
  glassShadow?: string;
  glowIntensity?: string;
  glassApplyToCards?: boolean;
  glassApplyToShell?: boolean;

  // Effects
  neonEnabled?: boolean;
  shimmerEnabled?: boolean;
  tiltEnabled?: boolean;
  magneticEnabled?: boolean;
  glowBadgesEnabled?: boolean;
  neonScrollbarEnabled?: boolean;
  linkGlowEnabled?: boolean;
  tableGlowEnabled?: boolean;
  progressGlowEnabled?: boolean;
  inputGlowEnabled?: boolean;
  modalGlassEnabled?: boolean;
  dropdownGlassEnabled?: boolean;
  checkboxGlowEnabled?: boolean;
  headingGlowEnabled?: boolean;
  buttonGlowEnabled?: boolean;

  // Effect colors (optional)
  neonPrimary?: string;
  neonSecondary?: string;

  // Component overrides
  outlineText?: string;
  outlineBackground?: string;
  outlineHoverBackground?: string;
  outlineBorder?: string;
  outlineHoverBorder?: string;
  checkboxBorder?: string;
  checkboxBorderChecked?: string;
  checkboxFill?: string;
  checkboxFillChecked?: string;
}

export interface ThemeGenerationResult {
  success: boolean;
  message: string;
  themePath?: string;
}

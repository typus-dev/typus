<route lang="json">
{
  "name": "theme-editor",
  "path": "/system/theme-editor",
  "meta": {
    "layout": "private",
    "requiresAuth": true,
    "subject": "system"
  }
}
</route>

<script setup lang="ts">
import { watch, onUnmounted, computed, ref } from 'vue'
import PageHeader from '@/components/layout/PageHeader.vue'
import dxCard from '@/components/ui/dxCard.vue'
import dxButton from '@/components/ui/dxButton.vue'
import dxInput from '@/components/ui/dxInput.vue'
import dxCheckbox from '@/components/ui/dxCheckbox.vue'
import dxSelect from '@/components/ui/dxSelect/dxSelect.vue'
import { useApi } from '@/shared/composables/useApi'
import { useTheme } from '@/core/theme/composables/useTheme'
import { useMessages } from '@/shared/composables/useMessages'

// Composables
import { useThemeState } from './composables/useThemeState'
import { useThemeGenerator } from './composables/useThemeGenerator'
import { usePreviewStyles } from './composables/usePreviewStyles'
import {
  useThemePresets,
  stylePresets,
  glassPresets,
  type PaletteMode,
  type PaletteStyle,
  type StylePresetName,
  type GlassPresetName
} from './composables/useThemePresets'
import { parseColor, mixWithWhite } from './composables/useThemeColors'

// API & Messages
const { post } = useApi('/system/themes/save')
const { currentTheme } = useTheme()
const { successMessage, errorMessage } = useMessages()

// Theme state
const {
  theme,
  saveStatus,
  glassModeStatus,
  resetTheme,
  updateGlassModeStatus,
  cleanup
} = useThemeState()

// Generator
const { generateFromBaseColors, generatePalette } = useThemeGenerator(theme)

// Preview styles (isolated)
const { previewStyles } = usePreviewStyles(theme)

// Presets (pass generator for palette presets)
const {
  setMode,
  setStyle,
  getMode,
  randomizePalette,
  applyStylePreset,
  applyGlassPreset,
  applyNeonPreset,
  applyTiltPreset,
  applyBorderPreset
} = useThemePresets(theme, generateFromBaseColors)

// Reactive mode detection
const currentMode = computed(() => getMode())

// Auto-generate when base colors change
watch(() => [theme.colorBackground, theme.colorForeground], () => {
  generateFromBaseColors()
}, { deep: true })

// Watch glass settings for status
watch(() => [theme.glassBlur, theme.glassOpacity], () => {
  updateGlassModeStatus()
}, { deep: true })

// Reload theme state when active theme from topbar changes
watch(() => currentTheme.value, () => {
  resetTheme()
  updateGlassModeStatus()
})

// Auto-calculate neon color when enabled (10% inversion from background)
watch(() => theme.neonEnabled, (enabled) => {
  if (enabled) {
    // Parse background color
    const bg = theme.colorBackground || theme.bgPrimary
    const hex = bg.replace('#', '')
    const r = parseInt(hex.substring(0, 2), 16)
    const g = parseInt(hex.substring(2, 4), 16)
    const b = parseInt(hex.substring(4, 6), 16)

    // Invert by 10%: if dark bg -> lighten, if light bg -> darken
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
    const shift = luminance < 0.5 ? 25 : -25  // ~10% of 255

    const clamp = (v: number) => Math.max(0, Math.min(255, v))
    const toHex = (v: number) => clamp(v).toString(16).padStart(2, '0')

    theme.neonColor = `#${toHex(r + shift)}${toHex(g + shift)}${toHex(b + shift)}`
  }
})

// Save theme (uses currently active theme from topbar)
const buildGeneratorPayload = () => ({
  name: currentTheme.value,
  overwrite: true,
  bgPrimary: parseColor(theme.bgPrimary),
  bgSecondary: parseColor(theme.bgSecondary),
  textPrimary: parseColor(theme.textPrimary),
  textMuted: parseColor(theme.textMuted),
  accent: parseColor(theme.accent),
  accentLight: parseColor(theme.accentLight),
  accentSolid: parseColor(theme.accentSolid),
  accentText: parseColor(theme.accentText),
  border: parseColor(theme.border),
  borderFocus: parseColor(theme.borderFocus),
  buttonGradient: theme.buttonGradient,
  buttonGradientEnabled: theme.buttonGradientEnabled,
  buttonGradientIntensity: String(theme.buttonGradientIntensity),
  cardGradient: theme.cardGradient,
  cardGradientEnabled: theme.cardGradientEnabled,
  cardGradientIntensity: String(theme.cardGradientIntensity),
  shellGradient: theme.shellGradient,
  shellGradientEnabled: theme.shellGradientEnabled,
  buttonGlossGradient: theme.buttonGlossGradient,
  buttonGlossOpacity: theme.buttonGlossOpacity,
  buttonGlossHoverOpacity: theme.buttonGlossHoverOpacity,
  buttonGlossActiveOpacity: theme.buttonGlossActiveOpacity,
  buttonGlossEnabled: theme.buttonGlossEnabled,
  hoverColor: parseColor(theme.hoverColor),
  hoverOpacity: theme.hoverOpacity,
  success: parseColor(theme.successText),
  successLight: parseColor(theme.successBg),
  warning: parseColor(theme.warningText),
  warningLight: parseColor(theme.warningBg),
  error: parseColor(theme.errorText),
  errorLight: parseColor(theme.errorBg),
  info: parseColor(theme.infoText),
  infoLight: parseColor(theme.infoBg),
  fontBase: theme.fontBase,
  fontHeading: theme.fontHeading,
  fontMono: theme.fontMono,
  fontSizeBase: `${theme.fontSizeBase}rem`,
  lineHeightBase: theme.lineHeightBase,
  fontWeightHeading: theme.fontWeightHeading,
  spacingBase: `${theme.spacingBase}rem`,
  radiusBase: `${theme.radiusBase}rem`,
  cardRadius: `${theme.cardRadius}rem`,
  transitionSpeed: theme.transitionSpeed,
  inputPadding: theme.inputPadding,
  buttonPadding: theme.buttonPadding,
  cardPadding: theme.cardPadding,
  outlineText: parseColor(theme.outlineText),
  outlineBackground: parseColor(theme.outlineBackground),
  outlineBorder: parseColor(theme.outlineBorder),
  outlineHoverBackground: parseColor(theme.outlineHoverBackground),
  outlineHoverBorder: parseColor(theme.outlineHoverBorder),
  checkboxBorder: parseColor(theme.checkboxBorder),
  checkboxBorderChecked: parseColor(theme.checkboxBorderChecked),
  checkboxFill: parseColor(theme.checkboxFill),
  checkboxFillChecked: parseColor(theme.checkboxFillChecked),
  inputBackground: parseColor(theme.inputBackground),
  inputBorderColor: parseColor(theme.inputBorderColor),
  glassBlur: theme.glassBlur,
  glassOpacity: theme.glassOpacity,
  glassGradient: theme.glassGradient,
  glassGradientType: theme.glassGradientType,
  glassBorder: theme.glassBorder,
  glassShadow: theme.glassShadow,
  glassApplyToCards: theme.glassApplyToCards,
  glassApplyToShell: theme.glassApplyToShell,
  glowIntensity: theme.glowIntensity,
  glowColor: parseColor(theme.glowColor),
  neonEnabled: theme.neonEnabled,
  neonPrimary: parseColor(theme.neonColor),
  tiltEnabled: theme.tiltEnabled,
  shimmerEnabled: theme.shimmerEnabled
})

const generatorPayload = computed(() => buildGeneratorPayload())

const copyPayload = async () => {
  try {
    await navigator.clipboard.writeText(JSON.stringify(generatorPayload.value, null, 2))
    successMessage('Payload copied to clipboard')
  } catch (err) {
    errorMessage(err instanceof Error ? err.message : 'Failed to copy payload')
  }
}

const saveTheme = async () => {
  saveStatus.value = 'saving'

  try {
    const params = generatorPayload.value
    const { data, error } = await post(params)

    if (error) {
      saveStatus.value = 'error'
      errorMessage(error.message || 'Failed to save theme')
    } else if (data?.success) {
      saveStatus.value = 'success'
      successMessage(`Theme "${currentTheme.value}" saved successfully!`)
    } else {
      saveStatus.value = 'error'
      errorMessage(data?.message || 'Failed to save theme')
    }
  } catch (err) {
    saveStatus.value = 'error'
    errorMessage(err instanceof Error ? err.message : 'Unknown error')
  }

  setTimeout(() => {
    if (saveStatus.value !== 'saving') {
      saveStatus.value = 'idle'
    }
  }, 3000)
}

// Export config as JSON
const exportConfig = () => {
  const config = {
    name: 'custom-theme',
    ...theme
  }
  const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'theme-config.json'
  a.click()
  URL.revokeObjectURL(url)
}

// Cleanup on unmount
onUnmounted(() => {
  cleanup()
})

// Style preset options
const stylePresetOptions = Object.entries(stylePresets).map(([key, value]) => ({
  value: key,
  label: value.name
}))

// Glass preset options
const glassPresetOptions = Object.keys(glassPresets).map(key => ({
  value: key,
  label: key.charAt(0).toUpperCase() + key.slice(1)
}))

// Font options
const fontOptions = [
  { value: "'Inter', system-ui, sans-serif", label: 'Inter' },
  { value: "'Plus Jakarta Sans', 'Inter', system-ui, sans-serif", label: 'Plus Jakarta Sans' },
  { value: "'Outfit', 'Inter', system-ui, sans-serif", label: 'Outfit' },
  { value: "'Sora', 'Inter', system-ui, sans-serif", label: 'Sora' },
  { value: "'Orbitron', 'Inter', system-ui, sans-serif", label: 'Orbitron' },
  { value: "'JetBrains Mono', monospace", label: 'JetBrains Mono' },
  { value: "system-ui, sans-serif", label: 'System' },
  { value: "'Georgia', serif", label: 'Georgia' }
]

const fallbackColors = {
  accent: '#1b5cff',
  accentSolid: '#0031a6',
  accentLight: '#dfe8ff',
  bgPrimary: '#f8fbff',
  bgSecondary: '#f1f5ff'
}

const safeColor = (value: string | undefined, fallback: string) => {
  return value && value.trim().length ? value : fallback
}

const buttonGradientPresets = computed(() => {
  const accentSolid = parseColor(safeColor(theme.accentSolid, fallbackColors.accentSolid))
  const accent = parseColor(safeColor(theme.accent, fallbackColors.accent))
  const accentLight = parseColor(safeColor(theme.accentLight, fallbackColors.accentLight))
  const accentGlow = mixWithWhite(safeColor(theme.accent, fallbackColors.accent), 0.6, 0.35)
  const accentSoft = mixWithWhite(safeColor(theme.accent, fallbackColors.accent), 0.25)
  const accentDeep = mixWithWhite(safeColor(theme.accentSolid, fallbackColors.accentSolid), 0.05)

  return [
    { id: 'accent', label: 'Accent Sweep', value: `linear-gradient(118deg, ${accentSolid}, ${accent})` },
    { id: 'glow', label: 'Glow Bridge', value: `linear-gradient(155deg, ${accentDeep}, ${accentSoft})` },
    { id: 'halo', label: 'Edge Halo', value: `linear-gradient(92deg, ${accentGlow}, transparent)` }
  ]
})

const cardGradientPresets = computed(() => {
  const bgPrimary = parseColor(safeColor(theme.bgPrimary, fallbackColors.bgPrimary))
  const bgSecondary = parseColor(safeColor(theme.bgSecondary, fallbackColors.bgSecondary))
  const highlight = mixWithWhite(safeColor(theme.bgPrimary, fallbackColors.bgPrimary), 0.4, 0.4)
  const muted = mixWithWhite(safeColor(theme.bgSecondary, fallbackColors.bgSecondary), 0.65, 0.5)

  return [
    { id: 'soft-glass', label: 'Soft Glass', value: `linear-gradient(132deg, ${highlight}, ${bgSecondary})` },
    { id: 'frost-layer', label: 'Frost Layer', value: `linear-gradient(167deg, ${muted}, ${bgPrimary})` },
    { id: 'subtle-blur', label: 'Subtle Blur', value: `linear-gradient(198deg, ${bgPrimary}, ${highlight})` }
  ]
})

const buttonGradientVariant = ref('accent')
const cardGradientVariant = ref('soft-glass')

let buttonVariantInitialized = false
let cardVariantInitialized = false

watch(buttonGradientVariant, (variant) => {
  if (!buttonVariantInitialized) return
  const preset = buttonGradientPresets.value.find(p => p.id === variant)
  if (preset) {
    theme.buttonGradient = preset.value
    theme.buttonGradientEnabled = true
  }
})

watch(cardGradientVariant, (variant) => {
  if (!cardVariantInitialized) return
  const preset = cardGradientPresets.value.find(p => p.id === variant)
  if (preset) {
    theme.cardGradient = preset.value
    theme.cardGradientEnabled = true
  }
})

watch(() => theme.buttonGradient, (val) => {
  const match = buttonGradientPresets.value.find(p => p.value === val)
  if (match) {
    buttonVariantInitialized = true
    buttonGradientVariant.value = match.id
  } else if (!buttonVariantInitialized) {
    buttonVariantInitialized = true
  }
}, { immediate: true })

watch(() => theme.cardGradient, (val) => {
  const match = cardGradientPresets.value.find(p => p.value === val)
  if (match) {
    cardVariantInitialized = true
    cardGradientVariant.value = match.id
  } else if (!cardVariantInitialized) {
    cardVariantInitialized = true
  }
}, { immediate: true })

const buttonGradientIntensityValue = computed({
  get: () => Number(theme.buttonGradientIntensity ?? 1),
  set: (val: number) => {
    theme.buttonGradientIntensity = String(val)
  }
})

const cardGradientIntensityValue = computed({
  get: () => Number(theme.cardGradientIntensity ?? 1),
  set: (val: number) => {
    theme.cardGradientIntensity = String(val)
  }
})

watch(() => theme.buttonGradientEnabled, (enabled) => {
  if (enabled && !theme.buttonGradient) {
    const preset = buttonGradientPresets.value.find(p => p.id === 'glow')
    if (preset) {
      theme.buttonGradient = preset.value
      theme.buttonGradientIntensity = '0.2'
    }
  }
})

watch(() => theme.cardGradientEnabled, (enabled) => {
  if (enabled && !theme.cardGradient) {
    const preset = cardGradientPresets.value.find(p => p.id === 'subtle-blur')
    if (preset) {
      theme.cardGradient = preset.value
      theme.cardGradientIntensity = '0.2'
    }
  }
})

watch(() => theme.buttonGlossEnabled, (enabled) => {
  if (enabled) {
    theme.buttonGlossOpacity = '0.15'
    theme.buttonGlossHoverOpacity = '0.25'
    theme.buttonGlossActiveOpacity = '0.1'
  }
})
</script>

<template>
  <div class="theme-editor-wrapper">
    <div class="page-header-card theme-colors-background-secondary">
      <PageHeader title="Theme Editor v2" :subtitle="`Editing: ${currentTheme}`">
        <template #actions>
          <dxButton
            variant="outline"
            size="sm"
            @click="resetTheme"
          >
            Reset
          </dxButton>
          <dxButton
            variant="outline"
            size="sm"
            @click="exportConfig"
          >
            Export JSON
          </dxButton>
          <dxButton
            variant="outline"
            size="sm"
            @click="copyPayload"
          >
            Copy JSON
          </dxButton>
          <dxButton
            variant="primary"
            size="sm"
            :disabled="saveStatus === 'saving'"
            @click="saveTheme"
          >
            {{ saveStatus === 'saving' ? 'Saving...' : `Save "${currentTheme}"` }}
          </dxButton>
        </template>
      </PageHeader>
    </div>

    <!-- Style Presets (outside preview zone) -->
    <dxCard title="Style Presets" class="mb-6">
    <div class="flex flex-wrap gap-2">
      <button
        v-for="(preset, key) in stylePresets"
        :key="key"
        class="px-3 py-1.5 theme-typography-size-sm rounded-md border transition-transform hover:scale-105"
        :style="{
          backgroundColor: preset.bgPrimary,
          color: preset.textPrimary,
          borderColor: preset.border
        }"
        @click="applyStylePreset(key as StylePresetName)"
      >
        {{ preset.name }}
      </button>
    </div>
    </dxCard>

    <!-- Preview Zone -->
    <div :style="previewStyles" class="preview-zone">

    <!-- Live Preview Card -->
    <dxCard class="mb-6">
      <template #header>
        <h3 class="theme-typography-size-sm font-semibold">Live Preview</h3>
        <p class="theme-typography-size-xs theme-colors-text-tertiary mt-0.5">All cards below show your changes in real-time</p>
      </template>
      <div class="p-4 rounded-lg theme-colors-background-primary">
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <!-- Buttons -->
          <div class="space-y-3">
            <p class="theme-typography-size-xs theme-colors-text-secondary mb-2">Buttons</p>
            <div class="flex flex-wrap gap-2">
              <dxButton variant="primary" size="sm">Primary</dxButton>
              <dxButton variant="secondary" size="sm">Secondary</dxButton>
              <dxButton variant="outline" size="sm">Outline</dxButton>
              <dxButton variant="ghost" size="sm">Ghost</dxButton>
            </div>
          </div>

          <!-- Inputs -->
          <div class="space-y-3">
            <p class="theme-typography-size-xs theme-colors-text-secondary mb-2">Inputs</p>
            <dxInput placeholder="Default input" size="sm" noGutters />
            <dxInput placeholder="Focused (click here)" size="sm" noGutters />
          </div>

          <!-- States -->
          <div class="space-y-3">
            <p class="theme-typography-size-xs theme-colors-text-secondary mb-2">States</p>
            <div class="flex gap-2 theme-typography-size-xs">
              <span class="px-2 py-1 rounded theme-colors-background-success theme-colors-text-success">Success</span>
              <span class="px-2 py-1 rounded theme-colors-background-warning theme-colors-text-warning">Warning</span>
              <span class="px-2 py-1 rounded theme-colors-background-error theme-colors-text-error">Error</span>
              <span class="px-2 py-1 rounded theme-colors-background-info theme-colors-text-info">Info</span>
            </div>
            <div class="p-3 rounded border theme-colors-border-primary theme-colors-background-tertiary">
              <p class="theme-typography-size-sm theme-colors-text-primary">Primary text</p>
              <p class="theme-typography-size-xs theme-colors-text-secondary">Secondary text</p>
            </div>
          </div>
        </div>
      </div>
    </dxCard>

    <!-- Main Settings Row: 4 Cards -->
    <div class="grid grid-cols-4 gap-4 mb-6">
      <!-- 1. Palette -->
      <dxCard title="Palette">
        <div class="space-y-2">
          <!-- Mode: Dark / Light -->
          <div class="grid grid-cols-2 gap-1">
            <dxButton
              :variant="currentMode === 'dark' ? 'primary' : 'outline'"
              size="sm"
              @click="setMode('dark')"
            >
              Dark
            </dxButton>
            <dxButton
              :variant="currentMode === 'light' ? 'primary' : 'outline'"
              size="sm"
              @click="setMode('light')"
            >
              Light
            </dxButton>
          </div>
          <!-- Style: Mono / Warm / Cool / Vibrant -->
          <div class="flex gap-1">
            <button class="flex-1 px-1 py-0.5 theme-typography-size-xs rounded border theme-colors-border-primary hover:theme-colors-background-tertiary" @click="setStyle('mono')">Mono</button>
            <button class="flex-1 px-1 py-0.5 theme-typography-size-xs rounded border theme-colors-border-primary hover:theme-colors-background-tertiary" @click="setStyle('warm')">Warm</button>
            <button class="flex-1 px-1 py-0.5 theme-typography-size-xs rounded border theme-colors-border-primary hover:theme-colors-background-tertiary" @click="setStyle('cool')">Cool</button>
            <button class="flex-1 px-1 py-0.5 theme-typography-size-xs rounded border theme-colors-border-primary hover:theme-colors-background-tertiary" @click="setStyle('vibrant')">Vibe</button>
          </div>
          <!-- Colors -->
          <div class="pt-2 border-t theme-colors-border-secondary grid grid-cols-2 gap-2">
            <div class="color-picker">
              <label class="block theme-typography-size-xs mb-0.5 opacity-60">Background</label>
              <input v-model="theme.colorBackground" type="color" />
            </div>
            <div class="color-picker">
              <label class="block theme-typography-size-xs mb-0.5 opacity-60">Foreground</label>
              <input v-model="theme.colorForeground" type="color" />
            </div>
          </div>
          <!-- Random -->
          <dxButton variant="outline" size="sm" class="w-full" @click="randomizePalette">
            🎲 Random
          </dxButton>
        </div>
      </dxCard>

      <!-- 2. Core Colors -->
      <dxCard title="Core Colors">
        <div class="grid grid-cols-2 gap-2">
          <div class="color-picker">
            <label class="block theme-typography-size-xs mb-0.5 opacity-60">Background</label>
            <input v-model="theme.bgPrimary" type="color" />
          </div>
          <div class="color-picker">
            <label class="block theme-typography-size-xs mb-0.5 opacity-60">Secondary</label>
            <input v-model="theme.bgSecondary" type="color" />
          </div>
          <div class="color-picker">
            <label class="block theme-typography-size-xs mb-0.5 opacity-60">Text</label>
            <input v-model="theme.textPrimary" type="color" />
          </div>
          <div class="color-picker">
            <label class="block theme-typography-size-xs mb-0.5 opacity-60">Muted</label>
            <input v-model="theme.textMuted" type="color" />
          </div>
          <div class="color-picker">
            <label class="block theme-typography-size-xs mb-0.5 opacity-60">Accent</label>
            <input v-model="theme.accent" type="color" />
          </div>
          <div class="color-picker">
            <label class="block theme-typography-size-xs mb-0.5 opacity-60">Accent Solid</label>
            <input v-model="theme.accentSolid" type="color" />
          </div>
          <div class="color-picker">
            <label class="block theme-typography-size-xs mb-0.5 opacity-60">Accent Text</label>
            <input v-model="theme.accentText" type="color" />
          </div>
          <div class="color-picker">
            <label class="block theme-typography-size-xs mb-0.5 opacity-60">Border</label>
            <input v-model="theme.border" type="color" />
          </div>
          <div class="color-picker">
            <label class="block theme-typography-size-xs mb-0.5 opacity-60">Focus</label>
            <input v-model="theme.borderFocus" type="color" />
          </div>
          <div>
            <div class="color-picker">
              <label class="block theme-typography-size-xs mb-0.5 opacity-60">Hover</label>
              <input v-model="theme.hoverColor" type="color" />
            </div>
            <input v-model="theme.hoverOpacity" type="range" min="0" max="0.3" step="0.01" class="mt-2 w-full" />
          </div>
        </div>
      </dxCard>

      <!-- 3. Semantic & Components -->
      <dxCard title="Semantic" class="col-span-2">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="space-y-2">
            <p class="theme-typography-size-xs uppercase tracking-wide opacity-60">Semantic</p>
            <div class="grid grid-cols-2 gap-2">
              <div class="color-picker">
                <label class="block theme-typography-size-xs mb-0.5 opacity-60">Success</label>
                <input v-model="theme.successText" type="color" />
              </div>
              <div class="color-picker">
                <label class="block theme-typography-size-xs mb-0.5 opacity-60">Warning</label>
                <input v-model="theme.warningText" type="color" />
              </div>
              <div class="color-picker">
                <label class="block theme-typography-size-xs mb-0.5 opacity-60">Error</label>
                <input v-model="theme.errorText" type="color" />
              </div>
              <div class="color-picker">
                <label class="block theme-typography-size-xs mb-0.5 opacity-60">Info</label>
                <input v-model="theme.infoText" type="color" />
              </div>
            </div>
          </div>

          <div class="space-y-2">
            <p class="theme-typography-size-xs uppercase tracking-wide opacity-60">Outline Buttons</p>
            <div class="grid grid-cols-2 gap-2">
              <div class="color-picker">
                <label class="block theme-typography-size-xs opacity-60 flex-1">Text</label>
                <input v-model="theme.outlineText" type="color" />
              </div>
              <div class="color-picker">
                <label class="block theme-typography-size-xs opacity-60 flex-1">Background</label>
                <input v-model="theme.outlineBackground" type="color" />
              </div>
              <div class="color-picker">
                <label class="block theme-typography-size-xs opacity-60 flex-1">Border</label>
                <input v-model="theme.outlineBorder" type="color" />
              </div>
              <div class="color-picker">
                <label class="block theme-typography-size-xs opacity-60 flex-1">Hover BG</label>
                <input v-model="theme.outlineHoverBackground" type="color" />
              </div>
              <div class="color-picker">
                <label class="block theme-typography-size-xs opacity-60 flex-1">Hover Border</label>
                <input v-model="theme.outlineHoverBorder" type="color" />
              </div>
            </div>
          </div>

          <div class="space-y-2">
            <p class="theme-typography-size-xs uppercase tracking-wide opacity-60">Checkboxes</p>
            <div class="grid grid-cols-2 gap-2">
              <div class="color-picker">
                <label class="block theme-typography-size-xs opacity-60 flex-1">Border</label>
                <input v-model="theme.checkboxBorder" type="color" />
              </div>
              <div class="color-picker">
                <label class="block theme-typography-size-xs opacity-60 flex-1">Border (Checked)</label>
                <input v-model="theme.checkboxBorderChecked" type="color" />
              </div>
              <div class="color-picker">
                <label class="block theme-typography-size-xs opacity-60 flex-1">Fill</label>
                <input v-model="theme.checkboxFill" type="color" />
              </div>
              <div class="color-picker">
                <label class="block theme-typography-size-xs opacity-60 flex-1">Fill (Checked)</label>
                <input v-model="theme.checkboxFillChecked" type="color" />
              </div>
            </div>
          </div>

          <div class="space-y-2">
            <p class="theme-typography-size-xs uppercase tracking-wide opacity-60">Inputs</p>
            <div class="grid grid-cols-2 gap-2">
              <div class="color-picker">
                <label class="block theme-typography-size-xs opacity-60 flex-1">Background</label>
                <input v-model="theme.inputBackground" type="color" />
              </div>
              <div class="color-picker">
                <label class="block theme-typography-size-xs opacity-60 flex-1">Border</label>
                <input v-model="theme.inputBorderColor" type="color" />
              </div>
            </div>
          </div>
        </div>
      </dxCard>
    </div>

    <!-- Typography + Spacing + Glassmorphism + Effects Row -->
    <div class="grid grid-cols-4 gap-4 mb-6">
      <!-- Typography -->
      <dxCard title="Typography">
        <div class="space-y-2">
          <div>
            <label class="block theme-typography-size-xs mb-0.5 opacity-60">Font</label>
            <dxSelect
              v-model="theme.fontBase"
              :options="fontOptions"
              size="md"
            />
          </div>
          <div>
            <label class="block theme-typography-size-xs mb-0.5 opacity-60">Heading Font</label>
            <dxSelect
              v-model="theme.fontHeading"
              :options="fontOptions"
              size="md"
            />
          </div>
          <div>
            <label class="block theme-typography-size-xs mb-0.5 opacity-60">Mono Font</label>
            <dxSelect
              v-model="theme.fontMono"
              :options="fontOptions"
              size="md"
            />
          </div>
          <div>
            <label class="block theme-typography-size-xs mb-0.5 opacity-60">Size: {{ theme.fontSizeBase }}rem</label>
            <input v-model="theme.fontSizeBase" type="range" min="0.875" max="1.125" step="0.0625" class="w-full" />
          </div>
          <div>
            <label class="block theme-typography-size-xs mb-0.5 opacity-60">Line: {{ theme.lineHeightBase }}</label>
            <input v-model="theme.lineHeightBase" type="range" min="1.25" max="1.75" step="0.05" class="w-full" />
          </div>
          <div>
            <label class="block theme-typography-size-xs mb-0.5 opacity-60">Heading Weight: {{ theme.fontWeightHeading }}</label>
            <input v-model.number="theme.fontWeightHeading" type="range" min="200" max="900" step="50" class="w-full" />
          </div>
          <!-- Text Sample -->
          <div class="pt-2 border-t theme-colors-border-secondary">
            <div
              class="p-2 rounded theme-colors-background-tertiary"
              :style="{ fontFamily: theme.fontBase, fontSize: `${theme.fontSizeBase}rem`, lineHeight: theme.lineHeightBase }"
            >
              <span class="opacity-80">Aa</span>
              <span class="theme-typography-size-xs opacity-50 ml-2">Quick brown fox</span>
            </div>
          </div>
        </div>
      </dxCard>

      <!-- Spacing -->
      <dxCard title="Spacing">
        <div class="space-y-3">
          <div>
            <label class="block theme-typography-size-xs mb-0.5 opacity-60">Base: {{ theme.spacingBase }}rem</label>
            <input v-model="theme.spacingBase" type="range" min="0.75" max="1.25" step="0.05" class="w-full" />
          </div>
          <div>
            <label class="block theme-typography-size-xs mb-0.5 opacity-60">Input Padding</label>
            <dxInput v-model="theme.inputPadding" size="sm" placeholder="0.5rem 0.75rem" />
          </div>
          <div>
            <label class="block theme-typography-size-xs mb-0.5 opacity-60">Button Padding</label>
            <dxInput v-model="theme.buttonPadding" size="sm" placeholder="0.625rem 1.25rem" />
          </div>
          <div>
            <label class="block theme-typography-size-xs mb-0.5 opacity-60">Card Padding</label>
            <dxInput v-model="theme.cardPadding" size="sm" placeholder="1.5rem" />
          </div>

          <div class="pt-3 border-t theme-colors-border-secondary space-y-2">
            <p class="theme-typography-size-xs uppercase tracking-wide opacity-60">Radii & Motion</p>
            <div>
              <label class="block theme-typography-size-xs mb-0.5 opacity-60">Radius: {{ theme.radiusBase }}rem</label>
              <input v-model="theme.radiusBase" type="range" min="0" max="1.5" step="0.125" class="w-full" />
            </div>
            <div>
              <label class="block theme-typography-size-xs mb-0.5 opacity-60">Card Radius: {{ theme.cardRadius }}rem</label>
              <input v-model="theme.cardRadius" type="range" min="0" max="2" step="0.125" class="w-full" />
            </div>
            <div>
              <label class="block theme-typography-size-xs mb-0.5 opacity-60">Speed: {{ theme.transitionSpeed }}ms</label>
              <input v-model="theme.transitionSpeed" type="range" min="0" max="500" step="25" class="w-full" />
            </div>
          </div>
        </div>
      </dxCard>
      <!-- Glassmorphism -->
      <dxCard title="Glassmorphism">
        <div class="space-y-3">
          <!-- Glass Presets -->
          <div class="flex flex-wrap gap-1">
            <button
              v-for="preset in glassPresetOptions"
              :key="preset.value"
              class="theme-typography-size-xs px-2 py-1 rounded border border-current opacity-60 hover:opacity-100"
              @click="applyGlassPreset(preset.value as GlassPresetName)"
            >
              {{ preset.label }}
            </button>
          </div>

          <!-- Glass Controls -->
          <div class="space-y-2">
            <div class="flex items-center gap-2">
              <label class="theme-typography-size-xs opacity-60 w-16">Blur</label>
              <input v-model="theme.glassBlur" type="range" min="0" max="50" step="1" class="flex-1" />
            </div>
            <div class="flex items-center gap-2">
              <label class="theme-typography-size-xs opacity-60 w-16">Opacity</label>
              <input v-model="theme.glassOpacity" type="range" min="0.5" max="1" step="0.05" class="flex-1" />
            </div>
            <div class="flex items-center gap-2">
              <label class="theme-typography-size-xs opacity-60 w-16">Gradient</label>
              <input v-model="theme.glassGradient" type="range" min="0" max="1" step="0.1" class="flex-1" />
            </div>
            <div class="flex items-center gap-2">
              <label class="theme-typography-size-xs opacity-60 w-16">Shadow</label>
              <input v-model="theme.glassShadow" type="range" min="0" max="1" step="0.1" class="flex-1" />
            </div>
          </div>

          <!-- Glass Checkboxes -->
          <div class="flex gap-4 pt-1">
            <dxCheckbox v-model="theme.glassApplyToCards" label="Cards" size="sm" />
            <dxCheckbox v-model="theme.glassApplyToShell" label="Shell" size="sm" />
          </div>

          <!-- Card Frost Layer -->
          <div class="pt-2 border-t theme-colors-border-secondary space-y-3">
            <p class="theme-typography-size-xs uppercase tracking-wide opacity-60">Cards Frost Layer</p>
            <div>
              <dxCheckbox v-model="theme.cardGradientEnabled" label="Enable Frost Layer" size="sm" />
              <dxSelect
                v-model="cardGradientVariant"
                :options="cardGradientPresets.map(p => ({ label: p.label, value: p.id }))"
                size="xs"
                class="mt-2"
              />
              <div class="flex items-center justify-between text-[11px] opacity-70 mt-2">
                <span>Intensity</span>
                <span>{{ cardGradientIntensityValue.toFixed(2) }}</span>
              </div>
              <input v-model="cardGradientIntensityValue" type="range" min="0" max="1" step="0.05" class="w-full" />
            </div>
          </div>

          <div class="pt-2 border-t theme-colors-border-secondary space-y-2">
            <p class="theme-typography-size-xs uppercase tracking-wide opacity-60">Interactive Effects</p>
            <div class="flex flex-wrap items-center gap-4">
              <div class="flex items-center gap-2">
                <dxCheckbox v-model="theme.neonEnabled" label="Neon Glow" size="sm" />
                <input
                  v-if="theme.neonEnabled"
                  v-model="theme.neonColor"
                  type="color"
                  class="w-6 h-5 rounded cursor-pointer"
                />
              </div>
              <dxCheckbox v-model="theme.tiltEnabled" label="3D Tilt" size="sm" />
              <dxCheckbox v-model="theme.shimmerEnabled" label="Shimmer" size="sm" />
            </div>
          </div>
        </div>
      </dxCard>

      <!-- Button Effects -->
      <dxCard title="Button Effects">
        <div class="space-y-3">
          <div class="pt-2 border-t theme-colors-border-secondary space-y-3">
            <p class="theme-typography-size-xs uppercase tracking-wide opacity-60">Gradients</p>

            <div>
              <dxCheckbox v-model="theme.buttonGradientEnabled" label="Buttons" size="sm" />
              <dxSelect
                v-model="buttonGradientVariant"
                :options="buttonGradientPresets.map(p => ({ label: p.label, value: p.id }))"
                size="xs"
                class="mt-2"
              />
              <div class="flex items-center justify-between text-[11px] opacity-70 mt-2">
                <span>Intensity</span>
                <span>{{ buttonGradientIntensityValue.toFixed(2) }}</span>
              </div>
              <input v-model="buttonGradientIntensityValue" type="range" min="0" max="1" step="0.05" class="w-full" />
            </div>
          </div>

          <div class="pt-3 border-t theme-colors-border-secondary space-y-2">
            <p class="theme-typography-size-xs uppercase tracking-wide opacity-60">Button Gloss</p>
            <dxCheckbox v-model="theme.buttonGlossEnabled" label="Enable Gloss Overlay" size="sm" />
            <div class="space-y-1">
              <label class="flex items-center theme-typography-size-xs opacity-70 justify-between">
                Base Opacity: {{ theme.buttonGlossOpacity }}
              </label>
              <input v-model="theme.buttonGlossOpacity" type="range" min="0" max="1" step="0.05" class="w-full" />
            </div>
            <div class="space-y-1">
              <label class="flex items-center theme-typography-size-xs opacity-70 justify-between">
                Hover Opacity: {{ theme.buttonGlossHoverOpacity }}
              </label>
              <input v-model="theme.buttonGlossHoverOpacity" type="range" min="0" max="1" step="0.05" class="w-full" />
            </div>
            <div class="space-y-1">
              <label class="flex items-center theme-typography-size-xs opacity-70 justify-between">
                Active Opacity: {{ theme.buttonGlossActiveOpacity }}
              </label>
              <input v-model="theme.buttonGlossActiveOpacity" type="range" min="0" max="1" step="0.05" class="w-full" />
            </div>
          </div>
        </div>
      </dxCard>
    </div>

    </div> <!-- end preview zone -->

    <!-- Debug Info -->
    <dxCard title="Debug" class="mb-6">
      <div class="theme-typography-size-xs opacity-60 space-y-1">
        <p>Current Theme: {{ currentTheme }}</p>
        <p>Glass Mode: {{ glassModeStatus }}</p>
        <p>Save Status: {{ saveStatus }}</p>
        <p>Payload:</p>
      </div>
      <dxButton
        variant="outline"
        size="xs"
        class="mb-2"
        @click="copyPayload"
      >
        Copy payload
      </dxButton>
      <pre class="debug-json">{{ JSON.stringify(generatorPayload, null, 2) }}</pre>
    </dxCard>
  </div>
</template>

<style scoped>
.theme-editor-wrapper {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  padding: 0 0 2rem;
}

.page-header-card {
  border: 1px solid var(--color-border-primary, rgba(255, 255, 255, 0.1));
  background: var(--color-bg-secondary, rgba(255, 255, 255, 0.04));
  border-radius: 1rem;
  padding: 1.25rem 1.5rem;
  margin-bottom: 1.5rem;
}

.preview-zone {
  /* CSS variables cascade to all children */
}

.debug-json {
  margin-top: 0.5rem;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 0.5rem;
  padding: 0.75rem;
  font-size: 0.75rem;
  color: var(--color-text-primary);
  max-height: 320px;
  overflow: auto;
}

.theme-editor-wrapper input[type="color"] {
  appearance: none;
  width: 2.5rem;
  height: 2.5rem;
  padding: 0;
  border: 1px solid var(--color-border-secondary, rgba(148, 163, 184, 0.5));
  border-radius: 0.5rem;
  background: transparent;
  cursor: pointer;
  box-shadow: inset 0 0 2px rgba(0, 0, 0, 0.15);
}

.theme-editor-wrapper input[type="color"]::-webkit-color-swatch {
  border: none;
  border-radius: 0.45rem;
}

.theme-editor-wrapper input[type="color"]::-moz-color-swatch {
  border: none;
  border-radius: 0.45rem;
}

.color-picker {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.color-picker label {
  margin-bottom: 0 !important;
  flex: 1;
}

input[type="color"] {
  -webkit-appearance: none;
  border: 1px solid var(--color-border-primary);
  padding: 0;
}

input[type="color"]::-webkit-color-swatch-wrapper {
  padding: 2px;
}

input[type="color"]::-webkit-color-swatch {
  border: none;
  border-radius: 4px;
}

input[type="range"] {
  -webkit-appearance: none;
  background: var(--color-border-secondary);
  border: 1px solid var(--color-border-primary);
  border-radius: 4px;
  height: 6px;
}

input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 14px;
  height: 14px;
  background: var(--color-accent, var(--color-text-primary));
  border: 2px solid var(--color-bg-primary);
  border-radius: 50%;
  cursor: pointer;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

input[type="range"]::-moz-range-track {
  background: var(--color-border-secondary);
  border: 1px solid var(--color-border-primary);
  border-radius: 4px;
  height: 6px;
}

input[type="range"]::-moz-range-thumb {
  width: 14px;
  height: 14px;
  background: var(--color-accent, var(--color-text-primary));
  border: 2px solid var(--color-bg-primary);
  border-radius: 50%;
  cursor: pointer;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}
</style>

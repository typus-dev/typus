<route lang="json">
{
  "name": "system-settings",
  "path": "/system/settings",
  "meta": {
    "layout": "private",
    "requiresAuth": true,
    "subject": "system",
    "ability": {
      "action": "manage",
      "subject": "system"
    }
  }
}
</route>

<script setup lang="ts">
import { reactive, onMounted, computed, ref, watch } from 'vue'
import { useLoggingStore } from '@/core/store/loggingStore'
import { SystemConfigMethods } from '../methods/config.methods.dsl'
import dxContainer from '@/components/layout/dxContainer.vue'
import dxInput from '@/components/ui/dxInput.vue'
import dxSelect from '@/components/ui/dxSelect/dxSelect.vue'
import dxFormWrapper from '@/components/ui/dxFormWrapper.vue'
import dxTextArea from '@/components/ui/dxTextArea.vue'
import dxSwitch from '@/components/ui/dxSwitch.vue'
import dxBadge from '@/components/ui/dxBadge.vue'
import dxButton from '@/components/ui/dxButton.vue'
import ImageUploader from '@/components/ui/ImageUploader.vue'
import EmailProviderTypeSelector from '../components/email/EmailProviderTypeSelector.vue'
import SmtpSettings from '../components/email/SmtpSettings.vue'
import SendGridApiSettings from '../components/email/SendGridApiSettings.vue'
import MailgunApiSettings from '../components/email/MailgunApiSettings.vue'
import { useMessages } from '@/shared/composables/useMessages'
import { logger } from '@/core/logging/logger'

const { successMessage, errorMessage } = useMessages()

// Select options for specific config keys
const SELECT_OPTIONS: Record<string, Array<{ value: string; label: string }>> = {
  'logging.preset': [
    { value: 'debug', label: 'DEBUG - Development mode' }
  ],
  'logging.level': [
    { value: 'debug', label: 'Debug (All logs)' },
    { value: 'info', label: 'Info (Normal operation)' },
    { value: 'warn', label: 'Warn (Warnings only)' },
    { value: 'error', label: 'Error (Errors only)' }
  ],
  'logging.mode': [
    { value: 'console', label: 'Console only' },
    { value: 'database', label: 'Database only' },
    { value: 'database,console', label: 'Database + Console' },
    { value: 'none', label: 'Disabled' }
  ],
  'logging.frontend.level': [
    { value: 'debug', label: 'Debug (All logs)' },
    { value: 'info', label: 'Info (Normal operation)' },
    { value: 'warn', label: 'Warn (Warnings only)' },
    { value: 'error', label: 'Error (Errors only)' }
  ],
  'logging.frontend.mode': [
    { value: 'console', label: 'Console only' },
    { value: 'api', label: 'API only' },
    { value: 'both', label: 'Console + API' },
    { value: 'none', label: 'Disabled' }
  ],
  'features.registration_type': [
    { value: 'regular', label: 'Regular - Full registration form' },
    { value: 'simplified', label: 'Simplified - Minimal form' }
  ],
  'queue.driver': [
    { value: 'database', label: 'Database' },
    { value: 'redis', label: 'Redis (high-performance, requires Redis server)' }
  ],
  'ai.openrouter.default_model': [
    { value: 'anthropic/claude-sonnet-4.5', label: 'Claude Sonnet 4.5 (Anthropic)' },
    { value: 'google/gemini-2.5-flash', label: 'Gemini 2.5 Flash (Google)' },
    { value: 'google/gemini-3-pro-preview', label: 'Gemini 3 Pro Preview (Google)' },
    { value: 'x-ai/grok-4.1-fast:free', label: 'Grok 4.1 Fast Free (xAI)' },
    { value: 'minimax/minimax-m2', label: 'MiniMax M2' }
  ],
  'ai.agent.model': [
    { value: 'x-ai/grok-4.1-fast:free', label: 'Grok 4.1 Fast Free (xAI) - recommended' },
    { value: 'anthropic/claude-sonnet-4.5', label: 'Claude Sonnet 4.5 (Anthropic)' },
    { value: 'google/gemini-2.5-flash', label: 'Gemini 2.5 Flash (Google)' },
    { value: 'google/gemini-3-pro-preview', label: 'Gemini 3 Pro Preview (Google)' },
    { value: 'minimax/minimax-m2', label: 'MiniMax M2' }
  ]
}

// Hidden config keys (not used in UI)
const HIDDEN_CONFIG_KEYS = [
  'site.tagline',
  'site.timezone',
  'site.language'
]

// Config keys that use image uploader
const IMAGE_UPLOAD_KEYS = [
  'site.logo_url',
  'site.favicon_url'
]

// Page state
const pageData = reactive({
  configs: [] as any[],
  loading: true,
  saving: false,
  activeCategory: '',
  // Edit state for each config - use composite key to avoid ID conflicts between tables
  editValues: {} as Record<string, string>,
  // Telegram test state
  telegramTesting: false,
  // Email test state
  emailTesting: false,
  testEmailRecipient: ''
})

// Logging store for dynamic config updates
const loggingStore = useLoggingStore()

// Helper function to generate unique config key (avoids ID conflicts between tables)
const getConfigKey = (config: any): string => {
  return `${config._tableName}_${config.id}`
}

// Category mapping: database category → UI category
// Maps old 12 categories to new 8 user-intent-based categories
const CATEGORY_MAPPING: Record<string, string> = {
  // GENERAL tab (site identity + user features)
  'site': 'general',
  'features': 'general',

  // EMAIL tab (keep special layout)
  'email': 'email',

  // MESSAGING tab (Telegram notifications)
  'messaging': 'messaging',

  // INTEGRATIONS tab (OAuth, Monitoring, Social)
  'integrations': 'integrations',
  'social_media': 'integrations',

  // AI tab (AI services)
  'ai': 'ai',

  // QUEUES tab (task queues and background jobs)
  'queue': 'queues',

  // LOGGING tab (backend + frontend)
  'logging': 'logging',

  // PERFORMANCE tab (cache and performance tuning)
  'cache': 'performance',
  'performance': 'performance',

  // SECURITY tab (password policy + API security)
  'security': 'security'
}

// UI category labels
const CATEGORY_LABELS: Record<string, string> = {
  'general': 'General',
  'email': 'Email',
  'messaging': 'Messaging',
  'integrations': 'Integrations',
  'ai': 'AI',
  'queues': 'Queues',
  'logging': 'Logging',
  'performance': 'Performance',
  'security': 'Security'
}

// Get unique UI categories (9 tabs instead of 12)
// Order: general, email, messaging, integrations, ai, queues, logging, performance, security
const categories = computed(() => {
  const uiCategories = ['general', 'email', 'messaging', 'integrations', 'ai', 'queues', 'logging', 'performance', 'security']

  // Filter only categories that have configs
  const configCategories = new Set(
    pageData.configs
      .map(c => CATEGORY_MAPPING[c.category])
      .filter(Boolean)
  )

  return uiCategories.filter(cat => configCategories.has(cat))
})

// Filter configs by active category and exclude hidden ones
// Now uses category mapping to filter by UI category instead of database category
const filteredConfigs = computed(() => {
  return pageData.configs.filter(c => {
    const uiCategory = CATEGORY_MAPPING[c.category]
    return uiCategory === pageData.activeCategory &&
           !HIDDEN_CONFIG_KEYS.includes(c.key)
  })
})

// Special layout for GENERAL category (was SITE)
const siteLayout = computed(() => {
  if (pageData.activeCategory !== 'general') return null

  const configs = filteredConfigs.value
  return {
    name: configs.find(c => c.key === 'site.name'),
    description: configs.find(c => c.key === 'site.description'),
    logo: configs.find(c => c.key === 'site.logo_url'),
    favicon: configs.find(c => c.key === 'site.favicon_url')
  }
})

// Special layout for EMAIL category
const emailLayout = computed(() => {
  if (pageData.activeCategory !== 'email') return null

  const configs = filteredConfigs.value
  return {
    // Provider selection
    provider: configs.find(c => c.key === 'email.provider'),

    // Common fields
    fromAddress: configs.find(c => c.key === 'email.from_address'),
    fromName: configs.find(c => c.key === 'email.from_name'),
    replyTo: configs.find(c => c.key === 'email.reply_to'),

    // SMTP fields
    smtpHost: configs.find(c => c.key === 'email.smtp_host'),
    smtpPort: configs.find(c => c.key === 'email.smtp_port'),
    smtpUsername: configs.find(c => c.key === 'email.smtp_username'),
    smtpPassword: configs.find(c => c.key === 'email.smtp_password'),
    smtpSecure: configs.find(c => c.key === 'email.smtp_secure'),

    // API fields
    apiKey: configs.find(c => c.key === 'email.api_key'),
    apiEndpoint: configs.find(c => c.key === 'email.api_endpoint')
  }
})

// Special layout for INTEGRATIONS category
const integrationsLayout = computed(() => {
  if (pageData.activeCategory !== 'integrations') return null

  const configs = filteredConfigs.value
  return {
    // Google OAuth
    googleClientId: configs.find(c => c.key === 'integrations.google_client_id'),
    googleClientSecret: configs.find(c => c.key === 'integrations.google_client_secret'),
    googleCallbackUrl: configs.find(c => c.key === 'integrations.google_callback_url'),

    // Google reCAPTCHA
    recaptchaSiteKey: configs.find(c => c.key === 'integrations.google_recaptcha_site_key'),
    recaptchaSecretKey: configs.find(c => c.key === 'integrations.google_recaptcha_secret_key'),

    // Google Analytics
    googleAnalyticsId: configs.find(c => c.key === 'integrations.google_analytics_id'),

    // Twitter OAuth
    twitterClientId: configs.find(c => c.key === 'integrations.twitter_client_id'),
    twitterClientSecret: configs.find(c => c.key === 'integrations.twitter_client_secret'),
    twitterRedirectUri: configs.find(c => c.key === 'integrations.twitter_redirect_uri'),

    // Stripe
    stripePublishableKey: configs.find(c => c.key === 'integrations.stripe_publishable_key'),
    stripeSecretKey: configs.find(c => c.key === 'integrations.stripe_secret_key'),

    // Social Media
    socialMediaPublishingEnabled: configs.find(c => c.key === 'social_media.publishing_enabled')
  }
})

// AI category uses dynamic layout (no hardcoded fields)

// Separate boolean configs (switches) from others
const booleanConfigs = computed(() => {
  return filteredConfigs.value.filter(c => c.dataType === 'boolean')
})

// Get logging preset config separately (for special display)
const loggingPresetConfig = computed(() => {
  return filteredConfigs.value.find(c => c.key === 'logging.preset')
})

const nonBooleanConfigs = computed(() => {
  return filteredConfigs.value.filter(c =>
    c.dataType !== 'boolean' && c.key !== 'logging.preset'
  )
})

// Group configs into two columns (for non-site categories)
const configColumns = computed(() => {
  const configs = nonBooleanConfigs.value
  const mid = Math.ceil(configs.length / 2)
  return {
    left: configs.slice(0, mid),
    right: configs.slice(mid)
  }
})

// Check if any value has been modified
const hasChanges = computed(() => {
  return pageData.configs.some(config => {
    const configKey = getConfigKey(config)
    return pageData.editValues[configKey] !== config.value
  })
})

// Actions
const fetchConfigs = async () => {
  pageData.loading = true
  logger.debug('[SystemSettings] Fetching all configs')

  const allConfigs = await SystemConfigMethods.getAll()

  // Flatten grouped configs
  pageData.configs = Object.values(allConfigs).flat()

  // Initialize edit values using composite keys to avoid ID conflicts
  pageData.configs.forEach(config => {
    const configKey = getConfigKey(config)
    pageData.editValues[configKey] = config.value

    // Debug logging for logo and favicon
    if (config.key === 'site.logo_url' || config.key === 'site.favicon_url') {
      logger.debug(`[SystemSettings] Loaded ${config.key}:`, {
        id: config.id,
        configKey,
        value: config.value,
        tableName: config._tableName
      })
    }
  })

  // Set first category as active
  if (pageData.configs.length > 0) {
    const firstCategory = categories.value[0]
    if (firstCategory) {
      pageData.activeCategory = firstCategory
    }
  }

  pageData.loading = false
  logger.debug('[SystemSettings] Configs loaded:', pageData.configs.length)
}

const saveAllConfigs = async () => {
  pageData.saving = true
  logger.debug('[SystemSettings] Saving all modified configs')

  const updates = pageData.configs.filter(config => {
    const configKey = getConfigKey(config)
    return pageData.editValues[configKey] !== config.value
  })

  // Track if logging configs were updated
  let loggingConfigsUpdated = false

  for (const config of updates) {
    const configKey = getConfigKey(config)
    const newValue = pageData.editValues[configKey]
    // Pass table name to route update to correct table
    await SystemConfigMethods.update(config.id, newValue, config._tableName)

    // Update local state
    const configIndex = pageData.configs.findIndex(c =>
      getConfigKey(c) === configKey
    )
    if (configIndex >= 0) {
      pageData.configs[configIndex].value = newValue
    }

    // Track logging category updates
    if (config.category === 'logging') {
      loggingConfigsUpdated = true
    }
  }

  // Refresh logging store if logging configs were changed
  if (loggingConfigsUpdated) {
    logger.debug('[SystemSettings] Refreshing logging store after config update')
    await loggingStore.refreshConfig()
    logger.info('[SystemSettings] Logging configuration updated - changes applied instantly!')
  }

  successMessage(`${updates.length} setting(s) updated successfully`)
  pageData.saving = false
}

const handleCancel = () => {
  // Reset all edit values to original
  pageData.configs.forEach(config => {
    const configKey = getConfigKey(config)
    pageData.editValues[configKey] = config.value
  })
}

const getCategoryBadgeVariant = (category: string) => {
  const variants: Record<string, 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info'> = {
    site: 'info',
    seo: 'success',
    ui: 'primary',
    email: 'warning',
    logging: 'primary',
    messaging: 'info',
    security: 'error',
    features: 'success',
    integrations: 'secondary',
    performance: 'primary'
  }
  return variants[category] || 'secondary'
}

// Handle image upload
const handleImageUploaded = async (config: any, url: string) => {
  const configKey = getConfigKey(config)

  logger.debug(`[SystemSettings] handleImageUploaded called:`, {
    configKey: config.key,
    configId: config.id,
    compositeKey: configKey,
    newUrl: url,
    tableName: config._tableName
  })

  // Update edit value using composite key
  pageData.editValues[configKey] = url
  logger.debug(`[SystemSettings] Updated editValues[${configKey}] =`, url)

  // Auto-save this config
  await SystemConfigMethods.update(config.id, url, config._tableName)
  logger.debug(`[SystemSettings] Database updated for ${config.key}`)

  // Update local state
  const configIndex = pageData.configs.findIndex(c => getConfigKey(c) === configKey)
  if (configIndex >= 0) {
    pageData.configs[configIndex].value = url
    logger.debug(`[SystemSettings] Updated local configs[${configIndex}].value =`, url)
  }

  successMessage(`${config.key} updated successfully`)
}

// Test Telegram connection
const testTelegram = async () => {
  pageData.telegramTesting = true

  try {
    logger.debug('[SystemSettings] Testing Telegram connection')

    const response = await fetch('/api/system/test-telegram', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include'
    })

    const data = await response.json()

    if (response.ok && data.success) {
      successMessage(data.message || 'Telegram test successful!')
    } else {
      errorMessage(data.message || data.error || 'Telegram test failed')
    }
  } catch (error) {
    logger.error('[SystemSettings] Telegram test error:', error)
    errorMessage(`Test failed: ${error.message}`)
  } finally {
    pageData.telegramTesting = false
  }
}

// Test Email connection
const testEmail = async () => {
  if (!pageData.testEmailRecipient || !pageData.testEmailRecipient.includes('@')) {
    errorMessage('Please enter a valid email address')
    return
  }

  pageData.emailTesting = true

  try {
    // Collect current email configuration from form (editValues)
    const emailConfig = {}
    Object.keys(pageData.editValues).forEach(key => {
      if (key.startsWith('email.')) {
        emailConfig[key] = pageData.editValues[key]
      }
    })

    logger.debug('[SystemSettings] Testing email configuration', {
      recipient: pageData.testEmailRecipient,
      config: emailConfig
    })

    const response = await fetch('/api/system/test-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({
        recipient: pageData.testEmailRecipient,
        config: emailConfig
      })
    })

    const data = await response.json()

    if (response.ok && data.success) {
      successMessage(data.message || `Test email sent to ${pageData.testEmailRecipient}!`)
    } else {
      errorMessage(data.message || data.error?.message || 'Email test failed')
    }
  } catch (error) {
    logger.error('[SystemSettings] Email test error:', error)
    errorMessage(`Test failed: ${error.message}`)
  } finally {
    pageData.emailTesting = false
  }
}

// Check if config is a telegram field
const isTelegramField = (key: string) => {
  return key.startsWith('messaging.telegram.')
}

// Check if config is an email field
const isEmailField = (key: string) => {
  return key.startsWith('email.')
}

// Check if config has select options
const hasSelectOptions = (key: string) => {
  return !!SELECT_OPTIONS[key]
}

// Get select options for config key
const getSelectOptions = (key: string) => {
  return SELECT_OPTIONS[key] || []
}

// Apply logging preset to all related configs
const applyLoggingPreset = (preset: string) => {
  logger.debug('[SystemSettings] Auto-applying logging preset:', preset)

  const presetConfigs = {
    off: {
      'logging.level': 'error',
      'logging.mode': 'none',
      'logging.frontend.level': 'error',
      'logging.frontend.mode': 'none',
      'logging.debug_mode': 'false',
      'logging.loki_api_enabled': 'false',
      'logging.prisma_queries': 'false'
    },
    error: {
      'logging.level': 'error',
      'logging.mode': 'database',
      'logging.frontend.level': 'error',
      'logging.frontend.mode': 'none',
      'logging.debug_mode': 'false',
      'logging.loki_api_enabled': 'false',
      'logging.prisma_queries': 'false'
    },
    info: {
      'logging.level': 'info',
      'logging.mode': 'database,console',
      'logging.frontend.level': 'info',
      'logging.frontend.mode': 'console',
      'logging.debug_mode': 'false',
      'logging.loki_api_enabled': 'false',
      'logging.prisma_queries': 'false'
    },
    debug: {
      'logging.level': 'debug',
      'logging.mode': 'database,console',
      'logging.frontend.level': 'debug',
      'logging.frontend.mode': 'console',
      'logging.debug_mode': 'true',
      'logging.loki_api_enabled': 'true',
      'logging.prisma_queries': 'true'
    }
  }

  const config = presetConfigs[preset as keyof typeof presetConfigs]
  if (!config) return

  // Apply preset to all related configs
  pageData.configs.forEach(cfg => {
    if (config[cfg.key as keyof typeof config] !== undefined) {
      const configKey = getConfigKey(cfg)
      pageData.editValues[configKey] = config[cfg.key as keyof typeof config]
    }
  })

  logger.debug('[SystemSettings] Preset applied successfully')
}

// Watch for preset changes and auto-apply
watch(
  () => loggingPresetConfig.value ? pageData.editValues[getConfigKey(loggingPresetConfig.value)] : null,
  (newPreset, oldPreset) => {
    if (newPreset && newPreset !== oldPreset && pageData.activeCategory === 'logging') {
      applyLoggingPreset(newPreset)
    }
  }
)

onMounted(() => {
  fetchConfigs()
})
</script>

<template>
  
    <dxFormWrapper
      mode="edit"
      title="System Settings"
      :loading="pageData.saving"
      :disabled="!hasChanges"
      save-label="Save All Changes"
      @save="saveAllConfigs"
      @cancel="handleCancel"
    >
      <!-- Loading state -->
      <div v-if="pageData.loading" class="text-center py-12">
        <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        <p class="mt-4 text-gray-600">Loading settings...</p>
      </div>

      <!-- Content -->
      <div v-else class="space-y-6">
        <!-- Category tabs -->
        <div class="flex gap-2 overflow-x-auto pb-2 border-b">
          <button
            v-for="category in categories"
            :key="category"
            @click="pageData.activeCategory = category"
            :class="[
              'px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap',
              pageData.activeCategory === category
                ? 'border-b-2 border-current opacity-100'
                : 'opacity-60 hover:opacity-80'
            ]"
          >
            {{ CATEGORY_LABELS[category] || category.toUpperCase() }}
            <span class="ml-2 text-xs opacity-75">
              ({{ pageData.configs.filter((c: any) => CATEGORY_MAPPING[c.category] === category && !HIDDEN_CONFIG_KEYS.includes(c.key)).length }})
            </span>
          </button>
        </div>

        <!-- Special layout for EMAIL category -->
        <div v-if="pageData.activeCategory === 'email' && emailLayout" class="space-y-6">
          <!-- Common Email Settings -->
          <div class="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <!-- From Address -->
            <div v-if="emailLayout.fromAddress" class="p-4 rounded-lg theme-colors-background-secondary theme-colors-border-secondary hover:theme-colors-border-primary transition-colors">
              <div class="mb-3">
                <h3 class="font-semibold text-sm">From Address</h3>
                <p class="text-xs text-gray-600 mt-1">Default sender email address</p>
              </div>
              <dxInput
                v-model="pageData.editValues[getConfigKey(emailLayout.fromAddress)]"
                placeholder="noreply@example.com"
                size="sm"
              />
              <div
                v-if="pageData.editValues[getConfigKey(emailLayout.fromAddress)] !== emailLayout.fromAddress.value"
                class="text-xs theme-colors-text-warning mt-2"
              >
                ⚠️ Modified
              </div>
            </div>

            <!-- From Name -->
            <div v-if="emailLayout.fromName" class="p-4 rounded-lg theme-colors-background-secondary theme-colors-border-secondary hover:theme-colors-border-primary transition-colors">
              <div class="mb-3">
                <h3 class="font-semibold text-sm">From Name</h3>
                <p class="text-xs text-gray-600 mt-1">Default sender name</p>
              </div>
              <dxInput
                v-model="pageData.editValues[getConfigKey(emailLayout.fromName)]"
                placeholder="My Site"
                size="sm"
              />
              <div
                v-if="pageData.editValues[getConfigKey(emailLayout.fromName)] !== emailLayout.fromName.value"
                class="text-xs theme-colors-text-warning mt-2"
              >
                ⚠️ Modified
              </div>
            </div>

            <!-- Reply To -->
            <div v-if="emailLayout.replyTo" class="p-4 rounded-lg theme-colors-background-secondary theme-colors-border-secondary hover:theme-colors-border-primary transition-colors">
              <div class="mb-3">
                <h3 class="font-semibold text-sm">Reply-To Address</h3>
                <p class="text-xs text-gray-600 mt-1">Where replies go (optional)</p>
              </div>
              <dxInput
                v-model="pageData.editValues[getConfigKey(emailLayout.replyTo)]"
                placeholder="support@example.com"
                size="sm"
              />
              <div
                v-if="pageData.editValues[getConfigKey(emailLayout.replyTo)] !== emailLayout.replyTo.value"
                class="text-xs theme-colors-text-warning mt-2"
              >
                ⚠️ Modified
              </div>
            </div>

            <!-- Test Email Section -->
            <div class="p-4 rounded-lg border-2 opacity-90">
              <h3 class="font-semibold text-sm mb-3">Test Email Configuration</h3>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label class="block text-xs font-medium mb-1">
                    Recipient Email
                  </label>
                  <dxInput
                    v-model="pageData.testEmailRecipient"
                    placeholder="your@email.com"
                    size="sm"
                    :noGutters="true"
                  />
                </div>
                <div class="flex items-end">
                  <dxButton
                    @click="testEmail"
                    :disabled="pageData.emailTesting || !pageData.testEmailRecipient"
                    :loading="pageData.emailTesting"
                    variant="primary"
                    size="sm"
                    class="w-full"
                  >
                    {{ pageData.emailTesting ? 'Sending...' : 'test' }}
                  </dxButton>
                </div>
              </div>
            </div>
          </div>

          <!-- Provider Type Selector -->
          <div class="p-4 rounded-lg theme-colors-background-secondary theme-colors-border-secondary">
            <h3 class="font-semibold text-sm mb-3">Email Provider Type</h3>
            <EmailProviderTypeSelector
              v-if="emailLayout.provider"
              v-model="pageData.editValues[getConfigKey(emailLayout.provider)]"
            />
          </div>

          <!-- SMTP Settings (shown when provider is 'smtp') -->
          <div
            v-if="emailLayout.provider && pageData.editValues[getConfigKey(emailLayout.provider)] === 'smtp'"
            class="p-4 rounded-lg theme-colors-background-secondary theme-colors-border-secondary"
          >
            <h3 class="font-semibold text-sm mb-3">SMTP Server Configuration</h3>
            <SmtpSettings
              v-if="emailLayout.smtpHost && emailLayout.smtpPort && emailLayout.smtpUsername && emailLayout.smtpPassword && emailLayout.smtpSecure"
              :host="pageData.editValues[getConfigKey(emailLayout.smtpHost)]"
              :port="pageData.editValues[getConfigKey(emailLayout.smtpPort)]"
              :username="pageData.editValues[getConfigKey(emailLayout.smtpUsername)]"
              :password="pageData.editValues[getConfigKey(emailLayout.smtpPassword)]"
              :secure="pageData.editValues[getConfigKey(emailLayout.smtpSecure)]"
              @update:host="pageData.editValues[getConfigKey(emailLayout.smtpHost)] = $event"
              @update:port="pageData.editValues[getConfigKey(emailLayout.smtpPort)] = $event"
              @update:username="pageData.editValues[getConfigKey(emailLayout.smtpUsername)] = $event"
              @update:password="pageData.editValues[getConfigKey(emailLayout.smtpPassword)] = $event"
              @update:secure="pageData.editValues[getConfigKey(emailLayout.smtpSecure)] = $event"
            />
          </div>

          <!-- SendGrid API Settings (shown when provider is 'sendgrid-api') -->
          <div
            v-if="emailLayout.provider && pageData.editValues[getConfigKey(emailLayout.provider)] === 'sendgrid-api'"
            class="p-4 rounded-lg theme-colors-background-secondary theme-colors-border-secondary"
          >
            <h3 class="font-semibold text-sm mb-3">SendGrid API Configuration</h3>
            <SendGridApiSettings
              v-if="emailLayout.apiKey"
              :api-key="pageData.editValues[getConfigKey(emailLayout.apiKey)]"
              @update:api-key="pageData.editValues[getConfigKey(emailLayout.apiKey)] = $event"
            />
          </div>

          <!-- Mailgun API Settings (shown when provider is 'mailgun-api') -->
          <div
            v-if="emailLayout.provider && pageData.editValues[getConfigKey(emailLayout.provider)] === 'mailgun-api'"
            class="p-4 rounded-lg theme-colors-background-secondary theme-colors-border-secondary"
          >
            <h3 class="font-semibold text-sm mb-3">Mailgun API Configuration</h3>
            <MailgunApiSettings
              v-if="emailLayout.apiKey && emailLayout.apiEndpoint"
              :api-key="pageData.editValues[getConfigKey(emailLayout.apiKey)]"
              :api-endpoint="pageData.editValues[getConfigKey(emailLayout.apiEndpoint)]"
              @update:api-key="pageData.editValues[getConfigKey(emailLayout.apiKey)] = $event"
              @update:api-endpoint="pageData.editValues[getConfigKey(emailLayout.apiEndpoint)] = $event"
            />
          </div>
        </div>

        <!-- Special layout for INTEGRATIONS category (grouped by service) -->
        <div v-else-if="pageData.activeCategory === 'integrations' && integrationsLayout" class="space-y-6">

          <!-- Google OAuth -->
          <div v-if="integrationsLayout.googleClientId" class="p-4 rounded-lg theme-colors-background-secondary theme-colors-border-secondary hover:theme-colors-border-primary transition-colors">
            <h3 class="font-semibold text-base mb-4">
              Google OAuth
            </h3>
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <!-- Client ID -->
              <div>
                <label class="block text-sm font-medium mb-2">
                  {{ integrationsLayout.googleClientId.key }}
                </label>
                <p v-if="integrationsLayout.googleClientId.description" class="text-xs text-gray-600 mb-2">
                  {{ integrationsLayout.googleClientId.description }}
                </p>
                <dxInput
                  v-model="pageData.editValues[getConfigKey(integrationsLayout.googleClientId)]"
                  size="sm"
                  placeholder="Google Client ID"
                />
                <div
                  v-if="pageData.editValues[getConfigKey(integrationsLayout.googleClientId)] !== integrationsLayout.googleClientId.value"
                  class="text-xs theme-colors-text-warning mt-2"
                >
                  ⚠️ Modified
                </div>
              </div>

              <!-- Client Secret -->
              <div v-if="integrationsLayout.googleClientSecret">
                <label class="block text-sm font-medium mb-2">
                  {{ integrationsLayout.googleClientSecret.key }}
                  <span class="theme-colors-text-warning">🔒</span>
                </label>
                <p v-if="integrationsLayout.googleClientSecret.description" class="text-xs text-gray-600 mb-2">
                  {{ integrationsLayout.googleClientSecret.description }}
                </p>
                <dxInput
                  v-model="pageData.editValues[getConfigKey(integrationsLayout.googleClientSecret)]"
                  type="password"
                  size="sm"
                  placeholder="Google Client Secret"
                />
                <div
                  v-if="pageData.editValues[getConfigKey(integrationsLayout.googleClientSecret)] !== integrationsLayout.googleClientSecret.value"
                  class="text-xs theme-colors-text-warning mt-2"
                >
                  ⚠️ Modified
                </div>
              </div>

              <!-- Callback URL -->
              <div v-if="integrationsLayout.googleCallbackUrl" class="lg:col-span-2">
                <label class="block text-sm font-medium mb-2">
                  {{ integrationsLayout.googleCallbackUrl.key }}
                </label>
                <p v-if="integrationsLayout.googleCallbackUrl.description" class="text-xs text-gray-600 mb-2">
                  {{ integrationsLayout.googleCallbackUrl.description }}
                </p>
                <dxInput
                  v-model="pageData.editValues[getConfigKey(integrationsLayout.googleCallbackUrl)]"
                  size="sm"
                  placeholder="https://yourdomain.com/api/auth/google/callback"
                />
                <div
                  v-if="pageData.editValues[getConfigKey(integrationsLayout.googleCallbackUrl)] !== integrationsLayout.googleCallbackUrl.value"
                  class="text-xs theme-colors-text-warning mt-2"
                >
                  ⚠️ Modified
                </div>
              </div>
            </div>
          </div>

          <!-- Google reCAPTCHA -->
          <div v-if="integrationsLayout.recaptchaSiteKey" class="p-4 rounded-lg theme-colors-background-secondary theme-colors-border-secondary hover:theme-colors-border-primary transition-colors">
            <h3 class="font-semibold text-base mb-4">
              Google reCAPTCHA
            </h3>
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <!-- Site Key -->
              <div>
                <label class="block text-sm font-medium mb-2">
                  {{ integrationsLayout.recaptchaSiteKey.key }}
                </label>
                <p v-if="integrationsLayout.recaptchaSiteKey.description" class="text-xs text-gray-600 mb-2">
                  {{ integrationsLayout.recaptchaSiteKey.description }}
                </p>
                <dxInput
                  v-model="pageData.editValues[getConfigKey(integrationsLayout.recaptchaSiteKey)]"
                  size="sm"
                  placeholder="reCAPTCHA Site Key"
                />
                <div
                  v-if="pageData.editValues[getConfigKey(integrationsLayout.recaptchaSiteKey)] !== integrationsLayout.recaptchaSiteKey.value"
                  class="text-xs theme-colors-text-warning mt-2"
                >
                  ⚠️ Modified
                </div>
              </div>

              <!-- Secret Key -->
              <div v-if="integrationsLayout.recaptchaSecretKey">
                <label class="block text-sm font-medium mb-2">
                  {{ integrationsLayout.recaptchaSecretKey.key }}
                  <span class="theme-colors-text-warning">🔒</span>
                </label>
                <p v-if="integrationsLayout.recaptchaSecretKey.description" class="text-xs text-gray-600 mb-2">
                  {{ integrationsLayout.recaptchaSecretKey.description }}
                </p>
                <dxInput
                  v-model="pageData.editValues[getConfigKey(integrationsLayout.recaptchaSecretKey)]"
                  type="password"
                  size="sm"
                  placeholder="reCAPTCHA Secret Key"
                />
                <div
                  v-if="pageData.editValues[getConfigKey(integrationsLayout.recaptchaSecretKey)] !== integrationsLayout.recaptchaSecretKey.value"
                  class="text-xs theme-colors-text-warning mt-2"
                >
                  ⚠️ Modified
                </div>
              </div>
            </div>
          </div>

          <!-- Google Analytics -->
          <div v-if="integrationsLayout.googleAnalyticsId" class="p-4 rounded-lg theme-colors-background-secondary theme-colors-border-secondary hover:theme-colors-border-primary transition-colors">
            <h3 class="font-semibold text-base mb-4">
              Google Analytics
            </h3>
            <div>
              <label class="block text-sm font-medium mb-2">
                {{ integrationsLayout.googleAnalyticsId.key }}
              </label>
              <p v-if="integrationsLayout.googleAnalyticsId.description" class="text-xs text-gray-600 mb-2">
                {{ integrationsLayout.googleAnalyticsId.description }}
              </p>
              <dxInput
                v-model="pageData.editValues[getConfigKey(integrationsLayout.googleAnalyticsId)]"
                size="sm"
                placeholder="G-XXXXXXXXXX"
              />
              <div
                v-if="pageData.editValues[getConfigKey(integrationsLayout.googleAnalyticsId)] !== integrationsLayout.googleAnalyticsId.value"
                class="text-xs theme-colors-text-warning mt-2"
              >
                ⚠️ Modified
              </div>
            </div>
          </div>

          <!-- Twitter OAuth -->
          <div v-if="integrationsLayout.twitterClientId" class="p-4 rounded-lg theme-colors-background-secondary theme-colors-border-secondary hover:theme-colors-border-primary transition-colors">
            <h3 class="font-semibold text-base mb-4">
              Twitter OAuth
            </h3>
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <!-- Client ID -->
              <div>
                <label class="block text-sm font-medium mb-2">
                  {{ integrationsLayout.twitterClientId.key }}
                </label>
                <p v-if="integrationsLayout.twitterClientId.description" class="text-xs text-gray-600 mb-2">
                  {{ integrationsLayout.twitterClientId.description }}
                </p>
                <dxInput
                  v-model="pageData.editValues[getConfigKey(integrationsLayout.twitterClientId)]"
                  size="sm"
                  placeholder="Twitter Client ID"
                />
                <div
                  v-if="pageData.editValues[getConfigKey(integrationsLayout.twitterClientId)] !== integrationsLayout.twitterClientId.value"
                  class="text-xs theme-colors-text-warning mt-2"
                >
                  ⚠️ Modified
                </div>
              </div>

              <!-- Client Secret -->
              <div v-if="integrationsLayout.twitterClientSecret">
                <label class="block text-sm font-medium mb-2">
                  {{ integrationsLayout.twitterClientSecret.key }}
                  <span class="theme-colors-text-warning">🔒</span>
                </label>
                <p v-if="integrationsLayout.twitterClientSecret.description" class="text-xs text-gray-600 mb-2">
                  {{ integrationsLayout.twitterClientSecret.description }}
                </p>
                <dxInput
                  v-model="pageData.editValues[getConfigKey(integrationsLayout.twitterClientSecret)]"
                  type="password"
                  size="sm"
                  placeholder="Twitter Client Secret"
                />
                <div
                  v-if="pageData.editValues[getConfigKey(integrationsLayout.twitterClientSecret)] !== integrationsLayout.twitterClientSecret.value"
                  class="text-xs theme-colors-text-warning mt-2"
                >
                  ⚠️ Modified
                </div>
              </div>

              <!-- Redirect URI -->
              <div v-if="integrationsLayout.twitterRedirectUri" class="lg:col-span-2">
                <label class="block text-sm font-medium mb-2">
                  {{ integrationsLayout.twitterRedirectUri.key }}
                </label>
                <p v-if="integrationsLayout.twitterRedirectUri.description" class="text-xs text-gray-600 mb-2">
                  {{ integrationsLayout.twitterRedirectUri.description }}
                </p>
                <dxInput
                  v-model="pageData.editValues[getConfigKey(integrationsLayout.twitterRedirectUri)]"
                  size="sm"
                  placeholder="https://yourdomain.com/api/auth/twitter/callback"
                />
                <div
                  v-if="pageData.editValues[getConfigKey(integrationsLayout.twitterRedirectUri)] !== integrationsLayout.twitterRedirectUri.value"
                  class="text-xs theme-colors-text-warning mt-2"
                >
                  ⚠️ Modified
                </div>
              </div>
            </div>
          </div>

          <!-- Stripe -->
          <div v-if="integrationsLayout.stripePublishableKey" class="p-4 rounded-lg theme-colors-background-secondary theme-colors-border-secondary hover:theme-colors-border-primary transition-colors">
            <h3 class="font-semibold text-base mb-4">
              Stripe
            </h3>
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <!-- Publishable Key -->
              <div>
                <label class="block text-sm font-medium mb-2">
                  {{ integrationsLayout.stripePublishableKey.key }}
                </label>
                <p v-if="integrationsLayout.stripePublishableKey.description" class="text-xs text-gray-600 mb-2">
                  {{ integrationsLayout.stripePublishableKey.description }}
                </p>
                <dxInput
                  v-model="pageData.editValues[getConfigKey(integrationsLayout.stripePublishableKey)]"
                  size="sm"
                  placeholder="pk_..."
                />
                <div
                  v-if="pageData.editValues[getConfigKey(integrationsLayout.stripePublishableKey)] !== integrationsLayout.stripePublishableKey.value"
                  class="text-xs theme-colors-text-warning mt-2"
                >
                  ⚠️ Modified
                </div>
              </div>

              <!-- Secret Key -->
              <div v-if="integrationsLayout.stripeSecretKey">
                <label class="block text-sm font-medium mb-2">
                  {{ integrationsLayout.stripeSecretKey.key }}
                  <span class="theme-colors-text-warning">🔒</span>
                </label>
                <p v-if="integrationsLayout.stripeSecretKey.description" class="text-xs text-gray-600 mb-2">
                  {{ integrationsLayout.stripeSecretKey.description }}
                </p>
                <dxInput
                  v-model="pageData.editValues[getConfigKey(integrationsLayout.stripeSecretKey)]"
                  type="password"
                  size="sm"
                  placeholder="sk_..."
                />
                <div
                  v-if="pageData.editValues[getConfigKey(integrationsLayout.stripeSecretKey)] !== integrationsLayout.stripeSecretKey.value"
                  class="text-xs theme-colors-text-warning mt-2"
                >
                  ⚠️ Modified
                </div>
              </div>
            </div>
          </div>

          <!-- Social Media -->
          <div v-if="integrationsLayout.socialMediaPublishingEnabled" class="p-4 rounded-lg theme-colors-background-secondary theme-colors-border-secondary hover:theme-colors-border-primary transition-colors">
            <h3 class="font-semibold text-base mb-4">
              Social Media
            </h3>
            <div>
              <label class="block text-sm font-medium mb-2">
                {{ integrationsLayout.socialMediaPublishingEnabled.key }}
              </label>
              <p v-if="integrationsLayout.socialMediaPublishingEnabled.description" class="text-xs text-gray-600 mb-2">
                {{ integrationsLayout.socialMediaPublishingEnabled.description }}
              </p>
              <dxSwitch
                :modelValue="pageData.editValues[getConfigKey(integrationsLayout.socialMediaPublishingEnabled)] === 'true' || pageData.editValues[getConfigKey(integrationsLayout.socialMediaPublishingEnabled)] === '1'"
                @update:modelValue="pageData.editValues[getConfigKey(integrationsLayout.socialMediaPublishingEnabled)] = $event ? 'true' : 'false'"
                :label="pageData.editValues[getConfigKey(integrationsLayout.socialMediaPublishingEnabled)] === 'true' ? 'Enabled' : 'Disabled'"
              />
              <div
                v-if="pageData.editValues[getConfigKey(integrationsLayout.socialMediaPublishingEnabled)] !== integrationsLayout.socialMediaPublishingEnabled.value"
                class="text-xs theme-colors-text-warning mt-2"
              >
                ⚠️ Modified
              </div>
            </div>
          </div>
        </div>

        <!-- Special layout for GENERAL category (site + features) -->
        <div v-else-if="pageData.activeCategory === 'general' && siteLayout" class="space-y-6">
          <!-- Row 1: Name (left) and Description (right) -->
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <!-- Site Name -->
            <div v-if="siteLayout.name" class="p-4 rounded-lg theme-colors-background-secondary theme-colors-border-secondary hover:theme-colors-border-primary transition-colors">
              <div class="mb-3">
                <h3 class="font-semibold text-sm">{{ siteLayout.name.key }}</h3>
                <p v-if="siteLayout.name.description" class="text-xs text-gray-600 mt-1">
                  {{ siteLayout.name.description }}
                </p>
              </div>
              <dxInput
                v-model="pageData.editValues[getConfigKey(siteLayout.name)]"
                size="sm"
              />
              <div
                v-if="pageData.editValues[getConfigKey(siteLayout.name)] !== siteLayout.name.value"
                class="text-xs theme-colors-text-warning mt-2"
              >
                ⚠️ Modified
              </div>
            </div>

            <!-- Site Description -->
            <div v-if="siteLayout.description" class="p-4 rounded-lg theme-colors-background-secondary theme-colors-border-secondary hover:theme-colors-border-primary transition-colors">
              <div class="mb-3">
                <h3 class="font-semibold text-sm">{{ siteLayout.description.key }}</h3>
                <p v-if="siteLayout.description.description" class="text-xs text-gray-600 mt-1">
                  {{ siteLayout.description.description }}
                </p>
              </div>
              <dxTextArea
                v-model="pageData.editValues[getConfigKey(siteLayout.description)]"
                :rows="2"
                class="text-sm"
              />
              <div
                v-if="pageData.editValues[getConfigKey(siteLayout.description)] !== siteLayout.description.value"
                class="text-xs theme-colors-text-warning mt-2"
              >
                ⚠️ Modified
              </div>
            </div>
          </div>

          <!-- Row 2: Logo (left) and Favicon (right) -->
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <!-- Site Logo -->
            <div v-if="siteLayout.logo" class="p-4 rounded-lg theme-colors-background-secondary theme-colors-border-secondary hover:theme-colors-border-primary transition-colors">
              <div class="mb-3">
                <h3 class="font-semibold text-sm">{{ siteLayout.logo.key }}</h3>
                <p v-if="siteLayout.logo.description" class="text-xs text-gray-600 mt-1">
                  {{ siteLayout.logo.description }}
                </p>
              </div>
              <ImageUploader
                :modelValue="pageData.editValues[getConfigKey(siteLayout.logo)]"
                @uploaded="(url: string) => handleImageUploaded(siteLayout.logo, url)"
                label="Site Logo"
                :description="siteLayout.logo.description"
                :max-size-kb="2048"
                width="200px"
                height="80px"
                shape="square"
              />
            </div>

            <!-- Site Favicon -->
            <div v-if="siteLayout.favicon" class="p-4 rounded-lg theme-colors-background-secondary theme-colors-border-secondary hover:theme-colors-border-primary transition-colors">
              <div class="mb-3">
                <h3 class="font-semibold text-sm">{{ siteLayout.favicon.key }}</h3>
                <p v-if="siteLayout.favicon.description" class="text-xs text-gray-600 mt-1">
                  {{ siteLayout.favicon.description }}
                </p>
              </div>
              <ImageUploader
                :modelValue="pageData.editValues[getConfigKey(siteLayout.favicon)]"
                @uploaded="(url: string) => handleImageUploaded(siteLayout.favicon, url)"
                label="Site Favicon"
                :description="siteLayout.favicon.description"
                :max-size-kb="512"
                width="64px"
                height="64px"
                shape="square"
                :isFavicon="true"
              />
            </div>
          </div>

          <!-- Features configs (rest of General tab) -->
          <div class="mt-6">
            <h3 class="text-lg font-semibold mb-4">Features</h3>

            <!-- Boolean switches for features -->
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div
                v-for="config in booleanConfigs"
                :key="config.id"
                class="p-4 rounded-lg theme-colors-background-secondary theme-colors-border-secondary hover:theme-colors-border-primary transition-colors"
              >
                <div class="mb-3">
                  <h3 class="font-semibold text-sm">{{ config.key }}</h3>
                  <p v-if="config.description" class="text-xs text-gray-600 mt-1">
                    {{ config.description }}
                  </p>
                </div>
                <dxSwitch
                  :modelValue="pageData.editValues[getConfigKey(config)] === 'true' || pageData.editValues[getConfigKey(config)] === '1'"
                  @update:modelValue="pageData.editValues[getConfigKey(config)] = $event ? 'true' : 'false'"
                  :label="pageData.editValues[getConfigKey(config)] === 'true' ? 'Enabled' : 'Disabled'"
                />
                <div
                  v-if="pageData.editValues[getConfigKey(config)] !== config.value"
                  class="text-xs theme-colors-text-warning mt-2"
                >
                  ⚠️ Modified
                </div>
              </div>
            </div>

            <!-- Non-boolean configs for features (if any) -->
            <!-- Filter out site.* configs as they're shown in special layout above -->
            <div v-if="nonBooleanConfigs.filter(c => !c.key.startsWith('site.')).length > 0" class="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
              <div
                v-for="config in nonBooleanConfigs.filter(c => !c.key.startsWith('site.'))"
                :key="config.id"
                class="p-4 rounded-lg theme-colors-background-secondary theme-colors-border-secondary hover:theme-colors-border-primary transition-colors"
              >
                <div class="mb-3">
                  <h3 class="font-semibold text-sm">{{ config.key }}</h3>
                  <p v-if="config.description" class="text-xs text-gray-600 mt-1">
                    {{ config.description }}
                  </p>
                </div>
                <!-- Select (dropdown for predefined options) -->
                <dxSelect
                  v-if="hasSelectOptions(config.key)"
                  v-model="pageData.editValues[getConfigKey(config)]"
                  :options="getSelectOptions(config.key)"
                  size="sm"
                />
                <!-- Regular input -->
                <dxInput
                  v-else-if="config.dataType !== 'text'"
                  v-model="pageData.editValues[getConfigKey(config)]"
                  :type="config.dataType === 'number' ? 'number' : 'text'"
                  size="sm"
                />
                <!-- Text area -->
                <dxTextArea
                  v-else
                  v-model="pageData.editValues[getConfigKey(config)]"
                  :rows="3"
                  class="text-sm"
                />
                <div
                  v-if="pageData.editValues[getConfigKey(config)] !== config.value"
                  class="text-xs theme-colors-text-warning mt-2"
                >
                  ⚠️ Modified
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Standard two-column grid for other categories -->
        <div v-else class="space-y-6">
          <!-- Boolean switches row (if any) + Logging Preset -->
          <div v-if="booleanConfigs.length > 0 || loggingPresetConfig" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <!-- Logging Preset (1st block - leftmost) -->
            <div
              v-if="loggingPresetConfig && pageData.activeCategory === 'logging'"
              class="p-4 rounded-lg border-2 border-primary/30 bg-primary/5 hover:border-primary/50 transition-colors"
            >
              <div class="mb-3">
                <h3 class="font-semibold text-sm">
                  {{ loggingPresetConfig.key }}
                </h3>
                <p v-if="loggingPresetConfig.description" class="text-xs text-gray-600 mt-1">
                  {{ loggingPresetConfig.description }}
                </p>
              </div>
              <dxSelect
                v-model="pageData.editValues[getConfigKey(loggingPresetConfig)]"
                :options="getSelectOptions(loggingPresetConfig.key)"
                size="sm"
              />
              <div
                v-if="pageData.editValues[getConfigKey(loggingPresetConfig)] !== loggingPresetConfig.value"
                class="text-xs theme-colors-text-warning mt-2"
              >
                ⚠️ Modified
              </div>
            </div>

            <!-- Boolean switches -->
            <div
              v-for="config in booleanConfigs"
              :key="config.id"
              class="p-4 rounded-lg theme-colors-background-secondary theme-colors-border-secondary hover:theme-colors-border-primary transition-colors"
            >
              <div class="mb-3">
                <h3 class="font-semibold text-sm">{{ config.key }}</h3>
                <p v-if="config.description" class="text-xs text-gray-600 mt-1">
                  {{ config.description }}
                </p>
              </div>
              <dxSwitch
                :modelValue="pageData.editValues[getConfigKey(config)] === 'true' || pageData.editValues[getConfigKey(config)] === '1'"
                @update:modelValue="pageData.editValues[getConfigKey(config)] = $event ? 'true' : 'false'"
                :label="pageData.editValues[getConfigKey(config)] === 'true' ? 'Enabled' : 'Disabled'"
              />
              <div
                v-if="pageData.editValues[getConfigKey(config)] !== config.value"
                class="text-xs theme-colors-text-warning mt-2"
              >
                ⚠️ Modified
              </div>
            </div>
          </div>

          <!-- Non-boolean fields in two columns -->
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <!-- Left column -->
            <div class="space-y-6">
              <div
                v-for="config in configColumns.left"
                :key="config.id"
                class="p-4 rounded-lg theme-colors-background-secondary theme-colors-border-secondary hover:theme-colors-border-primary transition-colors"
            >
              <!-- Config header -->
              <div class="mb-3">
                <div class="flex items-start justify-between gap-2">
                  <h3 class="font-semibold text-sm">{{ config.key }}</h3>
                  <div class="flex gap-1 flex-shrink-0 items-center">
                    <dxBadge
                      :variant="getCategoryBadgeVariant(config.category)"
                      size="sm"
                    >
                      {{ config.category }}
                    </dxBadge>
                    <dxBadge
                      v-if="config.isEncrypted"
                      variant="warning"
                      size="sm"
                    >
                      🔒
                    </dxBadge>
                    <dxBadge
                      v-if="config.requiresRestart"
                      variant="error"
                      size="sm"
                    >
                      ⚠️
                    </dxBadge>
                    <!-- Test button for telegram fields -->
                    <dxButton
                      v-if="pageData.activeCategory === 'messaging' && isTelegramField(config.key)"
                      @click="testTelegram"
                      :disabled="pageData.telegramTesting"
                      :loading="pageData.telegramTesting"
                      variant="primary"
                      size="xs"
                      class="ml-2"
                    >
                      Test
                    </dxButton>
                  </div>
                </div>
                <p v-if="config.description" class="text-xs text-gray-600 mt-1">
                  {{ config.description }}
                </p>
              </div>

              <!-- Input field based on dataType -->
              <div>
                <!-- Image Upload -->
                <ImageUploader
                  v-if="IMAGE_UPLOAD_KEYS.includes(config.key)"
                  :modelValue="pageData.editValues[getConfigKey(config)]"
                  @uploaded="(url: string) => handleImageUploaded(config, url)"
                  :label="config.key === 'site.logo_url' ? 'Site Logo' : 'Site Favicon'"
                  :description="config.description"
                  :max-size-kb="config.key === 'site.favicon_url' ? 512 : 2048"
                  :width="config.key === 'site.favicon_url' ? '64px' : '200px'"
                  :height="config.key === 'site.favicon_url' ? '64px' : '80px'"
                  shape="square"
                  :isFavicon="config.key === 'site.favicon_url'"
                />

                <!-- Boolean -->
                <dxSwitch
                  v-else-if="config.dataType === 'boolean'"
                  :modelValue="pageData.editValues[getConfigKey(config)] === 'true' || pageData.editValues[getConfigKey(config)] === '1'"
                  @update:modelValue="pageData.editValues[getConfigKey(config)] = $event ? 'true' : 'false'"
                  :label="pageData.editValues[getConfigKey(config)] === 'true' ? 'Enabled' : 'Disabled'"
                />

                <!-- Select (dropdown for predefined options) -->
                <dxSelect
                  v-else-if="hasSelectOptions(config.key)"
                  v-model="pageData.editValues[getConfigKey(config)]"
                  :options="getSelectOptions(config.key)"
                  size="sm"
                />

                <!-- Text (multiline) -->
                <dxTextArea
                  v-else-if="config.dataType === 'json' || (config.value && config.value.length > 100)"
                  v-model="pageData.editValues[getConfigKey(config)]"
                  :rows="3"
                  class="font-mono text-xs"
                />

                <!-- Text (single line) -->
                <dxInput
                  v-else
                  v-model="pageData.editValues[getConfigKey(config)]"
                  :type="config.isEncrypted ? 'password' : 'text'"
                  size="sm"
                />
              </div>

              <!-- Modified indicator -->
              <div
                v-if="pageData.editValues[getConfigKey(config)] !== config.value"
                class="text-xs theme-colors-text-warning mt-2"
              >
                ⚠️ Modified
              </div>
            </div>
          </div>

          <!-- Right column -->
          <div class="space-y-6">
            <div
              v-for="config in configColumns.right"
              :key="config.id"
              class="p-4 rounded-lg theme-colors-background-secondary theme-colors-border-secondary hover:theme-colors-border-primary transition-colors"
            >
              <!-- Config header -->
              <div class="mb-3">
                <div class="flex items-start justify-between gap-2">
                  <h3 class="font-semibold text-sm">{{ config.key }}</h3>
                  <div class="flex gap-1 flex-shrink-0 items-center">
                    <dxBadge
                      :variant="getCategoryBadgeVariant(config.category)"
                      size="sm"
                    >
                      {{ config.category }}
                    </dxBadge>
                    <dxBadge
                      v-if="config.isEncrypted"
                      variant="warning"
                      size="sm"
                    >
                      🔒
                    </dxBadge>
                    <dxBadge
                      v-if="config.requiresRestart"
                      variant="error"
                      size="sm"
                    >
                      ⚠️
                    </dxBadge>
                    <!-- Test button for telegram fields -->
                    <dxButton
                      v-if="pageData.activeCategory === 'messaging' && isTelegramField(config.key)"
                      @click="testTelegram"
                      :disabled="pageData.telegramTesting"
                      :loading="pageData.telegramTesting"
                      variant="primary"
                      size="xs"
                      class="ml-2"
                    >
                      Test
                    </dxButton>
                  </div>
                </div>
                <p v-if="config.description" class="text-xs text-gray-600 mt-1">
                  {{ config.description }}
                </p>
              </div>

              <!-- Input field based on dataType -->
              <div>
                <!-- Image Upload -->
                <ImageUploader
                  v-if="IMAGE_UPLOAD_KEYS.includes(config.key)"
                  :modelValue="pageData.editValues[getConfigKey(config)]"
                  @uploaded="(url: string) => handleImageUploaded(config, url)"
                  :label="config.key === 'site.logo_url' ? 'Site Logo' : 'Site Favicon'"
                  :description="config.description"
                  :max-size-kb="config.key === 'site.favicon_url' ? 512 : 2048"
                  :width="config.key === 'site.favicon_url' ? '64px' : '200px'"
                  :height="config.key === 'site.favicon_url' ? '64px' : '80px'"
                  shape="square"
                  :isFavicon="config.key === 'site.favicon_url'"
                />

                <!-- Boolean -->
                <dxSwitch
                  v-else-if="config.dataType === 'boolean'"
                  :modelValue="pageData.editValues[getConfigKey(config)] === 'true' || pageData.editValues[getConfigKey(config)] === '1'"
                  @update:modelValue="pageData.editValues[getConfigKey(config)] = $event ? 'true' : 'false'"
                  :label="pageData.editValues[getConfigKey(config)] === 'true' ? 'Enabled' : 'Disabled'"
                />

                <!-- Select (dropdown for predefined options) -->
                <dxSelect
                  v-else-if="hasSelectOptions(config.key)"
                  v-model="pageData.editValues[getConfigKey(config)]"
                  :options="getSelectOptions(config.key)"
                  size="sm"
                />

                <!-- Text (multiline) -->
                <dxTextArea
                  v-else-if="config.dataType === 'json' || (config.value && config.value.length > 100)"
                  v-model="pageData.editValues[getConfigKey(config)]"
                  :rows="3"
                  class="font-mono text-xs"
                />

                <!-- Text (single line) -->
                <dxInput
                  v-else
                  v-model="pageData.editValues[getConfigKey(config)]"
                  :type="config.isEncrypted ? 'password' : 'text'"
                  size="sm"
                />
              </div>

              <!-- Modified indicator -->
              <div
                v-if="pageData.editValues[getConfigKey(config)] !== config.value"
                class="text-xs theme-colors-text-warning mt-2"
              >
                ⚠️ Modified
              </div>
            </div>
          </div>
          </div>
        </div>

        <!-- Empty state -->
        <div v-if="filteredConfigs.length === 0" class="text-center py-12">
          <p class="text-gray-600">
            No settings found in this category
          </p>
        </div>

        <!-- Summary footer -->
        <div v-if="hasChanges" class="mt-6 p-4 border-2 rounded-lg opacity-90">
          <p class="text-sm">
            <strong>Unsaved changes:</strong>
            {{ pageData.configs.filter((c: any) => pageData.editValues[getConfigKey(c)] !== c.value).length }} setting(s) modified.
            Click "Save All Changes" to apply.
          </p>
        </div>

        <!-- Debug Section (hidden) -->
        <div v-if="false" class="mt-8 p-4 theme-colors-background-tertiary theme-colors-border-secondary rounded-lg">
          <h3 class="font-semibold text-sm mb-3 text-gray-700">🐛 Debug Data</h3>
          <details class="cursor-pointer">
            <summary class="text-sm font-medium text-gray-600 hover:text-gray-800 select-none">
              Click to expand JSON ({{ pageData.configs.length }} configs loaded)
            </summary>
            <div class="mt-3 overflow-auto max-h-96">
              <pre class="text-xs font-mono bg-gray-900 theme-colors-text-success p-4 rounded border border-gray-700 whitespace-pre-wrap break-words">{{ JSON.stringify({
  activeCategory: pageData.activeCategory,
  loading: pageData.loading,
  saving: pageData.saving,
  totalConfigs: pageData.configs.length,
  categories: categories,
  hasChanges: hasChanges,
  configs: pageData.configs,
  editValues: pageData.editValues
}, null, 2) }}</pre>
            </div>
          </details>
        </div>
      </div>
    </dxFormWrapper>
  
</template>

<style scoped>
/* Compact input styling */
:deep(.dx-input-sm) {
  padding: 0.375rem 0.5rem;
  font-size: 0.875rem;
}

/* Category tabs scrollbar */
.overflow-x-auto::-webkit-scrollbar {
  height: 4px;
}

.overflow-x-auto::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 2px;
}

.overflow-x-auto::-webkit-scrollbar-thumb {
  background: #888;
  border-radius: 2px;
}

.overflow-x-auto::-webkit-scrollbar-thumb:hover {
  background: #555;
}
</style>

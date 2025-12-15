<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import dxInput from '@/components/ui/dxInput.vue'
import dxSwitch from '@/components/ui/dxSwitch.vue'

interface Props {
  host: string
  port: string
  username: string
  password: string
  secure: string
}

interface Emits {
  (e: 'update:host', value: string): void
  (e: 'update:port', value: string): void
  (e: 'update:username', value: string): void
  (e: 'update:password', value: string): void
  (e: 'update:secure', value: string): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// SMTP presets for popular providers
const presets = {
  custom: {
    name: 'Custom SMTP Server',
    host: '',
    port: '587',
    secure: false
  }
  // Disabled presets
  // gmail: {
  //   name: 'Gmail',
  //   host: 'smtp.gmail.com',
  //   port: '587',
  //   secure: false,
  //   help: 'Use App Password from Google Account settings'
  // },
  // outlook: {
  //   name: 'Outlook / Office 365',
  //   host: 'smtp-mail.outlook.com',
  //   port: '587',
  //   secure: false
  // },
  // mailgun: {
  //   name: 'Mailgun SMTP',
  //   host: 'smtp.mailgun.org',
  //   port: '587',
  //   secure: false,
  //   help: 'Find credentials in Mailgun dashboard'
  // },
  // ses: {
  //   name: 'AWS SES',
  //   host: 'email-smtp.us-east-1.amazonaws.com',
  //   port: '587',
  //   secure: false,
  //   help: 'Replace region in hostname with your AWS region'
  // },
  // sendgrid: {
  //   name: 'SendGrid SMTP',
  //   host: 'smtp.sendgrid.net',
  //   port: '587',
  //   secure: false,
  //   help: 'Use "apikey" as username and your API key as password'
  // }
}

const selectedPreset = ref<keyof typeof presets>('custom')

// Apply preset when selected
const applyPreset = (presetKey: keyof typeof presets) => {
  selectedPreset.value = presetKey
  const preset = presets[presetKey]

  if (presetKey !== 'custom') {
    emit('update:host', preset.host)
    emit('update:port', preset.port)
    emit('update:secure', preset.secure ? 'true' : 'false')
  }
}

// Computed values for v-model
const localHost = computed({
  get: () => props.host,
  set: (value: string) => emit('update:host', value)
})

const localPort = computed({
  get: () => props.port,
  set: (value: string) => emit('update:port', value)
})

const localUsername = computed({
  get: () => props.username,
  set: (value: string) => emit('update:username', value)
})

const localPassword = computed({
  get: () => props.password,
  set: (value: string) => emit('update:password', value)
})

const localSecure = computed({
  get: () => props.secure === 'true',
  set: (value: boolean) => emit('update:secure', value ? 'true' : 'false')
})

// Watch for manual changes to detect custom configuration
watch([() => props.host, () => props.port], () => {
  const matchedPreset = Object.entries(presets).find(([key, preset]) => {
    return preset.host === props.host && preset.port === props.port && key !== 'custom'
  })

  if (matchedPreset) {
    selectedPreset.value = matchedPreset[0] as keyof typeof presets
  } else if (props.host && props.port) {
    selectedPreset.value = 'custom'
  }
})
</script>

<template>
  <div class="space-y-4">
    <!-- Preset Selector -->
    <div>
      <label class="block text-sm font-medium mb-2">
        SMTP Provider Preset
      </label>
      <div class="grid grid-cols-2 gap-2">
        <button
          v-for="(preset, key) in presets"
          :key="key"
          @click="applyPreset(key as keyof typeof presets)"
          :class="[
            'px-3 py-2 text-xs font-medium rounded-lg border-2 transition-all text-left',
            selectedPreset === key
              ? 'border-current opacity-100'
              : 'border-current opacity-40 hover:opacity-60'
          ]"
        >
          {{ preset.name }}
        </button>
      </div>
      <p v-if="presets[selectedPreset].help" class="mt-2 text-xs opacity-75 italic">
        {{ presets[selectedPreset].help }}
      </p>
    </div>

    <!-- SMTP Host -->
    <div>
      <label class="block text-sm font-medium mb-1">
        SMTP Host
      </label>
      <dxInput
        v-model="localHost"
        placeholder="smtp.example.com"
        size="sm"
      />
    </div>

    <!-- SMTP Port & Secure -->
    <div class="grid grid-cols-2 gap-4">
      <div>
        <label class="block text-sm font-medium mb-1">
          Port
        </label>
        <dxInput
          v-model="localPort"
          placeholder="587"
          size="sm"
        />
        <p class="mt-1 text-xs opacity-60">
          Common: 25, 465 (SSL), 587 (TLS)
        </p>
      </div>

      <div>
        <label class="block text-sm font-medium mb-1">
          Use SSL/TLS
        </label>
        <dxSwitch
          v-model="localSecure"
          :label="localSecure ? 'Yes (SSL)' : 'No (STARTTLS)'"
        />
        <p class="mt-1 text-xs opacity-60">
          Port 465: SSL, Port 587: STARTTLS
        </p>
      </div>
    </div>

    <!-- SMTP Username -->
    <div>
      <label class="block text-sm font-medium mb-1">
        SMTP Username
      </label>
      <dxInput
        v-model="localUsername"
        placeholder="your-username@example.com"
        size="sm"
      />
    </div>

    <!-- SMTP Password -->
    <div>
      <label class="block text-sm font-medium mb-1">
        SMTP Password
      </label>
      <dxInput
        v-model="localPassword"
        type="password"
        placeholder="••••••••"
        size="sm"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import dxSelect from '@/components/ui/dxSelect/dxSelect.vue'

interface Props {
  modelValue: string // 'smtp' | 'sendgrid-api' | 'mailgun-api'
}

interface Emits {
  (e: 'update:modelValue', value: string): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const providerDescriptions = {
  'smtp': 'Universal SMTP - works with Gmail, Outlook, Mailgun, AWS SES, and any custom SMTP server',
  'sendgrid-api': 'Fast API-based email delivery via SendGrid',
  'mailgun-api': 'Fast API-based email delivery via Mailgun'
}

const options = [
  {
    value: 'smtp',
    label: 'SMTP Server'
  },
  {
    value: 'sendgrid-api',
    label: 'SendGrid API'
  },
  {
    value: 'mailgun-api',
    label: 'Mailgun API'
  }
]

const selectedProvider = computed({
  get: () => props.modelValue || 'smtp',
  set: (value: string | number | (string | number)[] | null) => {
    if (typeof value === 'string') {
      emit('update:modelValue', value)
    }
  }
})

const selectedDescription = computed(() =>
  providerDescriptions[selectedProvider.value as keyof typeof providerDescriptions]
)
</script>

<template>
  <div>
    <dxSelect
      v-model="selectedProvider"
      :options="options"
      placeholder="Select email provider"
      size="sm"
      :noGutters="true"
    />

    <p v-if="selectedDescription" class="text-xs mt-2 opacity-75">
      {{ selectedDescription }}
    </p>
  </div>
</template>

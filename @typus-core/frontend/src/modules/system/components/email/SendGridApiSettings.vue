<script setup lang="ts">
import { computed } from 'vue'
import dxInput from '@/components/ui/dxInput.vue'

interface Props {
  apiKey: string
}

interface Emits {
  (e: 'update:apiKey', value: string): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const localApiKey = computed({
  get: () => props.apiKey,
  set: (value: string) => emit('update:apiKey', value)
})
</script>

<template>
  <div class="space-y-4">
    <!-- Info Card -->
    <div class="p-4 border rounded-lg opacity-90">
      <h4 class="font-semibold text-sm">SendGrid API</h4>
      <p class="text-xs opacity-75 mt-1">
        Fast, reliable email delivery using SendGrid's REST API.
        Get your API key from the SendGrid dashboard.
      </p>
    </div>

    <!-- API Key Input -->
    <div>
      <label class="block text-sm font-medium mb-1">
        SendGrid API Key
      </label>
      <dxInput
        v-model="localApiKey"
        type="password"
        placeholder="SG.xxxxxxxxxxxxxxxxxxxx"
        size="sm"
      />
      <p class="mt-1 text-xs opacity-60">
        Starts with "SG." - keep it secret and secure
      </p>
    </div>

    <!-- Help Section -->
    <div class="p-3 border rounded-lg opacity-75">
      <h5 class="text-xs font-semibold mb-2">How to get your API Key:</h5>
      <ol class="text-xs opacity-75 space-y-1 list-decimal list-inside">
        <li>Go to <a href="https://app.sendgrid.com/settings/api_keys" target="_blank" class="underline">SendGrid Dashboard → API Keys</a></li>
        <li>Click "Create API Key"</li>
        <li>Choose "Full Access" or "Restricted Access" with Mail Send permissions</li>
        <li>Copy the API key and paste it above</li>
      </ol>
    </div>

    <!-- Sender Verification Warning -->
    <div class="p-3 border rounded-lg opacity-75">
      <h5 class="text-xs font-semibold mb-1">Sender Verification Required</h5>
      <p class="text-xs opacity-75">
        SendGrid requires you to verify your sender email address or domain before sending emails.
        Configure this in your SendGrid dashboard under "Sender Authentication".
      </p>
    </div>
  </div>
</template>

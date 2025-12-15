<script setup lang="ts">
import { computed } from 'vue'
import dxInput from '@/components/ui/dxInput.vue'

interface Props {
  apiKey: string
  apiEndpoint: string
}

interface Emits {
  (e: 'update:apiKey', value: string): void
  (e: 'update:apiEndpoint', value: string): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const localApiKey = computed({
  get: () => props.apiKey,
  set: (value: string) => emit('update:apiKey', value)
})

const localApiEndpoint = computed({
  get: () => props.apiEndpoint,
  set: (value: string) => emit('update:apiEndpoint', value)
})
</script>

<template>
  <div class="space-y-4">
    <!-- Info Card -->
    <div class="p-4 border rounded-lg opacity-90">
      <h4 class="font-semibold text-sm">Mailgun API</h4>
      <p class="text-xs opacity-75 mt-1">
        Fast, reliable email delivery using Mailgun's REST API.
        Get your API key from the Mailgun dashboard.
      </p>
    </div>

    <!-- API Key Input -->
    <div>
      <label class="block text-sm font-medium mb-1">
        Mailgun API Key
      </label>
      <dxInput
        v-model="localApiKey"
        type="password"
        placeholder="key-xxxxxxxxxxxxxxxxxxxxxxxx"
        size="sm"
      />
      <p class="mt-1 text-xs opacity-60">
        Starts with "key-" - keep it secret and secure
      </p>
    </div>

    <!-- API Endpoint Input -->
    <div>
      <label class="block text-sm font-medium mb-1">
        API Endpoint (optional)
      </label>
      <dxInput
        v-model="localApiEndpoint"
        placeholder="https://api.mailgun.net"
        size="sm"
      />
      <p class="mt-1 text-xs opacity-60">
        Use https://api.eu.mailgun.net for EU region
      </p>
    </div>

    <!-- Help Section -->
    <div class="p-3 border rounded-lg opacity-75">
      <h5 class="text-xs font-semibold mb-2">How to get your API Key:</h5>
      <ol class="text-xs opacity-75 space-y-1 list-decimal list-inside">
        <li>Go to <a href="https://app.mailgun.com/app/account/security/api_keys" target="_blank" class="underline">Mailgun Dashboard → API Keys</a></li>
        <li>Copy your Private API key</li>
        <li>Paste it above</li>
        <li>Choose the correct API endpoint for your region</li>
      </ol>
    </div>

    <!-- Domain Verification Warning -->
    <div class="p-3 border rounded-lg opacity-75">
      <h5 class="text-xs font-semibold mb-1">Domain Verification Required</h5>
      <p class="text-xs opacity-75">
        Mailgun requires you to verify your domain before sending emails.
        Configure this in your Mailgun dashboard under "Sending → Domains".
      </p>
    </div>
  </div>
</template>

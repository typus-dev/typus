<script setup lang="ts">
import { computed } from 'vue'
import QRCode from 'qrcode.vue'

type Level = 'L' | 'M' | 'Q' | 'H'

const props = defineProps({
  /**
   * The data to encode in the QR code
   */
  data: {
    type: String,
    required: true
  },
  /**
   * The size of the QR code in pixels
   */
  size: {
    type: Number,
    default: 200
  },
  /**
   * The color of the QR code modules (dark squares)
   */
  darkColor: {
    type: String,
    default: '#000000'
  },
  /**
   * The color of the QR code background (light squares)
   */
  lightColor: {
    type: String,
    default: '#FFFFFF'
  },
  /**
   * The margin around the QR code in modules
   */
  margin: {
    type: Number,
    default: 4
  },
  /**
   * The error correction level (L: 7%, M: 15%, Q: 25%, H: 30%)
   */
  errorCorrectionLevel: {
    type: String as () => Level,
    default: 'M',
    validator: (value: string) => ['L', 'M', 'Q', 'H'].includes(value)
  }
})

// Computed props to pass to qrcode.vue
const qrProps = computed(() => ({
  value: props.data,
  size: props.size,
  level: props.errorCorrectionLevel as Level,
  background: props.lightColor,
  foreground: props.darkColor,
  margin: props.margin
}))
</script>

<template>
  <div class="qr-code-container">
    <QRCode v-bind="qrProps" class="qr-code-image" />
  </div>
</template>

<style scoped>
.qr-code-container {
  display: inline-block;
}

.qr-code-image {
  display: block;
}
</style>

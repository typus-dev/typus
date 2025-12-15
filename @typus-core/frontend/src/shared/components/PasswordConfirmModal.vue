<template>
  <div class="p-4">
    <p class="mb-4 text-gray-600">{{ message }}</p>
    <dxInput
      :modelValue="modelValue.password"
      @update:modelValue="updatePassword"
      label="Password"
      labelPosition="top"
      type="password"
      placeholder="Enter your password"
      required
      autofocus
    />
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  message: string
  modelValue: { password: string }
}>()

const emit = defineEmits(['update:modelValue'])

const updatePassword = (value: string | number | undefined) => {
  const stringValue = typeof value === 'number' ? String(value) : (value ?? '')
  emit('update:modelValue', { ...props.modelValue, password: stringValue })
}
</script>

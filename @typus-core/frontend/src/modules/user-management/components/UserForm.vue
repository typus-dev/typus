<script setup lang="ts">
import { computed } from 'vue'
import dxFormJSON from '@/components/ui/dxFormJSON.vue'
import type { UserFormData } from '../types'

const props = defineProps<{
  modelValue: UserFormData
  isCreateMode?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: UserFormData]
}>()

const formData = computed({
  get: () => props.modelValue,
  set: (value: UserFormData) => {
    if (JSON.stringify(value) !== JSON.stringify(props.modelValue)) {
      emit('update:modelValue', value)
    }
  }
})

const formFields = computed(() => [
  { name: 'firstName', label: 'First Name', type: 'text', required: true },
  { name: 'lastName', label: 'Last Name', type: 'text', required: true },
  { name: 'email', label: 'Email', type: 'email', required: true },
  { name: 'password', label: 'Password', type: 'password', required: props.isCreateMode },
  { name: 'phoneNumber', label: 'Phone Number', type: 'tel' },
  { name: 'role', label: 'Role', type: 'select', options: ['user', 'manager', 'admin'] },
  { name: 'isTwoFactorEnabled', label: '2FA Enabled', type: 'switch' },
  {
    name: 'twoFactorMethod',
    label: '2FA Method',
    type: 'select',
    options: ['email', 'sms', 'totp']
  },
  { name: 'isApproved', label: 'Approved', type: 'switch' },
  { name: 'isEmailVerified', label: 'Email Verified', type: 'switch' },
  { name: 'emailNotifications', label: 'Email Notifications', type: 'switch' },
  { name: 'pushNotifications', label: 'Push Notifications', type: 'switch' },
  { name: 'notes', label: 'Notes', type: 'textarea' }
])
</script>

<template>
  <dxFormJSON
    v-model="formData"
    :columns="4"
    :form-title="''"
    :hideActions="true"
    :fields="formFields"
  />
</template>
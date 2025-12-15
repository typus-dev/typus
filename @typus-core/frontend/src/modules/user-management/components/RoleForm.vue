<script setup lang="ts">
import { computed } from 'vue'
import dxFormJSON from '@/components/ui/dxFormJSON.vue'

const props = defineProps<{
  modelValue: any
  isCreateMode?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: any]
}>()

const formData = computed({
  get: () => props.modelValue,
  set: (value: any) => {
    if (JSON.stringify(value) !== JSON.stringify(props.modelValue)) {
      emit('update:modelValue', value)
    }
  }
})

const formFields = [
  { name: 'name', label: 'Role Name', type: 'text', required: true },
  { name: 'description', label: 'Description', type: 'textarea', required: true },
  {
    name: 'abilityRules',
    label: 'Ability Rules (JSON)',
    type: 'textarea',
    rows: 5,
    placeholder: 'Enter JSON rules, e.g., {"action": "manage", "subject": "all"}'
  }
]
</script>

<template>
  <dxFormJSON
    v-model="formData"
    :columns="2"
    :form-title="''"
    :hideActions="true"
    :fields="formFields"
  />
</template>

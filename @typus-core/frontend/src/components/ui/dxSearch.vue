<script setup lang="ts">
import dxInput from '@/components/ui/dxInput.vue'
import dxButton from '@/components/ui/dxButton.vue'
import dxIcon from '@/components/ui/dxIcon.vue'

const model = defineModel<string>({ default: '' })
const emit = defineEmits(['clear'])

const clear = () => {
  model.value = ''
  emit('clear')
}
</script>

<template>
  <div class="flex gap-2 items-center">
    <dxInput
      v-model="model"
      type="search"
      placeholder="Search..."
      clearable
      class="flex-1"
    >
      <template #prefix>
        <dxIcon name="ri:search-2-line" size="sm" />
      </template>
    </dxInput>
    <dxButton
      iconOnly
      variant="ghost"
      size="sm"
      @click="clear"
      v-if="model"
    >
      <template #default>
        <dxIcon name="ri:close-line" size="sm" />
      </template>
    </dxButton>
  </div>
</template>

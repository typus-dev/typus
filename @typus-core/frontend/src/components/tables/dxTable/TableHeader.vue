<script setup lang="ts">
const props = defineProps<{
  noHeader: boolean
  showCreateButton: boolean
  createButtonLabel: string
  createButtonIcon: string
  loading: boolean
}>()

const emit = defineEmits<{
  (e: 'create'): void
}>()
</script>

<template>
  <dxFlex v-if="!noHeader && showCreateButton" justify="start" align="center" noGutters class="mb-4">
    <dxFlexCol cols="auto">
      <dxButton variant="outline" size="sm" @click="emit('create')" :disabled="loading">
        <dxIcon :name="createButtonIcon" size="sm" />
        <span>{{ createButtonLabel }}</span>
      </dxButton>
    </dxFlexCol>
  </dxFlex>
</template>

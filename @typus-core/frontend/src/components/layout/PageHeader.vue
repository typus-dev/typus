<script setup lang="ts">
/**
 * PageHeader - Lightweight component for page header.
 *
 * Responsibility:
 * - Title + Subtitle
 * - Action buttons (slot)
 *
 * NOT responsible for:
 * - Max-width (handled by layout)
 * - Padding (handled by layout)
 * - Breadcrumbs (will be in layout above router-view)
 *
 * Usage:
 * <PageHeader title="Users List" subtitle="Manage users">
 *   <template #actions>
 *     <dxButton>Add User</dxButton>
 *   </template>
 * </PageHeader>
 */

interface Props {
  /**
   * Page title
   */
  title?: string

  /**
   * Page subtitle
   */
  subtitle?: string
}

const props = withDefaults(defineProps<Props>(), {
  title: '',
  subtitle: ''
})
</script>

<template>
  <header v-if="title || subtitle || $slots.actions" class="theme-page-header mb-8">
    <div class="flex justify-between items-start gap-4">
      <div class="flex-1">
        <h1 v-if="title" class="text-3xl font-bold mb-1 theme-colors-text-primary">{{ title }}</h1>
        <p v-if="subtitle" class="theme-colors-text-secondary text-sm">{{ subtitle }}</p>
      </div>
      <div v-if="$slots.actions" class="flex gap-3 items-center">
        <!-- @slot Actions slot for header buttons (Add, Refresh, etc.) -->
        <slot name="actions" />
      </div>
    </div>
  </header>
</template>

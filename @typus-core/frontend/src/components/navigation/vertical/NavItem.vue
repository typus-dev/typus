/* @Tags: routing, navigation */
<script setup lang="ts">
const props = defineProps({
  item: {
    type: Object,
    required: true,
    validator: (value: any) => {
      return value.title && (value.path || Array.isArray(value.children))
    }
  }
})

const toggleSubSection = () => {
  if (props.item.children) {
    props.item.isOpen = !props.item.isOpen
  }
}
</script>
<template>
  <!-- Nav item -->
  <div>
    <RouterLink
      v-if="!item.children"
      :to="item.path"
      :class="[
        'theme-layout-flex-between',
        'theme-typography-size-sm',
        'theme-colors-text-primary',
        'p-2',
        'rounded-md',
        'hover:bg-slate-100 active:bg-slate-200',
        'router-link-active:bg-slate-200'
      ]"
    >
      <div :class="['theme-layout-flex-center', 'gap-1']">
        <dxIcon v-if="item.icon" :name="item.icon" size="sm" />
        <span>{{ item.title }}</span>
      </div>
    </RouterLink>

    <div
      v-else
      :class="[
        'theme-layout-flex-between',
        'theme-typography-size-sm',
        'theme-colors-text-primary',
        'p-2',
        'rounded-md',
        'cursor-pointer',
        'hover:bg-slate-100 active:bg-slate-200' 
      ]"
      @click="toggleSubSection"
    >
      <!-- Subsection content -->
    </div>

    <div
      v-if="item.children && item.isOpen"
      :class="['theme-layout-stack-vertical', 'ml-1']"
    >
      <RouterLink
        v-for="child in item.children"
        :key="child.title"
        :to="child.path"
        :class="[
          'theme-layout-flex-center',
          'theme-typography-size-sm',
          'theme-colors-text-primary',
          'p-2',
          'rounded-md',
          'gap-1',
          'hover:bg-slate-100 active:bg-slate-200',
          'router-link-active:bg-slate-200' 
        ]"
      >
        <dxIcon v-if="child.icon" :name="child.icon" size="sm" />
        <span>{{ child.title }}</span>
      </RouterLink>
    </div>
  </div>
</template>

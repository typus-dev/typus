<script setup lang="ts">
import { computed, ref, onMounted, onBeforeUnmount } from 'vue'
import dxIcon from '@/components/ui/dxIcon.vue'

export type ToolbarActionAppearance = 'chip' | 'icon' | 'ghost'

export interface ToolbarAction {
  id: string
  label?: string
  icon?: string
  tooltip?: string
  appearance?: ToolbarActionAppearance
  selected?: boolean
  disabled?: boolean
  kind?: string
  value?: unknown
}

export interface ToolbarSection {
  id: string
  label?: string
  actions: ToolbarAction[]
}

export interface ToolbarMenuGroup {
  id: string
  label?: string
  actions: ToolbarAction[]
}

const props = defineProps<{
  sections: ToolbarSection[]
  menuGroups?: ToolbarMenuGroup[]
}>()

const emit = defineEmits<{
  trigger: [action: ToolbarAction]
}>()

const menuOpen = ref(false)
const rootEl = ref<HTMLElement | null>(null)
const visibleSections = computed(() => props.sections || [])

const menuGroups = computed(() => props.menuGroups ?? [])

const normalizedMenuGroups = computed(() =>
  menuGroups.value.filter((group): group is ToolbarMenuGroup =>
    !!group && Array.isArray(group.actions) && group.actions.length > 0,
  ),
)

const hasMenu = computed(() => normalizedMenuGroups.value.length > 0)

const closeMenu = () => { menuOpen.value = false }

const handleOutside = (event: PointerEvent) => {
  if (!menuOpen.value) return
  const root = rootEl.value
  if (!root) return
  if (!root.contains(event.target as Node)) {
    closeMenu()
  }
}

onMounted(() => {
  document.addEventListener('pointerdown', handleOutside)
})

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', handleOutside)
})

const appearanceClass = (appearance: ToolbarActionAppearance | undefined, selected: boolean | undefined) => {
  const base = appearance ?? 'chip'
  return [
    'tb-action',
    `tb-action--${base}`,
    { 'is-selected': !!selected }
  ]
}

const onAction = (action: ToolbarAction) => {
  if (action.disabled) return
  emit('trigger', action)
  closeMenu()
}
</script>

<template>
  <div
    ref="rootEl"
    :class="[
      'unified-toolbar border',
      'theme-colors-background-secondary',
      'theme-colors-text-primary',
      'theme-border'.primary
    ]"
  >
    <div v-if="visibleSections.length" class="sections">
      <button
        v-for="action in visibleSections.flatMap(section => section.actions)"
        :key="action.id"
        :class="appearanceClass(action.appearance, action.selected)"
        type="button"
        :title="action.tooltip || action.label"
        :disabled="action.disabled"
        @click="onAction(action)"
      >
        <span v-if="action.icon" class="action-icon">
          <dxIcon :name="action.icon" size="sm" />
        </span>
        <span v-if="action.label" class="action-label">{{ action.label }}</span>
      </button>
    </div>

    <div v-if="hasMenu" class="menu">
      <button
        type="button"
        class="menu-trigger"
        title="More actions"
        @click.stop="menuOpen = !menuOpen"
      >
        ⋮
      </button>
      <div
        v-if="menuOpen"
        :class="[
          'menu-pop border',
          'theme-colors-background-secondary',
          'theme-border'.primary
        ]"
        @click.stop
      >
        <div
          v-for="group in normalizedMenuGroups"
          :key="group.id"
          class="menu-group"
        >
          <div v-if="group.label" class="group-label">{{ group.label }}</div>
          <button
            v-for="action in group.actions"
            :key="action.id"
            class="menu-item"
            type="button"
            :title="action.tooltip || action.label"
            :disabled="action.disabled"
            @click="onAction(action)"
          >
            <span v-if="action.icon" class="menu-icon">
              <dxIcon :name="action.icon" size="sm" />
            </span>
            <span class="menu-label">{{ action.label }}</span>
            <span v-if="action.selected" class="menu-selected">•</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.unified-toolbar {
  position: relative;
  display: inline-flex;
  align-items: center;
  flex-wrap: nowrap;
  gap: 10px;
  padding: 6px 8px;
  border-radius: 6px;
  box-shadow: 0 6px 14px rgba(0, 0, 0, 0.35);
}
.sections {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex-wrap: nowrap;
  overflow: hidden;
}
.tb-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  border: 1px solid var(--border);
  background: transparent;
  color: inherit;
  cursor: pointer;
  min-height: 26px;
  padding: 0 8px;
  border-radius: 6px;
  transition: background-color 120ms ease, color 120ms ease;
}
.tb-action:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.tb-action--icon {
  min-width: 28px;
  padding: 0 6px;
}
.tb-action--ghost {
  background: rgba(255, 255, 255, 0.05);
}
.tb-action.is-selected {
  background: #1f2937;
  color: #e5e7eb;
}
.action-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.menu {
  position: relative;
}
.menu-trigger {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  border: 1px solid var(--border);
  background: transparent;
  color: inherit;
  cursor: pointer;
  font-size: 18px;
  line-height: 1;
}
.menu-pop {
  position: absolute;
  top: 120%;
  right: 0;
  min-width: 220px;
  padding: 8px;
  border-radius: 6px;
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.4);
  display: grid;
  gap: 10px;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  align-items: start;
  z-index: 40;
}
.menu-group {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}
.group-label {
  flex: 0 0 100%;
  font-size: 11px;
  opacity: 0.7;
}
.menu-item {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 4px 8px;
  min-width: 44px;
  border: 1px solid var(--border);
  border-radius: 5px;
  background: transparent;
  color: inherit;
  cursor: pointer;
  transition: background-color 120ms ease, color 120ms ease;
}
.menu-item:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.menu-item:not(:disabled):hover {
  background: rgba(31, 41, 55, 0.55);
}
.menu-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.menu-label {
  flex: 0 0 auto;
  text-align: center;
  font-size: 0.85rem;
}
.menu-selected {
  font-size: 14px;
  opacity: 0.7;
}
</style>

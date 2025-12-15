<!-- file: core/components/VerticalNav.vue -->
<template>
  <nav
    :class="[
      'theme-colors-background-primary',
      'theme-colors-border-primary',
      'w-56 h-full relative overflow-hidden'
    ]"
  >
    <div
      class="space-y-1 p-3 overflow-y-scroll h-full custom-scrollbar"
      ref="scrollContainer"
    >
      <div
        v-for="(section, index) in navigationItems"
        :key="index"
        class="space-y-0.5"
      >
        <template v-if="section.type === 'line'">
          <div :class="['theme-border', 'h-px my-2']"></div>
        </template>
        <template v-else>
          <div
            :class="[
              'theme-colors-text-primary',
              'theme-interactions-hover',
              'flex items-center justify-between py-1.5 px-2 rounded-md cursor-pointer transition-colors duration-150'
            ]"
            @click="toggleSection(section)"
          >
            <div class="flex items-center gap-2 select-none">
              <dxIcon :name="section.icon" size="sm" />
              <span class="font-medium text-sm">{{ section.title }}</span>
            </div>
            <dxIcon
              :name="
                section.isOpen
                  ? 'ri:arrow-down-s-line'
                  : 'ri:arrow-right-s-line'
              "
              size="md"
              class="transform transition-transform duration-200"
            />
          </div>

          <TransitionGroup
            enter-active-class="transition-all duration-100 ease-in-out"
            enter-from-class="opacity-0 scale-95"
            enter-to-class="opacity-100 scale-100"
            leave-active-class="transition-all duration-75 ease-in-out"
            leave-from-class="opacity-100 scale-100"
            leave-to-class="opacity-0 scale-95"
            @after-enter="updateScroll"
          >
            <div v-if="section.isOpen" class="ml-4 space-y-0.5 select-none">
              <router-link
                v-for="item in section.items"
                :key="item.title"
                v-slot="{ navigate }"
                :to="item.path"
                custom
              >
                <div
                  :class="[
                    'theme-colors-text-primary',
                    'theme-interactions-hover',
                    'flex items-center gap-2 py-1.5 px-2 rounded-md cursor-pointer text-sm transition-colors duration-150'
                  ]"
                  @click="handleClick(item, navigate)"
                >
                  <dxIcon v-if="item.icon" :name="item.icon" size="sm" />
                  <span>{{ item.title }}</span>
                </div>
              </router-link>
            </div>
          </TransitionGroup>
        </template>
      </div>
    </div>
  </nav>
</template>

<script setup>
import { ref } from 'vue'
const scrollContainer = ref(null)

const props = defineProps({
  items: {
    type: Array,
    required: true,
    default: () => []
  }
})

const navigationItems = ref(
  props.items.map(item =>
    item.type !== 'line' ? { ...item, isOpen: true } : item
  )
)

const toggleSection = section => {
  section.isOpen = !section.isOpen
}

const updateScroll = () => {
  if (scrollContainer.value) {
    // Force recalculation of scrollbar visibility
    scrollContainer.value.style.overflow = 'hidden'
    scrollContainer.value.offsetHeight // Force reflow
    scrollContainer.value.style.overflow = 'scroll'
  }
}

const handleClick = (item, navigate) => {
  logger.debug('Navigating to:', item.path)
  navigate()
}
</script>

<style>
.custom-scrollbar {
  scrollbar-width: thin; /* Firefox */
  scrollbar-color: rgba(156, 163, 175, 0.3) transparent; /* Firefox */
  overflow-y: scroll !important; /* Force scrollbar to always be present */
}

/* Chrome, Edge, and Safari */
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}

.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: rgba(156, 163, 175, 0.3);
  border-radius: 20px;
  transition: background-color 0.2s;
}

.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background-color: rgba(156, 163, 175, 0.5);
}
</style>

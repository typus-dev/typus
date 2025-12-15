<script setup>
import { ref, onMounted, onBeforeUnmount, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useAppConfig } from '@/shared/composables/useAppConfig'
import { useDynamicConfig } from '@/shared/composables/useDynamicConfig'
import { useAuthStore } from '@/core/store/authStore'
import ProfileDropdown from '@/layouts/private/ProfileDropdown.vue'
import NotificationsDropdown from '@/components/base/NotificationsDropdown.vue'
import ThemeSwitcherDropdown from '@/components/base/ThemeSwitcherDropdown.vue'
import ProfileDropdownMini from '@/layouts/private/ProfileDropdownMini.vue'
import VerticalNav from '@/components/navigation/vertical/VerticalNav.vue'
import RecentPages from '@/components/navigation/RecentPages.vue'
import { autoNavigationItems } from '@/auto-menu.private.ts'

const route = useRoute()
const appConfig = useAppConfig()
const authStore = useAuthStore()
const { siteName, siteLogoUrl, fetchConfig } = useDynamicConfig()

const isSidebarOpen = ref(true)
const searchQuery = ref('')

// Toggle profile section visibility
const showProfileSection = ref(true)

// Profile menu toggle
const showProfileMenu = ref(false)

// Close profile menu on outside click
function handleClickOutsideProfileMenu(event) {
  const menu = document.querySelector('.profile-dropdown-menu')
  const trigger = document.querySelector('.profile-dropdown-trigger')
  if (!menu || !trigger) return
  if (!menu.contains(event.target) && !trigger.contains(event.target)) {
    showProfileMenu.value = false
    window.removeEventListener('click', handleClickOutsideProfileMenu)
  }
}

function toggleProfileMenu() {
  showProfileMenu.value = !showProfileMenu.value
  if (showProfileMenu.value) {
    window.addEventListener('click', handleClickOutsideProfileMenu)
  } else {
    window.removeEventListener('click', handleClickOutsideProfileMenu)
  }
}

const toggleSidebar = () => {
  isSidebarOpen.value = !isSidebarOpen.value
}

const closeSidebar = () => {
  if (window.innerWidth < 1024) {
    isSidebarOpen.value = false
  }
}

const handleEscapeKey = e => {
  if (e.key === 'Escape') {
    closeSidebar()
  }
}


const isCached = computed(() => {
  return window.__IS_CACHED_PAGE__ && route.path === window.__CACHED_ROUTE__?.path
})

const cachedContent = ref('')

onMounted(async () => {
  window.addEventListener('keydown', handleEscapeKey)
  isSidebarOpen.value = window.innerWidth >= 1024

  // Fetch dynamic configuration
  await fetchConfig()

  console.log('[PrivateLayout] Mounted:', {
    isCached: isCached.value,
    routePath: route.path,
    cachedRoutePath: window.__CACHED_ROUTE__?.path,
    isCachedPage: window.__IS_CACHED_PAGE__
  })

  if (isCached.value && window.__ORIGINAL_MAIN_CONTENT__) {
    cachedContent.value = window.__ORIGINAL_MAIN_CONTENT__
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleEscapeKey)
})

const gradientBgClass = 'bg-gradient-to-r from-gray-600 via-gray-500 to-gray-600';

const logoInitials = computed(() => {
  return appConfig.name.substring(0, 2).toUpperCase();
})
</script>

<template>
  <!-- file: layouts\private.vue  -->
  <div :class="[
    'private-shell',
    'theme-typography-fontFamily-base',
    'theme-colors-background-secondary',
    'theme-colors-text-primary'
  ]" class="min-h-screen">
    <ErrorBoundary>
      <!-- Mobile backdrop -->
      <div
        :class="['shell-backdrop', { 'is-visible': isSidebarOpen }]"
        @click="closeSidebar"
      ></div>

      <!-- Sidebar -->
      <aside :class="[
        'shell-sidebar',
        'private-shell__sidebar',
        { 'is-open': isSidebarOpen },
        'theme-colors-background-primary',
        'theme-colors-border-primary',
        'border-r'
      ]">
        <div class="flex flex-col h-full">
          <div class="flex-shrink-0">
            <div :class="[
              'h-14 flex items-center px-4',
              'theme-colors-border-primary',
              'border-b relative'
            ]">
              <div
                class="flex items-center absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 lg:static lg:transform-none cursor-pointer"
                @click="toggleSidebar">
                <div :class="['w-10 h-10 rounded-md flex items-center justify-center mr-2 shrink-0']">
                  <img
                    :src="siteLogoUrl || '/favicon/favicon.svg'"
                    alt="Site Logo"
                    class="w-full h-full object-contain"
                  />
                </div>
                <span :class="['theme-typography-weight-medium', 'hidden lg:inline whitespace-nowrap']">
                  {{ siteName || appConfig.name }}
                </span>
              </div>

            </div>
          </div>

          <div class="flex-1 overflow-y-auto overflow-x-hidden border-t border-gray-300 dark:border-gray-700 custom-scrollbar"
            style="height: auto !important; max-height: 100% !important;">
            <VerticalNav :items="autoNavigationItems" />
          </div>

          <div class="flex-shrink-0">
            <div class="relative flex items-center gap-2 p-3">
              <ProfileDropdownMini mode="sidebar" />
            </div>
          </div>
        </div>
      </aside>

      <!-- Content wrapper -->
      <div :class="[
        'shell-content',
        { 'sidebar-open--wide': isSidebarOpen }
      ]">
        <header :class="[
          'theme-layout-shell-header',
          'private-shell__header',
          'sticky top-0 z-30 h-14',
          'theme-colors-background-primary',
          'theme-colors-border-primary',
          'border-b'
        ]">
          <div class="flex items-center justify-between px-4 h-full">
            <div class="flex items-center gap-4">
              <dxButton variant="ghost" shape="circle" iconOnly size="md" @click="toggleSidebar"
                class="focus:outline-none focus:ring-0">
                <dxIcon name="ri:menu-line" />
              </dxButton>
              <div class="flex items-center h-10">
                <dxInput v-model="searchQuery" type="search" no-gutters placeholder="Search..." size="sm">
                  <template #prefix>
                    <dxIcon name="ri:search-2-line" size="sm" />
                  </template>
                </dxInput>
              </div>
            </div>
            <div :class="['flex items-center', 'gap-1 md:gap-2 lg:gap-4']">
              <NotificationsDropdown class="focus:outline-none focus:ring-0" />
              <ThemeSwitcherDropdown class="focus:outline-none focus:ring-0" />
              <ProfileDropdown class="focus:outline-none focus:ring-0" />
            </div>
          </div>
        </header>

        <template v-if="!isCached">
          <main
            :class="['private-shell__main', 'flex-grow flex flex-col', 'theme-mixins-gridPattern']">
            <ErrorBoundary>
              <!-- Single container for all pages -->
              <div :class="['theme-layout-container-base py-6']">
                <!-- Recent pages navigation -->
                <RecentPages class="mb-4" />

                <!-- Pages render here -->
                <router-view v-slot="{ Component }">
                  <Suspense>
                    <component :is="Component" />
                  </Suspense>
                </router-view>
              </div>
            </ErrorBoundary>
          </main>
        </template>
        <div v-else v-html="cachedContent"></div>
      </div>
    </ErrorBoundary>


  </div>
</template>

<style scoped>
/* Shell layout - scoped to this component */
.shell-sidebar {
  position: fixed;
  top: 0;
  bottom: 0;
  left: 0;
  width: 18rem; /* 288px - wide variant */
  z-index: 40;
  transform: translateX(-100%);
  transition: transform 0.3s ease-in-out;
}

.shell-sidebar.is-open {
  transform: translateX(0);
}

.shell-content {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  flex: 1;
  transition: margin-left 0.3s ease-in-out;
}

.private-shell__main {
  flex: 1 1 auto;
}

@media (min-width: 1024px) {
  .shell-content.sidebar-open--wide {
    margin-left: 18rem;
  }
}

.shell-backdrop {
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.3);
  z-index: 30;
  display: none;
}

.shell-backdrop.is-visible {
  display: block;
}

@media (min-width: 1024px) {
  .shell-backdrop.is-visible {
    display: none;
  }
}
</style>

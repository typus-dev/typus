<template>
  <!-- src/core/components/ProfileDropdownMini.vue -->
  <DropdownMenu position="bottom-right" width="w-48" menuClass="py-1" :isFixedPosition="true">
    <template #trigger>
      <dxButton variant="ghost" size="md" :shape="mode === 'sidebar' ? 'default' : 'circle'"
        :icon-only="mode !== 'sidebar'" :class="[
          'relative flex items-center',
          mode === 'sidebar' ? 'w-full p-2 rounded-none text-left' : ''
        ]">
         <div class="h-8 w-8 rounded-full overflow-hidden flex-shrink-0">
          <img v-if="avatarBlobUrl" :src="avatarBlobUrl" alt="Profile" class="h-full w-full object-cover" />
          <div v-else :class="[
            'h-full w-full flex items-center justify-center rounded-full border-2',
            'theme-colors-border-primary'
          ]">
            <dxIcon name="ri:user-line" size="md" :customClass="'text-neutral-600'"  />
          </div>
        </div>

        <div v-if="mode === 'sidebar'" class="flex flex-col overflow-hidden max-w-[120px] ml-2">
          <span :class="[
            'theme-typography-size-xs',
            'theme-typography-weight-medium',
            'theme-colors-text-primary',
            'truncate'
          ]">
            {{ authStore.user.value?.firstName }} {{ authStore.user.value?.lastName }}
          </span>
          <span :class="[
            'theme-typography-size-xs',
            'theme-colors-text-tertiary',
            'truncate'
          ]">
            {{ authStore.user.value?.email }}
          </span>
        </div>
      </dxButton>
    </template>


    <template #default>
      <div :class="['px-4 py-2 border-b', 'theme-colors-border-tertiary']">
        <div class="flex flex-col items-start gap-0.5">
          <p
            :class="['theme-typography-size-sm', 'theme-typography-weight-semibold', 'theme-colors-text-primary', 'truncate']">
            {{ authStore.user.value?.firstName }} {{ authStore.user.value?.lastName }}
          </p>
          <p :class="['theme-typography-size-xs', 'theme-colors-text-tertiary', 'truncate']">
            {{ authStore.user.value?.email }}
          </p>
        </div>
      </div>

      <template v-for="item in menuItems" :key="item.id">
        <div v-if="item.type === 'divider'" :class="['my-2 h-px', 'theme-colors-background-tertiary']" />
        <button v-else :class="[
          'flex items-center w-full px-4 py-2 transition',
          'theme-typography-size-sm',
          'theme-colors-text-primary',
          'hover:theme-colors-background-hover'
        ]" @click="item.onClick">
          <dxIcon :name="item.icon" size="sm" :customClass="'theme-colors-text-secondary'" class="mr-3" />
          {{ item.label }}
        </button>
      </template>
    </template>
  </DropdownMenu>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, watch } from 'vue'

const props = defineProps<{
  mode?: 'header' | 'sidebar'
}>()

const mode = computed(() => props.mode ?? 'header')

import { useAuthStore } from '@/core/store/authStore'
import { useRouter } from 'vue-router'
import { useModals } from '@/shared/composables/useModals'
import { fetchBlobWithAuth } from '@/shared/composables/useApi'

const authStore = useAuthStore()
const router = useRouter()
const { confirmModal } = useModals()

const avatarBlobUrl = ref<string | null>(null)

// Helper function to fetch avatar based on URL type
const fetchAvatar = async (url: string): Promise<Blob | null> => {
  try {
    if (url.includes('googleusercontent.com')) {
      // Use regular fetch for Google URLs (no auth header)
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.blob();
    } else {
      // Use fetchBlobWithAuth for local URLs
      return await fetchBlobWithAuth(url);
    }
  } catch (error) {
    logger.error('🔍 PROFILE DROPDOWN MINI: Error fetching avatar:', error);
    return null;
  }
};

// Watch for avatarUrl changes and fetch blob
watch(
  () => authStore.user.value?.avatarUrl,
  async (newUrl) => {
    if (newUrl) {
      const blob = await fetchAvatar(newUrl);
      if (blob) {
        avatarBlobUrl.value = URL.createObjectURL(blob);
      } else {
        avatarBlobUrl.value = null;
      }
    } else {
      avatarBlobUrl.value = null;
    }
  },
  { immediate: true }
)

// Compute user initials
const initials = computed(() => {
  const user = authStore.user.value;
  if (user?.firstName && user?.lastName) {
    return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
  } else if (user?.firstName) {
    return user.firstName[0].toUpperCase();
  } else if (user?.lastName) {
    return user.lastName[0].toUpperCase();
  } else if (user?.email) {
    return user.email[0].toUpperCase();
  }
  return '?';
});

const handleLogout = async () => {
  const confirmed = await confirmModal('Are you sure you want to log out?', { title: 'Logout' });
  if (confirmed) {
    await authStore.logout();
    router.push({ name: 'login' });
  }
};

const menuItems = computed(() => [
  { id: 'profile', label: 'Profile', icon: 'ri:user-line', onClick: () => router.push({ path: '/profile' }) },

  { id: 'divider', type: 'divider' },
  { id: 'logout', label: 'Logout', icon: 'ri:logout-box-r-line', onClick: handleLogout },
]);
</script>

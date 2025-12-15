<template>
  <!-- src/core/components/ProfileDropdown.vue -->
  <DropdownMenu position="bottom-right" width="w-48" menuClass="py-1" :isFixedPosition="true">
    <template #trigger>
      <dxButton
        variant="ghost"
        size="md"
        shape="circle"
        icon-only
      >
        <!-- Avatar image or fallback icon -->
        <img
          v-if="avatarBlobUrl"
          :src="avatarBlobUrl"
          alt="Profile"
          class="w-6 h-6 rounded-full object-cover"
        />
        <dxIcon v-else name="ri:user-line" size="md" />
      </dxButton>
    </template>


    <template #default>
      <div :class="['px-4 py-2 border-b', 'theme-colors-border-tertiary']">
        <div class="flex flex-col items-start gap-0.5">
          <p
            :class="['theme-typography-size-sm', 'theme-typography-weight-semibold', 'theme-colors-text-primary', 'truncate']">
            {{ userName }}
          </p>
          <p :class="['theme-typography-size-xs', 'theme-colors-text-tertiary', 'truncate']">
            {{ userEmail }}
          </p>
        </div>
      </div>

      <template v-for="item in menuItems" :key="item.id">
        <div v-if="item.type === 'divider'" :class="['my-2 h-px', 'theme-colors-background-tertiary']" />
        <button v-else :class="[
          'flex items-center w-full px-4 py-2',
          'theme-mixins-interactive',
          'theme-typography-size-sm',
          'theme-colors-text-primary'
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
const userName = ref<string>('')
const userEmail = ref<string>('')

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
    logger.error('🔍 PROFILE DROPDOWN: Error fetching avatar:', error);
    return null;
  }
};

// Watch for user changes and update local refs
watch(
  () => authStore.user.value,
  async (newUser) => {
    logger.debug('🔍 PROFILE DROPDOWN: User data changed:', newUser);
    
    // Update name and email
    if (newUser) {
      userName.value = `${newUser.firstName || ''} ${newUser.lastName || ''}`.trim();
      userEmail.value = newUser.email || '';
    } else {
      userName.value = '';
      userEmail.value = '';
    }
    
    // Update avatar
    const newUrl = newUser?.avatarUrl;
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
  { immediate: true, deep: true }
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

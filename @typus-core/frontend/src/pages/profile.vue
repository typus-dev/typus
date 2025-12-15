<route lang="json">
  {
    "name": "profile",
    "meta": {
      "layout": "private",
      "requiresAuth": true,
      "subject": "profile"
    }
  }
  </route>


<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useApi, fetchBlobWithAuth } from '@/shared/composables/useApi'
import { useModals } from '@/shared/composables/useModals'
import { useAuthStore } from '@/core/store/authStore'
import PasswordConfirmModal from '@/shared/components/PasswordConfirmModal.vue'

const router = useRouter()

const { successMessage, errorMessage, confirmMessage} = useMessages()
const { customModal } = useModals()
const authStore = useAuthStore()

const fileInput = ref(null)
const gradientBgClass = 'bg-gradient-to-r from-gray-600 via-gray-500 to-gray-600'

const form = reactive({
  firstName: '',
  lastName: '',
  email: '',
  phoneNumber: '',
  currentPassword: '',
  newPassword: '',
  avatarUrl: null,
  imagePreview: null,
  selectedFile: null,
  isTwoFactorEnabled: false,
  streamNotifications: true,
  emailNotifications: true,
  pushNotifications: false,
  loading: false
})

const initials = computed(() => {
  if (!form.firstName || !form.lastName) {
    return form.email ? form.email[0].toUpperCase() : '?'
  }
  return `${form.firstName[0]}${form.lastName[0]}`.toUpperCase()
})

const fullName = computed(() => {
  return [form.firstName, form.lastName].filter(Boolean).join(' ') || form.email || 'User'
})

const triggerFileUpload = () => fileInput.value?.click()

const handleFileChange = async (event) => {
  const file = event.target.files?.[0]
  if (!file) return

  if (file.size > 2 * 1024 * 1024) {
    errorMessage('File is too large. Maximum size is 2MB.')
    fileInput.value.value = ''
    return
  }

  form.selectedFile = file
  form.imagePreview = URL.createObjectURL(file)


    await uploadAvatar()

}

// Helper function to fetch avatar based on URL type
const fetchAvatar = async (url) => {
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
    logger.error('🔍 PROFILE PAGE: Error fetching avatar:', error);
    return null;
  }
};

const uploadAvatar = async () => {
  if (!form.selectedFile) return
  form.loading = true

  const formData = new FormData()
  formData.append('avatar', form.selectedFile)

  const { data, error } = await useApi('/auth/avatar').post(formData, { headers: { 'Content-Type': 'multipart/form-data' } })
  form.loading = false

  if (error) {
    errorMessage('Failed to upload avatar.')
    const blob = form.avatarUrl ? await fetchAvatar(form.avatarUrl) : null
    form.imagePreview = blob ? URL.createObjectURL(blob) : null
    return
  }

  form.avatarUrl = data.avatarUrl
  const blob = await fetchAvatar(data.avatarUrl)
  form.imagePreview = blob ? URL.createObjectURL(blob) : null
  authStore.updateUser({ avatarUrl: data.avatarUrl })
  
  form.selectedFile = null
  fileInput.value.value = ''
}

const update2FAStatus = async (enabled) => {
  if (enabled) {
    // If user is enabling 2FA, navigate to setup page
    router.push({ path: '/auth/setup-2fa', query: { returnToProfile: 'true' } })
    // Reset the switch state since we're navigating away
    form.isTwoFactorEnabled = false
  } else {
    // If user is disabling 2FA, request password confirmation
    const passwordData = ref({ password: '' })

    const confirmed = await customModal(
      PasswordConfirmModal,
      {
        message: 'Enter your password to disable two-factor authentication. This will make your account less secure.',
        modelValue: passwordData.value
      },
      {
        title: 'Disable Two-Factor Authentication',
        confirmText: 'Disable 2FA',
        cancelText: 'Cancel',
        type: 'danger',
        variant: 'danger'
      }
    )

    if (!confirmed) {
      // User cancelled, reset switch state
      form.isTwoFactorEnabled = true
      return
    }

    // Get password from the modal component
    const password = passwordData.value.password

    if (!password) {
      errorMessage('Password is required to disable 2FA')
      form.isTwoFactorEnabled = true
      return
    }

    form.loading = true
    const { data, error } = await useApi('/auth/2fa/disable').post({
      password
    })

    form.loading = false

    if (error) {
      errorMessage(error || 'Failed to disable 2FA')
      // Reset switch state on error
      form.isTwoFactorEnabled = true
    } else {
      successMessage(data?.message || 'Two-factor authentication disabled successfully')
      // Update auth store and local form state
      authStore.updateUser({ isTwoFactorEnabled: false })
      form.isTwoFactorEnabled = false
    }
  }
}

const updateNotificationPref = async (prefName, value) => {
  const oldValue = form[prefName]
  form[prefName] = value
  form.loading = true
  const { error } = await useApi('/auth/profile').post({ [prefName]: value })
  form.loading = false
  if (error) {
    errorMessage(`Failed to update ${prefName}`)
    form[prefName] = oldValue
  }
}

const saveProfile = async () => {
  form.loading = true
  const profilePayload = {
    firstName: form.firstName,
    lastName: form.lastName,
    phoneNumber: form.phoneNumber
  }
  const profileUpdate = await useApi('/auth/profile').post(profilePayload)
  let passwordError = null

  if (form.currentPassword && form.newPassword) {
    const pwRes = await useApi('/auth/password/update').post({ currentPassword: form.currentPassword, newPassword: form.newPassword })
    passwordError = pwRes.error
  }

  form.loading = false
  const errors = [profileUpdate.error, passwordError].filter(Boolean)
  if (errors.length) {
    errorMessage(errors.join('\n'))
  } else {
    successMessage('Profile updated successfully!')
    form.currentPassword = ''
    form.newPassword = ''
  }
}

const fetchProfile = async () => {
  form.loading = true
  const { data, error } = await useApi('/auth/profile').get()
  form.loading = false

  logger.debug('Profile data:', data)
  if (error) {
    errorMessage('Failed to load profile data.')
    return
  }

  Object.assign(form, {
    firstName: data.user.firstName || '',
    lastName: data.user.lastName || '',
    email: data.user.email || '',
    phoneNumber: data.user.phoneNumber || '',
    avatarUrl: data.user.avatarUrl || null,
    isTwoFactorEnabled: data.user.isTwoFactorEnabled || false,
    emailNotifications: data.user.emailNotifications ?? true,
    pushNotifications: data.user.pushNotifications ?? false
  })

  if (form.avatarUrl) {
    const blob = await fetchAvatar(form.avatarUrl)
    form.imagePreview = blob ? URL.createObjectURL(blob) : null
  } else {
    form.imagePreview = null
  }

  authStore.updateUser({
    firstName: form.firstName,
    lastName: form.lastName,
    email: form.email,
    phoneNumber: form.phoneNumber,
    avatarUrl: form.avatarUrl,
    isTwoFactorEnabled: form.isTwoFactorEnabled
  })
}

onMounted(fetchProfile)
</script>

<template>
  
    <dxForm @submit="saveProfile" validate-on-submit class="px-2 py-4 flex flex-col flex-grow">
      <dxCard title="Profile Settings" :class="['theme-colors-background-secondary', 'theme-colors-border-primary']">

        <dxStack align="center" spacing="4" class="mb-6">
          <div class="relative">
            <div class="h-28 w-28 rounded-full overflow-hidden ring-4 ring-white ring-offset-2 ring-offset-gray-100 shadow-lg">
              <img v-if="form.imagePreview" :src="form.imagePreview" alt="Profile Preview" class="h-full w-full object-cover">
              <div v-else :class="['h-full w-full flex items-center justify-center', gradientBgClass]">
                <span class="text-4xl font-semibold text-white">{{ initials }}</span>
              </div>
            </div>
            <dxButton shape="circle" size="sm" iconOnly variant="secondary" class="absolute bottom-0 right-0 bg-white !ring-1 ring-gray-300" @click="triggerFileUpload" aria-label="Change profile picture">
              <dxIcon name="ri:pencil-line" size="sm" />
            </dxButton>
            <input ref="fileInput" type="file" accept="image/*" class="hidden" @change="handleFileChange" />
          </div>
          <div class="text-center">
            <h1 class="text-2xl font-semibold">{{ fullName }}</h1>
            <p :class="'theme-colors-text-secondary'">{{ form.email }}</p>
          </div>
        </dxStack>

   <dxGrid cols="1" sm="2" gap="4">
  <dxCol>
    <dxInput v-model="form.firstName" label="First Name" label-position="top" placeholder="First Name" required />
  </dxCol>
  <dxCol>
    <dxInput v-model="form.lastName" label="Last Name" label-position="top" placeholder="Last Name" required />
  </dxCol>
</dxGrid>

<dxGrid cols="1" sm="2" gap="4" class="mt-4">
  <dxCol>
    <dxInput v-model="form.email" type="email" label="Email" label-position="top" disabled readonly />
  </dxCol>
  <dxCol>
    <dxInput v-model="form.phoneNumber" type="tel" label="Phone Number" label-position="top" autocomplete="tel" />
  </dxCol>
</dxGrid>

<dxGrid cols="1" sm="2" gap="4" class="mt-4">
  <dxCol>
    <dxInput v-model="form.currentPassword" type="password" label="Current Password" label-position="top" autocomplete="current-password" />
  </dxCol>
  <dxCol>
    <dxInput v-model="form.newPassword" type="password" label="New Password" label-position="top" autocomplete="new-password" />
  </dxCol>
</dxGrid>

        <dxGrid cols="1" sm="2" gap="4" class="mt-6">
          <dxCol>
            <!-- Empty Column -->
          </dxCol>
          <dxCol>
            <div class="space-y-4">
              <dxSwitch :modelValue="form.isTwoFactorEnabled" @update:modelValue="update2FAStatus" label="Two-Factor Authentication" :description="form.isTwoFactorEnabled ? 'Enabled' : 'Disabled'" labelPosition="left" />
              <dxSwitch :modelValue="form.emailNotifications" @update:modelValue="val => updateNotificationPref('emailNotifications', val)" label="Email Notifications" labelPosition="left" />
            </div>
          </dxCol>
        </dxGrid>

        <dxFlex justify="end" class="mt-6 pt-4 border-t" :class="'theme-colors-border-primary'">
          <dxButton type="submit" variant="primary" :loading="form.loading">Save Changes</dxButton>
        </dxFlex>
      </dxCard>
    </dxForm>
  
</template>


<style scoped>
:deep(.dx-switch-container) {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}
</style>

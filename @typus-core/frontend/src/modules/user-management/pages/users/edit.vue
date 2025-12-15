<route lang="json">
{
  "name": "users-edit",
  "path": "/user-management/users/edit/:id",
  "meta": {
    "layout": "private",
    "requiresAuth": true,
    "subject": "user",
    "ability": {
      "action": "manage",
      "subject": "user"
    }
  }
}
</route>

<script setup lang="ts">
import { reactive, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { UsersMethods } from '@/modules/user-management/methods/users.methods.dsl'
import { RolesMethods } from '@/modules/user-management/methods/roles.methods.dsl'
import UserForm from '@/modules/user-management/components/UserForm.vue'
import dxFormWrapper from '@/components/ui/dxFormWrapper.vue'
import type { UserFormData } from '@/modules/user-management/types'
import { logger } from '@/core/logging/logger'

const route = useRoute()
const router = useRouter()

// State
const pageData = reactive({
  formData: {
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    role: 'user',
    isApproved: false,
    isDeleted: false,
    isAdmin: false,
    isEmailVerified: false,
    isTwoFactorEnabled: false,
    twoFactorMethod: 'email',
    emailNotifications: true,
    pushNotifications: false,
    notes: ''
  } as UserFormData,
  loading: false,
  hasErrors: false
})

const userId = computed(() => route.params.id as string)

const additionalActions = computed(() => [
  {
    label: 'Delete User',
    variant: 'danger' as const,
    icon: 'ri:delete-bin-line',
    action: 'delete'
  }
])

// Actions
const fetchData = async () => {
  pageData.loading = true

  const user = await UsersMethods.getUserById(parseInt(userId.value))
  logger.debug('[EditUser] User data fetched:', user)

  if (!user) {
    logger.error('[EditUser] User not found')
    router.push('/user-management/users/list')
    return
  }

  // Fetch roles to get ability rules
  const roles = await RolesMethods.getRoles()
  const userRole = roles?.find(role => role.name === user.role)

  pageData.formData = {
    ...user,
    abilityRules: userRole?.abilityRules || null,
    password: '' // Never populate password in edit mode
  }

  pageData.loading = false
}

const handleSave = async () => {
  pageData.loading = true

  const updateData = { ...pageData.formData }
  if (!updateData.password) {
    delete updateData.password
  }

  await UsersMethods.updateUser(parseInt(userId.value), updateData)
  router.push('/user-management/users/list')

  pageData.loading = false
}

const handleCancel = () => {
  router.push('/user-management/users/list')
}

const handleAction = async (actionName: string) => {
  if (actionName === 'delete' && confirm('Are you sure you want to delete this user?')) {
    await UsersMethods.deleteUser(parseInt(userId.value))
    router.push('/user-management/users/list')
  }
}

onMounted(() => fetchData())
</script>

<template>
  
    <dxFormWrapper
      mode="edit"
      title="Edit User"
      :loading="pageData.loading"
      :has-errors="pageData.hasErrors"
      :additional-actions="additionalActions"
      @save="handleSave"
      @cancel="handleCancel"
      @action="handleAction"
    >
      <UserForm
        v-if="!pageData.loading"
        v-model="pageData.formData"
        :is-create-mode="false"
        @validate="pageData.hasErrors = $event"
      />
    </dxFormWrapper>
  
</template>

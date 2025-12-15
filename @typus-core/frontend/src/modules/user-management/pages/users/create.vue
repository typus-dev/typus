<route lang="json">
{
  "name": "create-user",
  "path": "/user-management/users/create",
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
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { UsersMethods } from '@/modules/user-management/methods/users.methods.dsl'
import UserForm from '@/modules/user-management/components/UserForm.vue'
import dxFormWrapper from '@/components/ui/dxFormWrapper.vue'
import type { UserFormData } from '@/modules/user-management/types'

const router = useRouter()

// State following pageData pattern
const pageData = reactive({
  formData: {
    firstName: '',
    lastName: '',
    email: '',
    password: '',
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

// Actions
const handleSave = async () => {
  pageData.loading = true
  await UsersMethods.createUser(pageData.formData)
  router.push('/user-management/users/list')
  pageData.loading = false
}

const handleCancel = () => {
  router.push('/user-management/users/list')
}
</script>

<template>
  
    <dxFormWrapper
      mode="create"
      title="Create User"
      :loading="pageData.loading"
      :has-errors="pageData.hasErrors"
      save-label="Create User"
      @save="handleSave"
      @cancel="handleCancel"
    >
      <UserForm
        v-model="pageData.formData"
        :is-create-mode="true"
        @validate="pageData.hasErrors = $event"
      />
    </dxFormWrapper>
  
</template>

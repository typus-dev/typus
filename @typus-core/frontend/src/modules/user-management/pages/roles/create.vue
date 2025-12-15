<route lang="json">
{
  "name": "create-role",
  "path": "/user-management/roles/create",
  "meta": {
    "layout": "private",
    "requiresAuth": true,
    "subject": "role",
    "ability": {
      "action": "manage",
      "subject": "role"
    }
  }
}
</route>

<script setup lang="ts">
import { reactive } from 'vue'
import { useRouter } from 'vue-router'
import { RolesMethods } from '@/modules/user-management/methods/roles.methods.dsl'
import RoleForm from '@/modules/user-management/components/RoleForm.vue'
import dxFormWrapper from '@/components/ui/dxFormWrapper.vue'
import type { RoleFormData } from '@/modules/user-management/types'
import { isValidJson } from '@/shared/utils/validation'
import { useMessages } from '@/shared/composables/useMessages'

const router = useRouter()
const { errorMessage } = useMessages()

// State
const pageData = reactive({
  formData: {
    name: '',
    description: '',
    abilityRules: '[{}]'
  } as RoleFormData,
  loading: false,
  hasErrors: false
})

// Actions
const handleSave = async () => {
  // Validate JSON
  if (!isValidJson(pageData.formData.abilityRules)) {
    errorMessage('Ability Rules must be valid JSON.')
    return
  }

  pageData.loading = true

  const abilityRulesObj = JSON.parse(pageData.formData.abilityRules)
  await RolesMethods.createRole({
    name: pageData.formData.name,
    description: pageData.formData.description,
    abilityRules: abilityRulesObj
  })

  router.push('/user-management/roles/list')
  pageData.loading = false
}

const handleCancel = () => {
  router.push('/user-management/roles/list')
}
</script>

<template>
  
    <dxFormWrapper
      mode="create"
      title="Create Role"
      :loading="pageData.loading"
      :has-errors="pageData.hasErrors"
      save-label="Create Role"
      @save="handleSave"
      @cancel="handleCancel"
    >
      <RoleForm
        v-model="pageData.formData"
        :is-create-mode="true"
        @validate="pageData.hasErrors = $event"
      />
    </dxFormWrapper>
  
</template>

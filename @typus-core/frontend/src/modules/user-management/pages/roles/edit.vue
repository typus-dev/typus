<route lang="json">
{
  "name": "edit-role",
  "path": "/user-management/roles/edit/:id",
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
import { reactive, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { RolesMethods } from '@/modules/user-management/methods/roles.methods.dsl'
import RoleForm from '@/modules/user-management/components/RoleForm.vue'
import dxFormWrapper from '@/components/ui/dxFormWrapper.vue'
import type { RoleFormData } from '@/modules/user-management/types'
import { isValidJson } from '@/shared/utils/validation'
import { useMessages } from '@/shared/composables/useMessages'
import { logger } from '@/core/logging/logger'

const route = useRoute()
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

const roleId = computed(() => parseInt(route.params.id as string))

const additionalActions = computed(() => [
  {
    label: 'Delete Role',
    variant: 'danger' as const,
    icon: 'ri:delete-bin-line',
    action: 'delete'
  }
])

// Actions
const fetchData = async () => {
  pageData.loading = true

  const role = await RolesMethods.getRoleById(roleId.value)
  logger.debug('[EditRole] Role data fetched:', role)

  if (!role) {
    logger.error('[EditRole] Role not found')
    router.push('/user-management/roles/list')
    return
  }

  pageData.formData = {
    name: role.name,
    description: role.description,
    abilityRules: role.abilityRules
      ? JSON.stringify(role.abilityRules, null, 2)
      : '[{}]'
  }

  pageData.loading = false
}

const handleSave = async () => {
  // Validate JSON
  if (!isValidJson(pageData.formData.abilityRules)) {
    errorMessage('Ability Rules must be valid JSON.')
    return
  }

  pageData.loading = true

  const abilityRulesObj = JSON.parse(pageData.formData.abilityRules)
  await RolesMethods.updateRole(roleId.value, {
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

const handleAction = async (actionName: string) => {
  if (actionName === 'delete' && confirm('Are you sure you want to delete this role?')) {
    await RolesMethods.deleteRole(roleId.value)
    router.push('/user-management/roles/list')
  }
}

onMounted(() => fetchData())
</script>

<template>
  
    <dxFormWrapper
      mode="edit"
      title="Edit Role"
      :loading="pageData.loading"
      :has-errors="pageData.hasErrors"
      :additional-actions="additionalActions"
      @save="handleSave"
      @cancel="handleCancel"
      @action="handleAction"
    >
      <RoleForm
        v-if="!pageData.loading"
        v-model="pageData.formData"
        :is-create-mode="false"
        @validate="pageData.hasErrors = $event"
      />
    </dxFormWrapper>
  
</template>

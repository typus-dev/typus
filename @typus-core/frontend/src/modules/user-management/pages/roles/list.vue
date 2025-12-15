<route lang="json">
{
  "name": "roles-list",
  "path": "/user-management/roles/list",
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
import { useRouter } from 'vue-router'
import { RolesMethods } from '@/modules/user-management/methods/roles.methods.dsl'
import { formatUtils } from '@/shared/utils/format'
import dxTable from '@/components/tables/dxTable/dxTable.vue'
import dxCard from '@/components/ui/dxCard.vue'
import PageHeader from '@/components/layout/PageHeader.vue'

const router = useRouter()

// State
const pageData = reactive({
  roles: [] as any[],
  loading: false,
  error: null as string | null
})

// Computed stats
const stats = computed(() => {
  const roles = pageData.roles
  const systemRoles = ['admin', 'user', 'manager', 'editor', 'viewer']
  return {
    total: roles.length,
    system: roles.filter(r => systemRoles.includes(r.name?.toLowerCase())).length,
    custom: roles.filter(r => !systemRoles.includes(r.name?.toLowerCase())).length
  }
})

// Table configuration
const columns = [
  { key: 'id', title: 'ID', sortable: true, width: '80px' },
  { key: 'name', title: 'Name', sortable: true, width: '150px' },
  { key: 'description', title: 'Description', sortable: true },
  {
    key: 'createdAt',
    title: 'Created',
    sortable: true,
    formatter: formatUtils.timeAgo,
    width: '150px'
  },
  {
    key: 'updatedAt',
    title: 'Updated',
    sortable: true,
    formatter: formatUtils.timeAgo,
    width: '150px'
  },
  { key: 'actions', title: 'Actions', width: '120px' }
]

// Actions
const loadRoles = async () => {
  pageData.loading = true
  pageData.error = null

  pageData.roles = await RolesMethods.getRoles()

  pageData.loading = false
}

const handleCreate = () => {
  router.push('/user-management/roles/create')
}

const handleEdit = (role: any) => {
  router.push(`/user-management/roles/edit/${role.id}`)
}

const handleDelete = async (role: any) => {
  await RolesMethods.deleteRole(role.id)
  await loadRoles()
}

const handleRowClick = (role: any) => {
  router.push(`/user-management/roles/edit/${role.id}`)
}

onMounted(() => loadRoles())
</script>

<template>
  <PageHeader
    title="Role Management"
    subtitle="Manage system roles and permissions"
  >
    <template #actions>
      <dxButton variant="primary" @click="handleCreate">
        <template #prefix>
          <dxIcon name="ri:add-line" />
        </template>
        Create Role
      </dxButton>
    </template>
  </PageHeader>

  <!-- Stats Cards -->
  <div class="grid grid-cols-3 gap-4 mb-6">
    <dxCard class="text-center p-4">
      <div class="text-3xl font-bold text-blue-600">{{ stats.total }}</div>
      <div class="text-sm text-gray-500 mt-1">Total Roles</div>
    </dxCard>
    <dxCard class="text-center p-4">
      <div class="text-3xl font-bold text-purple-600">{{ stats.system }}</div>
      <div class="text-sm text-gray-500 mt-1">System Roles</div>
    </dxCard>
    <dxCard class="text-center p-4">
      <div class="text-3xl font-bold text-green-600">{{ stats.custom }}</div>
      <div class="text-sm text-gray-500 mt-1">Custom Roles</div>
    </dxCard>
  </div>

  <dxCard>
      <dxTable
        :data="pageData.roles"
        :columns="columns"
        :loading="pageData.loading"
        :actions="true"
        confirm-delete-message="Are you sure you want to delete this role?"
        confirm-delete-title="Delete Role"
        @update="handleEdit"
        @delete="handleDelete"
        @row-click="handleRowClick"
      />
  </dxCard>
</template>

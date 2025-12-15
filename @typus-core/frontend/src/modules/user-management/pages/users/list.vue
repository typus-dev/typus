<route lang="json">
{
  "name": "users-list",
  "path": "/user-management/users/list",
  "meta": {
    "layout": "private",
    "requiresAuth": true,
    "subject": "user"
  }
}
</route>

<script setup lang="ts">
import { ref, onMounted, reactive, computed } from 'vue'
import { useRouter } from 'vue-router'
import { UsersMethods } from '@/modules/user-management/methods/users.methods.dsl'
import { formatUtils } from '@/shared/utils/format'
import dxTable from '@/components/tables/dxTable/dxTable.vue'
import dxCard from '@/components/ui/dxCard.vue'
import PageHeader from '@/components/layout/PageHeader.vue'

const router = useRouter()

// State following pageData pattern from guidelines
const pageData = reactive({
  users: [] as any[],
  loading: false,
  error: null as string | null
})

// Computed stats
const stats = computed(() => {
  const users = pageData.users
  const now = new Date()
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  return {
    total: users.length,
    active: users.filter(u => u.isApproved).length,
    admins: users.filter(u => u.isAdmin).length,
    newThisWeek: users.filter(u => new Date(u.createdAt) > weekAgo).length
  }
})

// Table configuration
const columns = [
  { key: 'firstName', title: 'First Name', sortable: true, width: '120px' },
  { key: 'lastName', title: 'Last Name', sortable: true, width: '120px' },
  { key: 'email', title: 'Email', sortable: true, width: '250px' },
  { key: 'role', title: 'Role', sortable: true, width: '100px' },
  { key: 'isApproved', title: 'Approved', sortable: true, type: 'boolean', width: '100px' },
  { key: 'isAdmin', title: 'Admin', sortable: true, type: 'boolean', width: '100px' },
  { key: 'lastLogin', title: 'Last Login', sortable: true, formatter: formatUtils.timeAgo, width: '180px' },
  { key: 'actions', title: 'Actions', width: '120px' }
]

// Actions
const loadUsers = async () => {
  pageData.loading = true
  pageData.error = null

  pageData.users = await UsersMethods.getUsers()

  pageData.loading = false
}

const handleCreate = () => {
  router.push('/user-management/users/create')
}

const handleEdit = (user: any) => {
  router.push(`/user-management/users/edit/${user.id}`)
}

const handleDelete = async (user: any) => {
  await UsersMethods.deleteUser(user.id)
  await loadUsers()
}

const handleRowClick = (user: any) => {
  router.push(`/user-management/users/edit/${user.id}`)
}

onMounted(() => loadUsers())
</script>

<template>
  <PageHeader
    title="Users Management"
    subtitle="Manage all system users"
  >
    <template #actions>
      <dxButton variant="primary" @click="handleCreate">
        <template #prefix>
          <dxIcon name="ri:add-line" />
        </template>
        Add User
      </dxButton>
    </template>
  </PageHeader>

  <!-- Stats Cards -->
  <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
    <dxCard class="text-center p-4">
      <div class="text-3xl font-bold text-blue-600">{{ stats.total }}</div>
      <div class="text-sm text-gray-500 mt-1">Total Users</div>
    </dxCard>
    <dxCard class="text-center p-4">
      <div class="text-3xl font-bold text-green-600">{{ stats.active }}</div>
      <div class="text-sm text-gray-500 mt-1">Active</div>
    </dxCard>
    <dxCard class="text-center p-4">
      <div class="text-3xl font-bold text-purple-600">{{ stats.admins }}</div>
      <div class="text-sm text-gray-500 mt-1">Admins</div>
    </dxCard>
    <dxCard class="text-center p-4">
      <div class="text-3xl font-bold text-amber-600">{{ stats.newThisWeek }}</div>
      <div class="text-sm text-gray-500 mt-1">New This Week</div>
    </dxCard>
  </div>

  <dxCard>
      <dxTable
        :data="pageData.users"
        :columns="columns"
        :loading="pageData.loading"
        :actions="true"
        confirm-delete-message="Are you sure you want to delete this user?"
        confirm-delete-title="Delete User"
        @update="handleEdit"
        @delete="handleDelete"
        @row-click="handleRowClick"
      />
  </dxCard>
</template>

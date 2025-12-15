<route lang="json">
{
  "name": "route-management",
  "path": "/routes",
  "meta": {
    "layout": "private",
    "subject": "dynamic-routes"
  }
}
</route>

<script setup lang="ts">
import { reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { DSL } from '@/dsl/client/DSL'
import dxTable from '@/components/tables/dxTable/dxTable.vue'
import PageHeader from '@/components/layout/PageHeader.vue'

const router = useRouter()

const pageData = reactive({
  routes: [] as any[],
  loading: false,
  page: 1,
  limit: 20,
  total: 0
})

const columns = [
  {
    key: 'name',
    title: 'Route Name',
    sortable: true,
    width: '200px'
  },
  {
    key: 'path',
    title: 'Path',
    sortable: true,
    width: '250px'
  },
  {
    key: 'component',
    title: 'Component',
    sortable: true,
    width: '150px'
  },
  {
    key: 'meta',
    title: 'Layout',
    sortable: false,
    width: '130px',
    formatter: (value: any) => value?.layout || '-'
  },
  {
    key: 'isActive',
    title: 'Active',
    sortable: true,
    type: 'boolean' as const,
    width: '80px'
  },
  { key: 'actions', title: 'Actions', width: '120px' }
]

const paginationMeta = computed(() => ({
  total: pageData.total,
  currentPage: pageData.page,
  limit: pageData.limit,
  totalPages: Math.ceil(pageData.total / pageData.limit),
  hasMore: pageData.page < Math.ceil(pageData.total / pageData.limit)
}))

const loadRoutes = async () => {
  pageData.loading = true
  try {
    const [routesResponse, total] = await Promise.all([
      DSL.SystemDynamicRoute.findMany(
        {},
        [],
        {
          page: pageData.page,
          limit: pageData.limit,
          orderBy: { createdAt: 'desc' }
        }
      ),
      DSL.SystemDynamicRoute.count({})
    ])

    const routes = Array.isArray(routesResponse)
      ? routesResponse
      : (routesResponse?.data || [])

    pageData.routes = routes
    pageData.total = total || 0
  } catch (error) {
    pageData.routes = []
    pageData.total = 0
  } finally {
    pageData.loading = false
  }
}

const handlePageChange = (page: number) => {
  pageData.page = page
  loadRoutes()
}

const handleCreate = () => {
  router.push('/routes/create')
}

const handleEdit = (route: any) => {
  router.push(`/routes/edit/${route.id}`)
}

const handleDelete = async (route: any) => {
  pageData.loading = true
  try {
    await DSL.SystemDynamicRoute.delete(route.id)
    await loadRoutes()
  } catch (error) {
    // Error handled by DSL
  } finally {
    pageData.loading = false
  }
}

const handleRowClick = (route: any) => {
  router.push(`/routes/edit/${route.id}`)
}

onMounted(loadRoutes)
</script>

<template>
  <PageHeader
    title="Routes Management"
    subtitle="Manage dynamic routes"
  >
    <template #actions>
      <dxButton variant="primary" @click="handleCreate">
        <template #prefix>
          <dxIcon name="ri:add-line" />
        </template>
        Add Route
      </dxButton>
    </template>
  </PageHeader>

  <dxCard>
      <dxTable
        :data="pageData.routes"
        :columns="columns"
        :loading="pageData.loading"
        :pagination-meta="paginationMeta"
        :server-side-pagination="true"
        :actions="true"
        confirm-delete-message="Are you sure you want to delete this route?"
        confirm-delete-title="Delete Route"
        @page-change="handlePageChange"
        @update="handleEdit"
        @delete="handleDelete"
        @row-click="handleRowClick"
      />
    </dxCard>
</template>

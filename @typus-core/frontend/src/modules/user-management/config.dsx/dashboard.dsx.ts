import type { dsxPageConfig } from '@/dsx/types'
import dxCard from '@/components/ui/dxCard.vue'
import dxChart from '@/components/charts/dxChart.vue'
import dxTable from '@/components/tables/dxTable/dxTable.vue';
import dxSearch from '@/components/ui/dxSearch.vue'
import dxForm from '@/components/ui/dxForm.vue'
import dxList from '@/components/ui/dxList.vue'
import { Data } from './datasources/dashboard.data'

const userDashboard: dsxPageConfig = {
  title: 'User Dashboard',
  layout: 'private',
  type: 'grid',
  gap: 16,
  blocks: [
    { id: 'stat-online', colSpan: 3, rowSpan: 2, components: [{ type: dxCard, props: { title: 'Online Users' }, dataSource: () => Data.Users.onlineNow() }] },
    { id: 'stat-total', colSpan: 3, rowSpan: 2, components: [{ type: dxCard, props: { title: 'Total Users' }, dataSource: () => Data.Users.total() }] },
    { id: 'stat-retention', colSpan: 3, rowSpan: 2, components: [{ type: dxCard, props: { title: 'Retention Rate' }, dataSource: () => Data.Users.retention() }] },
    {
      id: 'anomalies', colSpan: 3, rowSpan: 2, components: [{
        type: dxList, props: {
          title: 'Anomalies Detected', items: [
            '5 failed logins from 1 IP',
            'Login spike from Brazil',
            'Multiple sessions per user detected'
          ]
        }
      }]
    },

    { id: 'chart-activity', colSpan: 6, rowSpan: 4, components: [{ type: dxChart, props: { title: 'Hourly Activity', type: 'line' }, dataSource: () => Data.Users.activityByHour() }] },
    { id: 'chart-churn', colSpan: 6, rowSpan: 4, components: [{ type: dxChart, props: { title: 'Signups vs Churn', type: 'bar' }, dataSource: () => Data.Users.signupChurn() }] },

    { id: 'table-sessions', colSpan: 4, rowSpan: 4, components: [{ type: dxTable, props: { title: 'Active Sessions' }, dataSource: () => Data.Users.sessions() }] },
    { id: 'table-logs', colSpan: 4, rowSpan: 4, components: [{ type: dxTable, props: { title: 'Activity Logs' }, dataSource: () => Data.Users.activityLogs() }] },
    { id: 'chart-auth-errors-queue', colSpan: 4, rowSpan: 4, components: [{ type: dxChart, props: { title: 'Login Failures', type: 'bar' }, dataSource: () => Data.Users.loginErrors() }, { type: dxTable, props: { title: 'Task Queues' }, dataSource: () => Data.System.queues() }] },


    { id: 'table-blocked', colSpan: 6, rowSpan: 2, components: [{ type: dxTable, props: { title: 'Blocked Accounts' }, dataSource: () => Data.Users.blocked() }] },
    { id: 'chart-roles', colSpan: 6, rowSpan: 2, components: [{ type: dxChart, props: { title: 'Role-Based Activity', type: 'doughnut' }, dataSource: () => Data.Users.rolesActivity() }] },

    { id: 'table-errors', colSpan: 6, rowSpan: 2, components: [{ type: dxTable, props: { title: 'System Errors' }, dataSource: () => Data.System.errors() }] },
    { id: 'chart-locations', colSpan: 6, rowSpan: 2, components: [{ type: dxChart, props: { title: 'User Locations', type: 'pie' }, dataSource: () => Data.Users.geoDistribution() }] },

    { id: 'search-users', colSpan: 12, rowSpan: 1, components: [{ type: dxSearch, props: { placeholder: 'Search users...' } }] },

    { id: 'chart-utilization', colSpan: 12, rowSpan: 3, components: [{ type: dxChart, props: { title: 'System Load (API/DB)', type: 'line' }, dataSource: () => Data.System.utilization() }] },
    { id: 'table-users', colSpan: 12, rowSpan: 5, components: [{ type: dxTable, props: { title: 'All Users' }, dataSource: () => Data.Users.all() }] },
    { id: 'user-bulk-actions', colSpan: 6, rowSpan: 1, components: [{ type: dxForm, props: { title: 'Bulk Actions' } }] },
    { id: 'settings-panel', colSpan: 6, rowSpan: 2, components: [{ type: dxForm, props: { title: 'System Settings' } }] }
  ]
}

export default userDashboard

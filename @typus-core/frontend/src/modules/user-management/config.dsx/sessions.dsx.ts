import dxTable from '@/components/tables/dxTable/dxTable.vue';
import dxChart from '@/components/charts/dxChart.vue';

// ./pages/sessions.config.ts
import { Data, UserSessions, AuthHistory, AuthSessions } from '../methods/logins-history.methods.dsl';

export const sessionsConfig = {
  title: 'User Sessions',
  layout: 'private',
  type: 'container',
  columns: 12,
  gap: 16,
  colSpan: 12,
  components: [
    {
      type: dxChart,
      title: 'Login History',
      chartType: 'line',
      dataSource: () => AuthHistory.loginsHistoryByDateAndResult(),
      colSpan: 6
    },
    {
      type: dxChart,
      title: 'Active Sessions by Hour',
      chartType: 'bar',
      dataSource: () => AuthSessions.sessionsCountByHours(),
      colSpan: 6
    },
    {
      type: dxTable,
      title: 'User Sessions',
      dataSource: () => UserSessions.getUserSessions(),
      columns: [
        { label: 'User', field: 'user' },
        { label: 'IP', field: 'ip' },
        { label: 'Device', field: 'device' },
        { label: 'Location', field: 'location' },
        { label: 'Login Time', field: 'loginTime' },
        { label: 'Logout Time', field: 'logoutTime' },
        { label: 'Status', field: 'status' }
      ],
      colSpan: 12
    }
  ]
};
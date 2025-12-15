import type { dsxPageConfig } from '@/dsx/types'
import dxTableJSON from '@/components/tables/dxTableJSON.vue'
import dxChart from '@/components/charts/dxChart.vue'
import { Data, AuthHistory } from './datasources/users.data'

// Login History page configuration
const loginHistoryConfig: dsxPageConfig = {
  title: 'Login History',
  layout: 'private',
  type: 'grid',
  gap: 16,
  blocks: [
    // Chart 1: Logins by Authentication Method (Pie Chart)
    {
      id: 'logins-by-method-chart',
      colSpan: 6,
      rowSpan: 3,
      components: [
        {
          type: dxChart,
          props: {
            type: 'pie',
            data: {
              labels: AuthHistory.loginsByAuthMethod().map(d => d.method),
              datasets: [
                {
                  data: AuthHistory.loginsByAuthMethod().map(d => d.count),
                  backgroundColor: [
                    'rgba(255, 99, 132, 0.6)',
                    'rgba(54, 162, 235, 0.6)',
                    'rgba(255, 206, 86, 0.6)',
                    'rgba(75, 192, 192, 0.6)',
                    'rgba(153, 102, 255, 0.6)'
                  ],
                  borderColor: [
                    'rgba(255, 99, 132, 1)',
                    'rgba(54, 162, 235, 1)',
                    'rgba(255, 206, 86, 1)',
                    'rgba(75, 192, 192, 1)',
                    'rgba(153, 102, 255, 1)'
                  ],
                  borderWidth: 1
                }
              ]
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: {
                  position: 'right',
                  labels: {
                    boxWidth: 12
                  }
                },
                title: {
                  display: true,
                  text: 'Logins by Authentication Method'
                }
              }
            },
            height: '300px'
          }
        }
      ]
    },
    
    // Chart 2: Logins by Status (Success/Failed) (Pie Chart)
    {
      id: 'logins-by-status-chart',
      colSpan: 6,
      rowSpan: 3,
      components: [
        {
          type: dxChart,
          props: {
            type: 'pie',
            data: {
              labels: AuthHistory.loginsByStatus().map(d => d.status),
              datasets: [
                {
                  data: AuthHistory.loginsByStatus().map(d => d.count),
                  backgroundColor: [
                    'rgba(75, 192, 192, 0.6)',  // Success - Green
                    'rgba(255, 99, 132, 0.6)'   // Failed - Red
                  ],
                  borderColor: [
                    'rgba(75, 192, 192, 1)',
                    'rgba(255, 99, 132, 1)'
                  ],
                  borderWidth: 1
                }
              ]
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: {
                  position: 'right',
                  labels: {
                    boxWidth: 12
                  }
                },
                title: {
                  display: true,
                  text: 'Logins by Status'
                }
              }
            },
            height: '300px'
          }
        }
      ]
    },
    
    // Table: Login History Events
    {
      id: 'login-history-table',
      colSpan: 12,
      rowSpan: 4,
      components: [
        {
          type: dxTableJSON,
          props: {
            data: AuthHistory.findRecent(50),
            columns: [
              { key: 'timestamp', title: 'Date & Time' },
              { key: 'ip', title: 'IP Address' },
              { key: 'device', title: 'Device' },
              { key: 'location', title: 'Location' },
              { key: 'status', title: 'Status' },
              { key: 'method', title: 'Auth Method' }
            ],
            defaultItemsPerPage: 10
          }
        }
      ]
    }
  ]
}

export default loginHistoryConfig

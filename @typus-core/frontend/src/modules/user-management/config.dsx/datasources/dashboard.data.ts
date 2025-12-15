// src/datasources/dashboard.data.ts
import { h } from 'vue'

export const Data = {
  Users: {
    onlineNow: async () => 8123,
    total: async () => 100000,
    retention: async () => '84.2%',

    activityByHour: async () => ({
      labels: Array.from({ length: 24 }, (_, i) => `${i}:00`),
      datasets: [
        { label: 'Active Users', data: Array.from({ length: 24 }, () => Math.floor(Math.random() * 1000)) }
      ]
    }),

    signupChurn: async () => ({
      labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
      datasets: [
        { label: 'Signups', data: [4500, 3900, 3200, 2700] },
        { label: 'Churned', data: [1200, 1500, 1700, 2100] }
      ]
    }),

    geoDistribution: async () => ({
      labels: ['US', 'CA', 'UK', 'DE', 'FR', 'AU', 'IN'],
      datasets: [
        {
          label: 'User Distribution',
          data: [35000, 12000, 9000, 8000, 7500, 6000, 20000],
          backgroundColor: [
            'rgba(54, 162, 235, 0.7)',
            'rgba(255, 99, 132, 0.7)',
            'rgba(255, 206, 86, 0.7)',
            'rgba(75, 192, 192, 0.7)',
            'rgba(153, 102, 255, 0.7)',
            'rgba(255, 159, 64, 0.7)',
            'rgba(199, 199, 199, 0.7)'
          ]
        }
      ]
    }),

    sessions: async () => {
      const locations = ['US', 'CA', 'UK', 'BR', 'DE', 'AU']
      const devices = ['Chrome on Windows', 'Firefox on MacOS', 'Safari on iOS', 'Edge on Windows', 'Chrome on Android']

      return Array.from({ length: 20 }, (_, i) => ({
        user: `User ${i + 1}`,
        ip: `192.168.${Math.floor(i / 5) + 1}.${(i % 255) + 1}`,
        device: devices[i % devices.length],
        loginTime: new Date(Date.now() - Math.random() * 1000 * 60 * 60 * 6).toISOString(),
        location: locations[i % locations.length]
      }))
    },

    activityLogs: async () => Array.from({ length: 20 }, (_, i) => ({
      user: `User ${i + 1}`,
      action: ['Viewed dashboard', 'Updated profile', 'Reset password'][i % 3],
      timestamp: new Date(Date.now() - Math.random() * 7200000).toISOString()
    })),

    anomalies: async () => h('ul', {}, [
      h('li', '5 failed logins from 1 IP'),
      h('li', 'Login spike from Brazil'),
      h('li', 'Multiple sessions per user detected')
    ]),

    loginErrors: async () => ({
      labels: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      datasets: [
        { label: 'Errors', data: [50, 65, 40, 80, 30] }
      ]
    }),

    blocked: async () => Array.from({ length: 10 }, (_, i) => ({
      id: 1000 + i,
      name: `User ${i + 1}`,
      reason: ['Spam activity', 'Abusive behavior', 'Multiple account abuse'][i % 3]
    })),

    rolesActivity: async () => ({
      labels: ['Admin', 'Moderator', 'User', 'Guest'],
      datasets: [{
        label: 'Active',
        data: [150, 400, 3200, 800],
        backgroundColor: [
          'rgba(54, 162, 235, 0.7)',
          'rgba(255, 99, 132, 0.7)',
          'rgba(255, 206, 86, 0.7)',
          'rgba(75, 192, 192, 0.7)'
        ]
      }]
    }),

    all: async () => Array.from({ length: 50 }, (_, i) => ({
      id: i + 1,
      name: `User ${i + 1}`,
      email: `user${i + 1}@example.com`,
      role: ['admin', 'moderator', 'user'][i % 3],
      signup: '2024-11-02',
      lastActive: '2025-05-01'
    }))
  },

  System: {
    errors: async () => Array.from({ length: 10 }, (_, i) => ({
      time: new Date(Date.now() - i * 60000).toISOString(),
      type: ['API Error', 'Database Error', 'Timeout'][i % 3],
      message: `Error ${i + 1} occurred`
    })),

    queues: async () => [
      { queue: 'email', pending: 120 },
      { queue: 'reporting', pending: 40 },
      { queue: 'cleanup', pending: 5 }
    ],

    utilization: async () => ({
      labels: Array.from({ length: 10 }, (_, i) => `${i * 10}s`),
      datasets: [
        { label: 'API %', data: Array.from({ length: 10 }, () => Math.random() * 100) },
        { label: 'DB %', data: Array.from({ length: 10 }, () => Math.random() * 100) }
      ]
    })
  }
}

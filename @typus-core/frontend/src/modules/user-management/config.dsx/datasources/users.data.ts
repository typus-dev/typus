// dashboard.data.ts
export const Data = {
  Users: {
    totalCount: () => 1245,
    roles: () => [
      { label: 'Admin', value: 'admin' },
      { label: 'Editor', value: 'editor' },
      { label: 'Viewer', value: 'viewer' }
    ],
    statuses: () => [
      { label: 'Active', value: 'active' },
      { label: 'Inactive', value: 'inactive' },
      { label: 'Banned', value: 'banned' }
    ],
    sessions: () => [
      { name: 'Alice', email: 'alice@example.com', role: 'Admin', lastLogin: '2025-04-26', status: 'Active' },
      { name: 'Bob', email: 'bob@example.com', role: 'Editor', lastLogin: '2025-04-25', status: 'Inactive' },
      { name: 'Eve', email: 'eve@example.com', role: 'Viewer', lastLogin: '2025-04-24', status: 'Banned' }
    ]
  },

  Auth: {
    loginStats: () => ({
      success: 980,
      failed: 45
    })
  },

  Stats: {
    bounceRate: () => '38%',
    conversions: () => 97,
    errors: () => 12
  },

  Analytics: {
    siteTrafficByDay: () => [
      { date: '2025-04-24', visits: 120 },
      { date: '2025-04-25', visits: 150 },
      { date: '2025-04-26', visits: 170 }
    ],
    visitsByDay: () => [
      { date: '2025-04-24', count: 45 },
      { date: '2025-04-25', count: 60 },
      { date: '2025-04-26', count: 78 }
    ]
  },

  Filters: {
    periods: () => [
      { label: 'Last 7 Days', value: 'last7days' },
      { label: 'Last 30 Days', value: 'last30days' },
      { label: 'This Year', value: 'thisYear' }
    ]
  }
};

// Add these as separate namespaces to avoid nesting issues
export namespace UserSessions {
  export function getUserSessions() {
    // Generate 50 mock user sessions
    const users = ['Alice', 'Bob', 'Charlie', 'David', 'Eve', 'Frank', 'Grace', 'Heidi', 'Ivan', 'Julia'];
    const devices = ['iPhone', 'Android', 'Windows PC', 'MacBook', 'iPad', 'Linux Desktop', 'Chromebook', 'Samsung Galaxy'];
    const locations = ['New York', 'Chicago', 'Los Angeles', 'Boston', 'Miami', 'Dallas', 'Seattle', 'San Francisco', 'Denver', 'Atlanta'];
    const statuses = ['Active', 'Completed', 'Expired', 'Terminated'];
    
    const sessions = [];
    
    for (let i = 0; i < 50; i++) {
      const user = users[i % users.length];
      const userIndex = i % users.length;
      const deviceIndex = (i + Math.floor(i / 3)) % devices.length;
      const locationIndex = (i + Math.floor(i / 2)) % locations.length;
      const statusIndex = i % 4;
      
      const hour = 8 + (i % 10);
      const minute = (i * 7) % 60;
      
      const loginTime = `2025-04-${26 - (i % 5)} ${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      
      let logoutTime = null;
      if (statuses[statusIndex] === 'Completed') {
        const logoutHour = hour + 1 + (i % 3);
        const logoutMinute = (minute + 15 + (i % 30)) % 60;
        logoutTime = `2025-04-${26 - (i % 5)} ${logoutHour.toString().padStart(2, '0')}:${logoutMinute.toString().padStart(2, '0')}`;
      }
      
      const ip = `192.168.${1 + (i % 254)}.${1 + (i % 254)}`;
      
      sessions.push({
        user: user,
        ip: ip,
        device: devices[deviceIndex],
        location: locations[locationIndex],
        loginTime: loginTime,
        logoutTime: logoutTime,
        status: statuses[statusIndex]
      });
    }
    
    return sessions;
  }
  
  // Function for pie chart data - sessions by device type
  export function sessionsByDeviceType() {
    const sessions = getUserSessions();
    const deviceCounts: Record<string, number> = {};
    
    // Count sessions by device
    sessions.forEach(session => {
      if (!deviceCounts[session.device]) {
        deviceCounts[session.device] = 0;
      }
      deviceCounts[session.device]++;
    });
    
    // Convert to array format for chart
    return Object.keys(deviceCounts).map(device => ({
      device: device,
      count: deviceCounts[device]
    }));
  }
}

export namespace AuthHistory {
  export function loginsHistoryByDateAndResult() {
    return [
      { date: '2025-04-24', success: 85, failure: 5 },
      { date: '2025-04-25', success: 92, failure: 3 },
      { date: '2025-04-26', success: 88, failure: 6 }
    ];
  }

  export function findRecent(limit: number) {
    // Generate 50 mock login events
    const devices = ['iPhone', 'Android', 'Windows PC', 'MacBook', 'iPad', 'Linux Desktop', 'Chromebook', 'Samsung Galaxy'];
    const locations = ['New York', 'Chicago', 'Los Angeles', 'Boston', 'Miami', 'Dallas', 'Seattle', 'San Francisco', 'Denver', 'Atlanta'];
    const statuses = ['Success', 'Failed'];
    const methods = ['Password', '2FA', 'OAuth', 'SSO', 'Biometric'];
    
    const events = [];
    
    for (let i = 0; i < 50; i++) {
      const deviceIndex = (i + Math.floor(i / 3)) % devices.length;
      const locationIndex = (i + Math.floor(i / 2)) % locations.length;
      const statusIndex = i % 5 === 0 ? 1 : 0; // 20% failure rate
      const methodIndex = i % methods.length;
      
      const day = 26 - (i % 5);
      const hour = 8 + (i % 10);
      const minute = (i * 7) % 60;
      
      const timestamp = `2025-04-${day.toString().padStart(2, '0')} ${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      const ip = `192.168.${1 + (i % 254)}.${1 + (i % 254)}`;
      
      events.push({
        timestamp: timestamp,
        ip: ip,
        device: devices[deviceIndex],
        location: locations[locationIndex],
        status: statuses[statusIndex],
        method: methods[methodIndex]
      });
    }
    
    return events.slice(0, limit || events.length);
  }
  
  // Function for pie chart data - logins by authentication method
  export function loginsByAuthMethod() {
    const logins = findRecent(50);
    const methodCounts: Record<string, number> = {};
    
    // Count logins by method
    logins.forEach(login => {
      if (!methodCounts[login.method]) {
        methodCounts[login.method] = 0;
      }
      methodCounts[login.method]++;
    });
    
    // Convert to array format for chart
    return Object.keys(methodCounts).map(method => ({
      method: method,
      count: methodCounts[method]
    }));
  }
  
  // Function for pie chart data - logins by status (success/failure)
  export function loginsByStatus() {
    const logins = findRecent(50);
    const statusCounts: Record<string, number> = {};
    
    // Count logins by status
    logins.forEach(login => {
      if (!statusCounts[login.status]) {
        statusCounts[login.status] = 0;
      }
      statusCounts[login.status]++;
    });
    
    // Convert to array format for chart
    return Object.keys(statusCounts).map(status => ({
      status: status,
      count: statusCounts[status]
    }));
  }
}

export namespace AuthSessions {
  export function sessionsCountByHours() {
    return [
      { hour: '08:00', count: 45 },
      { hour: '09:00', count: 67 },
      { hour: '10:00', count: 89 },
      { hour: '11:00', count: 78 },
      { hour: '12:00', count: 92 },
      { hour: '13:00', count: 65 },
      { hour: '14:00', count: 55 },
      { hour: '15:00', count: 43 }
    ];
  }
}

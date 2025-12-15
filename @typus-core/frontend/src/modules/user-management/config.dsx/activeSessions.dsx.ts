import type { dsxPageConfig } from '@/dsx/types'
import dxTableJSON from '@/components/tables/dxTableJSON.vue'
import { UserSessions } from '../methods/logins-history.methods.dsl'

// Active Sessions page configuration
const activeSessionsConfig: dsxPageConfig = {
  title: 'Active Sessions',
  layout: 'private',
  type: 'grid',
  gap: 16,
  blocks: [
    // Table: Active Sessions
    {
      id: 'active-sessions-table',
      colSpan: 12,
      rowSpan: 6,
      components: [
        {
          type: dxTableJSON,
          dataSource: async () => {
            try {
              const sessions = await UserSessions.getActiveSessions();
              // Map the data to ensure email is at the top level
              return sessions.map((session: any) => ({
                ...session,
                email: session.user?.email || session.email || 'Unknown',
                createdAt: new Date(session.createdAt).toLocaleString(),
                lastActivity: new Date(session.lastActivity).toLocaleString(),
                expiresAt: new Date(session.expiresAt).toLocaleString()
              }));
            } catch (error) {
              console.error('Failed to load active sessions:', error);
              return [];
            }
          },
          props: {
            columns: [
              { 
                key: 'email', 
                title: 'User'
              },
              { key: 'ip', title: 'IP Address' },
              { key: 'device', title: 'Device' },
              { key: 'location', title: 'Location' },
              { 
                key: 'createdAt', 
                title: 'Login Time'
              },
              { 
                key: 'lastActivity', 
                title: 'Last Activity'
              },
              { 
                key: 'expiresAt', 
                title: 'Expires'
              }
            ],
            actions: [
              {
                label: 'Terminate',
                type: 'danger',
                onClick: async (session: any) => {
                  if (confirm('Are you sure you want to terminate this session?')) {
                    try {
                      await UserSessions.terminateSession(session.id);
                      alert('Session terminated successfully');
                      window.location.reload();
                    } catch (error) {
                      console.error('Error:', error);
                      alert('Failed to terminate session');
                    }
                  }
                }
              }
            ],
            defaultItemsPerPage: 20
          }
        }
      ]
    },
    
    // Bulk Actions Section
    {
      id: 'bulk-actions',
      colSpan: 12,
      rowSpan: 2,
      components: [
        {
          type: dxTableJSON,
          dataSource: async () => [
            {
              action: 'Terminate All My Sessions',
              description: 'Log out from all your devices',
              type: 'user'
            },
            {
              action: 'Terminate All Sessions (Admin)',
              description: 'Log out all users globally',
              type: 'admin'
            }
          ],
          props: {
            columns: [
              { key: 'action', title: 'Action' },
              { key: 'description', title: 'Description' }
            ],
            actions: [
              {
                label: 'Execute',
                type: 'warning',
                onClick: async (item: any) => {
                  if (item.type === 'user') {
                    if (confirm('Are you sure you want to terminate all your sessions? You will be logged out.')) {
                      try {
                        const currentUser = await UserSessions.getCurrentUser();
                        if (currentUser?.id) {
                          await UserSessions.terminateUserSessions(currentUser.id);
                          alert('All your sessions have been terminated');
                          window.location.reload();
                        }
                      } catch (error) {
                        console.error('Error:', error);
                        alert('Failed to terminate sessions');
                      }
                    }
                  } else if (item.type === 'admin') {
                    if (confirm('Are you sure you want to terminate ALL sessions globally? This will log out all users.')) {
                      try {
                        await UserSessions.terminateAllSessions();
                        alert('All sessions have been terminated globally');
                        window.location.reload();
                      } catch (error) {
                        console.error('Error:', error);
                        alert('Failed to terminate all sessions. You may not have admin privileges.');
                      }
                    }
                  }
                }
              }
            ],
            defaultItemsPerPage: 5
          }
        }
      ]
    }
  ]
}

export default activeSessionsConfig

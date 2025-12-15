<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { DSL, initDslClient } from '../index';
import dsxPageRenderer from '@/dsx/components/dsxPageRenderer.vue';
import dxCard from '@/components/ui/dxCard.vue';
import dxTable from '@/components/tables/dxTable/dxTable.vue';
import dxButton from '@/components/ui/dxButton.vue';
import dxSelect from '@/components/ui/dxSelect/dxSelect.vue';
;

// State
const selectedUser = ref<any>(null);
const selectedRole = ref<string>('');
const users = ref<any[]>([]);
const roles = ref<any[]>([]);
const userRoles = ref<any[]>([]);
const loading = ref({
  users: false,
  roles: false,
  userRoles: false,
  addRole: false,
  removeRole: false
});
const status = ref({
  success: null as string | null,
  error: null as string | null
});

// Fetch users
const fetchUsers = async () => {
  loading.value.users = true;
  try {

    users.value = await DSL.User.findMany();
    logger.debug('[UserRolesExample] Users fetched successfully', { users: users.value });
  } catch (error) {
    logger.error('[UserRolesExample] Error fetching users', { error });
    status.value.error = 'Failed to fetch users';
  } finally {
    loading.value.users = false;
  }
};

// Fetch roles
const fetchRoles = async () => {
  loading.value.roles = true;
  try {

    roles.value = await DSL.Role.findMany();
    logger.debug('[UserRolesExample] Roles fetched successfully', { roles: roles.value });
  } catch (error) {
    logger.error('[UserRolesExample] Error fetching roles', { error });
    status.value.error = 'Failed to fetch roles';
  } finally {
    loading.value.roles = false;
  }
};

// Fetch user roles
const fetchUserRoles = async (userId: number) => {
  if (!userId) return;
  
  loading.value.userRoles = true;
  try {

    userRoles.value = await DSL.User.relation(userId, 'roles').findMany();
    logger.debug('[UserRolesExample] User roles fetched successfully', { userRoles: userRoles.value });
  } catch (error) {
    logger.error('[UserRolesExample] Error fetching user roles', { error });
    status.value.error = 'Failed to fetch user roles';
  } finally {
    loading.value.userRoles = false;
  }
};

// Add role to user
const addRoleToUser = async () => {
  if (!selectedUser.value || !selectedRole.value) return;
  
  loading.value.addRole = true;
  status.value.success = null;
  status.value.error = null;
  
  try {

    await DSL.User.relation(selectedUser.value.id, 'roles').connect(selectedRole.value);
    logger.debug('[UserRolesExample] Role added to user successfully');
    
    // Refresh user roles
    await fetchUserRoles(selectedUser.value.id);
    
    status.value.success = 'Role added successfully';
    selectedRole.value = '';
  } catch (error) {
    logger.error('[UserRolesExample] Error adding role to user', { error });
    status.value.error = 'Failed to add role to user';
  } finally {
    loading.value.addRole = false;
  }
};

// Remove role from user
const removeRoleFromUser = async (roleId: number) => {
  if (!selectedUser.value) return;
  
  loading.value.removeRole = true;
  status.value.success = null;
  status.value.error = null;
  
  try {

    await DSL.User.relation(selectedUser.value.id, 'roles').disconnect(roleId);
    logger.debug('[UserRolesExample] Role removed from user successfully');
    
    // Refresh user roles
    await fetchUserRoles(selectedUser.value.id);
    
    status.value.success = 'Role removed successfully';
  } catch (error) {
    logger.error('[UserRolesExample] Error removing role from user', { error });
    status.value.error = 'Failed to remove role from user';
  } finally {
    loading.value.removeRole = false;
  }
};

// Select user
const selectUser = async (user: any) => {
  selectedUser.value = user;
  await fetchUserRoles(user.id);
};

// Initialize
onMounted(async () => {
  try {

    logger.debug('[UserRolesExample] DSL client initialized successfully');
    
    // Fetch users and roles
    await Promise.all([fetchUsers(), fetchRoles()]);
  } catch (error) {
    logger.error('[UserRolesExample] Error initializing DSL client', { error });
  }
});

// Page configuration
const pageConfig = ref({
  title: 'User Roles Example',
  layout: 'default',
  blocks: [
    {
      id: 'users-list',
      colSpan: 6,
      components: [
        {
          type: dxCard,
          props: {
            title: 'Users',
            variant: 'elevated',
            fullHeight: true,
            loading: loading.value.users
          },
          slots: {
            default: () => ({
              type: dxTable,
              props: {
                columns: [
                  { key: 'id', label: 'ID' },
                  { key: 'name', label: 'Name' },
                  { key: 'email', label: 'Email' },
                  { key: 'actions', label: 'Actions' }
                ],
                items: users.value.map(user => ({
                  ...user,
                  actions: {
                    type: dxButton,
                    props: {
                      label: 'Select',
                      variant: 'primary',
                      size: 'sm',
                      onClick: () => selectUser(user)
                    }
                  }
                }))
              }
            })
          }
        }
      ]
    },
    {
      id: 'user-roles',
      colSpan: 6,
      components: [
        {
          type: dxCard,
          props: {
            title: selectedUser.value ? `Roles for ${selectedUser.value.name}` : 'Select a user',
            variant: 'elevated',
            fullHeight: true,
            loading: loading.value.userRoles
          },
          slots: {
            default: () => [
              selectedUser.value ? {
                type: 'div',
                props: {
                  class: 'mb-4'
                },
                slots: {
                  default: () => [
                    {
                      type: 'div',
                      props: {
                        class: 'flex gap-2'
                      },
                      slots: {
                        default: () => [
                          {
                            type: dxSelect,
                            props: {
                              label: 'Add Role',
                              modelValue: selectedRole.value,
                              'onUpdate:modelValue': (value: string) => selectedRole.value = value,
                              options: roles.value
                                .filter(role => !userRoles.value.some(ur => ur.id === role.id))
                                .map(role => ({
                                  value: role.id,
                                  label: role.name
                                })),
                              placeholder: 'Select a role'
                            }
                          },
                          {
                            type: dxButton,
                            props: {
                              label: 'Add',
                              variant: 'primary',
                              loading: loading.value.addRole,
                              disabled: !selectedRole.value,
                              onClick: addRoleToUser
                            }
                          }
                        ]
                      }
                    },
                    status.value.success ? {
                      type: 'div',
                      props: {
                        class: 'alert alert-success mt-2'
                      },
                      slots: {
                        default: () => status.value.success
                      }
                    } : null,
                    status.value.error ? {
                      type: 'div',
                      props: {
                        class: 'alert alert-danger mt-2'
                      },
                      slots: {
                        default: () => status.value.error
                      }
                    } : null
                  ]
                }
              } : null,
              selectedUser.value ? {
                type: dxTable,
                props: {
                  columns: [
                    { key: 'id', label: 'ID' },
                    { key: 'name', label: 'Name' },
                    { key: 'description', label: 'Description' },
                    { key: 'actions', label: 'Actions' }
                  ],
                  items: userRoles.value.map(role => ({
                    ...role,
                    actions: {
                      type: dxButton,
                      props: {
                        label: 'Remove',
                        variant: 'danger',
                        size: 'sm',
                        loading: loading.value.removeRole,
                        onClick: () => removeRoleFromUser(role.id)
                      }
                    }
                  })),
                  emptyMessage: 'No roles assigned to this user'
                }
              } : {
                type: 'div',
                props: {
                  class: 'text-center p-4'
                },
                slots: {
                  default: () => 'Please select a user to manage their roles'
                }
              }
            ]
          }
        }
      ]
    }
  ]
});
</script>

<template>
  <dsxPageRenderer :config="pageConfig" />
</template>

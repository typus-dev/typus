<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { DSL } from '../index';
import dsxPageRenderer from '@/dsx/components/dsxPageRenderer.vue';
import dxCard from '@/components/ui/dxCard.vue';
import dxTable from '@/components/tables/dxTable/dxTable.vue';

// Page configuration
const pageConfig = ref({
  title: 'User List Example',
  layout: 'default',
  blocks: [
    {
      id: 'user-list',
      colSpan: 12,
      components: [
        {
          type: dxCard,
          props: {
            title: 'Users',
            variant: 'elevated',
            fullHeight: true
          },
          slots: {
            default: () => ({
              type: dxTable,
              props: {
                columns: [
                  { key: 'id', label: 'ID' },
                  { key: 'name', label: 'Name' },
                  { key: 'email', label: 'Email' },
                  { key: 'status', label: 'Status' }
                ],
                items: []
              },
              dataSource: async () => {
                try {
                  // Initialize DSL client if not already initialized
      
                  // Fetch users using DSL client
                  const users = await DSL.User.findMany();
                  
                  logger.debug('[UserListExample] Users fetched successfully', { users });
                  
                  return users;
                } catch (error) {
                  logger.error('[UserListExample] Error fetching users', { error });
                  return [];
                }
              }
            })
          }
        }
      ]
    }
  ]
});

// Initialize DSL client on component mount
onMounted(async () => {
  try {
    
    logger.debug('[UserListExample] DSL client initialized successfully');
  } catch (error) {
    logger.error('[UserListExample] Error initializing DSL client', { error });
  }
});
</script>

<template>
  <dsxPageRenderer :config="pageConfig" />
</template>

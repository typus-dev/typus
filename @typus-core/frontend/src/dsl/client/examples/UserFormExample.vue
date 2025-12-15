<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { DSL, initDslClient } from '../index';
import dsxPageRenderer from '@/dsx/components/dsxPageRenderer.vue';
import dxCard from '@/components/ui/dxCard.vue';
import dxForm from '@/components/ui/dxForm.vue';
import dxInput from '@/components/ui/dxInput.vue';
import dxSelect from '@/components/ui/dxSelect/dxSelect.vue';
import dxButton from '@/components/ui/dxButton.vue';
;

// Form data
const formData = ref({
  name: '',
  email: '',
  password: '',
  status: 'active'
});

// Form status
const formStatus = ref({
  loading: false,
  success: false,
  error: null as string | null
});

// Handle form submission
const handleSubmit = async () => {
  formStatus.value.loading = true;
  formStatus.value.success = false;
  formStatus.value.error = null;
  
  try {

    
    // Create user using DSL client
    const user = await DSL.User.create(formData.value);
    
    logger.debug('[UserFormExample] User created successfully', { user });
    
    // Reset form
    formData.value = {
      name: '',
      email: '',
      password: '',
      status: 'active'
    };
    
    formStatus.value.success = true;
  } catch (error: any) {
    logger.error('[UserFormExample] Error creating user', { error });
    formStatus.value.error = error.message || 'Failed to create user';
  } finally {
    formStatus.value.loading = false;
  }
};

// Page configuration
const pageConfig = ref({
  title: 'Create User Example',
  layout: 'default',
  blocks: [
    {
      id: 'user-form',
      colSpan: 6,
      components: [
        {
          type: dxCard,
          props: {
            title: 'Create User',
            variant: 'elevated',
            fullHeight: true
          },
          slots: {
            default: () => [
              {
                type: dxForm,
                props: {
                  onSubmit: handleSubmit,
                  loading: formStatus.value.loading
                },
                slots: {
                  default: () => [
                    {
                      type: dxInput,
                      props: {
                        label: 'Name',
                        modelValue: formData.value.name,
                        'onUpdate:modelValue': (value: string) => formData.value.name = value,
                        required: true
                      }
                    },
                    {
                      type: dxInput,
                      props: {
                        label: 'Email',
                        modelValue: formData.value.email,
                        'onUpdate:modelValue': (value: string) => formData.value.email = value,
                        type: 'email',
                        required: true
                      }
                    },
                    {
                      type: dxInput,
                      props: {
                        label: 'Password',
                        modelValue: formData.value.password,
                        'onUpdate:modelValue': (value: string) => formData.value.password = value,
                        type: 'password',
                        required: true
                      }
                    },
                    {
                      type: dxSelect,
                      props: {
                        label: 'Status',
                        modelValue: formData.value.status,
                        'onUpdate:modelValue': (value: string) => formData.value.status = value,
                        options: [
                          { value: 'active', label: 'Active' },
                          { value: 'inactive', label: 'Inactive' },
                          { value: 'suspended', label: 'Suspended' }
                        ],
                        required: true
                      }
                    },
                    {
                      type: dxButton,
                      props: {
                        type: 'submit',
                        label: 'Create User',
                        variant: 'primary',
                        loading: formStatus.value.loading
                      }
                    }
                  ]
                }
              },
              formStatus.value.success ? {
                type: 'div',
                props: {
                  class: 'alert alert-success mt-4'
                },
                slots: {
                  default: () => 'User created successfully!'
                }
              } : null,
              formStatus.value.error ? {
                type: 'div',
                props: {
                  class: 'alert alert-danger mt-4'
                },
                slots: {
                  default: () => formStatus.value.error
                }
              } : null
            ]
          }
        }
      ]
    }
  ]
});

// Initialize DSL client on component mount
onMounted(async () => {
  try {
    
    logger.debug('[UserFormExample] DSL client initialized successfully');
  } catch (error) {
    logger.error('[UserFormExample] Error initializing DSL client', { error });
  }
});
</script>

<template>
  <dsxPageRenderer :config="pageConfig" />
</template>

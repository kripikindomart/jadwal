<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import AdminLayout from '@/layouts/AdminLayout.vue'
import AuthLayout from '@/layouts/AuthLayout.vue'
import BlankLayout from '@/layouts/BlankLayout.vue'
import ToastContainer from '@/components/ui/ToastContainer.vue'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'

const route = useRoute()

const layout = computed(() => {
  if (route.matched.length === 0) return 'div' // Prevents FOUC on initial loading
  
  const meta = route.meta?.layout as string
  if (meta === 'auth') return AuthLayout
  if (meta === 'blank') return BlankLayout
  return AdminLayout
})
</script>

<template>
  <component :is="layout">
    <RouterView />
  </component>
  
  <!-- Global Overlays -->
  <ToastContainer />
  <ConfirmDialog />
</template>

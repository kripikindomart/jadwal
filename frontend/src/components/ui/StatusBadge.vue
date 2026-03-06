<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  status?: string | boolean | number
  type?: 'active-inactive' | 'general'
}>()

const badgeStyle = computed(() => {
  const s = String(props.status).toLowerCase()
  
  if (['aktif', 'true', '1', 'active', 'success'].includes(s)) {
    return 'bg-emerald-100 text-emerald-700 border-emerald-200'
  }
  if (['nonaktif', 'false', '0', 'inactive', 'failed', 'error'].includes(s)) {
    return 'bg-rose-100 text-rose-700 border-rose-200'
  }
  if (['cuti', 'pending', 'warning'].includes(s)) {
    return 'bg-amber-100 text-amber-700 border-amber-200'
  }
  if (['lulus', 'info'].includes(s)) {
    return 'bg-blue-100 text-blue-700 border-blue-200'
  }
  
  // Default fallback
  return 'bg-slate-100 text-slate-700 border-slate-200'
})

const displayText = computed(() => {
  if (props.type === 'active-inactive' && typeof props.status === 'boolean') {
    return props.status ? 'Aktif' : 'Nonaktif'
  }
  return props.status
})
</script>

<template>
  <span
    :class="[
      'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border',
      badgeStyle
    ]"
  >
    {{ displayText }}
  </span>
</template>

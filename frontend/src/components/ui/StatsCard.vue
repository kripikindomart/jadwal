<script setup lang="ts">
import { computed } from 'vue'
import type { LucideIcon } from 'lucide-vue-next'

const props = defineProps<{
  title: string
  value: string | number
  icon: LucideIcon
  color?: 'emerald' | 'blue' | 'amber' | 'rose' | 'slate' | 'indigo' | 'violet'
}>()

const colorClasses = computed(() => {
  const c = props.color || 'slate'
  switch (c) {
    case 'emerald': return 'bg-emerald-50 text-emerald-600 border-emerald-100'
    case 'blue': return 'bg-blue-50 text-blue-600 border-blue-100'
    case 'amber': return 'bg-amber-50 text-amber-600 border-amber-100'
    case 'rose': return 'bg-rose-50 text-rose-600 border-rose-100'
    case 'indigo': return 'bg-indigo-50 text-indigo-600 border-indigo-100'
    case 'violet': return 'bg-violet-50 text-violet-600 border-violet-100'
    default: return 'bg-slate-50 text-slate-600 border-slate-100'
  }
})
</script>

<template>
  <div class="relative overflow-hidden rounded-2xl bg-white p-5 border border-slate-200 shadow-sm transition-all hover:shadow-md">
    <div class="flex items-center gap-4">
      <div :class="['flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border', colorClasses]">
        <component :is="icon" class="h-6 w-6" />
      </div>
      <div>
        <p class="text-sm font-medium text-slate-500">{{ title }}</p>
        <p class="mt-1 text-2xl font-bold tracking-tight text-slate-900">{{ value }}</p>
      </div>
    </div>
    <!-- Decorative gradient blur -->
    <div :class="`absolute -bottom-6 -right-6 h-24 w-24 rounded-full opacity-20 blur-2xl ${colorClasses.split(' ')[0]}`"></div>
  </div>
</template>

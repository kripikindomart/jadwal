<script setup lang="ts">
import { useToast } from '@/composables/useToast'
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-vue-next'

const { toasts, removeToast } = useToast()

const getIcon = (type: string) => {
  switch (type) {
    case 'success': return CheckCircle2
    case 'error': return AlertCircle
    case 'warning': return AlertTriangle
    case 'info': return Info
    default: return Info
  }
}

const getStyles = (type: string) => {
  switch (type) {
    case 'success': return 'bg-emerald-50 text-emerald-800 border-emerald-200'
    case 'error': return 'bg-rose-50 text-rose-800 border-rose-200'
    case 'warning': return 'bg-amber-50 text-amber-800 border-amber-200'
    case 'info': return 'bg-blue-50 text-blue-800 border-blue-200'
    default: return 'bg-slate-50 text-slate-800 border-slate-200'
  }
}

const getIconColor = (type: string) => {
  switch (type) {
    case 'success': return 'text-emerald-500'
    case 'error': return 'text-rose-500'
    case 'warning': return 'text-amber-500'
    case 'info': return 'text-blue-500'
    default: return 'text-slate-500'
  }
}
</script>

<template>
  <div class="fixed top-0 right-0 z-[100] flex max-h-screen w-full flex-col-reverse p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px] gap-2 pointer-events-none">
    <TransitionGroup
      enter-active-class="transition duration-300 ease-out"
      enter-from-class="translate-x-full opacity-0"
      enter-to-class="translate-x-0 opacity-100"
      leave-active-class="transition duration-200 ease-in absolute right-4 left-4 sm:left-auto"
      leave-from-class="opacity-100"
      leave-to-class="translate-x-full opacity-0"
      move-class="transition duration-300 ease-in-out"
    >
      <div
        v-for="toast in toasts"
        :key="toast.id"
        class="pointer-events-auto flex w-full items-start gap-3 rounded-xl border p-4 shadow-lg backdrop-blur-sm"
        :class="getStyles(toast.type)"
      >
        <component :is="getIcon(toast.type)" class="h-5 w-5 shrink-0 mt-0.5" :class="getIconColor(toast.type)" />
        <div class="flex-1 space-y-1">
          <p class="text-sm font-semibold">{{ toast.title }}</p>
          <p v-if="toast.message" class="text-sm opacity-90">{{ toast.message }}</p>
        </div>
        <button
          @click="removeToast(toast.id)"
          class="shrink-0 rounded-md p-1 opacity-50 hover:opacity-100 focus:opacity-100 focus:outline-none focus:ring-2 transition-opacity"
        >
          <X class="h-4 w-4" />
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>

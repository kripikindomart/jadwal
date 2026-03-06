```vue
<script setup lang="ts">
import { useConfirm } from '@/composables/useConfirm'
import { AlertCircle, Trash2, Info } from 'lucide-vue-next'
import { onMounted, onUnmounted, watch } from 'vue'

const { state, confirm, cancel } = useConfirm()

function handleEscape(e: KeyboardEvent) {
  if (e.key === 'Escape' && state.value.isOpen) {
    cancel()
  }
}

watch(() => state.value.isOpen, (isOpen) => {
  if (isOpen) {
    document.body.style.overflow = 'hidden'
  } else {
    document.body.style.overflow = ''
  }
})

onMounted(() => {
  document.addEventListener('keydown', handleEscape)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleEscape)
  document.body.style.overflow = ''
})

const getIcon = () => {
  switch (state.value.style) {
    case 'danger': return Trash2
    case 'warning': return AlertCircle
    case 'info': return Info
    default: return Info
  }
}

const getIconBg = () => {
  switch (state.value.style) {
    case 'danger': return 'bg-rose-100 text-rose-600'
    case 'warning': return 'bg-amber-100 text-amber-600'
    case 'info': return 'bg-blue-100 text-blue-600'
    default: return 'bg-blue-100 text-blue-600'
  }
}

const getConfirmBg = () => {
  switch (state.value.style) {
    case 'danger': return 'bg-rose-600 hover:bg-rose-700 focus:ring-rose-500'
    case 'warning': return 'bg-amber-600 hover:bg-amber-700 focus:ring-amber-500'
    case 'info': return 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
    default: return 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
  }
}
</script>

<template>
  <Transition
    enter-active-class="transition duration-200 ease-out"
    enter-from-class="opacity-0"
    enter-to-class="opacity-100"
    leave-active-class="transition duration-150 ease-in"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0"
  >
    <div v-show="state.isOpen" class="fixed inset-0 z-[110] flex items-center justify-center p-4 sm:p-6">
      <div class="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" @click="cancel"></div>

      <Transition
        enter-active-class="transition duration-200 ease-out delay-75"
        enter-from-class="opacity-0 translate-y-4 sm:translate-y-8 sm:scale-95"
        enter-to-class="opacity-100 translate-y-0 sm:scale-100"
        leave-active-class="transition duration-150 ease-in"
        leave-from-class="opacity-100 translate-y-0 sm:scale-100"
        leave-to-class="opacity-0 translate-y-4 sm:translate-y-8 sm:scale-95"
      >
        <div
          v-if="state.isOpen"
          ref="dialogRef"
          class="relative w-full max-w-sm rounded-2xl bg-white shadow-xl flex flex-col p-6 overflow-hidden"
        >
          <div class="sm:flex sm:items-start">
            <div :class="['mx-auto flex h-12 w-12 shrink-0 items-center justify-center rounded-full sm:mx-0 sm:h-10 sm:w-10', getIconBg()]">
              <component :is="getIcon()" class="h-6 w-6 sm:h-5 sm:w-5" />
            </div>
            <div class="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
              <h3 class="text-lg font-semibold leading-6 text-slate-900">
                {{ state.title }}
              </h3>
              <div class="mt-2 text-sm text-slate-500">
                <p>{{ state.message }}</p>
              </div>
            </div>
          </div>
          <div class="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse gap-3">
            <button
              type="button"
              :class="['w-full sm:w-auto inline-flex justify-center rounded-xl px-4 py-2 text-sm font-semibold text-white shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors', getConfirmBg()]"
              @click="confirm"
            >
              {{ state.confirmText || 'Ya, Lanjutkan' }}
            </button>
            <button
              type="button"
              class="mt-3 sm:mt-0 w-full sm:w-auto inline-flex justify-center rounded-xl bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm ring-1 ring-inset ring-slate-300 hover:bg-slate-50 transition-colors"
              @click="cancel"
            >
              {{ state.cancelText || 'Batal' }}
            </button>
          </div>
        </div>
      </Transition>
    </div>
  </Transition>
</template>

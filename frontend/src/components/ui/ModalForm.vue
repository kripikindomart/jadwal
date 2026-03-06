<script setup lang="ts">
import { onMounted, onUnmounted, watch } from 'vue'
import { X } from 'lucide-vue-next'

const props = defineProps<{
  modelValue: boolean
  title: string
  loading?: boolean
  submitText?: string
  maxWidth?: string
}>()

const emit = defineEmits(['update:modelValue', 'submit'])

function close() {
  emit('update:modelValue', false)
}

function handleEscape(e: KeyboardEvent) {
  if (e.key === 'Escape' && props.modelValue) {
    close()
  }
}

watch(() => props.modelValue, (isOpen) => {
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
    <div v-show="modelValue" class="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <!-- Backdrop -->
      <div class="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" @click="close"></div>

      <!-- Modal Panel -->
      <Transition
        enter-active-class="transition duration-200 ease-out delay-75"
        enter-from-class="opacity-0 translate-y-4 sm:translate-y-8 sm:scale-95"
        enter-to-class="opacity-100 translate-y-0 sm:scale-100"
        leave-active-class="transition duration-150 ease-in"
        leave-from-class="opacity-100 translate-y-0 sm:scale-100"
        leave-to-class="opacity-0 translate-y-4 sm:translate-y-8 sm:scale-95"
      >
        <div
          v-show="modelValue"
          ref="dialogRef"
          :class="['relative w-full rounded-2xl bg-white shadow-xl flex flex-col max-h-[90vh]', maxWidth || 'max-w-lg']"
        >
          <!-- Header -->
          <div class="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <h3 class="text-lg font-semibold text-slate-800">{{ title }}</h3>
            <button
              @click="close"
              class="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
            >
              <X class="h-5 w-5" />
            </button>
          </div>

          <!-- Body -->
          <div class="overflow-y-auto px-6 py-4">
            <slot></slot>
          </div>

          <!-- Footer -->
          <div class="border-t border-slate-100 bg-slate-50 px-6 py-4 rounded-b-2xl flex justify-end gap-3">
            <button
              type="button"
              @click="close"
              class="rounded-xl px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 transition-colors"
              :disabled="loading"
            >
              Batal
            </button>
            <button
              type="button"
              @click="emit('submit')"
              class="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
              :disabled="loading"
            >
              <span v-if="loading" class="flex items-center gap-2">
                <svg class="h-4 w-4 animate-spin" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Menyimpan...
              </span>
              <span v-else>{{ submitText || 'Simpan' }}</span>
            </button>
          </div>
        </div>
      </Transition>
    </div>
  </Transition>
</template>

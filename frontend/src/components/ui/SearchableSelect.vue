<script setup lang="ts">
import { ref, computed } from 'vue'
import { onClickOutside } from '@vueuse/core'
import { ChevronDown, Search, Check, X } from 'lucide-vue-next'

const props = defineProps<{
  modelValue: any
  options: { label: string; value: any; searchText?: string }[]
  placeholder?: string
  disabled?: boolean
  required?: boolean
  clearable?: boolean
}>()

const emit = defineEmits(['update:modelValue', 'change'])

const isOpen = ref(false)
const searchQuery = ref('')
const containerRef = ref<HTMLElement | null>(null)

onClickOutside(containerRef, () => {
  isOpen.value = false
})

const filteredOptions = computed(() => {
  if (!searchQuery.value) return props.options
  const query = searchQuery.value.toLowerCase()
  return props.options.filter(opt =>
    opt.label.toLowerCase().includes(query) ||
    (opt.searchText && opt.searchText.toLowerCase().includes(query))
  )
})

const selectedOption = computed(() => {
  return props.options.find(opt => opt.value === props.modelValue)
})

function toggleDropdown() {
  if (props.disabled) return
  isOpen.value = !isOpen.value
  if (isOpen.value) {
    searchQuery.value = ''
    // Focus search input on next tick
    setTimeout(() => {
      const searchInput = containerRef.value?.querySelector('input')
      if (searchInput) searchInput.focus()
    }, 50)
  }
}

function selectOption(value: any) {
  emit('update:modelValue', value)
  emit('change', value)
  isOpen.value = false
}

function clearSelection(e: Event) {
  e.stopPropagation()
  emit('update:modelValue', '')
  emit('change', '')
}
</script>

<template>
  <div ref="containerRef" class="relative w-full">
    <!-- Trigger -->
    <div
      @click="toggleDropdown"
      :class="[
        'flex w-full items-center justify-between rounded-xl border bg-white px-3 py-2 text-sm transition-all',
        disabled ? 'cursor-not-allowed bg-slate-50 opacity-60' : 'cursor-pointer hover:border-emerald-400',
        isOpen ? 'border-emerald-500 ring-2 ring-emerald-500/20' : 'border-slate-300',
      ]"
    >
      <div class="flex-1 truncate truncate max-w-[calc(100%-24px)] text-left">
        <span v-if="selectedOption" class="text-slate-900">{{ selectedOption.label }}</span>
        <span v-else class="text-slate-400">{{ placeholder || 'Pilih...' }}</span>
      </div>
      <div class="flex items-center gap-1 shrink-0">
        <button
          v-if="clearable && modelValue && !disabled"
          @click="clearSelection"
          class="p-0.5 text-slate-400 hover:text-rose-500 rounded-full hover:bg-slate-100 transition-colors"
          type="button"
        >
          <X class="h-3.5 w-3.5" />
        </button>
        <ChevronDown
          :class="[
            'h-4 w-4 text-slate-400 transition-transform duration-200',
            isOpen ? 'rotate-180' : ''
          ]"
        />
      </div>
    </div>

    <!-- Dropdown Menu -->
    <Transition
      enter-active-class="transition duration-100 ease-out"
      enter-from-class="opacity-0 -translate-y-2 scale-95"
      enter-to-class="opacity-100 translate-y-0 scale-100"
      leave-active-class="transition duration-75 ease-in"
      leave-from-class="opacity-100 translate-y-0 scale-100"
      leave-to-class="opacity-0 -translate-y-2 scale-95"
    >
      <div
        v-if="isOpen"
        class="absolute z-50 mt-1 w-full rounded-xl border border-slate-200 bg-white p-1 shadow-lg"
      >
        <!-- Search Input -->
        <div class="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 mb-1 border border-slate-100">
          <Search class="h-4 w-4 text-slate-400 shrink-0" />
          <input
            v-model="searchQuery"
            type="text"
            class="w-full bg-transparent text-sm focus:outline-none text-slate-700 placeholder:text-slate-400"
            placeholder="Cari..."
            @keydown.esc="isOpen = false"
          />
        </div>

        <!-- Options List -->
        <div class="max-h-60 overflow-y-auto pr-1 custom-scrollbar">
          <div
            v-if="filteredOptions.length === 0"
            class="px-3 py-4 text-center text-sm text-slate-500"
          >
            Tidak ada yang cocok
          </div>
          <button
            v-for="option in filteredOptions"
            :key="option.value"
            @click="selectOption(option.value)"
            type="button"
            :class="[
              'flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm text-left transition-colors',
              option.value === modelValue
                ? 'bg-emerald-50 text-emerald-700 font-medium'
                : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900',
            ]"
          >
            <span class="truncate">{{ option.label }}</span>
            <Check
              v-if="option.value === modelValue"
              class="h-4 w-4 text-emerald-600 shrink-0"
            />
          </button>
        </div>
      </div>
    </Transition>
    
    <!-- Hidden input for required validation if needed -->
    <select v-if="required" :value="modelValue" required class="absolute bottom-0 left-1/2 -z-10 h-0 w-0 opacity-0 pointer-events-none">
      <option value="" disabled></option>
      <option v-for="opt in options" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
    </select>
  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 4px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 4px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}
</style>

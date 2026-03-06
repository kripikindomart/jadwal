<script setup lang="ts">
import { computed, ref } from 'vue'
import { Search, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, LayoutTemplate } from 'lucide-vue-next'

export interface Column {
  key: string
  label: string
  sortable?: boolean
  align?: 'left' | 'center' | 'right'
}

const props = defineProps<{
  columns: Column[]
  data: any[]
  loading?: boolean
  selectable?: boolean
  modelValue?: any[] // selected ids or rows
  itemKey?: string // e.g., 'id'
  
  // Search
  searchPlaceholder?: string
  searchValue?: string
  
  // Pagination
  page?: number
  perPage?: number
  total?: number

  // Tabs
  tabs?: { value: string; label: string; icon?: any }[]
  activeTab?: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: any[]): void
  (e: 'update:searchValue', value: string): void
  (e: 'search', value: string): void
  (e: 'sort', key: string, direction: 'asc' | 'desc' | null): void
  (e: 'page-change', page: number): void
  (e: 'per-page-change', perPage: number): void
  (e: 'tab-change', tab: string): void
}>()

const sortKey = ref<string | null>(null)
const sortDirection = ref<'asc' | 'desc' | null>(null)

function handleSort(col: Column) {
  if (!col.sortable) return

  if (sortKey.value !== col.key) {
    sortKey.value = col.key
    sortDirection.value = 'asc'
  } else if (sortDirection.value === 'asc') {
    sortDirection.value = 'desc'
  } else {
    sortKey.value = null
    sortDirection.value = null
  }

  emit('sort', sortKey.value as string, sortDirection.value)
}

// Selection logic
const selectedItems = computed({
  get: () => props.modelValue || [],
  set: (val) => emit('update:modelValue', val)
})

const isAllSelected = computed(() => {
  if (props.data.length === 0) return false
  const dataKeys = props.data.map(item => item[props.itemKey || 'id'])
  return dataKeys.every(k => selectedItems.value.includes(k))
})

const isIndeterminate = computed(() => {
  if (props.data.length === 0) return false
  const dataKeys = props.data.map(item => item[props.itemKey || 'id'])
  const selectedCount = dataKeys.filter(k => selectedItems.value.includes(k)).length
  return selectedCount > 0 && selectedCount < dataKeys.length
})

function toggleSelectAll() {
  const dataKeys = props.data.map(item => item[props.itemKey || 'id'])
  if (isAllSelected.value) {
    // deselect all on current page
    selectedItems.value = selectedItems.value.filter(k => !dataKeys.includes(k))
  } else {
    // select all on current page
    const newSelected = [...selectedItems.value]
    dataKeys.forEach(k => {
      if (!newSelected.includes(k)) newSelected.push(k)
    })
    selectedItems.value = newSelected
  }
}

function toggleSelectRow(item: any) {
  const key = item[props.itemKey || 'id']
  const index = selectedItems.value.indexOf(key)
  if (index === -1) {
    selectedItems.value = [...selectedItems.value, key]
  } else {
    const newSelected = [...selectedItems.value]
    newSelected.splice(index, 1)
    selectedItems.value = newSelected
  }
}

// Local search
const localSearch = ref(props.searchValue || '')
let searchTimeout: any = null

function handleSearchInput(e: Event) {
  const val = (e.target as HTMLInputElement).value
  localSearch.value = val
  emit('update:searchValue', val)
  
  if (searchTimeout) clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    emit('search', val)
  }, 500)
}

// Pagination logic
const totalPages = computed(() => {
  if (!props.total || !props.perPage) return 1
  return Math.ceil(props.total / props.perPage)
})

function goToPage(p: number) {
  if (p < 1 || p > totalPages.value) return
  emit('page-change', p)
}

const pageNumbers = computed(() => {
  const p = props.page || 1
  const tp = totalPages.value
  const pages: (number | string)[] = []
  
  if (tp <= 5) {
    for (let i = 1; i <= tp; i++) pages.push(i)
  } else {
    if (p <= 3) {
      pages.push(1, 2, 3, 4, '...', tp)
    } else if (p >= tp - 2) {
      pages.push(1, '...', tp - 3, tp - 2, tp - 1, tp)
    } else {
      pages.push(1, '...', p - 1, p, p + 1, '...', tp)
    }
  }
  return pages
})
</script>

<template>
  <div class="space-y-4">
    <!-- Tabs -->
    <div v-if="tabs && tabs.length > 0" class="flex gap-1 rounded-xl bg-slate-100/50 p-1 mb-4 border border-slate-200">
      <button
        v-for="tab in tabs"
        :key="tab.value"
        @click="emit('tab-change', tab.value)"
        :class="[
          'flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition-all',
          activeTab === tab.value
            ? 'bg-white text-emerald-700 shadow-sm ring-1 ring-slate-900/5'
            : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
        ]"
      >
        <component v-if="tab.icon" :is="tab.icon" class="h-4 w-4" />
        {{ tab.label }}
      </button>
    </div>

    <!-- Toolbar -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div v-if="searchPlaceholder !== undefined" class="relative w-full sm:max-w-xs">
        <Search class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          :value="localSearch"
          @input="handleSearchInput"
          type="text"
          :placeholder="searchPlaceholder || 'Cari...'"
          class="w-full rounded-xl border border-slate-300 bg-white pl-10 pr-4 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
        />
      </div>
      <div class="flex items-center gap-2">
        <slot name="toolbar-right"></slot>
      </div>
    </div>

    <!-- Bulk Action Bar -->
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0 -translate-y-2"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 -translate-y-2"
    >
      <div v-if="selectedItems.length > 0" class="flex items-center justify-between rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 shadow-sm">
        <span class="text-sm font-medium text-emerald-800">
          {{ selectedItems.length }} item dipilih
        </span>
        <div class="flex items-center gap-2 flex-wrap">
          <slot name="bulk-actions" :selected="selectedItems"></slot>
        </div>
      </div>
    </Transition>

    <!-- Table Container -->
    <div class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div class="overflow-x-auto">
        <table class="w-full text-left text-sm text-slate-600">
          <thead class="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500">
            <tr>
              <th v-if="selectable" class="w-12 px-4 py-3 text-center">
                <input
                  type="checkbox"
                  :checked="isAllSelected"
                  :indeterminate="isIndeterminate"
                  @change="toggleSelectAll"
                  class="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
              </th>
              <th
                v-for="col in columns"
                :key="col.key"
                class="px-4 py-3 font-semibold tracking-wider"
                :class="[
                  col.sortable ? 'cursor-pointer select-none hover:bg-slate-100 transition-colors' : '',
                  col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : 'text-left'
                ]"
                @click="handleSort(col)"
              >
                <div class="flex items-center gap-1" :class="{ 'justify-center': col.align === 'center', 'justify-end': col.align === 'right' }">
                  {{ col.label }}
                  <span v-if="col.sortable" class="inline-flex flex-col opacity-50">
                    <ChevronUp
                      class="h-2.5 w-2.5 -mb-0.5"
                      :class="{ 'opacity-100 text-emerald-600': sortKey === col.key && sortDirection === 'asc' }"
                    />
                    <ChevronDown
                      class="h-2.5 w-2.5"
                      :class="{ 'opacity-100 text-emerald-600': sortKey === col.key && sortDirection === 'desc' }"
                    />
                  </span>
                </div>
              </th>
              <th v-if="$slots.actions" class="px-4 py-3 text-right font-semibold tracking-wider">
                Aksi
              </th>
            </tr>
          </thead>
          
          <tbody class="divide-y divide-slate-100">
            <!-- Loading State -->
            <tr v-if="loading">
              <td :colspan="(selectable ? 1 : 0) + columns.length + ($slots.actions ? 1 : 0)" class="px-4 py-8">
                <div class="flex flex-col items-center justify-center space-y-3 text-slate-400">
                  <svg class="h-6 w-6 animate-spin text-emerald-500" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span class="text-sm font-medium">Memuat data...</span>
                </div>
              </td>
            </tr>

            <!-- Empty State -->
            <tr v-else-if="data.length === 0">
              <td :colspan="(selectable ? 1 : 0) + columns.length + ($slots.actions ? 1 : 0)" class="px-4 py-12 text-center">
                <div class="flex flex-col items-center justify-center text-slate-400">
                  <LayoutTemplate class="h-10 w-10 mb-3 text-slate-300" />
                  <p class="text-base font-medium text-slate-600">Tidak ada data</p>
                  <p class="text-sm">Data yang Anda cari tidak ditemukan.</p>
                </div>
              </td>
            </tr>

            <!-- Data Rows -->
            <template v-else>
              <tr
                v-for="(item, index) in data"
                :key="item[itemKey || 'id'] || index"
                class="hover:bg-slate-50/50 transition-colors group"
                :class="{ 'bg-emerald-50/30': selectable && selectedItems.includes(item[itemKey || 'id']) }"
              >
                <td v-if="selectable" class="w-12 px-4 py-3 text-center">
                  <input
                    type="checkbox"
                    :checked="selectedItems.includes(item[itemKey || 'id'])"
                    @change="toggleSelectRow(item)"
                    class="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                  />
                </td>
                
                <td
                  v-for="col in columns"
                  :key="col.key"
                  class="px-4 py-3 whitespace-nowrap"
                  :class="[col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : 'text-left']"
                >
                  <slot :name="`cell(${col.key})`" :item="item" :index="index" :value="item[col.key]">
                    {{ item[col.key] }}
                  </slot>
                </td>
                
                <td v-if="$slots.actions" class="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                  <slot name="actions" :item="item"></slot>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>

      <!-- Pagination Footer -->
      <div v-if="total && total > 0" class="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-4 py-3 sm:px-6">
        <div class="flex flex-1 items-center justify-between sm:hidden">
          <button
            @click="goToPage(page! - 1)"
            :disabled="page === 1"
            class="relative inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Sebelumnya
          </button>
          <button
            @click="goToPage(page! + 1)"
            :disabled="page === totalPages"
            class="relative ml-3 inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Selanjutnya
          </button>
        </div>
        <div class="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
          <div class="flex items-center gap-4">
            <select
              v-if="perPage"
              :value="perPage"
              @change="$emit('per-page-change', Number(($event.target as HTMLSelectElement).value))"
              class="text-sm border border-slate-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            >
              <option :value="10">10 / halaman</option>
              <option :value="25">25 / halaman</option>
              <option :value="50">50 / halaman</option>
              <option :value="100">100 / halaman</option>
            </select>
            <p class="text-sm text-slate-600">
              Menampilkan <span class="font-semibold text-slate-900">{{ ((page! - 1) * perPage!) + 1 }}</span> s/d
              <span class="font-semibold text-slate-900">{{ Math.min(page! * perPage!, total) }}</span> dari
              <span class="font-semibold text-slate-900">{{ total }}</span> entri
            </p>
          </div>
          <div>
            <nav class="isolate inline-flex -space-x-px rounded-lg shadow-sm" aria-label="Pagination">
              <button
                @click="goToPage(page! - 1)"
                :disabled="page === 1"
                class="relative inline-flex items-center rounded-l-lg px-2 py-2 text-slate-400 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
              >
                <span class="sr-only">Previous</span>
                <ChevronLeft class="h-4 w-4" aria-hidden="true" />
              </button>
              
              <template v-for="(p, i) in pageNumbers" :key="i">
                <span v-if="p === '...'" class="relative inline-flex items-center px-3 py-2 text-sm font-medium text-slate-700 ring-1 ring-inset ring-slate-300">...</span>
                <button
                  v-else
                  @click="goToPage(p as number)"
                  :aria-current="p === page ? 'page' : undefined"
                  :class="[
                    p === page
                      ? 'relative z-10 inline-flex items-center bg-emerald-600 px-3 py-2 text-sm font-semibold text-white focus:z-20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600'
                      : 'relative inline-flex items-center px-3 py-2 text-sm font-medium text-slate-900 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 focus:z-20 focus:outline-offset-0'
                  ]"
                >
                  {{ p }}
                </button>
              </template>

              <button
                @click="goToPage(page! + 1)"
                :disabled="page === totalPages"
                class="relative inline-flex items-center rounded-r-lg px-2 py-2 text-slate-400 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
              >
                <span class="sr-only">Next</span>
                <ChevronRight class="h-4 w-4" aria-hidden="true" />
              </button>
            </nav>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

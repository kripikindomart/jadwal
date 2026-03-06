<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import api from '@/lib/api'
import { useToast } from '@/composables/useToast'
import { useConfirm } from '@/composables/useConfirm'
import { Clock, Plus, Edit2, Trash2, RotateCcw, AlertTriangle, LayoutList } from 'lucide-vue-next'
import DataTable, { type Column } from '@/components/ui/DataTable.vue'
import ModalForm from '@/components/ui/ModalForm.vue'
import SearchableSelect from '@/components/ui/SearchableSelect.vue'

const toast = useToast()
const confirm = useConfirm()

// State
const items = ref<any[]>([])
const loading = ref(false)
const total = ref(0)
const page = ref(1)
const perPage = ref(10)
const search = ref('')
const sortKey = ref('dayOfWeek')
const sortOrder = ref<'asc' | 'desc'>('asc')
const selectedIds = ref<number[]>([])

const statusTab = ref('active')
const tabs = [
  { value: 'active', label: 'Data Aktif', icon: LayoutList },
  { value: 'trash', label: 'Tempat Sampah', icon: Trash2 },
]

const columns: Column[] = [
  { key: 'dayOfWeek', label: 'Hari', sortable: true },
  { key: 'time', label: 'Waktu' },
  { key: 'isUsable', label: 'Status Penggunaan', align: 'center' },
]

// Mapping Hari
const daysOfWeek = [
  { value: 1, label: 'Senin' },
  { value: 2, label: 'Selasa' },
  { value: 3, label: 'Rabu' },
  { value: 4, label: 'Kamis' },
  { value: 5, label: 'Jumat' },
  { value: 6, label: 'Sabtu' },
  { value: 0, label: 'Minggu' },
]

function getDayName(day: number) {
  return daysOfWeek.find(d => d.value === day)?.label || 'Tidak Diketahui'
}

// Modal Form State
const isModalOpen = ref(false)
const isSubmitting = ref(false)
const editingId = ref<number | null>(null)
const form = ref({
  dayOfWeek: 1,
  startTime: '07:00',
  endTime: '08:40',
  isUsable: true,
})

async function fetchData(p = page.value) {
  loading.value = true
  try {
    const { data } = await api.get('/timeslots', {
      params: {
        page: p,
        perPage: perPage.value,
        search: search.value,
        sortKey: sortKey.value,
        sortOrder: sortOrder.value,
        status: statusTab.value,
      }
    })
    items.value = data.data
    total.value = data.meta.total
    page.value = p
  } catch (err: any) {
    toast.error('Gagal', err.response?.data?.message || err.message)
  } finally {
    loading.value = false
  }
}

onMounted(fetchData)

watch(statusTab, () => fetchData(1))

function handleSort(key: string, order: 'asc' | 'desc' | null) {
  sortKey.value = key
  sortOrder.value = order || 'asc'
  fetchData(1)
}

function handlePageChange(p: number) {
  fetchData(p)
}

function handlePerPageChange(pp: number) {
  perPage.value = pp
  fetchData(1)
}

function openCreate() {
  editingId.value = null
  form.value = { dayOfWeek: 1, startTime: '07:00', endTime: '08:40', isUsable: true }
  isModalOpen.value = true
}

function openEdit(item: any) {
  editingId.value = item.id
  form.value = {
    dayOfWeek: item.dayOfWeek,
    startTime: item.startTime.substring(0, 5), // Format HH:mm
    endTime: item.endTime.substring(0, 5),
    isUsable: item.isUsable,
  }
  isModalOpen.value = true
}

async function handleSubmit() {
  isSubmitting.value = true
  try {
    const payload = {
      ...form.value,
      startTime: form.value.startTime + ':00',
      endTime: form.value.endTime + ':00',
    }

    if (editingId.value) {
      await api.patch(`/timeslots/${editingId.value}`, payload)
      toast.success('Berhasil', 'Slot Waktu diperbarui.')
    } else {
      await api.post('/timeslots', payload)
      toast.success('Berhasil', 'Slot Waktu ditambahkan.')
    }
    isModalOpen.value = false
    fetchData()
  } catch (err: any) {
    toast.error('Gagal', err.response?.data?.message || err.message)
  } finally {
    isSubmitting.value = false
  }
}

async function handleDelete(item: any) {
  confirm.requireConfirm({
    title: 'Hapus Slot Waktu',
    message: `Yakin ingin menghapus ${getDayName(item.dayOfWeek)} ${item.startTime}?`,
    confirmText: 'Hapus',
    style: 'danger',
    onConfirm: async () => {
      try {
        await api.delete(`/timeslots/${item.id}`)
        toast.success('Berhasil', 'Dipindahkan ke tempat sampah.')
        fetchData()
      } catch (err: any) {
        toast.error('Gagal', err.response?.data?.message || err.message)
      }
    }
  })
}

async function handleRestore(item: any) {
  try {
    await api.patch(`/timeslots/${item.id}/restore`)
    toast.success('Berhasil', 'Data dipulihkan.')
    fetchData()
  } catch (err: any) {
    toast.error('Gagal', err.response?.data?.message || err.message)
  }
}

async function handleForceDelete(item: any) {
  confirm.requireConfirm({
    title: 'Hapus Permanen',
    message: 'Data akan hilang permanen. Lanjutkan?',
    confirmText: 'Hapus',
    style: 'danger',
    onConfirm: async () => {
      try {
        await api.delete(`/timeslots/${item.id}/force`)
        toast.success('Berhasil', 'Data dihapus permanen.')
        fetchData()
      } catch (err: any) {
        toast.error('Gagal', err.response?.data?.message || err.message)
      }
    }
  })
}

async function handleBulkAction(action: string) {
  if (!selectedIds.value.length) return
  try {
    await api.post('/timeslots/bulk', { ids: selectedIds.value, action })
    toast.success('Berhasil', `${selectedIds.value.length} data diproses.`)
    selectedIds.value = []
    fetchData()
  } catch (err: any) {
    toast.error('Gagal', err.response?.data?.message || err.message)
  }
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <Clock class="w-7 h-7 text-emerald-600" />
          Master Slot Waktu
        </h1>
        <p class="text-sm text-slate-500 mt-1">Kelola jam operasional perkuliahan per hari.</p>
      </div>
      <div>
        <button @click="openCreate"
          class="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-emerald-600 rounded-lg shadow-sm hover:bg-emerald-700 transition-colors">
          <Plus class="w-4 h-4" /> Tambah Slot
        </button>
      </div>
    </div>

    <!-- Tabs -->
    <div class="flex gap-1 p-1 bg-slate-100 rounded-lg w-fit">
      <button v-for="tab in tabs" :key="tab.value" @click="statusTab = tab.value"
        class="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-md transition-colors"
        :class="statusTab === tab.value ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'">
        <component :is="tab.icon" class="w-4 h-4" />
        {{ tab.label }}
      </button>
    </div>

    <!-- Table -->
    <DataTable
      :columns="columns"
      :data="items"
      :loading="loading"
      :total="total"
      :page="page"
      :per-page="perPage"
      :sort-key="sortKey"
      :sort-order="sortOrder"
      v-model="selectedIds"
      selectable
      @sort="handleSort"
      @page-change="handlePageChange"
      @per-page-change="handlePerPageChange"
    >
      <template #cell(dayOfWeek)="{ item }">
        <span class="font-semibold text-slate-800">{{ getDayName(item.dayOfWeek) }}</span>
      </template>

      <template #cell(time)="{ item }">
        <span class="font-mono text-sm bg-slate-100 px-2 py-1 rounded-md text-slate-700">
          {{ item.startTime.substring(0, 5) }} - {{ item.endTime.substring(0, 5) }}
        </span>
      </template>

      <template #cell(isUsable)="{ item }">
        <span v-if="item.isUsable" class="text-[11px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold uppercase tracking-wide">Dapat Digunakan</span>
        <span v-else class="text-[11px] px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 font-semibold uppercase tracking-wide">Tidak Digunakan</span>
      </template>

      <template #actions="{ item }">
        <div class="flex gap-1 justify-end">
          <template v-if="statusTab === 'active'">
            <button @click="openEdit(item)" class="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" title="Edit">
              <Edit2 class="w-4 h-4" />
            </button>
            <button @click="handleDelete(item)" class="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors" title="Hapus">
              <Trash2 class="w-4 h-4" />
            </button>
          </template>
          <template v-else>
            <button @click="handleRestore(item)" class="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" title="Pulihkan">
              <RotateCcw class="w-4 h-4" />
            </button>
            <button @click="handleForceDelete(item)" class="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors" title="Hapus Permanen">
              <AlertTriangle class="w-4 h-4" />
            </button>
          </template>
        </div>
      </template>

      <template #bulk-actions>
        <template v-if="statusTab === 'active'">
          <button @click="handleBulkAction('active')" class="inline-flex items-center px-3 py-1.5 text-xs font-semibold rounded-lg bg-white border border-slate-200 text-emerald-600 hover:bg-emerald-50 hover:border-emerald-200 transition-colors mr-2">
            Tandai Dapat Digunakan
          </button>
          <button @click="handleBulkAction('inactive')" class="inline-flex items-center px-3 py-1.5 text-xs font-semibold rounded-lg bg-white border border-slate-200 text-amber-600 hover:bg-amber-50 hover:border-amber-200 transition-colors mr-2">
            Tandai Tidak Digunakan
          </button>
          <button @click="handleBulkAction('trash')" class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-rose-700 bg-rose-50 rounded-lg hover:bg-rose-100 transition-colors">
            <Trash2 class="w-3.5 h-3.5" /> Hapus Terpilih
          </button>
        </template>
        <template v-else>
          <button @click="handleBulkAction('restore')" class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors mr-2">
            <RotateCcw class="w-3.5 h-3.5" /> Pulihkan Terpilih
          </button>
          <button @click="handleBulkAction('forceDelete')" class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-rose-700 bg-rose-50 rounded-lg hover:bg-rose-100 transition-colors">
            <AlertTriangle class="w-3.5 h-3.5" /> Hapus Permanen
          </button>
        </template>
      </template>
    </DataTable>

    <!-- Modal Form -->
    <ModalForm
      v-model="isModalOpen"
      :title="editingId ? 'Edit Slot Waktu' : 'Tambah Slot Waktu'"
      :loading="isSubmitting"
      @submit="handleSubmit"
    >
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-slate-700 mb-1">Hari</label>
          <SearchableSelect
            v-model="form.dayOfWeek"
            :options="daysOfWeek"
            placeholder="Pilih Hari"
            required
          />
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1">Waktu Mulai</label>
            <input v-model="form.startTime" type="time" required
              class="w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1">Waktu Selesai</label>
            <input v-model="form.endTime" type="time" required
              class="w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
          </div>
        </div>

        <div>
          <label class="flex items-center gap-2 cursor-pointer mt-4">
            <input v-model="form.isUsable" type="checkbox" class="rounded border-slate-300 text-emerald-600 focus:ring-emerald-600" />
            <span class="text-sm font-medium text-slate-700">Dapat digunakan untuk penjadwalan</span>
          </label>
        </div>
      </div>
    </ModalForm>
  </div>
</template>

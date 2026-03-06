<script setup lang="ts">
import { ref, onMounted } from 'vue'
import api from '@/lib/api'
import { useToast } from '@/composables/useToast'
import { useConfirm } from '@/composables/useConfirm'
import DataTable, { type Column } from '@/components/ui/DataTable.vue'
import ModalForm from '@/components/ui/ModalForm.vue'
import StatusBadge from '@/components/ui/StatusBadge.vue'
import StatsCard from '@/components/ui/StatsCard.vue'
import { Plus, Edit2, Trash2, CheckCircle2, XCircle, RotateCcw, AlertTriangle, MapPin, Archive, LayoutList } from 'lucide-vue-next'

const toast = useToast()
const confirm = useConfirm()

// State
const items = ref<any[]>([])
const loading = ref(false)
const total = ref(0)
const page = ref(1)
const perPage = ref(10)
const search = ref('')
const sortKey = ref('name')
const sortOrder = ref<'asc' | 'desc'>('asc')
const selectedIds = ref<number[]>([])

const statusTab = ref('active')
const tabs = [
  { value: 'active', label: 'Data Aktif', icon: LayoutList },
  { value: 'trash', label: 'Tempat Sampah', icon: Trash2 },
]

const columns: Column[] = [
  { key: 'name', label: 'Nama Ruangan', sortable: true },
  { key: 'capacity', label: 'Kapasitas', sortable: true, align: 'center' },
  { key: 'location', label: 'Lokasi/Gedung' },
  { key: 'isUsable', label: 'Status', align: 'center' },
]

// Modal Form State
const isModalOpen = ref(false)
const isSubmitting = ref(false)
const editingId = ref<number | null>(null)
const form = ref({
  name: '',
  capacity: 30,
  location: '',
  isUsable: true
})

async function fetchData(p = page.value) {
  try {
    loading.value = true
    page.value = p
    const { data } = await api.get('/rooms', {
      params: {
        page: p,
        perPage: perPage.value,
        search: search.value,
        sortKey: sortKey.value,
        sortOrder: sortOrder.value,
        status: statusTab.value
      }
    })
    items.value = data.data
    total.value = data.meta.total
  } catch (err: any) {
    toast.error('Gagal mengambil data', err.response?.data?.message || err.message)
  } finally {
    loading.value = false
  }
}

onMounted(() => fetchData())

function handleSort(key: string, dir: 'asc' | 'desc' | null) {
  sortKey.value = key
  sortOrder.value = dir || 'asc'
  fetchData()
}

function handleTabChange(tab: string) {
  statusTab.value = tab
  search.value = ''
  selectedIds.value = []
  page.value = 1
  fetchData(1)
}

// CRUD Actions
function openAddModal() {
  editingId.value = null
  form.value = { name: '', capacity: 30, location: '', isUsable: true }
  isModalOpen.value = true
}

function openEditModal(item: any) {
  editingId.value = item.id
  form.value = {
    name: item.name,
    capacity: item.capacity,
    location: item.location || '',
    isUsable: item.isUsable
  }
  isModalOpen.value = true
}

async function handleSubmit() {
  try {
    isSubmitting.value = true
    const payload = { ...form.value, capacity: +form.value.capacity }
    if (editingId.value) {
      await api.patch(`/rooms/${editingId.value}`, payload)
      toast.success('Berhasil', 'Ruangan berhasil diperbarui')
    } else {
      await api.post('/rooms', payload)
      toast.success('Berhasil', 'Ruangan baru ditambahkan')
    }
    isModalOpen.value = false
    fetchData()
  } catch (err: any) {
    toast.error('Gagal menyimpan', err.response?.data?.message || err.message)
  } finally {
    isSubmitting.value = false
  }
}

function confirmDelete(item: any) {
  confirm.requireConfirm({
    title: statusTab.value === 'trash' ? 'Hapus Permanen?' : 'Hapus Ruangan?',
    message: statusTab.value === 'trash'
      ? `Anda yakin ingin menghapus permanen ${item.name}? Data ini tidak dapat dikembalikan.`
      : `Anda yakin ingin menghapus ${item.name}? Data akan dipindah ke tempat sampah.`,
    style: 'danger',
    confirmText: 'Ya, Hapus',
    onConfirm: async () => {
      try {
        if (statusTab.value === 'trash') {
          await api.delete(`/rooms/${item.id}/force`)
        } else {
          await api.delete(`/rooms/${item.id}`)
        }
        toast.success('Berhasil', 'Data dihapus')
        selectedIds.value = selectedIds.value.filter(id => id !== item.id)
        if (items.value.length === 1 && page.value > 1) page.value--
        fetchData()
      } catch (err: any) {
        toast.error('Gagal menghapus', err.response?.data?.message || err.message)
      }
    }
  })
}

async function restoreItem(item: any) {
  try {
    await api.patch(`/rooms/${item.id}/restore`)
    toast.success('Berhasil', `${item.name} berhasil direstore`)
    selectedIds.value = selectedIds.value.filter(id => id !== item.id)
    if (items.value.length === 1 && page.value > 1) page.value--
    fetchData()
  } catch (err: any) {
    toast.error('Gagal restore', err.response?.data?.message || err.message)
  }
}

// Bulk Actions
async function performBulkAction(action: string) {
  const actionMap: any = {
    trash: { label: 'Hapus ke Tempat Sampah', style: 'danger' },
    delete: { label: 'Hapus Permanen', style: 'danger' },
    restore: { label: 'Restore Data', style: 'info' },
    active: { label: 'Aktifkan (Dapat Dipakai)', style: 'info' },
    inactive: { label: 'Nonaktifkan (Dalam Perbaikan)', style: 'warning' }
  }
  
  const cfg = actionMap[action]
  
  confirm.requireConfirm({
    title: `Bulk ${cfg.label}?`,
    message: `Anda yakin ingin memproses ${selectedIds.value.length} data terpilih?`,
    style: cfg.style,
    onConfirm: async () => {
      try {
        await api.post('/rooms/bulk', {
          ids: selectedIds.value,
          action
        })
        toast.success('Berhasil', `Bulk action sukses`)
        selectedIds.value = []
        fetchData()
      } catch (err: any) {
        toast.error('Gagal bulk action', err.response?.data?.message || err.message)
      }
    }
  })
}
</script>

<template>
  <div class="space-y-6">
    <!-- Page Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold tracking-tight text-slate-900">Ruang Kelas</h1>
        <p class="text-sm text-slate-500 mt-1">Kelola data ruangan untuk plotting jadwal kelas.</p>
      </div>
      <button
        @click="openAddModal"
        class="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 transition-colors"
      >
        <Plus class="h-4 w-4 mr-2" />
        Tambah Ruangan
      </button>
    </div>

    <!-- Stats Cards -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-2">
      <StatsCard
        title="Total Data"
        :value="total"
        :icon="MapPin"
        color="indigo"
      />
      <StatsCard
        title="Fase Data"
        :value="statusTab === 'active' ? 'Aktif' : 'Tempat Sampah'"
        :icon="statusTab === 'active' ? LayoutList : Trash2"
        :color="statusTab === 'active' ? 'emerald' : 'rose'"
      />
      <StatsCard
        title="Item Dipilih"
        :value="selectedIds.length"
        :icon="Archive"
        color="amber"
      />
    </div>

    <!-- Data Table -->
    <DataTable
      :tabs="tabs"
      :activeTab="statusTab"
      @tab-change="handleTabChange"
      :columns="columns"
      :data="items"
      :loading="loading"
      selectable
      v-model="selectedIds"
      searchPlaceholder="Cari nama ruangan..."
      v-model:search-value="search"
      @search="fetchData(1)"
      @sort="handleSort"
      :page="page"
      :per-page="perPage"
      :total="total"
      @page-change="fetchData"
    >
      <!-- Bulk Actions Slot -->
      <template #bulk-actions>
        <template v-if="statusTab === 'active'">
          <button @click="performBulkAction('active')" class="inline-flex items-center px-3 py-1.5 text-xs font-semibold rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 transition-colors">
            <CheckCircle2 class="h-3.5 w-3.5 mr-1" /> Tersedia
          </button>
          <button @click="performBulkAction('inactive')" class="inline-flex items-center px-3 py-1.5 text-xs font-semibold rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors">
            <XCircle class="h-3.5 w-3.5 mr-1" /> Maintenance
          </button>
          <button @click="performBulkAction('trash')" class="inline-flex items-center px-3 py-1.5 text-xs font-semibold rounded-lg bg-white border border-slate-200 text-rose-600 hover:bg-rose-50 hover:border-rose-200 transition-colors">
            <Trash2 class="h-3.5 w-3.5 mr-1" /> Hapus
          </button>
        </template>
        <template v-else>
          <button @click="performBulkAction('restore')" class="inline-flex items-center px-3 py-1.5 text-xs font-semibold rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition-colors">
            <RotateCcw class="h-3.5 w-3.5 mr-1" /> Restore
          </button>
          <button @click="performBulkAction('delete')" class="inline-flex items-center px-3 py-1.5 text-xs font-semibold rounded-lg bg-white border border-slate-200 text-rose-600 hover:bg-rose-50 hover:border-rose-200 transition-colors">
            <AlertTriangle class="h-3.5 w-3.5 mr-1" /> Hapus Permanen
          </button>
        </template>
      </template>

      <!-- Cell Slots -->
      <template #cell(name)="{ value }">
        <span class="font-semibold text-slate-800">{{ value }}</span>
      </template>
      <template #cell(capacity)="{ value }">
        {{ value }} Kursi
      </template>
      <template #cell(location)="{ value }">
        <span class="text-slate-500">{{ value || '-' }}</span>
      </template>
      <template #cell(isUsable)="{ value }">
        <div class="flex justify-center">
          <StatusBadge :status="value ? 'Tersedia' : 'Perbaikan'" :type="'general'" />
        </div>
      </template>

      <!-- Actions Slot -->
      <template #actions="{ item }">
        <div class="flex items-center justify-end gap-2">
          <template v-if="statusTab === 'active'">
            <button
              @click="openEditModal(item)"
              title="Edit"
              class="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            >
              <Edit2 class="h-4 w-4" />
            </button>
            <button
              @click="confirmDelete(item)"
              title="Hapus"
              class="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
            >
              <Trash2 class="h-4 w-4" />
            </button>
          </template>
          <template v-else>
            <button
              @click="restoreItem(item)"
              title="Restore"
              class="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            >
              <RotateCcw class="h-4 w-4" />
            </button>
            <button
              @click="confirmDelete(item)"
              title="Hapus Permanen"
              class="p-1.5 text-rose-400 hover:text-rose-600 hover:bg-rose-100 rounded-lg transition-colors"
            >
              <AlertTriangle class="h-4 w-4" />
            </button>
          </template>
        </div>
      </template>
    </DataTable>

    <!-- Form Modal -->
    <ModalForm
      v-model="isModalOpen"
      :title="editingId ? 'Edit Ruangan' : 'Tambah Ruangan'"
      :loading="isSubmitting"
      @submit="handleSubmit"
    >
      <div class="space-y-4">
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1">Nama Ruang</label>
            <input
              v-model="form.name"
              type="text"
              required
              placeholder="Misal: R. 301"
              class="w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1">Kapasitas Kursi</label>
            <input
              v-model="form.capacity"
              type="number"
              required
              min="1"
              class="w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>
        </div>
        
        <div>
          <label class="block text-sm font-medium text-slate-700 mb-1">Lokasi/Gedung (Opsional)</label>
          <input
            v-model="form.location"
            type="text"
            placeholder="Misal: Gedung Pascasarjana Lt 3"
            class="w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          />
        </div>

        <div class="flex items-center mt-2">
          <input
            v-model="form.isUsable"
            id="is-usable"
            type="checkbox"
            class="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
          />
          <label for="is-usable" class="ml-2 block text-sm text-slate-700">
            Dapat digunakan untuk perkuliahan (Status Tersedia)
          </label>
        </div>
      </div>
    </ModalForm>
  </div>
</template>

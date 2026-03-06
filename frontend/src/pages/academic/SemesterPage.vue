<script setup lang="ts">
import { ref, onMounted } from 'vue'
import api from '@/lib/api'
import { useToast } from '@/composables/useToast'
import { useConfirm } from '@/composables/useConfirm'
import DataTable, { type Column } from '@/components/ui/DataTable.vue'
import ModalForm from '@/components/ui/ModalForm.vue'
import StatusBadge from '@/components/ui/StatusBadge.vue'
import StatsCard from '@/components/ui/StatsCard.vue'
import { Plus, Edit2, Trash2, CheckCircle2, XCircle, RotateCcw, AlertTriangle, CalendarDays, Archive, LayoutList } from 'lucide-vue-next'

const toast = useToast()
const confirm = useConfirm()

// State
const items = ref<any[]>([])
const loading = ref(false)
const total = ref(0)
const page = ref(1)
const perPage = ref(10)
const sortKey = ref('id')
const sortOrder = ref<'asc' | 'desc'>('desc')
const selectedIds = ref<number[]>([])

const statusTab = ref('active')
const tabs = [
  { value: 'active', label: 'Data Aktif', icon: LayoutList },
  { value: 'trash', label: 'Tempat Sampah', icon: Trash2 },
]

const columns: Column[] = [
  { key: 'code', label: 'Kode', sortable: true },
  { key: 'name', label: 'Nama Periode', sortable: true },
  { key: 'type', label: 'Tipe', sortable: true },
  { key: 'startDate', label: 'Mulai' },
  { key: 'endDate', label: 'Selesai' },
  { key: 'isActive', label: 'Status Aktif', align: 'center' },
]

// Modal Form State
const isModalOpen = ref(false)
const isSubmitting = ref(false)
const editingId = ref<number | null>(null)
const form = ref({
  code: '',
  name: '',
  type: 'Ganjil',
  startDate: '',
  endDate: '',
  isActive: false
})

async function fetchData(p = page.value) {
  try {
    loading.value = true
    page.value = p
    const { data } = await api.get('/semesters', {
      params: {
        page: p,
        perPage: perPage.value,
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

onMounted(() => {
  fetchData()
})

function handleSort(key: string, dir: 'asc' | 'desc' | null) {
  sortKey.value = key
  sortOrder.value = dir || 'asc'
  fetchData()
}

function handleTabChange(tab: string) {
  statusTab.value = tab
  selectedIds.value = []
  page.value = 1
  fetchData(1)
}

// CRUD Actions
function openAddModal() {
  editingId.value = null
  form.value = {
    code: '',
    name: '',
    type: 'Ganjil',
    startDate: '',
    endDate: '',
    isActive: true
  }
  isModalOpen.value = true
}

function openEditModal(item: any) {
  editingId.value = item.id
  form.value = {
    code: item.code,
    name: item.name,
    type: item.type,
    startDate: item.startDate ? new Date(item.startDate).toISOString().substring(0, 10) : '',
    endDate: item.endDate ? new Date(item.endDate).toISOString().substring(0, 10) : '',
    isActive: item.isActive
  }
  isModalOpen.value = true
}

async function handleSubmit() {
  try {
    isSubmitting.value = true
    const payload = { ...form.value }
    if (editingId.value) {
      await api.patch(`/semesters/${editingId.value}`, payload)
      toast.success('Berhasil', 'Periode Akademik berhasil diperbarui')
    } else {
      await api.post('/semesters', payload)
      toast.success('Berhasil', 'Periode Akademik baru ditambahkan')
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
    title: statusTab.value === 'trash' ? 'Hapus Permanen?' : 'Hapus Periode?',
    message: statusTab.value === 'trash'
      ? `Anda yakin ingin menghapus permanen periode ${item.name}? Data ini tidak dapat dikembalikan.`
      : `Anda yakin ingin menghapus periode ${item.name}? Data akan dipindah ke tempat sampah.`,
    style: 'danger',
    confirmText: 'Ya, Hapus',
    onConfirm: async () => {
      try {
        if (statusTab.value === 'trash') {
          await api.delete(`/semesters/${item.id}/force`)
        } else {
          await api.delete(`/semesters/${item.id}`)
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
    await api.patch(`/semesters/${item.id}/restore`)
    toast.success('Berhasil', `Periode ${item.name} berhasil direstore`)
    selectedIds.value = selectedIds.value.filter(id => id !== item.id)
    if (items.value.length === 1 && page.value > 1) page.value--
    fetchData()
  } catch (err: any) {
    toast.error('Gagal restore', err.response?.data?.message || err.message)
  }
}

async function setActive(item: any) {
  try {
    await api.patch(`/semesters/${item.id}/set-active`)
    toast.success('Berhasil', `Periode ${item.name} di set sebagai aktif`)
    fetchData()
  } catch (err: any) {
    toast.error('Gagal', err.response?.data?.message || err.message)
  }
}

// Bulk Actions
async function performBulkAction(action: string) {
  const actionMap: any = {
    trash: { label: 'Hapus ke Tempat Sampah', style: 'danger' },
    delete: { label: 'Hapus Permanen', style: 'danger' },
    restore: { label: 'Restore Data', style: 'info' },
    active: { label: 'Aktifkan', style: 'info' },
    inactive: { label: 'Nonaktifkan', style: 'warning' }
  }

  const cfg = actionMap[action]

  confirm.requireConfirm({
    title: `Bulk ${cfg.label}?`,
    message: `Anda yakin ingin memproses ${selectedIds.value.length} data terpilih?`,
    style: cfg.style,
    onConfirm: async () => {
      try {
        await api.post('/semesters/bulk', {
          ids: selectedIds.value,
          action
        })
        toast.success('Berhasil', `Bulk action ${action} sukses`)
        selectedIds.value = []
        fetchData()
      } catch (err: any) {
        toast.error('Gagal bulk action', err.response?.data?.message || err.message)
      }
    }
  })
}

function formatDate(dateStr: string) {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })
}
</script>

<template>
  <div class="space-y-6">
    <!-- Page Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold tracking-tight text-slate-900">Periode Akademik</h1>
        <p class="text-sm text-slate-500 mt-1">Kelola data sinkronisasi periode akademik terpadu.</p>
      </div>
      <button
        @click="openAddModal"
        class="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 transition-colors"
      >
        <Plus class="h-4 w-4 mr-2" />
        Tambah Periode
      </button>
    </div>

    <!-- Stats Cards -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-2">
      <StatsCard
        title="Total Data"
        :value="total"
        :icon="CalendarDays"
        color="indigo"
      />
      <StatsCard
        title="Fase Data"
        :value="statusTab === 'active' ? 'Aktif' : 'Tempat Sampah'"
        :icon="statusTab === 'active' ? CheckCircle2 : Trash2"
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
            <CheckCircle2 class="h-3.5 w-3.5 mr-1" /> Set Aktif
          </button>
          <button @click="performBulkAction('inactive')" class="inline-flex items-center px-3 py-1.5 text-xs font-semibold rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors">
            <XCircle class="h-3.5 w-3.5 mr-1" /> Set Nonaktif
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
      <template #cell(code)="{ value }">
        <span class="font-bold text-emerald-700">{{ value }}</span>
      </template>
      <template #cell(name)="{ value }">
        <span class="font-medium text-slate-900">{{ value }}</span>
      </template>
      <template #cell(type)="{ value }">
        <span class="capitalize">{{ value }}</span>
      </template>
      <template #cell(startDate)="{ value }">
        {{ formatDate(value) }}
      </template>
      <template #cell(endDate)="{ value }">
        {{ formatDate(value) }}
      </template>
      <template #cell(isActive)="{ value }">
        <div class="flex justify-center">
          <StatusBadge :status="value" type="active-inactive" />
        </div>
      </template>

      <!-- Actions Slot -->
      <template #actions="{ item }">
        <div class="flex items-center justify-end gap-2">
          <template v-if="statusTab === 'active'">
            <button
              v-if="!item.isActive"
              @click="setActive(item)"
              title="Set sebagai aktif"
              class="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
            >
              <CheckCircle2 class="h-4 w-4" />
            </button>
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
      :title="editingId ? 'Edit Periode Akademik' : 'Tambah Periode Akademik'"
      :loading="isSubmitting"
      @submit="handleSubmit"
    >
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-slate-700 mb-1">Kode Periode <span class="text-rose-500">*</span></label>
          <input
            v-model="form.code"
            type="text"
            required
            placeholder="Contoh: 20251"
            class="w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-slate-700 mb-1">Nama Periode <span class="text-rose-500">*</span></label>
          <input
            v-model="form.name"
            type="text"
            required
            placeholder="Contoh: 2025/2026 Ganjil"
            class="w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-slate-700 mb-1">Tipe Semester <span class="text-rose-500">*</span></label>
          <select
            v-model="form.type"
            required
            class="w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          >
            <option value="Ganjil">Ganjil</option>
            <option value="Genap">Genap</option>
            <option value="Antara">Antara (Pendek)</option>
          </select>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1">Tanggal Mulai <span class="text-rose-500">*</span></label>
            <input
              v-model="form.startDate"
              type="date"
              required
              class="w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1">Tanggal Selesai <span class="text-rose-500">*</span></label>
            <input
              v-model="form.endDate"
              type="date"
              required
              class="w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>
        </div>

        <div class="flex items-center mt-2">
          <input
            v-model="form.isActive"
            id="is-active-sem"
            type="checkbox"
            class="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
          />
          <label for="is-active-sem" class="ml-2 block text-sm text-slate-700">
            Set sebagai Periode Aktif saat ini
          </label>
        </div>
      </div>
    </ModalForm>
  </div>
</template>

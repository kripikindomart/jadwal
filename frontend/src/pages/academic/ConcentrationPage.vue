<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import api from '@/lib/api'
import { useToast } from '@/composables/useToast'
import { useConfirm } from '@/composables/useConfirm'
import DataTable, { type Column } from '@/components/ui/DataTable.vue'
import ModalForm from '@/components/ui/ModalForm.vue'
import SearchableSelect from '@/components/ui/SearchableSelect.vue'
import StatsCard from '@/components/ui/StatsCard.vue'
import { Plus, Edit2, Trash2, RotateCcw, AlertTriangle, BookOpen, LayoutList, Archive } from 'lucide-vue-next'

const toast = useToast()
const confirm = useConfirm()

// State
const items = ref<any[]>([])
const prodis = ref<any[]>([])
const loading = ref(false)
const total = ref(0)
const page = ref(1)
const perPage = ref(10)
const search = ref('')
const sortKey = ref('name')
const sortOrder = ref<'asc' | 'desc'>('asc')
const selectedIds = ref<number[]>([])

const filterProdiId = ref<string>('')
const statusTab = ref('active')
const stats = ref({ total: 0, active: 0, trashed: 0 })

const tabs = [
  { value: 'active', label: 'Data Aktif', icon: LayoutList },
  { value: 'trash', label: 'Tempat Sampah', icon: Trash2 },
]

const columns: Column[] = [
  { key: 'prodi', label: 'Program Studi', sortable: true },
  { key: 'code', label: 'Kode', sortable: true },
  { key: 'name', label: 'Nama Konsentrasi', sortable: true },
  { key: 'isActive', label: 'Status', align: 'center' },
]

// Modal Form State
const isModalOpen = ref(false)
const isSubmitting = ref(false)
const editingId = ref<number | null>(null)
const form = ref({
  code: '',
  name: '',
  prodiId: '' as string | number,
  isActive: true,
})

const prodiOptions = computed(() =>
  prodis.value.map(p => ({
    value: p.id,
    label: `${p.degree} ${p.name}`
  }))
)

async function fetchProdis() {
  try {
    const { data } = await api.get('/prodis?perPage=100')
    prodis.value = data.data
  } catch { /* silent */ }
}

async function fetchStats() {
  try {
    const { data } = await api.get('/concentrations/stats')
    stats.value = data
  } catch { /* silent */ }
}

async function fetchData(p = page.value) {
  try {
    loading.value = true
    page.value = p
    const params: any = {
      page: p,
      perPage: perPage.value,
      search: search.value || undefined,
      status: statusTab.value,
    }
    if (filterProdiId.value) params.prodiId = filterProdiId.value
    const { data } = await api.get('/concentrations', { params })
    items.value = data.data
    total.value = data.meta.total
  } catch (err: any) {
    toast.error('Gagal mengambil data', err.response?.data?.message || err.message)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchProdis()
  fetchData()
  fetchStats()
})

watch(statusTab, () => {
  selectedIds.value = []
  fetchData(1)
})

function handleTabChange(tab: string) {
  statusTab.value = tab
  search.value = ''
  selectedIds.value = []
  page.value = 1
  fetchData(1)
}

function handleSort(key: string, dir: 'asc' | 'desc' | null) {
  sortKey.value = key
  sortOrder.value = dir || 'asc'
  fetchData()
}

// CRUD Actions
function openAddModal() {
  editingId.value = null
  form.value = {
    code: '',
    name: '',
    prodiId: filterProdiId.value || (prodis.value[0]?.id || ''),
    isActive: true
  }
  isModalOpen.value = true
}

function openEditModal(item: any) {
  editingId.value = item.id
  form.value = {
    code: item.code || '',
    name: item.name,
    prodiId: item.prodiId,
    isActive: item.isActive
  }
  isModalOpen.value = true
}

async function handleSubmit() {
  try {
    isSubmitting.value = true
    const payload = {
      ...form.value,
      prodiId: +form.value.prodiId,
    }

    if (editingId.value) {
      await api.patch(`/concentrations/${editingId.value}`, payload)
      toast.success('Berhasil', 'Data konsentrasi berhasil diperbarui')
    } else {
      await api.post('/concentrations', payload)
      toast.success('Berhasil', 'Konsentrasi baru berhasil ditambahkan')
    }

    isModalOpen.value = false
    fetchData()
    fetchStats()
  } catch (err: any) {
    toast.error('Gagal menyimpan', err.response?.data?.message || err.message)
  } finally {
    isSubmitting.value = false
  }
}

function confirmDelete(item: any) {
  confirm.requireConfirm({
    title: statusTab.value === 'trash' ? 'Hapus Permanen?' : 'Hapus Konsentrasi?',
    message: statusTab.value === 'trash'
      ? `Anda yakin ingin menghapus permanen "${item.name}"? Data ini tidak dapat dikembalikan.`
      : `Anda yakin ingin menghapus "${item.name}"? Data akan dipindah ke tempat sampah.`,
    style: 'danger',
    confirmText: 'Ya, Hapus',
    onConfirm: async () => {
      try {
        if (statusTab.value === 'trash') {
          await api.delete(`/concentrations/${item.id}/force`)
        } else {
          await api.delete(`/concentrations/${item.id}`)
        }
        toast.success('Berhasil', 'Data dihapus')
        selectedIds.value = selectedIds.value.filter(id => id !== item.id)
        if (items.value.length === 1 && page.value > 1) page.value--
        fetchData()
        fetchStats()
      } catch (err: any) {
        toast.error('Gagal menghapus', err.response?.data?.message || err.message)
      }
    }
  })
}

async function restoreItem(item: any) {
  try {
    await api.patch(`/concentrations/${item.id}/restore`)
    toast.success('Berhasil', `"${item.name}" berhasil dipulihkan`)
    selectedIds.value = selectedIds.value.filter(id => id !== item.id)
    if (items.value.length === 1 && page.value > 1) page.value--
    fetchData()
    fetchStats()
  } catch (err: any) {
    toast.error('Gagal restore', err.response?.data?.message || err.message)
  }
}

// Bulk Actions
async function performBulkAction(action: string) {
  const lbl = action === 'trash' ? 'Hapus' : action === 'restore' ? 'Restore' : 'Hapus Permanen'
  const style = action === 'trash' || action === 'forceDelete' ? 'danger' : 'info'

  confirm.requireConfirm({
    title: `Bulk ${lbl}?`,
    message: `Anda yakin ingin memproses ${selectedIds.value.length} data terpilih?`,
    style,
    onConfirm: async () => {
      try {
        await api.post('/concentrations/bulk', {
          ids: selectedIds.value,
          action
        })
        toast.success('Berhasil', `Bulk action ${lbl} sukses`)
        selectedIds.value = []
        fetchData()
        fetchStats()
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
        <h1 class="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
          <BookOpen class="w-7 h-7 text-indigo-600" />
          Konsentrasi
        </h1>
        <p class="text-sm text-slate-500 mt-1">Kelola data peminatan studi / konsentrasi mahasiswa per program studi.</p>
      </div>
      <button
        v-permission="'concentrations.create'"
        @click="openAddModal"
        class="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 transition-colors"
      >
        <Plus class="h-4 w-4 mr-2" />
        Tambah Konsentrasi
      </button>
    </div>

    <!-- Stats Cards -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-2">
      <StatsCard
        title="Total Konsentrasi"
        :value="stats.total"
        :icon="BookOpen"
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

    <!-- Filter Prodi -->
    <div class="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
      <label class="block text-sm font-medium text-slate-700 mb-1.5">Filter Program Studi</label>
      <div class="max-w-md">
        <SearchableSelect
          v-model="filterProdiId"
          :options="[{value: '', label: 'Semua Program Studi'}, ...prodiOptions]"
          placeholder="Semua Program Studi"
          @change="fetchData(1)"
        />
      </div>
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
      searchPlaceholder="Cari nama atau kode konsentrasi..."
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
          <button @click="performBulkAction('trash')" class="inline-flex items-center px-3 py-1.5 text-xs font-semibold rounded-lg bg-white border border-slate-200 text-rose-600 hover:bg-rose-50 hover:border-rose-200 transition-colors">
            <Trash2 class="h-3.5 w-3.5 mr-1" /> Hapus
          </button>
        </template>
        <template v-else>
          <button @click="performBulkAction('restore')" class="inline-flex items-center px-3 py-1.5 text-xs font-semibold rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-blue-50 hover:text-blue-700 transition-colors">
            <RotateCcw class="h-3.5 w-3.5 mr-1" /> Restore
          </button>
          <button @click="performBulkAction('forceDelete')" class="inline-flex items-center px-3 py-1.5 text-xs font-semibold rounded-lg bg-white border border-slate-200 text-rose-600 hover:bg-rose-50 hover:border-rose-200 transition-colors">
            <AlertTriangle class="h-3.5 w-3.5 mr-1" /> Hapus Permanen
          </button>
        </template>
      </template>

      <!-- Cell Slots -->
      <template #cell(prodi)="{ item }">
        <span v-if="item.prodi" class="text-xs px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 font-medium">
          {{ item.prodi.degree }} {{ item.prodi.name }}
        </span>
        <span v-else class="text-slate-400 text-xs italic">—</span>
      </template>

      <template #cell(code)="{ value }">
        <span v-if="value" class="font-mono text-sm bg-slate-100 px-2 py-1 rounded">{{ value }}</span>
        <span v-else class="text-slate-400 text-xs italic">—</span>
      </template>

      <template #cell(isActive)="{ item }">
        <span
          class="px-2.5 py-1 text-xs font-medium rounded-full"
          :class="item.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'"
        >
          {{ item.isActive ? 'Aktif' : 'Tidak Aktif' }}
        </span>
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
      :title="editingId ? 'Edit Konsentrasi' : 'Tambah Konsentrasi'"
      :loading="isSubmitting"
      @submit="handleSubmit"
    >
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-slate-700 mb-1">
            Program Studi <span class="text-red-500">*</span>
          </label>
          <SearchableSelect
            v-model="form.prodiId"
            :options="prodiOptions"
            placeholder="Pilih Program Studi"
            required
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-slate-700 mb-1">
            Nama Konsentrasi <span class="text-red-500">*</span>
          </label>
          <input
            v-model="form.name"
            type="text"
            required
            class="w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            placeholder="Misal: Manajemen Pendidikan Islam"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-slate-700 mb-1">
            Kode Konsentrasi
          </label>
          <input
            v-model="form.code"
            type="text"
            class="w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 uppercase font-mono"
            placeholder="Misal: MPI"
          />
        </div>

        <div class="flex items-center gap-2 mt-2">
          <input
            v-model="form.isActive"
            type="checkbox"
            id="isActive"
            class="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
          />
          <label for="isActive" class="text-sm text-slate-700">Set sebagai Status Aktif</label>
        </div>
      </div>
    </ModalForm>
  </div>
</template>

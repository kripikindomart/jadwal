<script setup lang="ts">
import { ref, onMounted } from 'vue'
import api from '@/lib/api'
import { useToast } from '@/composables/useToast'
import { useConfirm } from '@/composables/useConfirm'
import DataTable, { type Column } from '@/components/ui/DataTable.vue'
import ModalForm from '@/components/ui/ModalForm.vue'
import StatsCard from '@/components/ui/StatsCard.vue'
import ImportModal from '@/components/ui/ImportModal.vue'
import SearchableSelect from '@/components/ui/SearchableSelect.vue'
import { Plus, Edit2, Trash2, RotateCcw, AlertTriangle, BookOpen, Archive, LayoutList, UploadCloud } from 'lucide-vue-next'
import { computed } from 'vue'

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
const filterProdiId = ref<string>('')
const sortKey = ref('name')
const sortOrder = ref<'asc' | 'desc'>('asc')
const selectedIds = ref<number[]>([])

const showImportModal = ref(false)

const statusTab = ref('active')
const tabs = [
  { value: 'active', label: 'Data Aktif', icon: LayoutList },
  { value: 'trash', label: 'Tempat Sampah', icon: Trash2 },
]

const columns: Column[] = [
  { key: 'code', label: 'Kode', sortable: true },
  { key: 'name', label: 'Matakuliah', sortable: true },
  { key: 'sks', label: 'SKS', sortable: true, align: 'center' },
  { key: 'prodi', label: 'Program Studi' },
  { key: 'semesterDefault', label: 'Smt Default', align: 'center' },
]

// Modal Form State
const isModalOpen = ref(false)
const isSubmitting = ref(false)
const editingId = ref<number | null>(null)
const form = ref({
  code: '',
  name: '',
  prodiId: '',
  sks: 3,
  semesterDefault: 1
})

const prodiOptions = computed(() => {
  return prodis.value.map(p => ({
    value: p.id,
    label: `[${p.code}] ${p.name}`
  }))
})

async function fetchFilterOptions() {
  try {
    const { data } = await api.get('/prodis?perPage=100')
    prodis.value = data.data
  } catch (err) {
    console.error('Failed to load filter options')
  }
}

async function fetchData(p = page.value) {
  try {
    loading.value = true
    page.value = p
    const { data } = await api.get('/courses', {
      params: {
        page: p,
        perPage: perPage.value,
        search: search.value,
        prodiId: filterProdiId.value || undefined,
        sortKey: sortKey.value,
        sortOrder: sortOrder.value,
        status: statusTab.value
      }
    })
    items.value = data.data
    total.value = data.meta.total
  } catch (err: any) {
    if (err.response?.status !== 403) {
      toast.error('Gagal mengambil data', err.response?.data?.message || err.message)
    }
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchFilterOptions()
  fetchData()
})

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
  form.value = { 
    code: '', 
    name: '', 
    sks: 3, 
    prodiId: filterProdiId.value || (prodis.value[0]?.id || ''),
    semesterDefault: 1
  }
  isModalOpen.value = true
}

function openEditModal(item: any) {
  editingId.value = item.id
  form.value = {
    code: item.code,
    name: item.name,
    sks: item.sks,
    prodiId: item.prodiId,
    semesterDefault: item.semesterDefault || 1
  }
  isModalOpen.value = true
}

async function handleSubmit() {
  try {
    isSubmitting.value = true
    const payload = { 
      ...form.value, 
      prodiId: +form.value.prodiId,
      sks: +form.value.sks,
      semesterDefault: +form.value.semesterDefault
    }
    
    if (editingId.value) {
      await api.patch(`/courses/${editingId.value}`, payload)
      toast.success('Berhasil', 'Matakuliah berhasil diperbarui')
    } else {
      await api.post('/courses', payload)
      toast.success('Berhasil', 'Matakuliah baru ditambahkan')
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
    title: statusTab.value === 'trash' ? 'Hapus Permanen?' : 'Hapus Matakuliah?',
    message: statusTab.value === 'trash'
      ? `Anda yakin ingin menghapus permanen ${item.name}? Data ini tidak dapat dikembalikan.`
      : `Anda yakin ingin menghapus ${item.name}? Data akan dipindah ke tempat sampah.`,
    style: 'danger',
    confirmText: 'Ya, Hapus',
    onConfirm: async () => {
      try {
        if (statusTab.value === 'trash') {
          await api.delete(`/courses/${item.id}/force`)
        } else {
          await api.delete(`/courses/${item.id}`)
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
    await api.patch(`/courses/${item.id}/restore`)
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
  const lbl = action === 'trash' ? 'Hapus ke Tempat Sampah' : action === 'delete' ? 'Hapus Permanen' : 'Restore'
  const actionStyle = action === 'trash' || action === 'delete' ? 'danger' : 'info'

  confirm.requireConfirm({
    title: `Bulk ${lbl}?`,
    message: `Anda yakin ingin memproses ${selectedIds.value.length} data terpilih?`,
    style: actionStyle,
    onConfirm: async () => {
      try {
        await api.post('/courses/bulk', {
          ids: selectedIds.value,
          action
        })
        toast.success('Berhasil', `Bulk delete sukses`)
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
        <h1 class="text-2xl font-bold tracking-tight text-slate-900">Mata Kuliah</h1>
        <p class="text-sm text-slate-500 mt-1">Kelola data kurikulum dan matakuliah.</p>
      </div>
      <div class="flex gap-2">
        <button
          @click="showImportModal = true"
          class="inline-flex items-center justify-center rounded-xl bg-white text-slate-700 px-4 py-2 text-sm font-semibold shadow-sm hover:bg-slate-50 border border-slate-200 transition-colors"
        >
          <UploadCloud class="h-4 w-4 mr-2" />
          Import
        </button>
        <button
          @click="openAddModal"
          class="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 transition-colors"
        >
          <Plus class="h-4 w-4 mr-2" />
          Tambah Mata Kuliah
        </button>
      </div>
    </div>

    <!-- Stats Cards -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-2">
      <StatsCard
        title="Total Data"
        :value="total"
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
      searchPlaceholder="Cari kode atau nama matakuliah..."
      v-model:search-value="search"
      @search="fetchData(1)"
      @sort="handleSort"
      :page="page"
      :per-page="perPage"
      :total="total"
      @page-change="fetchData"
    >
      <template #toolbar-right>
        <div class="flex items-center">
          <select
            v-model="filterProdiId"
            @change="fetchData(1)"
            class="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 max-w-[200px]"
          >
            <option value="">Semua Program Studi</option>
            <option v-for="p in prodis" :key="p.id" :value="p.id">
              {{ p.degree }} {{ p.code }}
            </option>
          </select>
        </div>
      </template>

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
          <button @click="performBulkAction('delete')" class="inline-flex items-center px-3 py-1.5 text-xs font-semibold rounded-lg bg-white border border-slate-200 text-rose-600 hover:bg-rose-50 hover:border-rose-200 transition-colors">
            <AlertTriangle class="h-3.5 w-3.5 mr-1" /> Hapus Permanen
          </button>
        </template>
      </template>

      <!-- Cell Slots -->
      <template #cell(prodi)="{ item }">
        <span class="text-sm text-slate-700">{{ item.prodi?.code }} - {{ item.prodi?.name }}</span>
      </template>
      <template #cell(code)="{ value }">
        <span class="font-mono text-xs font-semibold bg-slate-100 text-slate-700 px-2 py-1 rounded">{{ value }}</span>
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
      :title="editingId ? 'Edit Mata Kuliah' : 'Tambah Mata Kuliah'"
      :loading="isSubmitting"
      @submit="handleSubmit"
    >
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-slate-700 mb-1">Program Studi</label>
          <SearchableSelect
            v-model="form.prodiId"
            :options="prodiOptions"
            placeholder="Pilih Program Studi"
            required
          />
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1">Kode MK</label>
            <input
              v-model="form.code"
              type="text"
              required
              placeholder="Misal: TIF601"
              class="w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 uppercase"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1">SKS</label>
            <input
              v-model="form.sks"
              type="number"
              required
              min="1"
              max="6"
              class="w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>
        </div>
        
        <div>
          <label class="block text-sm font-medium text-slate-700 mb-1">Nama Mata Kuliah</label>
          <input
            v-model="form.name"
            type="text"
            required
            placeholder="Ketik nama mata kuliah..."
            class="w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          />
        </div>

        <div>
           <label class="block text-sm font-medium text-slate-700 mb-1">Semester Default (Rekomendasi plotting)</label>
            <input
              v-model="form.semesterDefault"
              type="number"
              min="1"
              max="8"
              class="w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
        </div>
      </div>
    </ModalForm>

    <ImportModal
      v-model:show="showImportModal"
      title="Import Matakuliah"
      description="Unggah file Excel berisi daftar Matakuliah. Pastikan menggunakan template yang disediakan."
      endpoint="/courses/import"
      template-url="/templates/template-matakuliah.xlsx"
      @success="fetchData(1)"
    />
  </div>
</template>

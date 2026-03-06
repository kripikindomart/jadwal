<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import api from '@/lib/api'
import { useToast } from '@/composables/useToast'
import { useConfirm } from '@/composables/useConfirm'
import DataTable, { type Column } from '@/components/ui/DataTable.vue'
import ModalForm from '@/components/ui/ModalForm.vue'
import StatsCard from '@/components/ui/StatsCard.vue'
import ImportModal from '@/components/ui/ImportModal.vue'
import SearchableSelect from '@/components/ui/SearchableSelect.vue'
import { Plus, Edit2, Trash2, RotateCcw, AlertTriangle, GraduationCap, LayoutList, UploadCloud, UserCheck, Search } from 'lucide-vue-next'

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

import { computed } from 'vue'

const prodiOptions = computed(() => prodis.value.map(p => ({ value: p.id, label: `${p.degree} ${p.name}` })))

const sortKey = ref('name')
const sortOrder = ref<'asc' | 'desc'>('asc')
const selectedIds = ref<number[]>([])

const showImportModal = ref(false)

const statusTab = ref('active')
const tabs = [
  { value: 'active', label: 'Data Aktif', icon: LayoutList },
  { value: 'trash', label: 'Tempat Sampah', icon: Trash2 },
]

const stats = ref({ total: 0, active: 0, trashed: 0 })

const columns: Column[] = [
  { key: 'no', label: 'No.', align: 'center' },
  { key: 'name', label: 'Nama Lengkap', sortable: true },
  { key: 'contact', label: 'Kontak' },
  { key: 'prodi', label: 'Homebase Prodi' },
]

// Modal Form State
const isModalOpen = ref(false)
const isSubmitting = ref(false)
const editingId = ref<number | null>(null)
const form = ref({
  name: '',
  email: '',
  phone: '',
  nidn: '',
  nip: '',
  frontTitle: '',
  backTitle: '',
  homeProdiId: '' as string | number,
})

function resetForm() {
  form.value = { name: '', email: '', phone: '', nidn: '', nip: '', frontTitle: '', backTitle: '', homeProdiId: '' }
  editingId.value = null
}

// Fetch data
async function fetchData(p = page.value) {
  loading.value = true
  try {
    const params: any = { page: p, perPage: perPage.value, search: search.value, status: statusTab.value }
    if (filterProdiId.value) params.prodiId = filterProdiId.value
    const { data } = await api.get('/lecturers', { params })
    items.value = data.data
    total.value = data.meta.total
    page.value = p
  } catch (err: any) {
    toast.error('Gagal memuat data', err.response?.data?.message || err.message)
  } finally {
    loading.value = false
  }
}

async function fetchStats() {
  try {
    const { data } = await api.get('/lecturers/stats')
    stats.value = data
  } catch { /* silent */ }
}

async function fetchProdis() {
  try {
    const { data } = await api.get('/prodis?perPage=100')
    prodis.value = data.data
  } catch { /* silent */ }
}

onMounted(() => {
  fetchData()
  fetchStats()
  fetchProdis()
})

watch(statusTab, () => fetchData(1))
watch(filterProdiId, () => fetchData(1))

function handleSearch(q: string) {
  search.value = q
  fetchData(1)
}

let searchTimeout: any = null
function handleSearchDebounced() {
  if (searchTimeout) clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => fetchData(1), 300)
}

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
  resetForm()
  isModalOpen.value = true
}

async function openEdit(item: any) {
  editingId.value = item.id
  form.value = {
    name: item.name || '',
    email: item.email || '',
    phone: item.phone || '',
    nidn: item.nidn || '',
    nip: item.nip || '',
    frontTitle: item.frontTitle || '',
    backTitle: item.backTitle || '',
    homeProdiId: item.homeProdiId || '',
  }
  isModalOpen.value = true
}

async function handleSubmit() {
  isSubmitting.value = true
  try {
    const payload = {
      ...form.value,
      homeProdiId: form.value.homeProdiId ? +form.value.homeProdiId : undefined,
    }
    if (editingId.value) {
      await api.patch(`/lecturers/${editingId.value}`, payload)
      toast.success('Berhasil', 'Data dosen berhasil diperbarui.')
    } else {
      await api.post('/lecturers', payload)
      toast.success('Berhasil', 'Dosen baru berhasil ditambahkan.')
    }
    isModalOpen.value = false
    fetchData()
    fetchStats()
  } catch (err: any) {
    toast.error('Gagal', err.response?.data?.message || err.message)
  } finally {
    isSubmitting.value = false
  }
}

async function handleDelete(item: any) {
  confirm.requireConfirm({
    title: 'Hapus Dosen',
    message: `Yakin ingin menghapus ${item.name}?`,
    confirmText: 'Hapus',
    style: 'danger',
    onConfirm: async () => {
      try {
        await api.delete(`/lecturers/${item.id}`)
        toast.success('Berhasil', 'Dosen berhasil dipindahkan ke tempat sampah.')
        fetchData()
        fetchStats()
      } catch (err: any) {
        toast.error('Gagal', err.response?.data?.message || err.message)
      }
    }
  })
}

async function handleRestore(item: any) {
  try {
    await api.patch(`/lecturers/${item.id}/restore`)
    toast.success('Berhasil', 'Dosen berhasil dipulihkan.')
    fetchData()
    fetchStats()
  } catch (err: any) {
    toast.error('Gagal', err.response?.data?.message || err.message)
  }
}

async function handleForceDelete(item: any) {
  confirm.requireConfirm({
    title: 'Hapus Permanen',
    message: `Data ${item.name} akan hilang selamanya. Lanjutkan?`,
    confirmText: 'Hapus Permanen',
    style: 'danger',
    onConfirm: async () => {
      try {
        await api.delete(`/lecturers/${item.id}/force`)
        toast.success('Berhasil', 'Dosen berhasil dihapus permanen.')
        fetchData()
        fetchStats()
      } catch (err: any) {
        toast.error('Gagal', err.response?.data?.message || err.message)
      }
    }
  })
}

async function handleBulkAction(action: string) {
  if (!selectedIds.value.length) return

  if (action === 'forceDelete') {
    confirm.requireConfirm({
      title: 'Hapus Permanen (Massal)',
      message: `${selectedIds.value.length} dosen akan dihapus permanen dan tidak dapat dikembalikan. Lanjutkan?`,
      confirmText: 'Hapus Semua Permanen',
      style: 'danger',
      onConfirm: async () => {
        try {
          await api.post('/lecturers/bulk', { ids: selectedIds.value, action })
          toast.success('Berhasil', `${selectedIds.value.length} data berhasil dihapus permanen.`)
          selectedIds.value = []
          fetchData()
          fetchStats()
        } catch (err: any) {
          toast.error('Gagal', err.response?.data?.message || err.message)
        }
      }
    })
    return
  }

  try {
    await api.post('/lecturers/bulk', { ids: selectedIds.value, action })
    toast.success('Berhasil', `${selectedIds.value.length} data berhasil diproses.`)
    selectedIds.value = []
    fetchData()
    fetchStats()
  } catch (err: any) {
    toast.error('Gagal', err.response?.data?.message || err.message)
  }
}

function handleImportSuccess() {
  fetchData(1)
  fetchStats()
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <GraduationCap class="w-7 h-7 text-indigo-600" />
          Manajemen Dosen
        </h1>
        <p class="text-sm text-slate-500 mt-1">Kelola data dosen, NIDN, dan homebase program studi.</p>
      </div>
      <div class="flex gap-2">
        <button @click="showImportModal = true"
          class="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors">
          <UploadCloud class="w-4 h-4" /> Import
        </button>
        <button @click="openCreate"
          class="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg shadow-sm hover:bg-indigo-700 transition-colors">
          <Plus class="w-4 h-4" /> Tambah Dosen
        </button>
      </div>
    </div>

    <!-- Stats -->
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <StatsCard title="Total Dosen" :value="stats.total" :icon="GraduationCap" color="indigo" />
      <StatsCard title="Aktif" :value="stats.active" :icon="UserCheck" color="emerald" />
      <StatsCard title="Tempat Sampah" :value="stats.trashed" :icon="Trash2" color="rose" />
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

    <!-- Filter -->
    <div class="flex gap-3 flex-wrap items-center">
      <div class="relative flex-1 min-w-[200px] max-w-xs">
        <Search class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          type="text"
          v-model="search"
          @input="handleSearchDebounced"
          placeholder="Cari nama, email, NIDN, NIP..."
          class="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-colors placeholder:text-slate-400"
        />
      </div>
      <div class="w-48">
        <SearchableSelect
          v-model="filterProdiId"
          :options="[{value: '', label: 'Semua Prodi'}, ...prodiOptions]"
          placeholder="Semua Prodi"
        />
      </div>
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
      @search="handleSearch"
      @sort="handleSort"
      @page-change="handlePageChange"
      @per-page-change="handlePerPageChange"
    >
      <template #cell(no)="{ index }">
        <span class="text-sm text-slate-500">{{ ((page - 1) * perPage) + index + 1 }}</span>
      </template>

      <template #cell(name)="{ item }">
        <div class="flex flex-col gap-0.5">
          <span class="font-semibold text-slate-800">{{ item.fullName }}</span>
          <span class="text-xs text-slate-500">NIDN: <span class="font-mono text-slate-700">{{ item.nidn || '—' }}</span></span>
          <span class="text-xs text-slate-500">NIP: <span class="font-mono text-slate-700">{{ item.nip || '—' }}</span></span>
        </div>
      </template>
      <template #cell(contact)="{ item }">
        <div class="flex flex-col gap-0.5">
          <span class="text-sm font-medium text-slate-800">{{ item.email }}</span>
          <span class="text-xs text-slate-500 font-mono">{{ item.phone || '—' }}</span>
        </div>
      </template>
      <template #cell(prodi)="{ item }">
        <span v-if="item.homeProdi" class="text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-medium">
          {{ item.homeProdi.degree }} {{ item.homeProdi.name }}
        </span>
        <span v-else class="text-slate-400 text-xs">—</span>
      </template>

      <template #actions="{ item }">
        <div class="flex gap-1">
          <template v-if="statusTab === 'active'">
            <button @click="openEdit(item)" class="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="Edit">
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
          <button @click="handleBulkAction('trash')" class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-rose-700 bg-rose-50 rounded-lg hover:bg-rose-100 transition-colors">
            <Trash2 class="w-3.5 h-3.5" /> Hapus Terpilih
          </button>
        </template>
        <template v-else>
          <button @click="handleBulkAction('restore')" class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors">
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
      :title="editingId ? 'Edit Dosen' : 'Tambah Dosen'"
      :loading="isSubmitting"
      @submit="handleSubmit"
    >
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-slate-700 mb-1">Gelar Depan</label>
          <input v-model="form.frontTitle" type="text" placeholder="Dr., Prof."
            class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400" />
        </div>
        <div>
          <label class="block text-sm font-medium text-slate-700 mb-1">Gelar Belakang</label>
          <input v-model="form.backTitle" type="text" placeholder="M.Kom., Ph.D."
            class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400" />
        </div>
      </div>
      <div>
        <label class="block text-sm font-medium text-slate-700 mb-1">Nama Lengkap <span class="text-rose-500">*</span></label>
        <input v-model="form.name" type="text" required placeholder="Nama lengkap dosen"
          class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400" />
      </div>
      <div>
        <label class="block text-sm font-medium text-slate-700 mb-1">Email <span class="text-rose-500">*</span></label>
        <input v-model="form.email" type="email" required placeholder="email@example.com"
          class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400" />
      </div>
      <div>
        <label class="block text-sm font-medium text-slate-700 mb-1">No. HP / WhatsApp</label>
        <input v-model="form.phone" type="text" placeholder="08xxxxxxxxxx"
          class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400" />
      </div>
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-slate-700 mb-1">NIDN</label>
          <input v-model="form.nidn" type="text" placeholder="Nomor Induk Dosen Nasional"
            class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400" />
        </div>
        <div>
          <label class="block text-sm font-medium text-slate-700 mb-1">NIP</label>
          <input v-model="form.nip" type="text" placeholder="Nomor Induk Pegawai"
            class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400" />
        </div>
      </div>
      <div>
        <label class="block text-sm font-medium text-slate-700 mb-1">Homebase Prodi</label>
        <SearchableSelect
          v-model="form.homeProdiId"
          :options="prodiOptions"
          placeholder="— Pilih Prodi —"
        />
      </div>
    </ModalForm>

    <!-- Import Modal -->
    <ImportModal
      v-model:show="showImportModal"
      title="Import Dosen"
      description="Unggah file Excel berisi data dosen. Gunakan template untuk mapping otomatis."
      endpoint="/lecturers/import"
      template-url="/templates/template-dosen.xlsx"
      :system-fields="[
        { key: 'name', label: 'Nama', required: true },
        { key: 'email', label: 'Email', required: true },
        { key: 'nidn', label: 'NIDN', required: false },
        { key: 'nip', label: 'NIP', required: false },
        { key: 'frontTitle', label: 'Gelar Depan', required: false },
        { key: 'backTitle', label: 'Gelar Belakang', required: false },
        { key: 'prodiCode', label: 'Kode Prodi', required: false },
      ]"
      @success="handleImportSuccess"
    />
  </div>
</template>

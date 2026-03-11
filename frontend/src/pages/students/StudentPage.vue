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
import { Plus, Edit2, Trash2, RotateCcw, AlertTriangle, Users2, LayoutList, UploadCloud, Search } from 'lucide-vue-next'

const toast = useToast()
const confirm = useConfirm()

// State
const items = ref<any[]>([])
const prodis = ref<any[]>([])
const semesters = ref<any[]>([])
const concentrations = ref<any[]>([])
const loading = ref(false)
const total = ref(0)
const page = ref(1)
const perPage = ref(10)
const search = ref('')
const filterProdiId = ref<string>('')
const filterAngkatan = ref<string>('')

import { computed } from 'vue'

const prodiOptions = computed(() => prodis.value.map(p => ({ value: p.id, label: `${p.degree} ${p.name}` })))
const semesterOptions = computed(() => semesters.value.map(s => ({ value: s.code, label: `${s.code} — ${s.name} (${s.type})` })))
const filterSemesterOptions = computed(() => semesters.value.map(s => ({ value: s.code, label: `${s.name} (${s.type})` })))

const concentrationOptions = computed(() => {
  if (!form.value.prodiId) return []
  return concentrations.value
    .filter(c => c.prodiId === +form.value.prodiId && c.isActive)
    .map(c => ({ value: c.id, label: `${c.code ? c.code + ' - ' : ''}${c.name}` }))
})

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
  { key: 'name', label: 'Mahasiswa', sortable: true },
  { key: 'contact', label: 'Kontak' },
  { key: 'prodi', label: 'Program Studi' },
  { key: 'concentration', label: 'Konsentrasi' },
  { key: 'angkatan', label: 'Angkatan', align: 'center' },
  { key: 'status', label: 'Status', align: 'center' },
]

// Modal Form State
const isModalOpen = ref(false)
const isSubmitting = ref(false)
const editingId = ref<number | null>(null)
const form = ref({
  name: '',
  email: '',
  phone: '',
  nim: '',
  prodiId: '' as string | number,
  concentrationId: '' as string | number,
  angkatan: '' as string | number,
  status: 'aktif',
})

function resetForm() {
  form.value = { name: '', email: '', phone: '', nim: '', prodiId: '', concentrationId: '', angkatan: '', status: 'aktif' }
  editingId.value = null
}

const statusOptions = [
  { value: 'aktif', label: 'Aktif', color: 'emerald' },
  { value: 'cuti', label: 'Cuti', color: 'amber' },
  { value: 'lulus', label: 'Lulus', color: 'blue' },
  { value: 'do', label: 'DO', color: 'rose' },
]

// Fetch data
async function fetchData(p = page.value) {
  loading.value = true
  try {
    const params: any = { page: p, perPage: perPage.value, search: search.value, status: statusTab.value }
    if (filterProdiId.value) params.prodiId = filterProdiId.value
    if (filterAngkatan.value) params.angkatan = filterAngkatan.value
    const { data } = await api.get('/students', { params })
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
    const { data } = await api.get('/students/stats')
    stats.value = data
  } catch { /* silent */ }
}

async function fetchProdis() {
  try {
    const { data } = await api.get('/prodis?perPage=100')
    prodis.value = data.data
  } catch { /* silent */ }
}

async function fetchSemesters() {
  try {
    const { data } = await api.get('/semesters?perPage=100')
    semesters.value = data.data
  } catch { /* silent */ }
}

async function fetchConcentrations() {
  try {
    const { data } = await api.get('/concentrations?perPage=200')
    concentrations.value = data.data
  } catch { /* silent */ }
}

onMounted(() => {
  fetchData()
  fetchStats()
  fetchProdis()
  fetchSemesters()
  fetchConcentrations()
})

watch(statusTab, () => fetchData(1))
watch(filterProdiId, () => fetchData(1))
watch(filterAngkatan, () => fetchData(1))

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
    nim: item.nim || '',
    prodiId: item.prodiId || '',
    concentrationId: item.concentrationId || '',
    angkatan: item.angkatan || '',
    status: item.status || 'aktif',
  }
  isModalOpen.value = true
}

async function handleSubmit() {
  isSubmitting.value = true
  try {
    const payload = {
      ...form.value,
      prodiId: form.value.prodiId ? +form.value.prodiId : undefined,
      concentrationId: form.value.concentrationId ? +form.value.concentrationId : undefined,
      angkatan: form.value.angkatan || undefined,
    }
    if (editingId.value) {
      await api.patch(`/students/${editingId.value}`, payload)
      toast.success('Berhasil', 'Data mahasiswa berhasil diperbarui.')
    } else {
      await api.post('/students', payload)
      toast.success('Berhasil', 'Mahasiswa baru berhasil ditambahkan.')
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
    title: 'Hapus Mahasiswa',
    message: `Yakin ingin menghapus ${item.name}?`,
    confirmText: 'Hapus',
    style: 'danger',
    onConfirm: async () => {
      try {
        await api.delete(`/students/${item.id}`)
        toast.success('Berhasil', 'Mahasiswa berhasil dipindahkan ke tempat sampah.')
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
    await api.patch(`/students/${item.id}/restore`)
    toast.success('Berhasil', 'Mahasiswa berhasil dipulihkan.')
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
        await api.delete(`/students/${item.id}/force`)
        toast.success('Berhasil', 'Mahasiswa berhasil dihapus permanen.')
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
      message: `${selectedIds.value.length} mahasiswa akan dihapus permanen dan tidak dapat dikembalikan. Lanjutkan?`,
      confirmText: 'Hapus Semua Permanen',
      style: 'danger',
      onConfirm: async () => {
        try {
          await api.post('/students/bulk', { ids: selectedIds.value, action })
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
    await api.post('/students/bulk', { ids: selectedIds.value, action })
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

// Helper: find semester name by code for display
function semesterName(code: any) {
  if (!code) return '—'
  const sem = semesters.value.find((s: any) => s.code === String(code))
  if (sem) {
    return `${sem.name}`
  }
  return code
}

function semesterType(code: any) {
  if (!code) return ''
  const sem = semesters.value.find((s: any) => s.code === String(code))
  return sem ? sem.type : ''
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <Users2 class="w-7 h-7 text-purple-600" />
          Manajemen Mahasiswa
        </h1>
        <p class="text-sm text-slate-500 mt-1">Kelola data mahasiswa, NIM, dan program studi.</p>
      </div>
      <div class="flex gap-2">
        <button @click="showImportModal = true"
          class="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-purple-700 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 transition-colors">
          <UploadCloud class="w-4 h-4" /> Import
        </button>
        <button @click="openCreate"
          class="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-purple-600 rounded-lg shadow-sm hover:bg-purple-700 transition-colors">
          <Plus class="w-4 h-4" /> Tambah Mahasiswa
        </button>
      </div>
    </div>

    <!-- Stats -->
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <StatsCard title="Total Mahasiswa" :value="stats.total" :icon="Users2" color="violet" />
      <StatsCard title="Aktif" :value="stats.active" :icon="LayoutList" color="emerald" />
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

    <!-- Filters -->
    <div class="flex gap-3 flex-wrap items-center">
      <div class="relative flex-1 min-w-[200px] max-w-xs">
        <Search class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          type="text"
          v-model="search"
          @input="handleSearchDebounced"
          placeholder="Cari nama, email, NIM..."
          class="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 transition-colors placeholder:text-slate-400"
        />
      </div>
      <div class="w-48">
        <SearchableSelect
          v-model="filterProdiId"
          :options="[{value: '', label: 'Semua Prodi'}, ...prodiOptions]"
          placeholder="Semua Prodi"
        />
      </div>
      <div class="w-48">
        <SearchableSelect
          v-model="filterAngkatan"
          :options="[{value: '', label: 'Semua Angkatan'}, ...filterSemesterOptions]"
          placeholder="Semua Angkatan"
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
        <div class="flex flex-col">
          <span class="font-semibold text-slate-800">{{ item.name }}</span>
          <span class="text-xs text-slate-500 font-mono">{{ item.nim || '—' }}</span>
        </div>
      </template>
      <template #cell(contact)="{ item }">
        <div class="flex flex-col gap-0.5">
          <span class="text-sm font-medium text-slate-800">{{ item.email }}</span>
          <span class="text-xs text-slate-500 font-mono">{{ item.phone || '—' }}</span>
        </div>
      </template>
      <template #cell(prodi)="{ item }">
        <span v-if="item.prodi" class="text-xs px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 font-medium">
          {{ item.prodi.degree }} {{ item.prodi.name }}
        </span>
        <span v-else class="text-slate-400 text-xs">—</span>
      </template>
      <template #cell(concentration)="{ item }">
        <span v-if="item.concentration" class="text-xs font-semibold text-slate-700">
          {{ item.concentration.name }}
        </span>
        <span v-else class="text-slate-400 text-xs">—</span>
      </template>
      <template #cell(angkatan)="{ item }">
        <div class="flex flex-col items-center">
          <span class="text-sm font-semibold text-slate-800">{{ semesterName(item.angkatan) }}</span>
          <span v-if="semesterType(item.angkatan)" class="text-[10px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded-full"
            :class="{
              'bg-blue-50 text-blue-600': semesterType(item.angkatan) === 'Ganjil',
              'bg-amber-50 text-amber-600': semesterType(item.angkatan) === 'Genap',
              'bg-slate-100 text-slate-500': semesterType(item.angkatan) === 'Antara',
            }"
          >{{ semesterType(item.angkatan) }}</span>
        </div>
      </template>
      <template #cell(status)="{ item }">
        <span
          class="text-[11px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wide"
          :class="{
            'bg-emerald-50 text-emerald-700': item.status === 'aktif',
            'bg-amber-50 text-amber-700': item.status === 'cuti',
            'bg-blue-50 text-blue-700': item.status === 'lulus',
            'bg-rose-50 text-rose-700': item.status === 'do',
          }"
        >
          {{ item.status || '—' }}
        </span>
      </template>

      <template #actions="{ item }">
        <div class="flex gap-1">
          <template v-if="statusTab === 'active'">
            <button @click="openEdit(item)" class="p-1.5 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors" title="Edit">
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
      :title="editingId ? 'Edit Mahasiswa' : 'Tambah Mahasiswa'"
      :loading="isSubmitting"
      @submit="handleSubmit"
    >
      <div>
        <label class="block text-sm font-medium text-slate-700 mb-1">Nama Lengkap <span class="text-rose-500">*</span></label>
        <input v-model="form.name" type="text" required placeholder="Nama lengkap mahasiswa"
          class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400" />
      </div>
      <div>
        <label class="block text-sm font-medium text-slate-700 mb-1">Email <span class="text-rose-500">*</span></label>
        <input v-model="form.email" type="email" required placeholder="email@example.com"
          class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400" />
      </div>
      <div>
        <label class="block text-sm font-medium text-slate-700 mb-1">No. HP / WhatsApp</label>
        <input v-model="form.phone" type="text" placeholder="08xxxxxxxxxx"
          class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400" />
      </div>
      <div>
        <label class="block text-sm font-medium text-slate-700 mb-1">NIM <span class="text-rose-500">*</span></label>
        <input v-model="form.nim" type="text" required placeholder="Nomor Induk Mahasiswa"
          class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400" />
      </div>
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-slate-700 mb-1">Program Studi <span class="text-rose-500">*</span></label>
          <SearchableSelect
            v-model="form.prodiId"
            :options="prodiOptions"
            placeholder="— Pilih Prodi —"
            required
            @change="form.concentrationId = ''"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-slate-700 mb-1">Angkatan (Periode Masuk) <span class="text-rose-500">*</span></label>
          <SearchableSelect
            v-model="form.angkatan"
            :options="semesterOptions"
            placeholder="— Pilih Periode —"
            required
          />
        </div>
      </div>
      <div>
        <label class="block text-sm font-medium text-slate-700 mb-1">Konsentrasi (Opsional)</label>
        <SearchableSelect
          v-model="form.concentrationId"
          :options="concentrationOptions"
          placeholder="— Pilih Konsentrasi —"
          :disabled="!form.prodiId || concentrationOptions.length === 0"
        />
      </div>
      <div>
        <label class="block text-sm font-medium text-slate-700 mb-1">Status</label>
        <SearchableSelect
          v-model="form.status"
          :options="statusOptions"
        />
      </div>
    </ModalForm>

    <!-- Import Modal -->
    <ImportModal
      v-model:show="showImportModal"
      title="Import Mahasiswa"
      description="Unggah file Excel berisi data mahasiswa. Gunakan template untuk mapping otomatis."
      endpoint="/students/import"
      template-url="/templates/template-mahasiswa.xlsx"
      :system-fields="[
        { key: 'name', label: 'Nama', required: true },
        { key: 'email', label: 'Email', required: true },
        { key: 'phone', label: 'No HP', required: false },
        { key: 'nim', label: 'NIM', required: true },
        { key: 'angkatan', label: 'Angkatan', required: true },
        { key: 'status', label: 'Status', required: false },
        { key: 'prodiCode', label: 'Kode Prodi', required: true },
      ]"
      @success="handleImportSuccess"
    />
  </div>
</template>

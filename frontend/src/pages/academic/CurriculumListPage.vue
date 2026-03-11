<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import api from '@/lib/api'
import { useToast } from '@/composables/useToast'
import { useConfirm } from '@/composables/useConfirm'
import DataTable, { type Column } from '@/components/ui/DataTable.vue'
import ModalForm from '@/components/ui/ModalForm.vue'
import SearchableSelect from '@/components/ui/SearchableSelect.vue'
import { Plus, Edit2, Trash2, ListTree } from 'lucide-vue-next'

const router = useRouter()
const toast = useToast()
const confirm = useConfirm()

// State
const items = ref<any[]>([])
const prodis = ref<any[]>([])
const loading = ref(false)

const filterProdiId = ref<string>('')

const columns: Column[] = [
  { key: 'year', label: 'Tahun', sortable: true, align: 'center' },
  { key: 'name', label: 'Nama Kurikulum', sortable: true },
  { key: 'prodi', label: 'Program Studi' },
  { key: 'isActive', label: 'Status Aktif', align: 'center' },
]

// Modal Form State
const isModalOpen = ref(false)
const isSubmitting = ref(false)
const editingId = ref<number | null>(null)
const form = ref({
  name: '',
  year: new Date().getFullYear(),
  prodiId: '',
  isActive: true,
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
    console.error('Failed to load prodis')
  }
}

async function fetchData() {
  try {
    loading.value = true
    const { data } = await api.get('/curriculums')
    let res = data

    if (filterProdiId.value) {
      res = res.filter((r: any) => r.prodiId === +filterProdiId.value)
    }

    items.value = res
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

// CRUD Actions
function openAddModal() {
  editingId.value = null
  form.value = { 
    name: '', 
    year: new Date().getFullYear(),
    prodiId: filterProdiId.value || (prodis.value[0]?.id || ''),
    isActive: true
  }
  isModalOpen.value = true
}

function openEditModal(item: any) {
  editingId.value = item.id
  form.value = {
    name: item.name,
    year: item.year,
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
      year: +form.value.year
    }

    if (editingId.value) {
      await api.patch(`/curriculums/${editingId.value}`, payload)
      toast.success('Berhasil', 'Data kurikulum berhasil diperbarui')
    } else {
      await api.post('/curriculums', payload)
      toast.success('Berhasil', 'Kurikulum baru berhasil ditambahkan')
    }

    isModalOpen.value = false
    fetchData()
  } catch (err: any) {
    toast.error('Gagal menyimpan', err.response?.data?.message || err.message)
  } finally {
    isSubmitting.value = false
  }
}

async function handleDelete(item: any) {
  confirm.requireConfirm({
    title: 'Hapus Kurikulum?',
    message: `Anda yakin ingin menghapus "${item.name}"? Semua data relasi mata kuliah di dalamnya juga akan terhapus.`,
    confirmText: 'Ya, Hapus',
    style: 'danger',
    onConfirm: async () => {
      try {
        await api.delete(`/curriculums/${item.id}`)
        toast.success('Berhasil', 'Kurikulum berhasil dihapus')
        fetchData()
      } catch (err: any) {
        toast.error('Gagal menghapus', err.response?.data?.message || err.message)
      }
    }
  })
}

function goToDetail(item: any) {
  router.push(`/admin/academic/curriculums/${item.id}`)
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <div>
        <h1 class="text-2xl font-bold text-slate-800">Manajemen Kurikulum</h1>
        <p class="text-slate-500 text-sm mt-1">Kelola master data kurikulum program studi</p>
      </div>
      
      <div class="flex gap-2 w-full sm:w-auto">
        <button
          v-permission="'curriculums.create'"
          @click="openAddModal"
          class="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-lg hover:bg-indigo-700 transition-colors w-full sm:w-auto justify-center font-medium shadow-sm hover:shadow"
        >
          <Plus class="w-4 h-4" />
          <span>Tambah</span>
        </button>
      </div>
    </div>

    <!-- Filters -->
    <div class="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
      <div class="flex flex-col sm:flex-row gap-4 items-end">
        <div class="w-full sm:w-72">
          <label class="block text-sm font-medium text-slate-700 mb-1.5">Filter Program Studi</label>
          <SearchableSelect
            v-model="filterProdiId"
            :options="prodiOptions"
            placeholder="Semua Program Studi"
            @change="fetchData"
          />
        </div>
      </div>
    </div>

    <!-- Data Table -->
    <div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <DataTable
        :columns="columns"
        :data="items"
        :loading="loading"
        :actions="['edit', 'delete']"
      >
        <template #cell(prodi)="{ item }">
          <div class="font-medium text-slate-700">
            {{ item.prodi?.name }}
          </div>
          <div class="text-xs text-slate-500">{{ item.prodi?.code }}</div>
        </template>
        
        <template #cell(isActive)="{ item }">
          <span
            class="px-2.5 py-1 text-xs font-medium rounded-full"
            :class="item.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'"
          >
            {{ item.isActive ? 'Aktif' : 'Tidak Aktif' }}
          </span>
        </template>

        <!-- Custom Actions Area -->
        <template #actions="{ item }">
          <button
            v-permission="'curriculums.view'"
            @click="goToDetail(item)"
            class="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
            title="Kelola Mata Kuliah Tawar"
          >
            <ListTree class="w-4 h-4" />
          </button>
          
          <button
            v-permission="'curriculums.update'"
            @click="openEditModal(item)"
            class="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="Edit Header"
          >
            <Edit2 class="w-4 h-4" />
          </button>
          
          <button
             v-permission="'curriculums.delete'"
            @click="handleDelete(item)"
            class="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Hapus"
          >
            <Trash2 class="w-4 h-4" />
          </button>
        </template>
      </DataTable>
    </div>

    <!-- Add/Edit Modal -->
    <ModalForm
      v-model="isModalOpen"
      :title="editingId ? 'Edit Kurikulum' : 'Tambah Kurikulum'"
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
            Nama Kurikulum <span class="text-red-500">*</span>
          </label>
          <input
            v-model="form.name"
            type="text"
            required
            class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="Misal: Kurikulum Merdeka 2025"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-slate-700 mb-1">
            Tahun Kurikulum <span class="text-red-500">*</span>
          </label>
          <input
            v-model="form.year"
            type="number"
            required
            class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="Misal: 2025"
          />
        </div>

        <div class="flex items-center gap-2 mt-2">
          <input
            v-model="form.isActive"
            type="checkbox"
            id="isActive"
            class="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
          />
          <label for="isActive" class="text-sm text-slate-700">Set sebagai Kurikulum Aktif Default</label>
        </div>
      </div>
    </ModalForm>
  </div>
</template>

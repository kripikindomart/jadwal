<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import api from '@/lib/api'
import { useToast } from '@/composables/useToast'
import { useConfirm } from '@/composables/useConfirm'
import DataTable, { type Column } from '@/components/ui/DataTable.vue'
import StatsCard from '@/components/ui/StatsCard.vue'
import { Plus, Pencil, Trash2, RotateCcw, AlertTriangle, Users, Archive, LayoutList } from 'lucide-vue-next'

const router = useRouter()
const toast = useToast()
const confirm = useConfirm()

interface UserItem {
  id: number
  name: string
  email: string
  roles: { id: number; name: string; slug: string }[]
  createdAt: string
}

const users = ref<UserItem[]>([])
const loading = ref(false)
const total = ref(0)
const page = ref(1)
const perPage = ref(10)
const search = ref('')
const sortKey = ref('createdAt')
const sortOrder = ref<'asc' | 'desc'>('desc')
const selectedIds = ref<number[]>([])

const statusTab = ref('active')
const tabs = [
  { value: 'active', label: 'Data Aktif', icon: LayoutList },
  { value: 'trash', label: 'Tempat Sampah', icon: Trash2 },
]

const columns: Column[] = [
  { key: 'name', label: 'Nama', sortable: true },
  { key: 'email', label: 'Email', sortable: true },
  { key: 'roles', label: 'Roles' },
  { key: 'createdAt', label: 'Tanggal Terdaftar', sortable: true },
]

async function fetchData(p = page.value) {
  loading.value = true
  page.value = p
  try {
    const { data } = await api.get('/users', { 
      params: { 
        page: p, 
        limit: perPage.value,
        search: search.value,
        sortKey: sortKey.value,
        sortOrder: sortOrder.value,
        status: statusTab.value
      } 
    })
    users.value = data.data
    total.value = data.meta.total
  } catch (err: any) {
    toast.error('Gagal mengambil data', err.response?.data?.message || err.message)
  } finally {
    loading.value = false
  }
}

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

function confirmDelete(item: UserItem) {
  confirm.requireConfirm({
    title: statusTab.value === 'trash' ? 'Hapus Permanen?' : 'Hapus User?',
    message: statusTab.value === 'trash'
      ? `Anda yakin ingin menghapus permanen user ${item.name}? Data ini tidak dapat dikembalikan.`
      : `Anda yakin ingin menghapus user ${item.name}? Data akan dipindah ke tempat sampah.`,
    style: 'danger',
    confirmText: 'Ya, Hapus',
    onConfirm: async () => {
      try {
        if (statusTab.value === 'trash') {
          await api.delete(`/users/${item.id}/force`)
        } else {
          await api.delete(`/users/${item.id}`)
        }
        toast.success('Berhasil', 'User berhasil dihapus')
        selectedIds.value = selectedIds.value.filter(id => id !== item.id)
        if (users.value.length === 1 && page.value > 1) page.value--
        fetchData()
      } catch (err: any) {
        toast.error('Gagal menghapus', err.response?.data?.message || err.message)
      }
    }
  })
}

async function restoreItem(item: UserItem) {
  try {
    await api.patch(`/users/${item.id}/restore`)
    toast.success('Berhasil', `User ${item.name} berhasil direstore`)
    selectedIds.value = selectedIds.value.filter(id => id !== item.id)
    if (users.value.length === 1 && page.value > 1) page.value--
    fetchData()
  } catch (err: any) {
    toast.error('Gagal restore', err.response?.data?.message || err.message)
  }
}

// Bulk Actions
async function performBulkAction(action: string) {
  const lbl = action === 'trash' ? 'Hapus ke Tempat Sampah' : action === 'delete' ? 'Hapus Permanen' : 'Restore'
  const style = action === 'trash' || action === 'delete' ? 'danger' : 'info'

  confirm.requireConfirm({
    title: `Bulk ${lbl}?`,
    message: `Anda yakin ingin memproses ${selectedIds.value.length} data terpilih?`,
    style: style,
    onConfirm: async () => {
      try {
        await api.post(`/users/bulk`, { ids: selectedIds.value, action })
        toast.success('Berhasil', `Bulk action sukses`)
        selectedIds.value = []
        fetchData()
      } catch (err: any) {
        toast.error('Gagal bulk action', err.response?.data?.message || err.message)
      }
    }
  })
}

onMounted(() => fetchData())
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold tracking-tight text-slate-900">Manajemen User</h1>
        <p class="text-sm text-slate-500 mt-1">Kelola user dan assign role</p>
      </div>
      <button
        @click="router.push('/users/create')"
        class="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 transition-colors"
      >
        <Plus class="h-4 w-4 mr-2" />
        Tambah User
      </button>
    </div>

    <!-- Stats Cards -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-2">
      <StatsCard
        title="Total User"
        :value="total"
        :icon="Users"
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
      :data="users"
      :loading="loading"
      selectable
      v-model="selectedIds"
      searchPlaceholder="Cari user berdasarkan nama atau email..."
      v-model:search-value="search"
      @search="fetchData(1)"
      @sort="handleSort"
      :page="page"
      :per-page="perPage"
      :total="total"
      @page-change="fetchData"
    >
      <!-- Empty State Customization via Vue fallback logic if needed, but DataTable handles default -->
      
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
      <template #cell(name)="{ item }">
        <div class="flex items-center gap-3">
          <div class="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 text-sm font-bold shrink-0">
            {{ item.name.charAt(0).toUpperCase() }}
          </div>
          <span class="font-medium text-slate-800">{{ item.name }}</span>
        </div>
      </template>

      <template #cell(email)="{ value }">
        <span class="text-slate-600">{{ value }}</span>
      </template>

      <template #cell(roles)="{ value }">
        <div class="flex flex-wrap gap-1.5">
          <span
            v-for="role in value"
            :key="role.id"
            class="inline-flex items-center rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 border border-emerald-100"
          >
            {{ role.name }}
          </span>
          <span v-if="!value || value.length === 0" class="text-slate-400 text-xs italic">Tanpa Role</span>
        </div>
      </template>

      <template #cell(createdAt)="{ value }">
        <span class="text-slate-500 text-xs">{{ new Date(value).toLocaleDateString('id-ID') }}</span>
      </template>

      <!-- Actions Slot -->
      <template #actions="{ item }">
        <div class="flex items-center justify-end gap-2">
          <template v-if="statusTab === 'active'">
            <button
              @click="router.push(`/users/${item.id}/edit`)"
              class="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="Edit"
            >
              <Pencil class="h-4 w-4" />
            </button>
            <button
              @click="confirmDelete(item)"
              class="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
              title="Hapus"
            >
              <Trash2 class="h-4 w-4" />
            </button>
          </template>
          <template v-else>
            <button
              @click="restoreItem(item)"
              class="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="Restore"
            >
              <RotateCcw class="h-4 w-4" />
            </button>
            <button
              @click="confirmDelete(item)"
              class="p-1.5 text-rose-400 hover:text-rose-600 hover:bg-rose-100 rounded-lg transition-colors"
              title="Hapus Permanen"
            >
              <AlertTriangle class="h-4 w-4" />
            </button>
          </template>
        </div>
      </template>
    </DataTable>
  </div>
</template>

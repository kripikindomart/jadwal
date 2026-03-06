<script setup lang="ts">
import { ref, onMounted } from 'vue'
import api from '@/lib/api'
import { useToast } from '@/composables/useToast'
import { useConfirm } from '@/composables/useConfirm'
import ModalForm from '@/components/ui/ModalForm.vue'
import { Plus, Pencil, Trash2, Key } from 'lucide-vue-next'

const toast = useToast()
const confirm = useConfirm()

interface PermItem {
  id: number
  name: string
  slug: string
  group: string
}

const permissions = ref<PermItem[]>([])
const loading = ref(false)

// Modal form state
const isModalOpen = ref(false)
const isSubmitting = ref(false)
const editingId = ref<number | null>(null)
const form = ref({ name: '', slug: '', group: '' })

async function fetchPermissions() {
  loading.value = true
  try {
    const { data } = await api.get('/permissions')
    permissions.value = data
  } catch (err: any) {
    toast.error('Gagal mengambil data', err.response?.data?.message || err.message)
  } finally {
    loading.value = false
  }
}

function openCreateModal() {
  editingId.value = null
  form.value = { name: '', slug: '', group: '' }
  isModalOpen.value = true
}

function openEditModal(perm: PermItem) {
  editingId.value = perm.id
  form.value = { name: perm.name, slug: perm.slug, group: perm.group || '' }
  isModalOpen.value = true
}

async function handleSubmit() {
  isSubmitting.value = true
  try {
    if (editingId.value) {
      await api.patch(`/permissions/${editingId.value}`, form.value)
      toast.success('Berhasil', 'Permission berhasil diperbarui')
    } else {
      await api.post('/permissions', form.value)
      toast.success('Berhasil', 'Permission baru ditambahkan')
    }
    isModalOpen.value = false
    fetchPermissions()
  } catch (err: any) {
    toast.error('Gagal menyimpan', err.response?.data?.message || err.message)
  } finally {
    isSubmitting.value = false
  }
}

function deletePermission(perm: PermItem) {
  confirm.requireConfirm({
    title: 'Hapus Permission?',
    message: `Anda yakin ingin menghapus permission ${perm.name}? Akses user yang memiliki permission ini mungkin akan terpengaruh.`,
    style: 'danger',
    confirmText: 'Ya, Hapus',
    onConfirm: async () => {
      try {
        await api.delete(`/permissions/${perm.id}`)
        toast.success('Berhasil', 'Permission dihapus')
        fetchPermissions()
      } catch (err: any) {
        toast.error('Gagal menghapus', err.response?.data?.message || err.message)
      }
    }
  })
}

// Group by group name
function groupedPermissions() {
  const groups: Record<string, PermItem[]> = {}
  for (const p of permissions.value) {
    const g = p.group || 'Lainnya'
    if (!groups[g]) groups[g] = []
    groups[g].push(p)
  }
  return groups
}

onMounted(() => fetchPermissions())
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold tracking-tight text-slate-900">Manajemen Permission</h1>
        <p class="text-sm text-slate-500 mt-1">Kelola hak akses granular role sistem</p>
      </div>
      <button
        @click="openCreateModal"
        class="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 transition-colors"
      >
        <Plus class="h-4 w-4 mr-2" />
        Tambah Permission
      </button>
    </div>

    <!-- Permissions grouped -->
    <div v-if="loading" class="text-center py-12 text-slate-400">
      <div class="animate-pulse flex flex-col items-center">
        <div class="h-10 w-10 bg-slate-200 rounded-full mb-4"></div>
        <div class="h-4 w-32 bg-slate-200 rounded mb-2"></div>
      </div>
    </div>

    <div v-else-if="!permissions.length" class="text-center py-12 border-2 border-dashed border-slate-200 rounded-2xl bg-white">
      <Key class="h-10 w-10 text-slate-300 mx-auto mb-3" />
      <p class="text-slate-500 font-medium">Belum ada permission</p>
      <p class="text-slate-400 text-sm mt-1">Tambahkan permission baru untuk mulai mengatur hak akses.</p>
    </div>

    <div v-else class="grid grid-cols-1 lg:grid-cols-2 lg:items-start gap-4">
      <div
        v-for="(perms, group) in groupedPermissions()"
        :key="group"
        class="rounded-2xl bg-white shadow-sm border border-slate-100 overflow-hidden"
      >
        <div class="px-5 py-3 bg-slate-50/50 border-b border-slate-100 flex items-center gap-2">
          <Key class="h-4 w-4 text-emerald-600" />
          <h3 class="text-sm font-semibold text-slate-700 uppercase tracking-wide">{{ group }}</h3>
        </div>
        <div class="divide-y divide-slate-50">
          <div
            v-for="perm in perms"
            :key="perm.id"
            class="flex items-center justify-between px-5 py-3 hover:bg-slate-50/50 transition-colors group"
          >
            <div>
              <span class="font-medium text-slate-800 text-sm">{{ perm.name }}</span>
              <span class="ml-2 inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-mono font-medium text-slate-600">
                {{ perm.slug }}
              </span>
            </div>
            <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button @click="openEditModal(perm)" class="rounded-lg p-1.5 text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition-colors" title="Edit">
                <Pencil class="h-3.5 w-3.5" />
              </button>
              <button @click="deletePermission(perm)" class="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors" title="hapus">
                <Trash2 class="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Form Modal -->
    <ModalForm
      v-model="isModalOpen"
      :title="editingId ? 'Edit Permission' : 'Tambah Permission'"
      :loading="isSubmitting"
      @submit="handleSubmit"
    >
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-slate-700 mb-1">Nama Permission</label>
          <input
            v-model="form.name"
            type="text"
            required
            placeholder="Misal: Buat Tahun Akademik"
            class="w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          />
        </div>
        
        <div>
          <label class="block text-sm font-medium text-slate-700 mb-1">Slug (Sistem Internal)</label>
          <input
            v-model="form.slug"
            type="text"
            required
            placeholder="Misal: academic-years.create"
            class="w-full rounded-xl border border-slate-300 px-3 py-2 font-mono text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          />
          <p class="text-xs text-slate-400 mt-1">Format rekomendasi: <code>resource.action</code></p>
        </div>

        <div>
           <label class="block text-sm font-medium text-slate-700 mb-1">Grup (Kategori)</label>
            <input
              v-model="form.group"
              type="text"
              placeholder="Misal: Academic Master Data"
              class="w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
        </div>
      </div>
    </ModalForm>
  </div>
</template>

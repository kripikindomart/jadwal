<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from '@/composables/useToast'
import { useConfirm } from '@/composables/useConfirm'
import api from '@/lib/api'
import ModalForm from '@/components/ui/ModalForm.vue'
import { Plus, Edit2, Trash2, Copy, Eye, ClipboardList, Link as LinkIcon } from 'lucide-vue-next'

const router = useRouter()
const toast = useToast()
const confirm = useConfirm()

const loading = ref(false)
const instruments = ref<any[]>([])
const semesters = ref<any[]>([])
const isModalOpen = ref(false)
const actionType = ref<'create' | 'edit'>('create')
const selectedItem = ref<any>(null)

const form = ref({
  title: '',
  description: '',
  semesterId: '' as string | number,
  isActive: true,
})

const fetchData = async () => {
  loading.value = true
  try {
    const [instrRes, semRes] = await Promise.all([
      api.get('/surveys'),
      api.get('/semesters'),
    ])
    instruments.value = instrRes.data
    semesters.value = semRes.data?.data || semRes.data || []
  } catch (e: any) {
    toast.error('Gagal memuat data')
  } finally {
    loading.value = false
  }
}

const openModal = (type: 'create' | 'edit', item?: any) => {
  actionType.value = type
  if (type === 'edit' && item) {
    selectedItem.value = item
    form.value = {
      title: item.title,
      description: item.description || '',
      semesterId: item.semesterId || '',
      isActive: item.isActive,
    }
  } else {
    selectedItem.value = null
    form.value = { title: '', description: '', semesterId: '', isActive: true }
  }
  isModalOpen.value = true
}

const handleSubmit = async () => {
  try {
    loading.value = true
    const payload: any = {
      title: form.value.title,
      description: form.value.description || null,
      semesterId: form.value.semesterId ? Number(form.value.semesterId) : null,
      isActive: form.value.isActive,
    }
    if (actionType.value === 'create') {
      await api.post('/surveys', payload)
      toast.success('Instrumen survei berhasil dibuat')
    } else {
      await api.patch(`/surveys/${selectedItem.value.id}`, payload)
      toast.success('Instrumen survei berhasil diperbarui')
    }
    isModalOpen.value = false
    await fetchData()
  } catch (e: any) {
    toast.error(e.response?.data?.message || 'Gagal menyimpan')
  } finally {
    loading.value = false
  }
}

const deleteInstrument = (item: any) => {
  confirm.requireConfirm({
    title: 'Hapus Instrumen',
    message: `Hapus "${item.title}"? Semua pertanyaan dan response akan ikut terhapus.`,
    confirmText: 'Ya, Hapus',
    cancelText: 'Batal',
    onConfirm: async () => {
      try {
        await api.delete(`/surveys/${item.id}`)
        toast.success('Instrumen berhasil dihapus')
        await fetchData()
      } catch (e: any) {
        toast.error(e.response?.data?.message || 'Gagal menghapus')
      }
    },
  })
}

const duplicateInstrument = async (item: any) => {
  try {
    await api.post(`/surveys/${item.id}/duplicate`)
    toast.success('Instrumen berhasil diduplikasi')
    await fetchData()
  } catch (e: any) {
    toast.error(e.response?.data?.message || 'Gagal menduplikasi')
  }
}

const copySurveyLink = (item: any) => {
  if (!item.isActive) {
    toast.warning('Aktifkan survei terlebih dahulu agar mahasiswa bisa mengaksesnya')
    return
  }
  
  const identifier = item.publicUrlHash || item.id
  const baseUrl = import.meta.env.VITE_SURVEY_PORTAL_URL || window.location.origin
  const url = `${baseUrl}/survey/s/${identifier}`
  
  navigator.clipboard.writeText(url)
    .then(() => toast.success('Link halaman survei mahasiswa berhasil disalin'))
    .catch(() => toast.error('Gagal menyalin link'))
}

onMounted(fetchData)
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 flex items-center gap-3">
          <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 text-white">
            <ClipboardList class="w-5 h-5" />
          </div>
          EDOM / Survei
        </h1>
        <p class="text-sm text-gray-500 mt-1">Kelola instrumen evaluasi dosen oleh mahasiswa</p>
      </div>
      <button
        @click="openModal('create')"
        class="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white px-4 py-2.5 rounded-xl flex items-center gap-2 font-medium text-sm shadow-lg shadow-purple-200 transition-all"
      >
        <Plus class="w-4 h-4" /> Buat Instrumen
      </button>
    </div>

    <!-- Table -->
    <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div v-if="loading && instruments.length === 0" class="p-12 text-center text-gray-500">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-3"></div>
        Memuat data...
      </div>
      <div v-else-if="instruments.length === 0" class="p-12 text-center text-gray-500">
        <ClipboardList class="w-12 h-12 mx-auto mb-3 text-gray-300" />
        <p class="font-medium">Belum ada instrumen survei</p>
        <p class="text-sm mt-1">Klik "Buat Instrumen" untuk membuat instrumen pertama.</p>
      </div>
      <table v-else class="w-full text-left text-sm">
        <thead class="bg-gray-50 text-gray-600 border-b border-gray-100">
          <tr>
            <th class="px-6 py-3.5 font-medium">Judul Instrumen</th>
            <th class="px-6 py-3.5 font-medium">Semester</th>
            <th class="px-6 py-3.5 font-medium text-center">Pertanyaan</th>
            <th class="px-6 py-3.5 font-medium text-center">Responden</th>
            <th class="px-6 py-3.5 font-medium text-center">Status</th>
            <th class="px-6 py-3.5 font-medium text-right">Aksi</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
          <tr v-for="item in instruments" :key="item.id" class="hover:bg-gray-50/50 transition-colors">
            <td class="px-6 py-4">
              <p class="font-semibold text-gray-900">{{ item.title }}</p>
              <p v-if="item.description" class="text-xs text-gray-500 mt-0.5 line-clamp-1">{{ item.description }}</p>
            </td>
            <td class="px-6 py-4 text-gray-600">{{ item.semester?.name || '-' }}</td>
            <td class="px-6 py-4 text-center">
              <span class="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs font-medium">{{ item.questionCount || 0 }}</span>
            </td>
            <td class="px-6 py-4 text-center">
              <span class="bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full text-xs font-medium">{{ item.responseCount || 0 }}</span>
            </td>
            <td class="px-6 py-4 text-center">
              <span :class="item.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'" class="px-2 py-0.5 rounded-full text-xs font-semibold">
                {{ item.isActive ? 'Aktif' : 'Nonaktif' }}
              </span>
            </td>
            <td class="px-6 py-4">
              <div class="flex items-center justify-end gap-1">
                <button @click="router.push(`/surveys/${item.id}/builder`)" class="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors" title="Edit Pertanyaan">
                  <Edit2 class="w-4 h-4" />
                </button>
                <button @click="router.push(`/surveys/${item.id}/results`)" class="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Lihat Hasil">
                  <Eye class="w-4 h-4" />
                </button>
                <button @click="copySurveyLink(item)" class="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" title="Salin Link Bagikan">
                  <LinkIcon class="w-4 h-4" />
                </button>
                <button @click="duplicateInstrument(item)" class="p-2 text-gray-500 hover:bg-gray-50 rounded-lg transition-colors" title="Duplikat">
                  <Copy class="w-4 h-4" />
                </button>
                <button @click="deleteInstrument(item)" class="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Hapus">
                  <Trash2 class="w-4 h-4" />
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Modal Create/Edit -->
    <ModalForm
      :modelValue="isModalOpen"
      @update:modelValue="isModalOpen = $event"
      :title="actionType === 'create' ? 'Buat Instrumen Survei' : 'Edit Instrumen Survei'"
      :submitText="actionType === 'create' ? 'Buat' : 'Simpan'"
      :loading="loading"
      @submit="handleSubmit"
      size="md"
    >
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Judul Instrumen *</label>
          <input v-model="form.title" type="text" required placeholder="Contoh: EDOM Semester Ganjil 2025/2026"
            class="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-purple-500" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Deskripsi</label>
          <textarea v-model="form.description" rows="3" placeholder="Petunjuk pengisian untuk mahasiswa..."
            class="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-purple-500" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Semester</label>
          <select v-model="form.semesterId" class="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-purple-500">
            <option value="">Semua Semester</option>
            <option v-for="s in semesters" :key="s.id" :value="s.id">{{ s.name }}</option>
          </select>
        </div>
        <div class="flex items-center gap-2">
          <input type="checkbox" v-model="form.isActive" id="isActive" class="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500" />
          <label for="isActive" class="text-sm text-gray-700">Aktif (mahasiswa bisa mengisi)</label>
        </div>
      </div>
    </ModalForm>
  </div>
</template>

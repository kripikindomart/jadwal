<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from '@/composables/useToast'
import { useConfirm } from '@/composables/useConfirm'
import api from '@/lib/api'
import ModalForm from '@/components/ui/ModalForm.vue'
import { Plus, Pencil, Trash2, Printer } from 'lucide-vue-next'

const router = useRouter()
const toast = useToast()
const confirm = useConfirm()

const templates = ref<any[]>([])
const loading = ref(false)
const isModalOpen = ref(false)
const actionType = ref<'create' | 'edit'>('create')
const selectedItem = ref<any>(null)

const form = ref({
  title: '',
})

const fetchData = async () => {
  loading.value = true
  try {
    const res = await api.get('/letters/templates')
    templates.value = res.data
  } catch (e) {
    toast.error('Gagal memuat data template surat.')
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
    }
  } else {
    selectedItem.value = null
    form.value = { title: '' }
  }
  isModalOpen.value = true
}

const handleSubmit = async () => {
  loading.value = true
  try {
    if (actionType.value === 'create') {
      const res = await api.post('/letters/templates', form.value)
      toast.success('Template surat berhasil dibuat!')
      isModalOpen.value = false
      router.push({ name: 'letters.templates.editor', params: { id: res.data.id } })
    } else {
      await api.patch(`/letters/templates/${selectedItem.value.id}`, form.value)
      toast.success('Template surat berhasil diperbarui!')
      isModalOpen.value = false
      await fetchData()
    }
  } catch (e: any) {
    toast.error(e.response?.data?.message || 'Gagal menyimpan data.')
    loading.value = false
  }
}

const deleteTemplate = (item: any) => {
  confirm.requireConfirm({
    title: 'Hapus Template',
    message: `Apakah Anda yakin ingin menghapus "${item.title}"?`,
    confirmText: 'Hapus',
    async onConfirm() {
      try {
        await api.delete(`/letters/templates/${item.id}`)
        toast.success('Template berhasil dihapus!')
        await fetchData()
      } catch (e: any) {
        toast.error(e.response?.data?.message || 'Gagal menghapus data.')
      }
    },
  })
}

onMounted(fetchData)
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 flex items-center gap-3">
          <Printer class="w-7 h-7 text-indigo-600" />
          Template Cetak Surat
        </h1>
        <p class="text-sm text-gray-500 mt-1">Kelola format Master dokumen surat menggunakan WYSIWYG Editor.</p>
      </div>
      <div class="flex gap-2">
        <button @click="openModal('create')"
          class="px-4 py-2.5 text-sm font-semibold rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition-colors flex items-center gap-2 shadow-sm">
          <Plus class="w-4 h-4" /> Buat Template Baru
        </button>
      </div>
    </div>

    <!-- Table -->
    <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div v-if="loading && templates.length === 0" class="p-12 text-center text-gray-500">
        <div class="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-3"></div>
        Memuat data...
      </div>
      <div v-else-if="templates.length === 0" class="p-12 text-center text-gray-400">
        <Printer class="w-12 h-12 mx-auto mb-3 text-gray-300" />
        <p class="font-medium">Belum ada Template</p>
        <p class="text-sm mt-1">Klik "Buat Template Baru" untuk memulai.</p>
      </div>
      <table v-else class="w-full text-left text-sm">
        <thead class="bg-gray-50 text-gray-600 border-b border-gray-100">
          <tr>
            <th class="px-6 py-3.5 font-medium">Judul Template</th>
            <th class="px-6 py-3.5 font-medium text-right">Aksi</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
          <tr v-for="item in templates" :key="item.id" class="hover:bg-gray-50/50 transition-colors">
            <td class="px-6 py-4">
              <p class="font-semibold text-gray-900">{{ item.title }}</p>
            </td>
            <td class="px-6 py-4">
              <div class="flex items-center justify-end gap-1">
                <button @click="openModal('edit', item)" class="p-2 text-orange-500 hover:bg-orange-50 rounded-lg transition-colors" title="Edit Judul">
                  <Pencil class="w-4 h-4" />
                </button>
                <button @click="router.push({ name: 'letters.templates.editor', params: { id: item.id } })" class="px-3 py-1.5 ml-2 text-xs font-bold rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-200 hover:bg-indigo-100 transition-colors" title="Desain Format HTML">
                  <Printer class="w-3.5 h-3.5 inline mr-1" /> Desain Surat
                </button>
                <button @click="deleteTemplate(item)" class="p-2 ml-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Hapus">
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
      :title="actionType === 'create' ? 'Buat Template Surat' : 'Edit Judul Template'"
      :submitText="actionType === 'create' ? 'Buat & Desain' : 'Simpan'"
      :loading="loading"
      @submit="handleSubmit"
      size="md"
    >
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Judul Template *</label>
          <input v-model="form.title" type="text" required placeholder="Contoh: Template Blanko Keterangan Aktif"
            class="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm" />
        </div>
      </div>
    </ModalForm>
  </div>
</template>

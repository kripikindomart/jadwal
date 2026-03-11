<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from '@/composables/useToast'
import { useConfirm } from '@/composables/useConfirm'
import api from '@/lib/api'
import ModalForm from '@/components/ui/ModalForm.vue'
import { Plus, Pencil, Trash2, Mail, FileText, Settings, Link2, Printer } from 'lucide-vue-next'

const router = useRouter()
const toast = useToast()
const confirm = useConfirm()

const letterTypes = ref<any[]>([])
const loading = ref(false)
const isModalOpen = ref(false)
const actionType = ref<'create' | 'edit'>('create')
const selectedItem = ref<any>(null)

// Template Linker State
const isTemplateModalOpen = ref(false)
const templateForm = ref({
  id: 0,
  templateId: null as number | null,
  variableMapping: {} as Record<string, string>
})
const availableTemplates = ref<any[]>([])
const availableTags = ref<string[]>([])
const formFields = ref<any[]>([])

const form = ref({
  title: '',
  description: '',
  isActive: true,
  allowPreview: false,
})

const fetchData = async () => {
  loading.value = true
  try {
    const res = await api.get('/letters/types')
    letterTypes.value = res.data
    const tmpRes = await api.get('/letters/templates')
    availableTemplates.value = tmpRes.data
  } catch (e) {
    toast.error('Gagal memuat data jenis surat.')
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
      isActive: item.isActive,
      allowPreview: !!item.allowPreview,
    }
  } else {
    selectedItem.value = null
    form.value = { title: '', description: '', isActive: true, allowPreview: false }
  }
  isModalOpen.value = true
}

const handleSubmit = async () => {
  loading.value = true
  try {
    if (actionType.value === 'create') {
      await api.post('/letters/types', form.value)
      toast.success('Jenis surat berhasil dibuat!')
    } else {
      await api.patch(`/letters/types/${selectedItem.value.id}`, form.value)
      toast.success('Jenis surat berhasil diperbarui!')
    }
    isModalOpen.value = false
    await fetchData()
  } catch (e: any) {
    toast.error(e.response?.data?.message || 'Gagal menyimpan data.')
  } finally {
    loading.value = false
  }
}

const extractTagsFromHtml = (html?: string) => {
  if (!html) return []
  const matches = html.match(/\[(.*?)\]/g) || []
  return [...new Set(matches)]
}

const openTemplateModal = (item: any) => {
  templateForm.value = {
    id: item.id,
    templateId: item.template?.id || null,
    variableMapping: item.variableMapping || {}
  }
  formFields.value = item.fields || []
  
  if (item.template?.htmlContent) {
    availableTags.value = extractTagsFromHtml(item.template.htmlContent)
  } else {
    availableTags.value = []
  }
  
  isTemplateModalOpen.value = true
}

const handleTemplateChange = () => {
  const selectedTpl = availableTemplates.value.find(t => t.id === templateForm.value.templateId)
  if (selectedTpl && selectedTpl.htmlContent) {
    availableTags.value = extractTagsFromHtml(selectedTpl.htmlContent)
  } else {
    availableTags.value = []
  }
}

const saveTemplate = async () => {
  loading.value = true
  try {
    const payload = { 
      templateId: templateForm.value.templateId,
      variableMapping: templateForm.value.variableMapping
    }
    await api.patch(`/letters/types/${templateForm.value.id}`, payload)
    toast.success('Template surat dan pemetaan berhasil disimpan!')
    isTemplateModalOpen.value = false
    await fetchData()
  } catch (e: any) {
    toast.error(e.response?.data?.message || 'Gagal menyimpan template.')
  } finally {
    loading.value = false
  }
}

const deleteType = (item: any) => {
  confirm.requireConfirm({
    title: 'Hapus Jenis Surat',
    message: `Apakah Anda yakin ingin menghapus "${item.title}"? Semua pengajuan terkait juga akan dihapus.`,
    confirmText: 'Hapus',
    async onConfirm() {
      try {
        await api.delete(`/letters/types/${item.id}`)
        toast.success('Jenis surat berhasil dihapus!')
        await fetchData()
      } catch (e: any) {
        toast.error(e.response?.data?.message || 'Gagal menghapus data.')
      }
    },
  })
}

const copyPortalLink = () => {
  const url = `${window.location.origin}/layanan-surat`
  navigator.clipboard.writeText(url)
  toast.success('Link portal berhasil disalin: ' + url)
}

onMounted(fetchData)
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 flex items-center gap-3">
          <Mail class="w-7 h-7 text-indigo-600" />
          Layanan Surat Menyurat
        </h1>
        <p class="text-sm text-gray-500 mt-1">Kelola jenis surat dan form pengajuan</p>
      </div>
      <div class="flex gap-2">
        <button @click="copyPortalLink"
          class="px-4 py-2.5 text-sm font-semibold rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 transition-colors flex items-center gap-2 shadow-sm">
          <Link2 class="w-4 h-4" /> Link Portal
        </button>
        <button @click="router.push({ name: 'letters.requests' })"
          class="px-4 py-2.5 text-sm font-semibold rounded-xl bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2 shadow-sm">
          <FileText class="w-4 h-4" /> Inbox Pengajuan
        </button>
        <button @click="openModal('create')"
          class="px-4 py-2.5 text-sm font-semibold rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition-colors flex items-center gap-2 shadow-sm">
          <Plus class="w-4 h-4" /> Buat Jenis Surat
        </button>
      </div>
    </div>

    <!-- Table -->
    <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div v-if="loading && letterTypes.length === 0" class="p-12 text-center text-gray-500">
        <div class="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-3"></div>
        Memuat data...
      </div>
      <div v-else-if="letterTypes.length === 0" class="p-12 text-center text-gray-400">
        <Mail class="w-12 h-12 mx-auto mb-3 text-gray-300" />
        <p class="font-medium">Belum ada jenis surat</p>
        <p class="text-sm mt-1">Klik "Buat Jenis Surat" untuk membuat yang pertama.</p>
      </div>
      <table v-else class="w-full text-left text-sm">
        <thead class="bg-gray-50 text-gray-600 border-b border-gray-100">
          <tr>
            <th class="px-6 py-3.5 font-medium">Judul</th>
            <th class="px-6 py-3.5 font-medium">Deskripsi</th>
            <th class="px-6 py-3.5 font-medium text-center">Fields</th>
            <th class="px-6 py-3.5 font-medium text-center">Status</th>
            <th class="px-6 py-3.5 font-medium text-right">Aksi</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
          <tr v-for="item in letterTypes" :key="item.id" class="hover:bg-gray-50/50 transition-colors">
            <td class="px-6 py-4">
              <p class="font-semibold text-gray-900">{{ item.title }}</p>
            </td>
            <td class="px-6 py-4 text-gray-500 max-w-xs truncate">{{ item.description || '-' }}</td>
            <td class="px-6 py-4 text-center">
              <span class="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700">
                {{ item.fields?.length || 0 }} field
              </span>
            </td>
            <td class="px-6 py-4 text-center">
              <span :class="item.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'"
                class="px-2.5 py-1 rounded-full text-xs font-bold">
                {{ item.isActive ? 'Aktif' : 'Nonaktif' }}
              </span>
            </td>
            <td class="px-6 py-4">
              <div class="flex items-center justify-end gap-1">
                <button @click="openModal('edit', item)" class="p-2 text-orange-500 hover:bg-orange-50 rounded-lg transition-colors" title="Edit Data Surat">
                  <Pencil class="w-4 h-4" />
                </button>
                <button @click="router.push({ name: 'letters.builder', params: { id: item.id } })" class="p-2 text-indigo-500 hover:bg-indigo-50 rounded-lg transition-colors" title="Edit Form Request">
                  <Settings class="w-4 h-4" />
                </button>
                <button @click="openTemplateModal(item)" class="p-2 text-teal-500 hover:bg-teal-50 rounded-lg transition-colors" title="Pilih Template Cetak Surat">
                  <Printer class="w-4 h-4" />
                </button>
                <button @click="deleteType(item)" class="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Hapus">
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
      :title="actionType === 'create' ? 'Buat Jenis Surat' : 'Edit Jenis Surat'"
      :submitText="actionType === 'create' ? 'Buat' : 'Simpan'"
      :loading="loading"
      @submit="handleSubmit"
      size="md"
    >
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Judul Surat *</label>
          <input v-model="form.title" type="text" required placeholder="Contoh: Surat Keterangan Aktif Kuliah"
            class="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm" />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Deskripsi / Persyaratan</label>
          <textarea v-model="form.description" rows="3" placeholder="Jelaskan persyaratan atau keterangan surat ini..."
            class="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm resize-y"></textarea>
        </div>
        <div class="space-y-3">
          <div class="flex items-center gap-3 border bg-gray-50 p-3 rounded-xl border-gray-200">
            <input type="checkbox" v-model="form.isActive" id="letter-active" class="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500" />
            <div class="flex-1">
              <label for="letter-active" class="text-sm font-bold text-gray-700 cursor-pointer block">Aktif</label>
              <p class="text-xs text-gray-500">Bisa diajukan oleh pemohon/mahasiswa di portal</p>
            </div>
          </div>
          <div class="flex items-center gap-3 border bg-gray-50 p-3 rounded-xl border-gray-200">
            <input type="checkbox" v-model="form.allowPreview" id="letter-preview" class="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500" />
            <div class="flex-1">
              <label for="letter-preview" class="text-sm font-bold text-gray-700 cursor-pointer block">Fitur Live Preview (Public)</label>
              <p class="text-xs text-gray-500">Jika aktif, pemohon bisa melihat pratinjau surat saat mengisi form</p>
            </div>
          </div>
        </div>
      </div>
    </ModalForm>

    <!-- Template Linker Modal -->
    <ModalForm
      :modelValue="isTemplateModalOpen"
      @update:modelValue="isTemplateModalOpen = $event"
      title="Pilih Template Cetak Surat"
      submitText="Simpan Konfigurasi"
      :loading="loading"
      @submit="saveTemplate"
      size="md"
    >
      <div class="space-y-4">
        <div class="bg-blue-50 border border-blue-200 p-4 rounded-xl text-sm text-blue-800">
          <p class="font-medium text-blue-900 mb-1">Hubungkan form pengajuan ini dengan Master Template Cetak.</p>
          <p>Jika pengajuan disetujui, tombol Cetak akan merender format dokumen tersebut.</p>
        </div>
        
        <div>
          <label class="block text-sm font-bold text-gray-700 mb-2">Master Template Dokumen</label>
          <select v-model="templateForm.templateId" @change="handleTemplateChange" class="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm bg-white">
            <option :value="null">-- Tidak Terhubung ke Template --</option>
            <option v-for="tpl in availableTemplates" :key="tpl.id" :value="tpl.id">
              {{ tpl.title }}
            </option>
          </select>
          <p class="text-xs text-gray-500 mt-2">
            Belum ada template? Buat dulu di menu 
            <button type="button" @click="router.push({name: 'letters.templates'})" class="text-indigo-600 hover:underline">Template Surat</button>.
          </p>
        </div>

        <div v-if="templateForm.templateId && availableTags.length > 0" class="mt-6 border-t border-gray-200 pt-4">
          <label class="block text-sm font-bold text-gray-700 mb-2">Pemetaan Variabel Dinamis (Mapping)</label>
          <p class="text-xs text-gray-500 mb-4">Pilih input field form mana yang akan mengisi teks variabel di Template Cetak.</p>
          
          <div class="space-y-3">
            <div v-for="tag in availableTags" :key="tag" class="flex items-center gap-3 bg-gray-50 p-3 rounded-lg border border-gray-200">
              <div class="w-1/3 text-sm font-mono font-medium text-indigo-700 break-all">{{ tag }}</div>
              <div class="w-2/3">
                <select v-model="templateForm.variableMapping[tag]" class="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm bg-white">
                  <option value="">-- Abaikan (Teks Tetap / Default NIM/Nama) --</option>
                  <option v-for="field in formFields" :key="field.id" :value="field.id">
                    [Form Field] {{ field.label }}
                  </option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ModalForm>
  </div>
</template>

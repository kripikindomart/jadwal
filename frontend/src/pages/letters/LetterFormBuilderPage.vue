<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useToast } from '@/composables/useToast'
import api from '@/lib/api'
import { ArrowLeft, Trash2, GripVertical, Save, Type, FileText, Calendar, List, Upload, Mail, Phone, Hash } from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()
const toast = useToast()

const letterTypeId = route.params.id as string
const letterType = ref<any>(null)
const loading = ref(true)
const saving = ref(false)

interface FormField {
  id: string
  label: string
  type: string
  required: boolean
  placeholder?: string
  options?: string[]
  allowedExtensions?: string // For file upload
  maxSize?: number // Max size in MB
}

const fields = ref<FormField[]>([])

const fieldTypes = [
  { value: 'text', label: 'Teks Singkat', icon: Type },
  { value: 'textarea', label: 'Teks Panjang', icon: FileText },
  { value: 'number', label: 'Angka', icon: Hash },
  { value: 'date', label: 'Tanggal', icon: Calendar },
  { value: 'select', label: 'Pilihan (Dropdown)', icon: List },
  { value: 'email', label: 'Email', icon: Mail },
  { value: 'phone', label: 'No. Telepon', icon: Phone },
  { value: 'file', label: 'Upload File', icon: Upload },
]

const generateId = () => 'field_' + Math.random().toString(36).substring(2, 8)

const addField = (type: string) => {
  const typeInfo = fieldTypes.find(f => f.value === type)
  fields.value.push({
    id: generateId(),
    label: typeInfo?.label || 'Field Baru',
    type,
    required: false,
    placeholder: '',
    options: type === 'select' ? ['Pilihan 1', 'Pilihan 2'] : undefined,
    allowedExtensions: type === 'file' ? '.pdf,.jpg,.jpeg,.png,.doc,.docx' : undefined,
    maxSize: type === 'file' ? 2 : undefined,
  })
}

const removeField = (index: number) => {
  fields.value.splice(index, 1)
}

const addOption = (fieldIndex: number) => {
  const field = fields.value[fieldIndex]
  if (field?.options) {
    field.options.push('Pilihan ' + (field.options.length + 1))
  }
}

const removeOption = (fieldIndex: number, optIndex: number) => {
  const field = fields.value[fieldIndex]
  if (field?.options && field.options.length > 1) {
    field.options.splice(optIndex, 1)
  }
}

const moveField = (index: number, direction: 'up' | 'down') => {
  const newIndex = direction === 'up' ? index - 1 : index + 1
  if (newIndex < 0 || newIndex >= fields.value.length) return
  const removed = fields.value.splice(index, 1)
  fields.value.splice(newIndex, 0, removed[0]!)
}

const changeFieldType = (index: number, newType: string) => {
  const field = fields.value[index]
  if (!field) return
  // Reset type-specific properties
  if (newType === 'select') {
    field.options = field.options || ['Pilihan 1', 'Pilihan 2']
    field.allowedExtensions = undefined
    field.maxSize = undefined
  } else if (newType === 'file') {
    field.options = undefined
    field.allowedExtensions = field.allowedExtensions || '.pdf,.jpg,.jpeg,.png,.doc,.docx'
    field.maxSize = field.maxSize || 2
  } else {
    field.options = undefined
    field.allowedExtensions = undefined
    field.maxSize = undefined
  }
}

const saveFields = async () => {
  saving.value = true
  try {
    await api.patch(`/letters/types/${letterTypeId}`, { fields: fields.value })
    toast.success('Form berhasil disimpan!')
  } catch (e: any) {
    toast.error(e.response?.data?.message || 'Gagal menyimpan form.')
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  try {
    const res = await api.get(`/letters/types/${letterTypeId}`)
    letterType.value = res.data
    fields.value = res.data.fields || []
  } catch (e) {
    toast.error('Gagal memuat data jenis surat.')
    router.push({ name: 'letters.types' })
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-3">
        <button @click="router.push({ name: 'letters.types' })"
          class="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft class="w-5 h-5 text-gray-500" />
        </button>
        <div>
          <h1 class="text-2xl font-bold text-gray-900">Form Builder</h1>
          <p class="text-sm text-gray-500 mt-0.5">{{ letterType?.title || 'Memuat...' }}</p>
        </div>
      </div>
      <button @click="saveFields" :disabled="saving"
        class="px-5 py-2.5 text-sm font-semibold rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition-colors flex items-center gap-2 shadow-sm disabled:opacity-60">
        <Save class="w-4 h-4" />
        {{ saving ? 'Menyimpan...' : 'Simpan Form' }}
      </button>
    </div>

    <div v-if="loading" class="p-12 text-center text-gray-500">
      <div class="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-3"></div>
      Memuat...
    </div>

    <div v-else class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Field Palette -->
      <div class="lg:col-span-1">
        <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sticky top-24">
          <h3 class="text-sm font-bold text-gray-700 uppercase tracking-wider mb-3">Tambah Field</h3>
          <div class="grid grid-cols-2 gap-2">
            <button v-for="ft in fieldTypes" :key="ft.value" @click="addField(ft.value)"
              class="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 transition-all text-center group">
              <component :is="ft.icon" class="w-5 h-5 text-gray-400 group-hover:text-indigo-600" />
              <span class="text-[11px] font-medium text-gray-600 group-hover:text-indigo-700">{{ ft.label }}</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Form Preview / Editor -->
      <div class="lg:col-span-2 space-y-4">
        <div v-if="fields.length === 0"
          class="bg-white rounded-xl shadow-sm border-2 border-dashed border-gray-200 p-12 text-center text-gray-400">
          <FileText class="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p class="font-medium">Form masih kosong</p>
          <p class="text-sm mt-1">Klik tombol di panel kiri untuk menambahkan field.</p>
        </div>

        <div v-for="(field, idx) in fields" :key="field.id"
          class="bg-white rounded-xl shadow-sm border border-gray-100 p-5 group hover:border-indigo-200 transition-colors">
          <div class="flex items-start gap-3">
            <!-- Drag Handle & Order -->
            <div class="flex flex-col items-center gap-1 pt-1">
              <button @click="moveField(idx, 'up')" :disabled="idx === 0"
                class="p-1 text-gray-300 hover:text-gray-600 disabled:opacity-30">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7"/></svg>
              </button>
              <GripVertical class="w-4 h-4 text-gray-300" />
              <button @click="moveField(idx, 'down')" :disabled="idx === fields.length - 1"
                class="p-1 text-gray-300 hover:text-gray-600 disabled:opacity-30">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
              </button>
            </div>

            <!-- Field Configuration -->
            <div class="flex-1 space-y-3">
              <div class="flex items-center gap-3">
                <select v-model="field.type" @change="changeFieldType(idx, field.type)"
                  class="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md uppercase border border-indigo-200 cursor-pointer hover:bg-indigo-100 focus:ring-2 focus:ring-indigo-500 focus:outline-none">
                  <option v-for="ft in fieldTypes" :key="ft.value" :value="ft.value">{{ ft.label }}</option>
                </select>
                <span class="text-xs text-gray-400">#{{ idx + 1 }}</span>
              </div>

              <input v-model="field.label" type="text" placeholder="Label field..."
                class="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm font-medium" />

              <input v-model="field.placeholder" type="text" placeholder="Placeholder (opsional)..."
                class="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-1 focus:ring-gray-300 text-sm text-gray-500" />

              <!-- Options for Select type -->
              <div v-if="field.type === 'select' && field.options" class="space-y-2 pl-4 border-l-2 border-indigo-100">
                <p class="text-xs font-bold text-gray-500 uppercase">Pilihan:</p>
                <div v-for="(_opt, oIdx) in field.options" :key="oIdx" class="flex items-center gap-2">
                  <input v-model="field.options[oIdx]" type="text"
                    class="flex-1 px-3 py-1.5 rounded-lg border border-gray-200 text-sm" />
                  <button @click="removeOption(idx, oIdx)" class="p-1 text-red-400 hover:text-red-600">
                    <Trash2 class="w-3.5 h-3.5" />
                  </button>
                </div>
                <button @click="addOption(idx)" class="text-xs text-indigo-600 font-semibold hover:underline">+ Tambah Pilihan</button>
              </div>

                <!-- Options for File Upload type -->
              <div v-if="field.type === 'file'" class="grid grid-cols-1 sm:grid-cols-2 gap-4 pl-4 border-l-2 border-indigo-100 pb-2">
                <div>
                  <label class="block text-xs font-bold text-gray-500 mb-2">Jenis File Diizinkan</label>
                  <div class="flex flex-wrap gap-2">
                    <button @click="() => {
                      const exts = field.allowedExtensions?.split(',') || [];
                      const hasPdf = exts.includes('.pdf');
                      if (hasPdf) field.allowedExtensions = exts.filter(e => e !== '.pdf').join(',');
                      else field.allowedExtensions = [...exts, '.pdf'].join(',');
                    }" :class="field.allowedExtensions?.includes('.pdf') ? 'bg-indigo-100 text-indigo-700 border-indigo-300' : 'bg-white text-gray-500 border-gray-200'" class="px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors">
                      PDF
                    </button>
                    <button @click="() => {
                      const current = field.allowedExtensions?.split(',') || [];
                      const imgs = ['.jpg', '.jpeg', '.png'];
                      const hasImg = imgs.some(i => current.includes(i));
                      if (hasImg) field.allowedExtensions = current.filter(e => !imgs.includes(e)).join(',');
                      else field.allowedExtensions = [...new Set([...current, ...imgs])].join(',');
                    }" :class="field.allowedExtensions?.includes('.jpg') ? 'bg-indigo-100 text-indigo-700 border-indigo-300' : 'bg-white text-gray-500 border-gray-200'" class="px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors">
                      Gambar (JPG/PNG)
                    </button>
                    <button @click="() => {
                      const current = field.allowedExtensions?.split(',') || [];
                      const docs = ['.doc', '.docx'];
                      const hasDoc = docs.some(i => current.includes(i));
                      if (hasDoc) field.allowedExtensions = current.filter(e => !docs.includes(e)).join(',');
                      else field.allowedExtensions = [...new Set([...current, ...docs])].join(',');
                    }" :class="field.allowedExtensions?.includes('.doc') ? 'bg-indigo-100 text-indigo-700 border-indigo-300' : 'bg-white text-gray-500 border-gray-200'" class="px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors">
                      Word (DOC/DOCX)
                    </button>
                  </div>
                  <p v-if="!field.allowedExtensions" class="text-xs text-red-500 mt-1">Pilih minimal 1 jenis file.</p>
                </div>
                <div>
                  <label class="block text-xs font-bold text-gray-500 mb-1">Maks Ukuran File (MB)</label>
                  <input v-model="field.maxSize" type="number" min="1" max="10"
                    class="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm" />
                </div>
              </div>

              <div class="flex items-center gap-3">
                <input type="checkbox" v-model="field.required" :id="'req-'+field.id"
                  class="w-4 h-4 text-indigo-600 rounded border-gray-300" />
                <label :for="'req-'+field.id" class="text-sm text-gray-600">Wajib diisi</label>
              </div>
            </div>

            <!-- Delete button -->
            <button @click="removeField(idx)"
              class="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100">
              <Trash2 class="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

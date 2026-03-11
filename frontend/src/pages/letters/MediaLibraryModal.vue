<script setup lang="ts">
import { ref, watch } from 'vue'
import { X, Upload, Image as ImageIcon, Check } from 'lucide-vue-next'
import api from '@/lib/api'
import { useToast } from '@/composables/useToast'

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'select', url: string): void
}>()

const toast = useToast()

const activeTab = ref<'upload' | 'library'>('library')
const mediaFiles = ref<any[]>([])
const loading = ref(false)
const uploading = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)
const selectedUrl = ref('')

const fetchMedia = async () => {
  loading.value = true
  try {
    const res = await api.get('/letters/media')
    mediaFiles.value = res.data
  } catch (e) {
    toast.error('Gagal memuat pustaka media')
  } finally {
    loading.value = false
  }
}

watch(() => props.modelValue, (val) => {
  if (val) {
    fetchMedia()
    activeTab.value = 'library'
    selectedUrl.value = ''
  }
})

const handleUpload = async (e: Event) => {
  const target = e.target as HTMLInputElement
  if (!target.files?.length) return
  
  const file = target.files[0]
  if (!file) return

  if (file.size > 5 * 1024 * 1024) {
    toast.error('Ukuran maksimal 5MB')
    return
  }

  uploading.value = true
  try {
    const formData = new FormData()
    formData.append('file', file)
    
    // public endpoint for now
    const res = await api.post('/public-letters/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    
    toast.success('Gambar berhasil diupload!')
    await fetchMedia()
    selectedUrl.value = res.data.url
    activeTab.value = 'library'
  } catch (e) {
    toast.error('Gagal upload gambar')
  } finally {
    uploading.value = false
    if (fileInput.value) fileInput.value.value = ''
  }
}

const selectImage = (url: string) => {
  selectedUrl.value = url
}

const confirmSelection = () => {
  if (!selectedUrl.value) {
    toast.error('Pilih gambar terlebih dahulu')
    return
  }
  emit('select', selectedUrl.value)
  close()
}

const close = () => {
  emit('update:modelValue', false)
}
</script>

<template>
  <div v-if="modelValue" class="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-gray-900/50 backdrop-blur-sm transition-opacity">
    <div class="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
      
      <!-- Header -->
      <div class="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <h2 class="text-xl font-bold text-gray-900">Pustaka Media</h2>
        <button @click="close" class="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">
          <X class="w-5 h-5" />
        </button>
      </div>

      <!-- Tabs -->
      <div class="px-6 pt-4 border-b border-gray-100 flex gap-6">
        <button @click="activeTab = 'upload'" 
          :class="['pb-3 text-sm font-semibold border-b-2 transition-colors', activeTab === 'upload' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700']">
          Upload File
        </button>
        <button @click="activeTab = 'library'"
          :class="['pb-3 text-sm font-semibold border-b-2 transition-colors', activeTab === 'library' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700']">
          Pustaka Media
        </button>
      </div>

      <!-- Content -->
      <div class="flex-1 overflow-y-auto p-6 bg-gray-50/50">
        
        <!-- Upload Tab -->
        <div v-if="activeTab === 'upload'" class="flex flex-col items-center justify-center py-20">
          <div class="w-full max-w-md p-8 border-2 border-dashed border-gray-300 rounded-2xl bg-white text-center hover:bg-gray-50 transition-colors">
            <input type="file" ref="fileInput" accept="image/*" class="hidden" @change="handleUpload" />
            <Upload class="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 class="text-lg font-bold text-gray-900 mb-1">Upload Gambar Baru</h3>
            <p class="text-xs text-gray-500 mb-6">Maksimal ukuran file 5MB. Format JPG, PNG, WEBP.</p>
            <button @click="fileInput?.click()" :disabled="uploading"
              class="px-5 py-2.5 rounded-xl font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-50">
              {{ uploading ? 'Mengupload...' : 'Pilih File dari Komputer' }}
            </button>
          </div>
        </div>

        <!-- Library Tab -->
        <div v-if="activeTab === 'library'">
          <div v-if="loading" class="flex justify-center py-12">
            <div class="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
          </div>
          
          <div v-else-if="mediaFiles.length === 0" class="text-center py-20 text-gray-400">
            <ImageIcon class="w-16 h-16 mx-auto mb-3 opacity-20" />
            <p class="font-medium">Belum ada media yang diupload.</p>
          </div>

          <div v-else class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            <div v-for="file in mediaFiles" :key="file.name"
              @click="selectImage(file.url)"
              :class="['group relative aspect-square rounded-xl overflow-hidden cursor-pointer border-2 transition-all', selectedUrl === file.url ? 'border-indigo-600 shadow-md ring-2 ring-indigo-600/20' : 'border-gray-200 hover:border-gray-300 hover:shadow-sm']">
              
              <!-- Checkbox indicator -->
              <div v-if="selectedUrl === file.url" class="absolute top-2 right-2 w-6 h-6 bg-indigo-600 text-white rounded-md flex items-center justify-center z-10 shadow-sm">
                <Check class="w-4 h-4" />
              </div>

              <!-- Image thumbnail -->
              <!-- Menggunakan path langsung (/uploads/letters/...) -->
              <img :src="file.url" :alt="file.name" class="w-full h-full object-cover bg-white" loading="lazy" />
              
              <!-- File info overlay -->
              <div class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-gray-900/80 to-transparent p-3 pt-6 opacity-0 group-hover:opacity-100 transition-opacity">
                <p class="text-xs text-white truncate font-medium">{{ file.name }}</p>
                <p class="text-[10px] text-gray-300">{{ Math.round(file.size / 1024) }} KB</p>
              </div>
            </div>
          </div>
        </div>

      </div>

      <!-- Footer -->
      <div v-if="activeTab === 'library'" class="px-6 py-4 border-t border-gray-100 bg-white flex justify-end gap-3">
        <button @click="close" class="px-5 py-2.5 rounded-xl font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 transition-colors">
          Batal
        </button>
        <button @click="confirmSelection" :disabled="!selectedUrl"
          class="px-5 py-2.5 rounded-xl font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-50">
          Gunakan Gambar
        </button>
      </div>

    </div>
  </div>
</template>

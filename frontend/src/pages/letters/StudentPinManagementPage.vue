<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useToast } from '@/composables/useToast'
import api from '@/lib/api'
import { Key, Copy, Check, Search, Filter, ShieldAlert, RefreshCw, Layers } from 'lucide-vue-next'

const toast = useToast()

const loading = ref(true)
const records = ref<any[]>([])
const search = ref('')
const selectedProdi = ref('')
const prodis = ref<any[]>([])

// Bulk generate state
const bulkGenerating = ref(false)

// Copy state tracking
const copiedPin = ref<number | null>(null)

const fetchProdis = async () => {
  try {
    const res = await api.get('/prodis', { params: { perPage: 100 } })
    prodis.value = res.data?.data || res.data
  } catch (error) {
    console.error('Failed to load prodis', error)
  }
}

const fetchData = async () => {
  loading.value = true
  try {
    const params = new URLSearchParams()
    if (search.value) params.append('search', search.value)
    if (selectedProdi.value) params.append('prodiId', selectedProdi.value)
    const res = await api.get('/letters/students/pins?' + params.toString())
    records.value = res.data
  } catch (e: any) {
    toast.error(e.response?.data?.message || 'Gagal mengambil data PIN')
  } finally {
    loading.value = false
  }
}

const generatePin = async (studentId: number) => {
  try {
    const res = await api.post(`/letters/students/${studentId}/generate-pin`)
    toast.success('PIN berhasil di-generate')
    const rec = records.value.find(r => r.id === studentId)
    if (rec) rec.pin = res.data.pin
  } catch (e: any) {
    toast.error(e.response?.data?.message || 'Gagal generate PIN')
  }
}

const bulkGenerate = async () => {
  if (!confirm('Apakah Anda yakin ingin meng-generate PIN secara massal untuk semua mahasiswa yang belum memiliki PIN?')) return
  
  bulkGenerating.value = true
  try {
    const res = await api.post('/letters/students/bulk-generate-pins')
    toast.success(res.data.message)
    await fetchData()
  } catch (e: any) {
    toast.error(e.response?.data?.message || 'Gagal bulk generate')
  } finally {
    bulkGenerating.value = false
  }
}

const copyPin = async (pin: string, studentId: number) => {
  try {
    await navigator.clipboard.writeText(pin)
    copiedPin.value = studentId
    toast.success('PIN berhasil disalin')
    setTimeout(() => { copiedPin.value = null }, 2000)
  } catch (err) {
    toast.error('Gagal menyalin PIN')
  }
}

onMounted(async () => {
  await fetchProdis()
  await fetchData()
})

// Debounce search
let searchTimer: any
const onSearchInput = () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => fetchData(), 500)
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Key class="w-6 h-6 text-indigo-600" /> Manajemen PIN Mahasiswa
        </h1>
        <p class="text-sm text-gray-500 mt-1">Kelola dan bagikan PIN akses Layanan Surat ke mahasiswa.</p>
      </div>
      <div>
        <button @click="bulkGenerate" :disabled="bulkGenerating || loading"
          class="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50">
          <Layers class="w-4 h-4" /> 
          {{ bulkGenerating ? 'Proses...' : 'Generate PIN Massal' }}
        </button>
      </div>
    </div>

    <!-- Filters -->
    <div class="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col sm:flex-row gap-4">
      <div class="flex-1 relative">
        <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input v-model="search" @input="onSearchInput" type="text" placeholder="Cari NPM atau Nama..."
          class="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500" />
      </div>
      <div class="w-full sm:w-64 relative">
        <Filter class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <select v-model="selectedProdi" @change="fetchData"
          class="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 appearance-none">
          <option value="">Semua Program Studi</option>
          <option v-for="p in prodis" :key="p.id" :value="p.id">{{ p.name }}</option>
        </select>
      </div>
    </div>

    <!-- Table content -->
    <div class="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200">
          <thead class="bg-gray-50">
            <tr>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">NPM / Nama</th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Program Studi</th>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status Profil</th>
              <th scope="col" class="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">PIN Akses</th>
              <th scope="col" class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Aksi</th>
            </tr>
          </thead>
          <tbody class="bg-white divide-y divide-gray-200">
            <tr v-if="loading">
              <td colspan="5" class="px-6 py-12 text-center text-sm text-gray-500">
                <div class="flex flex-col items-center justify-center">
                  <div class="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-3"></div>
                  Memuat data...
                </div>
              </td>
            </tr>
            <tr v-else-if="records.length === 0">
              <td colspan="5" class="px-6 py-12 text-center text-sm text-gray-500">
                Data mahasiswa tidak ditemukan.
              </td>
            </tr>
            <tr v-else v-for="r in records" :key="r.id" class="hover:bg-gray-50">
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="text-sm font-bold text-gray-900">{{ r.nim }}</div>
                <div class="text-sm text-gray-500">{{ r.name }}</div>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {{ r.prodi }}
              </td>
              <td class="px-6 py-4 whitespace-nowrap">
                <span v-if="r.profileEditedByUser" class="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-emerald-100 text-emerald-800">
                  Sudah Diupdate
                </span>
                <span v-else class="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-amber-100 text-amber-800 flex items-center gap-1 w-max">
                  <ShieldAlert class="w-3 h-3" /> Belum Diupdate
                </span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-center">
                <div v-if="r.pin" class="inline-flex items-center gap-2 group">
                  <div class="font-mono text-lg font-bold tracking-widest bg-gray-100 px-3 py-1 rounded-lg text-gray-800">
                    {{ r.pin }}
                  </div>
                  <button @click="copyPin(r.pin, r.id)" class="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors" title="Salin PIN">
                    <Check v-if="copiedPin === r.id" class="w-4 h-4 text-emerald-500" />
                    <Copy v-else class="w-4 h-4" />
                  </button>
                </div>
                <span v-else class="text-sm text-red-500 font-medium italic">Belum diset</span>
              </td>
              <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <button @click="generatePin(r.id)" class="text-indigo-600 hover:text-indigo-900 flex items-center justify-end gap-1 w-full group">
                  <RefreshCw class="w-3.5 h-3.5 group-hover:rotate-180 transition-transform duration-500" /> 
                  {{ r.pin ? 'Regenerate' : 'Generate' }}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { UploadCloud, CheckCircle2, AlertCircle, Loader2, FileSpreadsheet, X, ArrowRight, ArrowLeft, Columns3, ToggleLeft, ToggleRight } from 'lucide-vue-next'
import api from '@/lib/api'
import { useToast } from '@/composables/useToast'
import * as XLSX from 'xlsx'

const props = defineProps<{
  show: boolean
  title?: string
  description?: string
  endpoint: string
  templateUrl?: string
  /** System fields that need mapping. Each has key, label, and required flag */
  systemFields?: { key: string; label: string; required?: boolean }[]
}>()

const emit = defineEmits<{
  (e: 'update:show', value: boolean): void
  (e: 'success'): void
}>()

const toast = useToast()

// Default system fields for Matakuliah
const defaultFields = [
  { key: 'code', label: 'Kode Matakuliah', required: true },
  { key: 'name', label: 'Nama Matakuliah', required: true },
  { key: 'sks', label: 'SKS', required: true },
  { key: 'semesterDefault', label: 'Semester Default', required: false },
  { key: 'prodiCode', label: 'Kode Program Studi', required: true },
]

const fields = computed(() => props.systemFields || defaultFields)

// Steps
const currentStep = ref(1)
const fileInput = ref<HTMLInputElement | null>(null)
const selectedFile = ref<File | null>(null)
const isDragging = ref(false)
const isUploading = ref(false)

// Parsed data
const excelHeaders = ref<string[]>([])
const excelPreviewRows = ref<any[]>([])
const allParsedRows = ref<any[]>([])

// Progress animation
const progressCount = ref(0)
let progressInterval: ReturnType<typeof setInterval> | null = null

// Mapping: systemField.key -> excelHeader
const columnMapping = ref<Record<string, string>>({})

// Fixed value overrides
const useFixedValue = ref<Record<string, boolean>>({})
const fixedValues = ref<Record<string, any>>({})

// Prodi options (fetched from API for fixed value dropdown)
const prodis = ref<any[]>([])

// Fetch prodis when entering step 2
watch(currentStep, async (step) => {
  if (step === 2 && prodis.value.length === 0) {
    try {
      const { data } = await api.get('/prodis?perPage=100')
      prodis.value = data.data
    } catch { /* silent */ }
  }
})

function toggleFixedValue(fieldKey: string) {
  useFixedValue.value[fieldKey] = !useFixedValue.value[fieldKey]
  if (useFixedValue.value[fieldKey]) {
    // Clear column mapping when switching to fixed
    delete columnMapping.value[fieldKey]
  } else {
    // Clear fixed value when switching to column mapping
    delete fixedValues.value[fieldKey]
  }
}

// Result state
const importResult = ref<{
  total: number
  successful: number
  failed: { row: any; reason: string }[]
}>({ total: 0, successful: 0, failed: [] })

function close() {
  if (isUploading.value) return
  emit('update:show', false)
  setTimeout(() => {
    resetState()
  }, 300)
}

function resetState() {
  selectedFile.value = null
  currentStep.value = 1
  excelHeaders.value = []
  excelPreviewRows.value = []
  allParsedRows.value = []
  columnMapping.value = {}
  useFixedValue.value = {}
  fixedValues.value = {}
  importResult.value = { total: 0, successful: 0, failed: [] }
  progressCount.value = 0
  if (progressInterval) { clearInterval(progressInterval); progressInterval = null }
}

function triggerFileInput() {
  fileInput.value?.click()
}

function handleFileChange(event: Event) {
  const target = event.target as HTMLInputElement
  if (target.files && target.files.length > 0) {
    const file = target.files.item(0)
    if (file) {
      selectedFile.value = file
      parseExcelFile(file)
    }
  }
}

function handleDrop(event: DragEvent) {
  isDragging.value = false
  if (event.dataTransfer && event.dataTransfer.files.length > 0) {
    const file = event.dataTransfer.files.item(0)
    if (file && (file.name.endsWith('.xlsx') || file.name.endsWith('.xls'))) {
      selectedFile.value = file
      parseExcelFile(file)
    } else {
      toast.error('Format Tidak Valid', 'Mohon unggah file Excel (.xlsx atau .xls)')
    }
  }
}

function parseExcelFile(file: File) {
  const reader = new FileReader()
  reader.onload = (e) => {
    try {
      const data = new Uint8Array(e.target?.result as ArrayBuffer)
      const workbook = XLSX.read(data, { type: 'array' })
      const sheetName: string | undefined = workbook.SheetNames[0]
      if (!sheetName) {
        toast.error('File Kosong', 'File Excel tidak memiliki sheet.')
        return
      }
      const worksheet = workbook.Sheets[sheetName]
      if (!worksheet) {
        toast.error('File Kosong', 'Sheet Excel tidak dapat dibaca.')
        return
      }
      const jsonData = XLSX.utils.sheet_to_json<any>(worksheet, { defval: '' })

      if (jsonData.length === 0) {
        toast.error('File Kosong', 'File Excel tidak memiliki data.')
        return
      }

      // Extract headers from ALL rows (some columns may be empty in the first row)
      const headerSet = new Set<string>()
      for (const row of jsonData) {
        for (const key of Object.keys(row)) {
          headerSet.add(key)
        }
      }
      const headers = Array.from(headerSet)
      excelHeaders.value = headers
      allParsedRows.value = jsonData
      excelPreviewRows.value = jsonData.slice(0, 5)

      // Auto-map columns by fuzzy matching
      autoMapColumns(headers)

      // Move to mapping step
      currentStep.value = 2
    } catch (err: any) {
      toast.error('Gagal membaca file', err.message || 'File Excel tidak valid.')
    }
  }
  reader.readAsArrayBuffer(file)
}

function autoMapColumns(headers: string[]) {
  const mapping: Record<string, string> = {}
  const lowerHeaders = headers.map(h => h.toLowerCase().trim())

  for (const field of fields.value) {
    // Try exact match first
    const exactIdx = lowerHeaders.findIndex(h => h === field.label.toLowerCase())
    if (exactIdx >= 0 && headers[exactIdx]) {
      mapping[field.key] = headers[exactIdx]
      continue
    }

    // Try partial match
    const firstWord = field.label.toLowerCase().split(' ')[0] || ''
    const partialIdx = lowerHeaders.findIndex(h =>
      h.includes(field.key.toLowerCase()) ||
      field.label.toLowerCase().includes(h) ||
      h.includes(firstWord)
    )
    if (partialIdx >= 0 && headers[partialIdx]) {
      mapping[field.key] = headers[partialIdx]
      continue
    }

    // Common aliases
    const aliases: Record<string, string[]> = {
      code: ['kode', 'kode mk', 'kode_mk', 'course_code', 'kode matakuliah'],
      name: ['nama', 'matakuliah', 'mata kuliah', 'nama mk', 'nama_mk', 'course_name', 'nama matakuliah', 'nama dosen', 'nama lengkap'],
      sks: ['sks', 'kredit', 'credit'],
      semesterDefault: ['semester', 'semester default', 'smt', 'smt default'],
      prodiCode: ['kode prodi', 'prodi', 'program studi', 'kode_prodi', 'kode program studi'],
      email: ['email', 'e-mail', 'alamat email'],
      nidn: ['nidn', 'no nidn'],
      nip: ['nip', 'no nip'],
      nim: ['nim', 'no nim', 'nomor induk'],
      phone: ['telepon', 'telp', 'hp', 'no hp', 'phone', 'no telepon'],
      frontTitle: ['gelar depan', 'front_title', 'gelar_depan'],
      backTitle: ['gelar belakang', 'back_title', 'gelar_belakang'],
      angkatan: ['angkatan', 'tahun masuk', 'tahun angkatan'],
    }

    const fieldAliases = aliases[field.key] || []
    const aliasIdx = lowerHeaders.findIndex(h => fieldAliases.some(a => h.includes(a)))
    if (aliasIdx >= 0 && headers[aliasIdx]) {
      mapping[field.key] = headers[aliasIdx]
    }
  }

  columnMapping.value = mapping
}

const allRequiredMapped = computed(() => {
  return fields.value
    .filter(f => f.required)
    .every(f => {
      if (useFixedValue.value[f.key]) {
        return fixedValues.value[f.key] !== undefined && fixedValues.value[f.key] !== ''
      }
      return !!columnMapping.value[f.key]
    })
})

function goToStep3() {
  if (!allRequiredMapped.value) {
    toast.error('Mapping Belum Lengkap', 'Pastikan semua kolom wajib sudah dipetakan.')
    return
  }
  uploadMappedData()
}

async function uploadMappedData() {
  try {
    isUploading.value = true
    currentStep.value = 3
    progressCount.value = 0

    // Start progress animation
    const total = allParsedRows.value.length
    const duration = Math.min(total * 8, 5000) // animate proportionally, max 5s
    const stepTime = Math.max(duration / total, 15)
    progressInterval = setInterval(() => {
      if (progressCount.value < total - 1) {
        progressCount.value += Math.max(1, Math.floor(total / (duration / stepTime)))
        if (progressCount.value >= total - 1) progressCount.value = total - 1
      }
    }, stepTime)

    // Transform data using mapping + fixed values
    const mappedRows = allParsedRows.value.map(row => {
      const mapped: Record<string, any> = {}
      for (const field of fields.value) {
        if (useFixedValue.value[field.key]) {
          // Use the fixed value for all rows
          mapped[field.key] = fixedValues.value[field.key]
        } else {
          const excelCol = columnMapping.value[field.key]
          if (excelCol) {
            mapped[field.key] = row[excelCol]
          }
        }
      }
      return mapped
    })

    const response = await api.post(props.endpoint, { rows: mappedRows })
    importResult.value = response.data

    // Complete progress animation
    if (progressInterval) { clearInterval(progressInterval); progressInterval = null }
    progressCount.value = total

    if (importResult.value.successful > 0) {
      toast.success('Import Selesai', `${importResult.value.successful} baris berhasil diimport.`)
      emit('success')
    }
  } catch (err: any) {
    if (progressInterval) { clearInterval(progressInterval); progressInterval = null }
    toast.error('Gagal Import', err.response?.data?.message || err.message)
    currentStep.value = 2
  } finally {
    isUploading.value = false
  }
}

function handleDownloadTemplate() {
  if (props.templateUrl) {
    window.open(props.templateUrl, '_blank')
  }
}
</script>

<template>
  <div v-if="show" class="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
    <div class="flex items-end justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">

      <div
        class="fixed inset-0 transition-opacity bg-slate-900/50 backdrop-blur-sm"
        aria-hidden="true"
        @click="close"
      ></div>

      <span class="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

      <div class="relative z-50 inline-block overflow-hidden text-left align-bottom transition-all transform bg-white rounded-2xl shadow-xl sm:my-8 sm:align-middle w-full"
           :class="currentStep === 2 ? 'sm:max-w-4xl' : 'sm:max-w-2xl'"
      >

        <!-- Header -->
        <div class="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-indigo-50/80 to-purple-50/50 flex justify-between items-center">
          <div>
            <h3 class="text-xl font-bold text-slate-800 flex items-center gap-2" id="modal-title">
              <UploadCloud class="w-5 h-5 text-indigo-600" />
              {{ title || 'Import Data' }}
            </h3>
            <p class="text-slate-500 mt-1 text-sm">
              {{ description || 'Unggah file Excel untuk mengimpor data secara massal.' }}
            </p>
          </div>
          <div class="flex items-center gap-4">
            <!-- Step Indicator -->
            <div class="hidden sm:flex items-center gap-1.5 text-xs font-medium">
              <span :class="currentStep >= 1 ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500'" class="w-6 h-6 rounded-full flex items-center justify-center">1</span>
              <span class="w-4 h-px" :class="currentStep >= 2 ? 'bg-indigo-400' : 'bg-slate-200'"></span>
              <span :class="currentStep >= 2 ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500'" class="w-6 h-6 rounded-full flex items-center justify-center">2</span>
              <span class="w-4 h-px" :class="currentStep >= 3 ? 'bg-indigo-400' : 'bg-slate-200'"></span>
              <span :class="currentStep >= 3 ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500'" class="w-6 h-6 rounded-full flex items-center justify-center">3</span>
            </div>
            <button @click="close" class="text-slate-400 hover:text-slate-600 bg-white/60 hover:bg-white p-1.5 rounded-lg transition-colors border border-slate-200">
              <X class="w-4 h-4" />
            </button>
          </div>
        </div>

        <!-- Body -->
        <div class="px-6 py-6 max-h-[70vh] overflow-y-auto">

          <!-- STEP 1: Upload File -->
          <div v-if="currentStep === 1">
            <div
              class="flex justify-center rounded-xl border-2 border-dashed px-6 py-12 transition-all cursor-pointer"
              :class="[
                isDragging ? 'border-indigo-500 bg-indigo-50/50 scale-[1.01]' : 'border-slate-200 hover:border-indigo-400 hover:bg-slate-50',
                selectedFile ? 'border-emerald-500 bg-emerald-50/30' : ''
              ]"
              @dragover.prevent="isDragging = true"
              @dragleave.prevent="isDragging = false"
              @drop.prevent="handleDrop"
              @click="triggerFileInput"
            >
              <div class="text-center">
                <FileSpreadsheet v-if="selectedFile" class="mx-auto h-14 w-14 text-emerald-500" />
                <div v-else class="mx-auto h-14 w-14 bg-indigo-50 rounded-xl flex items-center justify-center">
                  <UploadCloud class="h-7 w-7 text-indigo-400" />
                </div>

                <div class="mt-4 text-sm leading-6 text-slate-600">
                  <span v-if="selectedFile" class="font-semibold text-emerald-600 text-base">{{ selectedFile.name }}</span>
                  <div v-else>
                    <span class="font-semibold text-indigo-600 text-base">Pilih file Excel</span>
                    <span class="text-slate-400"> atau drag & drop ke sini</span>
                  </div>
                </div>
                <p class="text-xs text-slate-400 mt-2" v-if="!selectedFile">Mendukung format .xlsx dan .xls (maks 5MB)</p>
                <p class="text-xs text-emerald-500 mt-2 font-medium" v-else>{{ (selectedFile.size / 1024).toFixed(1) }} KB · Sedang memproses...</p>
              </div>
              <input
                ref="fileInput"
                type="file"
                accept=".xlsx,.xls"
                class="hidden"
                @change="handleFileChange"
              />
            </div>

            <!-- Template Download -->
            <div v-if="templateUrl && !selectedFile" class="mt-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50/50 rounded-xl flex items-center justify-between border border-blue-100/80">
              <div class="text-sm">
                <p class="font-semibold text-blue-900">Butuh template Excel?</p>
                <p class="text-blue-600/70 mt-0.5">Gunakan template resmi agar proses mapping otomatis.</p>
              </div>
              <button
                @click.stop="handleDownloadTemplate"
                class="shrink-0 px-4 py-2 text-xs font-semibold rounded-lg bg-white border border-blue-200 text-blue-700 hover:bg-blue-50 transition-colors shadow-sm"
              >
                Unduh Template
              </button>
            </div>
          </div>

          <!-- STEP 2: Column Mapping -->
          <div v-else-if="currentStep === 2">
            <div class="mb-5">
              <div class="flex items-center gap-2 mb-1">
                <Columns3 class="w-5 h-5 text-indigo-600" />
                <h4 class="text-base font-bold text-slate-800">Petakan Kolom Excel</h4>
              </div>
              <p class="text-sm text-slate-500">Hubungkan kolom Excel dengan field sistem, atau tetapkan <strong>nilai tetap</strong> untuk semua baris. <span class="text-rose-500 font-medium">*</span> = Wajib.</p>
            </div>

            <!-- Mapping Grid -->
            <div class="space-y-3 mb-6">
              <div v-for="field in fields" :key="field.key"
                   class="p-3 rounded-xl transition-colors"
                   :class="[
                     (useFixedValue[field.key] && fixedValues[field.key]) || columnMapping[field.key]
                       ? 'bg-emerald-50/50 border border-emerald-100'
                       : 'bg-slate-50 border border-slate-100'
                   ]"
              >
                <div class="flex items-center gap-4">
                  <div class="w-[180px] shrink-0">
                    <span class="text-sm font-semibold text-slate-700">{{ field.label }}</span>
                    <span v-if="field.required" class="text-rose-500 ml-0.5">*</span>
                  </div>
                  <ArrowRight class="w-4 h-4 text-slate-300 shrink-0" />

                  <!-- Column mapping mode -->
                  <template v-if="!useFixedValue[field.key]">
                    <select
                      v-model="columnMapping[field.key]"
                      class="flex-1 rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 transition-colors"
                      :class="columnMapping[field.key]
                        ? 'border-emerald-300 bg-white text-slate-800 focus:ring-emerald-500/20 focus:border-emerald-400'
                        : 'border-slate-300 bg-white text-slate-500 focus:ring-indigo-500/20 focus:border-indigo-400'"
                    >
                      <option value="">— Pilih kolom Excel —</option>
                      <option v-for="header in excelHeaders" :key="header" :value="header">{{ header }}</option>
                    </select>
                  </template>

                  <!-- Fixed value mode -->
                  <template v-else>
                    <!-- Prodi dropdown -->
                    <select
                      v-if="field.key === 'prodiCode'"
                      v-model="fixedValues[field.key]"
                      class="flex-1 rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 transition-colors"
                      :class="fixedValues[field.key]
                        ? 'border-amber-300 bg-amber-50/50 text-slate-800 focus:ring-amber-500/20 focus:border-amber-400'
                        : 'border-slate-300 bg-white text-slate-500 focus:ring-amber-500/20 focus:border-amber-400'"
                    >
                      <option value="">— Pilih Prodi —</option>
                      <option v-for="p in prodis" :key="p.id" :value="p.code">{{ p.degree }} {{ p.code }} — {{ p.name }}</option>
                    </select>
                    <!-- Semester number -->
                    <input
                      v-else-if="field.key === 'semesterDefault'"
                      v-model="fixedValues[field.key]"
                      type="number"
                      min="1"
                      max="8"
                      placeholder="Masukkan semester..."
                      class="flex-1 rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 transition-colors border-amber-300 bg-amber-50/50 text-slate-800 focus:ring-amber-500/20 focus:border-amber-400"
                    />
                    <!-- Generic text input -->
                    <input
                      v-else
                      v-model="fixedValues[field.key]"
                      type="text"
                      placeholder="Masukkan nilai tetap..."
                      class="flex-1 rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 transition-colors border-amber-300 bg-amber-50/50 text-slate-800 focus:ring-amber-500/20 focus:border-amber-400"
                    />
                  </template>

                  <CheckCircle2 v-if="(useFixedValue[field.key] && fixedValues[field.key]) || columnMapping[field.key]" class="w-5 h-5 text-emerald-500 shrink-0" />

                  <!-- Toggle button -->
                  <button
                    v-if="field.key === 'prodiCode' || field.key === 'semesterDefault'"
                    type="button"
                    @click="toggleFixedValue(field.key)"
                    :title="useFixedValue[field.key] ? 'Kembali ke mapping kolom' : 'Gunakan nilai tetap'"
                    class="shrink-0 flex items-center gap-1 px-2 py-1.5 rounded-lg text-[11px] font-semibold transition-colors"
                    :class="useFixedValue[field.key]
                      ? 'bg-amber-100 text-amber-700 hover:bg-amber-200 border border-amber-200'
                      : 'bg-slate-100 text-slate-500 hover:bg-slate-200 border border-slate-200'"
                  >
                    <ToggleRight v-if="useFixedValue[field.key]" class="w-3.5 h-3.5" />
                    <ToggleLeft v-else class="w-3.5 h-3.5" />
                    {{ useFixedValue[field.key] ? 'Tetap' : 'Tetap' }}
                  </button>
                </div>
              </div>
            </div>

            <!-- Data Preview -->
            <div class="border border-slate-200 rounded-xl overflow-hidden">
              <div class="bg-slate-50 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
                <h5 class="text-xs font-bold text-slate-600 uppercase tracking-wider">Preview Data (5 Baris Pertama)</h5>
                <span class="text-xs text-slate-400">Total: {{ allParsedRows.length }} baris</span>
              </div>
              <div class="overflow-x-auto max-h-[200px]">
                <table class="w-full text-xs">
                  <thead class="bg-slate-50/80 sticky top-0">
                    <tr>
                      <th v-for="header in excelHeaders" :key="header"
                          class="py-2 px-3 text-left font-semibold text-slate-600 border-b border-slate-100 whitespace-nowrap"
                          :class="Object.values(columnMapping).includes(header) ? 'text-indigo-600 bg-indigo-50/50' : ''"
                      >
                        {{ header }}
                      </th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-50">
                    <tr v-for="(row, idx) in excelPreviewRows" :key="idx" class="hover:bg-slate-50/50">
                      <td v-for="header in excelHeaders" :key="header"
                          class="py-1.5 px-3 text-slate-600 whitespace-nowrap max-w-[200px] truncate"
                          :class="Object.values(columnMapping).includes(header) ? 'text-indigo-700 font-medium bg-indigo-50/30' : ''"
                      >
                        {{ row[header] ?? '' }}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <!-- STEP 3: Results -->
          <div v-else-if="currentStep === 3">

            <!-- Loading -->
            <div v-if="isUploading" class="py-10 flex flex-col items-center">
              <!-- Circular Progress -->
              <div class="relative w-28 h-28 mb-6">
                <svg class="w-28 h-28 -rotate-90" viewBox="0 0 120 120">
                  <circle cx="60" cy="60" r="52" fill="none" stroke="#e2e8f0" stroke-width="8" />
                  <circle cx="60" cy="60" r="52" fill="none" stroke="url(#progressGradient)" stroke-width="8"
                    stroke-linecap="round"
                    :stroke-dasharray="2 * Math.PI * 52"
                    :stroke-dashoffset="2 * Math.PI * 52 * (1 - progressCount / Math.max(allParsedRows.length, 1))"
                    class="transition-all duration-300 ease-out"
                  />
                  <defs>
                    <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stop-color="#6366f1" />
                      <stop offset="100%" stop-color="#8b5cf6" />
                    </linearGradient>
                  </defs>
                </svg>
                <div class="absolute inset-0 flex flex-col items-center justify-center">
                  <span class="text-2xl font-black text-indigo-600 tabular-nums">{{ progressCount }}</span>
                  <span class="text-[10px] text-slate-400 font-medium">dari {{ allParsedRows.length }}</span>
                </div>
              </div>
              <p class="text-sm font-semibold text-slate-700">Memproses Data...</p>
              <p class="text-xs text-slate-400 mt-1">Sedang mengimport {{ allParsedRows.length }} baris data</p>
              <!-- Progress bar -->
              <div class="w-full max-w-xs mt-4 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div class="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-300 ease-out"
                  :style="{ width: (progressCount / Math.max(allParsedRows.length, 1) * 100) + '%' }"
                ></div>
              </div>
            </div>

            <div v-else class="space-y-6">
              <!-- Summary Cards -->
              <div class="grid grid-cols-3 gap-4">
                <div class="bg-slate-50 rounded-xl border border-slate-100 p-5 text-center">
                  <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Total Baris</p>
                  <p class="text-3xl font-black text-slate-800">{{ importResult.total }}</p>
                </div>
                <div class="bg-emerald-50 rounded-xl border border-emerald-100 p-5 text-center">
                  <p class="text-[10px] font-bold text-emerald-500 uppercase tracking-widest mb-2">Berhasil</p>
                  <p class="text-3xl font-black text-emerald-700">{{ importResult.successful }}</p>
                </div>
                <div class="bg-rose-50 rounded-xl border border-rose-100 p-5 text-center">
                  <p class="text-[10px] font-bold text-rose-500 uppercase tracking-widest mb-2">Gagal</p>
                  <p class="text-3xl font-black text-rose-700">{{ importResult.failed.length }}</p>
                </div>
              </div>

              <!-- Failed Rows List -->
              <div v-if="importResult.failed.length > 0" class="border border-rose-100 rounded-xl overflow-hidden">
                <div class="bg-rose-50/80 px-4 py-3 border-b border-rose-100 flex items-center justify-between">
                  <h4 class="text-sm font-bold text-rose-900 flex items-center gap-2">
                    <AlertCircle class="w-4 h-4 text-rose-500" />
                    Daftar Baris Gagal
                  </h4>
                  <span class="text-xs font-bold px-2.5 py-1 rounded-full bg-rose-100 text-rose-700">{{ importResult.failed.length }} Error</span>
                </div>
                <div class="max-h-[260px] overflow-y-auto bg-white">
                  <table class="w-full text-left border-collapse">
                    <thead>
                      <tr class="bg-slate-50 text-xs text-slate-500 border-b border-slate-100 sticky top-0">
                        <th class="py-2.5 px-4 font-semibold w-[44%]">Baris Data</th>
                        <th class="py-2.5 px-4 font-semibold">Alasan Gagal</th>
                      </tr>
                    </thead>
                    <tbody class="text-sm divide-y divide-slate-50">
                      <tr v-for="(err, idx) in importResult.failed" :key="idx" class="hover:bg-slate-50/50">
                        <td class="py-2.5 px-4 align-top">
                          <pre class="text-[10px] text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100 overflow-x-auto max-w-[280px]">{{ JSON.stringify(err.row, null, 2) }}</pre>
                        </td>
                        <td class="py-2.5 px-4 align-top text-rose-600 text-xs font-medium">
                          {{ err.reason }}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <!-- Perfect Match -->
              <div v-else-if="importResult.total > 0 && importResult.failed.length === 0" class="p-8 bg-gradient-to-br from-emerald-50 to-green-50 rounded-2xl border border-emerald-100 flex flex-col items-center justify-center text-center">
                <div class="w-14 h-14 bg-emerald-100 rounded-2xl flex items-center justify-center mb-4">
                  <CheckCircle2 class="w-7 h-7 text-emerald-600" />
                </div>
                <h3 class="text-emerald-900 font-bold text-xl">Import Sempurna!</h3>
                <p class="text-emerald-700 text-sm mt-2">Semua {{ importResult.total }} data berhasil divalidasi dan disimpan ke sistem.</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="px-6 py-4 border-t border-slate-100 bg-slate-50/60">
          <div class="flex justify-between items-center w-full">
            <div>
              <button
                v-if="currentStep === 2"
                type="button"
                @click="currentStep = 1; selectedFile = null; excelHeaders = []; allParsedRows = []; excelPreviewRows = []; columnMapping = {}"
                class="inline-flex items-center px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 focus:outline-none transition-colors"
              >
                <ArrowLeft class="w-4 h-4 mr-1.5" />
                Kembali
              </button>
            </div>
            <div class="flex gap-3">
              <button
                type="button"
                @click="close"
                class="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 focus:outline-none transition-colors"
                :disabled="isUploading"
              >
                {{ currentStep === 3 && !isUploading ? 'Tutup' : 'Batal' }}
              </button>
              <button
                v-if="currentStep === 2"
                type="button"
                @click="goToStep3"
                class="inline-flex items-center justify-center px-5 py-2 text-sm font-semibold text-white bg-indigo-600 border border-transparent rounded-lg shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-w-[140px]"
                :disabled="!allRequiredMapped || isUploading"
              >
                <Loader2 v-if="isUploading" class="w-4 h-4 mr-2 animate-spin" />
                <UploadCloud v-else class="w-4 h-4 mr-2" />
                {{ isUploading ? 'Memproses...' : 'Mulai Import' }}
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  </div>
</template>

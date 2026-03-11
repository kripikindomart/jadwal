<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'
import { Mail, Search, ChevronRight, User, Edit3, CheckCircle2, FileText, Send, ArrowLeft, AlertTriangle, Save, UploadCloud, X, File as FileIcon, ChevronDown, Lock, ShieldCheck, Info, Eye, EyeOff, ZoomIn, ZoomOut, RotateCcw } from 'lucide-vue-next'

const router = useRouter()
const apiBase = import.meta.env.VITE_API_URL || '/api'
const rootUrl = apiBase.replace(/\/api\/?$/, '') || ''
const resolveUrl = (url: string) => url && url.startsWith('http') ? url : rootUrl + url

// Steps: 1=Cari Mahasiswa, 1.5=PIN, 2=Data & Layanan, 3=Formulir
const step = ref(1)
const loading = ref(false)

// Step 1 state
const searchResults = ref<any[]>([])
const studentSearchQuery = ref('')
const showDropdown = ref(false)
const selectedStudentId = ref<number | null>(null)
const selectedStudentPreview = ref<any>(null)
const searching = ref(false)

// PIN state
const pinInput = ref('')
const pinError = ref('')
const verifyingPin = ref(false)

// Step 2 state - student detail
const studentDetail = ref<any>(null)
const editMode = ref(false)
const profileForm = ref<any>({})
const savingProfile = ref(false)

// Show first-time data warning
const showDataWarning = ref(false)

// Lecturer dropdown state
const lecturers = ref<any[]>([])
const lecturerSearch1 = ref('')
const lecturerSearch2 = ref('')
const showLecturerDropdown1 = ref(false)
const showLecturerDropdown2 = ref(false)

// Concentration dropdown state
const concentrations = ref<any[]>([])

// Step 3 state
const letterTypes = ref<any[]>([])
const selectedLetterType = ref<any>(null)
const formData = ref<Record<string, any>>({})
const submitting = ref(false)
const submitted = ref(false)
const ticketNumber = ref('')

// File upload state
const uploadingFile = ref<Record<string, boolean>>({})
const dragOver = ref<Record<string, boolean>>({})

const showLivePreview = ref(true)
const previewZoom = ref(0.55)

// History & Session state
const activeTab = ref<'layanan' | 'riwayat'>('layanan')
const letterHistory = ref<any[]>([])
const loadingHistory = ref(false)

// Session configuration
const SESSION_KEY = 'student_letter_session'
const SESSION_DURATION_HOURS = 5

// Debounce timer
let searchTimer: ReturnType<typeof setTimeout> | null = null

watch(studentSearchQuery, (val) => {
  if (searchTimer) clearTimeout(searchTimer)
  if (!val || val.length < 2) {
    searchResults.value = []
    return
  }
  searching.value = true
  searchTimer = setTimeout(async () => {
    try {
      const res = await axios.get(`${apiBase}/public-letters/search-students`, { params: { q: val } })
      searchResults.value = res.data
    } catch (e) { console.error(e) }
    finally { searching.value = false }
  }, 300)
})

// Required fields for profile completeness
const requiredFields = [
  { key: 'gender', label: 'Jenis Kelamin' },
  { key: 'tempatLahir', label: 'Tempat Lahir' },
  { key: 'tanggalLahir', label: 'Tanggal Lahir' },
  { key: 'alamatRumah', label: 'Alamat Rumah' },
  { key: 'noTelp', label: 'No. Telepon' },
  { key: 'nik', label: 'NIK KTP' },
]

const missingFields = computed(() => {
  if (!studentDetail.value) return []
  return requiredFields.filter(f => !studentDetail.value[f.key])
})

const isProfileComplete = computed(() => missingFields.value.length === 0)

// Concentration options
const concentrationOptions = computed(() => {
  return concentrations.value.map(c => ({
    value: c.id,
    label: `${c.code ? c.code + ' — ' : ''}${c.name}`
  }))
})

// Filtered lecturers
const filteredLecturers1 = computed(() => {
  if (!lecturerSearch1.value) return lecturers.value
  const q = lecturerSearch1.value.toLowerCase()
  return lecturers.value.filter(l => l.name.toLowerCase().includes(q))
})
const filteredLecturers2 = computed(() => {
  if (!lecturerSearch2.value) return lecturers.value
  const q = lecturerSearch2.value.toLowerCase()
  return lecturers.value.filter(l => l.name.toLowerCase().includes(q))
})

// API calls
const fetchConcentrations = async (prodiId: number) => {
  try {
    const res = await axios.get(`${apiBase}/public-letters/concentrations/${prodiId}`)
    concentrations.value = res.data
  } catch (e) { console.error(e) }
}

const fetchLecturers = async () => {
  try {
    const res = await axios.get(`${apiBase}/public-letters/lecturers`)
    lecturers.value = res.data
  } catch (e) { console.error(e) }
}

const fetchStudentDetail = async (studentId: number) => {
  loading.value = true
  try {
    const res = await axios.get(`${apiBase}/public-letters/student-detail/${studentId}`)
    studentDetail.value = res.data
    profileForm.value = { ...res.data }
    if (res.data.prodiId) await fetchConcentrations(res.data.prodiId)
    await fetchLecturers()

    // If profile never edited, show warning and auto-open edit mode
    if (!res.data.profileEditedByUser) {
      showDataWarning.value = true
    }
  } catch (e) { console.error(e) }
  finally { loading.value = false }
}

const fetchLetterTypes = async () => {
  try {
    const res = await axios.get(`${apiBase}/public-letters/types`)
    letterTypes.value = res.data
  } catch (e) { console.error(e) }
}

const fetchLetterHistory = async (studentId: number, pin: string) => {
  loadingHistory.value = true
  try {
    const res = await axios.post(`${apiBase}/public-letters/history`, { studentId, pin })
    letterHistory.value = res.data
  } catch (e) {
    console.error('Gagal mengambil histori surat:', e)
  } finally {
    loadingHistory.value = false
  }
}

const printApprovedLetter = (ticketNumber: string) => {
  const _route = router.resolve({
    name: 'letters.print',
    params: { id: 'public' },
    query: { public_ticket: ticketNumber }
  })
  window.open(_route.href, '_blank')
}

// Session Management
const saveSession = (studentId: number, pin: string) => {
  const expiredAt = Date.now() + SESSION_DURATION_HOURS * 60 * 60 * 1000
  localStorage.setItem(SESSION_KEY, JSON.stringify({ studentId, pin, expiredAt }))
}

const getSession = () => {
  const data = localStorage.getItem(SESSION_KEY)
  if (!data) return null
  try {
    const session = JSON.parse(data)
    if (Date.now() > session.expiredAt) {
      clearSession()
      return null
    }
    return session
  } catch {
    return null
  }
}

const clearSession = () => {
  localStorage.removeItem(SESSION_KEY)
}

const restoreSession = async () => {
  const session = getSession()
  if (session) {
    selectedStudentId.value = session.studentId
    pinInput.value = session.pin
    await fetchStudentDetail(session.studentId)
    await fetchLetterTypes()
    step.value = 2
  }
}

import { onMounted } from 'vue'
onMounted(() => {
  restoreSession()
})

// Events
const onSelectStudent = async (student: any) => {
  selectedStudentId.value = student.id
  selectedStudentPreview.value = student
  studentSearchQuery.value = `${student.nim} - ${student.name}`
  showDropdown.value = false
  pinInput.value = ''
  pinError.value = ''
  step.value = 1.5 // Go to PIN step
}

const verifyPin = async () => {
  if (!selectedStudentId.value || pinInput.value.length !== 4) {
    pinError.value = 'Masukkan 4 digit PIN'
    return
  }
  verifyingPin.value = true
  pinError.value = ''
  try {
    const res = await axios.post(`${apiBase}/public-letters/verify-pin`, {
      studentId: selectedStudentId.value,
      pin: pinInput.value,
    })
    if (res.data.valid) {
      saveSession(selectedStudentId.value!, pinInput.value)
      await fetchStudentDetail(selectedStudentId.value!)
      step.value = 2
      await fetchLetterTypes()
    } else {
      pinError.value = res.data.message || 'PIN tidak sesuai'
    }
  } catch (e: any) {
    pinError.value = e.response?.data?.message || 'Gagal memverifikasi PIN'
  } finally {
    verifyingPin.value = false
  }
}

const selectLecturer = (field: 'pembimbing1' | 'pembimbing2', lecturer: any) => {
  profileForm.value[field] = lecturer.name
  if (field === 'pembimbing1') {
    showLecturerDropdown1.value = false
    lecturerSearch1.value = ''
  } else {
    showLecturerDropdown2.value = false
    lecturerSearch2.value = ''
  }
}

const dismissWarningAndEdit = () => {
  showDataWarning.value = false
  editMode.value = true
}

const saveProfile = async () => {
  if (!selectedStudentId.value) return
  savingProfile.value = true
  try {
    const editableFields = [
      'gender', 'tempatLahir', 'tanggalLahir', 'concentrationId',
      'judulTesis', 'pembimbing1', 'pembimbing2',
      'pekerjaan', 'alamatRumah', 'alamatKantor',
      'nik', 'noTelp', 'tanggalLulus', 'tanggalSidang', 'masaStudi',
      'namaAyah', 'namaIbu', 'keterangan', 'email',
    ]
    const payload: Record<string, any> = {}
    for (const key of editableFields) {
      if (profileForm.value[key] !== undefined && profileForm.value[key] !== null) {
        payload[key] = profileForm.value[key]
      }
    }
    const res = await axios.patch(`${apiBase}/public-letters/student-profile/${selectedStudentId.value}`, payload)
    studentDetail.value = res.data
    profileForm.value = { ...res.data }
    editMode.value = false
    showDataWarning.value = false
  } catch (e: any) {
    alert(e.response?.data?.message || 'Gagal menyimpan profil')
  } finally {
    savingProfile.value = false
  }
}

const selectLetterType = (lt: any) => {
  selectedLetterType.value = lt
  formData.value = {}
  uploadingFile.value = {}
  dragOver.value = {}
  showLivePreview.value = true // Reset to true initially
  if (lt.fields) {
    for (const f of lt.fields) formData.value[f.id] = ''
  }
  step.value = 3
}

const handleFileUpload = async (event: any, fieldId: string, allowedExts: string, maxSizeMB: number) => {
  let file: File | null = null
  if (event.dataTransfer && event.dataTransfer.files.length > 0) {
    file = event.dataTransfer.files[0]
  } else if (event.target && event.target.files.length > 0) {
    file = event.target.files[0]
  }
  if (!file) return

  const maxBytes = (maxSizeMB || 5) * 1024 * 1024
  if (file.size > maxBytes) {
    alert(`Ukuran file terlalu besar. Maksimal ${(maxSizeMB || 5)}MB.`)
    return
  }
  if (allowedExts) {
    const ext = '.' + file.name.split('.').pop()?.toLowerCase()
    const allowed = allowedExts.split(',').map(e => e.trim().toLowerCase())
    if (!allowed.includes(ext)) {
      alert(`Format file tidak diizinkan. Harap upload format: ${allowedExts}`)
      return
    }
  }

  const formDataPayload = new FormData()
  formDataPayload.append('file', file)
  uploadingFile.value[fieldId] = true
  try {
    const res = await axios.post(`${apiBase}/public-letters/upload`, formDataPayload, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    formData.value[fieldId] = res.data.url
  } catch (e: any) {
    alert(e.response?.data?.message || 'Gagal mengupload file.')
  } finally {
    uploadingFile.value[fieldId] = false
    dragOver.value[fieldId] = false
  }
}

const submitRequest = async () => {
  if (!selectedLetterType.value || !studentDetail.value) return
  if (selectedLetterType.value.fields) {
    for (const f of selectedLetterType.value.fields) {
      if (f.required && !formData.value[f.id]) {
        alert(`Field "${f.label}" wajib diisi.`)
        return
      }
    }
  }
  submitting.value = true
  try {
    const res = await axios.post(`${apiBase}/public-letters/submit`, {
      letterTypeId: selectedLetterType.value.id,
      requesterName: studentDetail.value.name,
      requesterNim: studentDetail.value.nim,
      requesterEmail: studentDetail.value.email,
      requesterPhone: studentDetail.value.noTelp || studentDetail.value.phone,
      studentId: selectedStudentId.value,
      prodiId: studentDetail.value.prodiId,
      submittedData: formData.value,
    })
    ticketNumber.value = res.data.ticketNumber
    submitted.value = true
  } catch (e: any) {
    alert(e.response?.data?.message || 'Gagal mengirim pengajuan.')
  } finally {
    submitting.value = false
  }
}

const trackTicket = ref('')

const resetAll = () => {
  submitted.value = false
  step.value = 1
  selectedStudentId.value = null
  selectedStudentPreview.value = null
  studentDetail.value = null
  studentSearchQuery.value = ''
  selectedLetterType.value = null
  pinInput.value = ''
  pinError.value = ''
  showDataWarning.value = false
  editMode.value = false
}

// Live preview logic
const mappedHtmlPreview = computed(() => {
  if (!selectedLetterType.value?.template?.htmlContent) return ''
  let html = selectedLetterType.value.template.htmlContent

  // Force Vue to track ALL formData changes by serializing the entire object
  const currentFormData = JSON.parse(JSON.stringify(formData.value))

  // Build full context from student detail
  const sd = studentDetail.value || {}
  const context: Record<string, any> = {
    nama: sd.name || sd.nama || '',
    nim: sd.nim || '',
    prodi: sd.prodi || '',
    email: sd.email || '',
    phone: sd.noTelp || sd.phone || '',
    noTelp: sd.noTelp || '',
    tanggal_surat: new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' }),
    alamatRumah: sd.alamatRumah || '',
    nik: sd.nik || '',
    tempatLahir: sd.tempatLahir || '',
    tanggalLahir: sd.tanggalLahir || '',
    judulTesis: sd.judulTesis || '',
    pembimbing1: sd.pembimbing1 || '',
    pembimbing2: sd.pembimbing2 || '',
    gender: sd.gender || '',
    pekerjaan: sd.pekerjaan || '',
  }

  // Parse variableMapping if it's a string
  let mapping = selectedLetterType.value.variableMapping
  if (typeof mapping === 'string') {
    try { mapping = JSON.parse(mapping) } catch { mapping = {} }
  }

  // Step 1: Replace variables using explicit mapping
  // Mapping format: { "[Kepada]": "ditujukan_ke", "[jabatan]": "jabatan_pakar" }
  // Keys include brackets, values are raw field IDs from formData
  if (mapping && typeof mapping === 'object') {
    for (const [bracketTag, fieldIdOrPath] of Object.entries(mapping)) {
      if (!fieldIdOrPath || typeof fieldIdOrPath !== 'string') continue

      let val = ''

      // The value is a raw field ID — look it up directly in formData
      val = currentFormData[fieldIdOrPath] || ''

      // If not found in formData, maybe it's a context key (student data)
      if (!val) {
        val = context[fieldIdOrPath] || ''
      }

      // Also try with 'form.' prefix stripped (for backward compatibility)
      if (!val && fieldIdOrPath.startsWith('form.')) {
        const fId = fieldIdOrPath.replace('form.', '')
        val = currentFormData[fId] || ''
      }
      if (!val && fieldIdOrPath.startsWith('user.')) {
        const key = fieldIdOrPath.replace('user.', '')
        val = context[key] || ''
      }

      // File URLs: show just the filename
      if (val && typeof val === 'string' && val.includes('/uploads/')) {
        val = val.split('/').pop() || val
      }

      // The key itself is the bracket tag like [Kepada] — do a direct string replace
      if (bracketTag && val) {
        // Escape special regex chars in the bracket tag
        const escaped = bracketTag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        html = html.replace(new RegExp(escaped, 'g'), val)
      }
    }
  }

  // Step 2: Fallback — replace any remaining [var] with matching context or formData
  // Use regex that handles multi-word tags like [Judul Tesis]
  html = html.replace(/\[([^\]]+)\]/g, (_match: string, varName: string) => {
    // Skip common HTML/CSS false positives
    if (varName.startsWith('if ') || varName.startsWith('endif') || varName.includes('=')) return _match

    // Check context (student data) — exact match
    if (context[varName]) return String(context[varName])

    // Check context with lowercase/underscore normalization
    const normalized = varName.toLowerCase().replace(/\s+/g, '_')
    if (context[normalized]) return String(context[normalized])

    // Check formData by field ID
    if (currentFormData[varName]) return currentFormData[varName]
    if (currentFormData[normalized]) return currentFormData[normalized]

    // Try matching by field label
    const fields = selectedLetterType.value?.fields || []
    const matchedField = fields.find((f: any) =>
      f.label === varName ||
      f.label?.toLowerCase().replace(/\s+/g, '_') === normalized ||
      f.id === varName ||
      f.id === normalized
    )
    if (matchedField && currentFormData[matchedField.id]) {
      return currentFormData[matchedField.id]
    }

    // Return styled placeholder
    return `<span style="color:#6366f1;font-style:italic;">[${varName}]</span>`
  })

  return html
})
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
    <!-- Header -->
    <div class="bg-white/80 backdrop-blur-md border-b border-gray-100 sticky top-0 z-20">
      <div class="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-3">
        <div class="p-2 bg-indigo-100 rounded-xl">
          <Mail class="w-6 h-6 text-indigo-600" />
        </div>
        <div class="flex-1">
          <h1 class="text-xl font-bold text-gray-900">Portal Layanan Surat</h1>
          <p class="text-sm text-gray-500">Pascasarjana — Pengajuan Surat Menyurat</p>
        </div>
      </div>
    </div>

    <!-- Steps Indicator -->
    <div :class="(step === 3 && selectedLetterType?.template && showLivePreview) ? 'max-w-7xl' : 'max-w-4xl'" class="mx-auto px-4 sm:px-6 pt-6 transition-all duration-300" v-if="!submitted">
      <div class="flex items-center gap-2 text-sm font-medium">
        <span :class="step >= 1 ? 'text-indigo-600 bg-indigo-100' : 'text-gray-400 bg-gray-100'" class="px-3 py-1 rounded-full text-xs font-bold">1. Identifikasi</span>
        <ChevronRight class="w-4 h-4 text-gray-300" />
        <span :class="step >= 2 ? 'text-indigo-600 bg-indigo-100' : 'text-gray-400 bg-gray-100'" class="px-3 py-1 rounded-full text-xs font-bold">2. Data & Layanan</span>
        <ChevronRight class="w-4 h-4 text-gray-300" />
        <span :class="step >= 3 ? 'text-indigo-600 bg-indigo-100' : 'text-gray-400 bg-gray-100'" class="px-3 py-1 rounded-full text-xs font-bold">3. Formulir</span>
      </div>
    </div>

    <div :class="(step === 3 && selectedLetterType?.template && showLivePreview) ? 'max-w-7xl' : 'max-w-4xl'" class="mx-auto px-4 sm:px-6 py-6 transition-all duration-300">
      <!-- ==================== STEP 1: Search Student ==================== -->
      <div v-if="step === 1 && !submitted" class="space-y-6">
        <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 class="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <User class="w-5 h-5 text-indigo-600" /> Identifikasi Mahasiswa
          </h2>
          <p class="text-sm text-gray-500 mb-4">Masukkan NPM atau nama lengkap Anda untuk mencari data.</p>

          <div class="relative">
            <label class="block text-sm font-medium text-gray-700 mb-1.5">Cari berdasarkan NPM atau Nama</label>
            <div class="relative">
              <Search class="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input v-model="studentSearchQuery" @focus="showDropdown = true" type="text"
                placeholder="Ketik NPM atau nama mahasiswa (min. 2 karakter)..."
                class="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm" />
            </div>

            <div v-if="searching" class="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg p-4 text-sm text-gray-400 text-center">
              <div class="w-5 h-5 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-2"></div>
              Mencari...
            </div>
            <div v-else-if="showDropdown && searchResults.length > 0"
              class="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg max-h-72 overflow-y-auto">
              <button v-for="s in searchResults" :key="s.id" @click="onSelectStudent(s)"
                class="w-full text-left px-4 py-3 hover:bg-indigo-50 transition-colors text-sm border-b border-gray-50 last:border-0">
                <div class="flex items-center justify-between">
                  <div>
                    <span class="font-bold text-gray-900">{{ s.nim }}</span>
                    <span class="text-gray-500"> — {{ s.name }}</span>
                  </div>
                  <span class="text-xs text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">{{ s.prodi }}</span>
                </div>
              </button>
            </div>
            <div v-else-if="showDropdown && studentSearchQuery.length >= 2 && !searching && searchResults.length === 0"
              class="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg p-4 text-sm text-gray-400 text-center">
              Mahasiswa tidak ditemukan
            </div>
          </div>
        </div>

        <!-- Track ticket -->
        <div class="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h3 class="font-bold text-gray-800 mb-2">Lacak Pengajuan Surat</h3>
          <p class="text-sm text-gray-500 mb-3">Masukkan nomor tiket untuk melihat status surat Anda.</p>
          <div class="flex gap-2">
            <input v-model="trackTicket" type="text" placeholder="Contoh: REQ-2603-A1B2"
              class="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-indigo-500" />
            <button @click="() => { if (trackTicket) router.push({ name: 'letters.public.track', params: { ticket: trackTicket } }) }"
              class="px-5 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-colors">
              Lacak
            </button>
          </div>
        </div>
      </div>

      <!-- ==================== STEP 1.5: PIN Verification ==================== -->
      <div v-if="step === 1.5 && !submitted" class="space-y-6">
        <button @click="step = 1; selectedStudentId = null; selectedStudentPreview = null; studentSearchQuery = ''; pinInput = ''; pinError = ''"
          class="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors">
          <ArrowLeft class="w-4 h-4" /> Kembali ke pencarian
        </button>

        <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 max-w-md mx-auto text-center">
          <div class="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-5">
            <Lock class="w-8 h-8 text-indigo-600" />
          </div>
          <h2 class="text-lg font-bold text-gray-900 mb-1">Verifikasi PIN</h2>
          <p class="text-sm text-gray-500 mb-6">
            Masukkan 4 digit PIN untuk mahasiswa <strong>{{ selectedStudentPreview?.name }}</strong>
            <br><span class="text-xs text-gray-400">({{ selectedStudentPreview?.nim }})</span>
          </p>

          <!-- PIN Input -->
          <div class="flex justify-center gap-3 mb-4">
            <input
              v-model="pinInput"
              type="text"
              maxlength="4"
              inputmode="numeric"
              pattern="[0-9]*"
              @keyup.enter="verifyPin"
              class="w-40 text-center text-2xl font-mono font-bold tracking-[0.5em] px-4 py-3 rounded-xl border-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
              :class="pinError ? 'border-red-300 bg-red-50' : 'border-gray-200'"
              placeholder="• • • •"
              autofocus
            />
          </div>

          <p v-if="pinError" class="text-sm text-red-600 font-medium mb-4">{{ pinError }}</p>

          <button @click="verifyPin" :disabled="verifyingPin || pinInput.length !== 4"
            class="w-full px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
            <div v-if="verifyingPin" class="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            <ShieldCheck v-else class="w-5 h-5" />
            {{ verifyingPin ? 'Memverifikasi...' : 'Verifikasi PIN' }}
          </button>

          <p class="text-xs text-gray-400 mt-4">
            <Info class="w-3 h-3 inline-block mr-0.5" />
            PIN diberikan oleh staf prodi Anda. Jika belum memiliki PIN, silakan hubungi staf prodi.
          </p>
        </div>
      </div>

      <!-- ==================== STEP 2: Student Data & Letter Types ==================== -->
      <div v-if="step === 2 && !submitted" class="space-y-6">
        <button @click="step = 1; studentDetail = null; selectedStudentId = null; studentSearchQuery = ''; selectedStudentPreview = null"
          class="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors">
          <ArrowLeft class="w-4 h-4" /> Kembali ke pencarian
        </button>

        <!-- Loading -->
        <div v-if="loading" class="text-center py-16">
          <div class="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4"></div>
        </div>

        <template v-else-if="studentDetail">
          <!-- First-time Data Warning Modal Overlay -->
          <div v-if="showDataWarning" class="bg-white rounded-2xl shadow-lg border-2 border-amber-200 p-6 space-y-4">
            <div class="flex items-start gap-3">
              <div class="p-2.5 bg-amber-100 rounded-xl shrink-0">
                <AlertTriangle class="w-6 h-6 text-amber-600" />
              </div>
              <div class="flex-1">
                <h3 class="text-lg font-bold text-gray-900 mb-1">Lengkapi Data Diri Anda</h3>
                <p class="text-sm text-gray-600 leading-relaxed">
                  Selamat datang di Portal Layanan Surat. Sebelum mengajukan surat, Anda perlu melengkapi data diri terlebih dahulu.
                </p>
              </div>
            </div>

            <div class="bg-amber-50 rounded-xl p-4 space-y-2">
              <div class="flex items-start gap-2">
                <Info class="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p class="text-sm text-amber-800"><strong>Pengisian data cukup sekali.</strong> Jika ada perubahan di kemudian hari, Anda bisa klik tombol "Lengkapi Data" untuk memperbarui.</p>
              </div>
              <div class="flex items-start gap-2">
                <Info class="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p class="text-sm text-amber-800"><strong>Mohon isi data sebenar-benarnya</strong> karena data ini akan digunakan sebagai referensi di layanan lain (surat keterangan, legalisir, dll).</p>
              </div>
            </div>

            <div class="flex items-center gap-3 text-sm text-gray-500 bg-gray-50 rounded-xl p-3">
              <ShieldCheck class="w-5 h-5 text-gray-400 shrink-0" />
              <span>Data yang belum lengkap: <strong class="text-amber-700">{{ missingFields.map(f => f.label).join(', ') || 'Tidak ada' }}</strong></span>
            </div>

            <div class="flex justify-end">
              <button @click="dismissWarningAndEdit"
                class="px-6 py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 transition-colors flex items-center gap-2">
                <Edit3 class="w-4 h-4" /> Lengkapi Data Sekarang
              </button>
            </div>
          </div>

          <!-- Student Info Card -->
          <div v-if="!showDataWarning" class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div class="flex items-center justify-between mb-4">
              <h2 class="text-lg font-bold text-gray-900 flex items-center gap-2">
                <User class="w-5 h-5 text-indigo-600" /> Data Mahasiswa
              </h2>
              <div class="flex items-center gap-2">
                <span v-if="studentDetail.profileEditedByUser"
                  class="text-xs px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 font-semibold flex items-center gap-1">
                  <CheckCircle2 class="w-3 h-3" /> Data Terverifikasi
                </span>
                <span v-else
                  class="text-xs px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 font-semibold flex items-center gap-1">
                  <AlertTriangle class="w-3 h-3" /> Belum Diperbarui
                </span>
                <button @click="editMode = !editMode"
                  class="px-3 py-1.5 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5"
                  :class="editMode ? 'bg-gray-100 text-gray-600' : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'">
                  <Edit3 class="w-3.5 h-3.5" /> {{ editMode ? 'Batal Edit' : 'Lengkapi Data' }}
                </button>
              </div>
            </div>

            <!-- Profile Completeness Warning (inline) -->
            <div v-if="!isProfileComplete && !editMode" class="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
              <div class="flex items-start gap-2">
                <AlertTriangle class="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p class="text-sm font-bold text-amber-800">Data Belum Lengkap</p>
                  <p class="text-xs text-amber-600 mt-0.5">Lengkapi data berikut: <strong>{{ missingFields.map(f => f.label).join(', ') }}</strong></p>
                  <p class="text-xs text-amber-500 mt-1 italic">Klik "Lengkapi Data" untuk mengisi. Pengisian cukup sekali saja.</p>
                </div>
              </div>
            </div>

            <!-- View Mode -->
            <div v-if="!editMode" class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <div><span class="text-gray-500">Nama:</span> <span class="font-semibold text-gray-800 ml-1">{{ studentDetail.name }}</span></div>
              <div><span class="text-gray-500">NPM:</span> <span class="font-semibold text-gray-800 ml-1">{{ studentDetail.nim }}</span></div>
              <div><span class="text-gray-500">Jenis Kelamin:</span> <span class="font-semibold text-gray-800 ml-1">{{ studentDetail.gender || '-' }}</span></div>
              <div><span class="text-gray-500">Prodi:</span> <span class="font-semibold text-gray-800 ml-1">{{ studentDetail.prodi }}</span></div>
              <div><span class="text-gray-500">Konsentrasi:</span> <span class="font-semibold text-gray-800 ml-1">{{ studentDetail.konsentrasi || '-' }}</span></div>
              <div><span class="text-gray-500">Angkatan:</span> <span class="font-semibold text-gray-800 ml-1">{{ studentDetail.angkatan || '-' }}</span></div>
              <div><span class="text-gray-500">Tempat, Tgl Lahir:</span> <span class="font-semibold text-gray-800 ml-1">{{ studentDetail.tempatLahir || '-' }}, {{ studentDetail.tanggalLahir || '-' }}</span></div>
              <div v-if="studentDetail.profileEditedByUser"><span class="text-gray-500">Email:</span> <span class="font-semibold text-gray-800 ml-1">{{ studentDetail.email || '-' }}</span></div>
              <div><span class="text-gray-500">No. Telp:</span> <span class="font-semibold text-gray-800 ml-1">{{ studentDetail.noTelp || studentDetail.phone || '-' }}</span></div>
              <div><span class="text-gray-500">NIK:</span> <span class="font-semibold text-gray-800 ml-1">{{ studentDetail.nik || '-' }}</span></div>
              <div class="sm:col-span-2"><span class="text-gray-500">Alamat Rumah:</span> <span class="font-semibold text-gray-800 ml-1">{{ studentDetail.alamatRumah || '-' }}</span></div>
              <div><span class="text-gray-500">Pembimbing 1:</span> <span class="font-semibold text-gray-800 ml-1">{{ studentDetail.pembimbing1 || '-' }}</span></div>
              <div><span class="text-gray-500">Pembimbing 2:</span> <span class="font-semibold text-gray-800 ml-1">{{ studentDetail.pembimbing2 || '-' }}</span></div>
              <div><span class="text-gray-500">Nama Ayah:</span> <span class="font-semibold text-gray-800 ml-1">{{ studentDetail.namaAyah || '-' }}</span></div>
              <div><span class="text-gray-500">Nama Ibu:</span> <span class="font-semibold text-gray-800 ml-1">{{ studentDetail.namaIbu || '-' }}</span></div>
            </div>

            <!-- Edit Mode -->
            <div v-else class="space-y-4">
              <!-- Inline info banner in edit mode -->
              <div class="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-start gap-2 text-sm">
                <Info class="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                <p class="text-blue-700">Mohon isi data <strong>sebenar-benarnya</strong>. Data ini akan digunakan sebagai referensi di layanan surat dan layanan lainnya. Pengisian cukup sekali, jika ada perubahan bisa diedit kembali.</p>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label class="block text-xs font-bold text-gray-500 mb-1">Jenis Kelamin *</label>
                  <select v-model="profileForm.gender" class="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm">
                    <option value="">-- Pilih --</option>
                    <option value="L">Laki-laki</option>
                    <option value="P">Perempuan</option>
                  </select>
                </div>
                <div>
                  <label class="block text-xs font-bold text-gray-500 mb-1">Tempat Lahir *</label>
                  <input v-model="profileForm.tempatLahir" class="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm" />
                </div>
                <div>
                  <label class="block text-xs font-bold text-gray-500 mb-1">Tanggal Lahir *</label>
                  <input v-model="profileForm.tanggalLahir" type="date" class="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm" />
                </div>
                <div>
                  <label class="block text-xs font-bold text-gray-500 mb-1">Konsentrasi</label>
                  <select v-model="profileForm.concentrationId" class="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm">
                    <option value="">-- Pilih Konsentrasi --</option>
                    <option v-for="c in concentrationOptions" :key="c.value" :value="c.value">{{ c.label }}</option>
                  </select>
                  <p v-if="concentrationOptions.length === 0" class="text-xs text-gray-400 mt-1 italic">Tidak ada konsentrasi untuk prodi ini</p>
                </div>
                <div>
                  <label class="block text-xs font-bold text-gray-500 mb-1">NIK KTP *</label>
                  <input v-model="profileForm.nik" class="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm" />
                </div>
                <div>
                  <label class="block text-xs font-bold text-gray-500 mb-1">Email</label>
                  <input v-model="profileForm.email" type="email" class="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm" placeholder="Alamat email aktif" />
                </div>
                <div>
                  <label class="block text-xs font-bold text-gray-500 mb-1">No. Telp / WA *</label>
                  <input v-model="profileForm.noTelp" class="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm" />
                </div>
                <div>
                  <label class="block text-xs font-bold text-gray-500 mb-1">Pekerjaan</label>
                  <input v-model="profileForm.pekerjaan" class="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm" />
                </div>
                <div class="sm:col-span-2">
                  <label class="block text-xs font-bold text-gray-500 mb-1">Alamat Rumah *</label>
                  <textarea v-model="profileForm.alamatRumah" rows="2" class="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm resize-y"></textarea>
                </div>
                <div class="sm:col-span-2">
                  <label class="block text-xs font-bold text-gray-500 mb-1">Alamat Kantor</label>
                  <textarea v-model="profileForm.alamatKantor" rows="2" class="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm resize-y"></textarea>
                </div>
                <div>
                  <label class="block text-xs font-bold text-gray-500 mb-1">Nama Ayah</label>
                  <input v-model="profileForm.namaAyah" class="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm" />
                </div>
                <div>
                  <label class="block text-xs font-bold text-gray-500 mb-1">Nama Ibu</label>
                  <input v-model="profileForm.namaIbu" class="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm" />
                </div>
                <div class="sm:col-span-2">
                  <label class="block text-xs font-bold text-gray-500 mb-1">Judul Tesis/Disertasi</label>
                  <textarea v-model="profileForm.judulTesis" rows="2" class="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm resize-y"></textarea>
                </div>

                <!-- Pembimbing 1 -->
                <div class="relative">
                  <label class="block text-xs font-bold text-gray-500 mb-1">Pembimbing 1</label>
                  <div class="relative">
                    <input v-model="profileForm.pembimbing1"
                      @focus="showLecturerDropdown1 = true"
                      @input="lecturerSearch1 = profileForm.pembimbing1"
                      class="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm pr-8"
                      placeholder="Ketik nama dosen..." />
                    <ChevronDown class="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  </div>
                  <div v-if="showLecturerDropdown1 && filteredLecturers1.length > 0"
                    class="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    <button v-for="l in filteredLecturers1" :key="l.id"
                      @mousedown.prevent="selectLecturer('pembimbing1', l)"
                      class="w-full text-left px-3 py-2 text-sm hover:bg-indigo-50 border-b border-gray-50 last:border-0">
                      <span class="font-medium text-gray-800">{{ l.name }}</span>
                      <span v-if="l.nidn" class="text-xs text-gray-400 ml-1">({{ l.nidn }})</span>
                    </button>
                  </div>
                  <div v-if="showLecturerDropdown1" @click="showLecturerDropdown1 = false" class="fixed inset-0 z-10"></div>
                </div>

                <!-- Pembimbing 2 -->
                <div class="relative">
                  <label class="block text-xs font-bold text-gray-500 mb-1">Pembimbing 2</label>
                  <div class="relative">
                    <input v-model="profileForm.pembimbing2"
                      @focus="showLecturerDropdown2 = true"
                      @input="lecturerSearch2 = profileForm.pembimbing2"
                      class="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm pr-8"
                      placeholder="Ketik nama dosen..." />
                    <ChevronDown class="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  </div>
                  <div v-if="showLecturerDropdown2 && filteredLecturers2.length > 0"
                    class="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    <button v-for="l in filteredLecturers2" :key="l.id"
                      @mousedown.prevent="selectLecturer('pembimbing2', l)"
                      class="w-full text-left px-3 py-2 text-sm hover:bg-indigo-50 border-b border-gray-50 last:border-0">
                      <span class="font-medium text-gray-800">{{ l.name }}</span>
                      <span v-if="l.nidn" class="text-xs text-gray-400 ml-1">({{ l.nidn }})</span>
                    </button>
                  </div>
                  <div v-if="showLecturerDropdown2" @click="showLecturerDropdown2 = false" class="fixed inset-0 z-10"></div>
                </div>
              </div>

              <div class="flex justify-end gap-2 pt-2">
                <button @click="editMode = false" class="px-4 py-2 text-sm font-semibold rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors">Batal</button>
                <button @click="saveProfile" :disabled="savingProfile"
                  class="px-5 py-2 text-sm font-bold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors flex items-center gap-1.5 disabled:opacity-60">
                  <Save class="w-4 h-4" /> {{ savingProfile ? 'Menyimpan...' : 'Simpan Data' }}
                </button>
              </div>
            </div>
          </div>

          <!-- Tabs -->
          <div v-if="!editMode && !showDataWarning" class="flex border-b border-gray-200 mb-6">
            <button @click="activeTab = 'layanan'"
              class="px-6 py-3 font-semibold text-sm border-b-2 transition-colors flex items-center gap-2"
              :class="activeTab === 'layanan' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'">
              <FileText class="w-4 h-4" /> Layanan Surat
            </button>
            <button @click="(activeTab = 'riwayat'), selectedStudentId && fetchLetterHistory(selectedStudentId, pinInput)"
              class="px-6 py-3 font-semibold text-sm border-b-2 transition-colors flex items-center gap-2"
              :class="activeTab === 'riwayat' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'">
              <Clock class="w-4 h-4" /> Riwayat Pengajuan
            </button>
          </div>

          <!-- Tab Content: Layanan Surat -->
          <div v-if="!editMode && !showDataWarning && activeTab === 'layanan'">
            <h2 class="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <FileText class="w-5 h-5 text-indigo-600" /> Pilih Layanan Surat
            </h2>

            <div v-if="!isProfileComplete" class="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800 mb-4">
              <strong>Mohon lengkapi data terlebih dahulu</strong> sebelum mengajukan surat. Klik tombol "Lengkapi Data" di atas.
            </div>

            <div v-else-if="letterTypes.length === 0" class="text-center py-8 text-gray-400">
              <FileText class="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>Tidak ada layanan surat yang tersedia saat ini.</p>
            </div>

            <div v-else class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button v-for="lt in letterTypes" :key="lt.id" @click="selectLetterType(lt)"
                :disabled="!isProfileComplete"
                class="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all p-5 text-left group disabled:opacity-50 disabled:cursor-not-allowed">
                <div class="flex items-start gap-4">
                  <div class="p-3 bg-indigo-50 rounded-xl group-hover:bg-indigo-100 transition-colors shrink-0">
                    <FileText class="w-6 h-6 text-indigo-600" />
                  </div>
                  <div class="flex-1 min-w-0">
                    <h3 class="font-bold text-gray-900 group-hover:text-indigo-700 transition-colors">{{ lt.title }}</h3>
                    <p v-if="lt.description" class="text-sm text-gray-500 mt-1 line-clamp-2">{{ lt.description }}</p>
                    <div class="flex items-center gap-1 mt-3 text-xs font-semibold text-indigo-600">
                      <span>Ajukan</span>
                      <ChevronRight class="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </div>
              </button>
            </div>
          </div>

          <!-- Tab Content: Riwayat Pengajuan -->
          <div v-if="!editMode && !showDataWarning && activeTab === 'riwayat'">
            <div class="flex items-center justify-between mb-4">
              <h2 class="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Clock class="w-5 h-5 text-indigo-600" /> Riwayat Surat Anda
              </h2>
              <button @click="selectedStudentId && fetchLetterHistory(selectedStudentId, pinInput)" class="text-sm text-indigo-600 hover:text-indigo-700 font-semibold flex items-center gap-1">
                <RotateCcw class="w-4 h-4" :class="{'animate-spin': loadingHistory}" /> Refresh
              </button>
            </div>

            <div v-if="loadingHistory" class="text-center py-12">
              <div class="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-3"></div>
              <p class="text-sm text-gray-500">Memuat riwayat...</p>
            </div>

            <div v-else-if="letterHistory.length === 0" class="text-center py-12 text-gray-400 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
              <Clock class="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>Anda belum pernah mengajukan surat apapun.</p>
            </div>

            <div v-else class="space-y-4">
              <div v-for="req in letterHistory" :key="req.id" class="bg-white border text-sm rounded-xl p-4 shadow-sm" :class="{
                'border-green-200 bg-green-50/30': req.status === 'APPROVED' || req.status === 'FINISHED',
                'border-red-200 bg-red-50/30': req.status === 'REJECTED',
                'border-yellow-200 bg-yellow-50/30': req.status === 'PENDING' || req.status === 'PROCESSING'
              }">
                <div class="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div>
                    <div class="flex items-center gap-2 mb-1">
                      <span class="font-mono font-bold text-gray-800">{{ req.ticketNumber }}</span>
                      <span class="px-2 py-0.5 rounded text-xs font-bold" :class="{
                        'bg-yellow-100 text-yellow-700': req.status === 'PENDING' || req.status === 'PROCESSING',
                        'bg-green-100 text-green-700': req.status === 'APPROVED' || req.status === 'FINISHED',
                        'bg-red-100 text-red-700': req.status === 'REJECTED'
                      }">
                        {{ req.status }}
                      </span>
                    </div>
                    <h3 class="font-bold text-gray-900 text-base mb-1">{{ req.letterType }}</h3>
                    <p class="text-xs text-gray-500 flex items-center gap-1"><Clock class="w-3.5 h-3.5" /> Diajukan pada: {{ new Date(req.createdAt).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }) }}</p>
                    <div v-if="req.adminNotes" class="mt-3 bg-white bg-opacity-60 border p-3 rounded-lg text-xs text-gray-700">
                      <strong>Catatan Admin:</strong> {{ req.adminNotes }}
                    </div>
                  </div>
                  
                  <div v-if="req.status === 'APPROVED' || req.status === 'FINISHED'" class="shrink-0">
                    <button @click="printApprovedLetter(req.ticketNumber)"
                      class="w-full sm:w-auto px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2 shadow-sm">
                      <FileIcon class="w-4 h-4" /> Download/Cetak Surat
                    </button>
                    <p class="text-xs text-gray-500 mt-2 text-center sm:text-right w-full">Hasil surat sudah dapat diunduh</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </template>
      </div>

      <!-- ==================== STEP 3: Dynamic Form ==================== -->
      <div v-if="step === 3 && !submitted" class="space-y-6">
        <div class="flex items-center justify-between">
          <button @click="step = 2; selectedLetterType = null"
            class="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors">
            <ArrowLeft class="w-4 h-4" /> Kembali ke pilihan surat
          </button>

          <button v-if="selectedLetterType?.template && selectedLetterType?.allowPreview" @click="showLivePreview = !showLivePreview"
            class="flex items-center gap-1.5 text-sm font-semibold transition-colors px-3 py-1.5 rounded-lg border"
            :class="showLivePreview ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'">
            <component :is="showLivePreview ? EyeOff : Eye" class="w-4 h-4" />
            {{ showLivePreview ? 'Sembunyikan Preview' : 'Tampilkan Preview Surat' }}
          </button>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          <!-- LEFT/MAIN COLUMN: Form -->
          <div :class="selectedLetterType?.template && selectedLetterType?.allowPreview && showLivePreview ? 'lg:col-span-6' : 'lg:col-span-12'" class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 transition-all duration-300">
            <h2 class="text-lg font-bold text-gray-900 mb-1">{{ selectedLetterType?.title }}</h2>
            <p v-if="selectedLetterType?.description" class="text-sm text-gray-500 mb-6">{{ selectedLetterType.description }}</p>

            <div class="bg-indigo-50 border border-indigo-100 rounded-xl p-4 mb-6">
              <p class="text-xs font-bold text-indigo-600 uppercase mb-1">Pemohon</p>
              <p class="text-sm font-semibold text-gray-800">{{ studentDetail?.name }} ({{ studentDetail?.nim }})</p>
              <p class="text-xs text-gray-500">{{ studentDetail?.prodi }} · {{ studentDetail?.email }}</p>
            </div>

            <div v-if="selectedLetterType?.fields && selectedLetterType.fields.length > 0" class="space-y-4 mb-6">
              <div v-for="field in selectedLetterType.fields" :key="field.id">
                <label class="block text-sm font-medium text-gray-700 mb-1">
                  {{ field.label }} <span v-if="field.required" class="text-red-500">*</span>
                </label>
                <input v-if="['text','email','phone','number'].includes(field.type)" v-model="formData[field.id]"
                  :type="field.type === 'phone' ? 'tel' : field.type" :placeholder="field.placeholder || ''"
                  class="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 text-sm" />
                <textarea v-else-if="field.type === 'textarea'" v-model="formData[field.id]" rows="3"
                  :placeholder="field.placeholder || ''"
                  class="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 text-sm resize-y"></textarea>
                <input v-else-if="field.type === 'date'" v-model="formData[field.id]" type="date"
                  class="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 text-sm" />
                <select v-else-if="field.type === 'select'" v-model="formData[field.id]"
                  class="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 text-sm">
                  <option value="">-- Pilih --</option>
                  <option v-for="opt in field.options" :key="opt" :value="opt">{{ opt }}</option>
                </select>
                
                <!-- FILE UPLOAD -->
                <div v-else-if="field.type === 'file'" class="mt-1">
                  <div v-if="!formData[field.id]" 
                    @dragover.prevent="dragOver[field.id] = true"
                    @dragleave.prevent="dragOver[field.id] = false"
                    @drop.prevent="dragOver[field.id] = false; handleFileUpload($event, field.id, field.allowedExtensions, field.maxSize)"
                    class="relative flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-xl transition-colors cursor-pointer"
                    :class="dragOver[field.id] ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'">
                    <div class="space-y-2 text-center">
                      <div v-if="uploadingFile[field.id]" class="flex flex-col items-center justify-center">
                        <div class="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-2"></div>
                        <p class="text-sm text-gray-500">Mengupload...</p>
                      </div>
                      <div v-else>
                        <UploadCloud class="mx-auto h-12 w-12 text-gray-400" />
                        <div class="flex text-sm text-gray-600 justify-center">
                          <label :for="'file-upload-'+field.id" class="relative cursor-pointer font-medium text-indigo-600 hover:text-indigo-500">
                            <span>Upload file</span>
                            <input :id="'file-upload-'+field.id" type="file" class="sr-only" 
                              :accept="field.allowedExtensions"
                              @change="handleFileUpload($event, field.id, field.allowedExtensions, field.maxSize)" />
                          </label>
                          <p class="pl-1">atau drag and drop</p>
                        </div>
                        <p class="text-xs text-gray-500 mt-1">
                          {{ field.allowedExtensions ? field.allowedExtensions.replace(/,/g, ', ') : 'Gambar/PDF' }} hingga {{ field.maxSize || 2 }}MB
                        </p>
                      </div>
                    </div>
                  </div>
                  <div v-else class="flex items-center justify-between p-3 border border-emerald-200 bg-emerald-50 rounded-xl">
                    <div class="flex items-center gap-3 overflow-hidden">
                      <div class="p-2 bg-emerald-100 rounded-lg shrink-0">
                        <FileIcon class="w-5 h-5 text-emerald-600" />
                      </div>
                      <div class="min-w-0">
                        <p class="text-sm font-semibold text-emerald-800 truncate">File berhasil diupload</p>
                        <a :href="resolveUrl(formData[field.id])" target="_blank" class="text-xs text-emerald-600 hover:underline truncate">{{ formData[field.id].split('/').pop() }}</a>
                      </div>
                    </div>
                    <button @click="formData[field.id] = ''" class="p-2 text-emerald-600 hover:bg-emerald-100 rounded-lg transition-colors shrink-0" title="Hapus File">
                      <X class="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div v-else class="text-sm text-gray-500 italic mb-6">Tidak ada data tambahan yang perlu diisi.</div>

            <button @click="submitRequest" :disabled="submitting"
              class="w-full px-6 py-3.5 bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-bold rounded-xl hover:from-indigo-700 hover:to-blue-700 shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-2 disabled:opacity-70">
              <div v-if="submitting" class="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              <Send v-else class="w-5 h-5" />
              {{ submitting ? 'Mengirim...' : 'Kirim Pengajuan Surat' }}
            </button>
          </div>

          <!-- RIGHT COLUMN: Template Preview (Only if template exists) -->
          <div v-if="selectedLetterType?.template && selectedLetterType?.allowPreview && showLivePreview" class="lg:col-span-6 sticky top-24 transition-all duration-300 scale-in-center">
            <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col" style="height: calc(100vh - 120px);">
              <div class="bg-gray-50 border-b border-gray-100 px-4 py-2 flex items-center gap-2 shrink-0">
                <FileText class="w-4 h-4 text-gray-500" />
                <h3 class="text-sm font-bold text-gray-700">Preview Surat</h3>
                <div class="ml-auto flex items-center gap-1">
                  <button @click="previewZoom = Math.max(0.3, previewZoom - 0.1)" class="p-1 rounded text-gray-500 hover:bg-gray-200 hover:text-gray-700 transition-colors" title="Zoom Out">
                    <ZoomOut class="w-4 h-4" />
                  </button>
                  <span class="text-xs font-mono text-gray-500 w-10 text-center">{{ Math.round(previewZoom * 100) }}%</span>
                  <button @click="previewZoom = Math.min(1.0, previewZoom + 0.1)" class="p-1 rounded text-gray-500 hover:bg-gray-200 hover:text-gray-700 transition-colors" title="Zoom In">
                    <ZoomIn class="w-4 h-4" />
                  </button>
                  <button @click="previewZoom = 0.55" class="p-1 rounded text-gray-500 hover:bg-gray-200 hover:text-gray-700 transition-colors" title="Reset Zoom">
                    <RotateCcw class="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              
              <div class="flex-1 overflow-auto bg-gray-100 p-2 flex justify-center">
                <!-- A4 Paper Simulation -->
                <div class="bg-white shadow-lg print:shadow-none w-[210mm] min-h-[297mm] pt-[0.5cm] px-[1.5cm] pb-[1cm] relative print:w-full print:m-0 print:p-0 shrink-0"
                     :style="{ transform: `scale(${previewZoom})`, transformOrigin: 'top center', marginBottom: `-${(1 - previewZoom) * 100}%` }">
                  <!-- Header Image -->
                  <div v-if="selectedLetterType.template.headerImageUrl" class="mb-4 border-b-2 border-black pb-4 text-center">
                    <img :src="rootUrl + selectedLetterType.template.headerImageUrl" alt="Kop Surat" class="max-w-full max-h-32 mx-auto" />
                  </div>
                  
                  <!-- Note: If there is no specific header image, we display default text header just for visual cue -->
                  <div v-else class="mb-4 border-b-2 border-black pb-4 text-center text-sm font-serif">
                     <h1 class="font-bold text-lg">SEKOLAH PASCASARJANA</h1>
                     <h2 class="font-bold text-md">UNIVERSITAS IBN KHALDUN BOGOR</h2>
                     <p>Jl. KH. Sholeh Iskandar, Kota Bogor</p>
                  </div>

                  <!-- Document Content -->
                  <div class="prose prose-sm sm:prose-base max-w-none text-black prose-p:my-1.5 prose-headings:my-3" v-html="mappedHtmlPreview"></div>

                  <!-- Signature Section & Tembusan -->
                  <div class="mt-16 text-sm text-black">
                    <div class="flex" :class="{
                      'justify-start': selectedLetterType.template.signatureAlignment === 'left',
                      'justify-center': selectedLetterType.template.signatureAlignment === 'center',
                      'justify-end': !selectedLetterType.template.signatureAlignment || selectedLetterType.template.signatureAlignment === 'right'
                    }">
                      <div class="w-64 flex flex-col items-center text-center">
                         <p class="mb-1 text-black font-normal">{{ selectedLetterType.template.signatureLocation || 'Bogor' }}, {{ new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' }) }}</p>
                         <p class="font-bold whitespace-pre-wrap leading-tight mb-4 min-h-[2.5rem] text-black">{{ selectedLetterType.template.signatureTitle || 'Mengetahui,' }}</p>
                         
                         <div class="h-20 sm:h-24 flex items-center justify-center my-2">
                           <img v-if="selectedLetterType.template.signatureType === 'manual' && selectedLetterType.template.signatureImageUrl" 
                                :src="rootUrl + selectedLetterType.template.signatureImageUrl" 
                                class="max-h-full opacity-80" alt="Tanda Tangan" />
                           <div v-else-if="selectedLetterType.template.signatureType === 'barcode'" class="w-16 h-16 bg-gray-200 border-2 border-gray-400 border-dashed rounded flex flex-col items-center justify-center text-[10px] text-gray-500">
                             QR CODE
                           </div>
                         </div>
                         
                         <p class="font-bold underline text-black">{{ selectedLetterType.template.signatureName || '(Nama Penanda Tangan)' }}</p>
                      </div>
                    </div>
                    
                    <div v-if="selectedLetterType.template.tembusanText" class="mt-8 text-left w-full text-black">
                       <strong class="text-black">Tembusan:</strong>
                       <p class="whitespace-pre-wrap text-black">{{ selectedLetterType.template.tembusanText }}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ==================== SUCCESS ==================== -->
      <div v-if="submitted" class="bg-white rounded-2xl shadow-sm border border-emerald-100 p-8 text-center">
        <div class="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 class="w-8 h-8 text-emerald-600" />
        </div>
        <h2 class="text-xl font-bold text-gray-900 mb-2">Pengajuan Berhasil Dikirim!</h2>
        <p class="text-gray-500 mb-4">Surat Anda sedang diproses oleh admin.</p>
        <div class="bg-indigo-50 border border-indigo-200 rounded-xl p-4 max-w-xs mx-auto mb-6">
          <p class="text-xs font-bold text-indigo-600 uppercase mb-1">Nomor Tiket</p>
          <p class="text-2xl font-mono font-bold text-indigo-800">{{ ticketNumber }}</p>
          <p class="text-xs text-indigo-500 mt-1">Simpan nomor ini untuk melacak status.</p>
        </div>
        <div class="flex justify-center gap-3">
          <button @click="resetAll"
            class="px-5 py-2.5 text-sm font-semibold rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors">
            Kembali
          </button>
          <button @click="router.push({ name: 'letters.public.track', params: { ticket: ticketNumber } })"
            class="px-5 py-2.5 text-sm font-semibold rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition-colors">
            Lacak Status
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style>
.prose table {
  width: 100%;
  border-collapse: collapse;
  margin-left: auto;
  margin-right: auto;
}
.prose table td, .prose table th {
  border: 1px solid #ccc;
  padding: 8px;
}
</style>

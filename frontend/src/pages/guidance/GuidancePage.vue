<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import api from '@/lib/api'
import SearchableSelect from '@/components/ui/SearchableSelect.vue'
import {
  Calendar,
  CheckCircle2,
  XCircle,
  Plus,
  Loader2,
  Search,
  BookOpen,
  Download,
  FileText,
  Clock,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  User,
  Users,
  Check,
  Info
} from 'lucide-vue-next'

const loading = ref(true)
const items = ref<any[]>([])
const logbookItems = ref<any[]>([])
const page = ref(1)
const total = ref(0)

const filterStatus = ref('')
const filterDate = ref('')
const filterType = ref('')
const search = ref('')
const activeTab = ref<'history' | 'verification'>('history')

const showCreateForm = ref(false)
const saving = ref(false)

const lecturers = ref<any[]>([])
const students = ref<any[]>([])
const rooms = ref<any[]>([])

// Verification detail modal
const selectedLogbook = ref<any>(null)
const showVerificationModal = ref(false)
const verificationSubmitting = ref(false)
const assessmentStatus = ref<'APPROVED' | 'REJECTED' | 'RESUBMIT'>('APPROVED')
const reviewerNotes = ref('')
const nextSteps = ref('')

// Student history timeline modal
const showHistoryModal = ref(false)
const selectedStudentName = ref('')
const studentHistoryLogs = ref<any[]>([])
const loadingStudentHistory = ref(false)

// Form new guidance
const form = ref({
  mode: 'DIRECT' as 'REQUEST' | 'DIRECT',
  studentId: '' as string | number,
  lecturerId: '' as string | number,
  date: new Date().toISOString().split('T')[0],
  startTime: '09:00',
  endTime: '10:00',
  roomId: '' as string | number,
  topic: '',
  type: 'TESIS',
})

onMounted(async () => {
  await Promise.all([fetchData(), fetchOptions(), fetchLogbooks()])
})

async function fetchData() {
  loading.value = true
  try {
    const params: any = { page: page.value, limit: 100 }
    if (filterStatus.value) params.status = filterStatus.value
    if (filterDate.value) params.date = filterDate.value
    const { data } = await api.get('/guidance', { params })
    items.value = data.data || []
    total.value = data.total || 0
  } finally {
    loading.value = false
  }
}

async function fetchOptions() {
  try {
    const [lecRes, stuRes, roomRes] = await Promise.all([
      api.get('/lecturers?perPage=100&ignoreProdiScope=true'),
      api.get('/students?perPage=200'),
      api.get('/rooms?perPage=100'),
    ])
    lecturers.value = lecRes.data?.data || []
    students.value = stuRes.data?.data || []
    rooms.value = roomRes.data?.data || []
  } catch {}
}

async function fetchLogbooks() {
  try {
    const { data } = await api.get('/guidance/logbook', { params: { status: 'PENDING' } })
    logbookItems.value = data || []
  } catch {}
}

async function createGuidance() {
  if (!form.value.studentId || !form.value.lecturerId || !form.value.date) {
    alert('Lengkapi data mahasiswa, dosen, dan tanggal')
    return
  }
  saving.value = true
  try {
    await api.post('/guidance', {
      ...form.value,
      studentId: Number(form.value.studentId),
      lecturerId: Number(form.value.lecturerId),
      roomId: form.value.roomId ? Number(form.value.roomId) : undefined,
      status: form.value.mode === 'REQUEST' ? 'PENDING' : 'APPROVED',
    })
    showCreateForm.value = false
    form.value = {
      mode: 'DIRECT',
      studentId: '',
      lecturerId: '',
      date: new Date().toISOString().split('T')[0],
      startTime: '09:00',
      endTime: '10:00',
      roomId: '',
      topic: '',
      type: 'TESIS'
    }
    await fetchData()
  } catch (e: any) {
    alert(e.response?.data?.message || 'Gagal membuat jadwal')
  } finally {
    saving.value = false
  }
}

async function openVerification(logbook: any) {
  selectedLogbook.value = logbook
  assessmentStatus.value = logbook.status === 'REJECTED' ? 'REJECTED' : 'APPROVED'
  reviewerNotes.value = logbook.reviewerNotes || ''
  nextSteps.value = logbook.nextSteps || ''
  
  // Load this student's timeline history as well
  loadingStudentHistory.value = true
  try {
    const { data } = await api.get(`/guidance/logbook/student/${logbook.studentId}`)
    studentHistoryLogs.value = data || []
  } catch (e) {
    studentHistoryLogs.value = []
  } finally {
    loadingStudentHistory.value = false
  }
  
  showVerificationModal.value = true
}

async function submitVerification() {
  if (!selectedLogbook.value) return
  verificationSubmitting.value = true
  try {
    const statusVal = assessmentStatus.value === 'RESUBMIT' ? 'REJECTED' : assessmentStatus.value
    await api.patch(`/guidance/logbook/${selectedLogbook.value.id}/validate`, {
      status: statusVal,
      reviewerNotes: reviewerNotes.value,
      nextSteps: nextSteps.value,
    })
    showVerificationModal.value = false
    selectedLogbook.value = null
    await fetchLogbooks()
    await fetchData()
  } catch (e: any) {
    alert(e.response?.data?.message || 'Gagal menyimpan feedback verifikasi')
  } finally {
    verificationSubmitting.value = false
  }
}

async function viewStudentHistory(studentId: number, name: string) {
  selectedStudentName.value = name
  loadingStudentHistory.value = true
  showHistoryModal.value = true
  try {
    const { data } = await api.get(`/guidance/logbook/student/${studentId}`)
    studentHistoryLogs.value = data || []
  } catch (e) {
    studentHistoryLogs.value = []
  } finally {
    loadingStudentHistory.value = false
  }
}

const totalSessions = computed(() => items.value.length)
const needFeedbackCount = computed(() => logbookItems.value.length)
const filteredItems = computed(() => {
  const q = search.value.trim().toLowerCase()
  return items.value.filter((it: any) => {
    const hitSearch = !q || `${it.studentName || ''} ${it.studentNim || ''} ${it.topic || ''}`.toLowerCase().includes(q)
    const hitType = !filterType.value || it.type === filterType.value
    return hitSearch && hitType
  })
})

const statusConfig: Record<string, { label: string; class: string }> = {
  PENDING: { label: 'Perlu Feedback', class: 'bg-amber-50 text-amber-700 border border-amber-200' },
  APPROVED: { label: 'Disetujui', class: 'bg-emerald-50 text-emerald-700 border border-emerald-200' },
  REJECTED: { label: 'Revisi', class: 'bg-rose-50 text-rose-700 border border-rose-200' },
  DONE: { label: 'Selesai', class: 'bg-slate-100 text-slate-600 border border-slate-200' },
  CANCELLED: { label: 'Dibatalkan', class: 'bg-slate-100 text-slate-500' },
}

const formatAttachmentName = (url: string) => {
  if (!url) return ''
  const parts = url.split('/')
  return parts[parts.length - 1] || 'Dokumen Lampiran'
}

function applyFormat(command: string) {
  document.execCommand(command, false)
}

function updateNotesHtml(e: Event) {
  const el = e.target as HTMLDivElement
  reviewerNotes.value = el.innerHTML
}
</script>

<template>
  <div class="space-y-6 max-w-[1600px] mx-auto p-4 md:p-6 text-slate-800">
    <!-- Header -->
    <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <h1 class="text-3xl font-extrabold tracking-tight text-slate-900">Daftar Riwayat Bimbingan</h1>
        <p class="text-base text-slate-500 mt-1">Kelola dan pantau seluruh sesi konsultasi mahasiswa bimbingan Anda.</p>
      </div>
      <div class="flex flex-wrap items-center gap-3">
        <div class="flex items-center gap-4 bg-white rounded-2xl border border-slate-200/80 px-5 py-3.5 shadow-sm">
          <div class="bg-blue-50 p-2.5 rounded-xl text-blue-600">
            <Users class="h-6 w-6" />
          </div>
          <div>
            <p class="text-xs font-medium text-slate-400 uppercase tracking-wider">Total Sesi</p>
            <p class="text-2xl font-bold text-slate-900 leading-none mt-1">{{ totalSessions }} <span class="text-sm font-normal text-slate-500">Sesi</span></p>
          </div>
        </div>
        <div class="flex items-center gap-4 bg-white rounded-2xl border border-slate-200/80 px-5 py-3.5 shadow-sm">
          <div class="bg-amber-50 p-2.5 rounded-xl text-amber-600">
            <Clock class="h-6 w-6" />
          </div>
          <div>
            <p class="text-xs font-medium text-slate-400 uppercase tracking-wider">Perlu Feedback</p>
            <p class="text-2xl font-bold text-slate-900 leading-none mt-1">{{ needFeedbackCount }} <span class="text-sm font-normal text-slate-500 font-sans">Sesi</span></p>
          </div>
        </div>
        <button @click="showCreateForm = true" class="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-5 py-3.5 text-sm font-bold text-white hover:bg-blue-800 shadow-lg shadow-blue-700/15 transition duration-200">
          <Plus class="h-5 w-5" /> Buat Jadwal
        </button>
      </div>
    </div>

    <!-- Navigation Tabs -->
    <div class="border-b border-slate-200/80">
      <div class="flex gap-6">
        <button
          @click="activeTab = 'history'"
          :class="[
            'pb-4 text-sm font-bold border-b-2 transition duration-200 px-1',
            activeTab === 'history' ? 'border-blue-700 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-700'
          ]"
        >
          Riwayat Bimbingan
        </button>
        <button
          @click="activeTab = 'verification'"
          :class="[
            'pb-4 text-sm font-bold border-b-2 transition duration-200 px-1 inline-flex items-center gap-2',
            activeTab === 'verification' ? 'border-blue-700 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-700'
          ]"
        >
          Verifikasi Logbook
          <span :class="[
            'rounded-full px-2 py-0.5 text-xs font-bold leading-none',
            activeTab === 'verification' ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-600'
          ]">{{ needFeedbackCount }}</span>
        </button>
      </div>
    </div>

    <!-- Active Tab Content -->
    <div v-if="activeTab === 'history'" class="space-y-6">
      <!-- Search & Filters -->
      <div class="bg-white rounded-2xl border border-slate-200/85 p-5 shadow-sm space-y-4">
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div class="relative">
            <span class="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
              <Search class="h-5 w-5" />
            </span>
            <input v-model="search" type="text" placeholder="Nama mahasiswa atau NIM..." class="w-full rounded-xl border border-slate-300 pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition" />
          </div>
          <div>
            <select v-model="filterType" class="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition bg-white">
              <option value="">Semua Tipe Pertemuan</option>
              <option value="TESIS">Tatap Muka (Luring)</option>
              <option value="DISERTASI">Online (Daring)</option>
              <option value="PROPOSAL">Hybrid</option>
            </select>
          </div>
          <div>
            <select v-model="filterStatus" @change="fetchData()" class="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition bg-white">
              <option value="">Semua Status</option>
              <option value="APPROVED">Disetujui</option>
              <option value="PENDING">Perlu Feedback</option>
              <option value="REJECTED">Revisi</option>
            </select>
          </div>
          <div>
            <input v-model="filterDate" @change="fetchData()" type="date" class="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition bg-white" />
          </div>
        </div>
      </div>

      <!-- History Table -->
      <div class="bg-white rounded-2xl border border-slate-200/85 overflow-hidden shadow-sm">
        <div v-if="loading" class="p-12 text-center text-slate-400">
          <Loader2 class="h-8 w-8 mx-auto animate-spin mb-3 text-blue-600" />
          <p class="text-sm font-medium">Memuat data bimbingan...</p>
        </div>
        <div v-else-if="filteredItems.length === 0" class="p-16 text-center text-slate-400">
          <Calendar class="h-12 w-12 mx-auto mb-4 text-slate-300" />
          <p class="text-base font-bold text-slate-600">Belum ada riwayat bimbingan</p>
          <p class="text-sm text-slate-400 mt-1">Gunakan tombol "Buat Jadwal" atau setujui logbook mahasiswa untuk menambah riwayat.</p>
        </div>
        <div v-else class="overflow-x-auto">
          <table class="w-full text-sm text-left">
            <thead class="bg-slate-50 border-b border-slate-200/80 text-slate-600 uppercase text-xs tracking-wider">
              <tr>
                <th class="py-4 px-6 font-bold">Mahasiswa</th>
                <th class="py-4 px-6 font-bold">Judul Tesis</th>
                <th class="py-4 px-6 font-bold">Tanggal</th>
                <th class="py-4 px-6 font-bold">Tipe</th>
                <th class="py-4 px-6 font-bold text-center">Status</th>
                <th class="py-4 px-6 font-bold text-right">Aksi</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr v-for="item in filteredItems" :key="item.id" class="hover:bg-slate-50/50 transition">
                <td class="py-4 px-6">
                  <div class="flex items-center gap-3">
                    <div class="h-10 w-10 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-sm border border-slate-200">
                      {{ item.studentName?.charAt(0) || 'M' }}
                    </div>
                    <div>
                      <p class="font-bold text-slate-900 leading-tight">{{ item.studentName }}</p>
                      <p class="text-xs text-slate-400 mt-0.5">{{ item.studentNim }}</p>
                    </div>
                  </div>
                </td>
                <td class="py-4 px-6 max-w-[320px]">
                  <p class="text-slate-800 font-medium line-clamp-2 leading-relaxed">{{ item.topic || '-' }}</p>
                </td>
                <td class="py-4 px-6">
                  <p class="font-semibold text-slate-900">{{ new Date(item.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) }}</p>
                  <p class="text-xs text-slate-500 mt-0.5">{{ item.startTime?.slice(0,5) }} - {{ item.endTime?.slice(0,5) }} WIB</p>
                </td>
                <td class="py-4 px-6">
                  <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                    <span class="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                    {{ item.meetingType || 'Tatap Muka' }}
                  </span>
                </td>
                <td class="py-4 px-6 text-center">
                  <span :class="['inline-flex items-center px-3 py-1 rounded-full text-xs font-bold leading-none', statusConfig[item.status]?.class || 'bg-slate-100 text-slate-500 border border-slate-200']">
                    {{ statusConfig[item.status]?.label || item.status }}
                  </span>
                </td>
                <td class="py-4 px-6 text-right">
                  <button @click="viewStudentHistory(item.studentId, item.studentName)" class="text-sm font-bold text-blue-700 hover:text-blue-800 transition duration-150 inline-flex items-center gap-1">
                    Lihat Detail <ChevronRight class="h-4 w-4" />
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Widgets & Statistics -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Guidance Trend -->
        <div class="bg-white rounded-2xl border border-slate-200/85 p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div class="flex items-center justify-between mb-4">
              <h3 class="text-lg font-bold text-slate-900">Trend Bimbingan</h3>
              <TrendingUp class="h-5 w-5 text-blue-600" />
            </div>
            <p class="text-xs text-slate-500 mb-6">Aktivitas bimbingan meningkat 15% minggu ini dibanding minggu lalu.</p>
            <div class="flex items-end gap-3 h-28 pt-4 pb-2 px-2">
              <div class="flex-1 bg-slate-100 hover:bg-blue-100 rounded-t-lg transition-all h-[30%] group relative">
                <span class="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] font-bold text-slate-600 opacity-0 group-hover:opacity-100 transition">3</span>
              </div>
              <div class="flex-1 bg-slate-100 hover:bg-blue-100 rounded-t-lg transition-all h-[55%] group relative">
                <span class="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] font-bold text-slate-600 opacity-0 group-hover:opacity-100 transition">6</span>
              </div>
              <div class="flex-1 bg-slate-100 hover:bg-blue-100 rounded-t-lg transition-all h-[40%] group relative">
                <span class="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] font-bold text-slate-600 opacity-0 group-hover:opacity-100 transition">4</span>
              </div>
              <div class="flex-1 bg-slate-100 hover:bg-blue-100 rounded-t-lg transition-all h-[80%] group relative">
                <span class="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] font-bold text-slate-600 opacity-0 group-hover:opacity-100 transition">9</span>
              </div>
              <div class="flex-1 bg-slate-100 hover:bg-blue-100 rounded-t-lg transition-all h-[65%] group relative">
                <span class="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] font-bold text-slate-600 opacity-0 group-hover:opacity-100 transition">7</span>
              </div>
              <div class="flex-1 bg-blue-600 rounded-t-lg transition-all h-[95%] group relative">
                <span class="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] font-bold text-blue-700 opacity-100 transition">12</span>
              </div>
            </div>
          </div>
          <div class="border-t border-slate-100 pt-4 flex items-center justify-between text-xs font-semibold text-slate-400 uppercase tracking-wider">
            <span>Sen</span>
            <span>Sel</span>
            <span>Rab</span>
            <span>Kam</span>
            <span>Jum</span>
            <span class="text-blue-600 font-bold">Sab</span>
          </div>
        </div>

        <!-- Next Schedule -->
        <div class="bg-blue-700 text-white rounded-2xl p-6 shadow-lg shadow-blue-700/10 flex flex-col justify-between">
          <div>
            <p class="text-xs font-bold text-blue-100 uppercase tracking-widest">Jadwal Terdekat</p>
            <h3 class="text-2xl font-bold mt-2">Konsultasi Bab 4</h3>
            <p class="text-sm text-blue-100 mt-2">Besok, 09:00 WIB • Ruang Dosen 2</p>
          </div>
          <div class="mt-6 border-t border-white/20 pt-4 flex items-center justify-between">
            <button class="bg-white/10 hover:bg-white/20 transition rounded-xl px-4 py-2.5 text-xs font-bold w-full text-center">
              Lihat Kalender
            </button>
          </div>
        </div>

        <!-- Most Active Students -->
        <div class="bg-white rounded-2xl border border-slate-200/85 p-6 shadow-sm">
          <h3 class="text-lg font-bold text-slate-900 mb-4">Mahasiswa Paling Aktif</h3>
          <div class="space-y-4">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-xs">BK</div>
                <div>
                  <p class="text-xs font-bold text-slate-800">Bambang Kusuma</p>
                  <p class="text-[10px] text-slate-400">1902030012</p>
                </div>
              </div>
              <div class="text-right">
                <p class="text-xs font-extrabold text-blue-700">85%</p>
                <div class="w-16 bg-slate-100 h-1.5 rounded-full mt-1 overflow-hidden">
                  <div class="bg-blue-700 h-full rounded-full" style="width: 85%"></div>
                </div>
              </div>
            </div>
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center font-bold text-xs">MA</div>
                <div>
                  <p class="text-xs font-bold text-slate-800">Maya Anindita</p>
                  <p class="text-[10px] text-slate-400">1902030088</p>
                </div>
              </div>
              <div class="text-right">
                <p class="text-xs font-extrabold text-blue-700">72%</p>
                <div class="w-16 bg-slate-100 h-1.5 rounded-full mt-1 overflow-hidden">
                  <div class="bg-blue-700 h-full rounded-full" style="width: 72%"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Verification Tab -->
    <div v-if="activeTab === 'verification'" class="bg-white rounded-2xl border border-slate-200/85 overflow-hidden shadow-sm">
      <div class="px-6 py-5 border-b border-slate-200/80 flex items-center justify-between">
        <h3 class="text-lg font-bold text-slate-900">Logbook Mahasiswa (Perlu Verifikasi)</h3>
        <span class="bg-rose-100 text-rose-700 text-xs font-bold px-3 py-1 rounded-full leading-none">{{ needFeedbackCount }} Logbook</span>
      </div>
      <div v-if="!logbookItems.length" class="p-12 text-center text-slate-400">
        <CheckCircle2 class="h-12 w-12 mx-auto mb-4 text-emerald-500" />
        <p class="text-base font-bold text-slate-800">Semua logbook sudah terverifikasi!</p>
        <p class="text-sm text-slate-400 mt-1">Tidak ada logbook pending yang memerlukan review Anda saat ini.</p>
      </div>
      <div v-else class="overflow-x-auto">
        <table class="w-full text-sm text-left">
          <thead class="bg-slate-50 border-b border-slate-200/80 text-slate-600 uppercase text-xs tracking-wider">
            <tr>
              <th class="py-4 px-6 font-bold">Tanggal</th>
              <th class="py-4 px-6 font-bold">Mahasiswa</th>
              <th class="py-4 px-6 font-bold">Topik / Draft</th>
              <th class="py-4 px-6 font-bold">Lampiran</th>
              <th class="py-4 px-6 font-bold text-center">Aksi</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-for="log in logbookItems" :key="`lg-${log.id}`" class="hover:bg-slate-50/50 transition">
              <td class="py-4 px-6">
                <p class="font-semibold text-slate-900">{{ new Date(log.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) }}</p>
                <p class="text-xs text-slate-500 mt-0.5">{{ log.startTime?.slice(0,5) || '--:--' }} - {{ log.endTime?.slice(0,5) || '--:--' }} WIB</p>
              </td>
              <td class="py-4 px-6">
                <div class="flex items-center gap-3">
                  <div class="h-9 w-9 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-600 text-xs">
                    {{ log.studentName?.charAt(0) || 'M' }}
                  </div>
                  <div>
                    <p class="font-bold text-slate-900 leading-tight">{{ log.studentName }}</p>
                    <p class="text-xs text-slate-400 mt-0.5">{{ log.studentNim }}</p>
                  </div>
                </div>
              </td>
              <td class="py-4 px-6 max-w-[280px]">
                <p class="font-bold text-slate-800 leading-snug line-clamp-1">{{ log.topic || '-' }}</p>
                <p class="text-xs text-slate-400 mt-1 line-clamp-1">{{ log.thesisTitle }}</p>
              </td>
              <td class="py-4 px-6">
                <a v-if="log.attachmentUrl" :href="log.attachmentUrl" target="_blank" class="inline-flex items-center gap-1 text-xs font-bold text-blue-700 hover:underline">
                  <FileText class="h-4 w-4" /> {{ formatAttachmentName(log.attachmentUrl) }}
                </a>
                <span v-else class="text-slate-400">-</span>
              </td>
              <td class="py-4 px-6 text-center">
                <button @click="openVerification(log)" class="rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs px-4 py-2 transition duration-150 shadow-sm">
                  Berikan Feedback
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Create Guidance Schedule Modal -->
    <div v-if="showCreateForm" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 transition-all duration-300">
      <div class="w-full max-w-2xl rounded-2xl bg-white border border-slate-200/90 shadow-2xl p-6 max-h-[90vh] overflow-auto">
        <div class="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
          <h3 class="text-lg font-extrabold text-slate-900">Buat Jadwal Bimbingan</h3>
          <button @click="showCreateForm = false" class="text-slate-400 hover:text-slate-600 transition">
            <XCircle class="h-6 w-6" />
          </button>
        </div>
        <div class="space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Mode Sesi</label>
              <select v-model="form.mode" class="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition bg-white">
                <option value="DIRECT">Langsung (tanpa pengajuan)</option>
                <option value="REQUEST">Via Pengajuan Bimbingan</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Mahasiswa</label>
              <SearchableSelect v-model="form.studentId" :options="students.map((s) => ({ value: s.id, label: `${s.name} (${s.nim})` }))" placeholder="Cari mahasiswa..." />
            </div>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Dosen Pembimbing</label>
              <SearchableSelect v-model="form.lecturerId" :options="lecturers.map((l) => ({ value: l.id, label: l.fullName || l.name }))" placeholder="Cari dosen..." />
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Tipe Bimbingan</label>
              <select v-model="form.type" class="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition bg-white">
                <option value="TESIS">Tesis</option>
                <option value="DISERTASI">Disertasi</option>
                <option value="PROPOSAL">Proposal</option>
                <option value="UMUM">Umum</option>
              </select>
            </div>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Tanggal</label>
              <input v-model="form.date" type="date" class="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition" />
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Jam Mulai</label>
              <input v-model="form.startTime" type="time" class="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition" />
            </div>
            <div>
              <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Jam Selesai</label>
              <input v-model="form.endTime" type="time" class="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition" />
            </div>
          </div>
          <div>
            <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Topik Bimbingan</label>
            <input v-model="form.topic" type="text" placeholder="Masukkan ringkasan topik" class="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition" />
          </div>
        </div>
        <div class="flex justify-end gap-3 mt-6 border-t border-slate-100 pt-4">
          <button @click="showCreateForm = false" class="px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition">Batal</button>
          <button @click="createGuidance" :disabled="saving" class="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-800 disabled:opacity-50 transition shadow-md">
            <Loader2 v-if="saving" class="h-4 w-4 animate-spin" /> Simpan
          </button>
        </div>
      </div>
    </div>

    <!-- Persetujuan & Feedback Logbook Modal (Full Page Design) -->
    <div v-if="showVerificationModal" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 md:p-6 transition-all">
      <div class="w-full max-w-7xl rounded-3xl bg-slate-50 border border-slate-200/90 shadow-2xl p-6 md:p-8 max-h-[95vh] overflow-y-auto flex flex-col gap-6">
        <!-- Header -->
        <div class="flex items-center justify-between border-b border-slate-200/60 pb-5">
          <div>
            <h2 class="text-2xl font-extrabold text-slate-900">Persetujuan & Feedback Logbook</h2>
            <p class="text-sm text-slate-500 mt-1">Review laporan progres bimbingan mahasiswa dan berikan validasi.</p>
          </div>
          <button @click="showVerificationModal = false" class="text-slate-400 hover:text-slate-600 transition">
            <XCircle class="h-7 w-7" />
          </button>
        </div>

        <!-- Main Workspace -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          
          <!-- Left Columns (Form & Logbook Detail) -->
          <div class="lg:col-span-2 space-y-6">
            <!-- Student Header card -->
            <div class="bg-white rounded-2xl border border-slate-200/70 p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div class="flex items-center gap-4">
                <div class="h-16 w-16 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-extrabold text-xl border border-slate-200">
                  {{ selectedLogbook.studentName?.charAt(0) || 'M' }}
                </div>
                <div>
                  <div class="flex items-center gap-2 flex-wrap">
                    <h3 class="text-lg font-bold text-slate-900">{{ selectedLogbook.studentName }}</h3>
                    <span class="bg-blue-50 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">Active Research</span>
                  </div>
                  <p class="text-xs text-slate-500 italic mt-1 font-medium">"{{ selectedLogbook.thesisTitle }}"</p>
                </div>
              </div>
              <div class="flex flex-col items-end text-xs text-slate-400 gap-1.5 md:border-l md:border-slate-100 md:pl-5">
                <div class="flex items-center gap-1.5">
                  <Calendar class="w-4 h-4 text-slate-400" />
                  <span class="font-semibold text-slate-600">{{ new Date(selectedLogbook.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) }}</span>
                </div>
                <div class="flex items-center gap-1.5">
                  <Clock class="w-4 h-4 text-slate-400" />
                  <span class="font-semibold text-slate-600">{{ selectedLogbook.startTime?.slice(0,5) }} - {{ selectedLogbook.endTime?.slice(0,5) }} WIB</span>
                </div>
                <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-bold tracking-wider text-[10px] uppercase">
                  {{ selectedLogbook.meetingType || 'LURING' }}
                </span>
              </div>
            </div>

            <!-- Student Submission Log -->
            <div class="bg-white rounded-2xl border border-slate-200/70 p-6 shadow-sm space-y-4">
              <div class="flex items-center gap-2 text-xs font-bold text-blue-700 uppercase tracking-widest">
                <BookOpen class="h-4 w-4" /> Student Log Submission
              </div>
              <h3 class="text-xl font-bold text-slate-900 leading-snug">{{ selectedLogbook.topic }}</h3>
              
              <div class="text-sm text-slate-700 leading-relaxed border-t border-slate-100 pt-4 space-y-3">
                <p v-if="selectedLogbook.studentProgress" class="whitespace-pre-line">{{ selectedLogbook.studentProgress }}</p>
                <div v-if="selectedLogbook.notes" v-html="selectedLogbook.notes"></div>
              </div>

              <!-- Attachment -->
              <div v-if="selectedLogbook.attachmentUrl" class="border border-slate-200/80 rounded-xl p-4 flex items-center justify-between bg-slate-50/50 hover:bg-slate-50 transition">
                <div class="flex items-center gap-3">
                  <div class="bg-rose-50 text-rose-600 p-2 rounded-lg">
                    <FileText class="w-6 h-6" />
                  </div>
                  <div>
                    <p class="text-xs font-bold text-slate-800">{{ formatAttachmentName(selectedLogbook.attachmentUrl) }}</p>
                    <p class="text-[10px] text-slate-400">PDF Document</p>
                  </div>
                </div>
                <a :href="selectedLogbook.attachmentUrl" target="_blank" class="inline-flex items-center gap-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold px-3 py-2 rounded-lg shadow-sm transition">
                  <Download class="w-4 h-4" /> Download
                </a>
              </div>
            </div>

            <!-- Lecturer Assessment Field -->
            <div class="bg-white rounded-2xl border border-slate-200/70 p-6 shadow-sm space-y-6">
              <div class="flex items-center gap-2 text-xs font-bold text-blue-700 uppercase tracking-widest">
                <CheckCircle2 class="h-4 w-4" /> Lecturer Assessment
              </div>

              <!-- Status Selection -->
              <div>
                <label class="block text-sm font-bold text-slate-700 mb-3">Approval Status</label>
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button @click="assessmentStatus = 'APPROVED'" type="button" :class="[
                    'flex items-center justify-center gap-2 py-3 px-4 rounded-xl border font-bold text-sm transition duration-200',
                    assessmentStatus === 'APPROVED' ? 'bg-emerald-50 text-emerald-800 border-emerald-600 ring-2 ring-emerald-100' : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'
                  ]">
                    <CheckCircle2 class="h-4 w-4" /> Approved
                  </button>
                  <button @click="assessmentStatus = 'REJECTED'" type="button" :class="[
                    'flex items-center justify-center gap-2 py-3 px-4 rounded-xl border font-bold text-sm transition duration-200',
                    assessmentStatus === 'REJECTED' ? 'bg-rose-50 text-rose-800 border-rose-600 ring-2 ring-rose-100' : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'
                  ]">
                    <XCircle class="h-4 w-4" /> Revision Required
                  </button>
                  <button @click="assessmentStatus = 'RESUBMIT'" type="button" :class="[
                    'flex items-center justify-center gap-2 py-3 px-4 rounded-xl border font-bold text-sm transition duration-200',
                    assessmentStatus === 'RESUBMIT' ? 'bg-amber-50 text-amber-800 border-amber-500 ring-2 ring-amber-100' : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'
                  ]">
                    <Clock class="h-4 w-4" /> Resubmit
                  </button>
                </div>
              </div>

              <!-- Guidance Notes Editor -->
              <div>
                <label class="block text-sm font-bold text-slate-700 mb-2">Technical Feedback & Guidance</label>
                <div class="rounded-xl border border-slate-200 overflow-hidden focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-600 transition">
                  <div class="flex items-center gap-1 border-b border-slate-200 bg-slate-50 px-3 py-2">
                    <button type="button" @click="applyFormat('bold')" class="px-3 py-1 font-bold text-xs rounded hover:bg-slate-200">B</button>
                    <button type="button" @click="applyFormat('italic')" class="px-3 py-1 italic text-xs rounded hover:bg-slate-200">I</button>
                    <button type="button" @click="applyFormat('insertUnorderedList')" class="px-3 py-1 text-xs rounded hover:bg-slate-200">List</button>
                  </div>
                  <div class="min-h-[140px] px-4 py-3 text-sm focus:outline-none bg-white whitespace-pre-line" contenteditable="true" @input="updateNotesHtml" placeholder="Berikan saran atau catatan koreksi detail...">{{ selectedLogbook.reviewerNotes }}</div>
                </div>
              </div>

              <!-- Recommendations / Next Steps -->
              <div>
                <label class="block text-sm font-bold text-slate-700 mb-2">Next Steps / Recommendations</label>
                <input v-model="nextSteps" type="text" placeholder="e.g. Sempurnakan latar belakang BAB 1 dan pelajari algoritma Deep Q-Network" class="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition" />
              </div>

              <!-- Action buttons -->
              <div class="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button @click="showVerificationModal = false" class="px-5 py-3 rounded-xl border border-slate-300 text-sm font-bold text-slate-700 hover:bg-slate-50 transition">
                  Simpan sebagai Draf
                </button>
                <button @click="submitVerification" :disabled="verificationSubmitting" class="bg-blue-700 hover:bg-blue-800 text-white font-bold text-sm px-6 py-3 rounded-xl transition duration-150 inline-flex items-center gap-2 shadow-lg shadow-blue-700/10 disabled:opacity-50">
                  <Loader2 v-if="verificationSubmitting" class="w-4 h-4 animate-spin" />
                  Kirim Feedback & Setujui
                </button>
              </div>
            </div>
          </div>

          <!-- Right Column (Timeline & Metadata Sidebar) -->
          <div class="space-y-6">
            <!-- Student Logbook History Summary -->
            <div class="bg-white rounded-2xl border border-slate-200/70 p-5 shadow-sm space-y-5">
              <div class="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 class="text-sm font-bold text-slate-800">History Summary</h3>
                <Clock class="w-4 h-4 text-slate-400" />
              </div>
              <div v-if="loadingStudentHistory" class="text-center py-6 text-slate-400">
                <Loader2 class="w-6 h-6 mx-auto animate-spin" />
              </div>
              <div v-else-if="!studentHistoryLogs.length" class="text-slate-400 text-xs py-4 text-center">
                Belum ada log bimbingan sebelumnya.
              </div>
              <div v-else class="relative pl-4 space-y-6 before:absolute before:inset-y-0 before:left-1.5 before:w-[2px] before:bg-slate-100">
                <div v-for="hLog in studentHistoryLogs.slice(0, 3)" :key="hLog.id" class="relative group">
                  <span class="absolute -left-[19px] top-1.5 w-3.5 h-3.5 rounded-full border-2 border-white bg-blue-700 group-hover:scale-110 transition duration-150"></span>
                  <div class="text-[11px] font-bold text-slate-400 uppercase tracking-wide">
                    {{ new Date(hLog.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) }} • Log #{{ hLog.id }}
                  </div>
                  <h4 class="text-xs font-bold text-slate-800 mt-1 leading-snug">{{ hLog.topic }}</h4>
                  <p class="text-[11px] text-slate-500 mt-1 italic line-clamp-2 leading-relaxed bg-slate-50/70 p-2 rounded border border-slate-100">"{{ hLog.reviewerNotes || 'Menunggu feedback' }}"</p>
                </div>
              </div>
              <button @click="viewStudentHistory(selectedLogbook.studentId, selectedLogbook.studentName)" class="w-full text-center text-xs font-bold text-blue-700 hover:text-blue-800 transition py-2 bg-slate-50 hover:bg-slate-100/80 rounded-xl border border-slate-200/50">
                View Full History
              </button>
            </div>

            <!-- Milestone Tracker -->
            <div class="bg-white rounded-2xl border border-slate-200/70 p-5 shadow-sm">
              <h3 class="text-sm font-bold text-slate-800 pb-3 border-b border-slate-100 mb-4">Research Progress</h3>
              <div class="space-y-3">
                <div class="flex items-center justify-between text-xs">
                  <span class="text-slate-600 font-medium">Thesis Proposal</span>
                  <span class="bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded flex items-center gap-1"><Check class="w-3.5 h-3.5" /> Approved</span>
                </div>
                <div class="flex items-center justify-between text-xs">
                  <span class="text-slate-600 font-medium">Data Gathering</span>
                  <span class="bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded flex items-center gap-1"><Check class="w-3.5 h-3.5" /> Approved</span>
                </div>
                <div class="flex items-center justify-between text-xs">
                  <span class="text-slate-600 font-medium">Implementation</span>
                  <span class="bg-blue-50 text-blue-700 font-bold px-2 py-0.5 rounded">In Progress</span>
                </div>
                <div class="w-full bg-slate-100 h-2 rounded-full overflow-hidden mt-2">
                  <div class="bg-blue-600 h-full rounded-full" style="width: 65%"></div>
                </div>
              </div>
            </div>

            <!-- Helper Tips box -->
            <div class="bg-blue-600 text-white rounded-2xl p-5 shadow-md space-y-4">
              <div class="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-100">
                <Info class="w-4 h-4" /> Approval Tips
              </div>
              <ul class="text-xs space-y-3 text-blue-50 leading-relaxed font-medium pl-3 list-disc">
                <li>Be specific about mathematical models or code logic.</li>
                <li>Verify consistency with the last 3 log entries.</li>
                <li>Flag any major deviation from the original proposal.</li>
              </ul>
            </div>

          </div>

        </div>
      </div>
    </div>

    <!-- Student Full History Logbook Modal -->
    <div v-if="showHistoryModal" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 transition-all duration-300">
      <div class="w-full max-w-4xl rounded-2xl bg-white border border-slate-200/90 shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
        <div class="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
          <div>
            <h3 class="text-lg font-extrabold text-slate-900">Riwayat Bimbingan Mahasiswa</h3>
            <p class="text-xs text-slate-500 mt-1 font-semibold">{{ selectedStudentName }}</p>
          </div>
          <button @click="showHistoryModal = false" class="text-slate-400 hover:text-slate-600 transition">
            <XCircle class="h-6 w-6" />
          </button>
        </div>

        <div v-if="loadingStudentHistory" class="text-center py-12 text-slate-400">
          <Loader2 class="h-8 w-8 mx-auto animate-spin mb-2 text-blue-700" />
          <p class="text-xs font-bold">Memuat riwayat...</p>
        </div>
        <div v-else-if="!studentHistoryLogs.length" class="text-center py-12 text-slate-500 text-sm">
          Belum ada riwayat logbook yang tercatat.
        </div>
        <div v-else class="space-y-6">
          <div class="relative pl-6 space-y-6 before:absolute before:inset-y-0 before:left-2.5 before:w-[2px] before:bg-slate-100">
            <div v-for="log in studentHistoryLogs" :key="`hist-${log.id}`" class="relative group">
              <span class="absolute -left-[21px] top-1.5 w-4 h-4 rounded-full border-2 border-white bg-blue-700"></span>
              
              <div class="bg-slate-50 hover:bg-slate-50/80 transition p-5 rounded-2xl border border-slate-200/60 shadow-sm space-y-3">
                <div class="flex items-start justify-between flex-wrap gap-2">
                  <div>
                    <span class="text-xs font-bold text-slate-400">
                      {{ new Date(log.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) }}
                    </span>
                    <h4 class="text-base font-extrabold text-slate-900 mt-1 leading-snug">{{ log.topic }}</h4>
                  </div>
                  <span :class="['inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold leading-none uppercase tracking-wider', statusConfig[log.status]?.class || 'bg-slate-100 text-slate-500 border border-slate-200']">
                    {{ statusConfig[log.status]?.label || log.status }}
                  </span>
                </div>
                
                <p class="text-xs text-slate-500 font-semibold italic">"{{ log.thesisTitle }}"</p>
                <div class="text-xs text-slate-700 leading-relaxed border-t border-slate-200/50 pt-2 space-y-2">
                  <p v-if="log.studentProgress" class="whitespace-pre-line"><span class="font-bold text-slate-800">Progres Mahasiswa:</span> {{ log.studentProgress }}</p>
                  <div v-if="log.notes" v-html="log.notes"></div>
                </div>

                <div v-if="log.reviewerNotes || log.nextSteps" class="mt-3 bg-blue-50/60 rounded-xl p-3 border border-blue-100 space-y-2">
                  <p class="text-xs font-bold text-blue-700">Feedback & Rekomendasi:</p>
                  <p v-if="log.reviewerNotes" class="text-xs text-slate-700 whitespace-pre-line" v-html="log.reviewerNotes"></p>
                  <p v-if="log.nextSteps" class="text-xs text-slate-700 font-semibold"><span class="text-blue-600">Rekomendasi Tindak Lanjut:</span> {{ log.nextSteps }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

  </div>
</template>

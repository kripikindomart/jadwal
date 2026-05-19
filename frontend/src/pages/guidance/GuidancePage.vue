<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import api from '@/lib/api'
import { useAuthStore } from '@/stores/auth'
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
const authStore = useAuthStore()
const router = useRouter()

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
  await Promise.all([fetchData(), fetchLogbooks()])
  if (!isDosenOnly.value) {
    await fetchOptions()
  }
})

async function fetchData() {
  loading.value = true
  try {
    const limit = 200
    let currentPage = 1
    let merged: any[] = []
    let fetchedTotal = 0

    while (true) {
      const { data } = await api.get('/guidance', { params: { page: currentPage, limit } })
      const chunk = data?.data || []
      fetchedTotal = data?.total || 0
      merged = merged.concat(chunk)

      if (!chunk.length || merged.length >= fetchedTotal) break
      currentPage += 1
    }

    items.value = merged
    total.value = fetchedTotal || merged.length
  } finally {
    loading.value = false
  }
}

async function fetchOptions() {
  try {
    const [lecRes, stuRes, roomRes] = await Promise.allSettled([
      api.get('/lecturers?perPage=100&ignoreProdiScope=true'),
      api.get('/students?perPage=200'),
      api.get('/rooms?perPage=100'),
    ])
    lecturers.value = lecRes.status === 'fulfilled' ? lecRes.value.data?.data || [] : []
    students.value = stuRes.status === 'fulfilled' ? stuRes.value.data?.data || [] : []
    rooms.value = roomRes.status === 'fulfilled' ? roomRes.value.data?.data || [] : []
  } catch {}
}

async function fetchLogbooks() {
  try {
    const { data } = await api.get('/guidance/logbook')
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
  router.push({
    name: 'guidance.logbook.review',
    params: { logbookId: logbook.id },
  })
}

async function viewStudentHistory(studentId: number, name: string) {
  router.push({
    name: 'guidance.logbook.detail',
    params: { studentId },
    query: { name },
  })
}

const isDosenOnly = computed(() => {
  const roles = authStore.userRoles || []
  return roles.length === 1 && roles.includes('dosen')
})

const pendingLogbooks = computed(() => logbookItems.value.filter((it: any) => it.status === 'PENDING'))
const allLogbooks = computed(() => logbookItems.value)

const historyRows = computed(() => {
  const scheduleRows = items.value.map((it: any) => ({
    id: `schedule-${it.id}`,
    rawId: it.id,
    source: 'schedule',
    studentId: it.studentId,
    studentName: it.studentName,
    studentNim: it.studentNim,
    topic: it.topic,
    date: it.date,
    startTime: it.startTime,
    endTime: it.endTime,
    meetingType: it.meetingType || 'Tatap Muka',
    type: it.type || 'TESIS',
    status: it.status,
  }))

  const scheduleKey = new Set(
    items.value.map((it: any) => `${it.studentId}-${it.date}-${it.topic || ''}`),
  )

  const logbookRows = allLogbooks.value
    .filter((log: any) => !scheduleKey.has(`${log.studentId}-${log.date}-${log.topic || ''}`))
    .map((log: any) => ({
      id: `logbook-${log.id}`,
      rawId: log.id,
      source: 'logbook',
      studentId: log.studentId,
      studentName: log.studentName,
      studentNim: log.studentNim,
      topic: log.topic,
      date: log.date,
      startTime: log.startTime,
      endTime: log.endTime,
      meetingType: log.meetingType || 'Tatap Muka',
      type: log.type || 'TESIS',
      status: log.status || 'PENDING',
    }))

  return [...scheduleRows, ...logbookRows].sort(
    (a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  )
})

const studentRows = computed(() => {
  const map = new Map<number, any>()
  for (const row of allLogbooks.value) {
    if (!row.studentId) continue
    const current = map.get(row.studentId)
    if (!current) {
      map.set(row.studentId, {
        studentId: row.studentId,
        studentName: row.studentName,
        studentNim: row.studentNim,
        latestDate: row.date,
        latestTopic: row.topic,
        thesisTitle: row.thesisTitle || '-',
        totalEntries: 1,
        pendingCount: row.status === 'PENDING' ? 1 : 0,
        approvedCount: row.status === 'APPROVED' ? 1 : 0,
        rejectedCount: row.status === 'REJECTED' ? 1 : 0,
        latestStatus: row.status,
      })
    } else {
      current.totalEntries += 1
      if (row.status === 'PENDING') current.pendingCount += 1
      if (row.status === 'APPROVED') current.approvedCount += 1
      if (row.status === 'REJECTED') current.rejectedCount += 1
      const currentDate = new Date(current.latestDate).getTime()
      const nextDate = new Date(row.date).getTime()
      if (nextDate > currentDate) {
        current.latestDate = row.date
        current.latestTopic = row.topic
        current.thesisTitle = row.thesisTitle || current.thesisTitle
        current.latestStatus = row.status
      }
      if ((!current.thesisTitle || current.thesisTitle === '-') && row.thesisTitle) {
        current.thesisTitle = row.thesisTitle
      }
    }
  }
  for (const s of map.values()) {
    if (s.pendingCount > 0) s.latestStatus = 'PENDING'
    else if (s.rejectedCount > 0) s.latestStatus = 'REJECTED'
    else if (s.approvedCount > 0) s.latestStatus = 'APPROVED'
  }
  return Array.from(map.values()).sort(
    (a: any, b: any) => new Date(b.latestDate).getTime() - new Date(a.latestDate).getTime(),
  )
})

const totalSessions = computed(() => allLogbooks.value.length)
const needFeedbackCount = computed(() => pendingLogbooks.value.length)
const filteredStudentRows = computed(() => {
  const q = search.value.trim().toLowerCase()
  return studentRows.value.filter((it: any) => {
    const hitSearch = !q || `${it.studentName || ''} ${it.studentNim || ''} ${it.latestTopic || ''} ${it.thesisTitle || ''}`.toLowerCase().includes(q)
    const hitType = true
    const hitStatus = !filterStatus.value || it.latestStatus === filterStatus.value
    const hitDate = !filterDate.value || new Date(it.latestDate).toISOString().slice(0, 10) === filterDate.value
    return hitSearch && hitType && hitStatus && hitDate
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
</script>

<template>
  <div class="space-y-6 max-w-[1600px] mx-auto p-4 md:p-6 text-slate-800">
    <!-- Header -->
    <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <h1 class="text-2xl font-extrabold tracking-tight text-slate-900">Daftar Riwayat Bimbingan</h1>
        <p class="text-sm text-slate-500 mt-1">Kelola dan pantau seluruh sesi konsultasi mahasiswa bimbingan Anda.</p>
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
        <button v-if="!isDosenOnly" @click="showCreateForm = true" class="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-5 py-3.5 text-sm font-bold text-white hover:bg-blue-800 shadow-lg shadow-blue-700/15 transition duration-200">
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
            <select v-model="filterStatus" class="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition bg-white">
              <option value="">Semua Status</option>
              <option value="APPROVED">Disetujui</option>
              <option value="PENDING">Perlu Feedback</option>
              <option value="REJECTED">Revisi</option>
            </select>
          </div>
          <div>
            <input v-model="filterDate" type="date" class="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition bg-white" />
          </div>
        </div>
      </div>

      <!-- History Table -->
      <div class="bg-white rounded-2xl border border-slate-200/85 overflow-hidden shadow-sm">
        <div v-if="loading" class="p-12 text-center text-slate-400">
          <Loader2 class="h-8 w-8 mx-auto animate-spin mb-3 text-blue-600" />
          <p class="text-sm font-medium">Memuat data bimbingan...</p>
        </div>
        <div v-else-if="filteredStudentRows.length === 0" class="p-16 text-center text-slate-400">
          <Calendar class="h-12 w-12 mx-auto mb-4 text-slate-300" />
          <p class="text-base font-bold text-slate-600">Belum ada riwayat bimbingan</p>
          <p class="text-sm text-slate-400 mt-1">Riwayat akan muncul dari jadwal atau logbook yang sudah disetujui.</p>
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
              <tr v-for="item in filteredStudentRows" :key="`student-${item.studentId}`" class="hover:bg-slate-50/50 transition">
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
                  <p class="text-slate-800 font-medium line-clamp-2 leading-relaxed">{{ item.thesisTitle || '-' }}</p>
                </td>
                <td class="py-4 px-6">
                  <p class="font-semibold text-slate-900">{{ new Date(item.latestDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) }}</p>
                  <p class="text-xs text-slate-500 mt-0.5">{{ item.totalEntries }} riwayat</p>
                </td>
                <td class="py-4 px-6">
                  <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                    P: {{ item.pendingCount }} • A: {{ item.approvedCount }} • R: {{ item.rejectedCount }}
                  </span>
                </td>
                <td class="py-4 px-6 text-center">
                  <span :class="['inline-flex items-center px-3 py-1 rounded-full text-xs font-bold leading-none', statusConfig[item.latestStatus]?.class || 'bg-slate-100 text-slate-500 border border-slate-200']">
                    {{ statusConfig[item.latestStatus]?.label || item.latestStatus }}
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
      <div v-if="!pendingLogbooks.length" class="p-12 text-center text-slate-400">
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
            <tr v-for="log in pendingLogbooks" :key="`lg-${log.id}`" class="hover:bg-slate-50/50 transition">
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

  </div>
</template>

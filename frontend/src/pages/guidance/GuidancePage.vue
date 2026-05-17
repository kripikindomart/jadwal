<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import api from '@/lib/api'
import SearchableSelect from '@/components/ui/SearchableSelect.vue'
import { Calendar, CheckCircle2, XCircle, Plus, Loader2 } from 'lucide-vue-next'

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

const form = ref({
  mode: 'DIRECT' as 'REQUEST' | 'DIRECT',
  studentId: '' as string | number,
  lecturerId: '' as string | number,
  date: '',
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
    const params: any = { page: page.value, limit: 30 }
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
    form.value = { mode: 'DIRECT', studentId: '', lecturerId: '', date: '', startTime: '09:00', endTime: '10:00', roomId: '', topic: '', type: 'TESIS' }
    await fetchData()
  } catch (e: any) {
    alert(e.response?.data?.message || 'Gagal membuat jadwal')
  } finally {
    saving.value = false
  }
}

async function updateStatus(id: number, status: string) {
  try {
    await api.patch(`/guidance/${id}/status`, { status })
    await fetchData()
  } catch (e: any) {
    alert(e.response?.data?.message || 'Gagal update status')
  }
}

async function validateLogbook(id: number, status: 'APPROVED' | 'REJECTED') {
  try {
    await api.patch(`/guidance/logbook/${id}/validate`, { status })
    await fetchLogbooks()
  } catch (e: any) {
    alert(e.response?.data?.message || 'Gagal validasi logbook')
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
  PENDING: { label: 'Menunggu', class: 'bg-amber-100 text-amber-700' },
  APPROVED: { label: 'Disetujui', class: 'bg-emerald-100 text-emerald-700' },
  REJECTED: { label: 'Revisi', class: 'bg-rose-100 text-rose-700' },
  DONE: { label: 'Selesai', class: 'bg-slate-100 text-slate-600' },
  CANCELLED: { label: 'Dibatalkan', class: 'bg-slate-100 text-slate-500' },
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 class="text-3xl font-bold text-slate-800">Daftar Riwayat Bimbingan</h1>
        <p class="text-base text-slate-500 mt-1">Kelola dan pantau seluruh sesi konsultasi mahasiswa bimbingan Anda.</p>
      </div>
      <div class="flex items-center gap-3">
        <div class="rounded-xl border border-slate-200 bg-white px-4 py-3">
          <p class="text-xs text-slate-500">Total Sesi</p>
          <p class="text-2xl font-bold text-blue-700">{{ totalSessions }} Sesi</p>
        </div>
        <div class="rounded-xl border border-slate-200 bg-white px-4 py-3">
          <p class="text-xs text-slate-500">Perlu Feedback</p>
          <p class="text-2xl font-bold text-amber-700">{{ needFeedbackCount }} Sesi</p>
        </div>
        <button @click="showCreateForm = true" class="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 shadow-sm">
          <Plus class="h-4 w-4" /> Buat Jadwal
        </button>
      </div>
    </div>

    <div class="rounded-xl border border-slate-200 bg-white p-1 inline-flex items-center gap-1">
      <button
        @click="activeTab = 'history'"
        :class="[
          'rounded-lg px-4 py-2 text-sm font-semibold',
          activeTab === 'history' ? 'bg-violet-600 text-white' : 'text-slate-600 hover:bg-slate-100'
        ]"
      >
        Riwayat Bimbingan
      </button>
      <button
        @click="activeTab = 'verification'"
        :class="[
          'rounded-lg px-4 py-2 text-sm font-semibold inline-flex items-center gap-2',
          activeTab === 'verification' ? 'bg-violet-600 text-white' : 'text-slate-600 hover:bg-slate-100'
        ]"
      >
        Verifikasi Logbook
        <span :class="[
          'rounded-full px-2 py-0.5 text-xs font-bold',
          activeTab === 'verification' ? 'bg-white/20 text-white' : 'bg-rose-100 text-rose-700'
        ]">{{ needFeedbackCount }}</span>
      </button>
    </div>

    <div v-if="activeTab === 'history'" class="rounded-2xl bg-white border border-slate-200 p-4">
      <div class="grid grid-cols-1 md:grid-cols-4 gap-3">
        <input v-model="search" type="text" placeholder="Cari mahasiswa / topik..." class="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
        <select v-model="filterType" class="rounded-lg border border-slate-200 px-3 py-2 text-sm">
          <option value="">Semua Tipe</option>
          <option value="TESIS">Tesis</option>
          <option value="DISERTASI">Disertasi</option>
          <option value="PROPOSAL">Proposal</option>
          <option value="UMUM">Umum</option>
        </select>
        <select v-model="filterStatus" @change="fetchData()" class="rounded-lg border border-slate-200 px-3 py-2 text-sm">
          <option value="">Semua Status</option>
          <option value="PENDING">Menunggu</option>
          <option value="APPROVED">Disetujui</option>
          <option value="REJECTED">Ditolak</option>
          <option value="DONE">Selesai</option>
        </select>
        <input v-model="filterDate" @change="fetchData()" type="date" class="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
      </div>
    </div>

    <div v-if="showCreateForm" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div class="w-full max-w-5xl rounded-2xl bg-white border border-violet-200 ring-2 ring-violet-100 shadow-xl p-6 max-h-[90vh] overflow-auto">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-base font-bold text-slate-800">Buat Jadwal Bimbingan</h3>
          <button @click="showCreateForm = false" class="px-2 py-1 text-sm text-slate-500 rounded hover:bg-slate-100">Tutup</button>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label class="block text-xs font-medium text-slate-600 mb-1">Mode Proses</label>
            <select v-model="form.mode" class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
              <option value="DIRECT">Langsung (tanpa pengajuan)</option>
              <option value="REQUEST">Via Pengajuan Bimbingan</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-600 mb-1">Mahasiswa</label>
            <SearchableSelect v-model="form.studentId" :options="students.map((s) => ({ value: s.id, label: `${s.name} (${s.nim})` }))" placeholder="Cari mahasiswa..." />
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-600 mb-1">Dosen Pembimbing</label>
            <SearchableSelect v-model="form.lecturerId" :options="lecturers.map((l) => ({ value: l.id, label: l.fullName || l.name }))" placeholder="Cari dosen..." />
          </div>
          <div><label class="block text-xs font-medium text-slate-600 mb-1">Tanggal</label><input v-model="form.date" type="date" class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" /></div>
          <div><label class="block text-xs font-medium text-slate-600 mb-1">Jam Mulai</label><input v-model="form.startTime" type="time" class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" /></div>
          <div><label class="block text-xs font-medium text-slate-600 mb-1">Jam Selesai</label><input v-model="form.endTime" type="time" class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" /></div>
        </div>
        <div class="flex justify-end gap-3 mt-5">
          <button @click="showCreateForm = false" class="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">Batal</button>
          <button @click="createGuidance" :disabled="saving" class="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-50">
            <Loader2 v-if="saving" class="h-4 w-4 animate-spin" /> Simpan
          </button>
        </div>
      </div>
    </div>

    <div v-if="activeTab === 'history'" class="rounded-2xl bg-white border border-slate-100 shadow-sm overflow-hidden">
      <div v-if="loading" class="p-8 text-center text-slate-400"><Loader2 class="h-6 w-6 mx-auto animate-spin mb-2" /> Memuat...</div>
      <div v-else-if="filteredItems.length === 0" class="p-12 text-center text-slate-400"><Calendar class="h-10 w-10 mx-auto mb-3 text-slate-300" /><p>Belum ada riwayat bimbingan</p></div>
      <table v-else class="w-full text-sm">
        <thead class="bg-slate-50 border-b border-slate-100">
          <tr>
            <th class="text-left py-3 px-4 font-semibold text-slate-600">Mahasiswa</th>
            <th class="text-left py-3 px-4 font-semibold text-slate-600">Topik</th>
            <th class="text-left py-3 px-4 font-semibold text-slate-600">Tanggal</th>
            <th class="text-left py-3 px-4 font-semibold text-slate-600">Tipe</th>
            <th class="text-center py-3 px-4 font-semibold text-slate-600">Status</th>
            <th class="text-center py-3 px-4 font-semibold text-slate-600">Aksi</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-50">
          <tr v-for="item in filteredItems" :key="item.id" class="hover:bg-slate-50/50">
            <td class="py-3 px-4"><p class="font-medium text-slate-700">{{ item.studentName }}</p><p class="text-xs text-slate-400">{{ item.studentNim }}</p></td>
            <td class="py-3 px-4 text-slate-700 max-w-[280px] truncate">{{ item.topic || '-' }}</td>
            <td class="py-3 px-4"><p class="font-medium text-slate-800">{{ new Date(item.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) }}</p><p class="text-xs text-slate-500">{{ item.startTime?.slice(0,5) }} - {{ item.endTime?.slice(0,5) }}</p></td>
            <td class="py-3 px-4 text-slate-700">{{ item.type || '-' }}</td>
            <td class="py-3 px-4 text-center"><span :class="['inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold', statusConfig[item.status]?.class || 'bg-slate-100 text-slate-500']">{{ statusConfig[item.status]?.label || item.status }}</span></td>
            <td class="py-3 px-4 text-center">
              <div class="flex items-center justify-center gap-1">
                <button v-if="item.status === 'PENDING'" @click="updateStatus(item.id, 'APPROVED')" class="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg" title="Setujui"><CheckCircle2 class="h-4 w-4" /></button>
                <button v-if="item.status === 'PENDING'" @click="updateStatus(item.id, 'REJECTED')" class="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg" title="Tolak"><XCircle class="h-4 w-4" /></button>
                <button v-if="item.status === 'APPROVED'" @click="updateStatus(item.id, 'DONE')" class="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg" title="Selesai"><CheckCircle2 class="h-4 w-4" /></button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="activeTab === 'verification'" class="rounded-2xl bg-white border border-slate-100 shadow-sm overflow-hidden">
      <div class="px-4 py-3 border-b border-slate-100"><h3 class="text-base font-bold text-slate-800">Logbook Mahasiswa (Perlu Verifikasi)</h3></div>
      <div v-if="!logbookItems.length" class="p-6 text-sm text-slate-500">Belum ada logbook pending untuk diverifikasi.</div>
      <table v-else class="w-full text-sm">
        <thead class="bg-slate-50 border-b border-slate-100"><tr><th class="text-left py-3 px-4 font-semibold text-slate-600">Tanggal</th><th class="text-left py-3 px-4 font-semibold text-slate-600">Mahasiswa</th><th class="text-left py-3 px-4 font-semibold text-slate-600">Tesis / Topik</th><th class="text-left py-3 px-4 font-semibold text-slate-600">Lampiran</th><th class="text-center py-3 px-4 font-semibold text-slate-600">Aksi</th></tr></thead>
        <tbody class="divide-y divide-slate-50">
          <tr v-for="log in logbookItems" :key="`lg-${log.id}`" class="align-top">
            <td class="py-3 px-4 text-slate-700"><p class="font-medium">{{ new Date(log.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) }}</p><p class="text-xs text-slate-500">{{ log.startTime?.slice(0,5) || '--:--' }} - {{ log.endTime?.slice(0,5) || '--:--' }}</p></td>
            <td class="py-3 px-4"><p class="font-medium text-slate-800">{{ log.studentName }}</p><p class="text-xs text-slate-500">{{ log.studentNim }}</p></td>
            <td class="py-3 px-4"><p class="font-medium text-slate-800">{{ log.topic || '-' }}</p><p class="text-xs text-slate-500">{{ log.thesisTitle }}</p></td>
            <td class="py-3 px-4"><a v-if="log.attachmentUrl" :href="log.attachmentUrl" target="_blank" class="text-blue-600 hover:underline">Lihat Lampiran</a><span v-else class="text-slate-400">-</span></td>
            <td class="py-3 px-4"><div class="flex items-center justify-center gap-2"><button @click="validateLogbook(log.id, 'APPROVED')" class="rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700">Approve</button><button @click="validateLogbook(log.id, 'REJECTED')" class="rounded-lg bg-rose-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-rose-700">Revisi</button></div></td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

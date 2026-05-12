<script setup lang="ts">
import { ref, onMounted } from 'vue'
import api from '@/lib/api'
import {
  Calendar, Clock, Users, CheckCircle2, XCircle,
  Plus, Search, Loader2, Filter,
} from 'lucide-vue-next'

const loading = ref(true)
const items = ref<any[]>([])
const total = ref(0)
const page = ref(1)

const filterStatus = ref('')
const filterDate = ref('')
const showCreateForm = ref(false)
const saving = ref(false)

const lecturers = ref<any[]>([])
const students = ref<any[]>([])
const rooms = ref<any[]>([])

const form = ref({
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
  await Promise.all([fetchData(), fetchOptions()])
})

async function fetchData() {
  loading.value = true
  try {
    const params: any = { page: page.value, limit: 20 }
    if (filterStatus.value) params.status = filterStatus.value
    if (filterDate.value) params.date = filterDate.value
    const { data } = await api.get('/guidance', { params })
    items.value = data.data || []
    total.value = data.total || 0
  } catch (e) {
    console.error(e)
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
  } catch { /* silent */ }
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
    })
    showCreateForm.value = false
    form.value = { studentId: '', lecturerId: '', date: '', startTime: '09:00', endTime: '10:00', roomId: '', topic: '', type: 'TESIS' }
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

async function deleteGuidance(id: number) {
  if (!confirm('Yakin ingin menghapus jadwal bimbingan ini?')) return
  try {
    await api.delete(`/guidance/${id}`)
    await fetchData()
  } catch (e: any) {
    alert(e.response?.data?.message || 'Gagal menghapus')
  }
}

const statusConfig: Record<string, { label: string; class: string }> = {
  PENDING: { label: 'Menunggu', class: 'bg-amber-100 text-amber-700' },
  APPROVED: { label: 'Disetujui', class: 'bg-emerald-100 text-emerald-700' },
  REJECTED: { label: 'Ditolak', class: 'bg-rose-100 text-rose-700' },
  DONE: { label: 'Selesai', class: 'bg-slate-100 text-slate-600' },
  CANCELLED: { label: 'Dibatalkan', class: 'bg-slate-100 text-slate-500' },
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <Users class="h-6 w-6 text-violet-600" />
          Jadwal Bimbingan
        </h1>
        <p class="text-sm text-slate-500 mt-1">Kelola jadwal bimbingan tesis & disertasi mahasiswa.</p>
      </div>
      <button @click="showCreateForm = true"
        class="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 shadow-sm">
        <Plus class="h-4 w-4" /> Buat Jadwal
      </button>
    </div>

    <!-- Filters -->
    <div class="flex gap-3 flex-wrap items-center">
      <select v-model="filterStatus" @change="fetchData()" class="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20">
        <option value="">Semua Status</option>
        <option value="PENDING">Menunggu</option>
        <option value="APPROVED">Disetujui</option>
        <option value="REJECTED">Ditolak</option>
        <option value="DONE">Selesai</option>
      </select>
      <input v-model="filterDate" @change="fetchData()" type="date" class="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20" />
    </div>

    <!-- Create Form -->
    <div v-if="showCreateForm" class="rounded-2xl bg-white border border-violet-200 ring-2 ring-violet-100 shadow-sm p-6">
      <h3 class="text-base font-bold text-slate-800 mb-4">Buat Jadwal Bimbingan</h3>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div>
          <label class="block text-xs font-medium text-slate-600 mb-1">Mahasiswa</label>
          <select v-model="form.studentId" class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20">
            <option value="">— Pilih —</option>
            <option v-for="s in students" :key="s.id" :value="s.id">{{ s.name }} ({{ s.nim }})</option>
          </select>
        </div>
        <div>
          <label class="block text-xs font-medium text-slate-600 mb-1">Dosen Pembimbing</label>
          <select v-model="form.lecturerId" class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20">
            <option value="">— Pilih —</option>
            <option v-for="l in lecturers" :key="l.id" :value="l.id">{{ l.fullName || l.name }}</option>
          </select>
        </div>
        <div>
          <label class="block text-xs font-medium text-slate-600 mb-1">Tanggal</label>
          <input v-model="form.date" type="date" class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20" />
        </div>
        <div>
          <label class="block text-xs font-medium text-slate-600 mb-1">Jam Mulai</label>
          <input v-model="form.startTime" type="time" class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20" />
        </div>
        <div>
          <label class="block text-xs font-medium text-slate-600 mb-1">Jam Selesai</label>
          <input v-model="form.endTime" type="time" class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20" />
        </div>
        <div>
          <label class="block text-xs font-medium text-slate-600 mb-1">Ruangan</label>
          <select v-model="form.roomId" class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20">
            <option value="">— Opsional —</option>
            <option v-for="r in rooms" :key="r.id" :value="r.id">{{ r.name }}</option>
          </select>
        </div>
        <div>
          <label class="block text-xs font-medium text-slate-600 mb-1">Jenis</label>
          <select v-model="form.type" class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20">
            <option value="TESIS">Tesis</option>
            <option value="DISERTASI">Disertasi</option>
            <option value="PROPOSAL">Proposal</option>
            <option value="UMUM">Umum</option>
          </select>
        </div>
        <div class="sm:col-span-2">
          <label class="block text-xs font-medium text-slate-600 mb-1">Topik</label>
          <input v-model="form.topic" type="text" placeholder="Topik bimbingan..." class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20" />
        </div>
      </div>
      <div class="flex justify-end gap-3 mt-5">
        <button @click="showCreateForm = false" class="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">Batal</button>
        <button @click="createGuidance" :disabled="saving" class="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-50">
          <Loader2 v-if="saving" class="h-4 w-4 animate-spin" />
          Simpan
        </button>
      </div>
    </div>

    <!-- Table -->
    <div class="rounded-2xl bg-white border border-slate-100 shadow-sm overflow-hidden">
      <div v-if="loading" class="p-8 text-center text-slate-400">
        <Loader2 class="h-6 w-6 mx-auto animate-spin mb-2" /> Memuat...
      </div>

      <div v-else-if="items.length === 0" class="p-12 text-center text-slate-400">
        <Calendar class="h-10 w-10 mx-auto mb-3 text-slate-300" />
        <p>Belum ada jadwal bimbingan</p>
      </div>

      <table v-else class="w-full text-sm">
        <thead class="bg-slate-50 border-b border-slate-100">
          <tr>
            <th class="text-left py-3 px-4 font-semibold text-slate-600">Tanggal & Waktu</th>
            <th class="text-left py-3 px-4 font-semibold text-slate-600">Mahasiswa</th>
            <th class="text-left py-3 px-4 font-semibold text-slate-600">Dosen</th>
            <th class="text-left py-3 px-4 font-semibold text-slate-600">Topik</th>
            <th class="text-center py-3 px-4 font-semibold text-slate-600">Status</th>
            <th class="text-center py-3 px-4 font-semibold text-slate-600">Aksi</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-50">
          <tr v-for="item in items" :key="item.id" class="hover:bg-slate-50/50">
            <td class="py-3 px-4">
              <p class="font-medium text-slate-800">{{ new Date(item.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) }}</p>
              <p class="text-xs text-slate-500">{{ item.startTime?.slice(0,5) }} - {{ item.endTime?.slice(0,5) }} · {{ item.room || '-' }}</p>
            </td>
            <td class="py-3 px-4">
              <p class="font-medium text-slate-700">{{ item.studentName }}</p>
              <p class="text-xs text-slate-400">{{ item.studentNim }}</p>
            </td>
            <td class="py-3 px-4 text-slate-700">{{ item.lecturerName }}</td>
            <td class="py-3 px-4 text-slate-600 max-w-[200px] truncate">{{ item.topic || '-' }}</td>
            <td class="py-3 px-4 text-center">
              <span :class="['inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold', statusConfig[item.status]?.class || 'bg-slate-100 text-slate-500']">
                {{ statusConfig[item.status]?.label || item.status }}
              </span>
            </td>
            <td class="py-3 px-4 text-center">
              <div class="flex items-center justify-center gap-1">
                <button v-if="item.status === 'PENDING'" @click="updateStatus(item.id, 'APPROVED')" class="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg" title="Setujui">
                  <CheckCircle2 class="h-4 w-4" />
                </button>
                <button v-if="item.status === 'PENDING'" @click="updateStatus(item.id, 'REJECTED')" class="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg" title="Tolak">
                  <XCircle class="h-4 w-4" />
                </button>
                <button v-if="item.status === 'APPROVED'" @click="updateStatus(item.id, 'DONE')" class="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg" title="Tandai Selesai">
                  <CheckCircle2 class="h-4 w-4" />
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

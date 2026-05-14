<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import api from '@/lib/api'
import {
  GraduationCap, Search, Eye, FileCheck, Users, Clock,
  AlertTriangle, ChevronRight, Filter, Download,
} from 'lucide-vue-next'

const router = useRouter()
const loading = ref(true)
const items = ref<any[]>([])
const total = ref(0)
const page = ref(1)
const search = ref('')
const filterStatus = ref('')

onMounted(() => fetchData())

async function fetchData() {
  loading.value = true
  try {
    const params: any = { page: page.value, limit: 10 }
    if (search.value) params.search = search.value
    if (filterStatus.value) params.status = filterStatus.value
    const { data } = await api.get('/thesis', { params })
    items.value = data.data || []
    total.value = data.total || 0
  } catch (e) { console.error(e) }
  finally { loading.value = false }
}

// Stats computed
const needsVerification = computed(() => items.value.filter(i => i.status === 'SUBMITTED').length)
const needsSupervisor = computed(() => items.value.filter(i => i.status === 'TITLE_APPROVED').length)
const inReview = computed(() => items.value.filter(i => !['COMPLETED', 'DRAFT'].includes(i.status)).length)

const statusConfig: Record<string, { label: string; class: string; action?: string; actionClass?: string }> = {
  DRAFT: { label: 'Draft', class: 'text-slate-500' },
  SUBMITTED: { label: 'Belum Verifikasi', class: 'text-rose-600', action: 'Verifikasi Dokumen', actionClass: 'bg-rose-600 text-white hover:bg-rose-700' },
  TITLE_APPROVED: { label: 'Plotting Pembimbing', class: 'text-amber-600', action: 'Plotting Pembimbing', actionClass: 'border border-amber-300 text-amber-700 hover:bg-amber-50' },
  SUPERVISOR_ASSIGNED: { label: 'Menunggu Review Dosen', class: 'text-blue-600', action: 'Lihat Detail', actionClass: 'border border-slate-200 text-slate-600 hover:bg-slate-50' },
  PROPOSAL_GUIDANCE: { label: 'Bimbingan Proposal', class: 'text-violet-600' },
  PROPOSAL_EXAM_SCHEDULED: { label: 'Sidang Terjadwal', class: 'text-violet-600' },
  PROPOSAL_PASSED: { label: 'Proposal Lulus', class: 'text-emerald-600' },
  THESIS_GUIDANCE: { label: 'Bimbingan Tesis', class: 'text-amber-600' },
  RESULT_PASSED: { label: 'Seminar Lulus', class: 'text-emerald-600' },
  REVISION: { label: 'Revisi', class: 'text-orange-600' },
  COMPLETED: { label: 'Selesai', class: 'text-green-700' },
}

function getInitials(name: string) {
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-slate-900">Daftar Pengajuan Tesis</h1>
        <p class="text-sm text-slate-500 mt-1">Pantau dan verifikasi dokumen pengajuan tesis/disertasi mahasiswa.</p>
      </div>
      <button class="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 shadow-sm">
        <Download class="h-4 w-4" /> Eksport Laporan
      </button>
    </div>

    <!-- Stats Cards -->
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div class="rounded-2xl bg-white border border-rose-100 p-5 flex items-center gap-4">
        <div class="h-12 w-12 rounded-xl bg-rose-100 flex items-center justify-center">
          <FileCheck class="h-6 w-6 text-rose-600" />
        </div>
        <div>
          <p class="text-xs font-semibold text-slate-500 uppercase tracking-wide">Perlu Verifikasi</p>
          <p class="text-2xl font-bold text-slate-900">{{ needsVerification }}</p>
          <p class="text-[10px] text-rose-600 font-medium">! Butuh segera diproses</p>
        </div>
      </div>
      <div class="rounded-2xl bg-white border border-amber-100 p-5 flex items-center gap-4">
        <div class="h-12 w-12 rounded-xl bg-amber-100 flex items-center justify-center">
          <Users class="h-6 w-6 text-amber-600" />
        </div>
        <div>
          <p class="text-xs font-semibold text-slate-500 uppercase tracking-wide">Belum Ada Pembimbing</p>
          <p class="text-2xl font-bold text-slate-900">{{ needsSupervisor }}</p>
          <p class="text-[10px] text-amber-600 font-medium">Menunggu plotting staf</p>
        </div>
      </div>
      <div class="rounded-2xl bg-white border border-blue-100 p-5 flex items-center gap-4">
        <div class="h-12 w-12 rounded-xl bg-blue-100 flex items-center justify-center">
          <Clock class="h-6 w-6 text-blue-600" />
        </div>
        <div>
          <p class="text-xs font-semibold text-slate-500 uppercase tracking-wide">Sedang Direview</p>
          <p class="text-2xl font-bold text-slate-900">{{ inReview }}</p>
          <p class="text-[10px] text-blue-600 font-medium">Total proses aktif</p>
        </div>
      </div>
    </div>

    <!-- Filters -->
    <div class="flex gap-3 flex-wrap items-center">
      <div class="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 bg-white">
        <Filter class="h-4 w-4 text-slate-400" />
        <select v-model="filterStatus" @change="fetchData()" class="text-sm border-none outline-none bg-transparent text-slate-700">
          <option value="">Semua Status</option>
          <option value="SUBMITTED">Belum Verifikasi</option>
          <option value="TITLE_APPROVED">Perlu Pembimbing</option>
          <option value="SUPERVISOR_ASSIGNED">Menunggu Review</option>
          <option value="PROPOSAL_GUIDANCE">Bimbingan Proposal</option>
          <option value="THESIS_GUIDANCE">Bimbingan Tesis</option>
          <option value="REVISION">Revisi</option>
          <option value="COMPLETED">Selesai</option>
        </select>
      </div>
      <div class="flex-1"></div>
      <p class="text-xs text-slate-400">Menampilkan {{ items.length }} dari {{ total }} pengajuan</p>
    </div>

    <!-- Table -->
    <div class="rounded-2xl bg-white border border-slate-100 shadow-sm overflow-hidden">
      <table v-if="items.length" class="w-full text-sm">
        <thead class="border-b border-slate-100">
          <tr class="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            <th class="text-left py-4 px-5">Mahasiswa</th>
            <th class="text-left py-4 px-5">Judul Tesis</th>
            <th class="text-left py-4 px-5">Status</th>
            <th class="text-left py-4 px-5">Tindakan Utama</th>
            <th class="text-center py-4 px-5"></th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-50">
          <tr v-for="item in items" :key="item.id" class="hover:bg-slate-50/50 transition-colors">
            <td class="py-4 px-5">
              <div class="flex items-center gap-3">
                <div class="h-10 w-10 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white text-xs font-bold shadow-sm">
                  {{ getInitials(item.studentName || '-') }}
                </div>
                <div>
                  <p class="font-semibold text-slate-800">{{ item.studentName }}</p>
                  <p class="text-xs text-slate-400">{{ item.studentNim }}</p>
                </div>
              </div>
            </td>
            <td class="py-4 px-5 max-w-[250px]">
              <p class="text-slate-700 line-clamp-2 leading-snug">{{ item.title }}</p>
              <p class="text-[10px] text-slate-400 mt-0.5">{{ item.type }}</p>
            </td>
            <td class="py-4 px-5">
              <span :class="['inline-flex items-center gap-1.5 text-xs font-semibold', statusConfig[item.status]?.class || 'text-slate-500']">
                <span class="h-1.5 w-1.5 rounded-full bg-current"></span>
                {{ statusConfig[item.status]?.label || item.status }}
              </span>
            </td>
            <td class="py-4 px-5">
              <button v-if="statusConfig[item.status]?.action"
                @click="router.push(`/thesis/${item.id}`)"
                :class="['inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors', statusConfig[item.status]?.actionClass]">
                {{ statusConfig[item.status]?.action }}
              </button>
              <button v-else @click="router.push(`/thesis/${item.id}`)" class="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1">
                <Eye class="h-3.5 w-3.5" /> Lihat Detail
              </button>
            </td>
            <td class="py-4 px-5 text-center">
              <button @click="router.push(`/thesis/${item.id}`)" class="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg">
                <ChevronRight class="h-4 w-4" />
              </button>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-else-if="!loading" class="p-12 text-center text-slate-400">
        <GraduationCap class="h-10 w-10 mx-auto mb-3 text-slate-300" />
        <p>Belum ada data pengajuan tesis</p>
      </div>
    </div>

    <!-- Priority Queue -->
    <div v-if="needsVerification > 0 || needsSupervisor > 0" class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div v-if="needsVerification > 0" class="rounded-2xl border-2 border-rose-200 bg-rose-50/50 p-5">
        <div class="flex items-center justify-between mb-2">
          <h3 class="text-sm font-bold text-slate-800 flex items-center gap-2">
            <AlertTriangle class="h-4 w-4 text-rose-600" /> BUTUH VERIFIKASI SEGERA
          </h3>
          <span class="text-[10px] font-bold text-rose-600 bg-rose-100 px-2 py-0.5 rounded-full">High Priority</span>
        </div>
        <p class="text-xs text-slate-600 mb-3">Ada <strong>{{ needsVerification }} mahasiswa</strong> yang telah melengkapi berkas. Harap segera lakukan pengecekan validitas dokumen.</p>
        <button @click="filterStatus = 'SUBMITTED'; fetchData()" class="text-xs font-semibold text-rose-600 hover:text-rose-700 flex items-center gap-1">
          Buka Antrian Verifikasi <ChevronRight class="h-3 w-3" />
        </button>
      </div>
      <div v-if="needsSupervisor > 0" class="rounded-2xl border border-slate-200 bg-white p-5">
        <div class="flex items-center justify-between mb-2">
          <h3 class="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Users class="h-4 w-4 text-amber-600" /> PLOTTING PEMBIMBING TERTUNDA
          </h3>
          <span class="text-[10px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">Standard</span>
        </div>
        <p class="text-xs text-slate-600 mb-3"><strong>{{ needsSupervisor }} mahasiswa</strong> telah diverifikasi berkasnya namun belum mendapatkan plot pembimbing utama.</p>
        <button @click="filterStatus = 'TITLE_APPROVED'; fetchData()" class="text-xs font-semibold text-amber-600 hover:text-amber-700 flex items-center gap-1">
          Mulai Plotting Dosen <ChevronRight class="h-3 w-3" />
        </button>
      </div>
    </div>
  </div>
</template>

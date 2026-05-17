<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import api from '@/lib/api'
import {
  GraduationCap, Search, Eye, FileCheck, Users, Clock,
  AlertTriangle, ChevronRight, ChevronDown, Filter, Download,
  CheckCircle2, XCircle,
} from 'lucide-vue-next'

const router = useRouter()
const loading = ref(true)
const items = ref<any[]>([])
const total = ref(0)
const page = ref(1)
const search = ref('')
const filterStatus = ref('')
const expandedStudent = ref<number | null>(null)

onMounted(() => fetchData())

async function fetchData() {
  loading.value = true
  try {
    const params: any = { page: page.value, limit: 20 }
    if (search.value) params.search = search.value
    if (filterStatus.value) params.status = filterStatus.value
    const { data } = await api.get('/thesis', { params })
    items.value = data.data || []
    total.value = data.total || 0
  } catch (e) { console.error(e) }
  finally { loading.value = false }
}

function toggleExpand(studentId: number) {
  expandedStudent.value = expandedStudent.value === studentId ? null : studentId
}

function getInitials(name: string) {
  return (name || '-').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
}

const needsAction = computed(() => items.value.filter(i => i.latestStatus === 'SUBMITTED').length)
const hasApproved = computed(() => items.value.filter(i => i.proposals?.some((p: any) => !['DRAFT', 'SUBMITTED', 'REVISION'].includes(p.status))).length)

const statusConfig: Record<string, { label: string; class: string }> = {
  DRAFT: { label: 'Draft', class: 'bg-slate-100 text-slate-600' },
  SUBMITTED: { label: 'Menunggu Review', class: 'bg-amber-100 text-amber-700' },
  TITLE_APPROVED: { label: 'Disetujui', class: 'bg-emerald-100 text-emerald-700' },
  SUPERVISOR_ASSIGNED: { label: 'Pembimbing OK', class: 'bg-teal-100 text-teal-700' },
  PROPOSAL_GUIDANCE: { label: 'Bimbingan', class: 'bg-blue-100 text-blue-700' },
  PROPOSAL_PASSED: { label: 'Proposal Lulus', class: 'bg-emerald-100 text-emerald-700' },
  THESIS_GUIDANCE: { label: 'Bimbingan Tesis', class: 'bg-blue-100 text-blue-700' },
  REVISION: { label: 'Revisi', class: 'bg-rose-100 text-rose-700' },
  COMPLETED: { label: 'Selesai', class: 'bg-green-100 text-green-800' },
}

function hasApprovedProposal(item: any) {
  return item.proposals?.some((p: any) => !['DRAFT', 'SUBMITTED', 'REVISION'].includes(p.status))
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-slate-900">Daftar Pengajuan Tesis</h1>
        <p class="text-sm text-slate-500 mt-1">Kelola pengajuan proposal mahasiswa. Klik mahasiswa untuk melihat semua proposal.</p>
      </div>
      <button class="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 shadow-sm">
        <Download class="h-4 w-4" /> Eksport
      </button>
    </div>

    <!-- Stats -->
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div class="rounded-2xl bg-white border border-amber-100 p-5 flex items-center gap-4">
        <div class="h-12 w-12 rounded-xl bg-amber-100 flex items-center justify-center">
          <Clock class="h-6 w-6 text-amber-600" />
        </div>
        <div>
          <p class="text-xs font-semibold text-slate-500 uppercase tracking-wide">Perlu Review</p>
          <p class="text-2xl font-bold text-slate-900">{{ needsAction }}</p>
        </div>
      </div>
      <div class="rounded-2xl bg-white border border-emerald-100 p-5 flex items-center gap-4">
        <div class="h-12 w-12 rounded-xl bg-emerald-100 flex items-center justify-center">
          <CheckCircle2 class="h-6 w-6 text-emerald-600" />
        </div>
        <div>
          <p class="text-xs font-semibold text-slate-500 uppercase tracking-wide">Sudah Approved</p>
          <p class="text-2xl font-bold text-slate-900">{{ hasApproved }}</p>
        </div>
      </div>
      <div class="rounded-2xl bg-white border border-slate-100 p-5 flex items-center gap-4">
        <div class="h-12 w-12 rounded-xl bg-slate-100 flex items-center justify-center">
          <Users class="h-6 w-6 text-slate-600" />
        </div>
        <div>
          <p class="text-xs font-semibold text-slate-500 uppercase tracking-wide">Total Mahasiswa</p>
          <p class="text-2xl font-bold text-slate-900">{{ total }}</p>
        </div>
      </div>
    </div>

    <!-- Filters -->
    <div class="flex gap-3 flex-wrap items-center">
      <div class="relative flex-1 max-w-xs">
        <Search class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input v-model="search" @input="fetchData()" placeholder="Cari nama atau judul..."
          class="w-full pl-9 pr-3 py-2.5 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
      </div>
      <select v-model="filterStatus" @change="fetchData()" class="rounded-xl border border-slate-200 px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20">
        <option value="">Semua Status</option>
        <option value="SUBMITTED">Menunggu Review</option>
        <option value="TITLE_APPROVED">Disetujui</option>
        <option value="REVISION">Revisi</option>
        <option value="COMPLETED">Selesai</option>
      </select>
    </div>

    <!-- Student List -->
    <div class="space-y-3">
      <div v-if="loading" class="text-center py-12 text-slate-400">Memuat...</div>

      <div v-else-if="items.length === 0" class="rounded-2xl bg-white border border-slate-100 shadow-sm p-12 text-center">
        <GraduationCap class="h-10 w-10 mx-auto mb-3 text-slate-300" />
        <p class="text-slate-500">Belum ada pengajuan</p>
      </div>

      <div v-for="item in items" :key="item.studentId" class="rounded-2xl bg-white border border-slate-100 shadow-sm overflow-hidden">
        <!-- Student Row (clickable) -->
        <div @click="toggleExpand(item.studentId)"
          class="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-slate-50/50 transition-colors">
          <div class="h-11 w-11 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white text-sm font-bold shadow-sm shrink-0">
            {{ getInitials(item.studentName) }}
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-bold text-slate-800">{{ item.studentName }}</p>
            <p class="text-xs text-slate-500">{{ item.studentNim }} · {{ item.prodiName }}</p>
          </div>
          <div class="flex items-center gap-3 shrink-0">
            <span class="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
              Mode {{ item.latestFlowMode || 'C' }}
            </span>
            <span class="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">{{ item.proposalCount }} proposal</span>
            <span :class="['text-[11px] font-semibold px-2 py-0.5 rounded-full', statusConfig[item.latestStatus]?.class || 'bg-slate-100 text-slate-500']">
              {{ statusConfig[item.latestStatus]?.label || item.latestStatus }}
            </span>
            <ChevronDown :class="['h-4 w-4 text-slate-400 transition-transform', expandedStudent === item.studentId ? 'rotate-180' : '']" />
          </div>
        </div>

        <!-- Expanded: Proposals List -->
        <div v-if="expandedStudent === item.studentId" class="border-t border-slate-100 bg-slate-50/50 px-5 py-4">
          <p class="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Daftar Proposal ({{ item.proposalCount }})</p>

          <div class="space-y-2">
            <div v-for="(p, idx) in item.proposals" :key="p.id"
              :class="['flex items-center gap-4 p-3 rounded-xl border transition-colors',
                hasApprovedProposal(item) && !['DRAFT', 'SUBMITTED', 'REVISION'].includes(p.status) ? 'bg-emerald-50 border-emerald-200' :
                hasApprovedProposal(item) ? 'bg-slate-50 border-slate-200 opacity-50' : 'bg-white border-slate-200 hover:border-emerald-200']">

              <!-- Number -->
              <div class="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600 shrink-0">
                {{ Number(idx) + 1 }}
              </div>

              <!-- Title -->
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-slate-800 truncate">{{ p.title }}</p>
                <p class="text-[11px] text-slate-400 mt-0.5">{{ p.type }} · Mode {{ p.flowMode || 'C' }} · {{ p.submittedAt ? new Date(p.submittedAt).toLocaleDateString('id-ID') : '-' }}</p>
              </div>

              <!-- Status -->
              <span :class="['text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0', statusConfig[p.status]?.class || 'bg-slate-100 text-slate-500']">
                {{ statusConfig[p.status]?.label || p.status }}
              </span>

              <!-- Action -->
              <button @click.stop="router.push(`/thesis/${p.id}`)"
                :class="['inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors shrink-0',
                  hasApprovedProposal(item) && ['DRAFT', 'SUBMITTED', 'REVISION'].includes(p.status)
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100']"
                :disabled="hasApprovedProposal(item) && ['DRAFT', 'SUBMITTED', 'REVISION'].includes(p.status)">
                <Eye class="h-3 w-3" /> Detail
              </button>
            </div>
          </div>

          <!-- Warning if has approved -->
          <div v-if="hasApprovedProposal(item)" class="mt-3 p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg">
            <p class="text-[11px] text-emerald-700 font-medium flex items-center gap-1.5">
              <CheckCircle2 class="h-3.5 w-3.5" />
              Mahasiswa ini sudah memiliki proposal yang disetujui. Proposal lain tidak bisa di-approve.
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>


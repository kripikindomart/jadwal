<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '@/lib/api'
import { useToast } from '@/composables/useToast'
import SearchableSelect from '@/components/ui/SearchableSelect.vue'
import {
  ArrowLeft, UserPlus, Calendar, Loader2, CheckCircle2, XCircle,
  Trash2, FileText, Download, Eye, Users, Shield, ChevronRight,
  CheckSquare, Square, Send,
} from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()
const toast = useToast()
const id = Number(route.params.id)

const loading = ref(true)
const data = ref<any>(null)
const flow = ref<any>(null)
const history = ref<any>(null)
const historyTypeFilter = ref('ALL')
const lecturers = ref<any[]>([])
const rooms = ref<any[]>([])
const saving = ref(false)

// Verification items with per-item status
const verificationItems = ref([
  { label: 'Format Penulisan', desc: 'Sesuai Buku Panduan Skripsi/Tesis.', status: 'pending' },
  { label: 'Bebas Plagiasi', desc: 'Bukti cek Turnitin terlampir (Max 25%).', status: 'pending' },
  { label: 'Format File', desc: 'Semua lampiran PDF dan terbaca jelas.', status: 'pending' },
  { label: 'Kelengkapan Dokumen', desc: 'BAB 1-3 lengkap, daftar pustaka ada.', status: 'pending' },
])
const verificationNotes = ref('')

const allApproved = computed(() => verificationItems.value.every(i => i.status === 'approved'))
const hasRevision = computed(() => verificationItems.value.some(i => i.status === 'revision'))
const canEditVerification = computed(() => ['SUBMITTED', 'REVISION'].includes(data.value?.status))
const isVerificationApprovedByStage = computed(() => [
  'TITLE_APPROVED',
  'SUPERVISOR_ASSIGNED',
  'PROPOSAL_GUIDANCE',
  'PROPOSAL_EXAM_SCHEDULED',
  'PROPOSAL_PASSED',
  'THESIS_GUIDANCE',
  'RESULT_EXAM_SCHEDULED',
  'RESULT_PASSED',
  'FINAL_EXAM_SCHEDULED',
  'REVISION_APPROVED',
  'COMPLETED',
].includes(data.value?.status))
const filteredTimeline = computed(() => {
  const events = history.value?.timeline || []
  if (historyTypeFilter.value === 'ALL') return events
  return events.filter((event: any) => event.type === historyTypeFilter.value)
})
const requestedSupervisor1Name = computed(() => {
  const id = data.value?.requestedSupervisorId1
  if (!id) return '-'
  const lec = lecturers.value.find((l) => Number(l.id) === Number(id))
  return lec?.fullName || lec?.name || `ID ${id}`
})
const requestedSupervisor2Name = computed(() => {
  const id = data.value?.requestedSupervisorId2
  if (!id) return '-'
  const lec = lecturers.value.find((l) => Number(l.id) === Number(id))
  return lec?.fullName || lec?.name || `ID ${id}`
})

function approveAll() {
  updateStatus('TITLE_APPROVED')
}

function requestRevision() {
  updateStatus('REVISION')
}

// Forms
const supervisorForm = ref({ lecturerId: '' as string | number, role: 'PEMBIMBING_1', skNumber: '' })
const examForm = ref({ type: 'SEMINAR_PROPOSAL', date: '', startTime: '09:00', endTime: '11:00', roomId: '' as string | number })
const examinerForm = ref<{ examId: number | null; lecturerId: string | number; role: string }>({ examId: null, lecturerId: '', role: 'PENGUJI_1' })
const showSupervisorForm = ref(false)
const showExamForm = ref(false)
const showExaminerForm = ref(false)

onMounted(async () => {
  await Promise.all([fetchData(), fetchFlow(), fetchHistory(), fetchOptions()])
})

async function fetchData(silent = false) {
  if (!silent) loading.value = true
  try {
    const res = await api.get(`/thesis/${id}`)
    data.value = res.data
  } catch (e: any) { alert(e.response?.data?.message || 'Gagal memuat') }
  finally { if (!silent) loading.value = false }
}

async function fetchFlow() {
  try {
    const res = await api.get(`/thesis/${id}/flow`)
    flow.value = res.data
    if (flow.value?.nextExamType) {
      examForm.value.type = flow.value.nextExamType
    }
  } catch {
    flow.value = null
  }
}

async function fetchHistory() {
  try {
    const res = await api.get(`/thesis/${id}/history`)
    history.value = res.data
  } catch {
    history.value = null
  }
}

async function fetchOptions() {
  try {
    const [l, r] = await Promise.all([
      api.get('/lecturers?perPage=100&ignoreProdiScope=true'),
      api.get('/rooms?perPage=100'),
    ])
    lecturers.value = l.data?.data || []
    rooms.value = r.data?.data || []
  } catch { /* silent */ }
}

async function updateStatus(status: string) {
  try {
    await api.patch(`/thesis/${id}/status`, { status })
    await Promise.all([fetchData(), fetchFlow(), fetchHistory()])
  } catch (e: any) { alert(e.response?.data?.message || 'Gagal') }
}

async function applyTransition(action: 'START_GUIDANCE' | 'MOVE_TO_THESIS_GUIDANCE' | 'APPROVE_REVISION' | 'MARK_COMPLETED') {
  try {
    await api.post(`/thesis/${id}/transition`, { action })
    await Promise.all([fetchData(), fetchFlow(), fetchHistory()])
    toast.success('Berhasil', 'Transisi status berhasil dijalankan')
  } catch (e: any) {
    alert(e.response?.data?.message || 'Gagal menjalankan transisi')
  }
}

async function assignSupervisor() {
  if (!supervisorForm.value.lecturerId) return
  saving.value = true
  try {
    await api.post(`/thesis/${id}/supervisors`, { ...supervisorForm.value, lecturerId: Number(supervisorForm.value.lecturerId) })
    await Promise.all([fetchData(true), fetchFlow(), fetchHistory()])
    showSupervisorForm.value = false
    supervisorForm.value = { lecturerId: '', role: 'PEMBIMBING_1', skNumber: '' }
    toast.success('Berhasil', 'Pembimbing berhasil disimpan')
  } catch (e: any) { alert(e.response?.data?.message || 'Gagal') }
  finally { saving.value = false }
}

async function removeSupervisor(supId: number) {
  if (!confirm('Hapus pembimbing ini?')) return
  await api.delete(`/thesis/supervisors/${supId}`)
  await Promise.all([fetchData(), fetchFlow(), fetchHistory()])
}

async function scheduleExam() {
  if (!examForm.value.date) return
  saving.value = true
  try {
    const payload = {
      ...examForm.value,
      type: flow.value?.nextExamType || examForm.value.type,
      roomId: examForm.value.roomId ? Number(examForm.value.roomId) : undefined,
    }
    await api.post(`/thesis/${id}/exams`, payload)
    await Promise.all([fetchData(), fetchFlow(), fetchHistory()])
    showExamForm.value = false
  } catch (e: any) { alert(e.response?.data?.message || 'Gagal') }
  finally { saving.value = false }
}

async function assignExaminer() {
  if (!examinerForm.value.examId || !examinerForm.value.lecturerId) return
  saving.value = true
  try {
    await api.post(`/thesis/exams/${examinerForm.value.examId}/examiners`, { lecturerId: Number(examinerForm.value.lecturerId), role: examinerForm.value.role })
    await Promise.all([fetchData(), fetchHistory()])
    showExaminerForm.value = false
  } catch (e: any) { alert(e.response?.data?.message || 'Gagal') }
  finally { saving.value = false }
}

async function removeExaminer(exId: number) {
  if (!confirm('Hapus penguji?')) return
  await api.delete(`/thesis/examiners/${exId}`)
  await Promise.all([fetchData(), fetchHistory()])
}

async function updateExamResult(examId: number, status: string) {
  const score = status === 'PASSED' ? prompt('Nilai (0-100):') : null
  const revisionNotes = status === 'REVISION' ? prompt('Catatan revisi:') : null
  try {
    await api.patch(`/thesis/exams/${examId}/result`, { status, score: score ? Number(score) : undefined, revisionNotes: revisionNotes || undefined })
    await Promise.all([fetchData(), fetchFlow(), fetchHistory()])
  } catch (e: any) { alert(e.response?.data?.message || 'Gagal') }
}

function openExaminerForm(examId: number) {
  examinerForm.value = { examId, lecturerId: '', role: 'PENGUJI_1' }
  showExaminerForm.value = true
}

function getInitials(name: string) {
  return (name || '-').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
}

function getEffectiveVerificationStatus(status: string) {
  if (isVerificationApprovedByStage.value) return 'approved'
  return status
}

const statusBadge: Record<string, { label: string; class: string }> = {
  DRAFT: { label: 'Draft', class: 'bg-slate-100 text-slate-700 border-slate-200' },
  SUBMITTED: { label: 'Menunggu Verifikasi Prodi', class: 'bg-amber-100 text-amber-700 border-amber-200' },
  TITLE_APPROVED: { label: 'Judul Disetujui', class: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  SUPERVISOR_ASSIGNED: { label: 'Pembimbing Ditetapkan', class: 'bg-teal-100 text-teal-700 border-teal-200' },
  PROPOSAL_GUIDANCE: { label: 'Bimbingan Proposal', class: 'bg-blue-100 text-blue-700 border-blue-200' },
  PROPOSAL_EXAM_SCHEDULED: { label: 'Seminar Proposal Terjadwal', class: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
  PROPOSAL_PASSED: { label: 'Proposal Lulus', class: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  THESIS_GUIDANCE: { label: 'Bimbingan Tesis', class: 'bg-blue-100 text-blue-700 border-blue-200' },
  RESULT_EXAM_SCHEDULED: { label: 'Seminar Hasil Terjadwal', class: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
  RESULT_PASSED: { label: 'Seminar Hasil Lulus', class: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  FINAL_EXAM_SCHEDULED: { label: 'Sidang Akhir Terjadwal', class: 'bg-violet-100 text-violet-700 border-violet-200' },
  REVISION: { label: 'Revisi', class: 'bg-orange-100 text-orange-700 border-orange-200' },
  REVISION_APPROVED: { label: 'Revisi Disetujui', class: 'bg-cyan-100 text-cyan-700 border-cyan-200' },
  COMPLETED: { label: 'Selesai', class: 'bg-green-100 text-green-800 border-green-200' },
}

const examTypeLabels: Record<string, string> = {
  SEMINAR_PROPOSAL: 'Seminar Proposal',
  SEMINAR_HASIL: 'Seminar Hasil',
  SIDANG_AKHIR: 'Sidang Akhir',
}

function formatTimelineTime(timestamp?: string) {
  if (!timestamp) return '-'
  return new Date(timestamp).toLocaleString('id-ID')
}

function formatHistoryType(type?: string) {
  if (!type) return '-'
  return type.replace(/_/g, ' ')
}
</script>

<template>
  <div>
    <!-- Breadcrumb -->
    <div class="mb-6">
      <button @click="router.push('/thesis')" class="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-3">
        <ArrowLeft class="h-4 w-4" /> Kembali ke Daftar
      </button>
      <p class="text-xs text-slate-400">Management > Review Proposal > {{ data?.studentName }}</p>
    </div>

    <div v-if="loading" class="text-center py-16"><Loader2 class="h-8 w-8 mx-auto animate-spin text-slate-300" /></div>

    <div v-else-if="data" class="grid grid-cols-1 lg:grid-cols-3 gap-6">

      <!-- LEFT COLUMN (2/3) -->
      <div class="lg:col-span-2 space-y-6">

        <!-- Header + Status -->
        <div class="flex items-center justify-between">
          <h1 class="text-xl font-bold text-slate-900">Review Proposal</h1>
          <div class="flex items-center gap-2">
            <span class="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold border border-indigo-200 bg-indigo-50 text-indigo-700">
              Mode {{ flow?.flowMode || '-' }}
            </span>
            <span :class="['inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold border', statusBadge[data.status]?.class || 'bg-slate-100 text-slate-600 border-slate-200']">
              {{ statusBadge[data.status]?.label || data.status }}
            </span>
          </div>
        </div>

        <!-- Student Info Card -->
        <div class="rounded-2xl bg-white border border-slate-100 shadow-sm p-6">
          <div class="flex items-center gap-4">
            <div class="h-14 w-14 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white text-lg font-bold shadow-md">
              {{ getInitials(data.studentName || '') }}
            </div>
            <div>
              <h2 class="text-lg font-bold text-slate-900">{{ data.studentName }}</h2>
              <p class="text-sm text-slate-500">NIM: {{ data.studentNim }} - {{ data.prodiName }}</p>
            </div>
          </div>
        </div>

        <!-- Detail Proposal -->
        <div class="rounded-2xl bg-white border border-slate-100 shadow-sm p-6">
          <h3 class="text-base font-bold text-slate-800 flex items-center gap-2 mb-4">
            <FileText class="h-5 w-5 text-emerald-600" /> Detail Proposal
          </h3>

          <div class="space-y-4">
            <div>
              <p class="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Judul Penelitian</p>
              <p class="text-base font-semibold text-slate-900 leading-relaxed">{{ data.title }}</p>
            </div>
            <div v-if="data.titleEn">
              <p class="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Title (English)</p>
              <p class="text-sm text-slate-700 italic">{{ data.titleEn }}</p>
            </div>
            <div v-if="data.abstract">
              <p class="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Abstrak</p>
              <p class="text-sm text-slate-700 leading-relaxed">{{ data.abstract }}</p>
            </div>
            <div class="border-t border-slate-100 pt-3">
              <p class="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Usulan Pembimbing dari Mahasiswa</p>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div class="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                  <span class="text-slate-500">Pembimbing Utama:</span>
                  <p class="font-semibold text-slate-700 mt-0.5">{{ requestedSupervisor1Name }}</p>
                </div>
                <div class="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                  <span class="text-slate-500">Pembimbing Pendamping:</span>
                  <p class="font-semibold text-slate-700 mt-0.5">{{ requestedSupervisor2Name }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Rekomendasi Pembimbing -->
        <div class="rounded-2xl bg-white border border-slate-100 shadow-sm p-6">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-base font-bold text-slate-800 flex items-center gap-2">
              <Users class="h-5 w-5 text-emerald-600" /> Pembimbing
            </h3>
            <button @click="showSupervisorForm = !showSupervisorForm" class="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-700">
              <UserPlus class="h-3.5 w-3.5" /> Assign
            </button>
          </div>

          <div v-if="data.supervisors?.length" class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            <div v-for="s in data.supervisors" :key="s.id" class="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50/50">
              <div class="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center text-xs font-bold text-emerald-700">
                {{ getInitials(s.fullName || s.name) }}
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-semibold text-slate-800 truncate">{{ s.fullName || s.name }}</p>
                <p class="text-[10px] text-slate-500">{{ s.role === 'PEMBIMBING_1' ? 'Pembimbing Utama' : 'Pembimbing Pendamping' }}</p>
              </div>
              <button @click="removeSupervisor(s.id)" class="p-1 text-slate-400 hover:text-rose-500 rounded"><Trash2 class="h-3.5 w-3.5" /></button>
            </div>
          </div>
          <p v-else class="text-sm text-slate-400 italic mb-4">Belum ada pembimbing yang ditetapkan</p>

          <!-- Assign Form -->
          <div v-if="showSupervisorForm" class="p-4 border border-emerald-200 rounded-xl bg-emerald-50/50 space-y-3">
            <SearchableSelect v-model="supervisorForm.lecturerId" :options="lecturers.map(l => ({ value: l.id, label: l.fullName || l.name }))" placeholder="Cari dosen..." />
            <div class="grid grid-cols-2 gap-3">
              <select v-model="supervisorForm.role" class="rounded-lg border border-slate-200 px-3 py-2 text-sm">
                <option value="PEMBIMBING_1">Pembimbing Utama</option>
                <option value="PEMBIMBING_2">Pembimbing Pendamping</option>
              </select>
              <input v-model="supervisorForm.skNumber" placeholder="No. SK (opsional)" class="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            </div>
            <div class="flex gap-2">
              <button @click="assignSupervisor" :disabled="saving" class="px-4 py-2 text-xs font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50">Simpan</button>
              <button @click="showSupervisorForm = false" class="px-3 py-2 text-xs text-slate-500 hover:bg-slate-100 rounded-lg">Batal</button>
            </div>
          </div>
        </div>

        <!-- Dokumen yang Diupload Mahasiswa -->
        <div class="rounded-2xl bg-white border border-slate-100 shadow-sm p-6">
          <h3 class="text-base font-bold text-slate-800 flex items-center gap-2 mb-4">
            <FileText class="h-5 w-5 text-emerald-600" /> Dokumen Lampiran
          </h3>
          <div class="space-y-3">
            <div class="flex items-center gap-3 p-3 rounded-xl border border-slate-200" :class="data.documentUrl ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50'">
              <div :class="['h-10 w-10 rounded-lg flex items-center justify-center', data.documentUrl ? 'bg-emerald-100' : 'bg-slate-200']">
                <FileText :class="['h-5 w-5', data.documentUrl ? 'text-emerald-600' : 'text-slate-400']" />
              </div>
              <div class="flex-1">
                <p class="text-sm font-medium text-slate-800">Draft Proposal (PDF)</p>
                <p class="text-[11px] text-slate-500">{{ data.documentUrl ? 'File tersedia' : 'Belum diupload mahasiswa' }}</p>
              </div>
              <div v-if="data.documentUrl" class="flex gap-1.5">
                <a :href="data.documentUrl" target="_blank" class="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-600 text-white hover:bg-emerald-700">
                  <Download class="h-3 w-3" /> Unduh
                </a>
                <a :href="data.documentUrl" target="_blank" class="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-200 text-slate-600 hover:bg-slate-50">
                  <Eye class="h-3 w-3" /> Preview
                </a>
              </div>
            </div>

            <div class="flex items-center gap-3 p-3 rounded-xl border border-slate-200" :class="data.plagiarismUrl ? 'bg-blue-50 border-blue-200' : 'bg-slate-50'">
              <div :class="['h-10 w-10 rounded-lg flex items-center justify-center', data.plagiarismUrl ? 'bg-blue-100' : 'bg-slate-200']">
                <Shield :class="['h-5 w-5', data.plagiarismUrl ? 'text-blue-600' : 'text-slate-400']" />
              </div>
              <div class="flex-1">
                <p class="text-sm font-medium text-slate-800">Hasil Cek Plagiarisme</p>
                <p class="text-[11px] text-slate-500">{{ data.plagiarismUrl ? 'File tersedia' : 'Belum diupload mahasiswa' }}</p>
              </div>
              <div v-if="data.plagiarismUrl" class="flex gap-1.5">
                <a :href="data.plagiarismUrl" target="_blank" class="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-600 text-white hover:bg-blue-700">
                  <Download class="h-3 w-3" /> Unduh
                </a>
                <a :href="data.plagiarismUrl" target="_blank" class="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-200 text-slate-600 hover:bg-slate-50">
                  <Eye class="h-3 w-3" /> Preview
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- RIGHT COLUMN (1/3) -->
      <div class="space-y-5">

        <!-- Checklist Verifikasi -->
        <div class="rounded-2xl bg-white border border-slate-100 shadow-sm p-5">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-sm font-bold text-slate-800">Verifikasi Berkas</h3>
            <span v-if="!canEditVerification" class="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-1 rounded-full">
              Terkunci
            </span>
          </div>
          <div class="space-y-3">
            <div v-for="(item, idx) in verificationItems" :key="idx" class="p-3 rounded-xl border border-slate-100 bg-slate-50/50">
              <div class="flex items-center justify-between mb-1.5">
                <p class="text-sm font-medium text-slate-700">{{ item.label }}</p>
                <span :class="['text-[10px] font-bold px-2 py-0.5 rounded-full',
                  getEffectiveVerificationStatus(item.status) === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                  getEffectiveVerificationStatus(item.status) === 'revision' ? 'bg-rose-100 text-rose-700' :
                  'bg-amber-100 text-amber-700']">
                  {{ getEffectiveVerificationStatus(item.status) === 'approved' ? 'OK' : getEffectiveVerificationStatus(item.status) === 'revision' ? 'REVISI' : 'PENDING' }}
                </span>
              </div>
              <p class="text-[11px] text-slate-400 mb-2">{{ item.desc }}</p>
              <div class="flex gap-1.5">
                <button @click="item.status = 'approved'"
                  :disabled="!canEditVerification"
                  :class="['px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors',
                    getEffectiveVerificationStatus(item.status) === 'approved' ? 'bg-emerald-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:border-emerald-300 hover:text-emerald-600',
                    !canEditVerification ? 'opacity-50 cursor-not-allowed' : '']">
                  Approve
                </button>
                <button @click="item.status = 'pending'"
                  :disabled="!canEditVerification"
                  :class="['px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors',
                    getEffectiveVerificationStatus(item.status) === 'pending' ? 'bg-amber-500 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:border-amber-300 hover:text-amber-600',
                    !canEditVerification ? 'opacity-50 cursor-not-allowed' : '']">
                  Pending
                </button>
                <button @click="item.status = 'revision'"
                  :disabled="!canEditVerification"
                  :class="['px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors',
                    getEffectiveVerificationStatus(item.status) === 'revision' ? 'bg-rose-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:border-rose-300 hover:text-rose-600',
                    !canEditVerification ? 'opacity-50 cursor-not-allowed' : '']">
                  Revisi
                </button>
              </div>
            </div>
          </div>

          <div class="mt-4">
            <label class="text-xs font-medium text-slate-600 mb-1 block">Catatan untuk Mahasiswa</label>
            <textarea v-model="verificationNotes" rows="3" placeholder="Tulis catatan jika ada yang perlu diperbaiki..."
              :disabled="!canEditVerification"
              class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 resize-none disabled:bg-slate-100 disabled:text-slate-500"></textarea>
          </div>

          <div class="mt-4 space-y-2">
            <button @click="approveAll"
              :disabled="!allApproved || !canEditVerification"
              class="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm">
              <CheckCircle2 class="h-4 w-4" /> Approve & Lanjutkan
            </button>
            <button @click="requestRevision"
              :disabled="!hasRevision || !canEditVerification"
              class="w-full inline-flex items-center justify-center gap-2 rounded-xl border-2 border-rose-200 py-2.5 text-sm font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-40 disabled:cursor-not-allowed">
              <XCircle class="h-4 w-4" /> Kembalikan untuk Revisi
            </button>
          </div>
        </div>

        <!-- Quick Actions -->
        <div class="rounded-2xl bg-white border border-slate-100 shadow-sm p-5">
          <h3 class="text-sm font-bold text-slate-800 mb-3">Aksi Cepat</h3>
          <div class="space-y-2">
            <button v-if="flow?.allowedActions?.includes('START_GUIDANCE')" @click="applyTransition('START_GUIDANCE')"
              class="w-full text-left px-3 py-2.5 rounded-lg text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 flex items-center gap-2">
              <ChevronRight class="h-3.5 w-3.5" /> Mulai Tahap Bimbingan
            </button>
            <button v-if="flow?.allowedActions?.includes('MOVE_TO_THESIS_GUIDANCE')" @click="applyTransition('MOVE_TO_THESIS_GUIDANCE')"
              class="w-full text-left px-3 py-2.5 rounded-lg text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 flex items-center gap-2">
              <ChevronRight class="h-3.5 w-3.5" /> Mulai Bimbingan Tesis
            </button>
            <button v-if="flow?.allowedActions?.includes('APPROVE_REVISION')" @click="applyTransition('APPROVE_REVISION')"
              class="w-full text-left px-3 py-2.5 rounded-lg text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 flex items-center gap-2">
              <ChevronRight class="h-3.5 w-3.5" /> Revisi Disetujui
            </button>
            <button v-if="flow?.allowedActions?.includes('MARK_COMPLETED')" @click="applyTransition('MARK_COMPLETED')"
              class="w-full text-left px-3 py-2.5 rounded-lg text-xs font-medium text-green-700 bg-green-50 hover:bg-green-100 flex items-center gap-2">
              <ChevronRight class="h-3.5 w-3.5" /> Tandai Selesai
            </button>
            <p v-if="flow?.nextExamType" class="text-[11px] text-slate-500 px-1">
              Ujian berikutnya: <span class="font-semibold text-slate-700">{{ examTypeLabels[flow.nextExamType] || flow.nextExamType }}</span>
            </p>
          </div>
        </div>

        <!-- Info -->
        <div class="rounded-2xl bg-white border border-slate-100 shadow-sm p-5">
          <h3 class="text-sm font-bold text-slate-800 mb-3">Info Akademik</h3>
          <div class="space-y-2 text-xs">
            <div class="flex justify-between"><span class="text-slate-500">Jenis</span><span class="font-medium text-slate-800">{{ data.type }}</span></div>
            <div class="flex justify-between"><span class="text-slate-500">Bimbingan</span><span class="font-medium text-slate-800">{{ data.guidanceCount }}x</span></div>
            <div class="flex justify-between"><span class="text-slate-500">Status</span><span class="font-medium text-slate-800">{{ data.status }}</span></div>
            <div class="flex justify-between"><span class="text-slate-500">Diajukan</span><span class="font-medium text-slate-800">{{ data.submittedAt ? new Date(data.submittedAt).toLocaleDateString('id-ID') : '-' }}</span></div>
          </div>
        </div>

        <div class="rounded-2xl bg-white border border-slate-100 shadow-sm p-5">
          <div class="flex items-center justify-between gap-3 mb-3">
            <h3 class="text-sm font-bold text-slate-800">Riwayat Proses</h3>
            <select
              v-model="historyTypeFilter"
              class="rounded-lg border border-slate-200 px-2 py-1 text-[11px] text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            >
              <option value="ALL">Semua Event</option>
              <option value="THESIS_CREATED">Pengajuan Dibuat</option>
              <option value="THESIS_SUBMITTED">Proposal Diajukan</option>
              <option value="TITLE_APPROVED">Judul Disetujui</option>
              <option value="SUPERVISOR_ASSIGNED">Pembimbing</option>
              <option value="GUIDANCE_LOG">Bimbingan</option>
              <option value="EXAM_SCHEDULED">Jadwal Ujian</option>
              <option value="EXAM_RESULT">Hasil Ujian</option>
              <option value="THESIS_COMPLETED">Selesai</option>
            </select>
          </div>
          <div v-if="filteredTimeline.length" class="space-y-3 max-h-96 overflow-auto pr-1">
            <div
              v-for="(event, idx) in filteredTimeline"
              :key="`${event.type}-${idx}-${event.timestamp}`"
              class="border border-slate-100 rounded-lg p-3 bg-slate-50/50"
            >
              <div class="flex items-center justify-between gap-2">
                <p class="text-[11px] text-slate-500">{{ formatTimelineTime(event.timestamp) }}</p>
                <span class="text-[10px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                  {{ formatHistoryType(event.type) }}
                </span>
              </div>
              <p class="text-xs font-semibold text-slate-800 mt-0.5">{{ event.title }}</p>
              <p v-if="event.description" class="text-[11px] text-slate-600 mt-1">{{ event.description }}</p>
              <div v-if="event.meta" class="mt-2 pt-2 border-t border-slate-100 space-y-1">
                <p v-if="event.meta.examDate" class="text-[11px] text-slate-600">Tanggal: {{ event.meta.examDate }}</p>
                <p v-if="event.meta.startTime || event.meta.endTime" class="text-[11px] text-slate-600">
                  Waktu: {{ event.meta.startTime || '-' }} - {{ event.meta.endTime || '-' }}
                </p>
                <p v-if="event.meta.score !== undefined && event.meta.score !== null" class="text-[11px] text-slate-600">
                  Nilai: {{ event.meta.score }}
                </p>
                <p v-if="event.meta.revisionDeadline" class="text-[11px] text-slate-600">
                  Deadline Revisi: {{ event.meta.revisionDeadline }}
                </p>
                <p v-if="event.meta.lecturerName" class="text-[11px] text-slate-600">
                  Dosen: {{ event.meta.lecturerName }}
                </p>
                <p v-if="event.meta.role" class="text-[11px] text-slate-600">
                  Peran: {{ event.meta.role }}
                </p>
                <p v-if="event.meta.chapter" class="text-[11px] text-slate-600">
                  Bab: {{ event.meta.chapter }}
                </p>
              </div>
            </div>
          </div>
          <p v-else class="text-xs text-slate-400 italic">Belum ada riwayat proses.</p>
        </div>
      </div>
    </div>
  </div>
</template>

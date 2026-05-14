<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '@/lib/api'
import SearchableSelect from '@/components/ui/SearchableSelect.vue'
import {
  ArrowLeft, UserPlus, Calendar, Loader2, CheckCircle2, XCircle,
  Trash2, FileText, Download, Eye, Users, Shield, ChevronRight,
  CheckSquare, Square, Send,
} from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()
const id = Number(route.params.id)

const loading = ref(true)
const data = ref<any>(null)
const lecturers = ref<any[]>([])
const rooms = ref<any[]>([])
const saving = ref(false)

// Verification checklist
const checklist = ref({
  formatOk: false,
  plagiarismOk: false,
  fileOk: false,
})
const verificationNotes = ref('')

// Forms
const supervisorForm = ref({ lecturerId: '' as string | number, role: 'PEMBIMBING_1', skNumber: '' })
const examForm = ref({ type: 'SEMINAR_PROPOSAL', date: '', startTime: '09:00', endTime: '11:00', roomId: '' as string | number })
const examinerForm = ref<{ examId: number | null; lecturerId: string | number; role: string }>({ examId: null, lecturerId: '', role: 'PENGUJI_1' })
const showSupervisorForm = ref(false)
const showExamForm = ref(false)
const showExaminerForm = ref(false)

onMounted(async () => {
  await Promise.all([fetchData(), fetchOptions()])
})

async function fetchData() {
  loading.value = true
  try {
    const res = await api.get(`/thesis/${id}`)
    data.value = res.data
  } catch (e: any) { alert(e.response?.data?.message || 'Gagal memuat') }
  finally { loading.value = false }
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
    await fetchData()
  } catch (e: any) { alert(e.response?.data?.message || 'Gagal') }
}

async function assignSupervisor() {
  if (!supervisorForm.value.lecturerId) return
  saving.value = true
  try {
    await api.post(`/thesis/${id}/supervisors`, { ...supervisorForm.value, lecturerId: Number(supervisorForm.value.lecturerId) })
    await fetchData()
    showSupervisorForm.value = false
    supervisorForm.value = { lecturerId: '', role: 'PEMBIMBING_1', skNumber: '' }
  } catch (e: any) { alert(e.response?.data?.message || 'Gagal') }
  finally { saving.value = false }
}

async function removeSupervisor(supId: number) {
  if (!confirm('Hapus pembimbing ini?')) return
  await api.delete(`/thesis/supervisors/${supId}`)
  await fetchData()
}

async function scheduleExam() {
  if (!examForm.value.date) return
  saving.value = true
  try {
    await api.post(`/thesis/${id}/exams`, { ...examForm.value, roomId: examForm.value.roomId ? Number(examForm.value.roomId) : undefined })
    await fetchData()
    showExamForm.value = false
  } catch (e: any) { alert(e.response?.data?.message || 'Gagal') }
  finally { saving.value = false }
}

async function assignExaminer() {
  if (!examinerForm.value.examId || !examinerForm.value.lecturerId) return
  saving.value = true
  try {
    await api.post(`/thesis/exams/${examinerForm.value.examId}/examiners`, { lecturerId: Number(examinerForm.value.lecturerId), role: examinerForm.value.role })
    await fetchData()
    showExaminerForm.value = false
  } catch (e: any) { alert(e.response?.data?.message || 'Gagal') }
  finally { saving.value = false }
}

async function removeExaminer(exId: number) {
  if (!confirm('Hapus penguji?')) return
  await api.delete(`/thesis/examiners/${exId}`)
  await fetchData()
}

async function updateExamResult(examId: number, status: string) {
  const score = status === 'PASSED' ? prompt('Nilai (0-100):') : null
  const revisionNotes = status === 'REVISION' ? prompt('Catatan revisi:') : null
  try {
    await api.patch(`/thesis/exams/${examId}/result`, { status, score: score ? Number(score) : undefined, revisionNotes: revisionNotes || undefined })
    await fetchData()
  } catch (e: any) { alert(e.response?.data?.message || 'Gagal') }
}

function openExaminerForm(examId: number) {
  examinerForm.value = { examId, lecturerId: '', role: 'PENGUJI_1' }
  showExaminerForm.value = true
}

function getInitials(name: string) {
  return (name || '-').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
}

const statusBadge: Record<string, { label: string; class: string }> = {
  SUBMITTED: { label: 'Menunggu Verifikasi Prodi', class: 'bg-amber-100 text-amber-700 border-amber-200' },
  TITLE_APPROVED: { label: 'Judul Disetujui', class: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  SUPERVISOR_ASSIGNED: { label: 'Pembimbing Ditetapkan', class: 'bg-teal-100 text-teal-700 border-teal-200' },
  PROPOSAL_GUIDANCE: { label: 'Bimbingan Proposal', class: 'bg-blue-100 text-blue-700 border-blue-200' },
  PROPOSAL_PASSED: { label: 'Proposal Lulus', class: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  THESIS_GUIDANCE: { label: 'Bimbingan Tesis', class: 'bg-blue-100 text-blue-700 border-blue-200' },
  REVISION: { label: 'Revisi', class: 'bg-orange-100 text-orange-700 border-orange-200' },
  COMPLETED: { label: 'Selesai', class: 'bg-green-100 text-green-800 border-green-200' },
}
</script>

<template>
  <div>
    <!-- Breadcrumb -->
    <div class="mb-6">
      <button @click="router.push('/thesis')" class="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-3">
        <ArrowLeft class="h-4 w-4" /> Kembali ke Daftar
      </button>
      <p class="text-xs text-slate-400">Management › Review Proposal › {{ data?.studentName }}</p>
    </div>

    <div v-if="loading" class="text-center py-16"><Loader2 class="h-8 w-8 mx-auto animate-spin text-slate-300" /></div>

    <div v-else-if="data" class="grid grid-cols-1 lg:grid-cols-3 gap-6">

      <!-- ═══ LEFT COLUMN (2/3) ═══ -->
      <div class="lg:col-span-2 space-y-6">

        <!-- Header + Status -->
        <div class="flex items-center justify-between">
          <h1 class="text-xl font-bold text-slate-900">Review Proposal</h1>
          <span :class="['inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold border', statusBadge[data.status]?.class || 'bg-slate-100 text-slate-600 border-slate-200']">
            {{ statusBadge[data.status]?.label || data.status }}
          </span>
        </div>

        <!-- Student Info Card -->
        <div class="rounded-2xl bg-white border border-slate-100 shadow-sm p-6">
          <div class="flex items-center gap-4">
            <div class="h-14 w-14 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white text-lg font-bold shadow-md">
              {{ getInitials(data.studentName || '') }}
            </div>
            <div>
              <h2 class="text-lg font-bold text-slate-900">{{ data.studentName }}</h2>
              <p class="text-sm text-slate-500">NIM: {{ data.studentNim }} · {{ data.prodiName }}</p>
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

            <div class="flex gap-3 pt-2">
              <button class="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50">
                <Download class="h-3.5 w-3.5" /> Unduh Draft Proposal (PDF)
              </button>
              <button class="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50">
                <Eye class="h-3.5 w-3.5" /> Pratinjau Berkas
              </button>
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

        <!-- Sidang & Penguji -->
        <div class="rounded-2xl bg-white border border-slate-100 shadow-sm p-6">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-base font-bold text-slate-800 flex items-center gap-2">
              <Calendar class="h-5 w-5 text-emerald-600" /> Sidang & Penguji
            </h3>
            <button @click="showExamForm = !showExamForm" class="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-700">
              <Calendar class="h-3.5 w-3.5" /> Jadwalkan
            </button>
          </div>

          <div v-if="data.exams?.length" class="space-y-4">
            <div v-for="exam in data.exams" :key="exam.id" class="p-4 border border-slate-200 rounded-xl">
              <div class="flex items-center justify-between mb-3">
                <div class="flex items-center gap-2">
                  <span class="text-xs font-bold text-violet-700 bg-violet-100 px-2.5 py-1 rounded-lg">{{ exam.type }}</span>
                  <span class="text-sm text-slate-700">{{ exam.date }} · {{ exam.startTime?.slice(0,5) }}–{{ exam.endTime?.slice(0,5) }}</span>
                  <span class="text-xs text-slate-500">{{ exam.room }}</span>
                </div>
                <div class="flex gap-1">
                  <button v-if="exam.status === 'SCHEDULED'" @click="updateExamResult(exam.id, 'PASSED')" class="px-2.5 py-1 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg">Lulus</button>
                  <button v-if="exam.status === 'SCHEDULED'" @click="updateExamResult(exam.id, 'REVISION')" class="px-2.5 py-1 text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg">Revisi</button>
                </div>
              </div>
              <div class="space-y-1 ml-1">
                <div v-for="ex in exam.examiners" :key="ex.id" class="flex items-center justify-between text-xs">
                  <span class="text-slate-600"><span class="text-slate-400 font-medium">{{ ex.role }}:</span> {{ ex.fullName }}</span>
                  <button @click="removeExaminer(ex.id)" class="text-slate-400 hover:text-rose-500"><Trash2 class="h-3 w-3" /></button>
                </div>
                <button @click="openExaminerForm(exam.id)" class="text-xs text-emerald-600 hover:underline mt-1 font-medium">+ Tambah Penguji</button>
              </div>
            </div>
          </div>
          <p v-else class="text-sm text-slate-400 italic">Belum ada jadwal sidang</p>

          <!-- Exam Form -->
          <div v-if="showExamForm" class="mt-4 p-4 border border-emerald-200 rounded-xl bg-emerald-50/50 grid grid-cols-2 gap-3">
            <select v-model="examForm.type" class="rounded-lg border border-slate-200 px-3 py-2 text-sm">
              <option value="SEMINAR_PROPOSAL">Seminar Proposal</option>
              <option value="SEMINAR_HASIL">Seminar Hasil</option>
              <option value="SIDANG_AKHIR">Sidang Akhir</option>
            </select>
            <input v-model="examForm.date" type="date" class="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            <input v-model="examForm.startTime" type="time" class="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            <input v-model="examForm.endTime" type="time" class="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            <select v-model="examForm.roomId" class="col-span-2 rounded-lg border border-slate-200 px-3 py-2 text-sm">
              <option value="">— Ruangan —</option>
              <option v-for="r in rooms" :key="r.id" :value="r.id">{{ r.name }}</option>
            </select>
            <div class="col-span-2 flex gap-2">
              <button @click="scheduleExam" :disabled="saving" class="px-4 py-2 text-xs font-semibold bg-emerald-600 text-white rounded-lg disabled:opacity-50">Simpan</button>
              <button @click="showExamForm = false" class="px-3 py-2 text-xs text-slate-500 hover:bg-slate-100 rounded-lg">Batal</button>
            </div>
          </div>

          <!-- Examiner Form -->
          <div v-if="showExaminerForm" class="mt-4 p-4 border border-emerald-200 rounded-xl bg-emerald-50/50 space-y-3">
            <SearchableSelect v-model="examinerForm.lecturerId" :options="lecturers.map(l => ({ value: l.id, label: l.fullName || l.name }))" placeholder="Cari dosen penguji..." />
            <select v-model="examinerForm.role" class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
              <option value="KETUA">Ketua Penguji</option>
              <option value="PENGUJI_1">Penguji 1</option>
              <option value="PENGUJI_2">Penguji 2</option>
              <option value="SEKRETARIS">Sekretaris</option>
            </select>
            <div class="flex gap-2">
              <button @click="assignExaminer" :disabled="saving" class="px-4 py-2 text-xs font-semibold bg-emerald-600 text-white rounded-lg disabled:opacity-50">Simpan</button>
              <button @click="showExaminerForm = false" class="px-3 py-2 text-xs text-slate-500 hover:bg-slate-100 rounded-lg">Batal</button>
            </div>
          </div>
        </div>

        <!-- Log Bimbingan -->
        <div class="rounded-2xl bg-white border border-slate-100 shadow-sm p-6">
          <h3 class="text-base font-bold text-slate-800 mb-4">Log Bimbingan ({{ data.guidanceCount }}x)</h3>
          <div v-if="data.guidanceLogs?.length" class="space-y-3">
            <div v-for="log in data.guidanceLogs" :key="log.id" class="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
              <div class="h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center text-xs font-bold text-emerald-700 shrink-0">{{ log.chapter || '#' }}</div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-slate-800">{{ log.topic }}</p>
                <p v-if="log.notes" class="text-xs text-slate-500 mt-0.5">{{ log.notes }}</p>
                <p class="text-[10px] text-slate-400 mt-1">{{ log.date }} · {{ log.lecturerName }}</p>
              </div>
            </div>
          </div>
          <p v-else class="text-sm text-slate-400 italic">Belum ada log bimbingan</p>
        </div>
      </div>

      <!-- ═══ RIGHT COLUMN (1/3) ═══ -->
      <div class="space-y-5">

        <!-- Checklist Verifikasi -->
        <div class="rounded-2xl bg-white border border-slate-100 shadow-sm p-5">
          <h3 class="text-sm font-bold text-slate-800 mb-4">Ceklis Verifikasi Berkas</h3>
          <div class="space-y-3">
            <label class="flex items-start gap-3 cursor-pointer">
              <input type="checkbox" v-model="checklist.formatOk" class="mt-0.5 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" />
              <div>
                <p class="text-sm font-medium text-slate-700">Sesuai Pedoman</p>
                <p class="text-[11px] text-slate-400">Format penulisan sesuai Buku Panduan.</p>
              </div>
            </label>
            <label class="flex items-start gap-3 cursor-pointer">
              <input type="checkbox" v-model="checklist.plagiarismOk" class="mt-0.5 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" />
              <div>
                <p class="text-sm font-medium text-slate-700">Bebas Plagiasi</p>
                <p class="text-[11px] text-slate-400">Sudah melampirkan bukti cek Turnitin (Max 25%).</p>
              </div>
            </label>
            <label class="flex items-start gap-3 cursor-pointer">
              <input type="checkbox" v-model="checklist.fileOk" class="mt-0.5 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" />
              <div>
                <p class="text-sm font-medium text-slate-700">Format File Benar</p>
                <p class="text-[11px] text-slate-400">Semua lampiran dalam format PDF dan terbaca jelas.</p>
              </div>
            </label>
          </div>

          <div class="mt-4">
            <label class="text-xs font-medium text-slate-600 mb-1 block">Catatan Tambahan (Opsional)</label>
            <textarea v-model="verificationNotes" rows="3" placeholder="Tulis catatan jika ada revisi..."
              class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 resize-none"></textarea>
          </div>

          <div class="mt-4 space-y-2">
            <button @click="updateStatus('TITLE_APPROVED')"
              :disabled="!checklist.formatOk || !checklist.plagiarismOk || !checklist.fileOk"
              class="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm">
              <CheckCircle2 class="h-4 w-4" /> Verifikasi Berkas
            </button>
            <button @click="updateStatus('SUBMITTED')"
              class="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50">
              <XCircle class="h-4 w-4" /> Kembalikan (Revisi)
            </button>
          </div>
        </div>

        <!-- Quick Actions -->
        <div class="rounded-2xl bg-white border border-slate-100 shadow-sm p-5">
          <h3 class="text-sm font-bold text-slate-800 mb-3">Aksi Cepat</h3>
          <div class="space-y-2">
            <button v-if="data.status === 'SUPERVISOR_ASSIGNED'" @click="updateStatus('PROPOSAL_GUIDANCE')"
              class="w-full text-left px-3 py-2.5 rounded-lg text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 flex items-center gap-2">
              <ChevronRight class="h-3.5 w-3.5" /> Mulai Bimbingan Proposal
            </button>
            <button v-if="data.status === 'PROPOSAL_PASSED'" @click="updateStatus('THESIS_GUIDANCE')"
              class="w-full text-left px-3 py-2.5 rounded-lg text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 flex items-center gap-2">
              <ChevronRight class="h-3.5 w-3.5" /> Mulai Bimbingan Tesis
            </button>
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
      </div>
    </div>
  </div>
</template>

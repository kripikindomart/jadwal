<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '@/lib/api'
import { ArrowLeft, UserPlus, Calendar, Plus, Loader2, CheckCircle2, XCircle, Trash2 } from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()
const id = Number(route.params.id)

const loading = ref(true)
const data = ref<any>(null)
const lecturers = ref<any[]>([])
const rooms = ref<any[]>([])
const saving = ref(false)

// Forms
const supervisorForm = ref({ lecturerId: '', role: 'PEMBIMBING_1', skNumber: '' })
const examForm = ref({ type: 'SEMINAR_PROPOSAL', date: '', startTime: '09:00', endTime: '11:00', roomId: '' })
const examinerForm = ref<{ examId: number | null; lecturerId: string; role: string }>({ examId: null, lecturerId: '', role: 'PENGUJI_1' })
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

async function assignSupervisor() {
  saving.value = true
  try {
    await api.post(`/thesis/${id}/supervisors`, { ...supervisorForm.value, lecturerId: Number(supervisorForm.value.lecturerId) })
    await fetchData()
    showSupervisorForm.value = false
  } catch (e: any) { alert(e.response?.data?.message || 'Gagal') }
  finally { saving.value = false }
}

async function removeSupervisor(supId: number) {
  if (!confirm('Hapus pembimbing ini?')) return
  await api.delete(`/thesis/supervisors/${supId}`)
  await fetchData()
}

async function scheduleExam() {
  saving.value = true
  try {
    await api.post(`/thesis/${id}/exams`, { ...examForm.value, roomId: examForm.value.roomId ? Number(examForm.value.roomId) : undefined })
    await fetchData()
    showExamForm.value = false
  } catch (e: any) { alert(e.response?.data?.message || 'Gagal') }
  finally { saving.value = false }
}

async function assignExaminer() {
  if (!examinerForm.value.examId) return
  saving.value = true
  try {
    await api.post(`/thesis/exams/${examinerForm.value.examId}/examiners`, { lecturerId: Number(examinerForm.value.lecturerId), role: examinerForm.value.role })
    await fetchData()
    showExaminerForm.value = false
  } catch (e: any) { alert(e.response?.data?.message || 'Gagal') }
  finally { saving.value = false }
}

async function removeExaminer(exId: number) {
  if (!confirm('Hapus penguji ini?')) return
  await api.delete(`/thesis/examiners/${exId}`)
  await fetchData()
}

async function updateExamResult(examId: number, status: string) {
  const score = status === 'PASSED' ? prompt('Nilai (0-100):') : null
  const revisionNotes = status === 'REVISION' ? prompt('Catatan revisi:') : null
  try {
    await api.patch(`/thesis/exams/${examId}/result`, {
      status,
      score: score ? Number(score) : undefined,
      revisionNotes: revisionNotes || undefined,
    })
    await fetchData()
  } catch (e: any) { alert(e.response?.data?.message || 'Gagal') }
}

async function updateStatus(status: string) {
  try {
    await api.patch(`/thesis/${id}/status`, { status })
    await fetchData()
  } catch (e: any) { alert(e.response?.data?.message || 'Gagal') }
}

function openExaminerForm(examId: number) {
  examinerForm.value = { examId, lecturerId: '', role: 'PENGUJI_1' }
  showExaminerForm.value = true
}
</script>

<template>
  <div class="space-y-6">
    <button @click="router.push('/thesis')" class="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
      <ArrowLeft class="h-4 w-4" /> Kembali
    </button>

    <div v-if="loading" class="text-center py-12"><Loader2 class="h-8 w-8 mx-auto animate-spin text-slate-400" /></div>

    <div v-else-if="data">
      <!-- Header -->
      <div class="rounded-2xl bg-white border border-slate-100 shadow-sm p-6">
        <h1 class="text-xl font-bold text-slate-800">{{ data.title }}</h1>
        <p class="text-sm text-slate-500 mt-1">{{ data.studentName }} · {{ data.studentNim }} · {{ data.prodiName }} · {{ data.type }}</p>
        <div class="flex items-center gap-3 mt-3">
          <span class="text-xs font-semibold px-2.5 py-1 rounded-full bg-violet-100 text-violet-700">{{ data.status }}</span>
          <span class="text-xs text-slate-400">Bimbingan: {{ data.guidanceCount }}x</span>
        </div>
        <!-- Quick status actions -->
        <div class="flex gap-2 mt-4 flex-wrap">
          <button v-if="data.status === 'SUBMITTED'" @click="updateStatus('TITLE_APPROVED')" class="text-xs px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">Approve Judul</button>
          <button v-if="data.status === 'SUPERVISOR_ASSIGNED'" @click="updateStatus('PROPOSAL_GUIDANCE')" class="text-xs px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">Mulai Bimbingan Proposal</button>
          <button v-if="data.status === 'PROPOSAL_PASSED'" @click="updateStatus('THESIS_GUIDANCE')" class="text-xs px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">Mulai Bimbingan Tesis</button>
        </div>
      </div>

      <!-- Pembimbing -->
      <div class="rounded-2xl bg-white border border-slate-100 shadow-sm p-6">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-base font-bold text-slate-800">Pembimbing</h2>
          <button @click="showSupervisorForm = true" class="inline-flex items-center gap-1 text-xs font-medium text-violet-600 hover:bg-violet-50 px-3 py-1.5 rounded-lg">
            <UserPlus class="h-3.5 w-3.5" /> Assign
          </button>
        </div>
        <div v-if="data.supervisors?.length" class="space-y-2">
          <div v-for="s in data.supervisors" :key="s.id" class="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
            <div>
              <p class="text-sm font-medium text-slate-800">{{ s.fullName }}</p>
              <p class="text-xs text-slate-500">{{ s.role }} {{ s.skNumber ? `· SK: ${s.skNumber}` : '' }}</p>
            </div>
            <button @click="removeSupervisor(s.id)" class="p-1 text-rose-500 hover:bg-rose-50 rounded"><Trash2 class="h-3.5 w-3.5" /></button>
          </div>
        </div>
        <p v-else class="text-sm text-slate-400 italic">Belum ada pembimbing</p>

        <!-- Form -->
        <div v-if="showSupervisorForm" class="mt-4 p-4 border border-violet-200 rounded-xl bg-violet-50/50 space-y-3">
          <select v-model="supervisorForm.lecturerId" class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
            <option value="">— Pilih Dosen —</option>
            <option v-for="l in lecturers" :key="l.id" :value="l.id">{{ l.fullName || l.name }}</option>
          </select>
          <select v-model="supervisorForm.role" class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
            <option value="PEMBIMBING_1">Pembimbing 1</option>
            <option value="PEMBIMBING_2">Pembimbing 2</option>
          </select>
          <input v-model="supervisorForm.skNumber" placeholder="Nomor SK (opsional)" class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          <div class="flex gap-2">
            <button @click="assignSupervisor" :disabled="saving" class="px-4 py-2 text-xs font-semibold bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50">Simpan</button>
            <button @click="showSupervisorForm = false" class="px-3 py-2 text-xs text-slate-500 hover:bg-slate-100 rounded-lg">Batal</button>
          </div>
        </div>
      </div>

      <!-- Sidang & Penguji -->
      <div class="rounded-2xl bg-white border border-slate-100 shadow-sm p-6">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-base font-bold text-slate-800">Sidang & Penguji</h2>
          <button @click="showExamForm = true" class="inline-flex items-center gap-1 text-xs font-medium text-violet-600 hover:bg-violet-50 px-3 py-1.5 rounded-lg">
            <Calendar class="h-3.5 w-3.5" /> Jadwalkan Sidang
          </button>
        </div>

        <div v-if="data.exams?.length" class="space-y-4">
          <div v-for="exam in data.exams" :key="exam.id" class="p-4 border border-slate-200 rounded-xl">
            <div class="flex items-center justify-between mb-2">
              <div>
                <span class="text-xs font-bold text-violet-700 bg-violet-100 px-2 py-0.5 rounded-full">{{ exam.type }}</span>
                <span class="text-sm text-slate-700 ml-2">{{ exam.date }} · {{ exam.startTime?.slice(0,5) }}-{{ exam.endTime?.slice(0,5) }} · {{ exam.room }}</span>
              </div>
              <div class="flex gap-1">
                <button v-if="exam.status === 'SCHEDULED'" @click="updateExamResult(exam.id, 'PASSED')" class="p-1 text-emerald-600 hover:bg-emerald-50 rounded" title="Lulus"><CheckCircle2 class="h-4 w-4" /></button>
                <button v-if="exam.status === 'SCHEDULED'" @click="updateExamResult(exam.id, 'REVISION')" class="p-1 text-amber-600 hover:bg-amber-50 rounded" title="Revisi"><XCircle class="h-4 w-4" /></button>
              </div>
            </div>
            <!-- Examiners -->
            <div class="ml-4 space-y-1">
              <div v-for="ex in exam.examiners" :key="ex.id" class="flex items-center justify-between text-xs text-slate-600">
                <span><span class="text-slate-400">{{ ex.role }}:</span> {{ ex.fullName }}</span>
                <button @click="removeExaminer(ex.id)" class="text-rose-400 hover:text-rose-600"><Trash2 class="h-3 w-3" /></button>
              </div>
              <button @click="openExaminerForm(exam.id)" class="text-xs text-violet-600 hover:underline mt-1">+ Tambah Penguji</button>
            </div>
          </div>
        </div>
        <p v-else class="text-sm text-slate-400 italic">Belum ada jadwal sidang</p>

        <!-- Exam Form -->
        <div v-if="showExamForm" class="mt-4 p-4 border border-violet-200 rounded-xl bg-violet-50/50 grid grid-cols-2 gap-3">
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
            <button @click="scheduleExam" :disabled="saving" class="px-4 py-2 text-xs font-semibold bg-violet-600 text-white rounded-lg disabled:opacity-50">Simpan</button>
            <button @click="showExamForm = false" class="px-3 py-2 text-xs text-slate-500 hover:bg-slate-100 rounded-lg">Batal</button>
          </div>
        </div>

        <!-- Examiner Form -->
        <div v-if="showExaminerForm" class="mt-4 p-4 border border-violet-200 rounded-xl bg-violet-50/50 space-y-3">
          <select v-model="examinerForm.lecturerId" class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
            <option value="">— Pilih Dosen Penguji —</option>
            <option v-for="l in lecturers" :key="l.id" :value="l.id">{{ l.fullName || l.name }}</option>
          </select>
          <select v-model="examinerForm.role" class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
            <option value="KETUA">Ketua Penguji</option>
            <option value="PENGUJI_1">Penguji 1</option>
            <option value="PENGUJI_2">Penguji 2</option>
            <option value="SEKRETARIS">Sekretaris</option>
          </select>
          <div class="flex gap-2">
            <button @click="assignExaminer" :disabled="saving" class="px-4 py-2 text-xs font-semibold bg-violet-600 text-white rounded-lg disabled:opacity-50">Simpan</button>
            <button @click="showExaminerForm = false" class="px-3 py-2 text-xs text-slate-500 hover:bg-slate-100 rounded-lg">Batal</button>
          </div>
        </div>
      </div>

      <!-- Log Bimbingan -->
      <div class="rounded-2xl bg-white border border-slate-100 shadow-sm p-6">
        <h2 class="text-base font-bold text-slate-800 mb-4">Log Bimbingan ({{ data.guidanceCount }}x)</h2>
        <div v-if="data.guidanceLogs?.length" class="space-y-2">
          <div v-for="log in data.guidanceLogs" :key="log.id" class="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
            <div class="h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center text-xs font-bold text-emerald-700 shrink-0">{{ log.chapter || '#' }}</div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-slate-800">{{ log.topic }}</p>
              <p v-if="log.notes" class="text-xs text-slate-500 mt-0.5">{{ log.notes }}</p>
              <p class="text-[11px] text-slate-400 mt-1">{{ log.date }} · {{ log.lecturerName }}</p>
            </div>
          </div>
        </div>
        <p v-else class="text-sm text-slate-400 italic">Belum ada log bimbingan</p>
      </div>
    </div>
  </div>
</template>

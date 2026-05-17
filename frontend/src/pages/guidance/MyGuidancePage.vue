<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import api from '@/lib/api'
import SearchableSelect from '@/components/ui/SearchableSelect.vue'
import { Send, Plus, Loader2, BookOpen } from 'lucide-vue-next'

const router = useRouter()
const loading = ref(true)
const requests = ref<any[]>([])
const logbooks = ref<any[]>([])
const theses = ref<any[]>([])
const lecturers = ref<any[]>([])
const activeDialog = ref<'none' | 'request' | 'logbook'>('none')
const logbookStep = ref<1 | 2>(1)
const submitting = ref(false)
const submittingLogbook = ref(false)
const uploadingAttachment = ref(false)
const logbookSearch = ref('')

const hasAssignedSupervisors = computed(() => lecturers.value.length > 0)
const selectedThesis = computed(() => theses.value[0] || null)
const advisors = computed(() => {
  const items = [...(lecturers.value || [])]
  return items.sort((a: any, b: any) => (a.role || '').localeCompare(b.role || ''))
})
const filteredLogbooks = computed(() => {
  const query = logbookSearch.value.trim().toLowerCase()
  if (!query) return logbooks.value
  return logbooks.value.filter((l: any) =>
    `${l.topic || ''} ${l.chapter || ''} ${l.studentProgress || ''} ${l.nextAction || ''}`.toLowerCase().includes(query),
  )
})
const approvedCount = computed(() => logbooks.value.filter((l: any) => l.status === 'APPROVED').length)
const pendingCount = computed(() => logbooks.value.filter((l: any) => l.status === 'PENDING').length)
const nearestSchedule = computed(() => {
  const all = [...requests.value]
    .filter((r: any) => r.date)
    .sort((a: any, b: any) => new Date(`${a.date}T${a.startTime || '00:00'}`).getTime() - new Date(`${b.date}T${b.startTime || '00:00'}`).getTime())
  return all[0] || null
})
const logbookStatusConfig: Record<string, { label: string; class: string }> = {
  PENDING: { label: 'Pending', class: 'bg-amber-100 text-amber-700' },
  APPROVED: { label: 'Approved', class: 'bg-emerald-100 text-emerald-700' },
  REJECTED: { label: 'Revision Needed', class: 'bg-rose-100 text-rose-700' },
}

const logbookForm = ref({
  thesisId: '' as string | number,
  lecturerId: '' as string | number,
  date: '',
  startTime: '09:00',
  endTime: '10:00',
  meetingType: 'LURING',
  chapter: '',
  topic: '',
  studentProgress: '',
  nextAction: '',
  notes: '',
  attachmentUrl: '',
  attachmentName: '',
  researchLink: '',
})

const form = ref({
  lecturerId: '' as string | number,
  date: '',
  startTime: '09:00',
  endTime: '10:00',
  topic: '',
  studentNotes: '',
  type: 'TESIS',
})

onMounted(async () => {
  await loadData()
})

async function loadData() {
  loading.value = true
  try {
    const [reqRes, lecRes] = await Promise.all([
      api.get('/guidance/my-requests'),
      api.get('/guidance/available-lecturers'),
    ])
    requests.value = reqRes.data || []
    lecturers.value = lecRes.data || []
    const [logbookRes, thesisRes] = await Promise.all([
      api.get('/guidance/my-logbook'),
      api.get('/guidance/my-thesis'),
    ])
    logbooks.value = logbookRes.data || []
    theses.value = thesisRes.data || []
  } finally {
    loading.value = false
  }
}

async function submitRequest() {
  if (!hasAssignedSupervisors.value) {
    alert('Pembimbing belum ditetapkan. Hubungi prodi untuk assign pembimbing terlebih dahulu.')
    return
  }
  if (!form.value.lecturerId || !form.value.date) {
    alert('Pilih dosen dan tanggal terlebih dahulu')
    return
  }
  submitting.value = true
  try {
    await api.post('/guidance/request', {
      ...form.value,
      lecturerId: Number(form.value.lecturerId),
    })
    await loadData()
    activeDialog.value = 'none'
    form.value = { lecturerId: '', date: '', startTime: '09:00', endTime: '10:00', topic: '', studentNotes: '', type: 'TESIS' }
  } catch (e: any) {
    alert(e.response?.data?.message || 'Gagal mengirim request')
  } finally {
    submitting.value = false
  }
}

async function submitLogbook() {
  if (!logbookForm.value.thesisId || !logbookForm.value.lecturerId || !logbookForm.value.date || !logbookForm.value.topic) {
    alert('Lengkapi tesis, dosen pembimbing, tanggal, dan topik bimbingan')
    return
  }
  submittingLogbook.value = true
  try {
    const combinedNotes = [
      logbookForm.value.notes || '',
      logbookForm.value.researchLink ? `<p><strong>Link Riset:</strong> <a href="${logbookForm.value.researchLink}" target="_blank">${logbookForm.value.researchLink}</a></p>` : '',
    ].filter(Boolean).join('')

    await api.post('/guidance/my-logbook', {
      ...logbookForm.value,
      thesisId: Number(logbookForm.value.thesisId),
      lecturerId: Number(logbookForm.value.lecturerId),
      notes: combinedNotes,
      attachmentUrl: logbookForm.value.attachmentUrl || undefined,
    })
    await loadData()
    activeDialog.value = 'none'
    logbookForm.value = {
      thesisId: '',
      lecturerId: '',
      date: '',
      startTime: '09:00',
      endTime: '10:00',
      chapter: '',
      topic: '',
      studentProgress: '',
      nextAction: '',
      notes: '',
      meetingType: 'LURING',
      attachmentUrl: '',
      attachmentName: '',
      researchLink: '',
    }
  } catch (e: any) {
    alert(e.response?.data?.message || 'Gagal menyimpan logbook')
  } finally {
    submittingLogbook.value = false
  }
}

async function uploadLogbookAttachment(e: Event) {
  const input = e.target as HTMLInputElement
  if (!input.files || !input.files[0]) return
  const file = input.files[0]
  uploadingAttachment.value = true
  try {
    const formData = new FormData()
    formData.append('file', file)
    const { data } = await api.post('/guidance/my-thesis/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    logbookForm.value.attachmentUrl = data.url
    logbookForm.value.attachmentName = file.name
  } catch (err: any) {
    alert(err.response?.data?.message || 'Gagal upload lampiran')
  } finally {
    uploadingAttachment.value = false
  }
}

function applyEditorCommand(command: string) {
  document.execCommand(command, false)
}

function onNotesInput(e: Event) {
  const el = e.target as HTMLDivElement
  logbookForm.value.notes = el.innerHTML
}

function openLogbookFlow() {
  activeDialog.value = 'logbook'
  logbookStep.value = 1
}

function goToLogbookStep2() {
  if (!logbookForm.value.thesisId || !logbookForm.value.lecturerId) {
    alert('Pilih tesis dan pembimbing terlebih dahulu')
    return
  }
  logbookStep.value = 2
}

function openRequestForm() {
  activeDialog.value = 'request'
}

function closeDialog() {
  activeDialog.value = 'none'
}

function formatDay(date: string) {
  return new Date(date).toLocaleDateString('id-ID', { day: '2-digit' })
}

function formatMonthYear(date: string) {
  return new Date(date).toLocaleDateString('id-ID', { month: 'short', year: 'numeric' }).toUpperCase()
}

function advisorRoleLabel(role?: string) {
  if (role === 'PEMBIMBING_1') return 'Pembimbing 1'
  if (role === 'PEMBIMBING_2') return 'Pembimbing 2'
  return 'Pembimbing'
}
</script>

<template>
  <div>
    <div class="mb-6 flex items-center justify-between gap-3">
      <div>
        <h1 class="text-3xl font-bold text-blue-700">Logbook Bimbingan Tesis</h1>
        <p class="text-base text-slate-600 mt-1">Pantau riwayat konsultasi dan feedback pembimbing Anda.</p>
      </div>
      <div class="flex items-center gap-3">
        <button class="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
          Unduh Logbook (PDF)
        </button>
        <button @click="openLogbookFlow" :disabled="!hasAssignedSupervisors" class="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50">
          <Plus class="h-4 w-4" /> Tambah Catatan Baru
        </button>
        <button @click="openRequestForm" :disabled="!hasAssignedSupervisors" class="inline-flex items-center gap-2 rounded-xl border border-emerald-200 px-4 py-2.5 text-sm font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50">
          Request
        </button>
      </div>
    </div>

    <div v-if="activeDialog === 'logbook'" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div class="w-full max-w-4xl rounded-2xl bg-white border border-blue-200 ring-2 ring-blue-100 shadow-xl p-6 max-h-[90vh] overflow-auto">
        <div class="flex items-center justify-between mb-4">
          <h4 class="text-base font-bold text-slate-800">Isi Logbook Bimbingan</h4>
          <button @click="closeDialog" class="px-2 py-1 text-slate-500 hover:bg-slate-100 rounded">Tutup</button>
        </div>
        <div class="mb-4 flex items-center gap-2 text-xs font-semibold">
          <span :class="logbookStep === 1 ? 'text-blue-700' : 'text-slate-400'">1. Pilih Pembimbing</span>
          <span class="text-slate-300">/</span>
          <span :class="logbookStep === 2 ? 'text-blue-700' : 'text-slate-400'">2. Isi Logbook</span>
        </div>

        <div v-if="logbookStep === 1" class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1">Tesis</label>
            <select v-model="logbookForm.thesisId" class="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm">
              <option value="">- Pilih Tesis -</option>
              <option v-for="t in theses" :key="t.id" :value="t.id">{{ t.title }}</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1">Bimbingan Ke</label>
            <SearchableSelect v-model="logbookForm.lecturerId" :options="lecturers.map((l) => ({ value: l.id, label: l.fullName || l.name }))" placeholder="Pilih dosen pembimbing..." />
          </div>
        </div>

        <div v-else class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1">Tanggal</label>
            <input v-model="logbookForm.date" type="date" class="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm" />
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1">Jenis Pertemuan</label>
            <select v-model="logbookForm.meetingType" class="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm">
              <option value="LURING">Tatap Muka (Luring)</option>
              <option value="DARING">Online (Daring)</option>
              <option value="HYBRID">Hybrid</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1">BAB / Bagian</label>
            <input v-model="logbookForm.chapter" type="text" placeholder="Contoh: BAB 3" class="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm" />
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1">Jam Mulai</label>
            <input v-model="logbookForm.startTime" type="time" class="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm" />
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1">Jam Selesai</label>
            <input v-model="logbookForm.endTime" type="time" class="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm" />
          </div>
          <div class="sm:col-span-2">
            <label class="block text-sm font-medium text-slate-700 mb-1">Topik Bimbingan</label>
            <input v-model="logbookForm.topic" type="text" class="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm" />
          </div>
          <div class="sm:col-span-2">
            <label class="block text-sm font-medium text-slate-700 mb-1">Deskripsi Progres & Catatan</label>
            <div class="rounded-lg border border-slate-200 overflow-hidden">
              <div class="flex items-center gap-1 border-b border-slate-200 bg-slate-50 px-2 py-1.5">
                <button type="button" @click="applyEditorCommand('bold')" class="px-2 py-1 text-xs font-bold rounded hover:bg-slate-200">B</button>
                <button type="button" @click="applyEditorCommand('italic')" class="px-2 py-1 text-xs italic rounded hover:bg-slate-200">I</button>
                <button type="button" @click="applyEditorCommand('insertUnorderedList')" class="px-2 py-1 text-xs rounded hover:bg-slate-200">List</button>
              </div>
              <div class="min-h-[120px] w-full px-3 py-2.5 text-sm focus:outline-none" contenteditable="true" @input="onNotesInput"></div>
            </div>
          </div>
          <div class="sm:col-span-2">
            <label class="block text-sm font-medium text-slate-700 mb-1">Rencana Tindak Lanjut</label>
            <textarea v-model="logbookForm.nextAction" rows="2" class="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm resize-none"></textarea>
          </div>
          <div class="sm:col-span-2">
            <label class="block text-sm font-medium text-slate-700 mb-1">Lampiran Dokumen</label>
            <div class="rounded-lg border border-dashed border-slate-300 p-4">
              <input type="file" @change="uploadLogbookAttachment" class="text-sm" />
              <p class="text-xs text-slate-500 mt-1">PDF, DOCX, PPTX (maks menyesuaikan setting upload).</p>
              <p v-if="uploadingAttachment" class="text-xs text-blue-600 mt-1">Mengunggah lampiran...</p>
              <p v-if="logbookForm.attachmentName" class="text-xs text-emerald-600 mt-1">Tersimpan: {{ logbookForm.attachmentName }}</p>
            </div>
          </div>
          <div class="sm:col-span-2">
            <label class="block text-sm font-medium text-slate-700 mb-1">Link Riset (Opsional)</label>
            <input v-model="logbookForm.researchLink" type="url" placeholder="https://github.com/username/project" class="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm" />
          </div>
        </div>

        <div class="flex justify-end gap-3 mt-5">
          <button @click="closeDialog" class="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg">Batal</button>
          <button v-if="logbookStep === 1" @click="goToLogbookStep2" class="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700">
            Lanjut Isi Logbook
          </button>
          <button v-else @click="submitLogbook" :disabled="submittingLogbook" class="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 shadow-sm">
            <Loader2 v-if="submittingLogbook" class="h-4 w-4 animate-spin" />
            Kirim ke Pembimbing
          </button>
        </div>
      </div>
    </div>

    <div v-if="activeDialog === 'request'" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div class="w-full max-w-3xl rounded-2xl bg-white border border-emerald-200 ring-2 ring-emerald-100 shadow-xl p-6 max-h-[90vh] overflow-auto">
        <div class="flex items-center justify-between mb-4">
          <h4 class="text-base font-bold text-slate-800">Request Bimbingan Baru</h4>
          <button @click="closeDialog" class="px-2 py-1 text-slate-500 hover:bg-slate-100 rounded">Tutup</button>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div class="sm:col-span-2">
            <label class="block text-sm font-medium text-slate-700 mb-1">Dosen Pembimbing</label>
            <SearchableSelect v-model="form.lecturerId" :options="lecturers.map((l) => ({ value: l.id, label: l.fullName || l.name }))" placeholder="Cari dosen pembimbing..." />
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1">Tanggal</label>
            <input v-model="form.date" type="date" class="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm" />
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1">Jenis</label>
            <select v-model="form.type" class="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm">
              <option value="TESIS">Bimbingan Tesis</option>
              <option value="DISERTASI">Bimbingan Disertasi</option>
              <option value="PROPOSAL">Bimbingan Proposal</option>
              <option value="UMUM">Konsultasi Umum</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1">Jam Mulai</label>
            <input v-model="form.startTime" type="time" class="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm" />
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1">Jam Selesai</label>
            <input v-model="form.endTime" type="time" class="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm" />
          </div>
          <div class="sm:col-span-2">
            <label class="block text-sm font-medium text-slate-700 mb-1">Topik Bimbingan</label>
            <input v-model="form.topic" type="text" class="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm" />
          </div>
        </div>
        <div class="flex justify-end gap-3 mt-5">
          <button @click="closeDialog" class="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg">Batal</button>
          <button @click="submitRequest" :disabled="submitting" class="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 shadow-sm">
            <Loader2 v-if="submitting" class="h-4 w-4 animate-spin" />
            <Send v-else class="h-4 w-4" />
            Kirim Request
          </button>
        </div>
      </div>
    </div>

    <div v-if="!hasAssignedSupervisors" class="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
      Pembimbing Anda belum ditetapkan. Request bimbingan aktif setelah prodi assign pembimbing.
    </div>

    <div v-if="loading" class="text-center py-12">
      <Loader2 class="h-8 w-8 mx-auto animate-spin text-slate-300" />
    </div>

    <div v-else class="grid grid-cols-1 xl:grid-cols-3 gap-6">
      <div class="xl:col-span-2 space-y-5">
        <div class="rounded-2xl border border-slate-200 bg-white p-5">
          <p class="text-xs font-semibold uppercase tracking-wide text-blue-700">Judul Tesis</p>
          <p class="mt-2 text-2xl font-bold leading-tight text-slate-900">{{ selectedThesis?.title || '-' }}</p>
          <div class="mt-3 flex flex-wrap items-center gap-4 text-sm text-slate-600">
            <p>
              Pembimbing:
              <span class="font-semibold text-slate-800">
                {{
                  advisors.length
                    ? advisors.map((a: any) => a.fullName || a.name).join(', ')
                    : '-'
                }}
              </span>
            </p>
            <p>Mulai: {{ selectedThesis?.createdAt ? new Date(selectedThesis.createdAt).toLocaleDateString('id-ID') : '-' }}</p>
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div class="rounded-2xl border border-slate-200 bg-white p-4 text-center">
            <p class="text-sm text-slate-500">Total Bimbingan</p>
            <p class="mt-1 text-3xl font-bold text-blue-700">{{ logbooks.length }}</p>
          </div>
          <div class="rounded-2xl border border-slate-200 bg-white p-4 text-center">
            <p class="text-sm text-slate-500">Sesi Selesai</p>
            <p class="mt-1 text-3xl font-bold text-slate-900">{{ approvedCount }}</p>
          </div>
          <div class="rounded-2xl border border-slate-200 bg-white p-4 text-center">
            <p class="text-sm text-slate-500">Menunggu Feedback</p>
            <p class="mt-1 text-3xl font-bold text-amber-600">{{ pendingCount }}</p>
          </div>
        </div>

        <div class="rounded-2xl border border-slate-200 bg-white overflow-hidden">
          <div class="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <h3 class="text-base font-bold text-slate-900">Daftar Logbook</h3>
            <input v-model="logbookSearch" type="text" placeholder="Cari aktivitas..." class="w-full max-w-xs rounded-xl border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <div v-if="filteredLogbooks.length">
            <div v-for="l in filteredLogbooks" :key="`log-${l.id}`" class="grid grid-cols-[88px_1fr] gap-4 border-b border-slate-200 px-5 py-5 last:border-b-0">
              <div class="text-center">
                <p class="text-3xl font-bold leading-none text-slate-900">{{ formatDay(l.date) }}</p>
                <p class="text-xs font-semibold text-slate-500 mt-1">{{ formatMonthYear(l.date) }}</p>
              </div>
              <div>
                <div class="flex flex-wrap items-start justify-between gap-2">
                  <p class="text-xl font-bold leading-tight text-slate-900">{{ l.topic }}</p>
                  <span :class="['inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold', logbookStatusConfig[l.status]?.class || 'bg-slate-100 text-slate-500']">
                    {{ logbookStatusConfig[l.status]?.label || l.status }}
                  </span>
                </div>
                <p class="text-sm text-slate-500 mt-1">{{ l.thesisTitle }} · {{ l.lecturerName }}</p>
                <p class="text-sm text-slate-700 mt-2">{{ l.studentProgress || '-' }}</p>
                <a v-if="l.attachmentUrl" :href="l.attachmentUrl" target="_blank" class="inline-block mt-2 rounded-md border border-slate-300 px-2.5 py-1 text-xs text-slate-700 hover:bg-slate-50">Lampiran</a>
                <div v-if="l.notes" class="mt-3 rounded-lg border-l-4 border-blue-600 bg-blue-50 p-3 text-sm text-slate-700">
                  <p class="font-semibold text-blue-700 mb-1">Feedback Pembimbing:</p>
                  <div class="prose prose-sm max-w-none" v-html="l.notes"></div>
                </div>
              </div>
            </div>
          </div>
          <div v-else class="px-5 py-8 text-sm text-slate-500">Belum ada logbook bimbingan.</div>
        </div>
      </div>

      <div class="space-y-5">
        <div class="rounded-2xl bg-blue-600 text-white p-5">
          <p class="text-xs font-semibold uppercase tracking-widest text-blue-100">Jadwal Terdekat</p>
          <p class="mt-2 text-2xl font-bold">{{ nearestSchedule?.date ? new Date(nearestSchedule.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }) : '-' }}</p>
          <p class="mt-1 text-base">{{ nearestSchedule?.startTime?.slice(0,5) || '--:--' }} - {{ nearestSchedule?.endTime?.slice(0,5) || '--:--' }} WIB</p>
          <p class="mt-3 text-sm text-blue-100">{{ nearestSchedule?.room || 'Ruang belum ditentukan' }}</p>
        </div>

        <div class="rounded-2xl border border-slate-200 bg-white p-5">
          <h4 class="text-2xl font-bold text-slate-900">Profil Pembimbing</h4>
          <div v-if="advisors.length" class="mt-3 space-y-3">
            <div v-for="advisor in advisors" :key="advisor.id" class="rounded-xl border border-slate-200 p-3">
              <p class="text-xs font-semibold text-blue-700">{{ advisorRoleLabel(advisor.role) }}</p>
              <p class="mt-1 font-semibold text-slate-800">{{ advisor.fullName || advisor.name || '-' }}</p>
              <p class="text-sm text-slate-500">NIDN: {{ advisor.nidn || '-' }}</p>
            </div>
          </div>
          <p v-else class="mt-3 text-sm text-slate-500">Belum ada data pembimbing.</p>
          <p class="mt-3 text-sm text-slate-600">Pastikan setiap sesi bimbingan dicatat dan divalidasi pembimbing.</p>
        </div>

        <div class="rounded-2xl border border-dashed border-slate-300 bg-white p-5">
          <p class="text-base font-bold text-blue-700">Catatan Penting</p>
          <ul class="mt-3 list-disc pl-5 text-sm text-slate-700 space-y-2">
            <li>Minimal 16 sesi bimbingan sebelum sidang akhir.</li>
            <li>Setiap logbook wajib mencantumkan progres dan tindak lanjut.</li>
            <li>Lampiran draft revisi disarankan pada setiap pertemuan.</li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>

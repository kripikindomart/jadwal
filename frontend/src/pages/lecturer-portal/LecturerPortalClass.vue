<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '@/lib/api'
import {
  ArrowLeft, BookOpen, Users, Award, FileText,
  Calendar, Save, Loader2, Plus, Copy, ChevronRight,
  GraduationCap, Clock, CheckCircle2, Lock,
} from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()
const token = computed(() => route.params.token as string)
const classCourseId = computed(() => Number(route.params.classCourseId))

const loading = ref(true)
const activeTab = ref<'jadwal' | 'jurnal' | 'absensi' | 'nilai' | 'tugas'>('jurnal')

const classDetail = ref<any>(null)
const meetings = ref<any[]>([])
const attendance = ref<any[]>([])
const grades = ref<any>(null)
const assignments = ref<any[]>([])

const selectedMeeting = ref<number | null>(null)
const saving = ref(false)
const journalForm = ref({ topic: '', notes: '', mode: 'OFFLINE', materialFile: '' })
const editingMeetingId = ref<number | null>(null)
const newAssignment = ref({ title: '', description: '', deadline: '' })
const showNewAssignment = ref(false)

onMounted(async () => {
  try {
    const [detailRes, meetingsRes] = await Promise.all([
      api.get(`/portal/dosen/${token.value}/kelas/${classCourseId.value}`),
      api.get(`/portal/dosen/${token.value}/kelas/${classCourseId.value}/meetings`),
    ])
    classDetail.value = detailRes.data
    meetings.value = meetingsRes.data
  } catch (e: any) {
    alert(e.response?.data?.message || 'Gagal memuat data')
    router.back()
  } finally {
    loading.value = false
  }
})

function startEditJournal(meeting: any) {
  editingMeetingId.value = meeting.id
  journalForm.value = { topic: meeting.topic || '', notes: meeting.notes || '', mode: meeting.mode || 'OFFLINE', materialFile: meeting.materialFile || '' }
}

async function saveJournal() {
  if (!editingMeetingId.value) return
  saving.value = true
  try {
    await api.patch(`/portal/dosen/${token.value}/meetings/${editingMeetingId.value}`, journalForm.value)
    const res = await api.get(`/portal/dosen/${token.value}/kelas/${classCourseId.value}/meetings`)
    meetings.value = res.data
    editingMeetingId.value = null
  } catch (e: any) { alert(e.response?.data?.message || 'Gagal menyimpan') }
  finally { saving.value = false }
}

async function generateMeetings() {
  try {
    await api.post(`/portal/dosen/${token.value}/kelas/${classCourseId.value}/meetings/generate`)
    const res = await api.get(`/portal/dosen/${token.value}/kelas/${classCourseId.value}/meetings`)
    meetings.value = res.data
  } catch (e: any) { alert(e.response?.data?.message || 'Gagal generate') }
}

async function loadAttendance(meetingId: number) {
  selectedMeeting.value = meetingId
  const res = await api.get(`/portal/dosen/${token.value}/meetings/${meetingId}/attendance`)
  attendance.value = res.data
}

async function saveAttendance() {
  if (!selectedMeeting.value) return
  saving.value = true
  try {
    await api.post(`/portal/dosen/${token.value}/meetings/${selectedMeeting.value}/attendance`, {
      data: attendance.value.map((a: any) => ({ studentId: a.studentId, status: a.status })),
    })
    alert('Absensi berhasil disimpan')
  } catch (e: any) { alert(e.response?.data?.message || 'Gagal menyimpan') }
  finally { saving.value = false }
}

function setAllPresent() { attendance.value.forEach((a: any) => (a.status = 'H')) }

async function loadGrades() {
  const res = await api.get(`/portal/dosen/${token.value}/kelas/${classCourseId.value}/grades`)
  grades.value = res.data
}

async function saveGrades() {
  if (!grades.value) return
  saving.value = true
  const payload: any[] = []
  for (const student of grades.value.students) {
    for (const score of student.scores) {
      if (score.score !== null && score.score !== undefined && score.score !== '') {
        payload.push({ studentId: student.studentId, gradeComponentId: score.componentId, score: Number(score.score) })
      }
    }
  }
  try {
    await api.post(`/portal/dosen/${token.value}/kelas/${classCourseId.value}/grades`, { data: payload })
    alert('Nilai berhasil disimpan')
  } catch (e: any) { alert(e.response?.data?.message || 'Gagal menyimpan') }
  finally { saving.value = false }
}

async function loadAssignments() {
  const res = await api.get(`/portal/dosen/${token.value}/kelas/${classCourseId.value}/assignments`)
  assignments.value = res.data
}

async function createAssignment() {
  if (!newAssignment.value.title) return
  saving.value = true
  try {
    await api.post(`/portal/dosen/${token.value}/kelas/${classCourseId.value}/assignments`, newAssignment.value)
    await loadAssignments()
    showNewAssignment.value = false
    newAssignment.value = { title: '', description: '', deadline: '' }
  } catch (e: any) { alert(e.response?.data?.message || 'Gagal membuat tugas') }
  finally { saving.value = false }
}

function copyLink(publicToken: string) {
  navigator.clipboard.writeText(`${window.location.origin}/tugas/${publicToken}`)
  alert('Link berhasil disalin!')
}

function onTabChange(tab: string) {
  activeTab.value = tab as any
  if (tab === 'nilai' && !grades.value) loadGrades()
  if (tab === 'tugas' && assignments.value.length === 0) loadAssignments()
}

const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']
const filledCount = computed(() => meetings.value.filter(m => m.topic).length)

const tabs = [
  { key: 'jadwal', label: 'Jadwal', icon: Calendar },
  { key: 'jurnal', label: 'Jurnal', icon: BookOpen },
  { key: 'absensi', label: 'Absensi', icon: Users },
  { key: 'nilai', label: 'Nilai', icon: Award },
  { key: 'tugas', label: 'Tugas', icon: FileText },
]
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/30">
    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center min-h-screen">
      <div class="h-10 w-10 rounded-full border-4 border-emerald-200 border-t-emerald-600 animate-spin"></div>
    </div>

    <div v-else>
      <!-- Sticky Header -->
      <header class="sticky top-0 z-10 bg-white/70 backdrop-blur-xl border-b border-slate-100/80 shadow-sm">
        <div class="max-w-5xl mx-auto px-4 sm:px-6 py-4">
          <div class="flex items-center gap-4">
            <button @click="router.push(`/dosen/${token}`)" class="h-10 w-10 rounded-xl bg-gradient-to-br from-slate-100 to-slate-50 hover:from-slate-200 hover:to-slate-100 flex items-center justify-center transition-all shadow-sm border border-slate-200/50">
              <ArrowLeft class="h-4 w-4 text-slate-600" />
            </button>
            <div class="flex-1 min-w-0">
              <h1 class="text-base font-bold text-slate-900 truncate">{{ classDetail?.classCourse?.courseName }}</h1>
              <p class="text-xs text-slate-500 mt-0.5">{{ classDetail?.classCourse?.className }} · {{ classDetail?.classCourse?.courseCode }}</p>
            </div>
            <div class="hidden sm:flex items-center gap-2 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200/50 px-3 py-1.5 rounded-full shadow-sm">
              <GraduationCap class="h-3.5 w-3.5" />
              {{ classDetail?.classCourse?.sks }} SKS
            </div>
          </div>
        </div>
      </header>

      <main class="max-w-5xl mx-auto px-4 sm:px-6 py-6">
        <!-- Progress Banner -->
        <div class="mb-6 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent border border-emerald-200/50 shadow-sm p-5 flex items-center gap-4">
          <div class="h-14 w-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shrink-0 shadow-lg shadow-emerald-200/50">
            <BookOpen class="h-7 w-7 text-white" />
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center justify-between mb-1.5">
              <span class="text-sm font-semibold text-slate-700">Progress Jurnal Perkuliahan</span>
              <span class="text-sm font-bold text-emerald-600">{{ filledCount }}/{{ meetings.length || classDetail?.classCourse?.totalMeetings || 16 }}</span>
            </div>
            <div class="h-2.5 rounded-full bg-emerald-100 overflow-hidden">
              <div class="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-all duration-700 ease-out"
                :style="{ width: `${meetings.length ? (filledCount / meetings.length) * 100 : 0}%` }"></div>
            </div>
          </div>
          <div class="hidden sm:flex items-center gap-4 text-xs text-slate-500 shrink-0 pl-4 border-l border-slate-200">
            <span class="flex items-center gap-1.5"><Users class="h-4 w-4 text-slate-400" /> {{ classDetail?.students?.length || 0 }} mahasiswa</span>
          </div>
        </div>

        <!-- Tabs -->
        <div class="mb-6 flex gap-1.5 p-1.5 bg-white/80 backdrop-blur rounded-2xl border border-slate-200/50 shadow-sm overflow-x-auto">
          <button v-for="tab in tabs" :key="tab.key" @click="onTabChange(tab.key)"
            :class="['flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold transition-all whitespace-nowrap',
              activeTab === tab.key ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md shadow-emerald-200/50' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50']">
            <component :is="tab.icon" class="h-4 w-4" />
            {{ tab.label }}
          </button>
        </div>

        <!-- TAB: Jadwal -->
        <div v-if="activeTab === 'jadwal'" class="rounded-2xl bg-white border border-slate-100 shadow-sm overflow-hidden">
          <div class="px-5 py-4 border-b border-slate-50">
            <h3 class="text-sm font-bold text-slate-800">Jadwal Perkuliahan</h3>
          </div>
          <div v-if="classDetail?.schedules?.length" class="divide-y divide-slate-50">
            <div v-for="s in classDetail.schedules" :key="s.id" class="flex items-center gap-4 px-5 py-3 hover:bg-slate-50/50">
              <div class="h-10 w-10 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
                <Calendar class="h-4 w-4 text-emerald-600" />
              </div>
              <div class="flex-1">
                <p class="text-sm font-medium text-slate-700">{{ dayNames[s.dayOfWeek] }}</p>
                <p class="text-xs text-slate-400">{{ s.startTime?.slice(0,5) }} — {{ s.endTime?.slice(0,5) }}</p>
              </div>
              <span class="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">{{ s.room }}</span>
            </div>
          </div>
          <div v-else class="p-8 text-center text-sm text-slate-400">Belum ada jadwal terdaftar</div>
        </div>

        <!-- TAB: Jurnal -->
        <div v-if="activeTab === 'jurnal'" class="space-y-3">
          <div v-if="meetings.length === 0" class="rounded-2xl bg-white border border-slate-100 shadow-sm p-8 text-center">
            <BookOpen class="h-10 w-10 mx-auto mb-3 text-slate-300" />
            <p class="text-sm text-slate-500 mb-4">Belum ada pertemuan. Generate untuk memulai.</p>
            <button @click="generateMeetings" class="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 shadow-sm">
              <Plus class="h-4 w-4" /> Generate Pertemuan
            </button>
          </div>

          <div v-for="m in meetings" :key="m.id"
            :class="['rounded-xl bg-white border shadow-sm transition-all', editingMeetingId === m.id ? 'border-emerald-200 ring-2 ring-emerald-100' : 'border-slate-100']">
            <div class="p-4">
              <div class="flex items-start gap-3">
                <!-- Number circle -->
                <div :class="['h-9 w-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0',
                  m.topic ? 'bg-emerald-100 text-emerald-700' : m.isLocked ? 'bg-slate-200 text-slate-500' : 'bg-slate-100 text-slate-400']">
                  {{ m.meetingNumber }}
                </div>
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2 mb-0.5">
                    <span :class="['text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded',
                      m.type === 'UTS' ? 'bg-amber-100 text-amber-700' : m.type === 'UAS' ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-500']">{{ m.type }}</span>
                    <span class="text-[10px] text-slate-400">{{ m.mode }}</span>
                    <Lock v-if="m.isLocked" class="h-3 w-3 text-slate-400" />
                  </div>
                  <p v-if="m.topic" class="text-sm font-medium text-slate-800">{{ m.topic }}</p>
                  <p v-else class="text-sm text-slate-400 italic">Belum diisi</p>
                  <p v-if="m.notes" class="text-xs text-slate-500 mt-0.5 line-clamp-2">{{ m.notes }}</p>
                  <a v-if="m.materialFile" :href="m.materialFile" target="_blank" class="inline-flex items-center gap-1 text-xs text-emerald-600 hover:underline mt-1">📎 Materi</a>
                </div>
                <button v-if="!m.isLocked && editingMeetingId !== m.id" @click="startEditJournal(m)"
                  class="text-xs font-medium text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 px-2.5 py-1 rounded-md transition-colors shrink-0">
                  {{ m.topic ? 'Edit' : 'Isi Jurnal' }}
                </button>
              </div>

              <!-- Inline edit form -->
              <div v-if="editingMeetingId === m.id" class="mt-4 pt-4 border-t border-slate-100 space-y-3">
                <input v-model="journalForm.topic" placeholder="Topik pertemuan (wajib)"
                  class="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400" />
                <textarea v-model="journalForm.notes" placeholder="Catatan tambahan (opsional)" rows="3"
                  class="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 resize-none"></textarea>
                <div>
                  <label class="block text-xs font-medium text-slate-600 mb-1">Upload Materi (PDF/PPT/DOC)</label>
                  <input v-model="journalForm.materialFile" type="text" placeholder="URL file materi (upload via media library)"
                    class="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400" />
                  <p class="text-[10px] text-slate-400 mt-1">Paste URL file yang sudah diupload, atau kosongkan jika tidak ada materi</p>
                </div>
                <div class="flex items-center gap-3">
                  <select v-model="journalForm.mode" class="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20">
                    <option value="OFFLINE">Offline</option>
                    <option value="ONLINE">Online</option>
                    <option value="HYBRID">Hybrid</option>
                  </select>
                  <div class="flex-1"></div>
                  <button @click="editingMeetingId = null" class="px-3 py-2 text-xs font-medium text-slate-500 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors">Batal</button>
                  <button @click="saveJournal" :disabled="saving || !journalForm.topic"
                    class="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 shadow-sm transition-colors">
                    <Loader2 v-if="saving" class="h-3.5 w-3.5 animate-spin" /><Save v-else class="h-3.5 w-3.5" /> Simpan
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- TAB: Absensi -->
        <div v-if="activeTab === 'absensi'" class="rounded-2xl bg-white border border-slate-100 shadow-sm overflow-hidden">
          <div class="px-5 py-4 border-b border-slate-50 flex items-center gap-3 flex-wrap">
            <select @change="loadAttendance(Number(($event.target as HTMLSelectElement).value))"
              class="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 min-w-[200px]">
              <option value="">— Pilih Pertemuan —</option>
              <option v-for="m in meetings" :key="m.id" :value="m.id">Pertemuan {{ m.meetingNumber }}{{ m.topic ? ` — ${m.topic}` : '' }}</option>
            </select>
            <button v-if="attendance.length" @click="setAllPresent"
              class="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition-colors">
              <CheckCircle2 class="h-3.5 w-3.5" /> Hadir Semua
            </button>
            <div class="flex-1"></div>
            <button v-if="attendance.length" @click="saveAttendance" :disabled="saving"
              class="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 shadow-sm">
              <Loader2 v-if="saving" class="h-3.5 w-3.5 animate-spin" /><Save v-else class="h-3.5 w-3.5" /> Simpan
            </button>
          </div>

          <div v-if="attendance.length" class="divide-y divide-slate-50">
            <div v-for="(a, idx) in attendance" :key="a.studentId" class="flex items-center gap-4 px-5 py-3 hover:bg-slate-50/50">
              <span class="text-xs text-slate-400 w-6 text-center">{{ idx + 1 }}</span>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-slate-700 truncate">{{ a.name }}</p>
                <p class="text-[11px] text-slate-400 font-mono">{{ a.nim }}</p>
              </div>
              <div class="flex gap-1">
                <button v-for="s in ['H','I','S','A']" :key="s" @click="a.status = s"
                  :class="['w-8 h-8 rounded-lg text-xs font-bold transition-all',
                    a.status === s
                      ? (s === 'H' ? 'bg-emerald-600 text-white shadow-sm' : s === 'A' ? 'bg-rose-600 text-white shadow-sm' : 'bg-amber-500 text-white shadow-sm')
                      : 'bg-slate-100 text-slate-500 hover:bg-slate-200']">{{ s }}</button>
              </div>
            </div>
          </div>
          <div v-else class="p-8 text-center text-sm text-slate-400">
            <Users class="h-8 w-8 mx-auto mb-2 text-slate-300" />
            Pilih pertemuan untuk mengisi absensi
          </div>
        </div>

        <!-- TAB: Nilai -->
        <div v-if="activeTab === 'nilai'" class="rounded-2xl bg-white border border-slate-100 shadow-sm overflow-hidden">
          <div class="px-5 py-4 border-b border-slate-50 flex items-center justify-between">
            <h3 class="text-sm font-bold text-slate-800">Input Nilai Mahasiswa</h3>
            <button v-if="grades" @click="saveGrades" :disabled="saving"
              class="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 shadow-sm">
              <Loader2 v-if="saving" class="h-3.5 w-3.5 animate-spin" /><Save v-else class="h-3.5 w-3.5" /> Simpan Nilai
            </button>
          </div>
          <div v-if="grades" class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead class="bg-slate-50">
                <tr>
                  <th class="text-left py-3 px-4 text-xs font-semibold text-slate-600 sticky left-0 bg-slate-50 z-10">Mahasiswa</th>
                  <th v-for="c in grades.components" :key="c.id" class="text-center py-3 px-3 text-xs font-semibold text-slate-600 min-w-[80px]">
                    <span class="block">{{ c.name }}</span>
                    <span class="text-[10px] font-normal text-slate-400">({{ c.weight }}%)</span>
                  </th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-50">
                <tr v-for="s in grades.students" :key="s.studentId" class="hover:bg-emerald-50/30">
                  <td class="py-3 px-4 sticky left-0 bg-white z-10">
                    <p class="text-sm font-medium text-slate-700">{{ s.name }}</p>
                    <p class="text-[11px] text-slate-400 font-mono">{{ s.nim }}</p>
                  </td>
                  <td v-for="score in s.scores" :key="score.componentId" class="py-3 px-3 text-center">
                    <input v-model.number="score.score" type="number" min="0" max="100" step="0.01"
                      class="w-16 rounded-lg border border-slate-200 px-2 py-1.5 text-center text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400" />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div v-else class="p-8 text-center text-sm text-slate-400">
            <Loader2 class="h-6 w-6 mx-auto mb-2 text-slate-300 animate-spin" />
            Memuat data nilai...
          </div>
        </div>

        <!-- TAB: Tugas -->
        <div v-if="activeTab === 'tugas'" class="space-y-4">
          <div class="flex items-center justify-between">
            <h3 class="text-sm font-bold text-slate-800">Daftar Tugas</h3>
            <button @click="showNewAssignment = true"
              class="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 shadow-sm">
              <Plus class="h-3.5 w-3.5" /> Buat Tugas
            </button>
          </div>

          <!-- New assignment form -->
          <div v-if="showNewAssignment" class="rounded-2xl bg-white border border-emerald-200 ring-2 ring-emerald-100 shadow-sm p-5 space-y-3">
            <h4 class="text-sm font-semibold text-slate-800">Tugas Baru</h4>
            <input v-model="newAssignment.title" placeholder="Judul tugas"
              class="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400" />
            <textarea v-model="newAssignment.description" placeholder="Deskripsi / instruksi (opsional)" rows="3"
              class="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 resize-none"></textarea>
            <div class="flex items-center gap-3">
              <div>
                <label class="text-[11px] font-medium text-slate-500 mb-1 block">Deadline</label>
                <input v-model="newAssignment.deadline" type="datetime-local"
                  class="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
              </div>
              <div class="flex-1"></div>
              <button @click="showNewAssignment = false" class="px-3 py-2 text-xs font-medium text-slate-500 hover:text-slate-700 rounded-lg hover:bg-slate-100">Batal</button>
              <button @click="createAssignment" :disabled="saving || !newAssignment.title"
                class="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 shadow-sm">
                <Save class="h-3.5 w-3.5" /> Simpan
              </button>
            </div>
          </div>

          <!-- Assignment list -->
          <div v-for="a in assignments" :key="a.id" class="rounded-xl bg-white border border-slate-100 shadow-sm p-5 hover:shadow-md transition-shadow">
            <div class="flex items-start gap-4">
              <div class="h-10 w-10 rounded-xl bg-violet-100 flex items-center justify-center shrink-0">
                <FileText class="h-5 w-5 text-violet-600" />
              </div>
              <div class="flex-1 min-w-0">
                <h4 class="text-sm font-bold text-slate-800">{{ a.title }}</h4>
                <p v-if="a.description" class="text-xs text-slate-500 mt-0.5 line-clamp-2">{{ a.description }}</p>
                <div class="flex items-center gap-3 mt-2 flex-wrap">
                  <span class="inline-flex items-center gap-1 text-xs text-slate-500">
                    <Users class="h-3 w-3" /> {{ a.submissionCount }}/{{ a.totalStudents }} mengumpulkan
                  </span>
                  <span v-if="a.deadline" class="inline-flex items-center gap-1 text-xs text-slate-500">
                    <Clock class="h-3 w-3" /> {{ new Date(a.deadline).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) }}
                  </span>
                </div>
              </div>
              <button @click="copyLink(a.publicToken)"
                class="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition-colors shrink-0">
                <Copy class="h-3.5 w-3.5" /> Salin Link
              </button>
            </div>
          </div>

          <div v-if="assignments.length === 0 && !showNewAssignment" class="rounded-2xl bg-white border border-slate-100 shadow-sm p-8 text-center">
            <FileText class="h-10 w-10 mx-auto mb-3 text-slate-300" />
            <p class="text-sm text-slate-500">Belum ada tugas. Buat tugas pertama untuk kelas ini.</p>
          </div>
        </div>
      </main>
    </div>
  </div>
</template>

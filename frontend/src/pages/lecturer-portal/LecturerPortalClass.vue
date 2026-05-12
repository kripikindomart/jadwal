<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '@/lib/api'
import {
  ArrowLeft, BookOpen, Users, Award, FileText,
  Calendar, Save, Loader2, Plus, Copy,
} from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()
const token = computed(() => route.params.token as string)
const classCourseId = computed(() => Number(route.params.classCourseId))

const loading = ref(true)
const activeTab = ref<'jadwal' | 'jurnal' | 'absensi' | 'nilai' | 'tugas'>('jurnal')

// Data
const classDetail = ref<any>(null)
const meetings = ref<any[]>([])
const attendance = ref<any[]>([])
const grades = ref<any>(null)
const assignments = ref<any[]>([])

// State
const selectedMeeting = ref<number | null>(null)
const saving = ref(false)
const journalForm = ref({ topic: '', notes: '', mode: 'OFFLINE' })
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

// ============ JURNAL ============
function startEditJournal(meeting: any) {
  editingMeetingId.value = meeting.id
  journalForm.value = {
    topic: meeting.topic || '',
    notes: meeting.notes || '',
    mode: meeting.mode || 'OFFLINE',
  }
}

async function saveJournal() {
  if (!editingMeetingId.value) return
  saving.value = true
  try {
    await api.patch(`/portal/dosen/${token.value}/meetings/${editingMeetingId.value}`, journalForm.value)
    const res = await api.get(`/portal/dosen/${token.value}/kelas/${classCourseId.value}/meetings`)
    meetings.value = res.data
    editingMeetingId.value = null
  } catch (e: any) {
    alert(e.response?.data?.message || 'Gagal menyimpan')
  } finally {
    saving.value = false
  }
}

async function generateMeetings() {
  try {
    await api.post(`/portal/dosen/${token.value}/kelas/${classCourseId.value}/meetings/generate`)
    const res = await api.get(`/portal/dosen/${token.value}/kelas/${classCourseId.value}/meetings`)
    meetings.value = res.data
  } catch (e: any) {
    alert(e.response?.data?.message || 'Gagal generate')
  }
}

// ============ ABSENSI ============
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
  } catch (e: any) {
    alert(e.response?.data?.message || 'Gagal menyimpan')
  } finally {
    saving.value = false
  }
}

function setAllPresent() {
  attendance.value.forEach((a: any) => (a.status = 'H'))
}

// ============ NILAI ============
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
        payload.push({
          studentId: student.studentId,
          gradeComponentId: score.componentId,
          score: Number(score.score),
        })
      }
    }
  }
  try {
    await api.post(`/portal/dosen/${token.value}/kelas/${classCourseId.value}/grades`, { data: payload })
    alert('Nilai berhasil disimpan')
  } catch (e: any) {
    alert(e.response?.data?.message || 'Gagal menyimpan')
  } finally {
    saving.value = false
  }
}

// ============ TUGAS ============
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
  } catch (e: any) {
    alert(e.response?.data?.message || 'Gagal membuat tugas')
  } finally {
    saving.value = false
  }
}

function copyLink(publicToken: string) {
  const url = `${window.location.origin}/tugas/${publicToken}`
  navigator.clipboard.writeText(url)
  alert('Link berhasil disalin!')
}

// Tab switch handlers
function onTabChange(tab: string) {
  activeTab.value = tab as any
  if (tab === 'nilai' && !grades.value) loadGrades()
  if (tab === 'tugas' && assignments.value.length === 0) loadAssignments()
}

const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']
</script>

<template>
  <div class="min-h-screen bg-slate-50">
    <div v-if="loading" class="flex items-center justify-center min-h-screen">
      <div class="animate-pulse text-slate-400">Memuat...</div>
    </div>

    <div v-else class="max-w-5xl mx-auto px-4 py-8">
      <!-- Back + Header -->
      <button @click="router.push(`/dosen/${token}`)" class="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-4">
        <ArrowLeft class="h-4 w-4" /> Kembali
      </button>

      <div class="mb-6">
        <h1 class="text-xl font-bold text-slate-800">{{ classDetail?.classCourse?.courseName }}</h1>
        <p class="text-sm text-slate-500">{{ classDetail?.classCourse?.className }} · {{ classDetail?.classCourse?.courseCode }} · {{ classDetail?.classCourse?.sks }} SKS</p>
      </div>

      <!-- Tabs -->
      <div class="flex gap-1 mb-6 bg-white rounded-lg p-1 border border-slate-100 shadow-sm overflow-x-auto">
        <button v-for="tab in [
          { key: 'jadwal', label: 'Jadwal', icon: Calendar },
          { key: 'jurnal', label: 'Jurnal', icon: BookOpen },
          { key: 'absensi', label: 'Absensi', icon: Users },
          { key: 'nilai', label: 'Nilai', icon: Award },
          { key: 'tugas', label: 'Tugas', icon: FileText },
        ]" :key="tab.key"
          @click="onTabChange(tab.key)"
          :class="['flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap',
            activeTab === tab.key ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:bg-slate-50']"
        >
          <component :is="tab.icon" class="h-4 w-4" />
          {{ tab.label }}
        </button>
      </div>

      <!-- TAB: Jadwal -->
      <div v-if="activeTab === 'jadwal'" class="rounded-xl bg-white p-6 border border-slate-100 shadow-sm">
        <div v-if="classDetail?.schedules?.length" class="space-y-2">
          <div v-for="s in classDetail.schedules" :key="s.id" class="flex items-center gap-4 p-3 rounded-lg bg-slate-50">
            <span class="text-sm font-medium text-slate-700 min-w-[70px]">{{ dayNames[s.dayOfWeek] }}</span>
            <span class="text-sm text-slate-600">{{ s.startTime?.slice(0,5) }} - {{ s.endTime?.slice(0,5) }}</span>
            <span class="text-sm text-slate-500">{{ s.room }}</span>
          </div>
        </div>
        <p v-else class="text-sm text-slate-400">Belum ada jadwal</p>
      </div>

      <!-- TAB: Jurnal -->
      <div v-if="activeTab === 'jurnal'" class="space-y-3">
        <button v-if="meetings.length === 0" @click="generateMeetings" class="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700">
          Generate 16 Pertemuan
        </button>

        <div v-for="m in meetings" :key="m.id" class="rounded-xl bg-white p-4 border border-slate-100 shadow-sm">
          <div class="flex items-start justify-between">
            <div>
              <span class="text-xs font-medium text-slate-400">Pertemuan {{ m.meetingNumber }}</span>
              <span class="ml-2 text-xs px-2 py-0.5 rounded-full" :class="m.type === 'UTS' ? 'bg-amber-100 text-amber-700' : m.type === 'UAS' ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-600'">{{ m.type }}</span>
              <p v-if="m.topic" class="text-sm font-medium text-slate-800 mt-1">{{ m.topic }}</p>
              <p v-if="m.notes" class="text-xs text-slate-500 mt-0.5">{{ m.notes }}</p>
              <p v-if="!m.topic" class="text-xs text-slate-400 mt-1 italic">Belum diisi</p>
            </div>
            <button v-if="!m.isLocked" @click="startEditJournal(m)" class="text-xs text-emerald-600 hover:underline">
              {{ m.topic ? 'Edit' : 'Isi Jurnal' }}
            </button>
            <span v-else class="text-xs text-slate-400">🔒 Locked</span>
          </div>

          <!-- Edit form inline -->
          <div v-if="editingMeetingId === m.id" class="mt-3 pt-3 border-t border-slate-100 space-y-3">
            <input v-model="journalForm.topic" placeholder="Topik pertemuan (wajib)" class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
            <textarea v-model="journalForm.notes" placeholder="Catatan (opsional)" rows="2" class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"></textarea>
            <div class="flex items-center gap-3">
              <select v-model="journalForm.mode" class="rounded-lg border border-slate-200 px-3 py-2 text-sm">
                <option value="OFFLINE">Offline</option>
                <option value="ONLINE">Online</option>
                <option value="HYBRID">Hybrid</option>
              </select>
              <button @click="saveJournal" :disabled="saving || !journalForm.topic" class="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
                <Loader2 v-if="saving" class="h-3 w-3 animate-spin" /><Save v-else class="h-3 w-3" /> Simpan
              </button>
              <button @click="editingMeetingId = null" class="text-xs text-slate-500 hover:underline">Batal</button>
            </div>
          </div>
        </div>
      </div>

      <!-- TAB: Absensi -->
      <div v-if="activeTab === 'absensi'" class="rounded-xl bg-white p-6 border border-slate-100 shadow-sm">
        <div class="flex items-center gap-3 mb-4">
          <select @change="loadAttendance(Number(($event.target as HTMLSelectElement).value))" class="rounded-lg border border-slate-200 px-3 py-2 text-sm">
            <option value="">Pilih Pertemuan</option>
            <option v-for="m in meetings" :key="m.id" :value="m.id">Pertemuan {{ m.meetingNumber }} {{ m.topic ? `— ${m.topic}` : '' }}</option>
          </select>
          <button v-if="attendance.length" @click="setAllPresent" class="text-xs text-emerald-600 hover:underline">Hadir Semua</button>
        </div>

        <div v-if="attendance.length" class="space-y-2">
          <div v-for="a in attendance" :key="a.studentId" class="flex items-center gap-4 p-2 rounded-lg hover:bg-slate-50">
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-slate-700 truncate">{{ a.name }}</p>
              <p class="text-xs text-slate-400">{{ a.nim }}</p>
            </div>
            <div class="flex gap-1">
              <button v-for="s in ['H','I','S','A']" :key="s" @click="a.status = s"
                :class="['px-2.5 py-1 rounded text-xs font-medium transition-colors',
                  a.status === s
                    ? (s === 'H' ? 'bg-emerald-600 text-white' : s === 'A' ? 'bg-rose-600 text-white' : 'bg-amber-500 text-white')
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200']"
              >{{ s }}</button>
            </div>
          </div>
          <button @click="saveAttendance" :disabled="saving" class="mt-4 inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
            <Loader2 v-if="saving" class="h-4 w-4 animate-spin" /><Save v-else class="h-4 w-4" /> Simpan Absensi
          </button>
        </div>
        <p v-else class="text-sm text-slate-400">Pilih pertemuan untuk mengisi absensi</p>
      </div>

      <!-- TAB: Nilai -->
      <div v-if="activeTab === 'nilai'" class="rounded-xl bg-white p-6 border border-slate-100 shadow-sm overflow-x-auto">
        <div v-if="grades">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-slate-100">
                <th class="text-left py-2 px-2 text-slate-600 font-medium">Mahasiswa</th>
                <th v-for="c in grades.components" :key="c.id" class="text-center py-2 px-2 text-slate-600 font-medium text-xs">
                  {{ c.name }}<br/><span class="text-slate-400">({{ c.weight }}%)</span>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="s in grades.students" :key="s.studentId" class="border-b border-slate-50 hover:bg-slate-50">
                <td class="py-2 px-2">
                  <p class="font-medium text-slate-700">{{ s.name }}</p>
                  <p class="text-xs text-slate-400">{{ s.nim }}</p>
                </td>
                <td v-for="score in s.scores" :key="score.componentId" class="py-2 px-2 text-center">
                  <input v-model.number="score.score" type="number" min="0" max="100" step="0.01"
                    class="w-16 rounded border border-slate-200 px-2 py-1 text-center text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
                </td>
              </tr>
            </tbody>
          </table>
          <button @click="saveGrades" :disabled="saving" class="mt-4 inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
            <Loader2 v-if="saving" class="h-4 w-4 animate-spin" /><Save v-else class="h-4 w-4" /> Simpan Nilai
          </button>
        </div>
        <p v-else class="text-sm text-slate-400">Memuat data nilai...</p>
      </div>

      <!-- TAB: Tugas -->
      <div v-if="activeTab === 'tugas'" class="space-y-4">
        <button @click="showNewAssignment = true" class="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700">
          <Plus class="h-4 w-4" /> Buat Tugas
        </button>

        <!-- New assignment form -->
        <div v-if="showNewAssignment" class="rounded-xl bg-white p-5 border border-slate-100 shadow-sm space-y-3">
          <input v-model="newAssignment.title" placeholder="Judul tugas" class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
          <textarea v-model="newAssignment.description" placeholder="Deskripsi (opsional)" rows="2" class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"></textarea>
          <input v-model="newAssignment.deadline" type="datetime-local" class="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          <div class="flex gap-2">
            <button @click="createAssignment" :disabled="saving || !newAssignment.title" class="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50">Simpan</button>
            <button @click="showNewAssignment = false" class="text-sm text-slate-500 hover:underline">Batal</button>
          </div>
        </div>

        <!-- Assignment list -->
        <div v-for="a in assignments" :key="a.id" class="rounded-xl bg-white p-4 border border-slate-100 shadow-sm">
          <div class="flex items-start justify-between">
            <div>
              <p class="text-sm font-semibold text-slate-800">{{ a.title }}</p>
              <p v-if="a.description" class="text-xs text-slate-500 mt-0.5">{{ a.description }}</p>
              <p class="text-xs text-slate-400 mt-1">
                {{ a.submissionCount }}/{{ a.totalStudents }} mahasiswa sudah mengumpulkan
                <span v-if="a.deadline"> · Deadline: {{ new Date(a.deadline).toLocaleDateString('id-ID') }}</span>
              </p>
            </div>
            <button @click="copyLink(a.publicToken)" class="inline-flex items-center gap-1 text-xs text-emerald-600 hover:underline">
              <Copy class="h-3 w-3" /> Salin Link
            </button>
          </div>
        </div>

        <p v-if="assignments.length === 0 && !showNewAssignment" class="text-sm text-slate-400">Belum ada tugas</p>
      </div>
    </div>
  </div>
</template>

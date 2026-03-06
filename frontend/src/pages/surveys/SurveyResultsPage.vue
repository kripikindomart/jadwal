<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useToast } from '@/composables/useToast'
import api from '@/lib/api'
import { ArrowLeft, BarChart3, Users, Star, Table, Share2, ClipboardCheck, Trash2, ChevronDown, CheckCircle, XCircle, Eye, X } from 'lucide-vue-next'
import { useConfirm } from '@/composables/useConfirm'

const route = useRoute()
const router = useRouter()
const toast = useToast()

const confirm = useConfirm()

const instrumentId = route.params.id as string
const loading = ref(false)
const results = ref<any>(null)
const respondents = ref<any>(null)
const respondentsLoading = ref(false)
const expandedClasses = ref<Record<number, boolean>>({})
const activeTab = ref<'statistik' | 'spreadsheet' | 'responden'>('statistik')

const prodis = ref<any[]>([])
const filterProdiId = ref<number | ''>('')
const selectedStudent = ref<any>(null)
const isDetailModalOpen = ref(false)

const openStudentDetail = (student: any) => {
  selectedStudent.value = student
  isDetailModalOpen.value = true
}

const closeStudentDetail = () => {
  isDetailModalOpen.value = false
  selectedStudent.value = null
}

const fetchProdis = async () => {
  try {
    const { data } = await api.get('/prodis?perPage=100')
    prodis.value = data.data || data
  } catch (e) {
    console.error('Failed to load prodis', e)
  }
}

const fetchResults = async () => {
  loading.value = true
  try {
    const params: any = {}
    if (filterProdiId.value) params.prodiId = filterProdiId.value
    const res = await api.get(`/surveys/${instrumentId}/results`, { params })
    results.value = res.data
  } catch (e: any) {
    toast.error('Gagal memuat hasil survei')
  } finally {
    loading.value = false
  }
}

const getScoreColor = (score: number) => {
  if (score >= 4) return 'text-green-600 bg-green-50'
  if (score >= 3) return 'text-yellow-600 bg-yellow-50'
  return 'text-red-600 bg-red-50'
}

const getBarWidth = (count: number, total: number) => {
  return total > 0 ? Math.round((count / total) * 100) : 0
}

const handlePublish = () => {
  if (!results.value?.instrument?.publicUrlHash) {
    toast.error('Gagal mendapatkan link publik')
    return
  }
  const publicUrl = `${window.location.origin}/survey/s/${results.value.instrument.publicUrlHash}/results`
  navigator.clipboard.writeText(publicUrl)
  toast.success('Link hasil survei publik disalin ke clipboard')
}

const fetchRespondents = async () => {
  respondentsLoading.value = true
  try {
    const params: any = {}
    if (filterProdiId.value) params.prodiId = filterProdiId.value
    const res = await api.get(`/surveys/${instrumentId}/respondents`, { params })
    respondents.value = res.data
    // Auto-expand all classes
    respondents.value?.classes?.forEach((c: any) => {
      expandedClasses.value[c.classId] = true
    })
  } catch (e: any) {
    toast.error('Gagal memuat data responden')
  } finally {
    respondentsLoading.value = false
  }
}

const toggleClassExpand = (classId: number) => {
  expandedClasses.value[classId] = !expandedClasses.value[classId]
}

const handleDeleteResponse = (responseId: number) => {
  confirm.requireConfirm({
    title: 'Reset Response',
    message: 'Hapus response ini? Mahasiswa akan bisa mengisi ulang survei untuk dosen/MK ini.',
    confirmText: 'Ya, Hapus',
    cancelText: 'Batal',
    onConfirm: async () => {
      try {
        await api.delete(`/surveys/${instrumentId}/responses/${responseId}`)
        toast.success('Response berhasil direset')
        await fetchRespondents()
        await fetchResults()
      } catch (e: any) {
        toast.error('Gagal menghapus response')
      }
    },
  })
}

watch(filterProdiId, () => {
  fetchResults()
  fetchRespondents()
})

onMounted(() => {
  fetchProdis()
  fetchResults()
  fetchRespondents()
})
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center gap-4">
      <button @click="router.push('/surveys')" class="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors">
        <ArrowLeft class="w-5 h-5" />
      </button>
      <div class="flex-1 flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BarChart3 class="w-6 h-6 text-purple-600" /> Hasil Survei
          </h1>
          <p class="text-sm text-gray-500 mt-0.5">{{ results?.instrument?.title || 'Loading...' }}</p>
        </div>
        
        <!-- Tab Navigation & Action Buttons -->
        <div class="flex items-center gap-4">
          <!-- Prodi Filter -->
          <div class="w-48">
            <select v-model="filterProdiId" class="w-full bg-white border border-gray-200 text-gray-700 py-2 px-3 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent">
              <option value="">Semua Program Studi</option>
              <option v-for="prodi in prodis" :key="prodi.id" :value="prodi.id">
                {{ prodi.degree }} {{ prodi.name }}
              </option>
            </select>
          </div>

          <div class="flex p-1 bg-gray-100 rounded-lg">
            <button 
              @click="activeTab = 'statistik'"
              class="flex items-center gap-2 px-4 py-2 rounded-md font-medium text-sm transition-all"
              :class="activeTab === 'statistik' ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'"
            >
              <BarChart3 class="w-4 h-4" /> Statistik
            </button>
            <button 
              @click="activeTab = 'spreadsheet'"
              class="flex items-center gap-2 px-4 py-2 rounded-md font-medium text-sm transition-all"
              :class="activeTab === 'spreadsheet' ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'"
            >
              <Table class="w-4 h-4" /> Data Mentah
            </button>
            <button 
              @click="activeTab = 'responden'"
              class="flex items-center gap-2 px-4 py-2 rounded-md font-medium text-sm transition-all"
              :class="activeTab === 'responden' ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'"
            >
              <ClipboardCheck class="w-4 h-4" /> Responden
            </button>
          </div>
          
          <!-- Share button -->
          <div class="relative group">
            <button @click="handlePublish" class="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-semibold rounded-lg text-sm border border-indigo-100 transition-colors">
              <Share2 class="w-4 h-4" /> Publish Hasil
            </button>
            <div class="absolute bottom-[-32px] right-0 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap bg-gray-800 text-white text-[10px] py-1 px-2 rounded pointer-events-none">
              Copy public link
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- TAB: STATISTIK -->
    <template v-if="activeTab === 'statistik'">
      <!-- Summary Cards -->
      <div v-if="results" class="grid grid-cols-3 gap-4">
      <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <p class="text-sm text-gray-500 mb-1">Total Responden</p>
        <p class="text-3xl font-bold text-gray-900">{{ results.totalResponses }}</p>
      </div>
      <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <p class="text-sm text-gray-500 mb-1">Jumlah Pertanyaan</p>
        <p class="text-3xl font-bold text-gray-900">{{ results.questionStats?.length || 0 }}</p>
      </div>
      <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <p class="text-sm text-gray-500 mb-1">Dosen Dievaluasi</p>
        <p class="text-3xl font-bold text-gray-900">{{ results.lecturerSummary?.length || 0 }}</p>
      </div>
    </div>

    <!-- Lecturer Summary -->
    <div v-if="results?.lecturerSummary?.length" class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div class="p-5 border-b border-gray-100">
        <h2 class="text-lg font-semibold text-gray-800 flex items-center gap-2"><Users class="w-5 h-5 text-purple-600" /> Ringkasan per Dosen</h2>
      </div>
      <table class="w-full text-left text-sm">
        <thead class="bg-gray-50 text-gray-600 border-b border-gray-100">
          <tr>
            <th class="px-6 py-3 font-medium">Dosen</th>
            <th class="px-6 py-3 font-medium text-center">Jumlah Respons</th>
            <th class="px-6 py-3 font-medium text-center">Rata-rata Skor</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
          <tr v-for="lec in results.lecturerSummary" :key="lec.lecturerId" class="hover:bg-gray-50/50">
            <td class="px-6 py-3 font-medium text-gray-900">{{ lec.lecturerName }}</td>
            <td class="px-6 py-3 text-center text-gray-600">{{ lec.responseCount }}</td>
            <td class="px-6 py-3 text-center">
              <span :class="[getScoreColor(lec.averageScore), 'px-3 py-1 rounded-full text-sm font-bold']">
                {{ lec.averageScore }} / 5
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Per-Question Stats -->
    <div v-if="results?.questionStats?.length" class="space-y-4">
      <h2 class="text-lg font-semibold text-gray-800">Detail per Pertanyaan</h2>

      <div v-for="(qs, idx) in results.questionStats" :key="qs.question.id"
        class="bg-white rounded-xl shadow-sm border border-gray-100 p-5"
      >
        <div class="flex items-start gap-3 mb-4">
          <span class="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-100 text-purple-700 text-xs font-bold shrink-0">{{ Number(idx) + 1 }}</span>
          <div>
            <p class="text-gray-900 font-medium">{{ qs.question.text }}</p>
            <span class="text-xs text-gray-500">{{ qs.totalAnswers }} jawaban</span>
          </div>
        </div>

        <!-- Likert Distribution -->
        <div v-if="qs.question.type === 'likert'" class="space-y-3">
          <div class="flex items-center gap-3 mb-2">
            <Star class="w-5 h-5 text-yellow-500" />
            <span :class="[getScoreColor(qs.average), 'px-3 py-1 rounded-full text-sm font-bold']">
              Rata-rata: {{ qs.average }} / 5
            </span>
          </div>
          <div v-for="n in 5" :key="n" class="flex items-center gap-3">
            <span class="text-xs text-gray-500 w-8 text-right">{{ n }}</span>
            <div class="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
              <div
                class="h-full rounded-full transition-all duration-500"
                :class="n >= 4 ? 'bg-green-400' : n >= 3 ? 'bg-yellow-400' : 'bg-red-400'"
                :style="{ width: getBarWidth(qs.distribution?.[n] || 0, qs.totalAnswers) + '%' }"
              ></div>
            </div>
            <span class="text-xs text-gray-600 w-12">{{ qs.distribution?.[n] || 0 }} ({{ getBarWidth(qs.distribution?.[n] || 0, qs.totalAnswers) }}%)</span>
          </div>
        </div>

        <!-- MC Distribution -->
        <div v-else-if="qs.question.type === 'multiple_choice' && qs.distribution" class="space-y-2">
          <div v-for="(count, label) in qs.distribution" :key="label" class="flex items-center gap-3">
            <span class="text-sm text-gray-700 w-32 truncate">{{ label }}</span>
            <div class="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
              <div class="h-full bg-purple-400 rounded-full transition-all duration-500"
                :style="{ width: getBarWidth(count, qs.totalAnswers) + '%' }"
              ></div>
            </div>
            <span class="text-xs text-gray-600 w-12">{{ count }} ({{ getBarWidth(count, qs.totalAnswers) }}%)</span>
          </div>
        </div>

        <!-- Text Responses -->
        <div v-else-if="qs.question.type === 'text' && qs.responses?.length" class="space-y-2 max-h-48 overflow-y-auto">
          <div v-for="(resp, i) in qs.responses" :key="i" class="bg-gray-50 rounded-lg px-4 py-2 text-sm text-gray-700 border border-gray-100">
            "{{ resp }}"
          </div>
        </div>
      </div>
      </div>
    </template>

    <!-- TAB: SPREADSHEET -->
    <template v-else-if="activeTab === 'spreadsheet'">
      <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
        <table class="w-full text-left text-sm whitespace-nowrap">
          <thead class="bg-gray-50 text-gray-600 border-b border-gray-100">
            <tr>
              <th class="px-4 py-3 font-semibold w-10">No</th>
              <th class="px-4 py-3 font-semibold">Tanggal</th>
              <th class="px-4 py-3 font-semibold">NIM</th>
              <th class="px-4 py-3 font-semibold">Mahasiswa</th>
              <th class="px-4 py-3 font-semibold">Kelas</th>
              <th class="px-4 py-3 font-semibold">Matakuliah</th>
              <th class="px-4 py-3 font-semibold border-r border-gray-200">Dosen Dinilai</th>
              <th v-for="(q, idx) in results?.instrument?.questions" :key="q.id" class="px-4 py-3 font-semibold max-w-[200px] truncate text-center" :title="q.text">
                P{{ Number(idx) + 1 }}
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            <tr v-for="(row, idx) in results?.spreadsheetData" :key="row.id" class="hover:bg-gray-50/50">
              <td class="px-4 py-3 text-gray-500">{{ Number(idx) + 1 }}</td>
              <td class="px-4 py-3">{{ new Date(row.submittedAt).toLocaleDateString('id-ID') }}</td>
              <td class="px-4 py-3 text-gray-600 font-medium">{{ row.studentNim || '-' }}</td>
              <td class="px-4 py-3">{{ row.studentName || '-' }}</td>
              <td class="px-4 py-3">{{ row.className || '-' }}</td>
              <td class="px-4 py-3 text-indigo-700">{{ row.courseName || '-' }}</td>
              <td class="px-4 py-3 border-r border-gray-100 font-medium">{{ row.lecturerName || '-' }}</td>
              <td v-for="q in results?.instrument?.questions" :key="'ans-'+q.id" class="px-4 py-3 max-w-[250px] truncate text-center" :title="row.answers[q.id]?.value || '-'">
                <span v-if="q.type === 'likert'" :class="[getScoreColor(Number(row.answers[q.id]?.value)), 'px-2 py-0.5 rounded-full font-bold text-xs inline-block min-w-8']">
                   {{ row.answers[q.id]?.value || '-' }}
                </span>
                <span v-else>
                  {{ row.answers[q.id]?.value || '-' }}
                </span>
              </td>
            </tr>
            <tr v-if="!results?.spreadsheetData?.length">
               <td :colspan="7 + (results?.instrument?.questions?.length || 0)" class="text-center py-10 text-gray-500 italic">Belum ada data evaluasi.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>

    <!-- TAB: RESPONDEN -->
    <template v-else-if="activeTab === 'responden'">
      <div v-if="respondentsLoading" class="text-center py-12 text-gray-500">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-3"></div>
        Memuat data responden...
      </div>
      <div v-else-if="!respondents?.classes?.length" class="text-center py-16">
        <ClipboardCheck class="w-12 h-12 mx-auto mb-3 text-gray-300" />
        <p class="font-medium text-gray-500">Belum ada data responden</p>
        <p class="text-sm text-gray-400 mt-1">Data akan muncul setelah mahasiswa mengisi survei.</p>
      </div>
      <div v-else class="space-y-4">
        <div v-for="cls in respondents.classes" :key="cls.classId" class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <!-- Class Header -->
          <button @click="toggleClassExpand(cls.classId)" class="w-full flex items-center justify-between p-5 hover:bg-gray-50/50 transition-colors text-left">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center shrink-0">
                <Users class="w-5 h-5 text-purple-700" />
              </div>
              <div>
                <h3 class="font-bold text-gray-900">{{ cls.className }}</h3>
                <p class="text-xs text-gray-500 mt-0.5">{{ cls.prodiName }}</p>
              </div>
            </div>
            <div class="flex items-center gap-4">
              <div class="flex items-center gap-6 text-sm">
                <span class="flex items-center gap-1.5">
                  <CheckCircle class="w-4 h-4 text-green-500" />
                  <span class="font-bold text-green-700">{{ cls.filledCount }}</span>
                  <span class="text-gray-400">sudah isi</span>
                </span>
                <span class="flex items-center gap-1.5">
                  <XCircle class="w-4 h-4 text-red-400" />
                  <span class="font-bold text-red-600">{{ cls.totalStudents - cls.filledCount }}</span>
                  <span class="text-gray-400">belum</span>
                </span>
              </div>
              <div class="px-3 py-1 rounded-full text-xs font-bold" :class="cls.filledCount === cls.totalStudents ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'">
                {{ cls.filledCount }}/{{ cls.totalStudents }}
              </div>
              <ChevronDown :class="['w-5 h-5 text-gray-400 transition-transform', expandedClasses[cls.classId] ? 'rotate-180' : '']" />
            </div>
          </button>

          <!-- Student List -->
          <div v-if="expandedClasses[cls.classId]" class="border-t border-gray-100">
            <table class="w-full text-sm text-left">
              <thead class="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                <tr>
                  <th class="px-5 py-3 font-semibold w-10">No</th>
                  <th class="px-5 py-3 font-semibold">NIM</th>
                  <th class="px-5 py-3 font-semibold">Nama Mahasiswa</th>
                  <th class="px-5 py-3 font-semibold text-center">Status</th>
                  <th class="px-5 py-3 font-semibold text-center">Jumlah Respon</th>
                  <th class="px-5 py-3 font-semibold text-right">Aksi</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-50">
                <tr v-for="(student, idx) in cls.students" :key="student.studentId" class="hover:bg-gray-50/50 transition-colors">
                  <td class="px-5 py-3 text-gray-400">{{ Number(idx) + 1 }}</td>
                  <td class="px-5 py-3 font-mono text-gray-600 text-xs">{{ student.nim }}</td>
                  <td class="px-5 py-3 font-medium text-gray-900">{{ student.studentName }}</td>
                  <td class="px-5 py-3 text-center">
                    <span v-if="student.filled" class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700">
                      <CheckCircle class="w-3.5 h-3.5" /> Sudah Isi
                    </span>
                    <span v-else class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-red-50 text-red-500">
                      <XCircle class="w-3.5 h-3.5" /> Belum
                    </span>
                  </td>
                  <td class="px-5 py-3 text-center">
                    <span class="bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full text-xs font-bold">{{ student.totalResponses }}</span>
                  </td>
                  <td class="px-5 py-3 text-right">
                    <button v-if="student.filled" @click="openStudentDetail(student)" class="px-2.5 py-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 border border-blue-200 hover:border-blue-300 rounded-lg transition-colors inline-flex items-center gap-1.5 text-xs font-semibold shadow-sm" title="Lihat Detail Response">
                      <Eye class="w-3.5 h-3.5" /> Detail
                    </button>
                    <span v-else class="text-xs text-gray-400 italic">—</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </template>

    <!-- Loading -->
    <div v-if="loading" class="text-center py-12 text-gray-500">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-3"></div>
      Memuat hasil survei...
    </div>

    <!-- Modal Detail Response Mahasiswa -->
    <Transition enter-active-class="transition duration-200 ease-out" enter-from-class="opacity-0" enter-to-class="opacity-100" leave-active-class="transition duration-150 ease-in" leave-from-class="opacity-100" leave-to-class="opacity-0">
      <div v-if="isDetailModalOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
        <div class="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" @click="closeStudentDetail"></div>
        <div class="relative w-full max-w-2xl rounded-2xl bg-white shadow-xl flex flex-col max-h-[90vh] animate-in slide-in-from-bottom-4 duration-300">
          <div class="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <div>
              <h3 class="text-lg font-bold text-slate-800">Detail Response Mahasiswa</h3>
              <p class="text-sm font-medium text-purple-600 mt-0.5">{{ selectedStudent?.nim }} — {{ selectedStudent?.studentName }}</p>
            </div>
            <button @click="closeStudentDetail" class="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
              <X class="w-5 h-5" />
            </button>
          </div>
          <div class="overflow-y-auto px-6 py-4">
            <table class="w-full text-sm text-left">
              <thead class="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider border-b border-gray-100">
                <tr>
                  <th class="px-4 py-3 font-semibold">Matakuliah</th>
                  <th class="px-4 py-3 font-semibold">Dosen</th>
                  <th class="px-4 py-3 font-semibold text-right">Aksi</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100">
                <tr v-for="resp in selectedStudent?.responses" :key="resp.responseId" class="hover:bg-gray-50/50 transition-colors">
                  <td class="px-4 py-3 text-gray-900 font-bold max-w-[200px] truncate" :title="resp.courseName">{{ resp.courseName }}</td>
                  <td class="px-4 py-3 text-gray-600 font-medium max-w-[200px] truncate" :title="resp.lecturerName">{{ resp.lecturerName }}</td>
                  <td class="px-4 py-3 text-right">
                    <button @click="handleDeleteResponse(resp.responseId); closeStudentDetail()" class="px-2 py-1 text-red-500 hover:text-red-700 hover:bg-red-50 border border-transparent hover:border-red-200 rounded-md transition-colors inline-flex items-center gap-1.5 text-xs font-semibold" title="Reset response ini">
                      <Trash2 class="w-3.5 h-3.5" /> Reset
                    </button>
                  </td>
                </tr>
                <tr v-if="!selectedStudent?.responses?.length">
                  <td colspan="3" class="px-4 py-8 text-center text-gray-400 italic">Belum ada response.</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div class="border-t border-slate-100 bg-gray-50 px-6 py-4 rounded-b-2xl flex justify-end">
             <button @click="closeStudentDetail" class="rounded-xl px-5 py-2 text-sm font-bold bg-white border border-gray-200 shadow-sm text-gray-700 hover:bg-gray-50 transition-colors focus:ring-2 focus:ring-purple-500 focus:outline-none focus:ring-offset-1">Tutup</button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useToast } from '@/composables/useToast'
import api from '@/lib/api'
import { BarChart3, Users, Star, Table, ClipboardCheck, ChevronDown, CheckCircle, XCircle, Eye, X } from 'lucide-vue-next'

const route = useRoute()
const toast = useToast()

const hash = route.params.hash as string
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

const toggleClassExpand = (classId: number) => {
  expandedClasses.value[classId] = !expandedClasses.value[classId]
}

const fetchProdis = async () => {
  try {
    const { data } = await api.get(`/public-surveys/${hash}/study-programs`)
    prodis.value = data
  } catch (e) {
    console.error('Failed to load prodis', e)
  }
}

const fetchPublicResults = async () => {
  loading.value = true
  try {
    const params: any = {}
    if (filterProdiId.value) params.prodiId = filterProdiId.value
    const res = await api.get(`/public-surveys/${hash}/results`, { params })
    results.value = res.data
  } catch (e: any) {
    if (e.response?.status === 404) {
      toast.error('Instrumen tidak ditemukan atau sudah ditutup.')
    } else {
      toast.error('Gagal memuat hasil survei')
    }
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

const fetchRespondents = async () => {
  respondentsLoading.value = true
  try {
    const params: any = {}
    if (filterProdiId.value) params.prodiId = filterProdiId.value
    const res = await api.get(`/public-surveys/${hash}/respondents`, { params })
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

import { watch } from 'vue'
watch(filterProdiId, () => {
  fetchPublicResults()
  fetchRespondents()
})

onMounted(() => {
  fetchProdis()
  fetchPublicResults()
  fetchRespondents()
})
</script>

<template>
  <div class="min-h-screen bg-gray-50 flex flex-col py-8 pb-32">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
      
      <!-- Brand & Title Header -->
      <div class="mb-8 flex flex-col gap-2">
        <div class="flex items-center gap-3">
            <div class="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200 shrink-0">
               <span class="text-white font-bold text-xl">PSTI</span>
            </div>
            <div>
              <p class="text-sm font-bold tracking-widest text-indigo-600 mb-0.5">SISTEM EVALUASI DOSEN</p>
              <h1 class="text-2xl font-bold text-gray-900 leading-tight">Pengumuman Publik Hasil Survei</h1>
            </div>
        </div>
      </div>

      <!-- Main Container -->
      <div v-if="results" class="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        <div class="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
            <div>
              <p class="text-xs font-bold text-gray-400 tracking-wider mb-1 uppercase">Nama Instrumen</p>
              <h2 class="text-xl font-bold text-gray-800">{{ results.instrument.title }}</h2>
              <p v-if="results.instrument.description" class="text-sm text-gray-600 mt-1 max-w-3xl">{{ results.instrument.description }}</p>
            </div>
            
            <div class="flex flex-col sm:flex-row gap-4 shrink-0 sm:items-center">
              <div class="w-full sm:w-48">
                <select v-model="filterProdiId" class="w-full bg-white border border-gray-200 text-gray-700 py-2 px-3 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors">
                  <option value="">Semua Program Studi</option>
                  <option v-for="prodi in prodis" :key="prodi.id" :value="prodi.id">
                    {{ prodi.name }}
                  </option>
                </select>
              </div>

              <div class="flex p-1 bg-gray-50 rounded-lg border border-gray-200 w-full sm:w-auto overflow-x-auto">
                <button 
                  @click="activeTab = 'statistik'"
                  class="flex items-center justify-center gap-2 px-4 sm:px-6 py-2 rounded-md font-medium text-sm transition-all whitespace-nowrap"
                  :class="activeTab === 'statistik' ? 'bg-white text-indigo-700 shadow-sm border border-gray-100' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'"
                >
                  <BarChart3 class="w-4 h-4" /> Statistik
                </button>
                <button 
                  @click="activeTab = 'spreadsheet'"
                  class="flex items-center justify-center gap-2 px-4 sm:px-6 py-2 rounded-md font-medium text-sm transition-all whitespace-nowrap"
                  :class="activeTab === 'spreadsheet' ? 'bg-white text-indigo-700 shadow-sm border border-gray-100' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'"
                >
                  <Table class="w-4 h-4" /> Data Mentah
                </button>
                <button 
                  @click="activeTab = 'responden'"
                  class="flex items-center justify-center gap-2 px-4 sm:px-6 py-2 rounded-md font-medium text-sm transition-all whitespace-nowrap"
                  :class="activeTab === 'responden' ? 'bg-white text-indigo-700 shadow-sm border border-gray-100' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'"
                >
                  <ClipboardCheck class="w-4 h-4" /> Responden
                </button>
              </div>
            </div>
        </div>

        <!-- TAB: STATISTIK -->
        <template v-if="activeTab === 'statistik'">
          <!-- Summary Cards -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col items-center text-center">
              <p class="text-sm font-bold text-gray-500 mb-2 uppercase tracking-wide">Total Responden</p>
              <p class="text-5xl font-black text-indigo-600">{{ results.totalResponses }}</p>
              <p class="text-xs text-gray-400 mt-2">mahasiswa berpartisipasi</p>
            </div>
            <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col items-center text-center">
              <p class="text-sm font-bold text-gray-500 mb-2 uppercase tracking-wide">Status Kepuasan</p>
              <p class="text-5xl font-black text-emerald-500">
                {{ results.lecturerSummary?.length ? (results.lecturerSummary.reduce((a:any,b:any) => a + b.averageScore, 0) / results.lecturerSummary.length).toFixed(1) : 0 }}
              </p>
              <p class="text-xs text-gray-400 mt-2">rata-rata skala 5.0</p>
            </div>
            <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col items-center text-center">
              <p class="text-sm font-bold text-gray-500 mb-2 uppercase tracking-wide">Dosen Dievaluasi</p>
              <p class="text-5xl font-black text-orange-500">{{ results.lecturerSummary?.length || 0 }}</p>
              <p class="text-xs text-gray-400 mt-2">tenaga pendidik</p>
            </div>
          </div>

          <!-- Lecturer Summary -->
          <div v-if="results.lecturerSummary?.length" class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div class="p-5 border-b border-gray-100 bg-gray-50/50">
              <h3 class="text-sm font-bold text-gray-800 flex items-center gap-2 tracking-wide"><Users class="w-4 h-4 text-indigo-600" /> RINGKASAN PER DOSEN</h3>
            </div>
            <div class="overflow-x-auto">
              <table class="w-full text-left text-sm whitespace-nowrap">
                <thead class="bg-white text-gray-400 text-xs border-b border-gray-100">
                  <tr>
                    <th class="px-6 py-4 font-bold uppercase tracking-wider">Nama Dosen</th>
                    <th class="px-6 py-4 font-bold uppercase tracking-wider text-center">Jumlah Respons</th>
                    <th class="px-6 py-4 font-bold uppercase tracking-wider text-center">Rata-rata Skor</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-50">
                  <tr v-for="lec in results.lecturerSummary" :key="lec.lecturerId" class="hover:bg-gray-50/80 transition-colors">
                    <td class="px-6 py-4 font-medium text-gray-900">{{ lec.lecturerName }}</td>
                    <td class="px-6 py-4 text-center text-gray-600">{{ lec.responseCount }}</td>
                    <td class="px-6 py-4 text-center">
                      <span :class="[getScoreColor(lec.averageScore), 'px-3 py-1.5 rounded-full text-sm font-bold border border-current shadow-sm']">
                        {{ lec.averageScore }} / 5
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Per-Question Stats -->
          <div v-if="results.questionStats?.length" class="space-y-5">
            <h3 class="text-sm font-bold text-gray-800 flex items-center gap-2 tracking-wide uppercase mt-8 mb-2">
              <BarChart3 class="w-4 h-4 text-indigo-600" /> Detail per Pertanyaan
            </h3>

            <div v-for="(qs, idx) in results.questionStats" :key="qs.question.id"
              class="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow"
            >
              <div class="flex items-start gap-4 mb-6">
                <span class="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700 text-sm font-black shrink-0 border border-indigo-100">{{ Number(idx) + 1 }}</span>
                <div>
                  <p class="text-gray-900 font-bold text-base leading-snug">{{ qs.question.text }}</p>
                  <p class="text-xs text-gray-500 font-medium mt-1 uppercase tracking-wider">{{ qs.totalAnswers }} Responden</p>
                </div>
              </div>

              <!-- Likert Distribution -->
              <div v-if="qs.question.type === 'likert'" class="space-y-4 ml-12">
                <div class="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 mb-4">
                  <div class="flex items-center gap-2 bg-yellow-50 px-3 py-1.5 rounded-lg border border-yellow-200">
                    <Star class="w-4 h-4 text-yellow-500 fill-current" />
                    <span class="text-yellow-700 font-bold text-sm">Rata-rata: {{ qs.average }}</span>
                  </div>
                </div>
                <div v-for="n in [5,4,3,2,1]" :key="n" class="flex items-center gap-4">
                  <span class="text-xs font-bold text-gray-500 w-8 flex items-center gap-1 justify-end">{{ n }} <Star class="w-3 h-3 text-gray-300 fill-current"/></span>
                  <div class="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden shadow-inner">
                    <div
                      class="h-full rounded-full transition-all duration-1000 ease-out"
                      :class="n >= 4 ? 'bg-emerald-400' : n >= 3 ? 'bg-yellow-400' : 'bg-red-400'"
                      :style="{ width: getBarWidth(qs.distribution?.[n] || 0, qs.totalAnswers) + '%' }"
                    ></div>
                  </div>
                  <span class="text-xs font-semibold text-gray-600 w-16 text-right">{{ getBarWidth(qs.distribution?.[n] || 0, qs.totalAnswers) }}% <span class="font-normal text-gray-400 ml-1">({{ qs.distribution?.[n] || 0 }})</span></span>
                </div>
              </div>

              <!-- MC Distribution -->
              <div v-else-if="qs.question.type === 'multiple_choice' && qs.distribution" class="space-y-3 ml-12">
                <div v-for="(count, label) in qs.distribution" :key="label" class="flex items-center gap-4">
                  <span class="text-sm font-medium text-gray-700 w-48 truncate" :title="String(label)">{{ label }}</span>
                  <div class="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden shadow-inner">
                    <div class="h-full bg-indigo-400 rounded-full transition-all duration-1000 ease-out"
                      :style="{ width: getBarWidth(Number(count), qs.totalAnswers) + '%' }"
                    ></div>
                  </div>
                  <span class="text-xs font-semibold text-gray-600 w-16 text-right">{{ getBarWidth(Number(count), qs.totalAnswers) }}% <span class="font-normal text-gray-400 ml-1">({{ count }})</span></span>
                </div>
              </div>

              <!-- Text Responses -->
              <div v-else-if="qs.question.type === 'text' && qs.responses?.length" class="space-y-3 ml-12 mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div v-for="(resp, i) in qs.responses" :key="i" class="bg-indigo-50/50 rounded-xl px-4 py-3 text-sm text-gray-700 border border-indigo-100/50 shadow-sm leading-relaxed italic relative">
                  <div class="absolute top-2 left-2 text-indigo-200 text-3xl font-serif">"</div>
                  <div class="relative z-10 pl-4">{{ resp }}</div>
                </div>
              </div>
            </div>
          </div>
        </template>

        <!-- TAB: RESPONDEN -->
        <template v-else-if="activeTab === 'responden'">
          <div v-if="respondentsLoading" class="text-center py-12 text-gray-500">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-3"></div>
            Memuat data responden...
          </div>
          <div v-else-if="!respondents?.classes?.length" class="text-center py-16">
            <ClipboardCheck class="w-16 h-16 mx-auto mb-4 text-indigo-100" />
            <p class="font-bold text-gray-600">Belum ada data responden</p>
            <p class="text-sm text-gray-400 mt-1">Data akan muncul setelah mahasiswa berpartisipasi mengisi survei.</p>
          </div>
          <div v-else class="space-y-5">
            <div v-for="cls in respondents.classes" :key="cls.classId" class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
              <!-- Class Header -->
              <button @click="toggleClassExpand(cls.classId)" class="w-full flex items-center justify-between p-6 hover:bg-indigo-50/30 transition-colors text-left group">
                <div class="flex items-center gap-4">
                  <div class="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0 border border-indigo-100 group-hover:bg-indigo-100 transition-colors">
                    <Users class="w-6 h-6 text-indigo-600" />
                  </div>
                  <div>
                    <h3 class="font-bold text-gray-900 text-lg">{{ cls.className }}</h3>
                    <p class="text-sm text-indigo-600 font-medium mt-0.5">{{ cls.prodiName }}</p>
                  </div>
                </div>
                <div class="flex items-center gap-6">
                  <div class="hidden sm:flex items-center gap-6 text-sm bg-gray-50 px-4 py-2 rounded-lg border border-gray-100">
                    <span class="flex items-center gap-2">
                      <CheckCircle class="w-4 h-4 text-emerald-500" />
                      <span class="font-black text-emerald-700">{{ cls.filledCount }}</span>
                      <span class="text-gray-500 font-medium">Sudah Isi</span>
                    </span>
                    <span class="flex items-center gap-2">
                      <XCircle class="w-4 h-4 text-rose-400" />
                      <span class="font-black text-rose-600">{{ cls.totalStudents - cls.filledCount }}</span>
                      <span class="text-gray-500 font-medium">Belum</span>
                    </span>
                  </div>
                  <div class="px-4 py-1.5 rounded-full text-sm font-black tracking-wide" :class="cls.filledCount === cls.totalStudents ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-amber-100 text-amber-700 border border-amber-200'">
                    {{ cls.filledCount }}/{{ cls.totalStudents }}
                  </div>
                  <ChevronDown :class="['w-5 h-5 text-gray-400 transition-transform duration-300', expandedClasses[cls.classId] ? 'rotate-180' : '']" />
                </div>
              </button>

              <!-- Student List -->
              <div v-if="expandedClasses[cls.classId]" class="border-t border-gray-100">
                <div class="overflow-x-auto">
                  <table class="w-full text-sm text-left whitespace-nowrap">
                    <thead class="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                      <tr>
                        <th class="px-6 py-4 font-bold w-12 text-center">No</th>
                        <th class="px-6 py-4 font-bold">NIM</th>
                        <th class="px-6 py-4 font-bold">Nama Mahasiswa</th>
                        <th class="px-6 py-4 font-bold text-center">Status</th>
                        <th class="px-6 py-4 font-bold text-center">Jumlah Respon</th>
                        <th class="px-6 py-4 font-bold text-center">Aksi</th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-50">
                      <tr v-for="(student, idx) in cls.students" :key="student.studentId" class="hover:bg-gray-50/80 transition-colors">
                        <td class="px-6 py-4 text-gray-400 font-medium text-center">{{ Number(idx) + 1 }}</td>
                        <!-- MASKING NIM FOR PUBLIC PRIVACY (Optional: we can show only partial NIM like 123****89 or leave it as is if allowed. For now keeping full NIM based on common requirements unless stated otherwise) -->
                        <td class="px-6 py-4 font-mono text-gray-600">{{ student.nim }}</td>
                        <td class="px-6 py-4 font-bold text-gray-800">{{ student.studentName }}</td>
                        <td class="px-6 py-4 text-center">
                          <span v-if="student.filled" class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 border border-emerald-200 shadow-sm">
                            <CheckCircle class="w-3.5 h-3.5" /> Selesai
                          </span>
                          <span v-else class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-500 border border-rose-100">
                            <XCircle class="w-3.5 h-3.5" /> Belum
                          </span>
                        </td>
                        <td class="px-6 py-4 text-center">
                          <span class="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-xs font-black shadow-inner border border-gray-200">{{ student.totalResponses }}</span>
                        </td>
                        <td class="px-6 py-4 text-center">
                          <button v-if="student.filled" @click="openStudentDetail(student)" class="px-3 py-1.5 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 border border-indigo-200 hover:border-indigo-300 rounded-lg transition-colors inline-flex items-center justify-center gap-1.5 text-xs font-bold shadow-sm" title="Lihat Detail Response">
                            <Eye class="w-3.5 h-3.5" /> Detail
                          </button>
                          <span v-else class="text-xs text-gray-400 font-medium italic">—</span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </template>

      </div>

      <!-- Loading State -->
      <div v-else-if="loading" class="flex flex-col items-center justify-center py-32 animate-in fade-in duration-500">
        <div class="relative w-16 h-16">
          <div class="absolute inset-0 rounded-full border-4 border-indigo-100"></div>
          <div class="absolute inset-0 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin"></div>
        </div>
        <p class="mt-6 text-gray-500 font-medium tracking-wide animate-pulse">Memuat data publik...</p>
      </div>
      
      <!-- Modal Detail Response Mahasiswa -->
      <Transition enter-active-class="transition duration-200 ease-out" enter-from-class="opacity-0" enter-to-class="opacity-100" leave-active-class="transition duration-150 ease-in" leave-from-class="opacity-100" leave-to-class="opacity-0">
        <div v-if="isDetailModalOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <div class="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" @click="closeStudentDetail"></div>
          <div class="relative w-full max-w-2xl rounded-2xl bg-white shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in slide-in-from-bottom-4 duration-300">
            <div class="flex items-center justify-between border-b border-slate-100 px-6 py-5 bg-indigo-50/30">
              <div>
                <h3 class="text-lg font-black text-slate-800">Detail Evaluasi Mahasiswa</h3>
                <p class="text-sm font-bold text-indigo-600 mt-1 uppercase tracking-wider">{{ selectedStudent?.nim }} — {{ selectedStudent?.studentName }}</p>
              </div>
              <button @click="closeStudentDetail" class="rounded-xl p-2.5 text-slate-400 hover:bg-white hover:text-slate-600 hover:shadow-sm transition-all border border-transparent hover:border-slate-200">
                <X class="w-5 h-5" />
              </button>
            </div>
            <div class="overflow-y-auto px-6 py-4 bg-white">
              <table class="w-full text-sm text-left">
                <thead class="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider border-b border-gray-100">
                  <tr>
                    <th class="px-5 py-3 font-bold">Matakuliah</th>
                    <th class="px-5 py-3 font-bold">Dosen Dievaluasi</th>
                    <th class="px-5 py-3 font-bold text-center">Status</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-100">
                  <tr v-for="resp in selectedStudent?.responses" :key="resp.responseId" class="hover:bg-gray-50/50 transition-colors">
                    <td class="px-5 py-4 text-gray-900 font-bold max-w-[200px] truncate" :title="resp.courseName">{{ resp.courseName }}</td>
                    <td class="px-5 py-4 text-gray-600 font-medium max-w-[200px] truncate" :title="resp.lecturerName">{{ resp.lecturerName }}</td>
                    <td class="px-5 py-4 text-center">
                       <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 border border-emerald-200 shadow-sm">
                         <CheckCircle class="w-3 h-3" /> Selesai
                       </span>
                    </td>
                  </tr>
                  <tr v-if="!selectedStudent?.responses?.length">
                    <td colspan="3" class="px-5 py-10 text-center text-gray-400 italic">Data evaluasi tidak ditemukan.</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div class="border-t border-slate-100 bg-gray-50 px-6 py-5 flex justify-end">
               <button @click="closeStudentDetail" class="rounded-xl px-6 py-2.5 text-sm font-black bg-white border border-gray-200 shadow-sm text-gray-700 hover:bg-gray-50 hover:text-indigo-700 transition-colors focus:ring-2 focus:ring-indigo-500 focus:outline-none focus:ring-offset-1">Tutup</button>
            </div>
          </div>
        </div>
      </Transition>

    </div>
  </div>
</template>

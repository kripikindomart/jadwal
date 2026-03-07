<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useToast } from '@/composables/useToast'
import api from '@/lib/api'
import { ClipboardList, CheckCircle2, ChevronDown, UserSquare2, BookOpen } from 'lucide-vue-next'

const route = useRoute()
const toast = useToast()

const instrumentId = route.params.hash as string
const instrument = ref<any>(null)
const loading = ref(true)
const submitting = ref(false)
const submitted = ref(false)
const submissionAttempted = ref(false)
const errorMsg = ref('')

const step = ref<1 | 2 | 3>(1)

// Definitions
const studyPrograms = ref<any[]>([])
const classes = ref<any[]>([])
const students = ref<any[]>([])
const studentCourses = ref<any[]>([]) // new state for Step 2

const isRestoring = ref(false)

// Form state step 1
const selectedProdiId = ref('')
const selectedClassId = ref('')
const selectedStudentId = ref('')
const studentSearchQuery = ref('')
const showDropdown = ref(false)

// Form state step 2
// classCourseId -> lecturerId -> questionId -> value
const answers = ref<Record<number, Record<number, Record<number, string>>>>({})

// Structure: { courseId: boolean (true if collapsed) }
const collapsedCourses = ref<Record<number, boolean>>({})

// Structure: { courseId: boolean (true if expanded in sidebar) }
const sidebarExpanded = ref<Record<number, boolean>>({})

// Computed
const filteredStudents = computed(() => {
  if (!studentSearchQuery.value) return students.value
  return students.value.filter(s => s.displayName.toLowerCase().includes(studentSearchQuery.value.toLowerCase()))
})

const isStep1Valid = computed(() => {
  return selectedProdiId.value && selectedClassId.value && selectedStudentId.value
})

const isStep2Valid = computed(() => {
  if (!instrument.value?.questions) return false
  const requiredQuestions = instrument.value.questions.filter((q: any) => q.isRequired)
  
  if (studentCourses.value.length === 0) return false
  
  let isValid = true;
  studentCourses.value.forEach(course => {
    if (course.lecturers) {
      course.lecturers.forEach((l: any) => {
        if (l.isEvaluated) return // Skip validation for already evaluated lecturers
        const hasAllAnswers = requiredQuestions.every((q: any) => answers.value[course.id]?.[l.id]?.[q.id])
        if (!hasAllAnswers) isValid = false
      })
    }
  })
  
  return isValid
})

// Lifecycle
const appStateKey = computed(() => `survey_app_state_${instrumentId}`)

const saveAppState = () => {
  if (isRestoring.value || step.value === 1 && !selectedProdiId.value) return
  localStorage.setItem(appStateKey.value, JSON.stringify({
    step: step.value,
    selectedProdiId: selectedProdiId.value,
    selectedClassId: selectedClassId.value,
    selectedStudentId: selectedStudentId.value,
    studentSearchQuery: studentSearchQuery.value
  }))
}

watch([step, selectedProdiId, selectedClassId, selectedStudentId, studentSearchQuery], () => {
  saveAppState()
}, { deep: true })

onMounted(async () => {
  try {
    const res = await api.get(`/public-surveys/${instrumentId}`)
    instrument.value = res.data
    
    // Fetch prodis
    const prodiRes = await api.get(`/public-surveys/${instrumentId}/study-programs`)
    studyPrograms.value = prodiRes.data

    // Restore state if valid
    const saved = localStorage.getItem(appStateKey.value)
    if (saved) {
      try {
        const state = JSON.parse(saved)
        if (state.step > 1 && state.selectedProdiId && state.selectedClassId && state.selectedStudentId) {
          isRestoring.value = true
          
          selectedProdiId.value = state.selectedProdiId
          selectedClassId.value = state.selectedClassId
          selectedStudentId.value = state.selectedStudentId
          studentSearchQuery.value = state.studentSearchQuery
          step.value = state.step
          
          // Fetch data concurrently
          const [classesRes, studentsRes, coursesRes] = await Promise.all([
            api.get(`/public-surveys/${instrumentId}/classes/${state.selectedProdiId}`),
            api.get(`/public-surveys/class-students/${state.selectedClassId}`),
            api.get(`/public-surveys/${instrumentId}/student-courses/${state.selectedClassId}/${state.selectedStudentId}`)
          ])
          
          classes.value = classesRes.data
          students.value = studentsRes.data
          studentCourses.value = coursesRes.data
          
          // Answers are restored via storageKey logic in proceedToStep2, but we must do it here too since we're bypassing proceedToStep2
          const storageKeyVal = `survey_answers_${instrumentId}_${state.selectedStudentId}`
          const savedAnswersStr = localStorage.getItem(storageKeyVal)
          if (savedAnswersStr) {
            answers.value = JSON.parse(savedAnswersStr)
          } else {
            answers.value = {}
          }
          
          studentCourses.value.forEach((course: any) => {
            if(collapsedCourses.value[course.id] === undefined) collapsedCourses.value[course.id] = false
            if(sidebarExpanded.value[course.id] === undefined) sidebarExpanded.value[course.id] = true
            if (!answers.value[course.id]) answers.value[course.id] = {}
            if (course.lecturers) {
              course.lecturers.forEach((l: any) => {
                if (!answers.value[course.id]![l.id]) answers.value[course.id]![l.id] = {}
              })
            }
          })
          
          setTimeout(() => { isRestoring.value = false }, 100)
        }
      } catch (e) {
        console.error('Failed to restore app state', e)
        localStorage.removeItem(appStateKey.value)
        isRestoring.value = false
      }
    }
  } catch (e: any) {
    errorMsg.value = e.response?.data?.message || 'Survei tidak ditemukan atau sudah ditutup.'
  } finally {
    loading.value = false
  }
})

// Watchers
watch(selectedProdiId, async (newVal) => {
  if (!isRestoring.value) {
    selectedClassId.value = ''
    selectedStudentId.value = ''
    studentSearchQuery.value = ''
    classes.value = []
    students.value = []
  }
  
  if (newVal && !isRestoring.value) {
    const res = await api.get(`/public-surveys/${instrumentId}/classes/${newVal}`)
    classes.value = res.data
  }
})

watch(selectedClassId, async (newVal) => {
  if (!isRestoring.value) {
    selectedStudentId.value = ''
    studentSearchQuery.value = ''
    students.value = []
  }
  
  if (newVal && !isRestoring.value) {
    const res = await api.get(`/public-surveys/class-students/${newVal}`)
    students.value = res.data
  }
})

watch(selectedStudentId, () => {
  if (!isRestoring.value) {
    studentCourses.value = []
    answers.value = {}
  }
})

// Auto-save logic
const storageKey = computed(() => `survey_answers_${instrumentId}_${selectedStudentId.value}`)

watch(answers, (newAnswers) => {
  if (Object.keys(newAnswers).length > 0) {
    localStorage.setItem(storageKey.value, JSON.stringify(newAnswers))
  }
}, { deep: true })

const getCourseCompletionStatus = (courseId: number) => {
  if (!instrument.value?.questions) return false
  const requiredQuestions = instrument.value.questions.filter((q: any) => q.isRequired)
  
  const course = studentCourses.value.find(c => c.id === courseId)
  if (!course || !course.lecturers || course.lecturers.length === 0) return true // Treat empty courses as completed
  
  return course.lecturers.every((l: any) => {
    if (l.isEvaluated) return true
    return requiredQuestions.every((q: any) => !!answers.value[courseId]?.[l.id]?.[q.id])
  })
}

const getLecturerCompletionStatus = (courseId: number, lecturerId: number) => {
  const course = studentCourses.value.find(c => c.id === courseId)
  const lecturer = course?.lecturers?.find((l: any) => l.id === lecturerId)
  if (lecturer?.isEvaluated) return true

  if (!instrument.value?.questions) return false
  const requiredQuestions = instrument.value.questions.filter((q: any) => q.isRequired)
  return requiredQuestions.every((q: any) => !!answers.value[courseId]?.[lecturerId]?.[q.id])
}

const toggleCourseCollapse = (courseId: number) => {
  collapsedCourses.value[courseId] = !collapsedCourses.value[courseId]
}

const toggleSidebarCourse = (courseId: number) => {
  sidebarExpanded.value[courseId] = !sidebarExpanded.value[courseId]
}

const expandAllSidebar = () => {
  studentCourses.value.forEach(c => sidebarExpanded.value[c.id] = true)
}

const collapseAllSidebar = () => {
  studentCourses.value.forEach(c => sidebarExpanded.value[c.id] = false)
}

const expandAllForms = () => {
  studentCourses.value.forEach(c => collapsedCourses.value[c.id] = false)
}

const collapseAllForms = () => {
  studentCourses.value.forEach(c => collapsedCourses.value[c.id] = true)
}

watch(answers, (newAnswers) => {
  if (Object.keys(newAnswers).length > 0) {
    localStorage.setItem(storageKey.value, JSON.stringify(newAnswers))
  }
  
  // Auto-collapse logic when a course becomes fully completed
  studentCourses.value.forEach((course) => {
    if (getCourseCompletionStatus(course.id)) {
      if (collapsedCourses.value[course.id] === undefined) {
          collapsedCourses.value[course.id] = true
      }
    } else {
       collapsedCourses.value[course.id] = false
    }
  })
}, { deep: true })

// Methods
const selectStudent = (student: any) => {
  selectedStudentId.value = student.id
  studentSearchQuery.value = student.displayName
  showDropdown.value = false
  submissionAttempted.value = false
}

const handleBlur = () => {
  setTimeout(() => {
    showDropdown.value = false
  }, 200)
}

const scrollToTop = () => {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

const scrollToCourse = (courseId: number) => {
  const el = document.getElementById('course-' + courseId)
  if (el) {
    const y = el.getBoundingClientRect().top + window.scrollY - 120
    window.scrollTo({ top: y, behavior: 'smooth' })
  }
}

const scrollToLecturer = (courseId: number, lecturerId: number) => {
  const el = document.getElementById(`course-${courseId}-lecturer-${lecturerId}`)
  if (el) {
    const y = el.getBoundingClientRect().top + window.scrollY - 150
    window.scrollTo({ top: y, behavior: 'smooth' })
  }
}

const proceedToStep2 = async () => {
  if (!isStep1Valid.value) return
  
  submissionAttempted.value = false
  
  try {
    loading.value = true
    const res = await api.get(`/public-surveys/${instrumentId}/student-courses/${selectedClassId.value}/${selectedStudentId.value}`)
    studentCourses.value = res.data
    
    // Initialize answers object or load from localStorage
    const savedAnswersStr = localStorage.getItem(storageKey.value)
    
    if (savedAnswersStr) {
      try {
        answers.value = JSON.parse(savedAnswersStr)
      } catch (e) {
        console.error('Failed to parse saved answers', e)
        answers.value = {}
      }
    } else {
      answers.value = {}
    }
    
    // Ensure all structure exists, even if partially loaded
    studentCourses.value.forEach(course => {
      // Initialize collapse state
      if(collapsedCourses.value[course.id] === undefined) collapsedCourses.value[course.id] = false
      if(sidebarExpanded.value[course.id] === undefined) sidebarExpanded.value[course.id] = true // Expanded by default in sidebar
      
      if (!answers.value[course.id]) answers.value[course.id] = {}
      if (course.lecturers) {
        course.lecturers.forEach((l: any) => {
          if (!answers.value[course.id]![l.id]) {
            answers.value[course.id]![l.id] = {}
          }
        })
      }
    })
    
    if (studentCourses.value.length === 0) {
      // Don't throw error, just proceed to step 2 which will show the "completed" state instead.
      // toast.error('Gagal mendapatkan matakuliah Anda, atau anda belum mengambil matakuliah apapun di kelas ini.')
    }

    step.value = 2
    scrollToTop()
  } catch (error: any) {
    toast.error('Gagal memuat data matakuliah mahasiswa.')
  } finally {
    loading.value = false
  }
}

const submitSurvey = async () => {
  submissionAttempted.value = true
  if (!isStep2Valid.value) {
    toast.error('Mohon isi semua pertanyaan yang wajib untuk SELURUH Dosen. Klik pada nama dosen yang berwarna merah di navigasi samping untuk menyelesaikan evaluasi.')
    scrollToTop()
    return
  }

  try {
    submitting.value = true
    
    const evaluations: any[] = []
    
    studentCourses.value.forEach(course => {
      if (course.lecturers) {
        course.lecturers.forEach((l: any) => {
          evaluations.push({
            classCourseId: course.id,
            lecturerId: l.id,
            answers: Object.entries(answers.value[course.id]?.[l.id] || {}).map(([qId, val]) => ({
              questionId: parseInt(qId),
              value: val
            }))
          })
        })
      }
    })

    const payload = {
      studentId: parseInt(selectedStudentId.value as string),
      evaluations
    }

    await api.post(`/public-surveys/${instrumentId}/submit`, payload)
    
    // Clear autosave data on success
    localStorage.removeItem(storageKey.value)
    localStorage.removeItem(appStateKey.value)
    
    submitted.value = true
    scrollToTop()
  } catch (e: any) {
    toast.error(e.response?.data?.message || 'Gagal mengirim survei. Anda mungkin sudah pernah mengisi survei ini.')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-slate-50 flex flex-col font-sans">
    <!-- Navbar -->
    <header class="bg-white px-6 py-4 shadow-sm border-b border-gray-100 flex items-center gap-3 shrink-0 sticky top-0 z-50">
      <div class="bg-gradient-to-br from-indigo-500 to-blue-600 p-2 rounded-xl shadow-sm text-white flex-shrink-0">
        <ClipboardList class="w-5 h-5" />
      </div>
      <div>
        <h1 class="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 leading-tight">
          {{ instrument?.title || 'Memuat Survei...' }}
        </h1>
        <p class="text-xs font-medium text-gray-500 uppercase tracking-wider mt-0.5">Evaluasi Dosen oleh Mahasiswa</p>
      </div>
    </header>

    <main class="flex-1 w-full max-w-5xl mx-auto p-4 sm:p-6 lg:p-8 relative">
      <div v-if="loading" class="flex flex-col items-center justify-center p-12 text-gray-500">
        <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mb-4"></div>
        <p class="font-medium animate-pulse">Memuat data...</p>
      </div>

      <div v-else-if="errorMsg" class="bg-white p-8 rounded-2xl shadow-sm border border-red-100 text-center">
        <div class="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <ClipboardList class="w-8 h-8" />
        </div>
        <h2 class="text-xl font-bold text-gray-900 mb-2">Akses Ditolak</h2>
        <p class="text-gray-600">{{ errorMsg }}</p>
      </div>

      <div v-else-if="submitted" class="bg-white p-12 rounded-2xl shadow-sm border border-gray-100 text-center transform transition-all animate-in zoom-in-95 duration-500">
        <div class="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
          <CheckCircle2 class="w-10 h-10" />
        </div>
        <h2 class="text-2xl font-bold text-gray-900 mb-3">Terima kasih!</h2>
        <p class="text-gray-600 text-lg mb-8 max-w-md mx-auto">Evaluasi Anda telah berhasil disimpan dan sangat berarti bagi peningkatan kualitas pembelajaran.</p>
        
        <div class="flex flex-col sm:flex-row gap-3 justify-center">
          <button @click="() => { submitted = false; submissionAttempted = false; step = 1; selectedStudentId = ''; studentSearchQuery = ''; answers = {}; }" class="px-6 py-3 bg-white border-2 border-indigo-100 text-indigo-700 font-semibold rounded-xl hover:bg-indigo-50 transition-colors">
            Pilih Mahasiswa Lain
          </button>
          <a v-if="instrument.redirectUrl" :href="instrument.redirectUrl" class="px-6 py-3 bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-semibold rounded-xl hover:from-indigo-700 hover:to-blue-700 shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-2">
            Lanjut ke Halaman Berikutnya
          </a>
        </div>
      </div>

      <div v-else class="space-y-6">
        <!-- Progress Bar -->
        <div class="flex items-center justify-between mb-8 relative px-4 sm:px-8">
          <div class="absolute left-4 right-4 sm:left-8 sm:right-8 top-1/2 -translate-y-1/2 h-1 bg-gray-200 rounded-full -z-10"></div>
          <div class="absolute left-4 sm:left-8 top-1/2 -translate-y-1/2 h-1 bg-indigo-600 rounded-full transition-all duration-500 -z-10" :style="{ width: step === 1 ? '0%' : step === 2 ? '50%' : '100%' }"></div>
          
          <div class="flex flex-col items-center">
            <div :class="['w-10 h-10 rounded-full flex items-center justify-center font-bold shadow-sm transition-colors duration-300', step >= 1 ? 'bg-indigo-600 text-white border-4 border-indigo-100' : 'bg-gray-100 text-gray-500 border-4 border-white']">
              1
            </div>
            <span :class="['text-xs font-semibold mt-2 absolute top-10 whitespace-nowrap', step >= 1 ? 'text-indigo-700' : 'text-gray-400']">Identitas</span>
          </div>

          <div class="flex flex-col items-center">
            <div :class="['w-10 h-10 rounded-full flex items-center justify-center font-bold shadow-sm transition-colors duration-300', step >= 2 ? 'bg-indigo-600 text-white border-4 border-indigo-100' : 'bg-gray-100 text-gray-500 border-4 border-white']">
              2
            </div>
            <span :class="['text-xs font-semibold mt-2 absolute top-10 whitespace-nowrap hidden sm:block', step >= 2 ? 'text-indigo-700' : 'text-gray-400']">Daftar Matakuliah</span>
            <span :class="['text-[10px] font-semibold mt-2 absolute top-10 whitespace-nowrap sm:hidden', step >= 2 ? 'text-indigo-700' : 'text-gray-400']">Matakuliah</span>
          </div>
          
          <div class="flex flex-col items-center">
            <div :class="['w-10 h-10 rounded-full flex items-center justify-center font-bold shadow-sm transition-colors duration-300', step >= 3 ? 'bg-indigo-600 text-white border-4 border-indigo-100' : 'bg-gray-100 text-gray-500 border-4 border-white']">
              3
            </div>
            <span :class="['text-xs font-semibold mt-2 absolute top-10 whitespace-nowrap', step >= 3 ? 'text-indigo-700' : 'text-gray-400']">Evaluasi</span>
          </div>
        </div>

        <div class="pt-6"></div>

        <!-- Step 1: Identification -->
        <div v-show="step === 1" class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500 mb-32">
          <div class="p-6 sm:p-8 space-y-6">
            <div class="flex items-center gap-3 mb-2">
              <div class="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                <UserSquare2 class="w-5 h-5" />
              </div>
              <h2 class="text-xl font-bold text-gray-900">1. Identifikasi Pengisi</h2>
            </div>
            
            <p class="text-gray-600 text-sm bg-gray-50 p-4 rounded-xl border border-gray-100">
              Pilih Program Studi dan Kelas, kemudian cari Nama/NIM Anda. Anda akan mengevaluasi seluruh matakuliah dan dosen yang terdaftar pada kelas ini.
            </p>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <!-- Prodi -->
              <div class="space-y-1.5 md:col-span-2">
                <label class="block text-sm font-semibold text-gray-700">Program Studi <span class="text-red-500">*</span></label>
                <div class="relative">
                  <select v-model="selectedProdiId" class="w-full appearance-none pl-4 pr-10 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors text-sm font-medium text-gray-900">
                    <option value="" disabled>Pilih Program Studi</option>
                    <option v-for="p in studyPrograms" :key="p.id" :value="p.id">{{ p.name }}</option>
                  </select>
                  <ChevronDown class="w-4 h-4 text-gray-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              <!-- Kelas -->
              <div class="space-y-1.5 md:col-span-2">
                <label class="block text-sm font-semibold text-gray-700">Kelas <span class="text-red-500">*</span></label>
                <div class="relative">
                  <select v-model="selectedClassId" :disabled="!selectedProdiId" class="w-full appearance-none pl-4 pr-10 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors disabled:opacity-50 text-sm font-medium text-gray-900">
                    <option value="" disabled>Pilih Kelas</option>
                    <option v-for="c in classes" :key="c.id" :value="c.id">{{ c.name }}</option>
                  </select>
                  <ChevronDown class="w-4 h-4 text-gray-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              <!-- Mahasiswa (Searchable) -->
              <div class="space-y-1.5 md:col-span-2 relative">
                <label class="block text-sm font-semibold text-gray-700">Nama Anda <span class="text-red-500">*</span></label>
                <div class="relative">
                  <input 
                    type="text" 
                    v-model="studentSearchQuery" 
                    @focus="showDropdown = true"
                    @blur="handleBlur"
                    :disabled="!selectedClassId"
                    placeholder="Ketik Nama atau NIM Anda..." 
                    class="w-full pl-4 pr-10 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors disabled:opacity-50 text-sm font-medium text-gray-900 placeholder:font-normal"
                  />
                  <!-- Dropdown List -->
                  <div v-if="showDropdown && selectedClassId" class="absolute z-10 w-full mt-1 bg-white border border-gray-100 rounded-xl shadow-lg max-h-60 overflow-auto">
                    <div v-if="filteredStudents.length === 0" class="p-3 text-sm text-gray-500 text-center">Tidak ditemukan (Pastikan Anda terdaftar di kelas tsb)</div>
                    <div 
                      v-else
                      v-for="s in filteredStudents" 
                      :key="s.id" 
                      @click="selectStudent(s)"
                      class="px-4 py-2.5 hover:bg-indigo-50 cursor-pointer text-sm text-gray-800 border-b border-gray-50 last:border-0 truncate"
                      :class="{'bg-indigo-50 font-semibold text-indigo-700': selectedStudentId === s.id}"
                    >
                      {{ s.displayName }}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div class="pt-4 border-t border-gray-100 flex justify-end">
              <button 
                @click="proceedToStep2" 
                :disabled="!isStep1Valid"
                class="px-6 py-3 rounded-xl font-semibold transition-all flex items-center gap-2"
                :class="isStep1Valid ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-200' : 'bg-gray-100 text-gray-400 cursor-not-allowed'"
              >
                Lanjutkan ke Evaluasi Matakuliah
              </button>
            </div>
          </div>
        </div>

        <!-- Step 2: Konfirmasi Daftar Matakuliah -->
        <div v-show="step === 2" class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden animate-in fade-in slide-in-from-right-8 duration-500">
          <div class="p-6 sm:p-8 space-y-6">
            <div class="flex items-center gap-3 mb-2">
              <button @click="step = 1" class="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors" title="Kembali ke Identifikasi">
                <ChevronDown class="w-5 h-5 rotate-90" />
              </button>
              <div class="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                <BookOpen class="w-5 h-5" />
              </div>
              <h2 class="text-xl font-bold text-gray-900">2. Daftar Matakuliah & Dosen</h2>
            </div>
            
            <div class="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100 mb-6 flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
              <div>
                <p class="text-xs font-semibold text-indigo-600 uppercase tracking-widest mb-1">Pengisi Survei</p>
                <p class="font-bold text-gray-900 text-lg">{{ studentSearchQuery }}</p>
                <p class="text-sm text-gray-600 mt-1">Anda akan mengevaluasi dosen-dosen pada daftar matakuliah di bawah ini.</p>
              </div>
            </div>

            <div v-if="studentCourses.length === 0" class="bg-emerald-50 border border-emerald-100 p-8 rounded-2xl text-center space-y-4 shadow-sm animate-in zoom-in-95 duration-500">
              <div class="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-2 shadow-inner">
                <CheckCircle2 class="w-8 h-8" />
              </div>
              <h3 class="text-xl font-bold text-gray-900">Anda Telah Mengisi Survei</h3>
              <p class="text-gray-600 max-w-md mx-auto">
                Sistem mendeteksi bahwa Anda telah menyelesaikan seluruh evaluasi dosen pada instrumen ini. Tidak ada lagi matakuliah yang perlu dievaluasi.
              </p>
              <div class="pt-4">
                <button @click="step = 1; submissionAttempted = false; selectedStudentId = ''; studentSearchQuery = ''" class="px-6 py-2.5 bg-white border-2 border-emerald-100 text-emerald-700 font-semibold rounded-xl hover:bg-emerald-50 transition-colors inline-flex items-center gap-2">
                  Kembali ke Identifikasi
                </button>
              </div>
            </div>

            <div v-else class="space-y-4">
              <div v-for="(course, idx) in studentCourses" :key="course.id" class="border border-gray-100 rounded-xl p-4 sm:p-5 hover:border-indigo-100 transition-colors bg-gray-50/50">
                <div class="font-bold text-gray-800 mb-3 text-lg">{{ idx + 1 }}. {{ course.courseCode ? course.courseCode + ' - ' : '' }}{{ course.courseName }}</div>
                <div class="pl-4 sm:pl-8 space-y-2">
                  <template v-if="course.lecturers && course.lecturers.length > 0">
                    <div v-for="lecturer in course.lecturers" :key="lecturer.id" class="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 text-sm text-gray-600 bg-white p-3 rounded-xl border border-gray-100 shadow-sm relative overflow-hidden">
                      <div class="absolute left-0 top-0 bottom-0 w-1 transition-colors" :class="lecturer.isEvaluated ? 'bg-emerald-500' : 'bg-amber-400'"></div>
                      <span class="font-medium text-gray-800 text-sm sm:text-base ml-2">{{ lecturer.frontTitle ? lecturer.frontTitle + ' ' : '' }}{{ lecturer.name }}{{ lecturer.backTitle ? ', ' + lecturer.backTitle : '' }}</span>
                      
                      <span v-if="lecturer.isEvaluated" class="ml-auto flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-100">
                        <CheckCircle2 class="w-3.5 h-3.5" /> Sudah Dinilai
                      </span>
                      <span v-else class="ml-auto flex items-center gap-1.5 text-xs font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-md border border-amber-100">
                        Belum Dinilai
                      </span>
                    </div>
                  </template>
                  <div v-else class="text-sm text-gray-400 italic bg-white p-3 rounded-xl border border-gray-100">Tidak ada dosen pengampu</div>
                </div>
              </div>
            </div>

            <div v-if="studentCourses.length > 0" class="pt-6 mt-4 border-t border-gray-100 flex justify-end gap-3">
              <button 
                @click="step = 3; scrollToTop()" 
                class="px-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-all shadow-md shadow-indigo-200 flex items-center gap-2"
              >
                Mulai Isi Survei
              </button>
            </div>
          </div>
        </div>

        <!-- Step 3: Survey Questions with Sidebar -->
        <div v-show="step === 3" class="animate-in fade-in slide-in-from-right-8 duration-500">
          
          <div class="flex flex-col lg:flex-row gap-6 lg:gap-8 items-start">
            
            <!-- Sticky Sidebar -->
            <aside class="w-full lg:w-80 shrink-0 lg:sticky lg:top-24 space-y-4">
              <div class="bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-gray-100">
                <div class="flex items-center gap-3 mb-4">
                  <button @click="step = 2" class="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors shrink-0" title="Kembali ke Daftar Matakuliah">
                    <ChevronDown class="w-5 h-5 rotate-90" />
                  </button>
                  <div class="min-w-0">
                    <p class="text-[10px] font-semibold text-indigo-600 uppercase tracking-widest leading-tight">Pengisi Survei</p>
                    <p class="font-bold text-gray-900 text-sm truncate mt-0.5" :title="studentSearchQuery">{{ studentSearchQuery }}</p>
                  </div>
                </div>

                <div class="border-t border-gray-100 pt-4 pb-2">
                  <div class="flex items-center justify-between mb-4 pl-2 pr-1">
                    <p class="text-[11px] font-bold text-gray-400 uppercase tracking-widest leading-relaxed">Daftar Matakuliah<br>
                      <span v-if="submissionAttempted && !isStep2Valid" class="text-red-500 normal-case mt-1 max-w-[12rem] block">⚠️ Lengkapi nama merah!</span>
                    </p>
                    <div class="flex gap-1.5 self-start">
                      <button @click="expandAllSidebar" class="text-[9px] font-bold text-indigo-600 hover:text-indigo-800 transition-colors bg-indigo-50 px-2 py-1 rounded shadow-sm border border-indigo-100" title="Buka Semua List Sidebar">Expand</button>
                      <button @click="collapseAllSidebar" class="text-[9px] font-bold text-gray-500 hover:text-gray-700 transition-colors bg-gray-100 px-2 py-1 rounded shadow-sm border border-gray-200" title="Tutup Semua List Sidebar">Collapse</button>
                    </div>
                  </div>
                  <ul class="space-y-6">
                    <li v-for="(course, idx) in studentCourses" :key="'nav-' + course.id">
                      <!-- Course Title -->
                      <div class="flex items-center justify-between mb-4 group p-2 rounded-xl transition-all hover:bg-gray-50 cursor-pointer" @click="toggleSidebarCourse(course.id)">
                        <a 
                          :href="'#course-' + course.id" 
                          @click.prevent.stop="scrollToCourse(course.id)"
                          class="flex items-start gap-3 flex-1"
                        >
                          <div class="mt-0.5 shrink-0">
                            <CheckCircle2 v-if="getCourseCompletionStatus(course.id)" class="w-4 h-4 text-emerald-500" />
                            <div v-else class="w-4 h-4 rounded-full border-2 border-gray-300 group-hover:border-indigo-400 mt-0.5"></div>
                          </div>
                          <div class="min-w-0 flex-1">
                            <p class="text-[13px] font-bold text-gray-800 group-hover:text-indigo-700 leading-snug line-clamp-2">
                              {{ idx + 1 }}. {{ course.courseName }}
                            </p>
                          </div>
                        </a>
                        <button class="p-1 text-gray-400 hover:text-indigo-600 transition-colors shrink-0">
                          <ChevronDown class="w-4 h-4 transition-transform duration-200" :class="{'rotate-180': sidebarExpanded[course.id]}" />
                        </button>
                      </div>
                      
                      <!-- Lecturers List under Course -->
                      <div v-show="sidebarExpanded[course.id]">
                        <ul v-if="course.lecturers && course.lecturers.length > 0" class="pl-8 space-y-4 border-l-2 border-gray-100 ml-4 mb-2">
                          <li v-for="(lecturer, lIdx) in course.lecturers" :key="'nav-l-' + lecturer.id">
                          <a 
                            :href="`#course-${course.id}-lecturer-${lecturer.id}`" 
                            @click.prevent="scrollToLecturer(Number(course.id), Number(lecturer.id))"
                            class="group flex items-start gap-2 p-1.5 rounded-lg transition-all hover:bg-indigo-50"
                          >
                            <div class="mt-0.5 shrink-0">
                              <CheckCircle2 v-if="getLecturerCompletionStatus(course.id, lecturer.id)" class="w-3.5 h-3.5 text-emerald-500" />
                              <div v-else-if="submissionAttempted && !getLecturerCompletionStatus(course.id, lecturer.id)" class="w-3.5 h-3.5 rounded-full border-2 border-red-400 bg-red-100 text-red-600 mt-0.5 flex items-center justify-center font-bold text-[8px]">!</div>
                              <div v-else class="w-3.5 h-3.5 rounded-full border-2 border-gray-300 group-hover:border-indigo-400 mt-0.5"></div>
                            </div>
                            <div class="min-w-0 flex-1">
                              <p class="text-xs font-medium leading-tight line-clamp-2 transition-colors"
                                 :class="(submissionAttempted && !getLecturerCompletionStatus(course.id, lecturer.id)) ? 'text-red-600 font-bold' : 'text-gray-600 group-hover:text-indigo-700'">
                                <span class="font-bold mr-1">D{{ Number(lIdx) + 1 }}.</span>{{ lecturer.name }}
                              </p>
                            </div>
                          </a>
                          </li>
                        </ul>
                        <div v-else class="pl-8 ml-4 text-[11px] text-gray-400 italic py-1 mb-2">Tidak ada dosen</div>
                      </div>
                    </li>
                  </ul>
                </div>
              </div>
            </aside>

            <!-- Main Survey Area -->
            <div class="flex-1 space-y-6 min-w-0 w-full pb-64">

              <!-- Expand/Collapse All Sub Header -->
              <div class="flex justify-end gap-2 mt-4 sm:mt-0 mb-4 sm:mb-8 pr-2">
                  <button @click="expandAllForms" class="text-[11px] sm:text-xs font-semibold px-3 py-1.5 sm:py-2 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors border border-indigo-100 shadow-sm flex items-center gap-1.5">
                    <ChevronDown class="w-3.5 h-3.5" /> Buka Semua Form
                  </button>
                  <button @click="collapseAllForms" class="text-[11px] sm:text-xs font-semibold px-3 py-1.5 sm:py-2 rounded-lg bg-gray-50 text-gray-700 hover:bg-gray-100 transition-colors border border-gray-200 shadow-sm flex items-center gap-1.5">
                    <ChevronDown class="w-3.5 h-3.5 rotate-180" /> Tutup Semua Form
                  </button>
              </div>

          <!-- Iterate over each ClassCourse the student is taking -->
          <template v-for="course in studentCourses" :key="course.id">
            <div :id="'course-' + course.id" class="mt-16 mb-10 scroll-mt-28">
              <div class="flex items-center justify-between mb-4">
                <div class="flex items-center gap-3">
                  <div class="p-2 bg-blue-50 rounded-lg text-blue-600">
                    <BookOpen class="w-5 h-5" />
                  </div>
                  <h3 class="text-xl font-bold text-gray-900 border-b-2 border-blue-500 pb-1 inline-block cursor-pointer" @click="toggleCourseCollapse(course.id)">
                    {{ course.courseCode ? course.courseCode + ' - ' : '' }}{{ course.courseName }}
                  </h3>
                </div>
                
                <button 
                  @click="toggleCourseCollapse(course.id)"
                  class="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors"
                  :class="collapsedCourses[course.id] ? 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'"
                >
                  <span>{{ collapsedCourses[course.id] ? 'Buka Form' : 'Sembunyikan' }}</span>
                  <ChevronDown class="w-4 h-4 transition-transform" :class="{'rotate-180': !collapsedCourses[course.id]}" />
                </button>
              </div>

              <!-- Collapsible Content -->
              <div v-show="!collapsedCourses[course.id]">
                <!-- Iterate over each lecturer in this ClassCourse -->
              <template v-if="course.lecturers && course.lecturers.length > 0">
                <div v-for="(lecturer, lIndex) in course.lecturers" :key="lecturer.id" :id="'course-' + course.id + '-lecturer-' + lecturer.id" class="ml-0 sm:ml-4 lg:ml-8 mt-6 scroll-mt-28">
                  
                  <!-- Dosen Header -->
                  <div class="bg-indigo-50/50 p-4 rounded-t-xl border border-indigo-100 border-b-0 flex items-center gap-4">
                    <div class="bg-indigo-600 text-white w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg shadow-sm">
                      D{{ Number(lIndex) + 1 }}
                    </div>
                    <div>
                      <p class="text-xs font-semibold text-indigo-600 uppercase tracking-widest">Dosen Yang Dinilai</p>
                      <p class="font-bold text-gray-900 text-lg">
                        {{ lecturer.name }}
                      </p>
                    </div>
                  </div>

                  <!-- Questions Container for this Dosen -->
                  <div v-if="lecturer.isEvaluated" class="bg-emerald-50 border border-emerald-100 rounded-b-xl shadow-inner p-8 text-center">
                    <div class="w-12 h-12 bg-white text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm">
                      <CheckCircle2 class="w-6 h-6" />
                    </div>
                    <p class="font-bold text-emerald-800 text-lg mb-1">Sudah Dievaluasi</p>
                    <p class="text-emerald-600 text-sm max-w-sm mx-auto">Anda telah mengirimkan penilaian untuk dosen ini.</p>
                  </div>
                  <div v-else class="bg-white border border-indigo-100 rounded-b-xl shadow-sm p-4 sm:p-8 pt-6 space-y-6">
                    <div 
                      v-for="(q, idx) in instrument?.questions" 
                      :key="'c'+course.id+'l'+lecturer.id+'q'+q.id" 
                      class="pb-6 border-b transition-colors duration-300"
                      :class="[(submissionAttempted && q.isRequired && !answers[course.id]?.[lecturer.id]?.[q.id]) ? 'border-red-200 bg-red-50/50 p-4 -mx-4 rounded-xl' : 'border-gray-100 last:border-0 last:pb-0']"
                    >
                      <div class="flex gap-4">
                        <span class="font-bold text-gray-400 text-lg mt-0.5" 
                              :class="{'text-red-400': submissionAttempted && q.isRequired && !answers[course.id]?.[lecturer.id]?.[q.id]}">{{ Number(idx) + 1 }}.</span>
                        <div class="flex-1 space-y-4">
                          <p class="font-medium text-lg leading-snug"
                             :class="(submissionAttempted && q.isRequired && !answers[course.id]?.[lecturer.id]?.[q.id]) ? 'text-red-800' : 'text-gray-800'">
                            {{ q.text }}
                            <span v-if="q.isRequired" class="text-red-500 ml-1" title="Wajib diisi">*</span>
                          </p>
                          
                          <!-- Required notice -->
                          <p v-if="q.isRequired && !answers[course.id]?.[lecturer.id]?.[q.id] && submissionAttempted" class="text-sm border border-red-200 bg-red-100 text-red-600 px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 w-fit">
                            <span class="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span> Bidang ini wajib diisi
                          </p>

                          <!-- Likert Scale -->
                          <div v-if="q.type === 'likert'" class="mt-6">
                            <div class="flex justify-between sm:justify-start gap-2 sm:gap-4 md:gap-6">
                              <label v-for="i in 5" :key="i" class="flex flex-col items-center cursor-pointer group relative">
                                <input type="radio" :name="['q', String(course.id), String(lecturer.id), String(q.id)].join('_')" :value="i" @change="(e: any) => { if (answers[course.id] && answers[course.id]![lecturer.id]) answers[course.id]![lecturer.id]![q.id] = (e.target as HTMLInputElement).value }" class="sr-only" />
                                <div class="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-full border-2 transition-all duration-200"
                                     :class="(answers[course.id]?.[lecturer.id]?.[q.id] == i.toString()) ? 'border-indigo-600 bg-indigo-50 text-indigo-700 scale-110 shadow-sm' : 'border-gray-200 text-gray-400 hover:border-indigo-300 group-hover:bg-gray-50'">
                                  <span class="text-lg sm:text-xl font-bold">{{ i }}</span>
                                </div>
                                <span v-if="i === 1" class="text-[10px] sm:text-xs text-gray-400 font-medium absolute -bottom-5 sm:-bottom-6 whitespace-nowrap">Sangat Kurang</span>
                                <span v-if="i === 5" class="text-[10px] sm:text-xs text-gray-400 font-medium absolute -bottom-5 sm:-bottom-6 whitespace-nowrap">Sangat Baik</span>
                              </label>
                            </div>
                            <div class="h-6"></div>
                          </div>

                          <!-- Multiple Choice -->
                          <div v-else-if="q.type === 'multiple_choice'" class="space-y-2 mt-4">
                            <label v-for="(opt, oIdx) in q.options" :key="oIdx" 
                              class="flex items-center gap-3 p-3 sm:px-4 rounded-xl border transition-all cursor-pointer"
                              :class="(answers[course.id]?.[lecturer.id]?.[q.id] === opt) ? 'border-indigo-600 bg-indigo-50/50' : 'border-gray-200 hover:bg-gray-50'">
                              <div class="w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-colors"
                                   :class="(answers[course.id]?.[lecturer.id]?.[q.id] === opt) ? 'border-indigo-600' : 'border-gray-300'">
                                <div class="w-2.5 h-2.5 rounded-full bg-indigo-600 transition-transform duration-200 scale-0 origin-center"
                                     :class="{'scale-100': (answers[course.id]?.[lecturer.id]?.[q.id] === opt)}"></div>
                              </div>
                              <span class="text-sm font-medium text-gray-700">{{ opt }}</span>
                              <input type="radio" :name="['q', String(course.id), String(lecturer.id), String(q.id)].join('_')" :value="opt" @change="(e: any) => { if (answers[course.id] && answers[course.id]![lecturer.id]) answers[course.id]![lecturer.id]![q.id] = (e.target as HTMLInputElement).value }" class="sr-only" />
                            </label>
                          </div>

                          <!-- Textarea -->
                          <div v-else-if="q.type === 'text'" class="mt-4">
                            <textarea 
                              :value="answers[course.id]?.[lecturer.id]?.[q.id] || ''"
                              @input="(e: any) => { if (answers[course.id] && answers[course.id]![lecturer.id]) answers[course.id]![lecturer.id]![q.id] = e.target.value }"
                              rows="3" 
                              placeholder="Tuliskan jawaban Anda di sini..."
                              class="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-gray-50 hover:bg-white transition-colors text-sm font-medium text-gray-700 resize-y"
                            ></textarea>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </template>
                <div v-else class="ml-4 sm:ml-8 mt-4 p-4 text-sm text-gray-500 bg-gray-50 border border-gray-100 rounded-xl">
                  Tidak ada dosen pengampu yang ditugaskan pada matakuliah ini. Evaluasi dilewati.
                </div>
              </div> <!-- End Collapsible -->
            </div>
          </template>

          <!-- Submit Button -->
          <div class="flex justify-end pt-8 pb-12 sticky bottom-0 bg-gradient-to-t from-slate-50 via-slate-50 to-transparent z-10 p-4">
            <button 
              @click="submitSurvey" 
              :disabled="submitting || studentCourses.length === 0"
              class="w-full sm:w-auto px-8 py-3.5 bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-bold rounded-xl hover:from-indigo-700 hover:to-blue-700 shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              <div v-if="submitting" class="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              <CheckCircle2 v-else class="w-5 h-5" />
              {{ submitting ? 'Mengirim...' : 'Kirim Seluruh Evaluasi' }}
            </button>
          </div>
            </div> <!-- End Main Survey Area -->
          </div> <!-- End Flex Container -->
        </div> <!-- End Step 3 -->
      </div>
    </main>
  </div>
</template>

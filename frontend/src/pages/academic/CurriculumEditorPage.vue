<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '@/lib/api'
import { useToast } from '@/composables/useToast'
import { useConfirm } from '@/composables/useConfirm'
import SearchableSelect from '@/components/ui/SearchableSelect.vue'
import { 
  ArrowLeft, 
  Copy, 
  Printer, 
  Plus, 
  Trash2, 
  Edit2,
  BookOpen
} from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()
const toast = useToast()
const confirm = useConfirm()

const curriculumId = route.params.id as string

// State
const loading = ref(true)
const curriculum = ref<any>(null)
const masterCourses = ref<any[]>([])

// Form State
const isSubmitting = ref(false)
const form = ref({
  courseId: '',
  semester: 1,
  minGrade: 'C',
  status: 'wajib',
  isPackage: false
})

const gradeOptions = [
  { value: 'A', label: 'A' },
  { value: 'A-', label: 'A-' },
  { value: 'B+', label: 'B+' },
  { value: 'B', label: 'B' },
  { value: 'B-', label: 'B-' },
  { value: 'C+', label: 'C+' },
  { value: 'C', label: 'C' },
  { value: 'D', label: 'D' },
  { value: 'E', label: 'E' },
]

const courseOptions = computed(() => {
  return masterCourses.value.map(c => ({
    value: c.id,
    label: `[${c.code}] ${c.name} (${c.sks} SKS)`
  }))
})

// Grouped Courses by Semester
const groupedCourses = computed(() => {
  if (!curriculum.value?.curriculumCourses) return {}
  
  const groups: Record<number, any[]> = {}
  
  curriculum.value?.curriculumCourses?.forEach((item: any) => {
    if (!groups[item.semester]) {
      groups[item.semester] = []
    }
    groups[item.semester]!.push(item)
  })
  
  return groups
})

async function fetchMasterCourses(prodiId: number) {
  try {
    const { data } = await api.get('/courses', {
      params: { prodiId, perPage: 1000 }
    })
    masterCourses.value = data.data
  } catch(e) {
    console.error('Gagal memuat master courses')
  }
}

async function fetchCurriculum() {
  try {
    loading.value = true
    const { data } = await api.get(`/curriculums/${curriculumId}`)
    curriculum.value = data
    
    if (masterCourses.value.length === 0 && data.prodiId) {
       await fetchMasterCourses(data.prodiId)
    }
  } catch (err: any) {
    toast.error('Gagal', 'Kurikulum tidak ditemukan')
    router.push('/admin/academic/curriculums')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchCurriculum()
})

const editingCourseId = ref<number | null>(null)

async function handleAddCourse() {
  if (!form.value.courseId) {
    return toast.error('Harap pilih Mata Kuliah')
  }

  try {
    isSubmitting.value = true
    const payload = {
      courseId: +form.value.courseId,
      semester: +form.value.semester,
      minGrade: form.value.minGrade,
      status: form.value.status,
      isPackage: form.value.isPackage
    }

    if (editingCourseId.value) {
      await api.patch(`/curriculums/${curriculumId}/courses/${editingCourseId.value}`, payload)
      toast.success('Berhasil', 'Mata kuliah berhasil diperbarui')
    } else {
      await api.post(`/curriculums/${curriculumId}/courses`, payload)
      toast.success('Berhasil', 'Mata kuliah ditambahkan ke kurikulum')
    }
    
    // Reset form but keep semester to ease mass input
    form.value.courseId = ''
    editingCourseId.value = null
    fetchCurriculum()
  } catch (err: any) {
    toast.error('Gagal Menyimpan', err.response?.data?.message || err.message)
  } finally {
    isSubmitting.value = false
  }
}

function openEditCourse(item: any) {
  editingCourseId.value = item.courseId
  form.value = {
    courseId: item.courseId,
    semester: item.semester,
    minGrade: item.minGrade || 'C',
    status: item.status || 'wajib',
    isPackage: item.isPackage || false
  }
  
  // scroll to top
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function cancelEdit() {
  editingCourseId.value = null
  form.value.courseId = ''
}

async function handleRemoveCourse(courseId: number, courseName: string) {
  confirm.requireConfirm({
    title: 'Hapus Mata Kuliah?',
    message: `Anda yakin ingin menghapus ${courseName} dari kurikulum ini?`,
    confirmText: 'Ya, Hapus',
    style: 'danger',
    onConfirm: async () => {
      try {
        await api.delete(`/curriculums/${curriculumId}/courses/${courseId}`)
        toast.success('Berhasil', 'Mata kuliah dihapus dari kurikulum')
        fetchCurriculum()
      } catch (err: any) {
        toast.error('Gagal menghapus', err.response?.data?.message || err.message)
      }
    }
  })
}

function calculateTotalSKS(courses: any[]) {
  return courses.reduce((sum, item) => sum + (item.course?.sks || 0), 0)
}
</script>

<template>
  <div class="space-y-6 max-w-7xl mx-auto" v-if="!loading && curriculum">
    
    <!-- Header Controls -->
    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-200">
      <div class="flex items-center gap-4 w-full sm:w-auto">
        <button 
          @click="router.push('/admin/academic/curriculums')"
          class="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200"
        >
          <ArrowLeft class="w-5 h-5" />
        </button>
        <div>
          <h1 class="text-xl font-bold text-slate-800">Mata Kuliah Kurikulum</h1>
        </div>
      </div>
      
      <div class="flex gap-2 w-full sm:w-auto">
        <button class="flex items-center gap-2 bg-amber-500 text-white px-4 py-2 rounded-lg hover:bg-amber-600 transition-colors shadow-sm font-medium">
          <Copy class="w-4 h-4" />
          <span>Salin Data</span>
        </button>
        <button class="flex items-center gap-2 bg-sky-500 text-white px-4 py-2 rounded-lg hover:bg-sky-600 transition-colors shadow-sm font-medium">
          <Printer class="w-4 h-4" />
          <span>Cetak</span>
        </button>
      </div>
    </div>

    <!-- Curriculum Meta Info -->
    <div class="bg-indigo-50/50 p-6 rounded-xl border border-indigo-100/50">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-12">
        <div class="flex border-b border-indigo-100/50 pb-2">
          <span class="text-slate-500 w-32 shrink-0">Kode Prodi</span>
          <span class="font-medium text-slate-800">{{ curriculum.prodi?.code }}</span>
        </div>
        <div class="flex border-b border-indigo-100/50 pb-2">
          <span class="text-slate-500 w-32 shrink-0">Tahun Kurikulum</span>
          <span class="font-medium text-slate-800">{{ curriculum.year }}</span>
        </div>
        <div class="flex border-b border-indigo-100/50 pb-2">
          <span class="text-slate-500 w-32 shrink-0">Program Studi</span>
          <span class="font-medium text-slate-800">{{ curriculum.prodi?.name }}</span>
        </div>
        <div class="flex border-b border-indigo-100/50 pb-2">
          <span class="text-slate-500 w-32 shrink-0">Nama Kurikulum</span>
          <span class="font-medium text-slate-800">{{ curriculum.name }}</span>
        </div>
      </div>
    </div>

    <!-- Add Course Form -->
    <div class="bg-white p-5 rounded-xl shadow-sm border border-emerald-200 border-t-4 border-t-emerald-500">
      <div class="flex flex-col md:flex-row gap-4 items-end">
        <div class="flex-1 w-full relative z-20">
          <label class="block text-sm font-medium text-slate-700 mb-1">Mata Kuliah <span class="text-red-500">*</span></label>
          <SearchableSelect
            v-model="form.courseId"
            :options="courseOptions"
            placeholder="Pilih Mata Kuliah"
          />
        </div>
        
        <div class="w-full md:w-28 relative z-10">
          <label class="block text-sm font-medium text-slate-700 mb-1">Semester</label>
          <input
            v-model="form.semester"
            type="number"
            min="1"
            max="14"
            class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          />
        </div>

        <div class="w-full md:w-24 relative z-10">
          <label class="block text-sm font-medium text-slate-700 mb-1">Nilai Min.</label>
          <select
            v-model="form.minGrade"
            class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
          >
            <option v-for="opt in gradeOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>
        </div>

        <div class="w-full md:w-48 relative z-10">
          <label class="block text-sm font-medium text-slate-700 mb-2">Status MK</label>
          <div class="flex items-center gap-4 mt-1">
            <label class="flex items-center gap-1.5 cursor-pointer">
              <input type="radio" value="wajib" v-model="form.status" class="w-4 h-4 text-emerald-600 focus:ring-emerald-500 border-slate-300">
              <span class="text-sm text-slate-700">Wajib</span>
            </label>
            <label class="flex items-center gap-1.5 cursor-pointer">
              <input type="radio" value="pilihan" v-model="form.status" class="w-4 h-4 text-emerald-600 focus:ring-emerald-500 border-slate-300">
              <span class="text-sm text-slate-700">Pilihan</span>
            </label>
          </div>
        </div>
        
        <div class="w-full md:w-40 relative z-10">
          <label class="block text-sm font-medium text-slate-700 mb-2">MK Paket</label>
          <div class="flex items-center gap-4 mt-1">
            <label class="flex items-center gap-1.5 cursor-pointer">
              <input type="radio" :value="true" v-model="form.isPackage" class="w-4 h-4 text-emerald-600 focus:ring-emerald-500 border-slate-300">
              <span class="text-sm text-slate-700">Ya</span>
            </label>
            <label class="flex items-center gap-1.5 cursor-pointer">
              <input type="radio" :value="false" v-model="form.isPackage" class="w-4 h-4 text-emerald-600 focus:ring-emerald-500 border-slate-300">
              <span class="text-sm text-slate-700">Tidak</span>
            </label>
          </div>
        </div>

        <div class="flex gap-2 relative z-10 w-full md:w-auto">
          <button 
            @click="handleAddCourse"
            :disabled="isSubmitting"
            :class="[
              'flex items-center justify-center gap-2 text-white px-5 py-2 rounded-lg transition-colors w-full md:w-auto shrink-0 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed font-medium h-10',
              editingCourseId ? 'bg-blue-600 hover:bg-blue-700' : 'bg-emerald-600 hover:bg-emerald-700'
            ]"
          >
            <Edit2 v-if="editingCourseId" class="w-4 h-4" />
            <Plus v-else class="w-4 h-4" />
            <span>{{ editingCourseId ? 'Update' : 'Tambah' }}</span>
          </button>
          
          <button 
            v-if="editingCourseId"
            @click="cancelEdit"
            :disabled="isSubmitting"
            class="flex items-center justify-center bg-slate-100 text-slate-600 px-4 py-2 rounded-lg hover:bg-slate-200 transition-colors shrink-0 font-medium h-10"
          >
            Batal
          </button>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-if="Object.keys(groupedCourses).length === 0" class="text-center py-16 bg-white rounded-xl shadow-sm border border-slate-200">
      <BookOpen class="w-12 h-12 text-slate-300 mx-auto mb-3" />
      <h3 class="text-lg font-medium text-slate-800">Belum Ada Mata Kuliah</h3>
      <p class="text-slate-500 mt-1 max-w-md mx-auto">Silakan tambahkan mata kuliah ke kurikulum ini menggunakan formulir di atas, lalu atur semester dan statusnya.</p>
    </div>

    <!-- Grouped Courses -->
    <div class="space-y-6">
      <div 
        v-for="(courses, semester) in groupedCourses" 
        :key="semester"
        class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden"
      >
        <div class="px-4 py-3 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
          <h3 class="font-bold text-slate-800">Semester {{ semester }}</h3>
        </div>
        
        <div class="overflow-x-auto">
          <table class="w-full text-sm text-left">
            <thead class="bg-[#1e40af] text-white">
              <tr>
                <th class="px-4 py-2.5 font-medium w-16 text-center">No</th>
                <th class="px-4 py-2.5 font-medium w-32">Kode</th>
                <th class="px-4 py-2.5 font-medium">Mata Kuliah</th>
                <th class="px-4 py-2.5 font-medium w-24 text-center">SKS</th>
                <th class="px-4 py-2.5 font-medium w-32 text-center">Status</th>
                <th class="px-4 py-2.5 font-medium w-28 text-center">Nilai Min.</th>
                <th class="px-4 py-2.5 font-medium w-40 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-200">
              <tr 
                v-for="(item, idx) in courses" 
                :key="item.id"
                class="hover:bg-slate-50 transition-colors"
              >
                <td class="px-4 py-3 text-center text-slate-500">{{ idx + 1 }}</td>
                <td class="px-4 py-3 font-medium text-slate-700">{{ item.course?.code }}</td>
                <td class="px-4 py-3 text-slate-800">{{ item.course?.name }}</td>
                <td class="px-4 py-3 text-center text-slate-700">{{ item.course?.sks }}</td>
                <td class="px-4 py-3 text-center">
                  <span 
                    class="px-2.5 py-1 text-[11px] font-bold rounded text-white"
                    :class="item.status === 'wajib' ? 'bg-blue-500' : 'bg-orange-500'"
                  >
                    {{ item.status === 'wajib' ? 'Wajib' : 'Pilihan' }}
                  </span>
                </td>
                <td class="px-4 py-3 text-center font-medium text-slate-700">{{ item.minGrade || '-' }}</td>
                <td class="px-4 py-3">
                  <div class="flex items-center justify-center gap-2">
                    <button 
                      @click="openEditCourse(item)"
                      class="p-1.5 text-sky-600 bg-sky-50 rounded hover:bg-sky-100 transition-colors" 
                      title="Edit"
                    >
                      <Edit2 class="w-3.5 h-3.5" />
                    </button>
                    <button 
                      @click="handleRemoveCourse(item.courseId, item.course?.name)"
                      class="p-1.5 text-red-600 bg-red-50 rounded hover:bg-red-100 transition-colors" 
                      title="Hapus"
                    >
                      <Trash2 class="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
            <tfoot class="bg-slate-50 border-t border-slate-200">
              <tr>
                <td colspan="3" class="px-4 py-3 text-sm font-bold text-slate-700">Total SKS</td>
                <td class="px-4 py-3 text-center text-sm font-bold text-slate-800">{{ calculateTotalSKS(courses) }}</td>
                <td colspan="3"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  </div>

  <!-- Loading State -->
  <div v-if="loading" class="flex justify-center items-center py-20">
    <div class="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
  </div>
</template>

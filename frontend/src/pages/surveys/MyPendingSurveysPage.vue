<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from '@/composables/useToast'
import api from '@/lib/api'
import { ClipboardList, ArrowRight, BookOpen, User } from 'lucide-vue-next'

const router = useRouter()
const toast = useToast()

const loading = ref(false)
const pendingSurveys = ref<any[]>([])

const fetchPending = async () => {
  loading.value = true
  try {
    const res = await api.get('/surveys/my-pending')
    pendingSurveys.value = res.data
  } catch (e: any) {
    toast.error('Gagal memuat daftar survei')
  } finally {
    loading.value = false
  }
}

onMounted(fetchPending)
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div>
      <h1 class="text-2xl font-bold text-gray-900 flex items-center gap-3">
        <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 text-white">
          <ClipboardList class="w-5 h-5" />
        </div>
        Survei Saya
      </h1>
      <p class="text-sm text-gray-500 mt-1">Evaluasi dosen yang perlu Anda isi</p>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="text-center py-12 text-gray-500">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-3"></div>
      Memuat...
    </div>

    <!-- Empty -->
    <div v-else-if="pendingSurveys.length === 0" class="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
      <div class="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center mb-4">
        <svg class="w-8 h-8 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
      </div>
      <p class="font-semibold text-gray-800 text-lg">Semua survei sudah diisi!</p>
      <p class="text-sm text-gray-500 mt-1">Tidak ada evaluasi yang perlu Anda isi saat ini.</p>
    </div>

    <!-- Cards -->
    <div v-else class="grid gap-4 md:grid-cols-2">
      <div
        v-for="survey in pendingSurveys"
        :key="`${survey.instrumentId}-${survey.classCourseId}-${survey.lecturerId}`"
        class="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md hover:border-purple-200 transition-all group cursor-pointer"
        @click="router.push(`/surveys/${survey.instrumentId}/fill/${survey.classCourseId}/${survey.lecturerId}`)"
      >
        <div class="flex items-start justify-between">
          <div class="flex-1 min-w-0">
            <p class="text-xs text-purple-600 font-semibold uppercase tracking-wide mb-1">{{ survey.instrumentTitle }}</p>
            <h3 class="font-semibold text-gray-900 truncate flex items-center gap-2">
              <BookOpen class="w-4 h-4 text-gray-400 shrink-0" /> {{ survey.courseName }}
            </h3>
            <p class="text-sm text-gray-500 mt-1 flex items-center gap-2">
              <User class="w-3.5 h-3.5" /> {{ survey.lecturerName }}
            </p>
            <p class="text-xs text-gray-400 mt-1">Kelas: {{ survey.className }}</p>
          </div>
          <div class="bg-purple-50 text-purple-600 p-2 rounded-lg group-hover:bg-purple-600 group-hover:text-white transition-colors shrink-0">
            <ArrowRight class="w-5 h-5" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

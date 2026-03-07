<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ClipboardList, Activity, CheckCircle, XCircle, ArrowRight, Calendar } from 'lucide-vue-next'
import api from '@/lib/api'
import { useToast } from '@/composables/useToast'

const router = useRouter()
const toast = useToast()

const loading = ref(true)
const surveys = ref<any[]>([])

// Diagnostic Connection State
const pingStatus = ref<'idle' | 'loading' | 'success' | 'error'>('idle')
const pingMessage = ref('')

const fetchSurveys = async () => {
  loading.value = true
  try {
    const res = await api.get('/surveys/public')
    surveys.value = res.data || []
  } catch (err: any) {
    toast.error('Gagal mengambil daftar survei aktif')
  } finally {
    loading.value = false
  }
}

const testConnection = async () => {
  pingStatus.value = 'loading'
  pingMessage.value = 'Menghubungi server...'
  try {
    const res = await api.get('/semesters')
    if (res.status === 200 || res.status === 201) {
      pingStatus.value = 'success'
      pingMessage.value = 'Berhasil Terhubung ke API!'
    } else {
      pingStatus.value = 'error'
      pingMessage.value = `Gagal! HTTP ${res.status}`
    }
  } catch (err: any) {
    pingStatus.value = 'error'
    pingMessage.value = err.message || 'Gagal terhubung ke API'
  }
  
  setTimeout(() => {
    pingStatus.value = 'idle'
  }, 4000)
}

const goToSurvey = (survey: any) => {
  const hash = survey.publicUrlHash || survey.id
  router.push(`/survey/s/${hash}`)
}

const formatDate = (dateString: string) => {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })
}

onMounted(() => {
  fetchSurveys()
})
</script>

<template>
  <div class="min-h-screen bg-gray-50 flex flex-col p-4 sm:p-8 items-center pt-10 sm:pt-20">
    <div class="max-w-3xl w-full">
      <!-- Header -->
      <div class="bg-white rounded-3xl shadow-xl p-8 sm:p-10 border border-gray-100 mb-8 relative overflow-hidden">
        <div class="absolute top-0 right-0 w-64 h-64 bg-purple-100 rounded-full blur-3xl opacity-50 -translate-y-1/2 translate-x-1/3"></div>
        <div class="absolute bottom-0 left-0 w-64 h-64 bg-indigo-100 rounded-full blur-3xl opacity-50 translate-y-1/3 -translate-x-1/2"></div>
        
        <div class="relative z-10 flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-left">
          <div class="w-20 h-20 bg-gradient-to-br from-purple-100 to-indigo-50 text-purple-600 rounded-2xl flex items-center justify-center shrink-0 shadow-sm border border-purple-50">
            <ClipboardList class="w-10 h-10" />
          </div>
          <div class="flex-1">
            <h1 class="text-3xl font-extrabold text-gray-900 mb-2">Portal Survei Mahasiswa</h1>
            <p class="text-gray-500 text-lg leading-relaxed max-w-xl">
              Pilih dan lengkapi survei atau evaluasi di bawah ini untuk membantu kami meningkatkan kualitas akademik.
            </p>
          </div>
        </div>
      </div>

      <!-- Survey List -->
      <div class="space-y-6">
        <h2 class="text-xl font-bold text-gray-800 ml-2">Survei Tersedia ({{ surveys.length }})</h2>
        
        <div v-if="loading" class="flex flex-col items-center justify-center py-16 bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div class="w-10 h-10 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mb-4"></div>
          <p class="text-gray-500 font-medium">Memuat daftar survei...</p>
        </div>

        <div v-else-if="surveys.length === 0" class="flex flex-col items-center justify-center py-16 bg-white rounded-2xl border border-gray-100 shadow-sm text-center px-4">
          <div class="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
            <ClipboardList class="w-8 h-8 text-gray-400" />
          </div>
          <p class="text-gray-900 font-semibold mb-1">Belum Ada Survei Aktif</p>
          <p class="text-gray-500 text-sm max-w-sm">Saat ini belum ada instrumen survei yang sedang aktif untuk diisi.</p>
        </div>

        <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div 
            v-for="survey in surveys" 
            :key="survey.id"
            @click="goToSurvey(survey)"
            class="group bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-xl hover:border-purple-200 transition-all duration-300 cursor-pointer flex flex-col h-full relative overflow-hidden"
          >
            <!-- Hover Gradient Indicator -->
            <div class="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-purple-500 to-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            
            <div class="flex-1">
              <div class="flex items-center gap-2 mb-3">
                <span class="px-2.5 py-1 bg-green-50 text-green-700 text-xs font-bold rounded-lg border border-green-100">AKTIF</span>
                <span class="text-xs text-gray-400 flex items-center gap-1 font-medium">
                  <Calendar class="w-3.5 h-3.5" />
                  Dibuat {{ formatDate(survey.createdAt) }}
                </span>
              </div>
              <h3 class="text-lg font-bold text-gray-900 mb-2 group-hover:text-purple-700 transition-colors line-clamp-2">
                {{ survey.title }}
              </h3>
              <p class="text-sm text-gray-500 line-clamp-2" :class="{ 'italic': !survey.description }">
                {{ survey.description || 'Tidak ada deskripsi tambahan.' }}
              </p>
            </div>
            
            <div class="mt-6 pt-4 border-t border-gray-50 flex items-center justify-between text-purple-600 font-semibold text-sm group-hover:text-indigo-600 transition-colors">
              <span>Mulai Kuisioner</span>
              <div class="w-8 h-8 rounded-full bg-purple-50 group-hover:bg-indigo-100 flex items-center justify-center transition-colors">
                <ArrowRight class="w-4 h-4" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer Diagnostic -->
      <div class="mt-12 flex justify-center pb-8">
        <button 
          @click="testConnection"
          class="inline-flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-full border transition-all duration-300 shadow-sm bg-white"
          :class="{
            'border-gray-200 text-gray-500 hover:bg-gray-50 hover:border-gray-300': pingStatus === 'idle',
            'border-blue-200 text-blue-600 bg-blue-50': pingStatus === 'loading',
            'border-green-200 text-green-600 bg-green-50': pingStatus === 'success',
            'border-red-200 text-red-600 bg-red-50': pingStatus === 'error'
          }"
        >
          <Activity v-if="pingStatus === 'idle' || pingStatus === 'loading'" 
            class="w-4 h-4" :class="{ 'animate-pulse': pingStatus === 'loading' }" />
          <CheckCircle v-if="pingStatus === 'success'" class="w-4 h-4" />
          <XCircle v-if="pingStatus === 'error'" class="w-4 h-4" />
          {{ pingStatus === 'idle' ? 'System Diagnostic: Test API Koneksi' : pingMessage }}
        </button>
      </div>
    </div>
  </div>
</template>

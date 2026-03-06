<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useToast } from '@/composables/useToast'
import api from '@/lib/api'
import { ArrowLeft, CheckCircle, Send } from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()
const toast = useToast()

const instrumentId = route.params.instrumentId as string
const classCourseId = route.params.classCourseId as string
const lecturerId = route.params.lecturerId as string

const formData = ref<any>(null)
const loading = ref(false)
const submitted = ref(false)
const answers = ref<Record<number, string>>({})

const progress = computed(() => {
  if (!formData.value?.instrument?.questions?.length) return 0
  const total = formData.value.instrument.questions.length
  const answered = Object.values(answers.value).filter((v) => v && v.trim()).length
  return Math.round((answered / total) * 100)
})

const allRequiredAnswered = computed(() => {
  if (!formData.value?.instrument?.questions) return false
  return formData.value.instrument.questions
    .filter((q: any) => q.isRequired)
    .every((q: any) => answers.value[q.id] && answers.value[q.id]?.trim())
})

const fetchForm = async () => {
  loading.value = true
  try {
    const res = await api.get(`/surveys/${instrumentId}/form/${classCourseId}/${lecturerId}`)
    formData.value = res.data
    // Initialize answers
    for (const q of res.data.instrument.questions) {
      answers.value[q.id] = ''
    }
  } catch (e: any) {
    toast.error(e.response?.data?.message || 'Gagal memuat form survei')
  } finally {
    loading.value = false
  }
}

const handleSubmit = async () => {
  if (!allRequiredAnswered.value) {
    toast.error('Harap isi semua pertanyaan wajib')
    return
  }
  try {
    loading.value = true
    const payload = {
      classCourseId: Number(classCourseId),
      lecturerId: Number(lecturerId),
      answers: Object.entries(answers.value)
        .filter(([, v]) => v && v.trim())
        .map(([questionId, value]) => ({
          questionId: Number(questionId),
          value,
        })),
    }
    await api.post(`/surveys/${instrumentId}/submit`, payload)
    submitted.value = true
  } catch (e: any) {
    toast.error(e.response?.data?.message || 'Gagal mengirim survei')
  } finally {
    loading.value = false
  }
}

const likertLabels = ['', 'Sangat Kurang', 'Kurang', 'Cukup', 'Baik', 'Sangat Baik']
const likertEmojis = ['', '😞', '😕', '😐', '🙂', '😄']

onMounted(fetchForm)
</script>

<template>
  <div class="min-h-screen">
    <!-- Success State -->
    <div v-if="submitted" class="max-w-lg mx-auto py-20 text-center">
      <div class="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl border border-green-200 p-10">
        <div class="w-20 h-20 mx-auto bg-green-100 rounded-full flex items-center justify-center mb-5">
          <CheckCircle class="w-10 h-10 text-green-600" />
        </div>
        <h2 class="text-2xl font-bold text-green-900 mb-2">Terima Kasih!</h2>
        <p class="text-green-700">Evaluasi Anda telah berhasil disimpan. Masukan Anda sangat berharga untuk peningkatan kualitas pengajaran.</p>
        <div v-if="formData && formData.instrument?.redirectUrl" class="mt-6 space-y-3">
          <a :href="formData.instrument.redirectUrl" target="_blank" class="block w-full bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-xl font-medium text-sm transition-colors shadow-sm">
            Lanjutkan ke Halaman Tujuan
          </a>
          <button @click="router.push('/surveys/my-pending')" class="block w-full text-green-700 hover:bg-green-100 px-6 py-2.5 rounded-xl font-medium text-sm transition-colors">
            Kembali ke Daftar Survei
          </button>
        </div>
        
        <button v-else @click="router.push('/surveys/my-pending')" class="mt-6 w-full bg-green-600 hover:bg-green-700 text-white px-6 py-2.5 rounded-xl font-medium text-sm transition-colors">
          Kembali ke Daftar Survei
        </button>
      </div>
    </div>

    <!-- Form -->
    <div v-else class="max-w-2xl mx-auto space-y-6">
      <!-- Header Card -->
      <div class="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl p-6 text-white shadow-xl shadow-purple-200">
        <button @click="router.back()" class="text-white/70 hover:text-white mb-3 flex items-center gap-1 text-sm transition-colors">
          <ArrowLeft class="w-4 h-4" /> Kembali
        </button>
        <h1 class="text-xl font-bold">{{ formData?.instrument?.title || 'Loading...' }}</h1>
        <p v-if="formData?.instrument?.description" class="text-purple-200 text-sm mt-1">{{ formData.instrument.description }}</p>
        <div class="mt-4 flex items-center gap-4 text-sm">
          <div class="bg-white/20 rounded-lg px-3 py-1.5 backdrop-blur-sm">
            <span class="text-purple-200">Matakuliah:</span>
            <span class="font-semibold ml-1">{{ formData?.course?.name }}</span>
          </div>
          <div class="bg-white/20 rounded-lg px-3 py-1.5 backdrop-blur-sm">
            <span class="text-purple-200">Dosen:</span>
            <span class="font-semibold ml-1">{{ formData?.lecturer?.name }}</span>
          </div>
        </div>
      </div>

      <!-- Progress Bar -->
      <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div class="flex items-center justify-between text-sm mb-2">
          <span class="text-gray-600 font-medium">Progress Pengisian</span>
          <span class="text-purple-600 font-bold">{{ progress }}%</span>
        </div>
        <div class="w-full bg-gray-100 rounded-full h-2.5">
          <div class="bg-gradient-to-r from-purple-500 to-indigo-500 h-2.5 rounded-full transition-all duration-500" :style="{ width: progress + '%' }"></div>
        </div>
      </div>

      <!-- Questions -->
      <div v-for="(q, idx) in formData?.instrument?.questions || []" :key="q.id"
        class="bg-white rounded-xl shadow-sm border border-gray-100 p-6 transition-all"
        :class="answers[q.id] ? 'border-purple-200 bg-purple-50/30' : ''"
      >
        <div class="flex items-start gap-3 mb-4">
          <span class="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-100 text-purple-700 text-xs font-bold shrink-0">{{ Number(idx) + 1 }}</span>
          <div>
            <p class="text-gray-900 font-medium">{{ q.text }}</p>
            <span v-if="q.isRequired" class="text-xs text-red-500 font-medium">* Wajib</span>
          </div>
        </div>

        <!-- Likert Scale -->
        <div v-if="q.type === 'likert'" class="flex justify-center gap-3 mt-4">
          <button
            v-for="n in 5"
            :key="n"
            @click="answers[q.id] = n.toString()"
            :class="[
              'flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all min-w-[70px] cursor-pointer',
              answers[q.id] === n.toString()
                ? 'border-purple-500 bg-purple-50 shadow-md shadow-purple-100 scale-105'
                : 'border-gray-200 hover:border-purple-200 hover:bg-purple-50/50'
            ]"
            type="button"
          >
            <span class="text-2xl">{{ likertEmojis[n] }}</span>
            <span :class="['text-xs font-medium', answers[q.id] === n.toString() ? 'text-purple-700' : 'text-gray-500']">
              {{ likertLabels[n] }}
            </span>
          </button>
        </div>

        <!-- Text Input -->
        <div v-else-if="q.type === 'text'" class="mt-3">
          <textarea
            v-model="answers[q.id]"
            rows="3"
            placeholder="Tuliskan jawaban Anda..."
            class="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm resize-none transition-colors"
          />
          <p class="text-xs text-gray-400 mt-1 text-right">{{ (answers[q.id] || '').length }} karakter</p>
        </div>

        <!-- Multiple Choice -->
        <div v-else-if="q.type === 'multiple_choice' && q.options" class="mt-3 space-y-2">
          <button
            v-for="(opt, i) in q.options"
            :key="i"
            @click="answers[q.id] = opt"
            :class="[
              'w-full text-left flex items-center gap-3 p-3 rounded-xl border-2 transition-all cursor-pointer',
              answers[q.id] === opt
                ? 'border-purple-500 bg-purple-50'
                : 'border-gray-200 hover:border-purple-200 hover:bg-gray-50'
            ]"
            type="button"
          >
            <div :class="[
              'w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors',
              answers[q.id] === opt ? 'border-purple-500 bg-purple-500' : 'border-gray-300'
            ]">
              <div v-if="answers[q.id] === opt" class="w-2 h-2 rounded-full bg-white"></div>
            </div>
            <span :class="['text-sm', answers[q.id] === opt ? 'text-purple-700 font-medium' : 'text-gray-700']">{{ opt }}</span>
          </button>
        </div>
      </div>

      <!-- Submit -->
      <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <button
          @click="handleSubmit"
          :disabled="!allRequiredAnswered || loading"
          :class="[
            'w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all',
            allRequiredAnswered
              ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-lg shadow-purple-200'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          ]"
        >
          <Send class="w-4 h-4" />
          {{ loading ? 'Mengirim...' : 'Kirim Evaluasi' }}
        </button>
        <p v-if="!allRequiredAnswered" class="text-xs text-red-500 text-center mt-2">Isi semua pertanyaan wajib sebelum mengirim</p>
      </div>
    </div>
  </div>
</template>

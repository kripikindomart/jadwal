<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '@/lib/api'
import {
  BookOpen, GraduationCap, Calendar, Clock, Users,
  ChevronRight, FileText, CheckCircle2, BarChart3,
} from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()
const token = computed(() => route.params.token as string)

const loading = ref(true)
const error = ref('')
const data = ref<any>(null)
const currentTime = ref(new Date())

// Update clock every minute
setInterval(() => { currentTime.value = new Date() }, 60000)

onMounted(async () => {
  try {
    const res = await api.get(`/portal/dosen/${token.value}`)
    data.value = res.data
  } catch (e: any) {
    error.value = e.response?.data?.message || 'Token tidak valid'
  } finally {
    loading.value = false
  }
})

function openClass(classCourseId: number) {
  router.push(`/dosen/${token.value}/kelas/${classCourseId}`)
}

const totalMeetingsFilled = computed(() => {
  if (!data.value?.classes) return 0
  return data.value.classes.reduce((sum: number, c: any) => sum + c.filledMeetings, 0)
})

const totalMeetingsAll = computed(() => {
  if (!data.value?.classes) return 0
  return data.value.classes.reduce((sum: number, c: any) => sum + c.totalMeetings, 0)
})

const overallProgress = computed(() => {
  if (totalMeetingsAll.value === 0) return 0
  return Math.round((totalMeetingsFilled.value / totalMeetingsAll.value) * 100)
})

const greeting = computed(() => {
  const hour = currentTime.value.getHours()
  if (hour < 11) return 'Selamat Pagi'
  if (hour < 15) return 'Selamat Siang'
  if (hour < 18) return 'Selamat Sore'
  return 'Selamat Malam'
})

const formattedDate = computed(() => {
  return currentTime.value.toLocaleDateString('id-ID', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  })
})
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/30">
    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center min-h-screen">
      <div class="text-center">
        <div class="h-12 w-12 mx-auto mb-4 rounded-full border-4 border-emerald-200 border-t-emerald-600 animate-spin"></div>
        <p class="text-slate-500 text-sm">Memuat portal dosen...</p>
      </div>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="flex items-center justify-center min-h-screen px-4">
      <div class="text-center max-w-sm">
        <div class="h-20 w-20 mx-auto mb-6 rounded-full bg-rose-100 flex items-center justify-center">
          <svg class="h-10 w-10 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
        </div>
        <h2 class="text-xl font-bold text-slate-800 mb-2">Link Tidak Valid</h2>
        <p class="text-sm text-slate-500">{{ error }}</p>
        <p class="text-xs text-slate-400 mt-3">Hubungi admin program studi untuk mendapatkan link portal yang benar.</p>
      </div>
    </div>

    <!-- Portal Content -->
    <div v-else>
      <!-- Top Navigation Bar -->
      <header class="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-slate-100">
        <div class="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="h-9 w-9 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-sm">
              <GraduationCap class="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 class="text-sm font-bold text-slate-800 leading-tight">Portal Dosen</h1>
              <p class="text-xs text-slate-400">{{ data.semester }}</p>
            </div>
          </div>
          <div class="text-right hidden sm:block">
            <p class="text-xs text-slate-400">{{ formattedDate }}</p>
          </div>
        </div>
      </header>

      <main class="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <!-- Welcome Section -->
        <div class="mb-8 rounded-2xl bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-700 p-6 sm:p-8 text-white shadow-lg shadow-emerald-200/50 relative overflow-hidden">
          <!-- Decorative circles -->
          <div class="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/4"></div>
          <div class="absolute bottom-0 left-0 w-40 h-40 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/4"></div>

          <div class="relative">
            <p class="text-emerald-100 text-sm mb-1">{{ greeting }},</p>
            <h2 class="text-xl sm:text-2xl font-bold mb-1">
              {{ data.lecturer?.frontTitle }} {{ data.lecturer?.user?.name }}{{ data.lecturer?.backTitle ? ', ' + data.lecturer.backTitle : '' }}
            </h2>
            <p class="text-emerald-200 text-sm">NIDN: {{ data.lecturer?.nidn || '—' }}</p>

            <!-- Quick Stats -->
            <div class="grid grid-cols-3 gap-4 mt-6">
              <div class="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center">
                <p class="text-2xl font-bold">{{ data.classes?.length || 0 }}</p>
                <p class="text-xs text-emerald-200 mt-0.5">Kelas Diampu</p>
              </div>
              <div class="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center">
                <p class="text-2xl font-bold">{{ totalMeetingsFilled }}</p>
                <p class="text-xs text-emerald-200 mt-0.5">Jurnal Terisi</p>
              </div>
              <div class="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center">
                <p class="text-2xl font-bold">{{ overallProgress }}%</p>
                <p class="text-xs text-emerald-200 mt-0.5">Progress</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Section: Kelas yang Diampu -->
        <div class="mb-6 flex items-center justify-between">
          <h3 class="text-lg font-bold text-slate-800 flex items-center gap-2">
            <BookOpen class="h-5 w-5 text-emerald-600" />
            Kelas yang Diampu
          </h3>
          <span class="text-xs text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">
            {{ data.classes?.length || 0 }} kelas
          </span>
        </div>

        <!-- Empty State -->
        <div v-if="!data.classes?.length" class="rounded-2xl bg-white p-12 text-center border border-slate-100 shadow-sm">
          <div class="h-16 w-16 mx-auto mb-4 rounded-full bg-slate-100 flex items-center justify-center">
            <BookOpen class="h-8 w-8 text-slate-400" />
          </div>
          <p class="text-slate-600 font-medium">Belum ada kelas yang diampu</p>
          <p class="text-sm text-slate-400 mt-1">Hubungi admin untuk penugasan mengajar semester ini.</p>
        </div>

        <!-- Class Cards Grid -->
        <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div
            v-for="cls in data.classes"
            :key="cls.classCourseId"
            @click="openClass(cls.classCourseId)"
            class="group rounded-2xl bg-white border border-slate-100 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer overflow-hidden"
          >
            <!-- Card Header with accent -->
            <div class="h-1.5 bg-gradient-to-r from-emerald-500 to-teal-500 group-hover:h-2 transition-all"></div>

            <div class="p-5">
              <!-- Course name -->
              <h4 class="text-sm font-bold text-slate-800 mb-0.5 group-hover:text-emerald-700 transition-colors line-clamp-2">
                {{ cls.courseName }}
              </h4>
              <p class="text-xs text-slate-500 mb-4">
                {{ cls.className }} · {{ cls.courseCode }} · {{ cls.sks }} SKS
              </p>

              <!-- Stats row -->
              <div class="flex items-center gap-3 mb-4">
                <div class="flex items-center gap-1 text-xs text-slate-500">
                  <FileText class="h-3.5 w-3.5 text-slate-400" />
                  <span>{{ cls.filledMeetings }}/{{ cls.totalMeetings }} jurnal</span>
                </div>
                <div v-if="cls.isPrimary" class="flex items-center gap-1 text-xs text-emerald-600">
                  <CheckCircle2 class="h-3.5 w-3.5" />
                  <span>Pengampu Utama</span>
                </div>
              </div>

              <!-- Progress bar -->
              <div class="mb-4">
                <div class="h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    class="h-full rounded-full transition-all duration-500"
                    :class="[
                      cls.filledMeetings === cls.totalMeetings ? 'bg-emerald-500' :
                      cls.filledMeetings > cls.totalMeetings / 2 ? 'bg-emerald-400' :
                      cls.filledMeetings > 0 ? 'bg-amber-400' : 'bg-slate-200'
                    ]"
                    :style="{ width: `${(cls.filledMeetings / cls.totalMeetings) * 100}%` }"
                  ></div>
                </div>
                <p class="text-right text-[10px] text-slate-400 mt-1">
                  {{ Math.round((cls.filledMeetings / cls.totalMeetings) * 100) }}% selesai
                </p>
              </div>

              <!-- Action button -->
              <button class="w-full flex items-center justify-center gap-2 rounded-xl bg-slate-50 group-hover:bg-emerald-50 py-2.5 text-xs font-semibold text-slate-600 group-hover:text-emerald-700 transition-colors">
                Kelola Kelas
                <ChevronRight class="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="mt-12 pt-6 border-t border-slate-100 text-center">
          <p class="text-xs text-slate-400">
            Portal Dosen · Sistem Informasi Akademik Pascasarjana
          </p>
          <p class="text-[10px] text-slate-300 mt-1">
            Jika ada kendala, hubungi admin program studi Anda.
          </p>
        </div>
      </main>
    </div>
  </div>
</template>

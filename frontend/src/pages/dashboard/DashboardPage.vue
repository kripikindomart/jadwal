<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import api from '@/lib/api'
import {
  Users,
  GraduationCap,
  Calendar,
  BookOpen,
  MapPin,
} from 'lucide-vue-next'

const authStore = useAuthStore()

interface DashboardStats {
  totalStudents: number
  totalLecturers: number
  todayClasses: number
  totalClasses: number
  activeSemester: { id: number; name: string } | null
}

interface SemesterInfo {
  id: number | null
  name: string
  type: string | null
  weekNumber: number | null
}

interface TodayClass {
  id: number
  startTime: string
  endTime: string
  room: string
  className: string
  courseName: string
  courseCode: string
  lecturers: string[]
}

const stats = ref<DashboardStats | null>(null)
const semesterInfo = ref<SemesterInfo | null>(null)
const todayClasses = ref<TodayClass[]>([])
const loading = ref(true)

onMounted(async () => {
  try {
    const [statsRes, semesterRes, classesRes] = await Promise.all([
      api.get('/dashboard/stats'),
      api.get('/dashboard/semester-info'),
      api.get('/dashboard/today-classes'),
    ])
    stats.value = statsRes.data
    semesterInfo.value = semesterRes.data
    todayClasses.value = classesRes.data
  } catch (e) {
    console.error('Failed to load dashboard data:', e)
  } finally {
    loading.value = false
  }
})

const statCards = [
  { key: 'totalStudents', label: 'Total Mahasiswa', icon: Users, color: 'emerald' },
  { key: 'totalLecturers', label: 'Dosen Aktif', icon: GraduationCap, color: 'blue' },
  { key: 'todayClasses', label: 'Kelas Hari Ini', icon: Calendar, color: 'amber' },
  { key: 'totalClasses', label: 'Total Kelas', icon: BookOpen, color: 'violet' },
]

function formatTime(time: string) {
  return time?.slice(0, 5) || ''
}

function isOngoing(startTime: string, endTime: string) {
  const now = new Date()
  const h = now.getHours().toString().padStart(2, '0')
  const m = now.getMinutes().toString().padStart(2, '0')
  const current = `${h}:${m}`
  return current >= startTime.slice(0, 5) && current <= endTime.slice(0, 5)
}
</script>

<template>
  <div>
    <!-- Page Header -->
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-slate-800">
        Halo, {{ authStore.user?.name || 'User' }}! 👋
      </h1>
      <p class="mt-1 text-slate-500" v-if="semesterInfo">
        {{ semesterInfo.name }}
        <span v-if="semesterInfo.weekNumber"> — Minggu ke-{{ semesterInfo.weekNumber }}</span>
      </p>
      <p class="mt-1 text-slate-500" v-else-if="loading">
        Memuat informasi semester...
      </p>
    </div>

    <!-- Stats Grid -->
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 mb-6">
      <div
        v-for="card in statCards"
        :key="card.key"
        class="group relative overflow-hidden rounded-2xl bg-white p-5 shadow-sm border border-slate-100 hover:-translate-y-1 hover:shadow-md transition-all duration-300"
      >
        <!-- Skeleton loading -->
        <div v-if="loading" class="animate-pulse">
          <div class="h-4 w-24 bg-slate-200 rounded mb-3"></div>
          <div class="h-8 w-16 bg-slate-200 rounded"></div>
        </div>

        <!-- Real data -->
        <div v-else class="flex items-start justify-between">
          <div>
            <p class="text-sm font-medium text-slate-500">{{ card.label }}</p>
            <p class="mt-2 text-3xl font-bold text-slate-800">
              {{ stats ? stats[card.key as keyof DashboardStats] : 0 }}
            </p>
          </div>
          <div
            :class="[
              'flex h-12 w-12 items-center justify-center rounded-xl',
              card.color === 'emerald' ? 'bg-emerald-100 text-emerald-600' : '',
              card.color === 'blue' ? 'bg-blue-100 text-blue-600' : '',
              card.color === 'amber' ? 'bg-amber-100 text-amber-600' : '',
              card.color === 'violet' ? 'bg-violet-100 text-violet-600' : '',
            ]"
          >
            <component :is="card.icon" class="h-6 w-6" />
          </div>
        </div>
      </div>
    </div>

    <!-- Today's Classes -->
    <div class="rounded-2xl bg-white p-6 shadow-sm border border-slate-100">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-lg font-semibold text-slate-800">Jadwal Hari Ini</h2>
        <span class="text-sm text-slate-400">
          {{ new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) }}
        </span>
      </div>

      <!-- Loading skeleton -->
      <div v-if="loading" class="space-y-3">
        <div v-for="i in 4" :key="i" class="animate-pulse flex gap-4 p-3 rounded-xl bg-slate-50">
          <div class="h-10 w-24 bg-slate-200 rounded"></div>
          <div class="flex-1 space-y-2">
            <div class="h-4 w-48 bg-slate-200 rounded"></div>
            <div class="h-3 w-32 bg-slate-200 rounded"></div>
          </div>
        </div>
      </div>

      <!-- Empty state -->
      <div v-else-if="todayClasses.length === 0" class="flex flex-col items-center justify-center py-12 text-slate-400">
        <Calendar class="h-12 w-12 mb-3 text-slate-300" />
        <p class="text-sm">Tidak ada kelas terjadwal hari ini</p>
      </div>

      <!-- Class list -->
      <div v-else class="space-y-2">
        <div
          v-for="cls in todayClasses"
          :key="cls.id"
          :class="[
            'flex items-center gap-4 p-3 rounded-xl transition-colors',
            isOngoing(cls.startTime, cls.endTime)
              ? 'bg-emerald-50 border border-emerald-200'
              : 'bg-slate-50 hover:bg-slate-100',
          ]"
        >
          <!-- Time badge -->
          <div
            :class="[
              'flex flex-col items-center justify-center rounded-lg px-3 py-1.5 text-xs font-semibold min-w-[90px]',
              isOngoing(cls.startTime, cls.endTime)
                ? 'bg-emerald-600 text-white'
                : 'bg-white text-slate-600 border border-slate-200',
            ]"
          >
            <span>{{ formatTime(cls.startTime) }}</span>
            <span class="text-[10px] opacity-70">{{ formatTime(cls.endTime) }}</span>
          </div>

          <!-- Course info -->
          <div class="flex-1 min-w-0">
            <p class="text-sm font-semibold text-slate-800 truncate">
              {{ cls.courseName }}
              <span v-if="isOngoing(cls.startTime, cls.endTime)" class="ml-2 inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
                <span class="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Berlangsung
              </span>
            </p>
            <p class="text-xs text-slate-500 mt-0.5">
              {{ cls.className }} · {{ cls.lecturers.join(', ') }}
            </p>
          </div>

          <!-- Room -->
          <div class="flex items-center gap-1 text-xs text-slate-500 shrink-0">
            <MapPin class="h-3.5 w-3.5" />
            {{ cls.room }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

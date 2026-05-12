<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import api from '@/lib/api'
import { GraduationCap, MapPin, Clock } from 'lucide-vue-next'

interface ScheduleItem {
  id: number
  startTime: string
  endTime: string
  room: string
  courseName: string
  courseCode: string
  className: string
  prodi: string
  lecturers: string[]
}

const schedules = ref<ScheduleItem[]>([])
const semester = ref('')
const currentTime = ref(new Date())
const loading = ref(true)

let clockInterval: any = null
let refreshInterval: any = null

onMounted(async () => {
  await fetchData()
  clockInterval = setInterval(() => { currentTime.value = new Date() }, 1000)
  refreshInterval = setInterval(fetchData, 5 * 60 * 1000) // refresh every 5 min
})

onUnmounted(() => {
  if (clockInterval) clearInterval(clockInterval)
  if (refreshInterval) clearInterval(refreshInterval)
})

async function fetchData() {
  try {
    const { data } = await api.get('/display/today-schedule')
    schedules.value = data.schedules || []
    semester.value = data.semester || ''
  } catch (e) {
    console.error('Display fetch error:', e)
  } finally {
    loading.value = false
  }
}

const formattedTime = computed(() => {
  return currentTime.value.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
})

const formattedDate = computed(() => {
  return currentTime.value.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
})

function isOngoing(startTime: string, endTime: string) {
  const now = currentTime.value
  const h = now.getHours().toString().padStart(2, '0')
  const m = now.getMinutes().toString().padStart(2, '0')
  const current = `${h}:${m}`
  return current >= startTime.slice(0, 5) && current <= endTime.slice(0, 5)
}

function isPast(endTime: string) {
  const now = currentTime.value
  const h = now.getHours().toString().padStart(2, '0')
  const m = now.getMinutes().toString().padStart(2, '0')
  return `${h}:${m}` > endTime.slice(0, 5)
}
</script>

<template>
  <div class="min-h-screen bg-slate-900 text-white overflow-hidden">
    <!-- Header -->
    <header class="bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-700 px-8 py-5 flex items-center justify-between shadow-lg">
      <div class="flex items-center gap-4">
        <div class="h-14 w-14 rounded-xl bg-white/10 backdrop-blur flex items-center justify-center">
          <GraduationCap class="h-8 w-8 text-white" />
        </div>
        <div>
          <h1 class="text-xl font-bold tracking-tight">Jadwal Perkuliahan</h1>
          <p class="text-emerald-200 text-sm">Program Pascasarjana · {{ semester }}</p>
        </div>
      </div>
      <div class="text-right">
        <p class="text-4xl font-bold font-mono tracking-wider">{{ formattedTime }}</p>
        <p class="text-emerald-200 text-sm mt-0.5">{{ formattedDate }}</p>
      </div>
    </header>

    <!-- Content -->
    <main class="p-6">
      <!-- Loading -->
      <div v-if="loading" class="flex items-center justify-center h-[70vh]">
        <div class="h-12 w-12 rounded-full border-4 border-emerald-800 border-t-emerald-400 animate-spin"></div>
      </div>

      <!-- Empty -->
      <div v-else-if="schedules.length === 0" class="flex flex-col items-center justify-center h-[70vh] text-slate-400">
        <Clock class="h-16 w-16 mb-4 text-slate-600" />
        <p class="text-xl font-medium">Tidak ada jadwal hari ini</p>
      </div>

      <!-- Schedule Table -->
      <div v-else class="rounded-2xl overflow-hidden border border-slate-700/50 shadow-2xl">
        <table class="w-full">
          <thead>
            <tr class="bg-slate-800/80 text-slate-300 text-xs uppercase tracking-wider">
              <th class="py-4 px-5 text-left font-semibold">Waktu</th>
              <th class="py-4 px-5 text-left font-semibold">Mata Kuliah</th>
              <th class="py-4 px-5 text-left font-semibold">Kelas</th>
              <th class="py-4 px-5 text-left font-semibold">Dosen</th>
              <th class="py-4 px-5 text-left font-semibold">Ruangan</th>
              <th class="py-4 px-5 text-center font-semibold">Status</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-800/50">
            <tr v-for="item in schedules" :key="item.id"
              :class="[
                'transition-colors',
                isOngoing(item.startTime, item.endTime) ? 'bg-emerald-900/30' :
                isPast(item.endTime) ? 'bg-slate-800/20 opacity-50' : 'bg-slate-800/5 hover:bg-slate-800/20'
              ]">
              <td class="py-4 px-5">
                <div class="flex items-center gap-2">
                  <span v-if="isOngoing(item.startTime, item.endTime)" class="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span class="text-sm font-bold font-mono">{{ item.startTime?.slice(0,5) }}</span>
                  <span class="text-slate-500 text-xs">—</span>
                  <span class="text-sm font-mono text-slate-400">{{ item.endTime?.slice(0,5) }}</span>
                </div>
              </td>
              <td class="py-4 px-5">
                <p class="text-sm font-semibold text-white">{{ item.courseName }}</p>
                <p class="text-xs text-slate-400 mt-0.5">{{ item.courseCode }} · {{ item.prodi }}</p>
              </td>
              <td class="py-4 px-5">
                <span class="text-sm text-slate-300">{{ item.className }}</span>
              </td>
              <td class="py-4 px-5">
                <p class="text-sm text-slate-300">{{ item.lecturers.join(', ') || '—' }}</p>
              </td>
              <td class="py-4 px-5">
                <span class="inline-flex items-center gap-1 text-sm text-slate-300">
                  <MapPin class="h-3.5 w-3.5 text-slate-500" />
                  {{ item.room }}
                </span>
              </td>
              <td class="py-4 px-5 text-center">
                <span v-if="isOngoing(item.startTime, item.endTime)"
                  class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <span class="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  BERLANGSUNG
                </span>
                <span v-else-if="isPast(item.endTime)"
                  class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-slate-700/50 text-slate-500">
                  SELESAI
                </span>
                <span v-else
                  class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-slate-700/50 text-slate-400">
                  MENUNGGU
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </main>

    <!-- Footer ticker -->
    <footer class="fixed bottom-0 left-0 right-0 bg-slate-800/90 backdrop-blur border-t border-slate-700/50 py-2 px-6">
      <p class="text-xs text-slate-400 text-center">
        Sistem Informasi Akademik Pascasarjana · Data diperbarui otomatis setiap 5 menit
      </p>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import api from '@/lib/api'
import { Clock, Play, Square, Loader2 } from 'lucide-vue-next'

interface TodaySchedule {
  id: number
  classCourseId: number
  startTime: string
  endTime: string
  room: string
  className: string
  courseName: string
  lecturers: string[]
  status: 'ongoing' | 'pending' | 'done' | 'absent'
  attendanceLog: {
    id: number
    clockInTime: string
    clockOutTime: string | null
    durationMinutes: number | null
  } | null
}

const schedules = ref<TodaySchedule[]>([])
const loading = ref(true)
const actionLoading = ref<number | null>(null)

onMounted(() => loadData())

async function loadData() {
  loading.value = true
  try {
    const { data } = await api.get('/attendance/today')
    schedules.value = data
  } catch (e) {
    console.error('Failed to load attendance data:', e)
  } finally {
    loading.value = false
  }
}

async function clockIn(classCourseId: number) {
  actionLoading.value = classCourseId
  try {
    await api.post('/attendance/clock-in', { classCourseId })
    await loadData()
  } catch (e: any) {
    alert(e.response?.data?.message || 'Gagal clock-in')
  } finally {
    actionLoading.value = null
  }
}

async function clockOut(logId: number) {
  actionLoading.value = logId
  try {
    await api.patch(`/attendance/${logId}/clock-out`)
    await loadData()
  } catch (e: any) {
    alert(e.response?.data?.message || 'Gagal clock-out')
  } finally {
    actionLoading.value = null
  }
}

async function setBySchedule(_logId: number, _scheduleId: number) {
  actionLoading.value = _logId
  try {
    await api.patch(`/attendance/${_logId}/set-by-schedule`, { scheduleId: _scheduleId })
    await loadData()
  } catch (e: any) {
    alert(e.response?.data?.message || 'Gagal set sesuai jadwal')
  } finally {
    actionLoading.value = null
  }
}

function formatTime(time: string) {
  return time?.slice(0, 5) || ''
}

function formatDateTime(dt: string) {
  if (!dt) return '-'
  return new Date(dt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
}

const statusConfig = {
  ongoing: { label: 'Sedang Mengajar', class: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' },
  pending: { label: 'Belum Hadir', class: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500' },
  done: { label: 'Selesai', class: 'bg-slate-100 text-slate-600', dot: 'bg-slate-400' },
  absent: { label: 'Tidak Hadir', class: 'bg-rose-100 text-rose-700', dot: 'bg-rose-500' },
}
</script>

<template>
  <div>
    <!-- Page Header -->
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-slate-800 flex items-center gap-2">
        <Clock class="h-6 w-6 text-emerald-600" />
        Monitoring Kehadiran Dosen
      </h1>
      <p class="mt-1 text-slate-500">
        {{ new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) }}
      </p>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="space-y-3">
      <div v-for="i in 5" :key="i" class="animate-pulse rounded-xl bg-white p-4 border border-slate-100">
        <div class="flex gap-4">
          <div class="h-12 w-20 bg-slate-200 rounded"></div>
          <div class="flex-1 space-y-2">
            <div class="h-4 w-48 bg-slate-200 rounded"></div>
            <div class="h-3 w-32 bg-slate-200 rounded"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty state -->
    <div v-else-if="schedules.length === 0" class="rounded-2xl bg-white p-12 shadow-sm border border-slate-100 text-center">
      <Clock class="h-12 w-12 mx-auto mb-3 text-slate-300" />
      <p class="text-slate-500">Tidak ada kelas terjadwal hari ini</p>
    </div>

    <!-- Schedule list -->
    <div v-else class="space-y-3">
      <div
        v-for="item in schedules"
        :key="item.id"
        class="rounded-xl bg-white p-4 shadow-sm border border-slate-100"
      >
        <div class="flex items-center gap-4">
          <!-- Time -->
          <div class="text-center min-w-[80px]">
            <p class="text-sm font-bold text-slate-800">{{ formatTime(item.startTime) }}</p>
            <p class="text-xs text-slate-400">{{ formatTime(item.endTime) }}</p>
          </div>

          <!-- Info -->
          <div class="flex-1 min-w-0">
            <p class="text-sm font-semibold text-slate-800 truncate">{{ item.courseName }}</p>
            <p class="text-xs text-slate-500">{{ item.className }} · {{ item.room }} · {{ item.lecturers.join(', ') }}</p>
          </div>

          <!-- Status badge -->
          <div :class="['inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium', statusConfig[item.status].class]">
            <span :class="['h-1.5 w-1.5 rounded-full', statusConfig[item.status].dot, item.status === 'ongoing' ? 'animate-pulse' : '']"></span>
            {{ statusConfig[item.status].label }}
          </div>

          <!-- Actions -->
          <div class="flex items-center gap-2 shrink-0">
            <!-- Clock In -->
            <button
              v-if="item.status === 'pending' || item.status === 'absent'"
              @click="clockIn(item.classCourseId)"
              :disabled="actionLoading === item.classCourseId"
              class="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              <Loader2 v-if="actionLoading === item.classCourseId" class="h-3 w-3 animate-spin" />
              <Play v-else class="h-3 w-3" />
              Mulai
            </button>

            <!-- Clock Out -->
            <button
              v-if="item.status === 'ongoing' && item.attendanceLog"
              @click="clockOut(item.attendanceLog!.id)"
              :disabled="actionLoading === item.attendanceLog!.id"
              class="inline-flex items-center gap-1 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-rose-700 disabled:opacity-50"
            >
              <Loader2 v-if="actionLoading === item.attendanceLog!.id" class="h-3 w-3 animate-spin" />
              <Square v-else class="h-3 w-3" />
              Selesai
            </button>

            <!-- Set by Schedule -->
            <button
              v-if="(item.status === 'pending' || item.status === 'absent') && !item.attendanceLog"
              @click="clockIn(item.classCourseId)"
              class="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
              title="Set sesuai jadwal"
            >
              <CalendarClock class="h-3 w-3" />
            </button>

            <!-- Duration display -->
            <span v-if="item.status === 'done' && item.attendanceLog?.durationMinutes" class="text-xs text-slate-400">
              {{ item.attendanceLog.durationMinutes }} menit
            </span>
          </div>
        </div>

        <!-- Clock in/out times -->
        <div v-if="item.attendanceLog" class="mt-2 ml-[96px] text-xs text-slate-400">
          Masuk: {{ formatDateTime(item.attendanceLog.clockInTime) }}
          <span v-if="item.attendanceLog.clockOutTime"> · Keluar: {{ formatDateTime(item.attendanceLog.clockOutTime) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

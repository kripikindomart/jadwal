<script setup lang="ts">
import { useAuthStore } from '@/stores/auth'
import {
  Users,
  GraduationCap,
  Calendar,
  Megaphone,
  TrendingUp,
  Clock,
} from 'lucide-vue-next'

const authStore = useAuthStore()

const stats = [
  { label: 'Total Mahasiswa', value: '248', change: '+12%', icon: Users, color: 'emerald' },
  { label: 'Dosen Aktif', value: '36', change: '+3', icon: GraduationCap, color: 'blue' },
  { label: 'Kelas Hari Ini', value: '12', change: null, icon: Calendar, color: 'amber' },
  { label: 'Pengumuman Baru', value: '5', change: null, icon: Megaphone, color: 'rose' },
]

const recentActivities = [
  { text: 'Dr. Budi mengisi jurnal pertemuan ke-8 — Metode Penelitian', time: '2 jam lalu' },
  { text: 'Staff Prodi Informatika melakukan clock-in untuk kelas Algoritma', time: '3 jam lalu' },
  { text: 'Mahasiswa baru didaftarkan — 12 orang (S2 Informatika)', time: '5 jam lalu' },
  { text: 'Jadwal semester Genap 2025/2026 telah dipublish', time: '1 hari lalu' },
  { text: 'Survei evaluasi dosen berakhir — 89% response rate', time: '2 hari lalu' },
]
</script>

<template>
  <div>
    <!-- Page Header -->
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-slate-800">
        Halo, {{ authStore.user?.name || 'User' }}! 👋
      </h1>
      <p class="mt-1 text-slate-500">
        Semester Ganjil 2025/2026 — Minggu ke-8
      </p>
    </div>

    <!-- Stats Grid -->
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 mb-6">
      <div
        v-for="stat in stats"
        :key="stat.label"
        class="group relative overflow-hidden rounded-2xl bg-white p-5 shadow-sm border border-slate-100 hover:-translate-y-1 hover:shadow-md transition-all duration-300"
      >
        <div class="flex items-start justify-between">
          <div>
            <p class="text-sm font-medium text-slate-500">{{ stat.label }}</p>
            <p class="mt-2 text-3xl font-bold text-slate-800">{{ stat.value }}</p>
            <p v-if="stat.change" class="mt-1 text-xs font-medium text-emerald-600 flex items-center gap-1">
              <TrendingUp class="h-3 w-3" />
              {{ stat.change }} dari semester lalu
            </p>
          </div>
          <div
            :class="[
              'flex h-12 w-12 items-center justify-center rounded-xl',
              stat.color === 'emerald' ? 'bg-emerald-100 text-emerald-600' : '',
              stat.color === 'blue' ? 'bg-blue-100 text-blue-600' : '',
              stat.color === 'amber' ? 'bg-amber-100 text-amber-600' : '',
              stat.color === 'rose' ? 'bg-rose-100 text-rose-600' : '',
            ]"
          >
            <component :is="stat.icon" class="h-6 w-6" />
          </div>
        </div>
      </div>
    </div>

    <!-- Content Grid -->
    <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <!-- Chart Placeholder -->
      <div class="lg:col-span-2 rounded-2xl bg-white p-6 shadow-sm border border-slate-100">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-semibold text-slate-800">Statistik Kehadiran</h2>
          <select class="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20">
            <option>Minggu Ini</option>
            <option>Bulan Ini</option>
            <option>Semester Ini</option>
          </select>
        </div>
        <div class="flex h-64 items-center justify-center rounded-xl bg-slate-50 text-slate-400 text-sm">
          <div class="text-center">
            <Calendar class="h-12 w-12 mx-auto mb-3 text-slate-300" />
            <p>Chart akan ditampilkan di sini</p>
            <p class="text-xs mt-1 text-slate-400">Integrasi chart library (Chart.js / Apache ECharts)</p>
          </div>
        </div>
      </div>

      <!-- Recent Activities -->
      <div class="rounded-2xl bg-white p-6 shadow-sm border border-slate-100">
        <h2 class="mb-4 text-lg font-semibold text-slate-800">Aktivitas Terakhir</h2>
        <div class="space-y-4">
          <div
            v-for="(activity, index) in recentActivities"
            :key="index"
            class="flex gap-3"
          >
            <div class="mt-1.5 flex h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
            <div class="flex-1 min-w-0">
              <p class="text-sm text-slate-700 leading-relaxed">{{ activity.text }}</p>
              <p class="mt-0.5 flex items-center gap-1 text-xs text-slate-400">
                <Clock class="h-3 w-3" />
                {{ activity.time }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

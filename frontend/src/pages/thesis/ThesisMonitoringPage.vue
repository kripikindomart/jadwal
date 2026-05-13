<script setup lang="ts">
import { ref, onMounted } from 'vue'
import api from '@/lib/api'
import { BarChart3, AlertTriangle, CheckCircle2, Users, Clock } from 'lucide-vue-next'

const loading = ref(true)
const data = ref<any>(null)

onMounted(async () => {
  try {
    const res = await api.get('/thesis/monitoring')
    data.value = res.data
  } catch (e) { console.error(e) }
  finally { loading.value = false }
})

const statusLabels: Record<string, string> = {
  SUBMITTED: 'Diajukan',
  TITLE_APPROVED: 'Judul OK',
  SUPERVISOR_ASSIGNED: 'Pembimbing OK',
  PROPOSAL_GUIDANCE: 'Bimbingan Proposal',
  PROPOSAL_PASSED: 'Proposal Lulus',
  THESIS_GUIDANCE: 'Bimbingan Tesis',
  RESULT_PASSED: 'Seminar Hasil Lulus',
  REVISION: 'Revisi',
  COMPLETED: 'Selesai',
}
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-2xl font-bold text-slate-800 flex items-center gap-2">
        <BarChart3 class="h-6 w-6 text-violet-600" />
        Monitoring Tugas Akhir
      </h1>
      <p class="text-sm text-slate-500 mt-1">Dashboard progress mahasiswa bimbingan.</p>
    </div>

    <div v-if="loading" class="text-center py-12 text-slate-400">Memuat...</div>

    <div v-else-if="data">
      <!-- Stats -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div class="rounded-xl bg-white border border-slate-100 shadow-sm p-4 text-center">
          <p class="text-3xl font-bold text-slate-800">{{ data.total }}</p>
          <p class="text-xs text-slate-500 mt-1">Total Tugas Akhir</p>
        </div>
        <div class="rounded-xl bg-white border border-slate-100 shadow-sm p-4 text-center">
          <p class="text-3xl font-bold text-emerald-600">{{ data.completedCount }}</p>
          <p class="text-xs text-slate-500 mt-1">Selesai</p>
        </div>
        <div class="rounded-xl bg-white border border-slate-100 shadow-sm p-4 text-center">
          <p class="text-3xl font-bold text-amber-600">{{ data.activeCount }}</p>
          <p class="text-xs text-slate-500 mt-1">Aktif/Berjalan</p>
        </div>
        <div class="rounded-xl bg-white border border-slate-100 shadow-sm p-4 text-center">
          <p class="text-3xl font-bold text-rose-600">{{ data.alerts?.length || 0 }}</p>
          <p class="text-xs text-slate-500 mt-1">Perlu Perhatian</p>
        </div>
      </div>

      <!-- Status Distribution -->
      <div class="rounded-2xl bg-white border border-slate-100 shadow-sm p-6">
        <h2 class="text-base font-bold text-slate-800 mb-4">Distribusi Status</h2>
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div v-for="(count, status) in data.statusCounts" :key="status" class="p-3 bg-slate-50 rounded-lg text-center">
            <p class="text-lg font-bold text-slate-800">{{ count }}</p>
            <p class="text-[11px] text-slate-500">{{ statusLabels[status as string] || status }}</p>
          </div>
        </div>
      </div>

      <!-- Alerts -->
      <div v-if="data.alerts?.length" class="rounded-2xl bg-white border border-rose-100 shadow-sm p-6">
        <h2 class="text-base font-bold text-rose-700 flex items-center gap-2 mb-4">
          <AlertTriangle class="h-5 w-5" />
          Mahasiswa Perlu Perhatian (Tidak Bimbingan > 3 Bulan)
        </h2>
        <div class="space-y-2">
          <div v-for="alert in data.alerts" :key="alert.thesisId" class="flex items-center justify-between p-3 bg-rose-50 rounded-lg">
            <div>
              <p class="text-sm font-medium text-slate-800">{{ alert.title }}</p>
              <p class="text-xs text-slate-500">Status: {{ statusLabels[alert.status] || alert.status }}</p>
            </div>
            <div class="text-right">
              <p class="text-xs text-rose-600 font-medium">
                {{ alert.lastGuidance ? `Terakhir: ${new Date(alert.lastGuidance).toLocaleDateString('id-ID')}` : 'Belum pernah bimbingan' }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '@/lib/api'
import { ArrowLeft, Circle, CheckCircle2, Clock, AlertCircle } from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()
const id = Number(route.params.id)

const loading = ref(true)
const thesis = ref<any>(null)

const statusConfig: Record<string, { label: string; class: string; icon: any }> = {
  DRAFT: { label: 'Draft', class: 'bg-slate-100 text-slate-600', icon: Circle },
  SUBMITTED: { label: 'Diajukan', class: 'bg-blue-100 text-blue-700', icon: Clock },
  TITLE_APPROVED: { label: 'Judul Disetujui', class: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 },
  SUPERVISOR_ASSIGNED: { label: 'Pembimbing Ditetapkan', class: 'bg-teal-100 text-teal-700', icon: CheckCircle2 },
  PROPOSAL_GUIDANCE: { label: 'Bimbingan Proposal', class: 'bg-amber-100 text-amber-700', icon: Clock },
  PROPOSAL_PASSED: { label: 'Proposal Lulus', class: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 },
  THESIS_GUIDANCE: { label: 'Bimbingan Tesis', class: 'bg-amber-100 text-amber-700', icon: Clock },
  RESULT_PASSED: { label: 'Seminar Hasil Lulus', class: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 },
  REVISION: { label: 'Revisi', class: 'bg-orange-100 text-orange-700', icon: AlertCircle },
  COMPLETED: { label: 'Selesai', class: 'bg-green-100 text-green-800', icon: CheckCircle2 },
}

const isEditable = computed(() => ['DRAFT', 'SUBMITTED', 'REVISION'].includes(thesis.value?.status))

onMounted(async () => {
  try {
    const res = await api.get('/guidance/my-thesis')
    const list = res.data || []
    thesis.value = list.find((t: any) => Number(t.id) === id) || null
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div>
    <div class="mb-6">
      <button @click="router.push('/my-thesis')" class="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-3">
        <ArrowLeft class="h-4 w-4" /> Kembali ke Riwayat
      </button>
      <h1 class="text-2xl font-bold text-slate-900">Detail Pengajuan Proposal</h1>
    </div>

    <div v-if="loading" class="text-center py-12 text-slate-500">Memuat data...</div>
    <div v-else-if="!thesis" class="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
      Data pengajuan tidak ditemukan.
    </div>
    <div v-else class="space-y-5">
      <div class="rounded-2xl bg-white border border-slate-100 shadow-sm p-6">
        <div class="flex items-start justify-between gap-4">
          <div>
            <p class="text-xl font-bold text-slate-900">{{ thesis.title }}</p>
            <p v-if="thesis.titleEn" class="text-sm text-slate-500 italic mt-1">{{ thesis.titleEn }}</p>
          </div>
          <span :class="['inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold', statusConfig[thesis.status]?.class || 'bg-slate-100 text-slate-500']">
            <component :is="statusConfig[thesis.status]?.icon || Circle" class="h-3.5 w-3.5" />
            {{ statusConfig[thesis.status]?.label || thesis.status }}
          </span>
        </div>
      </div>

      <div class="rounded-2xl bg-white border border-slate-100 shadow-sm p-6 space-y-4">
        <div>
          <p class="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">Abstrak</p>
          <p class="text-sm text-slate-700 leading-relaxed">{{ thesis.abstract || '-' }}</p>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div><span class="text-slate-500">Jenis:</span> <span class="font-semibold text-slate-700">{{ thesis.type || '-' }}</span></div>
          <div><span class="text-slate-500">Konsentrasi:</span> <span class="font-semibold text-slate-700">{{ thesis.concentration || '-' }}</span></div>
          <div><span class="text-slate-500">Pembimbing Utama:</span> <span class="font-semibold text-slate-700">{{ thesis.requestedSupervisorName1 || '-' }}</span></div>
          <div><span class="text-slate-500">Pembimbing Pendamping:</span> <span class="font-semibold text-slate-700">{{ thesis.requestedSupervisorName2 || '-' }}</span></div>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <a v-if="thesis.documentUrl" :href="thesis.documentUrl" target="_blank" class="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700">
            Lihat Dokumen Proposal
          </a>
          <a v-if="thesis.plagiarismUrl" :href="thesis.plagiarismUrl" target="_blank" class="inline-flex items-center justify-center rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            Lihat Hasil Plagiarisme
          </a>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <button v-if="isEditable" @click="router.push('/my-thesis')" class="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
          Edit dari Halaman Pengajuan
        </button>
        <button @click="router.push('/my-guidance')" class="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
          Buka Proses Bimbingan
        </button>
      </div>
    </div>
  </div>
</template>

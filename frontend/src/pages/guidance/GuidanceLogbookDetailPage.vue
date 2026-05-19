<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '@/lib/api'
import { ArrowLeft, Loader2, FileText, Download } from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()

const loading = ref(true)
const logs = ref<any[]>([])

const studentId = computed(() => Number(route.params.studentId))
const studentName = computed(() => String(route.query.name || logs.value[0]?.studentName || 'Mahasiswa'))

const statusConfig: Record<string, { label: string; class: string }> = {
  PENDING: { label: 'Menunggu Feedback', class: 'bg-amber-50 text-amber-700 border border-amber-200' },
  APPROVED: { label: 'Selesai', class: 'bg-emerald-50 text-emerald-700 border border-emerald-200' },
  REJECTED: { label: 'Revisi', class: 'bg-rose-50 text-rose-700 border border-rose-200' },
}

const formatAttachmentName = (url: string) => {
  if (!url) return ''
  const parts = url.split('/')
  return parts[parts.length - 1] || 'Dokumen Lampiran'
}

const monthShort = (date: string) =>
  new Date(date).toLocaleDateString('id-ID', { month: 'short' }).toUpperCase()

const dayNumber = (date: string) => new Date(date).toLocaleDateString('id-ID', { day: '2-digit' })

async function fetchLogs() {
  loading.value = true
  try {
    const { data } = await api.get(`/guidance/logbook/student/${studentId.value}`)
    logs.value = data || []
  } finally {
    loading.value = false
  }
}

const summary = computed(() => ({
  total: logs.value.length,
  pending: logs.value.filter((l: any) => l.status === 'PENDING').length,
  approved: logs.value.filter((l: any) => l.status === 'APPROVED').length,
  rejected: logs.value.filter((l: any) => l.status === 'REJECTED').length,
}))

onMounted(fetchLogs)
</script>

<template>
  <div class="space-y-5 max-w-[1300px] mx-auto p-4 md:p-6 text-slate-800">
    <div class="flex items-center gap-3">
      <button
        @click="router.push('/guidance')"
        class="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100"
      >
        <ArrowLeft class="h-4 w-4" />
      </button>
      <h1 class="text-xl font-bold text-slate-900">Logbook Mahasiswa</h1>
    </div>

    <div v-if="loading" class="bg-white rounded-2xl border border-slate-200 p-10 text-center text-slate-400">
      <Loader2 class="h-8 w-8 mx-auto animate-spin mb-2 text-blue-700" />
      Memuat riwayat logbook...
    </div>

    <div v-else-if="!logs.length" class="bg-white rounded-2xl border border-slate-200 p-10 text-center text-slate-500">
      Belum ada logbook mahasiswa ini.
    </div>

    <div v-else class="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
      <div class="lg:col-span-2 space-y-5">
        <div class="bg-white rounded-2xl border border-slate-200 p-5 flex items-center justify-between gap-4">
          <div>
            <p class="text-sm font-semibold tracking-wide text-blue-700 uppercase">Mahasiswa Bimbingan</p>
            <p class="text-xl font-bold text-slate-900 leading-tight mt-1">{{ studentName }}</p>
            <p class="text-sm text-slate-600 mt-1">{{ logs[0]?.studentNim || '-' }}</p>
            <p class="text-base text-slate-700 mt-2 leading-relaxed">{{ logs[0]?.thesisTitle || '-' }}</p>
          </div>
          <div class="w-full max-w-[240px]">
            <div class="flex items-center justify-between mb-2">
              <p class="text-sm font-medium text-slate-700">Progress Tesis</p>
              <p class="text-xl font-bold text-blue-700">{{ Math.round((summary.approved / (summary.total || 1)) * 100) }}%</p>
            </div>
            <div class="h-2 rounded-full bg-slate-200 overflow-hidden">
              <div class="h-full bg-blue-700 rounded-full" :style="{ width: `${Math.round((summary.approved / (summary.total || 1)) * 100)}%` }"></div>
            </div>
          </div>
        </div>

        <div class="space-y-4">
          <h3 class="text-xl font-bold text-slate-900">Daftar Logbook</h3>

          <div v-for="log in logs" :key="log.id" class="bg-white rounded-2xl border border-slate-200 p-5">
            <div class="flex gap-4">
              <div class="shrink-0 h-16 w-16 rounded-xl bg-blue-50 text-blue-900 border border-blue-100 flex flex-col items-center justify-center leading-none">
                <span class="text-xl font-bold">{{ dayNumber(log.date) }}</span>
                <span class="text-xs font-semibold tracking-wide mt-1">{{ monthShort(log.date) }}</span>
              </div>

              <div class="min-w-0 flex-1">
                <div class="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                  <div class="min-w-0">
                    <h4 class="text-lg md:text-xl leading-tight font-semibold text-slate-900">
                      {{ log.topic || '-' }}
                    </h4>
                    <div class="mt-2 flex flex-wrap items-center gap-2 text-sm">
                      <span
                        :class="[
                          'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold',
                          statusConfig[log.status]?.class || 'bg-slate-100 text-slate-500 border border-slate-200'
                        ]"
                      >
                        {{ statusConfig[log.status]?.label || log.status }}
                      </span>
                      <span class="text-slate-400">•</span>
                      <span class="text-slate-600">{{ log.startTime?.slice(0, 5) || '--:--' }}</span>
                    </div>
                  </div>

                  <button
                    v-if="log.status !== 'APPROVED'"
                    @click="router.push({ name: 'guidance.logbook.review', params: { logbookId: log.id } })"
                    class="inline-flex h-9 items-center justify-center rounded-lg bg-blue-700 px-3 text-sm font-semibold text-white hover:bg-blue-800"
                  >
                    Berikan Feedback
                  </button>
                </div>

                <p class="mt-4 text-base leading-relaxed text-slate-700 line-clamp-3">
                  {{ log.studentProgress || '-' }}
                </p>

                <div v-if="log.attachmentUrl" class="mt-4 flex flex-wrap gap-2">
                  <a
                    :href="log.attachmentUrl"
                    target="_blank"
                    class="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                  >
                    <FileText class="h-4 w-4" />
                    <span>{{ formatAttachmentName(log.attachmentUrl) }}</span>
                    <Download class="h-4 w-4" />
                  </a>
                </div>

                <div
                  v-if="log.reviewerNotes || log.nextSteps"
                  class="mt-4 rounded-xl border-l-4 border-blue-600 bg-blue-50/60 px-4 py-3"
                >
                  <p class="text-sm font-semibold text-blue-700">Feedback Dosen Pembimbing</p>
                  <p v-if="log.reviewerNotes" class="mt-2 text-sm text-slate-700 whitespace-pre-line" v-html="log.reviewerNotes"></p>
                  <p v-if="log.nextSteps" class="mt-2 text-sm text-slate-700">
                    {{ log.nextSteps }}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="space-y-5">
        <div class="bg-white rounded-2xl border border-slate-200 p-5">
          <div class="flex items-center justify-between mb-3">
            <h4 class="text-sm font-semibold text-slate-500 uppercase tracking-wider">Ringkasan Bimbingan</h4>
            <span class="text-sm font-semibold text-blue-700">{{ summary.total }} Logs</span>
          </div>
          <div class="grid grid-cols-2 gap-2 text-sm">
            <div class="rounded-lg border border-slate-200 px-3 py-2">
              <p class="text-xs text-slate-500">Pertemuan</p>
              <p class="text-2xl font-bold text-blue-700">{{ summary.total }}</p>
            </div>
            <div class="rounded-lg border border-slate-200 px-3 py-2">
              <p class="text-xs text-slate-500">Revisi</p>
              <p class="text-2xl font-bold text-rose-600">{{ summary.rejected }}</p>
            </div>
            <div class="rounded-lg border border-slate-200 px-3 py-2">
              <p class="text-xs text-slate-500">Pending</p>
              <p class="text-2xl font-bold text-amber-600">{{ summary.pending }}</p>
            </div>
            <div class="rounded-lg border border-slate-200 px-3 py-2">
              <p class="text-xs text-slate-500">Selesai</p>
              <p class="text-2xl font-bold text-emerald-600">{{ summary.approved }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

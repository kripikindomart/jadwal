<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '@/lib/api'
import { ArrowLeft, Loader2, FileText, Download } from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()

const loading = ref(true)
const logs = ref<any[]>([])
const selectedId = ref<number | null>(null)

const studentId = computed(() => Number(route.params.studentId))
const studentName = computed(() => String(route.query.name || logs.value[0]?.studentName || 'Mahasiswa'))

const selectedLog = computed(() => {
  if (!logs.value.length) return null
  if (!selectedId.value) return logs.value[0]
  return logs.value.find((it: any) => it.id === selectedId.value) || logs.value[0]
})

const statusConfig: Record<string, { label: string; class: string }> = {
  PENDING: { label: 'Pending Review', class: 'bg-amber-50 text-amber-700 border border-amber-200' },
  APPROVED: { label: 'Disetujui', class: 'bg-emerald-50 text-emerald-700 border border-emerald-200' },
  REJECTED: { label: 'Revisi', class: 'bg-rose-50 text-rose-700 border border-rose-200' },
}

const formatAttachmentName = (url: string) => {
  if (!url) return ''
  const parts = url.split('/')
  return parts[parts.length - 1] || 'Dokumen Lampiran'
}

async function fetchLogs() {
  loading.value = true
  try {
    const { data } = await api.get(`/guidance/logbook/student/${studentId.value}`)
    logs.value = data || []
    selectedId.value = logs.value[0]?.id || null
  } finally {
    loading.value = false
  }
}

onMounted(fetchLogs)
</script>

<template>
  <div class="space-y-5 max-w-[1300px] mx-auto p-4 md:p-6 text-slate-800">
    <div class="flex items-center gap-3">
      <button @click="router.push('/guidance')" class="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100">
        <ArrowLeft class="h-4 w-4" />
      </button>
      <h1 class="text-2xl font-extrabold text-slate-900">Logbook Details</h1>
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
            <p class="text-sm font-semibold text-slate-500">Mahasiswa</p>
            <p class="text-2xl font-extrabold text-slate-900 leading-tight mt-1">{{ studentName }}</p>
            <p class="text-sm text-slate-500 mt-1">{{ selectedLog?.studentNim || '-' }}</p>
            <p class="text-sm text-slate-700 mt-2 line-clamp-2">{{ selectedLog?.thesisTitle || '-' }}</p>
          </div>
          <span :class="['inline-flex items-center px-3 py-1 rounded-full text-xs font-bold leading-none uppercase tracking-wider', statusConfig[selectedLog?.status]?.class || 'bg-slate-100 text-slate-500 border border-slate-200']">
            {{ statusConfig[selectedLog?.status]?.label || selectedLog?.status }}
          </span>
        </div>

        <div v-if="selectedLog" class="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
          <div class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <p class="text-xs font-bold text-slate-500 uppercase">Meeting Date</p>
              <p class="text-xl font-extrabold text-slate-900">
                {{ new Date(selectedLog.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) }}
              </p>
            </div>
            <div>
              <p class="text-xs font-bold text-slate-500 uppercase">Meeting Type</p>
              <p class="text-base font-semibold text-slate-800">{{ selectedLog.meetingType || 'Tatap Muka' }}</p>
            </div>
          </div>

          <div>
            <p class="text-xs font-bold text-slate-500 uppercase">Discussion Topic</p>
            <h4 class="text-2xl font-extrabold text-slate-900 leading-tight mt-1">{{ selectedLog.topic || '-' }}</h4>
          </div>

          <div>
            <p class="text-xs font-bold text-slate-500 uppercase">Progress Details</p>
            <p class="text-sm text-slate-800 mt-2 whitespace-pre-line">{{ selectedLog.studentProgress || '-' }}</p>
            <div v-if="selectedLog.notes" class="prose prose-slate max-w-none mt-3 text-sm" v-html="selectedLog.notes"></div>
          </div>

          <div v-if="selectedLog.reviewerNotes || selectedLog.nextSteps" class="bg-slate-50 border border-slate-200 rounded-xl p-4">
            <p class="text-xs font-bold text-slate-600 uppercase">Lecturer Notes</p>
            <p v-if="selectedLog.reviewerNotes" class="text-sm text-slate-700 mt-2 whitespace-pre-line" v-html="selectedLog.reviewerNotes"></p>
            <p v-if="selectedLog.nextSteps" class="text-sm text-slate-700 mt-2"><span class="font-semibold">Next step:</span> {{ selectedLog.nextSteps }}</p>
          </div>

          <div v-if="selectedLog.attachmentUrl" class="flex items-center justify-between rounded-xl border border-slate-200 p-3">
            <div class="flex items-center gap-2">
              <FileText class="h-5 w-5 text-rose-600" />
              <p class="text-sm font-semibold text-slate-800">{{ formatAttachmentName(selectedLog.attachmentUrl) }}</p>
            </div>
            <a :href="selectedLog.attachmentUrl" target="_blank" class="inline-flex items-center gap-1 text-sm font-bold text-blue-700 hover:text-blue-800">
              <Download class="h-4 w-4" /> Download
            </a>
          </div>
        </div>
      </div>

      <div class="space-y-5">
        <div class="bg-white rounded-2xl border border-slate-200 p-5">
          <div class="flex items-center justify-between mb-3">
            <h4 class="text-xs font-bold text-slate-500 uppercase">Recent History</h4>
            <span class="text-xs font-semibold text-blue-700">{{ logs.length }} Logs</span>
          </div>
          <div class="relative pl-5 space-y-5 before:absolute before:inset-y-0 before:left-1.5 before:w-[2px] before:bg-slate-100">
            <button
              v-for="log in logs"
              :key="`recent-${log.id}`"
              @click="selectedId = log.id"
              class="relative w-full text-left"
            >
              <span :class="[
                'absolute -left-[19px] top-1 h-3.5 w-3.5 rounded-full border-2 border-white',
                selectedId === log.id ? 'bg-blue-700' : 'bg-emerald-500'
              ]"></span>
              <p class="text-[11px] font-bold text-slate-400 uppercase">
                {{ new Date(log.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) }}
              </p>
              <p class="text-sm font-semibold text-slate-900 leading-tight mt-1 line-clamp-2">{{ log.topic }}</p>
              <p class="text-xs text-slate-500 line-clamp-2 mt-1">{{ log.reviewerNotes || 'Current entry being reviewed' }}</p>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

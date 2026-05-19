<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '@/lib/api'
import { ArrowLeft, BookOpen, Calendar, CheckCircle2, Clock, Download, FileText, Loader2, XCircle } from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()

const loading = ref(true)
const saving = ref(false)
const logbook = ref<any>(null)
const historyLogs = ref<any[]>([])

const assessmentStatus = ref<'APPROVED' | 'REJECTED' | 'RESUBMIT'>('APPROVED')
const reviewerNotes = ref('')
const nextSteps = ref('')

const logbookId = computed(() => Number(route.params.logbookId))

const backToStudentDetail = () => {
  if (logbook.value?.studentId) {
    router.push({
      name: 'guidance.logbook.detail',
      params: { studentId: logbook.value.studentId },
      query: { name: logbook.value.studentName || '' },
    })
    return
  }
  router.push('/guidance')
}

const formatAttachmentName = (url: string) => {
  if (!url) return ''
  const parts = url.split('/')
  return parts[parts.length - 1] || 'Dokumen Lampiran'
}

async function fetchData() {
  loading.value = true
  try {
    const { data } = await api.get('/guidance/logbook')
    const item = (data || []).find((it: any) => Number(it.id) === logbookId.value)
    logbook.value = item || null
    if (logbook.value) {
      assessmentStatus.value = logbook.value.status === 'REJECTED' ? 'REJECTED' : 'APPROVED'
      reviewerNotes.value = logbook.value.reviewerNotes || ''
      nextSteps.value = logbook.value.nextSteps || ''
      const hist = await api.get(`/guidance/logbook/student/${logbook.value.studentId}`)
      historyLogs.value = hist.data || []
    }
  } finally {
    loading.value = false
  }
}

async function submitVerification() {
  if (!logbook.value) return
  saving.value = true
  try {
    const statusVal = assessmentStatus.value === 'RESUBMIT' ? 'REJECTED' : assessmentStatus.value
    await api.patch(`/guidance/logbook/${logbook.value.id}/validate`, {
      status: statusVal,
      reviewerNotes: reviewerNotes.value,
      nextSteps: nextSteps.value,
    })
    backToStudentDetail()
  } catch (e: any) {
    alert(e.response?.data?.message || 'Gagal menyimpan feedback verifikasi')
  } finally {
    saving.value = false
  }
}

onMounted(fetchData)
</script>

<template>
  <div class="space-y-4 max-w-[1300px] mx-auto p-4 md:p-6 text-slate-800">
    <div class="flex items-center gap-3">
      <button @click="backToStudentDetail" class="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100">
        <ArrowLeft class="h-4 w-4" />
      </button>
      <h1 class="text-2xl font-extrabold text-slate-900">Persetujuan & Feedback Logbook</h1>
    </div>

    <div v-if="loading" class="bg-white rounded-2xl border border-slate-200 p-10 text-center text-slate-400">
      <Loader2 class="h-8 w-8 mx-auto animate-spin mb-2 text-blue-700" />
      Memuat detail logbook...
    </div>

    <div v-else-if="!logbook" class="bg-white rounded-2xl border border-slate-200 p-10 text-center text-slate-500">
      Data logbook tidak ditemukan.
    </div>

    <div v-else class="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
      <div class="lg:col-span-2 space-y-4">
        <div class="bg-white rounded-2xl border border-slate-200 p-4">
          <div class="flex items-center justify-between gap-3">
            <div>
              <p class="text-xs font-bold text-blue-700 uppercase tracking-wider">Student Log Submission</p>
              <h2 class="text-2xl font-extrabold text-slate-900 mt-1">{{ logbook.topic }}</h2>
              <p class="text-sm text-slate-500 mt-1">{{ logbook.studentName }} • {{ logbook.studentNim }}</p>
            </div>
            <div class="text-right">
              <p class="text-xs text-slate-500">{{ new Date(logbook.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) }}</p>
              <p class="text-xs text-slate-500 mt-1">{{ logbook.startTime?.slice(0,5) }} - {{ logbook.endTime?.slice(0,5) }} WIB</p>
            </div>
          </div>
          <div class="mt-4 border-t border-slate-100 pt-4 text-sm text-slate-700 space-y-2">
            <p class="whitespace-pre-line">{{ logbook.studentProgress || '-' }}</p>
            <div v-if="logbook.notes" v-html="logbook.notes"></div>
          </div>
          <div v-if="logbook.attachmentUrl" class="mt-4 flex items-center justify-between rounded-xl border border-slate-200 p-3">
            <div class="flex items-center gap-2">
              <FileText class="h-4 w-4 text-rose-600" />
              <span class="text-sm font-semibold text-slate-800">{{ formatAttachmentName(logbook.attachmentUrl) }}</span>
            </div>
            <a :href="logbook.attachmentUrl" target="_blank" class="inline-flex items-center gap-1 text-sm font-semibold text-blue-700">
              <Download class="h-4 w-4" /> Download
            </a>
          </div>
        </div>

        <div class="bg-white rounded-2xl border border-slate-200 p-4 space-y-4">
          <div class="flex items-center gap-2 text-xs font-bold text-blue-700 uppercase tracking-wider">
            <CheckCircle2 class="h-4 w-4" /> Lecturer Assessment
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <button @click="assessmentStatus = 'APPROVED'" :class="['rounded-lg border px-3 py-2 text-sm font-semibold', assessmentStatus === 'APPROVED' ? 'border-emerald-600 bg-emerald-50 text-emerald-800' : 'border-slate-300 text-slate-600']">Approved</button>
            <button @click="assessmentStatus = 'REJECTED'" :class="['rounded-lg border px-3 py-2 text-sm font-semibold', assessmentStatus === 'REJECTED' ? 'border-rose-600 bg-rose-50 text-rose-800' : 'border-slate-300 text-slate-600']">Revision Required</button>
            <button @click="assessmentStatus = 'RESUBMIT'" :class="['rounded-lg border px-3 py-2 text-sm font-semibold', assessmentStatus === 'RESUBMIT' ? 'border-amber-500 bg-amber-50 text-amber-800' : 'border-slate-300 text-slate-600']">Resubmit</button>
          </div>
          <div>
            <label class="block text-sm font-semibold text-slate-700 mb-1">Technical Feedback</label>
            <textarea v-model="reviewerNotes" rows="5" class="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"></textarea>
          </div>
          <div>
            <label class="block text-sm font-semibold text-slate-700 mb-1">Next Steps</label>
            <input v-model="nextSteps" type="text" class="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
          </div>
          <div class="flex justify-end">
            <button @click="submitVerification" :disabled="saving" class="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-800 disabled:opacity-50">
              <Loader2 v-if="saving" class="h-4 w-4 animate-spin" />
              Kirim Feedback & Setujui
            </button>
          </div>
        </div>
      </div>

      <div class="space-y-4">
        <div class="bg-white rounded-2xl border border-slate-200 p-4">
          <h3 class="text-xs font-bold text-slate-500 uppercase">History Summary</h3>
          <div class="mt-3 space-y-3">
            <div v-for="hLog in historyLogs.slice(0, 4)" :key="hLog.id" class="border-l-2 border-slate-200 pl-3">
              <p class="text-[11px] font-bold text-slate-400">{{ new Date(hLog.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) }}</p>
              <p class="text-sm font-semibold text-slate-800 line-clamp-2">{{ hLog.topic }}</p>
              <p class="text-xs text-slate-500 line-clamp-2">{{ hLog.reviewerNotes || 'Menunggu feedback' }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

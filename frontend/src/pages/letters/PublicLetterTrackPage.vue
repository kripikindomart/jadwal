<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import axios from 'axios'
import { ArrowLeft, Clock, CheckCircle2, XCircle, Loader2 } from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()
const ticket = route.params.ticket as string

const apiBase = import.meta.env.VITE_API_URL || ''

const request = ref<any>(null)
const loading = ref(true)
const error = ref('')

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  PENDING: { label: 'Menunggu Diproses', color: 'text-yellow-700 bg-yellow-50 border-yellow-200', icon: Clock },
  PROCESSING: { label: 'Sedang Diproses', color: 'text-blue-700 bg-blue-50 border-blue-200', icon: Loader2 },
  APPROVED: { label: 'Disetujui', color: 'text-emerald-700 bg-emerald-50 border-emerald-200', icon: CheckCircle2 },
  REJECTED: { label: 'Ditolak', color: 'text-red-700 bg-red-50 border-red-200', icon: XCircle },
  FINISHED: { label: 'Selesai', color: 'text-gray-700 bg-gray-50 border-gray-200', icon: CheckCircle2 },
}

onMounted(async () => {
  try {
    const res = await axios.get(`${apiBase}/api/public-letters/track/${ticket}`)
    request.value = res.data
  } catch (e: any) {
    error.value = e.response?.data?.message || 'Nomor tiket tidak ditemukan.'
  } finally {
    loading.value = false
  }
})

const formatDate = (d: string) => {
  return new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
    <!-- Header -->
    <div class="bg-white/80 backdrop-blur-md border-b border-gray-100 sticky top-0 z-20">
      <div class="max-w-3xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-3">
        <button @click="router.push({ name: 'letters.public.list' })"
          class="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft class="w-5 h-5 text-gray-500" />
        </button>
        <div>
          <h1 class="text-lg font-bold text-gray-900">Lacak Pengajuan Surat</h1>
          <p class="text-sm text-gray-500 font-mono">{{ ticket }}</p>
        </div>
      </div>
    </div>

    <div class="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <div v-if="loading" class="text-center py-16">
        <div class="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4"></div>
      </div>

      <div v-else-if="error" class="bg-white rounded-2xl shadow-sm border border-red-100 p-8 text-center">
        <XCircle class="w-12 h-12 text-red-400 mx-auto mb-3" />
        <h2 class="text-lg font-bold text-gray-900 mb-2">Tiket Tidak Ditemukan</h2>
        <p class="text-gray-500 text-sm">{{ error }}</p>
        <button @click="router.push({ name: 'letters.public.list' })"
          class="mt-6 px-5 py-2.5 text-sm font-semibold rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors">
          Kembali
        </button>
      </div>

      <div v-else class="space-y-6">
        <!-- Status Card -->
        <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div class="flex items-center gap-4 mb-4">
            <div class="p-3 rounded-xl" :class="statusConfig[request.status]?.color || 'bg-gray-50'">
              <component :is="statusConfig[request.status]?.icon || Clock" class="w-6 h-6" />
            </div>
            <div>
              <p class="text-sm font-bold uppercase tracking-wider" :class="statusConfig[request.status]?.color?.split(' ')[0]">
                {{ statusConfig[request.status]?.label || request.status }}
              </p>
              <p class="text-lg font-bold text-gray-900">{{ request.letterType }}</p>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-gray-100">
            <div>
              <p class="text-xs font-bold text-gray-400 uppercase">Nama Pemohon</p>
              <p class="text-sm font-medium text-gray-800 mt-0.5">{{ request.requesterName }}</p>
            </div>
            <div>
              <p class="text-xs font-bold text-gray-400 uppercase">Tanggal Diajukan</p>
              <p class="text-sm font-medium text-gray-800 mt-0.5">{{ formatDate(request.submittedAt) }}</p>
            </div>
            <div>
              <p class="text-xs font-bold text-gray-400 uppercase">Terakhir Diperbarui</p>
              <p class="text-sm font-medium text-gray-800 mt-0.5">{{ formatDate(request.updatedAt) }}</p>
            </div>
          </div>
        </div>

        <!-- Admin Notes -->
        <div v-if="request.adminNotes" class="bg-yellow-50 border border-yellow-200 rounded-xl p-5">
          <p class="text-xs font-bold text-yellow-700 uppercase mb-1">Catatan dari Admin</p>
          <p class="text-sm text-yellow-800">{{ request.adminNotes }}</p>
        </div>

        <div class="text-center">
          <button @click="router.push({ name: 'letters.public.list' })"
            class="px-6 py-2.5 text-sm font-semibold rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors">
            Kembali ke Layanan Surat
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

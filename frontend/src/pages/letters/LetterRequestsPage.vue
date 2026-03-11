<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useToast } from '@/composables/useToast'
import { useConfirm } from '@/composables/useConfirm'
import { useRouter } from 'vue-router'
import api from '@/lib/api'
import { FileText, CheckCircle2, XCircle, Clock, Trash2, ChevronDown, Printer } from 'lucide-vue-next'

const toast = useToast()
const confirm = useConfirm()
const router = useRouter()

const requests = ref<any[]>([])
const loading = ref(false)
const statusFilter = ref('')
const expandedId = ref<number | null>(null)

const statusLabels: Record<string, { label: string; class: string }> = {
  PENDING: { label: 'Menunggu', class: 'bg-yellow-50 text-yellow-700' },
  PROCESSING: { label: 'Diproses', class: 'bg-blue-50 text-blue-700' },
  APPROVED: { label: 'Disetujui', class: 'bg-emerald-50 text-emerald-700' },
  REJECTED: { label: 'Ditolak', class: 'bg-red-50 text-red-700' },
  FINISHED: { label: 'Selesai', class: 'bg-gray-100 text-gray-700' },
}

const fetchData = async () => {
  loading.value = true
  try {
    const params = statusFilter.value ? `?status=${statusFilter.value}` : ''
    const res = await api.get(`/letters/requests${params}`)
    requests.value = res.data
  } catch (e) {
    toast.error('Gagal memuat data pengajuan.')
  } finally {
    loading.value = false
  }
}

const updateStatus = async (id: number, status: string, adminNotes?: string) => {
  try {
    await api.patch(`/letters/requests/${id}/status`, { status, adminNotes })
    toast.success('Status berhasil diperbarui!')
    await fetchData()
  } catch (e: any) {
    toast.error(e.response?.data?.message || 'Gagal mengubah status.')
  }
}

const deleteRequest = (item: any) => {
  confirm.requireConfirm({
    title: 'Hapus Pengajuan',
    message: `Hapus pengajuan dari "${item.requesterName}" (${item.ticketNumber})?`,
    confirmText: 'Hapus',
    async onConfirm() {
      try {
        await api.delete(`/letters/requests/${item.id}`)
        toast.success('Pengajuan berhasil dihapus!')
        await fetchData()
      } catch (e: any) {
        toast.error(e.response?.data?.message || 'Gagal menghapus.')
      }
    },
  })
}

const printLetter = (req: any) => {
  const route = router.resolve({ name: 'letters.print', params: { id: req.id } })
  window.open(route.href, '_blank')
}

const toggleExpand = (id: number) => {
  expandedId.value = expandedId.value === id ? null : id
}

const formatDate = (d: string) => {
  return new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const getFieldLabel = (letterType: any, fieldId: string) => {
  if (!letterType || !letterType.fields) return fieldId;
  const field = letterType.fields.find((f: any) => f.id === fieldId)
  return field ? field.label : fieldId
}

const apiBase = import.meta.env.VITE_API_URL || ''
const rootUrl = apiBase.replace(/\/api\/?$/, '') || ''

onMounted(fetchData)
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-900 flex items-center gap-3">
          <FileText class="w-7 h-7 text-indigo-600" />
          Inbox Pengajuan Surat
        </h1>
        <p class="text-sm text-gray-500 mt-1">Kelola pengajuan surat dari mahasiswa</p>
      </div>
      <select v-model="statusFilter" @change="fetchData"
        class="px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium focus:ring-2 focus:ring-indigo-500">
        <option value="">Semua Status</option>
        <option value="PENDING">Menunggu</option>
        <option value="PROCESSING">Diproses</option>
        <option value="APPROVED">Disetujui</option>
        <option value="REJECTED">Ditolak</option>
        <option value="FINISHED">Selesai</option>
      </select>
    </div>

    <!-- List -->
    <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div v-if="loading && requests.length === 0" class="p-12 text-center text-gray-500">
        <div class="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-3"></div>
        Memuat data...
      </div>
      <div v-else-if="requests.length === 0" class="p-12 text-center text-gray-400">
        <FileText class="w-12 h-12 mx-auto mb-3 text-gray-300" />
        <p class="font-medium">Belum ada pengajuan</p>
      </div>

      <div v-else class="divide-y divide-gray-100">
        <div v-for="req in requests" :key="req.id" class="hover:bg-gray-50/50 transition-colors">
          <div class="px-6 py-4 flex items-center gap-4 cursor-pointer" @click="toggleExpand(req.id)">
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 mb-1">
                <span class="font-mono text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">{{ req.ticketNumber }}</span>
                <span :class="statusLabels[req.status]?.class || 'bg-gray-100 text-gray-500'"
                  class="px-2.5 py-0.5 rounded-full text-[11px] font-bold">
                  {{ statusLabels[req.status]?.label || req.status }}
                </span>
              </div>
              <p class="font-semibold text-gray-900">{{ req.requesterName }}</p>
              <p class="text-sm text-gray-500">{{ req.letterType?.title || '-' }} · {{ formatDate(req.createdAt) }}</p>
            </div>
            <ChevronDown class="w-5 h-5 text-gray-400 transition-transform" :class="{ 'rotate-180': expandedId === req.id }" />
          </div>

          <!-- Expanded Detail -->
          <div v-show="expandedId === req.id" class="px-6 pb-5 pt-0 border-t border-gray-100 bg-gray-50/50">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <p class="text-xs font-bold text-gray-500 uppercase mb-1">NIM</p>
                <p class="text-sm text-gray-800">{{ req.requesterNim || '-' }}</p>
              </div>
              <div>
                <p class="text-xs font-bold text-gray-500 uppercase mb-1">Email</p>
                <p class="text-sm text-gray-800">{{ req.requesterEmail || '-' }}</p>
              </div>
              <div>
                <p class="text-xs font-bold text-gray-500 uppercase mb-1">No. Telepon</p>
                <p class="text-sm text-gray-800">{{ req.requesterPhone || '-' }}</p>
              </div>
            </div>

            <!-- Submitted Data -->
            <div v-if="req.submittedData && Object.keys(req.submittedData).length > 0" class="mt-4">
              <p class="text-xs font-bold text-gray-500 uppercase mb-2">Data Isian Form</p>
              <div class="bg-white rounded-lg border border-gray-200 p-4 space-y-2">
                <div v-for="(val, key) in req.submittedData" :key="key as string" class="flex gap-2 text-sm">
                  <span class="font-medium text-gray-600 min-w-[150px]">{{ getFieldLabel(req.letterType, key as string) }}:</span>
                  <span class="text-gray-800 break-all">
                    <a v-if="typeof val === 'string' && val.startsWith('/uploads/')" :href="rootUrl + val" target="_blank" class="text-indigo-600 font-semibold hover:underline flex items-center gap-1">
                       Lihat File Terlampir
                    </a>
                    <span v-else>{{ val }}</span>
                  </span>
                </div>
              </div>
            </div>

            <!-- Admin Notes -->
            <div v-if="req.adminNotes" class="mt-4">
              <p class="text-xs font-bold text-gray-500 uppercase mb-1">Catatan Admin</p>
              <p class="text-sm text-gray-700 bg-yellow-50 border border-yellow-200 rounded-lg p-3">{{ req.adminNotes }}</p>
            </div>

            <!-- Action Buttons -->
            <div class="flex items-center gap-2 mt-4 pt-4 border-t border-gray-200">
              <button v-if="req.status === 'PENDING'" @click="updateStatus(req.id, 'PROCESSING')"
                class="px-3 py-1.5 text-xs font-bold rounded-lg bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-1.5">
                <Clock class="w-3.5 h-3.5" /> Proses
              </button>
              <button v-if="req.status !== 'FINISHED' && req.status !== 'REJECTED'" @click="updateStatus(req.id, 'APPROVED')"
                class="px-3 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 flex items-center gap-1.5">
                <CheckCircle2 class="w-3.5 h-3.5" /> Setujui
              </button>
              <button v-if="req.status !== 'FINISHED' && req.status !== 'REJECTED'" @click="updateStatus(req.id, 'REJECTED')"
                class="px-3 py-1.5 text-xs font-bold rounded-lg bg-red-100 text-red-700 hover:bg-red-200 flex items-center gap-1.5">
                <XCircle class="w-3.5 h-3.5" /> Tolak
              </button>
              <button v-if="req.status === 'APPROVED'" @click="updateStatus(req.id, 'FINISHED')"
                class="px-3 py-1.5 text-xs font-bold rounded-lg bg-gray-600 text-white hover:bg-gray-700 flex items-center gap-1.5">
                Selesai
              </button>
              <button v-if="req.status === 'APPROVED' || req.status === 'FINISHED'" @click="printLetter(req)"
                class="px-3 py-1.5 text-xs font-bold rounded-lg bg-indigo-100 text-indigo-700 hover:bg-indigo-200 flex items-center gap-1.5">
                <Printer class="w-3.5 h-3.5" /> Cetak Surat
              </button>
              <div class="flex-1"></div>
              <button @click="deleteRequest(req)"
                class="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                <Trash2 class="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import api from '@/lib/api'
import { CalendarClock, CheckCircle2, XCircle, Clock, Loader2 } from 'lucide-vue-next'

const loading = ref(true)
const items = ref<any[]>([])
const filterStatus = ref('')

onMounted(() => fetchData())

async function fetchData() {
  loading.value = true
  try {
    const params: any = { limit: 50 }
    if (filterStatus.value) params.status = filterStatus.value
    const { data } = await api.get('/reschedule', { params })
    items.value = data.data || []
  } catch (e) { console.error(e) }
  finally { loading.value = false }
}

async function approve(id: number) {
  const notes = prompt('Catatan (opsional):')
  try {
    await api.patch(`/reschedule/${id}/approve`, { adminNotes: notes || undefined })
    await fetchData()
  } catch (e: any) { alert(e.response?.data?.message || 'Gagal') }
}

async function reject(id: number) {
  const notes = prompt('Alasan penolakan:')
  try {
    await api.patch(`/reschedule/${id}/reject`, { adminNotes: notes || undefined })
    await fetchData()
  } catch (e: any) { alert(e.response?.data?.message || 'Gagal') }
}

const statusConfig: Record<string, { label: string; class: string }> = {
  PENDING: { label: 'Menunggu', class: 'bg-amber-100 text-amber-700' },
  APPROVED: { label: 'Disetujui', class: 'bg-emerald-100 text-emerald-700' },
  REJECTED: { label: 'Ditolak', class: 'bg-rose-100 text-rose-700' },
}
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-2xl font-bold text-slate-800 flex items-center gap-2">
        <CalendarClock class="h-6 w-6 text-amber-600" />
        Request Reschedule
      </h1>
      <p class="text-sm text-slate-500 mt-1">Persetujuan perubahan jadwal dari dosen.</p>
    </div>

    <div class="flex gap-3">
      <select v-model="filterStatus" @change="fetchData()" class="rounded-lg border border-slate-200 px-3 py-2 text-sm">
        <option value="">Semua Status</option>
        <option value="PENDING">Menunggu</option>
        <option value="APPROVED">Disetujui</option>
        <option value="REJECTED">Ditolak</option>
      </select>
    </div>

    <div class="rounded-2xl bg-white border border-slate-100 shadow-sm overflow-hidden">
      <div v-if="loading" class="p-8 text-center"><Loader2 class="h-6 w-6 mx-auto animate-spin text-slate-400" /></div>

      <div v-else-if="items.length === 0" class="p-12 text-center text-slate-400">
        <CalendarClock class="h-10 w-10 mx-auto mb-3 text-slate-300" />
        <p>Tidak ada request reschedule</p>
      </div>

      <div v-else class="divide-y divide-slate-50">
        <div v-for="item in items" :key="item.id" class="p-5 hover:bg-slate-50/50">
          <div class="flex items-start justify-between gap-4">
            <div class="flex-1">
              <div class="flex items-center gap-2 mb-1">
                <p class="text-sm font-bold text-slate-800">{{ item.courseName }}</p>
                <span :class="['text-[11px] font-semibold px-2 py-0.5 rounded-full', statusConfig[item.status]?.class]">
                  {{ statusConfig[item.status]?.label }}
                </span>
              </div>
              <p class="text-xs text-slate-500">{{ item.className }} · Diminta oleh: {{ item.requesterName }}</p>

              <div class="grid grid-cols-2 gap-4 mt-3 text-xs">
                <div class="p-2 bg-rose-50 rounded-lg">
                  <p class="font-semibold text-rose-700 mb-0.5">Jadwal Lama</p>
                  <p class="text-slate-600">{{ item.oldDate || '-' }} · {{ item.oldStartTime?.slice(0,5) }}-{{ item.oldEndTime?.slice(0,5) }}</p>
                  <p class="text-slate-500">{{ item.oldRoom }}</p>
                </div>
                <div class="p-2 bg-emerald-50 rounded-lg">
                  <p class="font-semibold text-emerald-700 mb-0.5">Jadwal Baru (Diminta)</p>
                  <p class="text-slate-600">{{ item.newDate }} · {{ item.newStartTime?.slice(0,5) }}-{{ item.newEndTime?.slice(0,5) }}</p>
                  <p class="text-slate-500">{{ item.newRoom || 'Ruang sama' }}</p>
                </div>
              </div>

              <p v-if="item.reason" class="text-xs text-slate-500 mt-2 italic">"{{ item.reason }}"</p>
              <p v-if="item.adminNotes" class="text-xs text-emerald-600 mt-1">Admin: {{ item.adminNotes }}</p>
            </div>

            <div v-if="item.status === 'PENDING'" class="flex gap-1 shrink-0">
              <button @click="approve(item.id)" class="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg" title="Setujui">
                <CheckCircle2 class="h-5 w-5" />
              </button>
              <button @click="reject(item.id)" class="p-2 text-rose-600 hover:bg-rose-50 rounded-lg" title="Tolak">
                <XCircle class="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

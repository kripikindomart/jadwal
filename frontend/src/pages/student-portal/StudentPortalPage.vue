<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import api from '@/lib/api'
import {
  GraduationCap, Calendar, Clock, Send, Plus,
  CheckCircle2, XCircle, Loader2, AlertCircle,
} from 'lucide-vue-next'

const route = useRoute()
const nim = computed(() => route.params.nim as string)

const loading = ref(true)
const error = ref('')
const data = ref<any>(null)
const showRequestForm = ref(false)
const submitting = ref(false)

const form = ref({
  lecturerId: '' as string | number,
  date: '',
  startTime: '09:00',
  endTime: '10:00',
  topic: '',
  studentNotes: '',
  type: 'TESIS',
})

onMounted(async () => {
  try {
    const res = await api.get(`/guidance/portal/${nim.value}`)
    data.value = res.data
  } catch (e: any) {
    error.value = e.response?.data?.message || 'NIM tidak ditemukan'
  } finally {
    loading.value = false
  }
})

async function submitRequest() {
  if (!form.value.lecturerId || !form.value.date) {
    alert('Pilih dosen dan tanggal terlebih dahulu')
    return
  }
  submitting.value = true
  try {
    await api.post(`/guidance/portal/${nim.value}/request`, {
      ...form.value,
      lecturerId: Number(form.value.lecturerId),
    })
    // Refresh data
    const res = await api.get(`/guidance/portal/${nim.value}`)
    data.value = res.data
    showRequestForm.value = false
    form.value = { lecturerId: '', date: '', startTime: '09:00', endTime: '10:00', topic: '', studentNotes: '', type: 'TESIS' }
    alert('Request bimbingan berhasil dikirim!')
  } catch (e: any) {
    alert(e.response?.data?.message || 'Gagal mengirim request')
  } finally {
    submitting.value = false
  }
}

const statusConfig: Record<string, { label: string; class: string; icon: any }> = {
  PENDING: { label: 'Menunggu', class: 'bg-amber-100 text-amber-700', icon: Clock },
  APPROVED: { label: 'Disetujui', class: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 },
  REJECTED: { label: 'Ditolak', class: 'bg-rose-100 text-rose-700', icon: XCircle },
  DONE: { label: 'Selesai', class: 'bg-slate-100 text-slate-600', icon: CheckCircle2 },
  CANCELLED: { label: 'Dibatalkan', class: 'bg-slate-100 text-slate-500', icon: XCircle },
}
</script>

<template>
  <div class="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50">
    <!-- Loading -->
    <div v-if="loading" class="flex items-center justify-center min-h-screen">
      <div class="h-10 w-10 rounded-full border-4 border-emerald-200 border-t-emerald-600 animate-spin"></div>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="flex items-center justify-center min-h-screen px-4">
      <div class="text-center max-w-sm">
        <AlertCircle class="h-16 w-16 mx-auto mb-4 text-rose-400" />
        <h2 class="text-xl font-bold text-slate-800 mb-2">NIM Tidak Ditemukan</h2>
        <p class="text-sm text-slate-500">{{ error }}</p>
      </div>
    </div>

    <!-- Portal Content -->
    <div v-else>
      <!-- Header -->
      <header class="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-slate-100 shadow-sm">
        <div class="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-sm">
              <GraduationCap class="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 class="text-sm font-bold text-slate-800">Portal Mahasiswa</h1>
              <p class="text-xs text-slate-500">{{ data.student?.name }} · {{ data.student?.nim }}</p>
            </div>
          </div>
        </div>
      </header>

      <main class="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <!-- Welcome -->
        <div class="mb-8 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 p-6 text-white shadow-lg">
          <h2 class="text-xl font-bold">Halo, {{ data.student?.name }}!</h2>
          <p class="text-emerald-100 text-sm mt-1">Kelola jadwal bimbingan tesis/disertasi Anda di sini.</p>
        </div>

        <!-- Action Button -->
        <div class="mb-6 flex items-center justify-between">
          <h3 class="text-lg font-bold text-slate-800">Riwayat Bimbingan</h3>
          <button @click="showRequestForm = true"
            class="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 shadow-sm transition-colors">
            <Plus class="h-4 w-4" /> Request Bimbingan
          </button>
        </div>

        <!-- Request Form -->
        <div v-if="showRequestForm" class="mb-6 rounded-2xl bg-white border border-emerald-200 ring-2 ring-emerald-100 shadow-sm p-6">
          <h4 class="text-base font-bold text-slate-800 mb-4">Request Bimbingan Baru</h4>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div class="sm:col-span-2">
              <label class="block text-sm font-medium text-slate-700 mb-1">Dosen Pembimbing</label>
              <select v-model="form.lecturerId" class="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400">
                <option value="">— Pilih Dosen —</option>
                <option v-for="l in data.lecturers" :key="l.id" :value="l.id">{{ l.name }}</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1">Tanggal</label>
              <input v-model="form.date" type="date" class="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400" />
            </div>
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1">Jenis</label>
              <select v-model="form.type" class="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400">
                <option value="TESIS">Bimbingan Tesis</option>
                <option value="DISERTASI">Bimbingan Disertasi</option>
                <option value="PROPOSAL">Bimbingan Proposal</option>
                <option value="UMUM">Konsultasi Umum</option>
              </select>
            </div>
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1">Jam Mulai</label>
              <input v-model="form.startTime" type="time" class="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400" />
            </div>
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1">Jam Selesai</label>
              <input v-model="form.endTime" type="time" class="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400" />
            </div>
            <div class="sm:col-span-2">
              <label class="block text-sm font-medium text-slate-700 mb-1">Topik Bimbingan</label>
              <input v-model="form.topic" type="text" placeholder="Contoh: Revisi BAB 3 Metodologi" class="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400" />
            </div>
            <div class="sm:col-span-2">
              <label class="block text-sm font-medium text-slate-700 mb-1">Catatan Tambahan</label>
              <textarea v-model="form.studentNotes" rows="2" placeholder="Catatan untuk dosen..." class="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 resize-none"></textarea>
            </div>
          </div>
          <div class="flex justify-end gap-3 mt-5">
            <button @click="showRequestForm = false" class="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg">Batal</button>
            <button @click="submitRequest" :disabled="submitting"
              class="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 shadow-sm">
              <Loader2 v-if="submitting" class="h-4 w-4 animate-spin" />
              <Send v-else class="h-4 w-4" />
              Kirim Request
            </button>
          </div>
        </div>

        <!-- Request List -->
        <div v-if="data.requests?.length" class="space-y-3">
          <div v-for="r in data.requests" :key="r.id" class="rounded-xl bg-white border border-slate-100 shadow-sm p-5">
            <div class="flex items-start justify-between gap-4">
              <div class="flex items-start gap-3">
                <div class="h-10 w-10 rounded-xl bg-violet-100 flex items-center justify-center shrink-0 mt-0.5">
                  <Calendar class="h-5 w-5 text-violet-600" />
                </div>
                <div>
                  <p class="text-sm font-bold text-slate-800">{{ r.topic || `Bimbingan ${r.type}` }}</p>
                  <p class="text-xs text-slate-500 mt-0.5">{{ r.lecturerName }} · {{ r.room }}</p>
                  <p class="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                    <Clock class="h-3 w-3" />
                    {{ new Date(r.date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' }) }}
                    · {{ r.startTime?.slice(0,5) }} - {{ r.endTime?.slice(0,5) }}
                  </p>
                  <p v-if="r.lecturerNotes" class="text-xs text-emerald-600 mt-1 italic">"{{ r.lecturerNotes }}"</p>
                </div>
              </div>
              <span :class="['inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold shrink-0', statusConfig[r.status]?.class || 'bg-slate-100 text-slate-500']">
                <component :is="statusConfig[r.status]?.icon || Clock" class="h-3 w-3" />
                {{ statusConfig[r.status]?.label || r.status }}
              </span>
            </div>
          </div>
        </div>

        <div v-else-if="!showRequestForm" class="rounded-2xl bg-white border border-slate-100 shadow-sm p-12 text-center">
          <Calendar class="h-12 w-12 mx-auto mb-3 text-slate-300" />
          <p class="text-slate-500 font-medium">Belum ada riwayat bimbingan</p>
          <p class="text-sm text-slate-400 mt-1">Klik "Request Bimbingan" untuk mengajukan jadwal baru.</p>
        </div>
      </main>
    </div>
  </div>
</template>

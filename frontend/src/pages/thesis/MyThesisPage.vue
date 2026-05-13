<script setup lang="ts">
import { ref, onMounted } from 'vue'
import api from '@/lib/api'
import { useAuthStore } from '@/stores/auth'
import { GraduationCap, Plus, Clock, CheckCircle2, Send, Loader2 } from 'lucide-vue-next'

const authStore = useAuthStore()
const loading = ref(true)
const theses = ref<any[]>([])
const showSubmitForm = ref(false)
const submitting = ref(false)

const form = ref({
  title: '',
  titleEn: '',
  abstract: '',
  type: 'TESIS',
})

onMounted(async () => {
  try {
    const { data } = await api.get('/guidance/my-requests')
    // Also try to get thesis data
    const nim = (authStore.user as any)?.studentProfile?.nim || ''
    if (nim) {
      const thesisRes = await api.get(`/guidance/portal/${nim}/thesis`)
      theses.value = thesisRes.data || []
    }
  } catch { /* silent */ }
  finally { loading.value = false }
})

async function submitThesis() {
  if (!form.value.title) { alert('Judul wajib diisi'); return }
  submitting.value = true
  try {
    const nim = (authStore.user as any)?.studentProfile?.nim || ''
    await api.post(`/guidance/portal/${nim}/thesis/submit`, form.value)
    // Refresh
    const thesisRes = await api.get(`/guidance/portal/${nim}/thesis`)
    theses.value = thesisRes.data || []
    showSubmitForm.value = false
    form.value = { title: '', titleEn: '', abstract: '', type: 'TESIS' }
  } catch (e: any) {
    alert(e.response?.data?.message || 'Gagal mengajukan judul')
  } finally { submitting.value = false }
}

const statusLabels: Record<string, { label: string; class: string }> = {
  DRAFT: { label: 'Draft', class: 'bg-slate-100 text-slate-600' },
  SUBMITTED: { label: 'Diajukan', class: 'bg-blue-100 text-blue-700' },
  TITLE_APPROVED: { label: 'Judul Disetujui', class: 'bg-emerald-100 text-emerald-700' },
  SUPERVISOR_ASSIGNED: { label: 'Pembimbing Ditetapkan', class: 'bg-teal-100 text-teal-700' },
  PROPOSAL_GUIDANCE: { label: 'Bimbingan Proposal', class: 'bg-amber-100 text-amber-700' },
  PROPOSAL_PASSED: { label: 'Proposal Lulus', class: 'bg-emerald-100 text-emerald-700' },
  THESIS_GUIDANCE: { label: 'Bimbingan Tesis', class: 'bg-amber-100 text-amber-700' },
  RESULT_PASSED: { label: 'Seminar Hasil Lulus', class: 'bg-emerald-100 text-emerald-700' },
  REVISION: { label: 'Revisi', class: 'bg-orange-100 text-orange-700' },
  COMPLETED: { label: 'Selesai', class: 'bg-green-100 text-green-800' },
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <GraduationCap class="h-6 w-6 text-emerald-600" />
          Tugas Akhir Saya
        </h1>
        <p class="text-sm text-slate-500 mt-1">Pengajuan judul, status, dan progress tugas akhir.</p>
      </div>
      <button v-if="!showSubmitForm" @click="showSubmitForm = true"
        class="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 shadow-sm">
        <Plus class="h-4 w-4" /> Ajukan Judul
      </button>
    </div>

    <!-- Submit Form -->
    <div v-if="showSubmitForm" class="rounded-2xl bg-white border border-emerald-200 ring-2 ring-emerald-100 shadow-sm p-6 space-y-4">
      <h3 class="text-base font-bold text-slate-800">Pengajuan Judul Tugas Akhir</h3>
      <div>
        <label class="block text-sm font-medium text-slate-700 mb-1">Judul (Bahasa Indonesia) *</label>
        <input v-model="form.title" type="text" placeholder="Masukkan judul tugas akhir..."
          class="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400" />
      </div>
      <div>
        <label class="block text-sm font-medium text-slate-700 mb-1">Judul (English)</label>
        <input v-model="form.titleEn" type="text" placeholder="English title (optional)"
          class="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400" />
      </div>
      <div>
        <label class="block text-sm font-medium text-slate-700 mb-1">Abstrak</label>
        <textarea v-model="form.abstract" rows="4" placeholder="Ringkasan penelitian..."
          class="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 resize-none"></textarea>
      </div>
      <div>
        <label class="block text-sm font-medium text-slate-700 mb-1">Jenis</label>
        <select v-model="form.type" class="rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20">
          <option value="TESIS">Tesis (S2)</option>
          <option value="DISERTASI">Disertasi (S3)</option>
        </select>
      </div>
      <div class="flex justify-end gap-3 pt-2">
        <button @click="showSubmitForm = false" class="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">Batal</button>
        <button @click="submitThesis" :disabled="submitting"
          class="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 shadow-sm">
          <Loader2 v-if="submitting" class="h-4 w-4 animate-spin" />
          <Send v-else class="h-4 w-4" />
          Ajukan
        </button>
      </div>
    </div>

    <!-- Thesis List -->
    <div v-if="loading" class="text-center py-8 text-slate-400">Memuat...</div>

    <div v-else-if="theses.length === 0 && !showSubmitForm" class="rounded-2xl bg-white border border-slate-100 shadow-sm p-12 text-center">
      <GraduationCap class="h-12 w-12 mx-auto mb-3 text-slate-300" />
      <p class="text-slate-500 font-medium">Belum ada pengajuan tugas akhir</p>
      <p class="text-sm text-slate-400 mt-1">Klik "Ajukan Judul" untuk memulai.</p>
    </div>

    <div v-else class="space-y-3">
      <div v-for="t in theses" :key="t.id" class="rounded-xl bg-white border border-slate-100 shadow-sm p-5">
        <div class="flex items-start justify-between gap-4">
          <div>
            <p class="text-base font-bold text-slate-800">{{ t.title }}</p>
            <p class="text-xs text-slate-500 mt-1">{{ t.type }} · Diajukan {{ t.submittedAt ? new Date(t.submittedAt).toLocaleDateString('id-ID') : '-' }}</p>
          </div>
          <span :class="['inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold shrink-0', statusLabels[t.status]?.class || 'bg-slate-100 text-slate-500']">
            {{ statusLabels[t.status]?.label || t.status }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

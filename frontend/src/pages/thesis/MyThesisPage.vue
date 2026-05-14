<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import api from '@/lib/api'
import { useAuthStore } from '@/stores/auth'
import SearchableSelect from '@/components/ui/SearchableSelect.vue'
import {
  GraduationCap, FileText, Send, Save, Loader2,
  CheckCircle2, Circle, Upload, X, Plus, Clock,
  BookOpen, Users, AlertCircle,
} from 'lucide-vue-next'

const authStore = useAuthStore()
const loading = ref(true)
const theses = ref<any[]>([])
const lecturers = ref<any[]>([])
const concentrations = ref<any[]>([])
const showForm = ref(false)
const submitting = ref(false)
const savingDraft = ref(false)
const uploading = ref(false)
const uploadedFileName = ref('')

const form = ref({
  title: '',
  titleEn: '',
  abstract: '',
  type: 'TESIS',
  keywords: '' as string,
  concentration: '',
  supervisorId1: '' as string | number,
  supervisorId2: '' as string | number,
  documentUrl: '',
})

const keywordsList = computed(() => {
  return form.value.keywords.split(',').map(k => k.trim()).filter(Boolean)
})

const formProgress = computed(() => {
  let filled = 0
  const total = 5
  if (form.value.title.length >= 8) filled++
  if (form.value.abstract.length >= 20) filled++
  if (keywordsList.value.length >= 1) filled++
  if (form.value.supervisorId1) filled++
  if (form.value.documentUrl) filled++
  return Math.round((filled / total) * 100)
})

const wordCount = computed(() => {
  return form.value.abstract.trim().split(/\s+/).filter(Boolean).length
})

onMounted(async () => {
  try {
    const [thesisRes, lecRes, concRes] = await Promise.all([
      api.get('/guidance/my-thesis'),
      api.get('/guidance/available-lecturers'),
      api.get('/guidance/available-concentrations'),
    ])
    theses.value = thesisRes.data || []
    lecturers.value = lecRes.data || []
    concentrations.value = concRes.data || []
  } catch { /* silent */ }
  finally { loading.value = false }
})

async function handleFileSelect(e: Event) {
  const input = e.target as HTMLInputElement
  if (input.files && input.files.length > 0) {
    await uploadFile(input.files[0] as File)
  }
}

function handleDrop(e: DragEvent) {
  const files = e.dataTransfer?.files
  if (files && files.length > 0) {
    uploadFile(files[0] as File)
  }
}

async function uploadFile(file: File) {
  if (file.size > 5 * 1024 * 1024) {
    alert('Ukuran file maksimal 5MB')
    return
  }
  if (!file.name.match(/\.(pdf|doc|docx)$/i)) {
    alert('Format file harus PDF, DOC, atau DOCX')
    return
  }

  uploading.value = true
  try {
    const formData = new FormData()
    formData.append('file', file)
    const { data } = await api.post('/guidance/my-thesis/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    form.value.documentUrl = data.url
    uploadedFileName.value = file.name
  } catch (e: any) {
    alert(e.response?.data?.message || 'Gagal upload file')
  } finally {
    uploading.value = false
  }
}

async function submitProposal() {
  if (!form.value.title || form.value.title.length < 8) {
    alert('Judul minimal 8 karakter')
    return
  }
  submitting.value = true
  try {
    await api.post('/guidance/my-thesis/submit', {
      ...form.value,
      supervisorId1: form.value.supervisorId1 ? Number(form.value.supervisorId1) : undefined,
      supervisorId2: form.value.supervisorId2 ? Number(form.value.supervisorId2) : undefined,
    })
    const res = await api.get('/guidance/my-thesis')
    theses.value = res.data || []
    showForm.value = false
    form.value = { title: '', titleEn: '', abstract: '', type: 'TESIS', keywords: '', concentration: '', supervisorId1: '', supervisorId2: '', documentUrl: '' }
  } catch (e: any) {
    alert(e.response?.data?.message || 'Gagal mengajukan proposal')
  } finally { submitting.value = false }
}

async function saveDraft() {
  savingDraft.value = true
  setTimeout(() => { savingDraft.value = false }, 1000)
}

function removeKeyword(kw: string) {
  const list = keywordsList.value.filter(k => k !== kw)
  form.value.keywords = list.join(', ')
}

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

const guidelines = [
  { label: 'Judul Sesuai Pedoman', desc: 'Judul minimal 8 kata dan maksimal 20 kata.', done: computed(() => form.value.title.split(' ').filter(Boolean).length >= 8) },
  { label: 'Abstrak Terisi', desc: 'Deskripsikan latar belakang dan urgensi.', done: computed(() => form.value.abstract.length >= 20) },
  { label: 'Kata Kunci', desc: 'Minimal 1 kata kunci penelitian.', done: computed(() => keywordsList.value.length >= 1) },
  { label: 'Dosen Pembimbing', desc: 'Pastikan kuota dosen masih tersedia.', done: computed(() => !!form.value.supervisorId1) },
  { label: 'File PDF Proposal', desc: 'Lampirkan draft proposal bab 1-3.', done: computed(() => !!form.value.documentUrl) },
]
</script>

<template>
  <div>
    <!-- Header -->
    <div class="mb-6 flex items-center justify-between">
      <div>
        <p class="text-xs text-emerald-600 font-medium mb-1">Thesis Management › Pengajuan Proposal</p>
        <h1 class="text-2xl font-bold text-slate-900">Pengajuan Proposal Baru</h1>
        <p class="text-sm text-slate-500 mt-1">Lengkapi detail proposal penelitian Anda untuk memulai proses bimbingan.</p>
      </div>
      <span v-if="showForm" class="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-full">
        <span class="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span> Draft Auto-Saved
      </span>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="text-center py-12"><Loader2 class="h-8 w-8 mx-auto animate-spin text-slate-300" /></div>

    <!-- Existing Thesis List (if not showing form) -->
    <div v-else-if="!showForm && theses.length > 0" class="space-y-4">
      <div class="flex items-center justify-between mb-2">
        <h2 class="text-lg font-bold text-slate-800">Riwayat Pengajuan</h2>
        <button @click="showForm = true" class="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 shadow-sm">
          <Plus class="h-4 w-4" /> Ajukan Baru
        </button>
      </div>
      <div v-for="t in theses" :key="t.id" class="rounded-2xl bg-white border border-slate-100 shadow-sm p-6 hover:shadow-md transition-shadow">
        <div class="flex items-start justify-between gap-4">
          <div class="flex-1">
            <p class="text-base font-bold text-slate-900">{{ t.title }}</p>
            <p v-if="t.titleEn" class="text-sm text-slate-500 italic mt-0.5">{{ t.titleEn }}</p>
            <p class="text-xs text-slate-400 mt-2">{{ t.type }} · Diajukan {{ t.submittedAt ? new Date(t.submittedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-' }}</p>
          </div>
          <span :class="['inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold', statusConfig[t.status]?.class || 'bg-slate-100 text-slate-500']">
            <component :is="statusConfig[t.status]?.icon || Circle" class="h-3.5 w-3.5" />
            {{ statusConfig[t.status]?.label || t.status }}
          </span>
        </div>
      </div>
    </div>

    <!-- Empty state + show form -->
    <div v-else-if="!showForm" class="text-center py-12">
      <div class="h-20 w-20 mx-auto mb-4 rounded-2xl bg-emerald-100 flex items-center justify-center">
        <GraduationCap class="h-10 w-10 text-emerald-600" />
      </div>
      <h2 class="text-lg font-bold text-slate-800 mb-1">Belum Ada Pengajuan</h2>
      <p class="text-sm text-slate-500 mb-6">Mulai ajukan proposal tugas akhir Anda.</p>
      <button @click="showForm = true" class="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white hover:bg-emerald-700 shadow-lg shadow-emerald-200">
        <Plus class="h-4 w-4" /> Ajukan Proposal Baru
      </button>
    </div>

    <!-- ═══════════ FORM PENGAJUAN ═══════════ -->
    <div v-if="showForm" class="grid grid-cols-1 lg:grid-cols-3 gap-6">

      <!-- LEFT: Form (2 cols) -->
      <div class="lg:col-span-2 space-y-6">

        <!-- Detail Proposal -->
        <div class="rounded-2xl bg-white border border-slate-100 shadow-sm p-6">
          <h2 class="text-base font-bold text-slate-800 flex items-center gap-2 mb-5">
            <FileText class="h-5 w-5 text-emerald-600" /> Detail Proposal
          </h2>

          <div class="space-y-5">
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1.5">Judul Tesis / Disertasi *</label>
              <input v-model="form.title" type="text" placeholder="Masukkan judul penelitian lengkap..."
                class="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-colors" />
            </div>

            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1.5">Judul (English)</label>
              <input v-model="form.titleEn" type="text" placeholder="English title..."
                class="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-colors" />
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-sm font-medium text-slate-700 mb-1.5">Jenis</label>
                <select v-model="form.type" class="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400">
                  <option value="TESIS">Tesis (S2)</option>
                  <option value="DISERTASI">Disertasi (S3)</option>
                </select>
              </div>
              <div>
                <label class="block text-sm font-medium text-slate-700 mb-1.5">Konsentrasi / Peminatan</label>
                <select v-model="form.concentration" class="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400">
                  <option value="">— Pilih Konsentrasi —</option>
                  <option v-for="c in concentrations" :key="c.id" :value="c.name">{{ c.name }}</option>
                </select>
              </div>
            </div>

            <div>
              <div class="flex items-center justify-between mb-1.5">
                <label class="text-sm font-medium text-slate-700">Abstrak *</label>
                <span class="text-xs text-slate-400">{{ wordCount }} / 300 kata</span>
              </div>
              <textarea v-model="form.abstract" rows="5" placeholder="Ringkasan singkat mengenai latar belakang, tujuan, dan metode penelitian..."
                class="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 resize-none transition-colors"></textarea>
            </div>

            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1.5">Kata Kunci (pisahkan dengan koma)</label>
              <div class="flex items-center gap-2 flex-wrap rounded-xl border border-slate-200 px-4 py-2.5 focus-within:ring-2 focus-within:ring-emerald-500/20 focus-within:border-emerald-400 transition-colors">
                <span v-for="kw in keywordsList" :key="kw" class="inline-flex items-center gap-1 bg-emerald-100 text-emerald-700 text-xs font-medium px-2.5 py-1 rounded-lg">
                  {{ kw }}
                  <button @click="removeKeyword(kw)" class="hover:text-emerald-900"><X class="h-3 w-3" /></button>
                </span>
                <input v-model="form.keywords" type="text" placeholder="Tambah tag..." class="flex-1 min-w-[120px] text-sm outline-none border-none bg-transparent py-1" />
              </div>
            </div>
          </div>
        </div>

        <!-- Usulan Dosen Pembimbing -->
        <div class="rounded-2xl bg-white border border-slate-100 shadow-sm p-6">
          <h2 class="text-base font-bold text-slate-800 flex items-center gap-2 mb-5">
            <Users class="h-5 w-5 text-emerald-600" /> Usulan Dosen Pembimbing
          </h2>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-medium text-slate-600 mb-1.5">Calon Pembimbing Utama</label>
              <SearchableSelect
                v-model="form.supervisorId1"
                :options="lecturers.filter(l => l.id != form.supervisorId2).map(l => ({ value: l.id, label: l.fullName || l.name }))"
                placeholder="Cari NIDN atau Nama Dosen..."
              />
              <div v-if="form.supervisorId1" class="mt-2 p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2">
                <div class="h-8 w-8 rounded-full bg-emerald-200 flex items-center justify-center text-xs font-bold text-emerald-700">
                  {{ lecturers.find(l => l.id == form.supervisorId1)?.name?.charAt(0) || '?' }}
                </div>
                <div class="flex-1 min-w-0">
                  <p class="text-xs font-semibold text-slate-800 truncate">{{ lecturers.find(l => l.id == form.supervisorId1)?.fullName || '-' }}</p>
                  <p class="text-[10px] text-slate-500">{{ lecturers.find(l => l.id == form.supervisorId1)?.nidn || '' }}</p>
                </div>
                <span class="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">TERSEDIA</span>
              </div>
            </div>
            <div>
              <label class="block text-xs font-medium text-slate-600 mb-1.5">Calon Pembimbing Pendamping</label>
              <SearchableSelect
                v-model="form.supervisorId2"
                :options="[{ value: '', label: '— Belum dipilih —' }, ...lecturers.filter(l => l.id != form.supervisorId1).map(l => ({ value: l.id, label: l.fullName || l.name }))]"
                placeholder="Cari NIDN atau Nama Dosen..."
              />
              <div v-if="form.supervisorId2" class="mt-2 p-2.5 bg-blue-50 border border-blue-200 rounded-xl flex items-center gap-2">
                <div class="h-8 w-8 rounded-full bg-blue-200 flex items-center justify-center text-xs font-bold text-blue-700">
                  {{ lecturers.find(l => l.id == form.supervisorId2)?.name?.charAt(0) || '?' }}
                </div>
                <div class="flex-1 min-w-0">
                  <p class="text-xs font-semibold text-slate-800 truncate">{{ lecturers.find(l => l.id == form.supervisorId2)?.fullName || '-' }}</p>
                  <p class="text-[10px] text-slate-500">{{ lecturers.find(l => l.id == form.supervisorId2)?.nidn || '' }}</p>
                </div>
              </div>
              <p v-else class="mt-2 text-xs text-slate-400 italic">Belum dipilih</p>
            </div>
          </div>
        </div>

        <!-- Dokumen Proposal -->
        <div class="rounded-2xl bg-white border border-slate-100 shadow-sm p-6">
          <h2 class="text-base font-bold text-slate-800 flex items-center gap-2 mb-5">
            <Upload class="h-5 w-5 text-emerald-600" /> Dokumen Proposal
          </h2>

          <!-- Uploaded file display -->
          <div v-if="form.documentUrl" class="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3">
            <div class="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
              <FileText class="h-5 w-5 text-emerald-600" />
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-slate-800 truncate">{{ uploadedFileName || 'Dokumen Proposal' }}</p>
              <p class="text-xs text-emerald-600">File berhasil diupload</p>
            </div>
            <button @click="form.documentUrl = ''; uploadedFileName = ''" class="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-rose-50">
              <X class="h-4 w-4" />
            </button>
          </div>

          <!-- Upload area -->
          <div v-else class="relative">
            <div :class="['border-2 border-dashed rounded-2xl p-8 text-center transition-colors cursor-pointer',
              uploading ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/30']"
              @click="($refs.fileInput as HTMLInputElement)?.click()"
              @dragover.prevent
              @drop.prevent="handleDrop">
              <div v-if="uploading" class="flex flex-col items-center">
                <Loader2 class="h-10 w-10 text-emerald-500 animate-spin mb-3" />
                <p class="text-sm font-medium text-emerald-700">Mengupload file...</p>
              </div>
              <div v-else>
                <div class="h-14 w-14 mx-auto mb-3 rounded-full bg-slate-100 flex items-center justify-center">
                  <Upload class="h-6 w-6 text-slate-400" />
                </div>
                <p class="text-sm font-medium text-slate-700 mb-1">Tarik & Lepaskan File</p>
                <p class="text-xs text-slate-400 mb-4">Pastikan file dalam format PDF dengan ukuran maksimal 5MB.</p>
                <button type="button" class="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 shadow-sm">
                  Pilih File
                </button>
              </div>
            </div>
            <input ref="fileInput" type="file" accept=".pdf,.doc,.docx" class="hidden" @change="handleFileSelect" />
          </div>
        </div>
      </div>

      <!-- RIGHT: Sidebar (1 col) -->
      <div class="space-y-5">

        <!-- Status Card -->
        <div class="rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-600 p-5 text-white shadow-lg">
          <h3 class="text-sm font-bold mb-3">Status Pengajuan</h3>
          <div class="flex items-center justify-between mb-2">
            <span class="text-xs text-emerald-100">Progress Form</span>
            <span class="text-sm font-bold">{{ formProgress }}%</span>
          </div>
          <div class="h-2 rounded-full bg-white/20 overflow-hidden mb-5">
            <div class="h-full rounded-full bg-white transition-all duration-500" :style="{ width: formProgress + '%' }"></div>
          </div>

          <button @click="submitProposal" :disabled="submitting || formProgress < 40"
            class="w-full rounded-xl bg-white text-emerald-700 py-2.5 text-sm font-bold hover:bg-emerald-50 disabled:opacity-50 transition-colors mb-2">
            <span v-if="submitting">Mengirim...</span>
            <span v-else class="flex items-center justify-center gap-2"><Send class="h-4 w-4" /> Kirim Proposal</span>
          </button>
          <button @click="saveDraft" :disabled="savingDraft"
            class="w-full rounded-xl bg-white/20 text-white py-2.5 text-sm font-medium hover:bg-white/30 transition-colors">
            <span v-if="savingDraft">Menyimpan...</span>
            <span v-else class="flex items-center justify-center gap-2"><Save class="h-4 w-4" /> Simpan sebagai Draft</span>
          </button>

          <p class="text-[10px] text-emerald-200 mt-3 leading-relaxed italic">
            *Dengan mengirimkan proposal, Anda menyetujui syarat dan ketentuan akademik yang berlaku.
          </p>
        </div>

        <!-- Panduan -->
        <div class="rounded-2xl bg-white border border-slate-100 shadow-sm p-5">
          <h3 class="text-xs font-bold text-slate-700 uppercase tracking-wider mb-4">Panduan Pengajuan</h3>
          <div class="space-y-3">
            <div v-for="(g, idx) in guidelines" :key="idx" class="flex items-start gap-2.5">
              <div :class="['h-5 w-5 rounded-full flex items-center justify-center shrink-0 mt-0.5',
                g.done.value ? 'bg-emerald-100' : 'bg-slate-100']">
                <CheckCircle2 v-if="g.done.value" class="h-3.5 w-3.5 text-emerald-600" />
                <Circle v-else class="h-3.5 w-3.5 text-slate-400" />
              </div>
              <div>
                <p :class="['text-sm font-medium', g.done.value ? 'text-emerald-700' : 'text-slate-700']">{{ g.label }}</p>
                <p class="text-[11px] text-slate-400 mt-0.5">{{ g.desc }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Motivational Card -->
        <div class="rounded-2xl overflow-hidden relative h-40 shadow-sm">
          <img src="https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=400&q=80" class="w-full h-full object-cover" />
          <div class="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent flex items-end p-4">
            <p class="text-white text-xs italic leading-relaxed">"Penelitian yang baik dimulai dari perencanaan yang matang."</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

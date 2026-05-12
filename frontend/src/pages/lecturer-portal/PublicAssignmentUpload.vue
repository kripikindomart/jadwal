<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import api from '@/lib/api'
import { Upload, Check, AlertCircle, FileText } from 'lucide-vue-next'

const route = useRoute()
const publicToken = computed(() => route.params.publicToken as string)

const loading = ref(true)
const error = ref('')
const assignment = ref<any>(null)
const submitted = ref(false)
const submitting = ref(false)

const form = ref({
  studentId: null as number | null,
  file: null as File | null,
  studentNotes: '',
})

onMounted(async () => {
  try {
    const res = await api.get(`/public/tugas/${publicToken.value}`)
    assignment.value = res.data
  } catch (e: any) {
    error.value = e.response?.data?.message || 'Tugas tidak ditemukan'
  } finally {
    loading.value = false
  }
})

function onFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  if (input.files && input.files.length > 0) {
    form.value.file = input.files[0] as File
  }
}

async function submit() {
  if (!form.value.studentId || !form.value.file) {
    alert('Pilih nama dan upload file terlebih dahulu')
    return
  }

  submitting.value = true
  try {
    // For now, simulate file upload path (in production, upload to Supabase first)
    const filePath = `/submissions/${publicToken.value}/${form.value.file.name}`

    await api.post(`/public/tugas/${publicToken.value}/upload`, {
      studentId: form.value.studentId,
      fileName: form.value.file.name,
      filePath,
      fileSize: form.value.file.size,
      studentNotes: form.value.studentNotes,
    })

    submitted.value = true
  } catch (e: any) {
    alert(e.response?.data?.message || 'Gagal mengirim tugas')
  } finally {
    submitting.value = false
  }
}

const isOverDeadline = computed(() => {
  if (!assignment.value?.deadline) return false
  return new Date() > new Date(assignment.value.deadline)
})

const searchQuery = ref('')
const filteredStudents = computed(() => {
  if (!assignment.value?.students) return []
  if (!searchQuery.value) return assignment.value.students
  const q = searchQuery.value.toLowerCase()
  return assignment.value.students.filter((s: any) =>
    s.name.toLowerCase().includes(q) || s.nim.includes(q)
  )
})
</script>

<template>
  <div class="min-h-screen bg-slate-50 flex items-center justify-center p-4">
    <!-- Loading -->
    <div v-if="loading" class="text-slate-400">Memuat...</div>

    <!-- Error -->
    <div v-else-if="error" class="text-center">
      <AlertCircle class="h-12 w-12 mx-auto mb-3 text-rose-400" />
      <p class="text-lg font-semibold text-rose-600">{{ error }}</p>
    </div>

    <!-- Success -->
    <div v-else-if="submitted" class="text-center max-w-md">
      <div class="rounded-full bg-emerald-100 h-16 w-16 flex items-center justify-center mx-auto mb-4">
        <Check class="h-8 w-8 text-emerald-600" />
      </div>
      <h2 class="text-xl font-bold text-slate-800 mb-2">Tugas Berhasil Dikirim!</h2>
      <p class="text-sm text-slate-500">
        Dikirim pada {{ new Date().toLocaleString('id-ID') }}
      </p>
    </div>

    <!-- Upload Form -->
    <div v-else class="w-full max-w-lg">
      <div class="rounded-2xl bg-white p-6 shadow-sm border border-slate-100">
        <!-- Header -->
        <div class="mb-6">
          <div class="flex items-center gap-2 mb-2">
            <FileText class="h-5 w-5 text-emerald-600" />
            <h1 class="text-lg font-bold text-slate-800">Pengumpulan Tugas</h1>
          </div>
          <p class="text-sm font-medium text-slate-700">{{ assignment.title }}</p>
          <p class="text-xs text-slate-500 mt-1">{{ assignment.courseName }} · {{ assignment.className }}</p>
          <p v-if="assignment.deadline" class="text-xs mt-1" :class="isOverDeadline ? 'text-rose-600 font-medium' : 'text-slate-400'">
            Deadline: {{ new Date(assignment.deadline).toLocaleString('id-ID') }}
            <span v-if="isOverDeadline"> (Terlambat)</span>
          </p>
          <p v-if="assignment.description" class="text-xs text-slate-500 mt-2 p-3 bg-slate-50 rounded-lg">{{ assignment.description }}</p>
        </div>

        <!-- Student select -->
        <div class="mb-4">
          <label class="block text-sm font-medium text-slate-700 mb-1.5">Pilih Nama Anda</label>
          <input v-model="searchQuery" placeholder="Cari nama atau NIM..." class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/20" />
          <select v-model="form.studentId" class="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20" size="5">
            <option v-for="s in filteredStudents" :key="s.id" :value="s.id">
              {{ s.name }} ({{ s.nim }})
            </option>
          </select>
        </div>

        <!-- File upload -->
        <div class="mb-4">
          <label class="block text-sm font-medium text-slate-700 mb-1.5">Upload File</label>
          <div class="border-2 border-dashed border-slate-200 rounded-lg p-6 text-center hover:border-emerald-300 transition-colors">
            <Upload class="h-8 w-8 mx-auto mb-2 text-slate-400" />
            <p class="text-sm text-slate-500 mb-2">
              {{ form.file ? form.file.name : 'Klik atau drag file ke sini' }}
            </p>
            <p class="text-xs text-slate-400">PDF, ZIP, DOCX, PPTX — Maks 25MB</p>
            <input type="file" @change="onFileChange" accept=".pdf,.zip,.docx,.pptx,.xlsx" class="absolute inset-0 opacity-0 cursor-pointer" style="position: relative;" />
          </div>
        </div>

        <!-- Notes -->
        <div class="mb-6">
          <label class="block text-sm font-medium text-slate-700 mb-1.5">Catatan (opsional)</label>
          <textarea v-model="form.studentNotes" rows="2" placeholder="Catatan tambahan..." class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20"></textarea>
        </div>

        <!-- Submit -->
        <button
          @click="submit"
          :disabled="submitting || !form.studentId || !form.file"
          class="w-full rounded-lg bg-emerald-600 py-3 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
        >
          {{ submitting ? 'Mengirim...' : 'Kirim Tugas' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import axios from 'axios'
import { ArrowLeft, Send, CheckCircle2, Upload, Mail } from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()
const letterTypeId = route.params.id as string

const apiBase = import.meta.env.VITE_API_URL || ''

const letterType = ref<any>(null)
const loading = ref(true)
const submitting = ref(false)
const submitted = ref(false)
const ticketNumber = ref('')

// Identity fields
const identity = ref({
  requesterName: '',
  requesterNim: '',
  requesterEmail: '',
  requesterPhone: '',
})

// Dynamic form answers keyed by field id
const formData = ref<Record<string, any>>({})

onMounted(async () => {
  try {
    const res = await axios.get(`${apiBase}/api/public-letters/types/${letterTypeId}`)
    letterType.value = res.data
    // Initialize formData for each field
    if (res.data.fields) {
      for (const field of res.data.fields) {
        formData.value[field.id] = ''
      }
    }
  } catch (e) {
    console.error(e)
    router.push({ name: 'letters.public.list' })
  } finally {
    loading.value = false
  }
})

const submitRequest = async () => {
  // Validate required fields
  if (!identity.value.requesterName.trim()) {
    alert('Nama lengkap wajib diisi.')
    return
  }

  if (letterType.value?.fields) {
    for (const field of letterType.value.fields) {
      if (field.required && !formData.value[field.id]) {
        alert(`Field "${field.label}" wajib diisi.`)
        return
      }
    }
  }

  submitting.value = true
  try {
    const res = await axios.post(`${apiBase}/api/public-letters/submit`, {
      letterTypeId: Number(letterTypeId),
      ...identity.value,
      submittedData: formData.value,
    })
    ticketNumber.value = res.data.ticketNumber
    submitted.value = true
  } catch (e: any) {
    alert(e.response?.data?.message || 'Gagal mengirim pengajuan.')
  } finally {
    submitting.value = false
  }
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
          <h1 class="text-lg font-bold text-gray-900">{{ letterType?.title || 'Memuat...' }}</h1>
          <p class="text-sm text-gray-500">Isi formulir pengajuan surat</p>
        </div>
      </div>
    </div>

    <div class="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <!-- Loading -->
      <div v-if="loading" class="text-center py-16">
        <div class="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4"></div>
      </div>

      <!-- Success State -->
      <div v-else-if="submitted" class="bg-white rounded-2xl shadow-sm border border-emerald-100 p-8 text-center">
        <div class="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 class="w-8 h-8 text-emerald-600" />
        </div>
        <h2 class="text-xl font-bold text-gray-900 mb-2">Pengajuan Berhasil Dikirim!</h2>
        <p class="text-gray-500 mb-4">Surat Anda sedang diproses oleh admin.</p>
        <div class="bg-indigo-50 border border-indigo-200 rounded-xl p-4 max-w-xs mx-auto mb-6">
          <p class="text-xs font-bold text-indigo-600 uppercase mb-1">Nomor Tiket Anda</p>
          <p class="text-2xl font-mono font-bold text-indigo-800">{{ ticketNumber }}</p>
          <p class="text-xs text-indigo-500 mt-1">Simpan nomor ini untuk melacak status surat Anda.</p>
        </div>
        <div class="flex justify-center gap-3">
          <button @click="router.push({ name: 'letters.public.list' })"
            class="px-5 py-2.5 text-sm font-semibold rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors">
            Kembali
          </button>
          <button @click="router.push({ name: 'letters.public.track', params: { ticket: ticketNumber } })"
            class="px-5 py-2.5 text-sm font-semibold rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition-colors">
            Lacak Status
          </button>
        </div>
      </div>

      <!-- Form -->
      <div v-else class="space-y-6">
        <!-- Description -->
        <div v-if="letterType?.description" class="bg-blue-50 border border-blue-100 rounded-xl p-4">
          <p class="text-sm text-blue-800">{{ letterType.description }}</p>
        </div>

        <!-- Identity Section -->
        <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
          <h3 class="font-bold text-gray-800 flex items-center gap-2">
            <Mail class="w-5 h-5 text-indigo-600" /> Data Pemohon
          </h3>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div class="sm:col-span-2">
              <label class="block text-sm font-medium text-gray-700 mb-1">Nama Lengkap <span class="text-red-500">*</span></label>
              <input v-model="identity.requesterName" type="text" placeholder="Nama sesuai KTM/KTP"
                class="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">NIM</label>
              <input v-model="identity.requesterNim" type="text" placeholder="Nomor Induk Mahasiswa"
                class="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input v-model="identity.requesterEmail" type="email" placeholder="email@contoh.com"
                class="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm" />
            </div>
            <div class="sm:col-span-2">
              <label class="block text-sm font-medium text-gray-700 mb-1">No. WhatsApp / Telepon</label>
              <input v-model="identity.requesterPhone" type="tel" placeholder="08xxxxxxxxxx"
                class="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm" />
            </div>
          </div>
        </div>

        <!-- Dynamic Fields -->
        <div v-if="letterType?.fields && letterType.fields.length > 0"
          class="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-5">
          <h3 class="font-bold text-gray-800">Detail Pengajuan</h3>

          <div v-for="field in letterType.fields" :key="field.id" class="space-y-1.5">
            <label class="block text-sm font-medium text-gray-700">
              {{ field.label }}
              <span v-if="field.required" class="text-red-500">*</span>
            </label>

            <!-- Text -->
            <input v-if="field.type === 'text' || field.type === 'email' || field.type === 'phone' || field.type === 'number'"
              v-model="formData[field.id]"
              :type="field.type === 'phone' ? 'tel' : field.type"
              :placeholder="field.placeholder || ''"
              class="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm" />

            <!-- Textarea -->
            <textarea v-else-if="field.type === 'textarea'"
              v-model="formData[field.id]"
              rows="3"
              :placeholder="field.placeholder || ''"
              class="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm resize-y"></textarea>

            <!-- Date -->
            <input v-else-if="field.type === 'date'"
              v-model="formData[field.id]"
              type="date"
              class="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm" />

            <!-- Select -->
            <select v-else-if="field.type === 'select'"
              v-model="formData[field.id]"
              class="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm">
              <option value="">-- Pilih --</option>
              <option v-for="opt in field.options" :key="opt" :value="opt">{{ opt }}</option>
            </select>

            <!-- File Upload (placeholder text for now) -->
            <div v-else-if="field.type === 'file'">
              <label class="flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-dashed border-gray-300 hover:border-indigo-400 cursor-pointer transition-colors bg-gray-50 hover:bg-indigo-50">
                <Upload class="w-5 h-5 text-gray-400" />
                <span class="text-sm text-gray-500">{{ formData[field.id] ? 'File dipilih' : 'Klik untuk upload file' }}</span>
                <input type="file" class="sr-only" @change="(e: any) => { formData[field.id] = e.target.files?.[0]?.name || '' }" />
              </label>
            </div>
          </div>
        </div>

        <!-- Submit -->
        <div class="flex justify-end pt-4 pb-8">
          <button @click="submitRequest" :disabled="submitting"
            class="w-full sm:w-auto px-8 py-3.5 bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-bold rounded-xl hover:from-indigo-700 hover:to-blue-700 shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-2 disabled:opacity-70">
            <div v-if="submitting" class="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            <Send v-else class="w-5 h-5" />
            {{ submitting ? 'Mengirim...' : 'Kirim Pengajuan' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

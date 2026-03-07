<script setup lang="ts">
import { ref } from 'vue'
import { ClipboardList, Activity, CheckCircle, XCircle } from 'lucide-vue-next'
import api from '@/lib/api'

const pingStatus = ref<'idle' | 'loading' | 'success' | 'error'>('idle')
const pingMessage = ref('')

const testConnection = async () => {
  pingStatus.value = 'loading'
  pingMessage.value = 'Menghubungi server...'
  try {
    const res = await api.get('/semesters') // Simple lightweight request to fetch active semesters
    if (res.status === 200 || res.status === 201) {
      pingStatus.value = 'success'
      pingMessage.value = 'Berhasil Terhubung ke API!'
    } else {
      pingStatus.value = 'error'
      pingMessage.value = `Gagal! HTTP ${res.status}`
    }
  } catch (err: any) {
    pingStatus.value = 'error'
    pingMessage.value = err.message || 'Gagal terhubung ke API'
  }
  
  setTimeout(() => {
    pingStatus.value = 'idle'
  }, 4000)
}
</script>

<template>
  <div class="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
    <div class="max-w-md w-full bg-white rounded-2xl shadow-xl p-10 text-center border border-gray-100">
      <div class="w-20 h-20 bg-gradient-to-br from-purple-100 to-indigo-50 text-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm">
        <ClipboardList class="w-10 h-10" />
      </div>
      <h1 class="text-2xl font-bold text-gray-900 mb-3">Portal Survei / EDOM</h1>
      <p class="text-gray-500 mb-8 leading-relaxed">
        Selamat datang di Portal Survei. Silakan gunakan link spesifik (URL tautan) yang telah dibagikan oleh Program Studi atau Dosen Anda untuk mulai mengisi kuesioner.
      </p>
      <div class="text-sm font-medium text-purple-600 bg-purple-50 py-3 rounded-xl border border-purple-100 mb-6">
        Pastikan link yang Anda akses sudah benar dan lengkap.
      </div>
      
      <!-- Diagnostic Tool -->
      <div class="pt-6 border-t border-gray-100">
        <button 
          @click="testConnection"
          class="inline-flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-full border transition-all duration-300 shadow-sm"
          :class="{
            'border-gray-200 text-gray-500 hover:bg-gray-50 hover:border-gray-300': pingStatus === 'idle',
            'border-blue-200 text-blue-600 bg-blue-50': pingStatus === 'loading',
            'border-green-200 text-green-600 bg-green-50': pingStatus === 'success',
            'border-red-200 text-red-600 bg-red-50': pingStatus === 'error'
          }"
        >
          <Activity v-if="pingStatus === 'idle' || pingStatus === 'loading'" 
            class="w-4 h-4" :class="{ 'animate-pulse': pingStatus === 'loading' }" />
          <CheckCircle v-if="pingStatus === 'success'" class="w-4 h-4" />
          <XCircle v-if="pingStatus === 'error'" class="w-4 h-4" />
          {{ pingStatus === 'idle' ? 'Test API Koneksi' : pingMessage }}
        </button>
      </div>
    </div>
  </div>
</template>

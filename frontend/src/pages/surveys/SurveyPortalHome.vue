<script setup lang="ts">
import { ClipboardList } from 'lucide-vue-next'
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
      <div class="text-sm font-medium text-purple-600 bg-purple-50 py-3 rounded-xl border border-purple-100">
        Pastikan link yang Anda akses sudah benar dan lengkap.
      </div>
    </div>
  </div>
</template>

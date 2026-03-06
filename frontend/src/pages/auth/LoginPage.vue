<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { Eye, EyeOff, Loader2 } from 'lucide-vue-next'

const router = useRouter()
const authStore = useAuthStore()

const email = ref('')
const password = ref('')
const showPassword = ref(false)
const error = ref('')
const loading = ref(false)

async function handleLogin() {
  error.value = ''
  loading.value = true

  try {
    await authStore.login(email.value, password.value)
    router.push('/')
  } catch (err: any) {
    error.value = err?.response?.data?.message || 'Email atau password salah'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div>
    <!-- Header -->
    <div class="mb-8">
      <div class="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 text-xl font-bold mb-4">
        P
      </div>
      <h1 class="text-2xl font-bold text-slate-800">Selamat Datang 👋</h1>
      <p class="mt-2 text-slate-500">Masuk ke akun Anda untuk melanjutkan</p>
    </div>

    <!-- Error -->
    <div
      v-if="error"
      class="mb-4 rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700"
    >
      {{ error }}
    </div>

    <!-- Form -->
    <form @submit.prevent="handleLogin" class="space-y-5">
      <div>
        <label for="email" class="mb-1.5 block text-sm font-medium text-slate-700">
          Email
        </label>
        <input
          id="email"
          v-model="email"
          type="email"
          placeholder="admin@pasca.ac.id"
          required
          class="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
        />
      </div>

      <div>
        <label for="password" class="mb-1.5 block text-sm font-medium text-slate-700">
          Password
        </label>
        <div class="relative">
          <input
            id="password"
            v-model="password"
            :type="showPassword ? 'text' : 'password'"
            placeholder="Masukkan password"
            required
            class="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 pr-12 text-sm text-slate-800 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
          />
          <button
            type="button"
            @click="showPassword = !showPassword"
            class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <component :is="showPassword ? EyeOff : Eye" class="h-5 w-5" />
          </button>
        </div>
      </div>

      <button
        type="submit"
        :disabled="loading"
        class="w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-600/30 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
      >
        <span v-if="loading" class="flex items-center justify-center gap-2">
          <Loader2 class="h-4 w-4 animate-spin" />
          Memuat...
        </span>
        <span v-else>Masuk</span>
      </button>
    </form>

    <!-- Footer -->
    <p class="mt-8 text-center text-xs text-slate-400">
      &copy; 2026 Pasca CMS — Sistem Informasi Akademik Pascasarjana
    </p>
  </div>
</template>

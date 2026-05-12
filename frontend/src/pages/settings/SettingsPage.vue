<script setup lang="ts">
import { ref, onMounted } from 'vue'
import api from '@/lib/api'
import { Settings, Globe, GraduationCap, Bot, Save, Loader2 } from 'lucide-vue-next'

const loading = ref(true)
const saving = ref(false)
const activeTab = ref<'general' | 'academic' | 'ai'>('general')

const settings = ref<Record<string, string>>({
  app_name: '',
  app_logo: '',
  app_copyright: '',
  active_semester_id: '',
  ai_provider: 'openai',
  ai_api_key: '',
  ai_model: 'gpt-4o',
})

const semesters = ref<{ id: number; name: string }[]>([])

onMounted(async () => {
  try {
    const [settingsRes, semestersRes] = await Promise.all([
      api.get('/settings'),
      api.get('/semesters'),
    ])
    settings.value = { ...settings.value, ...settingsRes.data }
    semesters.value = semestersRes.data?.data || semestersRes.data || []
  } catch (e) {
    console.error('Failed to load settings:', e)
  } finally {
    loading.value = false
  }
})

async function saveSettings() {
  saving.value = true
  try {
    const res = await api.patch('/settings', settings.value)
    settings.value = { ...settings.value, ...res.data }
    alert('Pengaturan berhasil disimpan')
  } catch (e) {
    console.error('Failed to save settings:', e)
    alert('Gagal menyimpan pengaturan')
  } finally {
    saving.value = false
  }
}

const tabs = [
  { key: 'general', label: 'Umum', icon: Globe },
  { key: 'academic', label: 'Akademik', icon: GraduationCap },
  { key: 'ai', label: 'AI Config', icon: Bot },
] as const
</script>

<template>
  <div>
    <!-- Page Header -->
    <div class="mb-6 flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <Settings class="h-6 w-6 text-emerald-600" />
          Pengaturan Sistem
        </h1>
        <p class="mt-1 text-slate-500">Konfigurasi global aplikasi</p>
      </div>
      <button
        @click="saveSettings"
        :disabled="saving || loading"
        class="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
      >
        <Loader2 v-if="saving" class="h-4 w-4 animate-spin" />
        <Save v-else class="h-4 w-4" />
        Simpan Perubahan
      </button>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="rounded-2xl bg-white p-8 shadow-sm border border-slate-100">
      <div class="animate-pulse space-y-4">
        <div class="h-10 w-64 bg-slate-200 rounded"></div>
        <div class="h-10 w-full bg-slate-200 rounded"></div>
        <div class="h-10 w-full bg-slate-200 rounded"></div>
      </div>
    </div>

    <!-- Settings Form -->
    <div v-else class="rounded-2xl bg-white shadow-sm border border-slate-100 overflow-hidden">
      <!-- Tabs -->
      <div class="border-b border-slate-100 px-6">
        <nav class="flex gap-6">
          <button
            v-for="tab in tabs"
            :key="tab.key"
            @click="activeTab = tab.key"
            :class="[
              'flex items-center gap-2 py-3 text-sm font-medium border-b-2 transition-colors',
              activeTab === tab.key
                ? 'border-emerald-600 text-emerald-600'
                : 'border-transparent text-slate-500 hover:text-slate-700',
            ]"
          >
            <component :is="tab.icon" class="h-4 w-4" />
            {{ tab.label }}
          </button>
        </nav>
      </div>

      <!-- Tab Content -->
      <div class="p-6">
        <!-- General Tab -->
        <div v-if="activeTab === 'general'" class="space-y-5 max-w-lg">
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1.5">Nama Aplikasi</label>
            <input
              v-model="settings.app_name"
              type="text"
              class="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              placeholder="Prodi CMS"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1.5">URL Logo</label>
            <input
              v-model="settings.app_logo"
              type="text"
              class="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              placeholder="https://example.com/logo.png"
            />
            <p class="mt-1 text-xs text-slate-400">URL gambar logo yang ditampilkan di sidebar dan halaman publik</p>
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1.5">Copyright Text</label>
            <input
              v-model="settings.app_copyright"
              type="text"
              class="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              placeholder="© 2026 Pascasarjana"
            />
          </div>
        </div>

        <!-- Academic Tab -->
        <div v-if="activeTab === 'academic'" class="space-y-5 max-w-lg">
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1.5">Semester Aktif</label>
            <select
              v-model="settings.active_semester_id"
              class="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            >
              <option value="">— Pilih Semester —</option>
              <option v-for="sem in semesters" :key="sem.id" :value="String(sem.id)">
                {{ sem.name }}
              </option>
            </select>
            <p class="mt-1 text-xs text-slate-400">Semester yang digunakan sebagai default filter di seluruh aplikasi</p>
          </div>
        </div>

        <!-- AI Config Tab -->
        <div v-if="activeTab === 'ai'" class="space-y-5 max-w-lg">
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1.5">AI Provider</label>
            <select
              v-model="settings.ai_provider"
              class="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            >
              <option value="openai">OpenAI</option>
              <option value="gemini">Google Gemini</option>
              <option value="anthropic">Anthropic</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1.5">API Key</label>
            <input
              v-model="settings.ai_api_key"
              type="password"
              class="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              placeholder="sk-..."
            />
            <p class="mt-1 text-xs text-slate-400">API key disimpan terenkripsi di database</p>
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1.5">Model</label>
            <input
              v-model="settings.ai_model"
              type="text"
              class="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              placeholder="gpt-4o"
            />
            <p class="mt-1 text-xs text-slate-400">Nama model AI yang digunakan (contoh: gpt-4o, gemini-pro, claude-3-sonnet)</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

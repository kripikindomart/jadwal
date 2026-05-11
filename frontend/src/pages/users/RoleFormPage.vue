<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import api from '@/lib/api'
import { ArrowLeft, Loader2 } from 'lucide-vue-next'

const router = useRouter()
const route = useRoute()
const isEdit = !!route.params.id

const form = ref({
  name: '',
  slug: '',
  permissionIds: [] as number[],
})

const allPermissions = ref<{ id: number; name: string; slug: string; group: string }[]>([])
const loading = ref(false)
const error = ref('')

async function fetchPermissions() {
  const { data } = await api.get('/permissions')
  allPermissions.value = data
}

async function fetchRole() {
  if (!isEdit) return
  const { data } = await api.get(`/roles/${route.params.id}`)
  form.value.name = data.name
  form.value.slug = data.slug
  form.value.permissionIds = data.permissions.map((p: any) => p.id)
}

async function handleSubmit() {
  error.value = ''
  loading.value = true
  try {
    if (isEdit) {
      await api.patch(`/roles/${route.params.id}`, form.value)
    } else {
      await api.post('/roles', form.value)
    }
    router.push('/users/roles')
  } catch (err: any) {
    error.value = err?.response?.data?.message || 'Gagal menyimpan data'
  } finally {
    loading.value = false
  }
}

function togglePerm(id: number) {
  const idx = form.value.permissionIds.indexOf(id)
  if (idx > -1) {
    form.value.permissionIds.splice(idx, 1)
  } else {
    form.value.permissionIds.push(id)
  }
}

// Group permissions by group name
function groupedPermissions() {
  const groups: Record<string, typeof allPermissions.value> = {}
  for (const p of allPermissions.value) {
    const g = p.group || 'Lainnya'
    if (!groups[g]) groups[g] = []
    groups[g].push(p)
  }
  return groups
}

onMounted(async () => {
  await fetchPermissions()
  await fetchRole()
})
</script>

<template>
  <div class="max-w-5xl mx-auto">
    <!-- Header -->
    <div class="mb-8">
      <button @click="router.push('/users/roles')" class="group flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-emerald-600 mb-4 transition-colors">
        <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 group-hover:bg-emerald-100 transition-colors">
          <ArrowLeft class="h-4 w-4" />
        </div>
        Kembali ke Daftar Role
      </button>
      <div>
        <h1 class="text-3xl font-bold text-slate-900 tracking-tight">{{ isEdit ? 'Edit Data Role' : 'Tambah Role Baru' }}</h1>
        <p class="mt-2 text-sm text-slate-500 max-w-2xl">Lengkapi form di bawah ini untuk {{ isEdit ? 'mengubah' : 'menambahkan' }} role beserta hak aksesnya.</p>
      </div>
    </div>

    <!-- Error -->
    <div v-if="error" class="mb-6 flex items-center gap-3 rounded-2xl bg-rose-50 border border-rose-100 px-5 py-4 text-sm text-rose-700 shadow-sm">
      <div class="h-2 w-2 rounded-full bg-rose-500 animate-pulse"></div>
      {{ error }}
    </div>

    <form @submit.prevent="handleSubmit" class="grid grid-cols-1 lg:grid-cols-12 gap-8">
      <!-- Left Column: Basic Info -->
      <div class="lg:col-span-4 space-y-6">
        <div class="rounded-3xl bg-white p-6 shadow-sm border border-slate-200">
          <h3 class="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            Informasi Dasar
          </h3>
          
          <div class="space-y-5">
            <div>
              <label class="mb-1.5 block text-sm font-semibold text-slate-700">Nama Role</label>
              <input v-model="form.name" type="text" required
                class="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all"
                placeholder="Contoh: Admin Prodi"
              />
            </div>

            <div>
              <label class="mb-1.5 block text-sm font-semibold text-slate-700">Slug Identifier</label>
              <input v-model="form.slug" type="text" required
                class="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all font-mono"
                placeholder="contoh: admin-prodi"
              />
              <p class="mt-2 text-xs text-slate-400">Digunakan sebagai ID unik (huruf kecil, tanpa spasi).</p>
            </div>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="rounded-3xl bg-white p-6 shadow-sm border border-slate-200 flex flex-col gap-3">
          <button type="submit" :disabled="loading"
            class="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 disabled:opacity-60 transition-all active:scale-[0.98]"
          >
            <Loader2 v-if="loading" class="h-5 w-5 animate-spin" />
            {{ isEdit ? 'Simpan Perubahan' : 'Buat Role Sekarang' }}
          </button>
          <button type="button" @click="router.push('/users/roles')"
            class="w-full rounded-xl border border-slate-200 px-6 py-3.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
          >
            Batalkan
          </button>
        </div>
      </div>

      <!-- Right Column: Permissions -->
      <div class="lg:col-span-8">
        <div class="rounded-3xl bg-white p-6 sm:p-8 shadow-sm border border-slate-200">
          <div class="flex items-center justify-between mb-6 pb-6 border-b border-slate-100">
            <div>
              <h3 class="text-xl font-bold text-slate-900">Konfigurasi Hak Akses</h3>
              <p class="mt-1 text-sm text-slate-500">Pilih modul apa saja yang dapat diakses oleh role ini.</p>
            </div>
            <div class="text-right">
              <span class="inline-flex items-center rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">
                {{ form.permissionIds.length }} Terpilih
              </span>
            </div>
          </div>

          <div v-if="!allPermissions.length" class="flex flex-col items-center justify-center py-12 text-center">
            <div class="h-12 w-12 rounded-full bg-slate-50 flex items-center justify-center mb-3">
              <Loader2 class="h-5 w-5 text-slate-400 animate-spin" />
            </div>
            <p class="text-sm font-medium text-slate-500">Memuat daftar permission...</p>
          </div>
          
          <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div v-for="(perms, group) in groupedPermissions()" :key="group" class="rounded-2xl bg-slate-50/50 p-5 border border-slate-100 hover:border-slate-200 transition-colors">
              <div class="flex items-center gap-2 mb-4">
                <div class="h-2 w-2 rounded-full bg-emerald-400"></div>
                <h4 class="text-sm font-bold text-slate-800 uppercase tracking-wider">{{ group }}</h4>
              </div>
              <div class="flex flex-col gap-2">
                <button
                  v-for="perm in perms"
                  :key="perm.id"
                  type="button"
                  @click="togglePerm(perm.id)"
                  class="group relative flex items-center justify-between rounded-xl px-4 py-2.5 text-sm transition-all"
                  :class="[
                    form.permissionIds.includes(perm.id)
                      ? 'bg-white border-2 border-emerald-500 text-emerald-800 shadow-sm'
                      : 'bg-white border-2 border-transparent text-slate-600 hover:border-slate-200 shadow-sm hover:shadow'
                  ]"
                >
                  <span class="font-medium text-left leading-tight">{{ perm.name }}</span>
                  <div 
                    class="h-5 w-5 rounded-md border flex items-center justify-center transition-colors shrink-0 ml-3"
                    :class="[
                      form.permissionIds.includes(perm.id) 
                        ? 'bg-emerald-500 border-emerald-500 text-white' 
                        : 'border-slate-300 bg-slate-50 group-hover:border-slate-400'
                    ]"
                  >
                    <svg v-if="form.permissionIds.includes(perm.id)" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </form>
  </div>
</template>

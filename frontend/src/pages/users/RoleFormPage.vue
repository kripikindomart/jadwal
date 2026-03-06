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
  <div class="max-w-2xl">
    <!-- Header -->
    <div class="mb-6">
      <button @click="router.push('/users/roles')" class="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-3 transition-colors">
        <ArrowLeft class="h-4 w-4" />
        Kembali
      </button>
      <h1 class="text-2xl font-bold text-slate-800">{{ isEdit ? 'Edit Role' : 'Tambah Role' }}</h1>
    </div>

    <!-- Error -->
    <div v-if="error" class="mb-4 rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700">
      {{ error }}
    </div>

    <!-- Form -->
    <form @submit.prevent="handleSubmit" class="space-y-5 rounded-2xl bg-white p-6 shadow-sm border border-slate-100">
      <div>
        <label class="mb-1.5 block text-sm font-medium text-slate-700">Nama Role</label>
        <input v-model="form.name" type="text" required
          class="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
          placeholder="Contoh: Admin Prodi"
        />
      </div>

      <div>
        <label class="mb-1.5 block text-sm font-medium text-slate-700">Slug</label>
        <input v-model="form.slug" type="text" required
          class="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all font-mono"
          placeholder="contoh: admin-prodi"
        />
      </div>

      <!-- Permissions -->
      <div>
        <label class="mb-2 block text-sm font-medium text-slate-700">Permissions</label>
        <div v-if="!allPermissions.length" class="text-sm text-slate-400 italic">
          Belum ada permission. Buat permission terlebih dahulu.
        </div>
        <div v-else class="space-y-4">
          <div v-for="(perms, group) in groupedPermissions()" :key="group">
            <p class="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">{{ group }}</p>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="perm in perms"
                :key="perm.id"
                type="button"
                @click="togglePerm(perm.id)"
                :class="[
                  'rounded-xl px-3 py-1.5 text-sm font-medium border transition-all',
                  form.permissionIds.includes(perm.id)
                    ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-600/20'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300 hover:text-blue-600',
                ]"
              >
                {{ perm.name }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="flex gap-3 pt-2">
        <button type="submit" :disabled="loading"
          class="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 disabled:opacity-60 transition-colors"
        >
          <Loader2 v-if="loading" class="h-4 w-4 animate-spin" />
          {{ isEdit ? 'Simpan Perubahan' : 'Tambah Role' }}
        </button>
        <button type="button" @click="router.push('/users/roles')"
          class="rounded-xl border border-slate-200 px-6 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
        >
          Batal
        </button>
      </div>
    </form>
  </div>
</template>

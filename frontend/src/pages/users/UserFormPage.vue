<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import api from '@/lib/api'
import { ArrowLeft, Loader2 } from 'lucide-vue-next'

const router = useRouter()
const route = useRoute()
const isEdit = !!route.params.id

const form = ref({
  name: '',
  email: '',
  password: '',
  roleIds: [] as number[],
  prodiIds: [] as number[],
})

const allRoles = ref<{ id: number; name: string; slug: string }[]>([])
const allProdis = ref<{ id: number; name: string; degree: string }[]>([])
const loading = ref(false)
const error = ref('')

async function fetchRoles() {
  const { data } = await api.get('/roles')
  allRoles.value = data
}

async function fetchProdis() {
  const { data } = await api.get('/prodis?perPage=100')
  allProdis.value = data.data || []
}

async function fetchUser() {
  if (!isEdit) return
  const { data } = await api.get(`/users/${route.params.id}`)
  form.value.name = data.name
  form.value.email = data.email
  form.value.roleIds = data.roles.map((r: any) => r.id)
  form.value.prodiIds = data.prodis?.map((p: any) => p.id) || []
}

async function handleSubmit() {
  error.value = ''
  loading.value = true
  try {
    const payload: any = {
      name: form.value.name,
      email: form.value.email,
      roleIds: form.value.roleIds,
      prodiIds: form.value.prodiIds,
    }
    if (form.value.password) {
      payload.password = form.value.password
    }

    if (isEdit) {
      await api.patch(`/users/${route.params.id}`, payload)
    } else {
      await api.post('/users', payload)
    }
    router.push('/users')
  } catch (err: any) {
    error.value = err?.response?.data?.message || 'Gagal menyimpan data'
  } finally {
    loading.value = false
  }
}

function toggleRole(id: number) {
  const idx = form.value.roleIds.indexOf(id)
  if (idx > -1) {
    form.value.roleIds.splice(idx, 1)
  } else {
    form.value.roleIds.push(id)
  }
}

function toggleProdi(id: number) {
  const idx = form.value.prodiIds.indexOf(id)
  if (idx > -1) {
    form.value.prodiIds.splice(idx, 1)
  } else {
    form.value.prodiIds.push(id)
  }
}

const PRODI_ROLE_SLUGS = ['staff', 'dosen', 'mahasiswa']

const showProdiSection = computed(() => {
  return form.value.roleIds.some(rid => {
    const role = allRoles.value.find(r => r.id === rid)
    return role && PRODI_ROLE_SLUGS.includes(role.slug)
  })
})

// Clear prodiIds when prodi section is hidden
watch(showProdiSection, (show) => {
  if (!show) {
    form.value.prodiIds = []
  }
})

onMounted(async () => {
  await Promise.all([fetchRoles(), fetchProdis()])
  await fetchUser()
})
</script>

<template>
  <div class="max-w-2xl">
    <!-- Header -->
    <div class="mb-6">
      <button @click="router.push('/users')" class="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-3 transition-colors">
        <ArrowLeft class="h-4 w-4" />
        Kembali
      </button>
      <h1 class="text-2xl font-bold text-slate-800">{{ isEdit ? 'Edit User' : 'Tambah User' }}</h1>
    </div>

    <!-- Error -->
    <div v-if="error" class="mb-4 rounded-xl bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700">
      {{ error }}
    </div>

    <!-- Form -->
    <form @submit.prevent="handleSubmit" class="space-y-5 rounded-2xl bg-white p-6 shadow-sm border border-slate-100">
      <div>
        <label class="mb-1.5 block text-sm font-medium text-slate-700">Nama</label>
        <input v-model="form.name" type="text" required
          class="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
          placeholder="Nama lengkap"
        />
      </div>

      <div>
        <label class="mb-1.5 block text-sm font-medium text-slate-700">Email</label>
        <input v-model="form.email" type="email" required
          class="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
          placeholder="email@example.com"
        />
      </div>

      <div>
        <label class="mb-1.5 block text-sm font-medium text-slate-700">
          Password {{ isEdit ? '(kosongkan jika tidak ingin mengubah)' : '' }}
        </label>
        <input v-model="form.password" type="password" :required="!isEdit"
          class="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
          placeholder="Minimal 6 karakter"
        />
      </div>

      <!-- Roles -->
      <div>
        <label class="mb-2 block text-sm font-medium text-slate-700">Roles</label>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="role in allRoles"
            :key="role.id"
            type="button"
            @click="toggleRole(role.id)"
            :class="[
              'rounded-xl px-4 py-2 text-sm font-medium border transition-all',
              form.roleIds.includes(role.id)
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/20'
                : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-300 hover:text-emerald-600',
            ]"
          >
            {{ role.name }}
          </button>
        </div>
      </div>

      <!-- Prodis (conditional) -->
      <div v-if="showProdiSection">
        <label class="mb-2 block text-sm font-medium text-slate-700">Akses Program Studi (Khusus Staf/Dosen)</label>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="prodi in allProdis"
            :key="prodi.id"
            type="button"
            @click="toggleProdi(prodi.id)"
            :class="[
              'rounded-xl px-4 py-2 text-sm font-medium border transition-all',
              form.prodiIds.includes(prodi.id)
                ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-600/20'
                : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300 hover:text-blue-600',
            ]"
          >
            {{ prodi.degree }} - {{ prodi.name }}
          </button>
        </div>
      </div>

      <div class="flex gap-3 pt-2">
        <button type="submit" :disabled="loading"
          class="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 disabled:opacity-60 transition-colors"
        >
          <Loader2 v-if="loading" class="h-4 w-4 animate-spin" />
          {{ isEdit ? 'Simpan Perubahan' : 'Tambah User' }}
        </button>
        <button type="button" @click="router.push('/users')"
          class="rounded-xl border border-slate-200 px-6 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
        >
          Batal
        </button>
      </div>
    </form>
  </div>
</template>

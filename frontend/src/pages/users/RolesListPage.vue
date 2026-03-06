<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import api from '@/lib/api'
import { Plus, Pencil, Trash2, Shield } from 'lucide-vue-next'

const router = useRouter()

interface RoleItem {
  id: number
  name: string
  slug: string
  permissions: { id: number; name: string; slug: string; group: string }[]
  createdAt: string
}

const roles = ref<RoleItem[]>([])
const loading = ref(false)

async function fetchRoles() {
  loading.value = true
  try {
    const { data } = await api.get('/roles')
    roles.value = data
  } finally {
    loading.value = false
  }
}

async function deleteRole(id: number) {
  if (!confirm('Yakin ingin menghapus role ini?')) return
  await api.delete(`/roles/${id}`)
  fetchRoles()
}

onMounted(() => fetchRoles())
</script>

<template>
  <div>
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
      <div>
        <h1 class="text-2xl font-bold text-slate-800">Manajemen Role</h1>
        <p class="mt-1 text-sm text-slate-500">Kelola role dan permission yang diberikan</p>
      </div>
      <button
        @click="router.push('/users/roles/create')"
        class="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 transition-colors"
      >
        <Plus class="h-4 w-4" />
        Tambah Role
      </button>
    </div>

    <!-- Roles Grid -->
    <div v-if="loading" class="text-center py-12 text-slate-400">Memuat data...</div>

    <div v-else-if="!roles.length" class="text-center py-12">
      <Shield class="h-10 w-10 text-slate-300 mx-auto mb-3" />
      <p class="text-slate-400">Belum ada role</p>
    </div>

    <div v-else class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      <div
        v-for="role in roles"
        :key="role.id"
        class="rounded-2xl bg-white p-5 shadow-sm border border-slate-100 hover:-translate-y-0.5 hover:shadow-md transition-all duration-200"
      >
        <div class="flex items-start justify-between mb-3">
          <div>
            <h3 class="font-semibold text-slate-800">{{ role.name }}</h3>
            <p class="text-xs text-slate-400 mt-0.5 font-mono">{{ role.slug }}</p>
          </div>
          <div class="flex gap-1">
            <button
              @click="router.push(`/users/roles/${role.id}/edit`)"
              class="rounded-lg p-1.5 text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition-colors"
            >
              <Pencil class="h-4 w-4" />
            </button>
            <button
              @click="deleteRole(role.id)"
              class="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
            >
              <Trash2 class="h-4 w-4" />
            </button>
          </div>
        </div>

        <!-- Permissions -->
        <div v-if="role.permissions.length" class="flex flex-wrap gap-1.5">
          <span
            v-for="perm in role.permissions"
            :key="perm.id"
            class="inline-flex items-center rounded-lg bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 border border-blue-100"
          >
            {{ perm.name }}
          </span>
        </div>
        <p v-else class="text-xs text-slate-400 italic">Belum ada permission</p>
      </div>
    </div>
  </div>
</template>

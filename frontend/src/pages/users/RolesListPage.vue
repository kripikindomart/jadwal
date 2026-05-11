<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import api from '@/lib/api'
import { Plus, Pencil, Trash2, Shield, ShieldCheck, Users, Briefcase, GraduationCap, LockKeyhole } from 'lucide-vue-next'

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

function getRoleIcon(slug: string) {
  switch (slug) {
    case 'superadmin': return ShieldCheck;
    case 'admin': return Shield;
    case 'staff': return Briefcase;
    case 'dosen': return GraduationCap;
    case 'mahasiswa': return Users;
    default: return LockKeyhole;
  }
}

onMounted(() => fetchRoles())
</script>

<template>
  <div class="max-w-7xl mx-auto">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
      <div>
        <h1 class="text-3xl font-bold text-slate-900 tracking-tight">Manajemen Role</h1>
        <p class="mt-2 text-sm text-slate-500 max-w-2xl">Kelola tingkat akses dan wewenang (permissions) pengguna di dalam sistem.</p>
      </div>
      <button
        @click="router.push('/users/roles/create')"
        class="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 hover:-translate-y-0.5 hover:shadow-xl transition-all duration-300"
      >
        <Plus class="h-4 w-4" />
        Tambah Role Baru
      </button>
    </div>

    <!-- Roles Grid -->
    <div v-if="loading" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div v-for="i in 3" :key="i" class="h-48 rounded-2xl bg-slate-100 animate-pulse"></div>
    </div>

    <div v-else-if="!roles.length" class="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-slate-100 shadow-sm">
      <div class="h-20 w-20 bg-slate-50 rounded-full flex items-center justify-center mb-4">
        <Shield class="h-10 w-10 text-slate-300" />
      </div>
      <h3 class="text-lg font-semibold text-slate-900 mb-1">Belum Ada Data Role</h3>
      <p class="text-slate-500 text-sm max-w-sm text-center">Anda belum membuat role apapun. Silakan tambahkan role pertama Anda untuk mengatur hak akses sistem.</p>
    </div>

    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div
        v-for="role in roles"
        :key="role.id"
        class="group relative flex flex-col justify-between rounded-3xl bg-white p-6 shadow-sm border border-slate-200 hover:border-emerald-200 hover:shadow-xl hover:shadow-emerald-900/5 transition-all duration-300 overflow-hidden"
      >
        <!-- Background Decoration -->
        <div class="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-emerald-50 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>

        <div>
          <div class="flex items-start justify-between mb-5 relative z-10">
            <div class="flex items-center gap-3">
              <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 shadow-sm border border-emerald-100">
                <component :is="getRoleIcon(role.slug)" class="h-6 w-6" stroke-width="1.5" />
              </div>
              <div>
                <h3 class="text-lg font-bold text-slate-900">{{ role.name }}</h3>
                <span class="inline-block mt-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                  {{ role.slug }}
                </span>
              </div>
            </div>
          </div>

          <!-- Permissions summary -->
          <div class="space-y-3 relative z-10">
            <div class="flex items-center justify-between">
              <span class="text-xs font-semibold tracking-wide text-slate-400 uppercase">Akses Hak (Permissions)</span>
              <span class="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">{{ role.permissions.length }} Hak Akses</span>
            </div>
            
            <div v-if="role.permissions.length" class="flex flex-wrap gap-2">
              <span
                v-for="perm in role.permissions.slice(0, 4)"
                :key="perm.id"
                class="inline-flex items-center rounded-lg bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-600 border border-slate-200"
              >
                {{ perm.name }}
              </span>
              <span
                v-if="role.permissions.length > 4"
                class="inline-flex items-center rounded-lg bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 border border-emerald-100"
              >
                +{{ role.permissions.length - 4 }} Lainnya
              </span>
            </div>
            <div v-else class="flex h-10 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50">
              <p class="text-xs text-slate-400 italic">Role ini belum memiliki hak akses</p>
            </div>
          </div>
        </div>

        <!-- Card Actions -->
        <div class="mt-6 pt-5 border-t border-slate-100 flex items-center justify-end gap-2 relative z-10">
          <button
            @click="router.push(`/users/roles/${role.id}/edit`)"
            class="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-medium text-slate-500 hover:bg-emerald-50 hover:text-emerald-700 transition-colors"
          >
            <Pencil class="h-4 w-4" />
            <span class="hidden sm:inline">Edit</span>
          </button>
          
          <button
            v-if="role.slug !== 'superadmin'"
            @click="deleteRole(role.id)"
            class="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-medium text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
          >
            <Trash2 class="h-4 w-4" />
            <span class="hidden sm:inline">Hapus</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

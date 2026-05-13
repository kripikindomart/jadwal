<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import api from '@/lib/api'
import { GraduationCap, Plus, Search, Eye, UserPlus, Calendar } from 'lucide-vue-next'

const router = useRouter()
const loading = ref(true)
const items = ref<any[]>([])
const total = ref(0)
const page = ref(1)
const search = ref('')
const filterStatus = ref('')

onMounted(() => fetchData())

async function fetchData() {
  loading.value = true
  try {
    const params: any = { page: page.value, limit: 20 }
    if (search.value) params.search = search.value
    if (filterStatus.value) params.status = filterStatus.value
    const { data } = await api.get('/thesis', { params })
    items.value = data.data || []
    total.value = data.total || 0
  } catch (e) { console.error(e) }
  finally { loading.value = false }
}

const statusLabels: Record<string, { label: string; class: string }> = {
  DRAFT: { label: 'Draft', class: 'bg-slate-100 text-slate-600' },
  SUBMITTED: { label: 'Diajukan', class: 'bg-blue-100 text-blue-700' },
  TITLE_APPROVED: { label: 'Judul Disetujui', class: 'bg-emerald-100 text-emerald-700' },
  SUPERVISOR_ASSIGNED: { label: 'Pembimbing Ditetapkan', class: 'bg-teal-100 text-teal-700' },
  PROPOSAL_GUIDANCE: { label: 'Bimbingan Proposal', class: 'bg-amber-100 text-amber-700' },
  PROPOSAL_EXAM_SCHEDULED: { label: 'Sidang Proposal Terjadwal', class: 'bg-violet-100 text-violet-700' },
  PROPOSAL_PASSED: { label: 'Proposal Lulus', class: 'bg-emerald-100 text-emerald-700' },
  THESIS_GUIDANCE: { label: 'Bimbingan Tesis', class: 'bg-amber-100 text-amber-700' },
  RESULT_EXAM_SCHEDULED: { label: 'Seminar Hasil Terjadwal', class: 'bg-violet-100 text-violet-700' },
  RESULT_PASSED: { label: 'Seminar Hasil Lulus', class: 'bg-emerald-100 text-emerald-700' },
  REVISION: { label: 'Revisi', class: 'bg-orange-100 text-orange-700' },
  COMPLETED: { label: 'Selesai', class: 'bg-green-100 text-green-800' },
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <GraduationCap class="h-6 w-6 text-violet-600" />
          Data Tugas Akhir
        </h1>
        <p class="text-sm text-slate-500 mt-1">Kelola tugas akhir mahasiswa, pembimbing, dan sidang.</p>
      </div>
    </div>

    <!-- Filters -->
    <div class="flex gap-3 flex-wrap">
      <div class="relative flex-1 max-w-xs">
        <Search class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input v-model="search" @input="fetchData()" placeholder="Cari judul atau nama..." class="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/20" />
      </div>
      <select v-model="filterStatus" @change="fetchData()" class="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20">
        <option value="">Semua Status</option>
        <option value="SUBMITTED">Diajukan</option>
        <option value="TITLE_APPROVED">Judul Disetujui</option>
        <option value="SUPERVISOR_ASSIGNED">Pembimbing Ditetapkan</option>
        <option value="PROPOSAL_GUIDANCE">Bimbingan Proposal</option>
        <option value="THESIS_GUIDANCE">Bimbingan Tesis</option>
        <option value="REVISION">Revisi</option>
        <option value="COMPLETED">Selesai</option>
      </select>
    </div>

    <!-- Table -->
    <div class="rounded-2xl bg-white border border-slate-100 shadow-sm overflow-hidden">
      <table v-if="items.length" class="w-full text-sm">
        <thead class="bg-slate-50 border-b border-slate-100">
          <tr>
            <th class="text-left py-3 px-4 font-semibold text-slate-600">Mahasiswa</th>
            <th class="text-left py-3 px-4 font-semibold text-slate-600">Judul</th>
            <th class="text-left py-3 px-4 font-semibold text-slate-600">Pembimbing</th>
            <th class="text-center py-3 px-4 font-semibold text-slate-600">Status</th>
            <th class="text-center py-3 px-4 font-semibold text-slate-600">Aksi</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-50">
          <tr v-for="item in items" :key="item.id" class="hover:bg-slate-50/50">
            <td class="py-3 px-4">
              <p class="font-medium text-slate-800">{{ item.studentName }}</p>
              <p class="text-xs text-slate-400">{{ item.studentNim }}</p>
            </td>
            <td class="py-3 px-4 max-w-[300px]">
              <p class="text-slate-700 truncate">{{ item.title }}</p>
              <p class="text-xs text-slate-400">{{ item.type }}</p>
            </td>
            <td class="py-3 px-4">
              <div v-if="item.supervisors?.length" class="space-y-0.5">
                <p v-for="s in item.supervisors" :key="s.id" class="text-xs text-slate-600">
                  <span class="text-slate-400">{{ s.role === 'PEMBIMBING_1' ? 'P1' : 'P2' }}:</span> {{ s.name }}
                </p>
              </div>
              <span v-else class="text-xs text-slate-400 italic">Belum ditetapkan</span>
            </td>
            <td class="py-3 px-4 text-center">
              <span :class="['inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold', statusLabels[item.status]?.class || 'bg-slate-100 text-slate-500']">
                {{ statusLabels[item.status]?.label || item.status }}
              </span>
            </td>
            <td class="py-3 px-4 text-center">
              <button @click="router.push(`/thesis/${item.id}`)" class="p-1.5 text-violet-600 hover:bg-violet-50 rounded-lg" title="Detail">
                <Eye class="h-4 w-4" />
              </button>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-else-if="!loading" class="p-12 text-center text-slate-400">
        <GraduationCap class="h-10 w-10 mx-auto mb-3 text-slate-300" />
        <p>Belum ada data tugas akhir</p>
      </div>
    </div>
  </div>
</template>

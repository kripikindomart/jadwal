<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useToast } from '@/composables/useToast'
import { useConfirm } from '@/composables/useConfirm'
import api from '@/lib/api'
import { Plus, Pencil, Trash2, Tags } from 'lucide-vue-next'

const toast = useToast()
const confirm = useConfirm()

const classifications = ref<any[]>([])
const loading = ref(false)
const showModal = ref(false)
const editingId = ref<number | null>(null)
const form = ref({ code: '', name: '', description: '' })

const fetchData = async () => {
  loading.value = true
  try {
    const res = await api.get('/letters/classifications')
    classifications.value = res.data
  } catch (e) {
    toast.error('Gagal memuat data klasifikasi.')
  } finally {
    loading.value = false
  }
}

const openCreate = () => {
  editingId.value = null
  form.value = { code: '', name: '', description: '' }
  showModal.value = true
}

const openEdit = (item: any) => {
  editingId.value = item.id
  form.value = { code: item.code, name: item.name, description: item.description || '' }
  showModal.value = true
}

const save = async () => {
  try {
    if (editingId.value) {
      await api.patch(`/letters/classifications/${editingId.value}`, form.value)
      toast.success('Klasifikasi berhasil diperbarui!')
    } else {
      await api.post('/letters/classifications', form.value)
      toast.success('Klasifikasi berhasil ditambahkan!')
    }
    showModal.value = false
    await fetchData()
  } catch (e: any) {
    toast.error(e.response?.data?.message || 'Gagal menyimpan.')
  }
}

const deleteItem = (item: any) => {
  confirm.requireConfirm({
    title: 'Hapus Klasifikasi',
    message: `Hapus kode "${item.code}" (${item.name})?`,
    confirmText: 'Hapus',
    async onConfirm() {
      try {
        await api.delete(`/letters/classifications/${item.id}`)
        toast.success('Klasifikasi berhasil dihapus!')
        await fetchData()
      } catch (e: any) {
        toast.error(e.response?.data?.message || 'Gagal menghapus.')
      }
    },
  })
}

onMounted(fetchData)
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">Klasifikasi Surat</h1>
        <p class="text-sm text-gray-500">Kelola kode klasifikasi untuk penomoran otomatis surat</p>
      </div>
      <button @click="openCreate"
        class="px-4 py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition flex items-center gap-2 shadow-sm">
        <Plus class="w-4 h-4" /> Tambah Klasifikasi
      </button>
    </div>

    <!-- Table -->
    <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div v-if="loading" class="p-12 text-center text-gray-400">
        <div class="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-3"></div>
        Memuat data...
      </div>
      <div v-else-if="classifications.length === 0" class="p-12 text-center text-gray-400">
        <Tags class="w-12 h-12 mx-auto mb-3 text-gray-300" />
        <p class="font-medium">Belum ada klasifikasi</p>
        <p class="text-sm">Klik "Tambah Klasifikasi" untuk memulai</p>
      </div>
      <table v-else class="w-full text-sm">
        <thead class="bg-gray-50 border-b border-gray-100">
          <tr>
            <th class="text-left px-6 py-3 font-semibold text-gray-600">Kode</th>
            <th class="text-left px-6 py-3 font-semibold text-gray-600">Nama</th>
            <th class="text-left px-6 py-3 font-semibold text-gray-600">Deskripsi</th>
            <th class="text-right px-6 py-3 font-semibold text-gray-600">Aksi</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-50">
          <tr v-for="item in classifications" :key="item.id" class="hover:bg-gray-50/50">
            <td class="px-6 py-4">
              <span class="font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded text-xs">{{ item.code }}</span>
            </td>
            <td class="px-6 py-4 font-medium text-gray-900">{{ item.name }}</td>
            <td class="px-6 py-4 text-gray-500">{{ item.description || '-' }}</td>
            <td class="px-6 py-4 text-right">
              <div class="flex items-center justify-end gap-1">
                <button @click="openEdit(item)" class="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition">
                  <Pencil class="w-4 h-4" />
                </button>
                <button @click="deleteItem(item)" class="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition">
                  <Trash2 class="w-4 h-4" />
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Modal -->
    <Teleport to="body">
      <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50" @click.self="showModal = false">
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
          <h2 class="text-lg font-bold text-gray-900 mb-4">
            {{ editingId ? 'Edit Klasifikasi' : 'Tambah Klasifikasi' }}
          </h2>
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-1">Kode Klasifikasi</label>
              <input v-model="form.code" type="text" placeholder="K.8"
                class="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-600 outline-none" />
              <p class="text-xs text-gray-400 mt-1">Contoh: K.8, K.5, K.1</p>
            </div>
            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-1">Nama</label>
              <input v-model="form.name" type="text" placeholder="Surat Keluar ke Instansi Luar"
                class="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-600 outline-none" />
            </div>
            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-1">Deskripsi (opsional)</label>
              <textarea v-model="form.description" rows="2" placeholder="Keterangan tambahan..."
                class="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-600 outline-none resize-none"></textarea>
            </div>
          </div>
          <div class="flex justify-end gap-3 mt-6">
            <button @click="showModal = false" class="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800">Batal</button>
            <button @click="save" class="px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700">
              {{ editingId ? 'Perbarui' : 'Simpan' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

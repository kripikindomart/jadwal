<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import { useToast } from '@/composables/useToast';
import { useConfirm } from '@/composables/useConfirm';
import api from '@/lib/api';
import DataTable, { type Column } from '@/components/ui/DataTable.vue';
import ModalForm from '@/components/ui/ModalForm.vue';
import SearchableSelect from '@/components/ui/SearchableSelect.vue';
import { Plus, Trash2, Edit2, Settings } from 'lucide-vue-next';

interface Semester {
  id: number;
  name: string;
  isActive?: boolean; // Added for auto-selection
}

interface Prodi {
  id: number;
  name: string;
}

interface Course {
  id: number;
  name: string;
}

interface ClassLecturer {
  id: number;
  name: string;
  isPrimary: boolean;
}

interface ClassEntity {
  id: number;
  semesterId: number;
  prodiId: number;
  courseId: number;
  name: string;
  quota: number;
  semester: Semester;
  prodi: Prodi;
  course: Course;
  lecturers: ClassLecturer[];
  students: any[];
}

const toast = useToast();
const confirm = useConfirm();

const classColumns: Column[] = [
  { key: 'name', label: 'Nama Kelas' },
  { key: 'semester', label: 'Periode' },
  { key: 'quota', label: 'Kuota', align: 'center' },
  { key: 'classCourses', label: 'Matakuliah', align: 'center' },
  { key: 'students', label: 'Mhs', align: 'center' },
];

const data = ref<ClassEntity[]>([]);
const totalData = ref(0);
const loading = ref(false);
const currentPage = ref(1);
const perPage = ref(10);
const searchQuery = ref('');
const filterSemesterId = ref<number | null>(null);

const semesters = ref<Semester[]>([]);
const prodis = ref<Prodi[]>([]);
const allStudents = ref<any[]>([]); // To be populated for enrollment

const isModalOpen = ref(false);
const actionType = ref<'create' | 'edit'>('create');
const bulkActionType = ref<'trash' | 'restore' | 'forceDelete' | null>(null);
const selectedItem = ref<ClassEntity | null>(null);
const selectedIds = ref<number[]>([]);

const form = ref({
  semesterId: '',
  prodiId: '',
  name: '',
  quota: 40,
});

// assignForm dihilangkan karena set Dosen sekarang ada di ClassDetailPage per matakuliah

const semesterOptions = computed(() =>
  semesters.value.map(s => ({ value: s.id, label: s.name }))
);

const prodiOptions = computed(() =>
  prodis.value.map(p => ({ value: p.id, label: p.name }))
);

const fetchSemesters = async () => {
  try {
    const res = await api.get('/semesters');
    // Asumsikan endpoint ini mengembalikan { data: [...] } atau [...]
    semesters.value = res.data?.data || res.data || [];
    
    // Auto-select active semester if creating
    const activeSemester = semesters.value.find((s: any) => s.isActive);
    if (activeSemester && actionType.value === 'create' && !form.value.semesterId) {
      form.value.semesterId = activeSemester.id.toString();
    }
  } catch (error: any) {
    console.error('Gagal memuat Periode Akademik:', error);
  }
};

const fetchProdis = async () => {
  try {
    const res = await api.get('/prodis?limit=100');
    prodis.value = res.data?.data || res.data || [];
  } catch (error: any) {
    console.error('Gagal memuat daftar program studi:', error);
  }
};

// fetchCourses and fetchLecturers removed

const fetchStudents = async () => {
  try {
    const res = await api.get('/students?limit=2000');
    allStudents.value = res.data?.data || [];
  } catch (error: any) {
    console.error('Gagal memuat list mahasiswa:', error);
  }
};

const fetchData = async () => {
  loading.value = true;
  try {
    const params = new URLSearchParams({
      page: currentPage.value.toString(),
      limit: perPage.value.toString(),
    });
    if (searchQuery.value) params.append('search', searchQuery.value);
    if (filterSemesterId.value) params.append('semesterId', filterSemesterId.value.toString());

    const response = await api.get(`/classes?${params.toString()}`);
    data.value = response.data?.data || [];
    totalData.value = response.data?.meta?.total || 0;
  } catch (error: any) {
    toast.error('Gagal memuat data kelas');
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  fetchSemesters();
  fetchProdis();
  fetchData();
  fetchStudents();
});

watch([currentPage, perPage, searchQuery, filterSemesterId], () => {
  fetchData();
});

const openModal = (type: 'create' | 'edit', item?: ClassEntity) => {
  actionType.value = type;
  if (type === 'edit' && item) {
    selectedItem.value = item;
    form.value = {
      semesterId: item.semesterId.toString(),
      prodiId: item.prodiId ? item.prodiId.toString() : '',
      name: item.name,
      quota: item.quota,
    };
  } else {
    selectedItem.value = null;
    const activeSemester = semesters.value.find((s: any) => s.isActive);
    form.value = { 
      semesterId: activeSemester ? activeSemester.id.toString() : '', 
      prodiId: '',
      name: '', 
      quota: 40 
    };
  }
  isModalOpen.value = true;
};

// Assignment Dosen dihilangkan dari halaman index Rombel

// openEnrollModal was removed

const handleSubmit = async () => {
  try {
    const payload = {
      semesterId: parseInt(form.value.semesterId),
      prodiId: parseInt(form.value.prodiId),
      name: form.value.name,
      quota: form.value.quota,
    };

    if (actionType.value === 'create') {
      await api.post('/classes', payload);
      toast.success('Kelas berhasil ditambahkan');
    } else {
      await api.patch(`/classes/${selectedItem.value?.id}`, payload);
      toast.success('Kelas berhasil diperbarui');
    }
    isModalOpen.value = false;
    fetchData();
  } catch (error: any) {
    toast.error(error.response?.data?.message || 'Terjadi kesalahan');
  }
};

// handleEnrollSubmit was removed

const openConfirmDialog = (action: 'trash' | 'restore' | 'forceDelete', item?: ClassEntity) => {
  bulkActionType.value = action;
  if (item) {
    selectedIds.value = [item.id];
  }
  
  confirm.requireConfirm({
    title: 'Konfirmasi Tindakan',
    message: action === 'trash' ? 'Apakah Anda yakin ingin menghapus kelas ini?' : 'Apakah Anda yakin dengan tindakan ini?',
    style: 'danger',
    confirmText: 'Ya, Lanjutkan',
    onConfirm: async () => {
      try {
        if (selectedIds.value.length === 1 && action === 'trash') {
          await api.delete(`/classes/${selectedIds.value[0]}`);
        } else {
          await api.post('/classes/bulk', {
            ids: selectedIds.value,
            action: action,
          });
        }
        toast.success('Tindakan berhasil dilakukan');
        selectedIds.value = [];
        fetchData();
      } catch (error: any) {
        toast.error(error.response?.data?.message || 'Gagal melakukan tindakan');
      }
    }
  });
};

</script>

<template>
  <div class="space-y-6">
    <div class="mb-6 flex justify-between items-center">
      <div>
        <h1 class="text-2xl font-bold text-gray-800">Manajemen Rombel (Kelas)</h1>
        <p class="text-gray-600">Kelola master kelas / rombongan belajar (paket)</p>
      </div>
      <div class="flex gap-2">
        <button
          v-if="selectedIds.length > 0"
          @click="openConfirmDialog('trash')"
          class="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Trash2 class="w-4 h-4" />
          Hapus Terpilih ({{ selectedIds.length }})
        </button>
        <button
          @click="openModal('create')"
          class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus class="w-4 h-4" />
          Buat Kelas
        </button>
      </div>
    </div>

    <!-- Filters -->
    <div class="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6 flex flex-wrap gap-4 items-center">
      <div class="w-64">
        <label class="block text-sm font-medium text-gray-700 mb-1">Cari Nama Kelas</label>
        <input
          v-model="searchQuery"
          type="text"
          placeholder="e.g., Kelas A"
          class="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
        />
      </div>
      <div class="w-64">
        <label class="block text-sm font-medium text-gray-700 mb-1">Periode Akademik</label>
        <SearchableSelect
          v-model="filterSemesterId"
          :options="semesterOptions"
          placeholder="Semua Periode"
        />
      </div>
      <!-- Course Filter dihilangkan karena Rombel tidak memiliki satu specific course -->
    </div>

    <DataTable
      :columns="classColumns"
      :data="data"
      :loading="loading"
      :currentPage="currentPage"
      :perPage="perPage"
      :totalData="totalData"
      selectable
      v-model="selectedIds"
      @update:currentPage="currentPage = $event"
      @update:perPage="perPage = $event"
    >
      <template #cell(name)="{ item }">
        <div class="font-medium text-blue-600 cursor-pointer hover:underline" @click="$router.push(`/classes/${item.id}`)">
          {{ item.name }}
        </div>
      </template>

      <template #cell(classCourses)="{ item }">
        <span class="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full" :class="item.classCourses?.length ? 'bg-blue-50 text-blue-700' : 'bg-gray-50 text-gray-400'">
          {{ item.classCourses?.length || 0 }} MK
        </span>
      </template>

      <template #cell(semester)="{ item }">
        <div class="space-y-0.5">
          <div class="sm:hidden font-medium text-gray-900">{{ item.name }}</div>
          <div>{{ item.semester?.name || '-' }}</div>
          <div v-if="item.prodi" class="text-xs text-indigo-600 font-medium bg-indigo-50 inline-block px-1.5 py-0.5 rounded">{{ item.prodi.name }}</div>
        </div>
      </template>

      <template #cell(students)="{ item }">
        <div class="text-center font-medium">
          {{ item.students?.length || 0 }} / {{ item.quota || 0 }}
        </div>
      </template>

      <template #actions="{ item }">
        <div class="flex justify-end gap-2">
<!-- Enroll dikelola per semester, bisa juga per rombel jika mau -->
          <button
            @click="$router.push(`/classes/${item.id}`)"
            class="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="Kelola Matakuliah / Detail"
          >
            <Settings class="w-4 h-4" />
          </button>
          <button
            @click="openModal('edit', item)"
            class="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="Edit"
          >
            <Edit2 class="w-4 h-4" />
          </button>
          <button
            @click="openConfirmDialog('trash', item)"
            class="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Hapus"
          >
            <Trash2 class="w-4 h-4" />
          </button>
        </div>
      </template>
    </DataTable>

    <!-- Modal Form (Create/Edit) -->
    <ModalForm
      v-model="isModalOpen"
      :title="actionType === 'create' ? 'Buat Kelas' : 'Edit Kelas'"
      @submit="handleSubmit"
    >
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Periode Akademik *</label>
          <SearchableSelect
            v-model="form.semesterId"
            :options="semesterOptions"
            placeholder="Pilih Periode"
            class="w-full"
            required
            :disabled="actionType === 'create'"
          />
          <p v-if="actionType === 'create'" class="text-xs text-gray-500 mt-1">Otomatis terisi dengan periode yang sedang aktif.</p>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Program Studi *</label>
          <SearchableSelect
            v-model="form.prodiId"
            :options="prodiOptions"
            placeholder="Pilih Program Studi"
            class="w-full"
            required
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Nama Rombel / Kelas *</label>
          <input
            v-model="form.name"
            type="text"
            required
            placeholder="Contoh: Rombel A / Kelas Karyawan"
            class="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Kuota Mahasiswa *</label>
          <input
            v-model="form.quota"
            type="number"
            required
            min="1"
            class="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>
    </ModalForm>
  </div>
</template>

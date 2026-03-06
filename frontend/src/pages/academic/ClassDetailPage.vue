<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useToast } from '@/composables/useToast';
import { useConfirm } from '@/composables/useConfirm';
import api from '@/lib/api';
import ModalForm from '@/components/ui/ModalForm.vue';
import SearchableSelect from '@/components/ui/SearchableSelect.vue';
import { ArrowLeft, Plus, Trash2, Edit2, Users, CalendarDays, BookOpen } from 'lucide-vue-next';

const route = useRoute();
const router = useRouter();
const toast = useToast();
const confirm = useConfirm();

const classId = route.params.id as string;
const classData = ref<any>(null);

const courses = ref<any[]>([]); // Untuk pilihan form
const classCourses = ref<any[]>([]); // Data tabel yang ada di dalam Rombel ini
const allLecturers = ref<any[]>([]); // Untuk assignment dosen
const allRooms = ref<any[]>([]); // Untuk mapping ruangan
const allTimeslots = ref<any[]>([]); // Untuk pilihan slot waktu
const allProdis = ref<any[]>([]); // Untuk filter prodi dosen
const roomSearch = ref('');

const loading = ref(false);
const isModalOpen = ref(false);
const isAssignOpen = ref(false);
const isScheduleOpen = ref(false);
const activeTab = ref((route.query.tab as string) || 'matakuliah');
const actionType = ref<'create' | 'edit'>('create');
const selectedClassCourse = ref<any>(null);
const selectedScheduleItem = ref<any>(null);

// Tab 2: Collapsible + Bulk
const expandedCourses = ref<Set<number>>(new Set());
const bulkSelectedIds = ref<number[]>([]);
const isReschedOpen = ref(false);
const reschedForm = ref({
  date: '',
  startTime: '',
  endTime: '',
  roomId: null as number | null,
});

// Tab persistence
watch(() => activeTab.value, (val) => {
  router.replace({ query: { ...route.query, tab: val } });
});

// State untuk Tab Peserta
const selectedEnrollCourseId = ref<string>('');
const isEnrollOpen = ref(false);
const allStudents = ref<any[]>([]);
const filteredStudents = ref<any[]>([]);
const studentSearch = ref('');
const filterProdiEnroll = ref('');
const filterAngkatanEnroll = ref('');
const enrollForm = ref({
  studentIds: [] as number[],
  enrollAllCourses: false, // Tambahan untuk enroll ke semua MK
});

// State untuk Tab Jadwal Manual
const isManualSchedOpen = ref(false);
const manualSchedForm = ref({
  classCourseId: 0,
  date: '',
  startTime: '',
  endTime: '',
  roomId: null as number | null,
  dayOfWeek: 1,
});

// Computed properties for unique Angkatans
const availableAngkatans = computed(() => {
  const years = allStudents.value
    .map((s: any) => s.angkatan || s.studentProfile?.angkatan)
    .filter(y => y);
  return [...new Set(years)].sort((a: any, b: any) => parseInt(b) - parseInt(a));
});

// Watcher untuk Tab Peserta
const currentEnrollCourse = computed(() => {
  if (!selectedEnrollCourseId.value) return null;
  return classCourses.value.find(c => c.id === parseInt(selectedEnrollCourseId.value));
});

const form = ref({
  courseId: '',
  onlinePercentage: 0,
  roomIds: [] as number[],
  totalMeetings: 16,
  startDate: '',
  endDate: '',
  timeslotId: '' as string | number,
  dayOfWeek: '' as string | number,
  scheduledStartTime: '',
  scheduledEndTime: '',
});

const assignForm = ref({
  lecturerIds: [] as number[],
});

const lecturerSearch = ref('');
const filterProdiAssign = ref<number | ''>('');
const filteredLecturers = computed(() => {
  let list = allLecturers.value;
  // Filter by prodi
  if (filterProdiAssign.value) {
    list = list.filter((l: any) => l.homeProdiId === filterProdiAssign.value);
  }
  // Filter by search
  const q = lecturerSearch.value.toLowerCase().trim();
  if (q) {
    list = list.filter((l: any) =>
      (l.fullName || l.name || '').toLowerCase().includes(q) ||
      (l.nidn || '').toLowerCase().includes(q) ||
      (l.email || '').toLowerCase().includes(q)
    );
  }
  return list;
});

const filteredRooms = computed(() => {
  const q = roomSearch.value.toLowerCase().trim();
  if (!q) return allRooms.value;
  return allRooms.value.filter((r: any) =>
    (r.name || '').toLowerCase().includes(q)
  );
});

const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];


const availableCoursesOptions = computed(() => {
  const existingIds = classCourses.value?.map(cc => cc.course?.id) || [];
  return courses.value
    .filter(c => actionType.value === 'edit' || !existingIds.includes(c.id))
    .map(c => ({
      value: c.id,
      label: `${c.code ? c.code + ' - ' : ''}${c.name} (${c.sks} SKS)`,
      searchText: `${c.code || ''} ${c.name}`
    }));
});

const fetchClassData = async () => {
  loading.value = true;
  try {
    const res = await api.get(`/classes/${classId}`);
    classData.value = res.data;
    classCourses.value = res.data.classCourses || [];
  } catch (error: any) {
    toast.error('Gagal memuat data rombel.');
    router.push('/classes');
  } finally {
    loading.value = false;
  }
};

const fetchMasterCourses = async () => {
  try {
    const res = await api.get('/courses?perPage=500');
    courses.value = res.data?.data?.data || res.data?.data || res.data || [];
    console.log('Fetched courses:', courses.value);
  } catch (error) {
    console.error('Gagal memuat list matakuliah');
  }
};

const fetchLecturers = async () => {
  try {
    const res = await api.get('/lecturers?perPage=5000');
    allLecturers.value = res.data?.data?.data || res.data?.data || res.data || [];
    console.log('Loaded lecturers:', allLecturers.value.length);
  } catch (error) {
    console.error('Gagal memuat list dosen');
  }
};

const fetchProdis = async () => {
  try {
    const res = await api.get('/prodis?perPage=500');
    allProdis.value = res.data?.data?.data || res.data?.data || res.data || [];
  } catch (error) {
    console.error('Gagal memuat list prodi');
  }
};

const fetchRooms = async () => {
  try {
    const res = await api.get('/rooms?perPage=500');
    const roomsData = res.data?.data?.data || res.data?.data || res.data || [];
    allRooms.value = roomsData.filter((r: any) => r.isUsable !== false);
  } catch (error) {
    console.error('Gagal memuat list ruangan');
  }
};

const fetchTimeslots = async () => {
  try {
    const res = await api.get('/timeslots?perPage=500');
    const data = res.data?.data?.data || res.data?.data || res.data || [];
    allTimeslots.value = data.filter((t: any) => t.isUsable !== false);
  } catch (error) {
    console.error('Gagal memuat list slot waktu');
  }
};

onMounted(() => {
  fetchClassData();
  fetchMasterCourses();
  fetchLecturers();
  fetchRooms();
  fetchTimeslots();
  fetchProdis();
});

const openModal = (type: 'create' | 'edit', item?: any) => {
  actionType.value = type;
  roomSearch.value = '';
  if (type === 'edit' && item) {
    selectedClassCourse.value = item;
    form.value = {
      courseId: item.courseId?.toString() || item.course?.id?.toString(),
      onlinePercentage: item.onlinePercentage || 0,
      roomIds: item.rooms?.map((r: any) => r.id) || [],
      totalMeetings: item.totalMeetings,
      startDate: item.startDate || '',
      endDate: item.endDate || '',
      timeslotId: item.timeslotId || '',
      dayOfWeek: item.dayOfWeek ?? '',
      scheduledStartTime: item.scheduledStartTime || '',
      scheduledEndTime: item.scheduledEndTime || '',
    };
  } else {
    selectedClassCourse.value = null;
    form.value = { courseId: '', onlinePercentage: 0, roomIds: [], totalMeetings: 16, startDate: '', endDate: '', timeslotId: '', dayOfWeek: '', scheduledStartTime: '', scheduledEndTime: '' };
  }
  isModalOpen.value = true;
};

const handleSubmit = async () => {
  try {
    const payload: any = {
      courseId: parseInt(form.value.courseId),
      onlinePercentage: form.value.onlinePercentage,
      roomIds: form.value.roomIds,
      totalMeetings: form.value.totalMeetings,
      startDate: form.value.startDate || null,
      endDate: form.value.endDate || null,
      timeslotId: form.value.timeslotId ? Number(form.value.timeslotId) : null,
      dayOfWeek: form.value.dayOfWeek !== '' ? Number(form.value.dayOfWeek) : null,
      scheduledStartTime: form.value.scheduledStartTime || null,
      scheduledEndTime: form.value.scheduledEndTime || null,
    };

    if (actionType.value === 'create') {
      await api.post(`/classes/${classId}/courses`, payload);
      toast.success('Matakuliah berhasil ditambahkan ke Rombel');
    } else {
      const { courseId, ...updatePayload } = payload;
      await api.patch(`/classes/courses/${selectedClassCourse.value.id}`, updatePayload);
      toast.success('Pengaturan matakuliah berhasil disimpan');
    }
    isModalOpen.value = false;
    fetchClassData();
  } catch (error: any) {
    toast.error(error.response?.data?.message || 'Gagal menyimpan matakuliah');
  }
};

const openAssignModal = (item: any) => {
  selectedClassCourse.value = item;
  lecturerSearch.value = '';
  filterProdiAssign.value = '';
  assignForm.value.lecturerIds = item.classLecturers?.map((l: any) => l.lecturer?.id || l.lecturerId) || [];
  isAssignOpen.value = true;
};

const openScheduleModal = (item: any) => {
  selectedScheduleItem.value = item;
  isScheduleOpen.value = true;
};

const handleAssignSubmit = async () => {
  try {
    await api.post(`/classes/courses/${selectedClassCourse.value.id}/lecturers`, {
      lecturerIds: assignForm.value.lecturerIds
    });
    toast.success('Pengajar matakuliah berhasil diupdate');
    isAssignOpen.value = false;
    fetchClassData();
  } catch (error: any) {
    toast.error(error.response?.data?.message || 'Gagal menugaskan dosen');
  }
};

const confirmDelete = (item: any) => {
  confirm.requireConfirm({
    title: 'Hapus Matakuliah',
    message: `Keluarkan matakuliah ${item.course?.name} dari rombel ini? (Semua jadwal matakuliah ini akan ikut terhapus)`,
    style: 'danger',
    confirmText: 'Ya, Hapus',
    onConfirm: async () => {
      try {
        await api.delete(`/classes/courses/${item.id}`);
        toast.success('Matakuliah dihapus dari rombel');
        fetchClassData();
      } catch (e: any) {
        toast.error(e.response?.data?.message || 'Gagal menghapus matakuliah');
      }
    }
  });
};

const generateSchedule = async () => {
  confirm.requireConfirm({
    title: 'Generate Jadwal Otomatis',
    message: 'Apakah Anda yakin ingin men-generate jadwal untuk rombel ini? (Jadwal lama untuk rombel ini akan ditimpa)',
    confirmText: 'Ya, Generate',
    cancelText: 'Batal',
    onConfirm: async () => {
      try {
        loading.value = true;
        const res = await api.post('/schedules/generate', {
          semesterId: classData.value.semesterId,
          classId: classData.value.id
        });
        toast.success(res.data?.message || 'Jadwal berhasil digenerate');
        await fetchClassData();
      } catch (e: any) {
        toast.error(e.response?.data?.message || 'Gagal mengenerate jadwal');
      } finally {
        loading.value = false;
      }
    }
  });
};

const deleteSchedule = async () => {
  confirm.requireConfirm({
    title: 'Hapus Jadwal (Reset)',
    message: 'Apakah Anda yakin ingin menghapus seluruh jadwal untuk rombel ini? (Tindakan ini tidak bisa dibatalkan)',
    confirmText: 'Ya, Hapus',
    cancelText: 'Batal',
    onConfirm: async () => {
      try {
        loading.value = true;
        const res = await api.delete(`/schedules/class/${classData.value.id}`);
        toast.success(res.data?.message || 'Jadwal berhasil dihapus');
        await fetchClassData();
      } catch (e: any) {
        toast.error(e.response?.data?.message || 'Gagal menghapus jadwal');
      } finally {
        loading.value = false;
      }
    }
  });
};

// ==========================================
// MENGELOLA PESERTA MAHASISWA
// ==========================================
const fetchStudents = async () => {
  try {
    const res = await api.get('/students', {
      params: { perPage: 5000, status: 'active' },
    });
    allStudents.value = res.data.data;
    filteredStudents.value = allStudents.value;
  } catch (error) {
    console.error('Failed to fetch students', error);
  }
};

const openEnrollModal = () => {
  if (!currentEnrollCourse.value) return;
  
  enrollForm.value.studentIds = currentEnrollCourse.value.classCourseStudents?.map((s: any) => s.studentId) || [];
  enrollForm.value.enrollAllCourses = false; // Reset checkbox
  studentSearch.value = '';
  filterProdiEnroll.value = '';
  
  // Set default filter prodi ke prodi kelas (jika ada) untuk memudahkan
  if(classData.value?.prodiId) {
     filterProdiEnroll.value = classData.value.prodiId;
  }
  
  filterStudents();
  isEnrollOpen.value = true;
};

const filterStudents = () => {
  let filtered = allStudents.value;
  if (filterProdiEnroll.value) {
    filtered = filtered.filter((s) => s.prodiId === parseInt(filterProdiEnroll.value));
  }
  if (filterAngkatanEnroll.value) {
    filtered = filtered.filter((s) => s.angkatan?.toString() === filterAngkatanEnroll.value);
  }
  if (studentSearch.value) {
    const searchLower = studentSearch.value.toLowerCase();
    filtered = filtered.filter(
      (s) =>
        s.fullName?.toLowerCase().includes(searchLower) ||
        s.name?.toLowerCase().includes(searchLower) ||
        s.nim?.toLowerCase().includes(searchLower) ||
        s.email?.toLowerCase().includes(searchLower)
    );
  }
  filteredStudents.value = filtered;
};

// Re-filter when search or prodi changes
watch(studentSearch, filterStudents);
watch(filterProdiEnroll, filterStudents);
watch(filterAngkatanEnroll, filterStudents);

const handleEnrollSubmit = async () => {
  if (!currentEnrollCourse.value) return;
  try {
    loading.value = true;
    
    if (enrollForm.value.enrollAllCourses) {
      // Loop: Enroll to ALL courses in this class
      const promises = classCourses.value.map(c => 
        api.post(`/classes/courses/${c.id}/students`, {
          studentIds: enrollForm.value.studentIds,
        })
      );
      await Promise.all(promises);
      toast.success(`Peserta berhasil ditambahkan ke seluruh ${classCourses.value.length} matakuliah rombel`);
    } else {
      // Enroll to current course only
      const res = await api.post(`/classes/courses/${currentEnrollCourse.value.id}/students`, {
        studentIds: enrollForm.value.studentIds,
      });
      toast.success(res.data?.message || 'Peserta berhasil diperbarui');
    }
    
    isEnrollOpen.value = false;
    await fetchClassData();
  } catch (e: any) {
    toast.error(e.response?.data?.message || 'Gagal mengatur peserta');
  } finally {
    loading.value = false;
  }
};

const unenrollStudent = async (student: any) => {
  if (!currentEnrollCourse.value) return;
  confirm.requireConfirm({
    title: 'Hapus Peserta',
    message: `Apakah Anda yakin ingin menghapus ${student.student?.name || 'mahasiswa ini'} dari matakuliah ini?`,
    confirmText: 'Ya, Hapus',
    cancelText: 'Batal',
    onConfirm: async () => {
      try {
        loading.value = true;
        await api.delete(`/classes/courses/${currentEnrollCourse.value.id}/students/${student.studentId}`);
        toast.success('Mahasiswa berhasil dihapus dari matakuliah');
        await fetchClassData();
      } catch (e: any) {
        toast.error(e.response?.data?.message || 'Gagal menghapus mahasiswa');
      } finally {
        loading.value = false;
      }
    }
  });
};

const deleteIndividualSchedule = async (schedId: number) => {
  if(!confirm.requireConfirm) return; // ensure useConfirm is ready
  confirm.requireConfirm({
    title: 'Hapus Pertemuan',
    message: 'Apakah Anda yakin ingin menghapus jadwal pertemuan ini?',
    confirmText: 'Ya, Hapus',
    cancelText: 'Batal',
    onConfirm: async () => {
      try {
        loading.value = true;
        const res = await api.delete(`/schedules/${schedId}`);
        toast.success(res.data?.message || 'Jadwal pertemuan dihapus');
        await fetchClassData();
      } catch (e: any) {
        toast.error(e.response?.data?.message || 'Gagal menghapus jadwal pertemuan');
      } finally {
        loading.value = false;
      }
    }
  });
};

const toggleAllSchedules = (course: any) => {
  const allIds = (course.classSchedules || []).map((s: any) => s.id);
  const allSelected = allIds.every((id: number) => bulkSelectedIds.value.includes(id));
  if (allSelected) {
    bulkSelectedIds.value = bulkSelectedIds.value.filter((id: number) => !allIds.includes(id));
  } else {
    const newIds = allIds.filter((id: number) => !bulkSelectedIds.value.includes(id));
    bulkSelectedIds.value = [...bulkSelectedIds.value, ...newIds];
  }
};

const bulkDeleteSchedules = () => {
  if (bulkSelectedIds.value.length === 0) return;
  confirm.requireConfirm({
    title: 'Hapus Jadwal Terpilih',
    message: `Apakah Anda yakin ingin menghapus ${bulkSelectedIds.value.length} jadwal pertemuan?`,
    confirmText: 'Ya, Hapus',
    cancelText: 'Batal',
    onConfirm: async () => {
      try {
        loading.value = true;
        await api.post('/schedules/bulk-delete', { ids: bulkSelectedIds.value });
        toast.success(`${bulkSelectedIds.value.length} jadwal berhasil dihapus`);
        bulkSelectedIds.value = [];
        await fetchClassData();
      } catch (e: any) {
        toast.error(e.response?.data?.message || 'Gagal menghapus jadwal');
      } finally {
        loading.value = false;
      }
    }
  });
};

const handleBulkReschedule = async () => {
  try {
    loading.value = true;
    const payload: any = { ids: bulkSelectedIds.value };
    if (reschedForm.value.date) payload.date = reschedForm.value.date;
    if (reschedForm.value.startTime) payload.startTime = reschedForm.value.startTime;
    if (reschedForm.value.endTime) payload.endTime = reschedForm.value.endTime;
    if (reschedForm.value.roomId) payload.roomId = reschedForm.value.roomId;

    await api.post('/schedules/bulk-update', payload);
    toast.success(`${bulkSelectedIds.value.length} jadwal berhasil di-reschedule`);
    bulkSelectedIds.value = [];
    isReschedOpen.value = false;
    reschedForm.value = { date: '', startTime: '', endTime: '', roomId: null };
    await fetchClassData();
  } catch (e: any) {
    toast.error(e.response?.data?.message || 'Gagal reschedule');
  } finally {
    loading.value = false;
  }
};

const openManualSchedModal = (course: any) => {
  manualSchedForm.value = {
    classCourseId: course.id,
    date: '',
    startTime: '08:00',
    endTime: '10:00',
    roomId: null,
    dayOfWeek: 1,
  };
  isManualSchedOpen.value = true;
};

const submitManualSched = async () => {
  try {
    loading.value = true;
    
    // Auto calculate day parameters
    if(manualSchedForm.value.date) {
        const d = new Date(manualSchedForm.value.date);
        manualSchedForm.value.dayOfWeek = d.getDay() === 0 ? 7 : d.getDay();
    }
    
    const res = await api.post(`/schedules/manual`, manualSchedForm.value);
    toast.success(res.data?.message || 'Pertemuan berhasil ditambahkan');
    isManualSchedOpen.value = false;
    await fetchClassData();
  } catch (e: any) {
    toast.error(e.response?.data?.message || 'Gagal menambahkan pertemuan manual');
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  fetchClassData();
  fetchProdis();
  fetchStudents(); // Preload mahasiswa untuk modal enroll
});

</script>

<template>
  <div class="mb-4">
    <button @click="router.push('/classes')" class="text-blue-600 hover:text-blue-800 flex items-center gap-1 text-sm font-medium mb-4">
      <ArrowLeft class="w-4 h-4" /> Kembali ke Manajemen Rombel
    </button>
  </div>

  <div class="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
    <div>
      <h1 class="text-2xl font-bold text-gray-800 mb-1">Rombel: {{ classData?.name }}</h1>
      <p class="text-gray-600 flex items-center gap-2">
        <span class="inline-block px-2 py-0.5 bg-blue-50 text-blue-700 text-xs font-medium rounded">Periode: {{ classData?.semester?.name }}</span>
        <span>Kuota: {{ classData?.quota }} Mahasiswa</span>
        <span>Peserta: {{ classData?.students?.length || 0 }}</span>
      </p>
    </div>
    
    <button
      v-if="activeTab === 'matakuliah'"
      @click="openModal('create')"
      class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors whitespace-nowrap"
    >
      <Plus class="w-4 h-4" />
      Tambah Matakuliah
    </button>
  </div>

  <div class="flex flex-col lg:flex-row gap-6 items-start">
    <!-- Left Sidebar Menu -->
    <div class="lg:w-1/4 w-full flex-shrink-0">
      <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden sticky top-6">
        <div class="p-4 border-b border-gray-100 bg-gray-50/50">
          <h2 class="text-sm font-semibold text-gray-800 uppercase tracking-wider">Navigasi Rombel</h2>
        </div>
        <nav class="flex flex-col p-2 space-y-1">
          <button
            @click="activeTab = 'matakuliah'"
            :class="[
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left',
              activeTab === 'matakuliah' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            ]"
          >
            <BookOpen class="w-4 h-4" :class="activeTab === 'matakuliah' ? 'text-blue-600' : 'text-gray-400'" />
            1. Matakuliah & Penugasan
          </button>
          
          <button
            @click="activeTab = 'jadwal'"
            :class="[
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left',
              activeTab === 'jadwal' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            ]"
          >
            <CalendarDays class="w-4 h-4" :class="activeTab === 'jadwal' ? 'text-blue-600' : 'text-gray-400'" />
            2. Jadwal 16 Pertemuan
          </button>
          
          <button
            @click="activeTab = 'peserta'"
            :class="[
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left',
              activeTab === 'peserta' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            ]"
          >
            <Users class="w-4 h-4" :class="activeTab === 'peserta' ? 'text-blue-600' : 'text-gray-400'" />
            3. Peserta Rombel
          </button>
        </nav>
      </div>
    </div>

    <!-- Main Content Area -->
    <div class="lg:w-3/4 w-full">
      <!-- Tab 1: Matakuliah -->
      <div v-show="activeTab === 'matakuliah'" class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div class="p-4 border-b border-gray-100 bg-gray-50/50">
          <h2 class="text-lg font-semibold text-gray-800">Daftar Matakuliah di Rombel Ini</h2>
        </div>
    
    <div class="p-0">
      <table class="w-full text-left border-collapse">
        <thead class="bg-gray-50 text-gray-700 text-sm">
          <tr>
            <th class="py-3 px-4 font-semibold border-b border-gray-100">Matakuliah</th>
            <th class="py-3 px-4 font-semibold border-b border-gray-100 text-center">SKS</th>
            <th class="py-3 px-4 font-semibold border-b border-gray-100 text-center">Tipe Pertemuan</th>
            <th class="py-3 px-4 font-semibold border-b border-gray-100 text-center">Jumlah Prt.</th>
            <th class="py-3 px-4 font-semibold border-b border-gray-100">Dosen Pengampu</th>
            <th class="py-3 px-4 font-semibold border-b border-gray-100 text-right">Aksi</th>
          </tr>
        </thead>
        <tbody class="text-sm divide-y divide-gray-100">
          <tr v-if="loading">
            <td colspan="6" class="py-8 text-center text-gray-500">Memuat matakuliah...</td>
          </tr>
          <tr v-else-if="classCourses.length === 0">
            <td colspan="6" class="py-8 text-center text-gray-500 italic">Belum ada matakuliah di rombel ini.</td>
          </tr>
          <tr v-for="item in classCourses" :key="item.id" class="hover:bg-blue-50/30 transition-colors">
            <td class="py-3 px-4">
              <div class="font-medium text-gray-900 flex items-center gap-2">
                <span v-if="item.course?.code" class="text-xs font-mono text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200">{{ item.course.code }}</span>
                <span>{{ item.course?.name }}</span>
              </div>
              <div v-if="item.classSchedules?.length || item.timeslot || item.startDate || item.endDate" class="mt-1.5 text-xs text-gray-500 flex flex-col gap-1">
                <!-- Tampilkan Jadwal Hasil Generate -->
                <template v-if="item.classSchedules?.length">
                  <div class="flex items-center gap-1.5 text-green-700 bg-green-50 w-fit px-2 py-1 rounded border border-green-200">
                    <svg class="w-3 h-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                    <span class="font-medium">Jadwal Fix Tersedia</span>
                  </div>
                  <button 
                    @click="openScheduleModal(item)"
                    class="flex items-center gap-1 text-blue-600 hover:text-blue-800 transition-colors w-fit underline font-medium mt-0.5"
                  >
                    <CalendarDays class="w-3 h-3" /> Lihat Jadwal ({{ item.classSchedules.length }} Pertemuan)
                  </button>
                </template>
                <!-- Tampilkan Pilihan Prioritas Waktu jika belum ada jadwal -->
                <template v-else-if="item.timeslot">
                  <div class="flex items-center gap-1.5 text-blue-600 bg-blue-50 w-fit px-1.5 py-0.5 rounded border border-blue-200" title="Prioritas waktu (Belum di-generate)">
                    <svg class="w-3 h-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                    <span class="font-medium">Prioritas:</span> {{ dayNames[item.timeslot.dayOfWeek] }}, {{ item.timeslot.startTime?.slice(0,5) }} - {{ item.timeslot.endTime?.slice(0,5) }}
                  </div>
                </template>

                <div v-if="item.startDate || item.endDate" class="flex items-center gap-1.5 mt-0.5">
                  <svg class="w-3 h-3 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                  <span v-if="item.startDate">{{ new Date(item.startDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) }}</span>
                  <span v-if="item.startDate && item.endDate"> s.d. </span>
                  <span v-if="item.endDate">{{ new Date(item.endDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) }}</span>
                </div>
              </div>
            </td>
            <td class="py-3 px-4 text-center text-gray-600">{{ item.course?.sks || '-' }}</td>
            <td class="py-3 px-4 text-center">
              <span v-if="item.onlinePercentage === 100" class="bg-purple-50 text-purple-700 px-2.5 py-1 rounded-md text-xs font-semibold">100% Online</span>
              <span v-else-if="item.onlinePercentage > 0" class="bg-blue-50 text-blue-700 px-2.5 py-1 rounded-md text-xs font-semibold">Hybrid ({{ item.onlinePercentage }}%)</span>
              <span v-else class="bg-green-50 text-green-700 px-2.5 py-1 rounded-md text-xs font-semibold">100% Tatap Muka</span>
            </td>
            <td class="py-3 px-4 text-center text-gray-600">{{ item.totalMeetings }}</td>
            <td class="py-3 px-4">
              <div v-if="item.classLecturers && item.classLecturers.length > 0" class="flex flex-col gap-1 items-start">
                <span v-for="l in item.classLecturers" :key="l.id" class="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded border border-gray-200">
                  {{ l.lecturer?.fullName || l.lecturer?.name || 'Unknown' }} <span v-if="l.isPrimary" class="text-blue-600 font-bold ml-1">(PJ)</span>
                </span>
              </div>
              <span v-else class="text-gray-400 italic text-xs">Belum ada dosen</span>
            </td>
            <td class="py-3 px-4">
               <div class="flex justify-end gap-2">
                 <button
                   @click="openAssignModal(item)"
                   class="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                   title="Atur Pengampu"
                 >
                   <Users class="w-4 h-4" />
                 </button>
                 <button
                   @click="openModal('edit', item)"
                   class="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                   title="Edit Pengaturan"
                 >
                   <Edit2 class="w-4 h-4" />
                 </button>
                 <button
                   @click="confirmDelete(item)"
                   class="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                   title="Hapus"
                 >
                   <Trash2 class="w-4 h-4" />
                 </button>
               </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>

  <!-- Tab 2: Jadwal -->
  <div v-if="activeTab === 'jadwal'" class="space-y-6">
    <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex justify-between items-center">
      <div>
        <h2 class="text-lg font-semibold text-gray-800">Jadwal 16 Pertemuan</h2>
        <p class="text-xs text-gray-500 mt-1">Sistem akan secara otomatis menyusun jadwal pertemuan, menyesuaikan tanggal dan slot prioritas matakuliah. Offline/online di-acak random.</p>
      </div>
      <div class="flex items-center gap-2">
        <button
          @click="expandedCourses.size === classCourses.length ? expandedCourses.clear() : classCourses.forEach((c: any) => expandedCourses.add(c.id))"
          class="text-xs bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 px-2.5 py-1.5 rounded-md font-medium transition-colors"
        >
          {{ expandedCourses.size === classCourses.length ? 'Collapse All' : 'Expand All' }}
        </button>
        <button 
          v-if="classCourses.some(c => c.classSchedules?.length)"
          @click="deleteSchedule" 
          :disabled="loading"
          class="bg-red-50 text-red-600 hover:bg-red-100 disabled:opacity-50 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors font-medium text-sm border border-red-200"
        >
          <Trash2 class="w-4 h-4" /> 
        </button>
        <button 
          @click="generateSchedule" 
          :disabled="loading"
          class="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors font-medium text-sm"
        >
          <CalendarDays class="w-4 h-4" /> 
          {{ loading ? 'Generating...' : 'Generate Jadwal Rombel Ini' }}
        </button>
      </div>
    </div>

    <!-- Bulk Action Toolbar -->
    <div v-if="bulkSelectedIds.length > 0" class="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-center justify-between sticky top-0 z-10">
      <span class="text-sm font-semibold text-blue-800">{{ bulkSelectedIds.length }} pertemuan dipilih</span>
      <div class="flex gap-2">
        <button @click="isReschedOpen = true" class="text-xs bg-blue-600 text-white hover:bg-blue-700 px-3 py-1.5 rounded-md font-medium transition-colors">
          Reschedule
        </button>
        <button @click="bulkDeleteSchedules" class="text-xs bg-red-600 text-white hover:bg-red-700 px-3 py-1.5 rounded-md font-medium transition-colors">
          Hapus Terpilih
        </button>
        <button @click="bulkSelectedIds = []" class="text-xs bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 px-3 py-1.5 rounded-md font-medium transition-colors">
          Batal
        </button>
      </div>
    </div>

    <div v-if="classCourses.length === 0" class="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center text-gray-500">
      Belum ada matakuliah di rombel ini.
    </div>

    <!-- Iterate over courses to show their meetings (collapsible) -->
    <div v-for="item in classCourses" :key="'sched-'+item.id" class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div 
        class="p-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center cursor-pointer select-none hover:bg-gray-100/50 transition-colors"
        @click="expandedCourses.has(item.id) ? expandedCourses.delete(item.id) : expandedCourses.add(item.id)"
      >
        <div class="flex items-center gap-2">
          <svg :class="['w-4 h-4 text-gray-500 transition-transform', expandedCourses.has(item.id) ? 'rotate-90' : '']" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
          <div>
            <h3 class="text-md font-bold text-gray-800">{{ item.course?.name }}</h3>
            <p class="text-xs text-gray-500 mt-0.5">
              <span v-if="item.classLecturers?.length">
                Dosen: {{ item.classLecturers.map((cl: any) => cl.lecturer?.fullName || cl.lecturer?.name).join(', ') }}
              </span>
              <span v-else class="italic">Belum ada dosen</span>
              <span class="ml-2 text-gray-400">· {{ item.classSchedules?.length || 0 }} pertemuan</span>
            </p>
          </div>
        </div>
        <div class="flex items-center gap-2" @click.stop>
          <span v-if="!item.classSchedules?.length" class="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs font-semibold">Belum Digenerate</span>
          <span v-else class="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-semibold">Sudah Terjadwal</span>
          
          <button @click="openManualSchedModal(item)" class="text-xs bg-white text-blue-600 border border-blue-200 hover:bg-blue-50 px-2.5 py-1.5 rounded-md font-medium flex items-center gap-1 transition-colors">
            <Plus class="w-3.5 h-3.5" /> Tambah 
          </button>
        </div>
      </div>
      
      <div v-if="expandedCourses.has(item.id) && item.classSchedules?.length" class="overflow-x-auto">
        <table class="w-full text-left text-sm">
          <thead class="bg-gray-50 text-gray-600 border-b border-gray-100">
            <tr>
              <th class="px-4 py-3 font-medium w-10">
                <input type="checkbox" 
                  :checked="item.classSchedules.every((s: any) => bulkSelectedIds.includes(s.id))"
                  @change="toggleAllSchedules(item)"
                  class="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              </th>
              <th class="px-4 py-3 font-medium">Prt. Ke</th>
              <th class="px-4 py-3 font-medium">Hari, Tanggal</th>
              <th class="px-4 py-3 font-medium">Waktu</th>
              <th class="px-4 py-3 font-medium">Ruang</th>
              <th class="px-4 py-3 font-medium">Dosen Pengampu</th>
              <th class="px-4 py-3 font-medium w-10"></th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            <tr v-for="(sched, idx) in item.classSchedules" :key="sched.id" 
              class="hover:bg-gray-50/50 transition-colors"
              :class="bulkSelectedIds.includes(sched.id) ? 'bg-blue-50/30' : ''"
            >
              <td class="px-4 py-2">
                <input type="checkbox" :value="sched.id" v-model="bulkSelectedIds"
                  class="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              </td>
              <td class="px-4 py-2 text-center w-16">{{ Number(idx) + 1 }}</td>
              <td class="px-4 py-2 font-medium text-gray-800 whitespace-nowrap">
                {{ dayNames[sched.dayOfWeek] }}, 
                <span class="font-normal text-gray-600">{{ new Date(sched.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) }}</span>
              </td>
              <td class="px-4 py-2 text-blue-700 whitespace-nowrap">
                {{ sched.startTime?.slice(0,5) }} - {{ sched.endTime?.slice(0,5) }}
              </td>
              <td class="px-4 py-2 text-gray-600">
                <span v-if="sched.room" class="flex items-center gap-1"><BookOpen class="w-3 h-3"/> {{ sched.room.name }}</span>
                <span v-else-if="sched.roomId" class="flex items-center gap-1"><BookOpen class="w-3 h-3"/> Ruang {{ sched.roomId }}</span>
                <span v-else class="text-purple-600 font-medium whitespace-nowrap">Online (Daring)</span>
              </td>
              <td class="px-4 py-2">
                <div v-if="item.classLecturers && item.classLecturers.length > 0" class="flex flex-col gap-1 items-start">
                  <span v-for="l in item.classLecturers" :key="l.id" class="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded border border-gray-200 whitespace-nowrap">
                    {{ l.lecturer?.fullName || l.lecturer?.name || 'Unknown' }} <span v-if="l.isPrimary" class="text-blue-600 font-bold ml-1">(PJ)</span>
                  </span>
                </div>
                <span v-else class="text-gray-400 italic text-xs">Belum ada dosen</span>
              </td>
              <td class="px-4 py-2 text-right">
                <button @click="deleteIndividualSchedule(sched.id)" class="text-red-500 hover:bg-red-50 p-1 rounded transition-colors" title="Hapus Pertemuan">
                  <Trash2 class="w-4 h-4" />
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-else-if="expandedCourses.has(item.id) && !item.classSchedules?.length" class="p-6 text-center text-gray-400 text-sm">
        Belum ada jadwal pertemuan.
      </div>
    </div>
  </div>

  <!-- Tab 3: Peserta -->
  <div v-if="activeTab === 'peserta'" class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
    <div class="p-6 border-b border-gray-100 bg-white">
      <h2 class="text-lg font-semibold text-gray-800 mb-4">Peserta per Matakuliah</h2>
      
      <div v-if="classCourses.length > 0" class="flex flex-col sm:flex-row gap-4 items-end">
        <div class="flex-1 w-full">
          <label class="block text-sm font-medium text-gray-700 mb-1">Pilih Matakuliah</label>
          <select 
            v-model="selectedEnrollCourseId"
            class="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="" disabled>-- Silakan pilih matakuliah --</option>
            <option v-for="c in classCourses" :key="'opt-'+c.id" :value="c.id.toString()">
              {{ c.course?.code ? c.course.code + ' - ' : '' }}{{ c.course?.name }} ({{ c.classCourseStudents?.length || 0 }} Mahasiswa)
            </option>
          </select>
        </div>
        
        <button 
          v-if="selectedEnrollCourseId"
          @click="openEnrollModal" 
          class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors whitespace-nowrap"
        >
          <Users class="w-4 h-4" /> 
          Atur Mahasiswa (Enroll)
        </button>
      </div>

      <div v-else class="text-center text-gray-500 py-4">
        Belum ada matakuliah di rombel ini. Silakan atur di Tab 1.
      </div>
    </div>

    <!-- Tampilan Daftar Peserta MK yang dipilih -->
    <div v-if="selectedEnrollCourseId" class="p-0">
      <div v-if="!currentEnrollCourse?.classCourseStudents?.length" class="p-12 text-center text-gray-500">
        Belum ada mahasiswa yang terdaftar di matakuliah ini.
      </div>
      <table v-else class="w-full text-left text-sm">
        <thead class="bg-gray-50 text-gray-600 border-b border-gray-100">
          <tr>
            <th class="px-6 py-3 font-medium w-16 text-center">No</th>
            <th class="px-6 py-3 font-medium">NIM</th>
            <th class="px-6 py-3 font-medium">Nama Mahasiswa</th>
            <th class="px-6 py-3 font-medium w-20 text-center">Aksi</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
          <tr v-for="(student, idx) in currentEnrollCourse.classCourseStudents" :key="'stu-'+student.studentId" class="hover:bg-gray-50/50">
            <td class="px-6 py-3 text-center text-gray-500">{{ Number(idx) + 1 }}</td>
            <td class="px-6 py-3 font-medium text-gray-700">{{ student.student?.nim || '-' }}</td>
            <td class="px-6 py-3">{{ student.student?.name || 'Unknown' }}</td>
            <td class="px-6 py-3 text-center">
              <button @click="unenrollStudent(student)" class="text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-colors" title="Hapus dari matakuliah">
                <Trash2 class="w-4 h-4" />
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</div>
</div>

  <!-- Form Tambah/Edit MK -->
  <ModalForm
    :modelValue="isModalOpen"
    @update:modelValue="isModalOpen = $event"
    :title="actionType === 'create' ? 'Tambah Matakuliah ke Rombel' : 'Edit Matakuliah'"
    @submit="handleSubmit"
  >
    <div class="space-y-4">
      <div v-if="actionType === 'create'">
        <label class="block text-sm font-medium text-gray-700 mb-1">Pilih Matakuliah *</label>
        <SearchableSelect
          :modelValue="form.courseId"
          @update:modelValue="form.courseId = $event"
          :options="availableCoursesOptions"
          placeholder="Pencarian Matakuliah..."
          class="w-full"
          required
        />
        <p v-if="availableCoursesOptions.length === 0" class="text-xs text-orange-500 mt-1">Semua matakuliah master sudah dimasukkan ke kelas ini.</p>
      </div>

      <div class="grid grid-cols-2 gap-4 mt-2">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Persentase Daring (%) *</label>
          <input
             type="number"
             v-model="form.onlinePercentage"
             min="0"
             max="100"
             required
             class="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <p class="text-xs text-gray-500 mt-1">Isi 0 untuk 100% Tatap Muka</p>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Total Pertemuan *</label>
          <input
            v-model="form.totalMeetings"
            type="number"
            min="1"
            required
            class="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <p class="text-xs text-gray-500 mt-1">Pertemuan wajib (standar: 16 ptmn)</p>
        </div>
      </div>

      <!-- Tanggal Mulai / Selesai -->
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Tanggal Mulai</label>
          <input
            v-model="form.startDate"
            type="date"
            class="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Tanggal Selesai</label>
          <input
            v-model="form.endDate"
            type="date"
            class="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      <!-- Slot Waktu -->
      <div class="grid grid-cols-3 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Hari Perkuliahan</label>
          <select
            v-model="form.dayOfWeek"
            class="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Pilih Hari...</option>
            <option :value="1">Senin</option>
            <option :value="2">Selasa</option>
            <option :value="3">Rabu</option>
            <option :value="4">Kamis</option>
            <option :value="5">Jumat</option>
            <option :value="6">Sabtu</option>
            <option :value="0">Minggu</option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Waktu Mulai</label>
          <SearchableSelect
            :modelValue="form.scheduledStartTime"
            @update:modelValue="form.scheduledStartTime = $event"
            :options="[{value: '', label: 'Pilih...'}, ...allTimeslots.map((t: any) => ({ value: t.startTime, label: t.startTime?.slice(0,5) }))]"
            placeholder="Cari waktu..."
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Waktu Selesai</label>
          <SearchableSelect
            :modelValue="form.scheduledEndTime"
            @update:modelValue="form.scheduledEndTime = $event"
            :options="[{value: '', label: 'Pilih...'}, ...allTimeslots.map((t: any) => ({ value: t.endTime, label: t.endTime?.slice(0,5) }))]"
            placeholder="Cari waktu..."
          />
        </div>
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Prioritas Ruangan</label>
        <!-- Search -->
        <div class="relative mb-2">
          <svg class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          <input
            v-model="roomSearch"
            type="text"
            placeholder="Cari ruangan..."
            class="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
          />
        </div>
        <!-- Room List -->
        <div class="border border-gray-200 rounded-lg max-h-[160px] overflow-y-auto divide-y divide-gray-50">
          <template v-for="r in filteredRooms" :key="r.id">
            <label
              class="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-blue-50/50 transition-colors"
              :class="{ 'bg-blue-50': form.roomIds.includes(r.id) }"
            >
              <input
                type="checkbox"
                :value="r.id"
                v-model="form.roomIds"
                class="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <div class="flex items-center gap-2 min-w-0">
                <span class="text-sm font-medium text-gray-800">{{ r.name }}</span>
                <span class="text-xs text-gray-400">Kapasitas: {{ r.capacity }}</span>
              </div>
            </label>
          </template>
          <div v-if="filteredRooms.length === 0" class="px-3 py-4 text-center text-sm text-gray-400">
            Tidak ada ruangan yang cocok.
          </div>
        </div>
        <p v-if="form.roomIds.length" class="text-xs text-blue-600 mt-1 font-medium">
          {{ form.roomIds.length }} ruangan dipilih
        </p>
      </div>
    </div>
  </ModalForm>

  <!-- Form Assign Dosen -->
  <ModalForm
    :modelValue="isAssignOpen"
    @update:modelValue="isAssignOpen = $event"
    title="Atur Dosen Pengampu"
    @submit="handleAssignSubmit"
  >
    <div class="space-y-4">
      <p class="text-sm text-gray-600 mb-4">
        Pilih dosen untuk matakuliah <strong class="text-gray-900">{{ selectedClassCourse?.course?.name }}</strong>. Dosen pertama yang dipilih otomatis menjadi Penanggung Jawab (PJMK).
      </p>
      <div>
         <label class="block text-sm font-medium text-gray-700 mb-1">Pilih Dosen</label>
         <!-- Filters Row -->
         <div class="flex gap-2 mb-2">
           <div class="relative flex-1">
             <svg class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
             <input
               v-model="lecturerSearch"
               type="text"
               placeholder="Cari nama / NIDN..."
               class="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
             />
           </div>
           <select
             v-model="filterProdiAssign"
             class="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white min-w-[140px]"
           >
             <option value="">Semua Prodi</option>
             <option v-for="p in allProdis" :key="p.id" :value="p.id">{{ p.shortName || p.name }}</option>
           </select>
         </div>
         <!-- Lecturer List -->
         <div class="border border-gray-200 rounded-lg max-h-[220px] overflow-y-auto divide-y divide-gray-50">
           <template v-for="l in filteredLecturers" :key="l.id">
             <label
               class="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-blue-50/50 transition-colors"
               :class="{ 'bg-blue-50': assignForm.lecturerIds.includes(l.id) }"
             >
               <input
                 type="checkbox"
                 :value="l.id"
                 v-model="assignForm.lecturerIds"
                 class="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
               />
               <div class="flex flex-col min-w-0">
                 <span class="text-sm font-medium text-gray-800 truncate">{{ l.fullName || l.name }}</span>
                 <span class="text-xs text-gray-400">{{ l.nidn ? `NIDN: ${l.nidn}` : l.email }} {{ l.homeProdi ? `· ${l.homeProdi.shortName || l.homeProdi.name}` : '' }}</span>
               </div>
             </label>
           </template>
           <div v-if="filteredLecturers.length === 0" class="px-3 py-6 text-center text-sm text-gray-400">
             Tidak ada dosen yang cocok.
           </div>
         </div>
         <p v-if="assignForm.lecturerIds.length" class="text-xs text-blue-600 mt-1.5 font-medium">
           {{ assignForm.lecturerIds.length }} dosen dipilih
         </p>
      </div>
    </div>
  </ModalForm>

  <!-- Form Enroll Mahasiswa -->
  <ModalForm
    :modelValue="isEnrollOpen"
    @update:modelValue="isEnrollOpen = $event"
    :title="`Enroll Mahasiswa: ${currentEnrollCourse?.course?.name}`"
    maxWidth="max-w-4xl"
    @submit="handleEnrollSubmit"
  >
    <div class="space-y-4">
      <div class="flex items-start justify-between bg-blue-50/50 p-3 rounded-lg border border-blue-100">
        <p class="text-sm text-gray-700">
          Silakan beri centang pada mahasiswa yang akan mengikuti matakuliah ini.
        </p>
        <label class="flex items-center gap-2 cursor-pointer pt-0.5">
          <input type="checkbox" v-model="enrollForm.enrollAllCourses" class="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-gray-300" />
          <span class="text-sm font-semibold text-blue-800">Enroll ke seluruh matakuliah Rombel ini sekaligus</span>
        </label>
      </div>

      <div>
         <label class="block text-sm font-medium text-gray-700 mb-1">Cari Mahasiswa</label>
         <!-- Filters Row -->
         <div class="flex gap-2 mb-2">
           <div class="relative flex-1">
             <svg class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
             <input
               v-model="studentSearch"
               type="text"
               placeholder="Cari nama / NIM / Email..."
               class="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
             />
           </div>
           <select
             v-model="filterAngkatanEnroll"
             class="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white min-w-[140px]"
           >
             <option value="">Semua Angkatan</option>
             <option v-for="y in availableAngkatans" :key="y" :value="y.toString()">Angkatan {{ y }}</option>
           </select>
           <select
             v-model="filterProdiEnroll"
             class="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white min-w-[160px]"
           >
             <option value="">Semua Program Studi</option>
             <option v-for="p in allProdis" :key="p.id" :value="p.id">{{ p.shortName || p.name }}</option>
           </select>
         </div>
         
         <!-- Student List (Grid Layout) -->
         <div class="border border-gray-200 rounded-lg max-h-[400px] overflow-y-auto bg-gray-50/30 p-2">
           <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
             <template v-for="s in filteredStudents" :key="s.id">
               <label
                 class="flex items-start gap-3 p-3 cursor-pointer rounded-lg border bg-white hover:border-blue-300 hover:shadow-sm transition-all"
                 :class="enrollForm.studentIds.includes(s.id) ? 'border-blue-400 bg-blue-50/50 shadow-sm ring-1 ring-blue-400/20' : 'border-gray-200'"
               >
                 <input
                   type="checkbox"
                   :value="s.id"
                   v-model="enrollForm.studentIds"
                   class="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                 />
                 <div class="flex flex-col min-w-0 flex-1">
                   <span class="text-sm font-semibold text-gray-800 line-clamp-1" :title="s.name">{{ s.name }}</span>
                   <span class="text-xs text-gray-500 font-medium">{{ s.nim || s.email }}</span>
                   <div class="flex items-center gap-1 mt-1 text-[11px] text-gray-400">
                     <span v-if="s.angkatan" class="bg-gray-100 px-1.5 py-0.5 rounded">{{ s.angkatan }}</span>
                     <span class="truncate">{{ s.prodi ? (s.prodi.shortName || s.prodi.name) : '' }}</span>
                   </div>
                 </div>
               </label>
             </template>
           </div>
           <div v-if="filteredStudents.length === 0" class="px-3 py-12 text-center text-sm text-gray-400">
             Tidak ada mahasiswa yang cocok dengan pencarian Anda.
           </div>
         </div>
         
          <div class="flex justify-between items-center mt-2">
            <p class="text-xs text-blue-600 font-medium bg-blue-50 px-2 py-1 rounded">
              {{ enrollForm.studentIds.length }} mahasiswa terpilih
            </p>
            <div class="flex gap-2">
              <button type="button" @click="enrollForm.studentIds = filteredStudents.map((s: any) => s.id)" class="text-xs text-blue-600 hover:text-blue-800 font-medium px-2 py-1 rounded border border-blue-200 hover:bg-blue-50 transition-colors">
                Pilih Semua
              </button>
              <button type="button" @click="enrollForm.studentIds = []" class="text-xs text-gray-500 hover:text-gray-700 font-medium px-2 py-1 rounded border border-gray-200 hover:bg-gray-50 transition-colors">
                Hapus Semua
              </button>
            </div>
          </div>
      </div>
    </div>
  </ModalForm>

  <!-- Modal Jadwal Manual -->
  <ModalForm
    :modelValue="isManualSchedOpen"
    @update:modelValue="isManualSchedOpen = $event"
    title="Tambah Pertemuan Manual"
    submitText="Simpan"
    :loading="loading"
    @submit="submitManualSched"
  >
    <div class="space-y-4">
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Tanggal Pertemuan</label>
        <input
          v-model="manualSchedForm.date"
          type="date"
          required
          class="w-full rounded-lg border-gray-300 focus:border-blue-500 focus:ring-blue-500"
        />
      </div>
      
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Waktu Mulai</label>
          <input
            v-model="manualSchedForm.startTime"
            type="time"
            required
            class="w-full rounded-lg border-gray-300 focus:border-blue-500 focus:ring-blue-500"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Waktu Selesai</label>
          <input
            v-model="manualSchedForm.endTime"
            type="time"
            required
            class="w-full rounded-lg border-gray-300 focus:border-blue-500 focus:ring-blue-500"
          />
        </div>
      </div>

      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1"
          >Penempatan Ruang Fisik <span class="text-gray-400 font-normal">(Kosongkan jika daring/online)</span></label
        >
        <SearchableSelect
          :modelValue="manualSchedForm.roomId"
          @update:modelValue="manualSchedForm.roomId = $event"
          :options="allRooms.map((r) => ({ value: r.id, label: `${r.name} (Kapasitas: ${r.capacity})` }))"
          placeholder="Pilih Ruangan"
        />
      </div>
    </div>
  </ModalForm>

  <!-- Modal Reschedule Bulk -->
  <ModalForm
    :modelValue="isReschedOpen"
    @update:modelValue="isReschedOpen = $event"
    title="Reschedule Jadwal Terpilih"
    :submitText="`Reschedule ${bulkSelectedIds.length} Pertemuan`"
    :loading="loading"
    @submit="handleBulkReschedule"
    size="md"
  >
    <div class="space-y-4">
      <p class="text-sm text-gray-600 bg-blue-50 border border-blue-200 rounded-lg p-3">
        Isi field yang ingin diubah. Field yang kosong tidak akan berubah.
      </p>
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Tanggal Baru</label>
        <input v-model="reschedForm.date" type="date" class="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
      </div>
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Waktu Mulai</label>
          <SearchableSelect
            :modelValue="reschedForm.startTime"
            @update:modelValue="reschedForm.startTime = $event"
            :options="[{value: '', label: 'Tidak berubah'}, ...allTimeslots.map((t: any) => ({ value: t.startTime, label: t.startTime?.slice(0,5) }))]"
            placeholder="Cari waktu..."
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Waktu Selesai</label>
          <SearchableSelect
            :modelValue="reschedForm.endTime"
            @update:modelValue="reschedForm.endTime = $event"
            :options="[{value: '', label: 'Tidak berubah'}, ...allTimeslots.map((t: any) => ({ value: t.endTime, label: t.endTime?.slice(0,5) }))]"
            placeholder="Cari waktu..."
          />
        </div>
      </div>
      <div>
        <label class="block text-sm font-medium text-gray-700 mb-1">Ruangan</label>
        <SearchableSelect
          :modelValue="reschedForm.roomId"
          @update:modelValue="reschedForm.roomId = $event"
          :options="[{value: '', label: 'Tidak berubah'}, ...allRooms.map((r) => ({ value: r.id, label: `${r.name} (Kapasitas: ${r.capacity})` }))]"
          placeholder="Tidak berubah"
        />
      </div>
    </div>
  </ModalForm>
</template>

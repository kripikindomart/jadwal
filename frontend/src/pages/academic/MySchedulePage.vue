<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import api from '@/lib/api';
import { useToast } from '@/composables/useToast';
import SearchableSelect from '@/components/ui/SearchableSelect.vue';
import { Calendar, RefreshCw, UserCheck } from 'lucide-vue-next';

interface Semester {
  id: number;
  name: string;
}

interface ScheduleClass {
  id: number;
  name: string;
  course: string;
  lecturers: string[];
}

interface ScheduleItem {
  id: number;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  room: string;
  class: ScheduleClass;
}

const toast = useToast();

const semesters = ref<Semester[]>([]);
const selectedSemesterId = ref<number | null>(null);
const schedules = ref<ScheduleItem[]>([]);
const loading = ref(false);

const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

// Options for SearchableSelect
const semesterOptions = computed(() =>
  semesters.value.map(s => ({ value: s.id, label: s.name }))
);

const fetchSemesters = async () => {
  try {
    const res = await api.get('/semesters');
    semesters.value = res.data?.data || res.data || [];
    // Auto select first active semester if available
    if (semesters.value.length > 0 && !selectedSemesterId.value) {
      selectedSemesterId.value = semesters.value[0]?.id || null;
      if (selectedSemesterId.value) {
        fetchSchedules();
      }
    }
  } catch (error: any) {
    console.error('Gagal memuat Periode Akademik:', error);
  }
};

const fetchSchedules = async () => {
  if (!selectedSemesterId.value) return;
  
  loading.value = true;
  try {
    const response = await api.get(`/schedules/my-schedule?semesterId=${selectedSemesterId.value}`);
    schedules.value = response?.data?.data || response?.data || [];
  } catch (error: any) {
    toast.error('Gagal memuat jadwal kelas Anda');
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  fetchSemesters();
});

watch(selectedSemesterId, () => {
  fetchSchedules();
});

// Group schedules by day
const schedulesByDay = computed(() => {
  const grouped = new Map<number, ScheduleItem[]>();
  // Initialize days 1-5 (Senin-Jumat)
  for (let i = 1; i <= 5; i++) {
    grouped.set(i, []);
  }

  schedules.value.forEach(s => {
    if (!grouped.has(s.dayOfWeek)) {
      grouped.set(s.dayOfWeek, []);
    }
    grouped.get(s.dayOfWeek)!.push(s);
  });

  // Sort inside each day by time
  grouped.forEach(list => {
    list.sort((a, b) => a.startTime.localeCompare(b.startTime));
  });

  // Filter out days that have no schedules if the list is overall sparse, or just show them empty
  return Array.from(grouped.entries()).sort((a, b) => a[0] - b[0]);
});

</script>

<template>
    <div class="mb-6 flex justify-between items-center">
      <div>
        <h1 class="text-2xl font-bold text-gray-800">Jadwal Saya</h1>
        <p class="text-gray-600">Jadwal perkuliahan yang Anda ikuti atau ampu</p>
      </div>
    </div>

    <!-- Filters -->
    <div class="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6 flex items-center gap-4">
      <div class="w-80">
        <label class="block text-sm font-medium text-gray-700 mb-1">Periode Akademik</label>
        <SearchableSelect
          v-model="selectedSemesterId"
          :options="semesterOptions"
          placeholder="Pilih Periode Semester"
        />
      </div>
      <div v-if="loading" class="mt-5 text-gray-500 flex items-center gap-2">
        <RefreshCw class="w-4 h-4 animate-spin" /> <span>Memuat jadwal...</span>
      </div>
    </div>

    <!-- Schedule Grid -->
    <div v-if="!loading && schedulesByDay.length > 0" class="space-y-6">
      <div v-for="[dayIdx, items] in schedulesByDay" :key="dayIdx" class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div class="bg-gray-50 px-4 py-3 border-b flex justify-between items-center">
          <h2 class="font-semibold text-gray-800 flex items-center gap-2 text-lg">
            <Calendar class="w-5 h-5 text-indigo-600" />
            {{ days[dayIdx] }}
          </h2>
          <span class="text-sm text-gray-500 font-medium bg-gray-200 px-2.5 py-1 rounded-full">{{ items.length }} Kelas</span>
        </div>
        
        <div class="p-4">
          <div v-if="items.length === 0" class="text-gray-400 italic py-4 text-center">
            Tidak ada jadwal perkuliahan hari ini.
          </div>
          <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            <!-- Schedule Card -->
            <div 
              v-for="item in items" 
              :key="item.id" 
              class="border rounded-lg p-3 hover:shadow-md transition-shadow bg-indigo-50/20 hover:border-indigo-300 relative group"
            >
              <div class="flex justify-between items-start mb-2">
                <span class="bg-indigo-100 text-indigo-800 text-xs font-bold px-2 py-1 rounded">
                  {{ item.startTime.substring(0, 5) }} - {{ item.endTime.substring(0, 5) }}
                </span>
                <span class="bg-gray-100 text-gray-700 text-xs font-medium px-2 py-1 border rounded">
                  {{ item.room }}
                </span>
              </div>
              <h3 class="font-bold text-gray-900 leading-tight mb-1 truncate" :title="item.class.course">
                {{ item.class.course }}
              </h3>
              <p class="text-sm text-gray-600 font-medium mb-3">Kelas {{ item.class.name }}</p>
              
              <div class="mt-auto border-t pt-2">
                <p class="text-xs text-gray-500 line-clamp-2" :title="item.class?.lecturers?.join(', ') || ''">
                  👩‍🏫 {{ item.class?.lecturers && item.class.lecturers.length > 0 ? item.class.lecturers.join(', ') : 'Belum Atur Pengajar' }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Empty State -->
    <div v-else-if="!loading && schedulesByDay.length === 0" class="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
      <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-indigo-50 text-indigo-500 mb-4">
        <UserCheck class="w-8 h-8" />
      </div>
      <h3 class="text-lg font-bold text-gray-900 mb-2">Jadwal Kosong</h3>
      <p class="text-gray-500 max-w-md mx-auto mb-6">
        Anda belum memiliki jadwal perkuliahan untuk semester ini. Jadwal akan muncul di sini setelah administrator memasukkan Anda ke dalam kelas.
      </p>
    </div>

</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import api from '@/lib/api'
import { Sunrise, Sun, CloudSun, Moon, MoonStar } from 'lucide-vue-next'

interface ScheduleItem {
  id: number
  startTime: string
  endTime: string
  room: string
  courseName: string
  courseCode: string
  className: string
  prodi: string
  lecturers: string[]
}

const schedules = ref<ScheduleItem[]>([])
const semester = ref('')
const currentTime = ref(new Date())
const loading = ref(true)

// Dummy bimbingan data (bisa diganti API nanti)
const bimbingan = ref([
  { time: '08:00', title: 'Bimbingan Tesis - Kelompok A', info: 'Dr. Rina Wijaya, Ruang Diskusi 1' },
  { time: '10:30', title: 'Bimbingan Disertasi - Andi Saputra', info: 'Prof. Hasanuddin, Ruang Konsultasi' },
  { time: '13:15', title: 'Bimbingan Tesis - Budi & Ani', info: 'Dr. Eko Prasetyo, Ruang Diskusi 2' },
])

// Slideshow highlight
const currentSlide = ref(0)
const slides = [
  { src: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=800&q=80', title: 'SEMINAR NASIONAL INOVASI PENDIDIKAN 2026', desc: 'Hadiri seminar nasional dengan pembicara terkemuka dari berbagai universitas ternama.' },
  { src: 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=800&q=80', title: 'WISUDA PASCASARJANA SEPTEMBER 2026', desc: 'Selamat kepada 245 wisudawan pascasarjana yang telah menyelesaikan studinya.' },
  { src: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=800&q=80', title: 'PENDAFTARAN MAHASISWA BARU 2026/2027', desc: 'Gabung bersama program S2 & S3 unggulan kami. Kuota terbatas!' },
]

// Prayer times from Aladhan API
interface PrayerTime { name: string; time: string; icon: any }
const prayerTimes = ref<PrayerTime[]>([])

const scheduleScrollRef = ref<HTMLElement | null>(null)

let clockInterval: any = null
let refreshInterval: any = null
let slideInterval: any = null
let scrollInterval: any = null

onMounted(async () => {
  await Promise.all([fetchData(), fetchPrayerTimes()])
  clockInterval = setInterval(() => { currentTime.value = new Date() }, 1000)
  refreshInterval = setInterval(fetchData, 5 * 60 * 1000)
  slideInterval = setInterval(() => {
    currentSlide.value = (currentSlide.value + 1) % slides.length
  }, 7000)
  startAutoScroll()
})

onUnmounted(() => {
  if (clockInterval) clearInterval(clockInterval)
  if (refreshInterval) clearInterval(refreshInterval)
  if (slideInterval) clearInterval(slideInterval)
  if (scrollInterval) clearInterval(scrollInterval)
})

async function fetchData() {
  try {
    const { data } = await api.get('/display/today-schedule')
    schedules.value = data.schedules || []
    semester.value = data.semester || ''
  } catch (e) {
    console.error('Display fetch error:', e)
  } finally {
    loading.value = false
  }
}

async function fetchPrayerTimes() {
  try {
    const today = new Date()
    const dateStr = `${today.getDate().toString().padStart(2, '0')}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getFullYear()}`
    const url = `https://api.aladhan.com/v1/timingsByCity/${dateStr}?city=Bogor&country=Indonesia&method=20`

    const res = await fetch(url)
    const data = await res.json()

    if (data.code === 200) {
      const t = data.data.timings
      prayerTimes.value = [
        { name: 'Subuh', time: t.Fajr?.slice(0, 5) || '04:32', icon: Sunrise },
        { name: 'Dzuhur', time: t.Dhuhr?.slice(0, 5) || '11:54', icon: Sun },
        { name: 'Ashar', time: t.Asr?.slice(0, 5) || '15:12', icon: CloudSun },
        { name: 'Maghrib', time: t.Maghrib?.slice(0, 5) || '17:48', icon: Moon },
        { name: 'Isya', time: t.Isha?.slice(0, 5) || '19:02', icon: MoonStar },
      ]
    }
  } catch {
    prayerTimes.value = [
      { name: 'Subuh', time: '04:32', icon: Sunrise },
      { name: 'Dzuhur', time: '11:54', icon: Sun },
      { name: 'Ashar', time: '15:12', icon: CloudSun },
      { name: 'Maghrib', time: '17:48', icon: Moon },
      { name: 'Isya', time: '19:02', icon: MoonStar },
    ]
  }
}

function startAutoScroll() {
  if (scrollInterval) clearInterval(scrollInterval)
  scrollInterval = setInterval(() => {
    const el = scheduleScrollRef.value
    if (!el || el.scrollHeight <= el.clientHeight) return

    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 2) {
      setTimeout(() => {
        if (el) el.scrollTo({ top: 0, behavior: 'smooth' })
      }, 3000)
    } else {
      el.scrollTop += 1
    }
  }, 60)
}

const formattedTime = computed(() => {
  const h = currentTime.value.getHours().toString().padStart(2, '0')
  const m = currentTime.value.getMinutes().toString().padStart(2, '0')
  return `${h}:${m}`
})

const formattedSeconds = computed(() => {
  return currentTime.value.getSeconds().toString().padStart(2, '0')
})

const formattedDate = computed(() => {
  return currentTime.value.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
})

function isOngoing(startTime: string, endTime: string) {
  const now = currentTime.value
  const h = now.getHours().toString().padStart(2, '0')
  const m = now.getMinutes().toString().padStart(2, '0')
  const current = `${h}:${m}`
  return current >= startTime.slice(0, 5) && current <= endTime.slice(0, 5)
}

const nextPrayer = computed(() => {
  const now = currentTime.value
  const h = now.getHours().toString().padStart(2, '0')
  const m = now.getMinutes().toString().padStart(2, '0')
  const current = `${h}:${m}`
  return prayerTimes.value.find(p => p.time > current) || prayerTimes.value[0]
})
</script>

<template>
  <div class="h-screen w-screen overflow-hidden flex bg-gradient-to-br from-slate-50 to-emerald-50/30 font-sans">

    <!-- ============ LEFT PANEL: Jadwal (60%) ============ -->
    <section class="flex-[3] flex flex-col min-h-0 bg-white/80 backdrop-blur border-r border-slate-200">

      <!-- Title -->
      <div class="px-10 pt-8 pb-4 shrink-0">
        <h1 class="text-3xl font-bold text-slate-900 tracking-tight leading-tight">
          JADWAL KULIAH & BIMBINGAN
        </h1>
        <p class="text-sm text-emerald-700 font-semibold mt-1">{{ semester }}</p>
      </div>

      <!-- Scroll area -->
      <div ref="scheduleScrollRef" class="flex-1 overflow-y-auto px-10 pb-6 scroll-smooth">

        <!-- JADWAL KULIAH -->
        <div class="mb-8">
          <div class="flex items-center gap-2 mb-4">
            <div class="h-1 w-8 bg-emerald-500 rounded-full"></div>
            <h2 class="text-xs font-bold text-slate-700 tracking-[0.2em] uppercase">Jadwal Kuliah</h2>
          </div>

          <div v-if="loading" class="py-8 text-sm text-slate-400 italic">Memuat data...</div>

          <div v-else-if="schedules.length === 0" class="py-6 text-sm text-slate-400 italic border-l-4 border-slate-200 pl-4">
            Tidak ada kelas hari ini
          </div>

          <div v-else class="space-y-4">
            <div v-for="item in schedules" :key="item.id" class="flex items-start gap-5">
              <!-- Time -->
              <div :class="['min-w-[80px] text-2xl font-bold font-mono tracking-tight',
                isOngoing(item.startTime, item.endTime) ? 'text-emerald-600' : 'text-slate-800']">
                {{ item.startTime?.slice(0, 5) }}
              </div>

              <!-- Vertical accent -->
              <div :class="['w-0.5 rounded-full self-stretch',
                isOngoing(item.startTime, item.endTime) ? 'bg-emerald-500' : 'bg-emerald-300']"></div>

              <!-- Info -->
              <div class="flex-1 min-w-0 pt-1">
                <p class="text-base font-semibold text-emerald-700 leading-tight">
                  {{ item.courseName }}
                  <span v-if="isOngoing(item.startTime, item.endTime)" class="ml-2 inline-flex items-center gap-1 text-[10px] font-bold text-white bg-emerald-500 px-2 py-0.5 rounded-full align-middle">
                    <span class="h-1.5 w-1.5 rounded-full bg-white animate-pulse"></span> LIVE
                  </span>
                </p>
                <p class="text-sm text-slate-500 mt-0.5">
                  ({{ item.lecturers.join(', ') || '—' }}, {{ item.room }})
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- BIMBINGAN TESIS/DISERTASI -->
        <div>
          <div class="flex items-center gap-2 mb-4">
            <div class="h-1 w-8 bg-violet-500 rounded-full"></div>
            <svg class="h-4 w-4 text-slate-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>
            <h2 class="text-xs font-bold text-slate-700 tracking-[0.2em] uppercase">Bimbingan Tesis/Disertasi</h2>
          </div>

          <div class="space-y-4">
            <div v-for="(item, idx) in bimbingan" :key="idx" class="flex items-start gap-5">
              <div class="min-w-[80px] text-2xl font-bold font-mono text-slate-800 tracking-tight">
                {{ item.time }}
              </div>
              <div class="w-0.5 rounded-full self-stretch bg-violet-300"></div>
              <div class="flex-1 min-w-0 pt-1">
                <p class="text-base font-semibold text-slate-800 leading-tight">{{ item.title }}</p>
                <p class="text-sm text-slate-500 mt-0.5">({{ item.info }})</p>
              </div>
            </div>
          </div>
        </div>

      </div>

      <!-- Footer branding -->
      <div class="px-10 py-3 border-t border-slate-100 text-xs text-slate-400 flex items-center justify-between shrink-0">
        <span>Program Pascasarjana · Sistem Informasi Akademik</span>
        <span>{{ formattedDate }}</span>
      </div>
    </section>

    <!-- ============ RIGHT PANEL: Clock + Highlight + Prayer (40%) ============ -->
    <aside class="flex-[2] flex flex-col min-h-0 bg-gradient-to-br from-white to-emerald-50/50 p-8 gap-6">

      <!-- CLOCK -->
      <div class="text-center shrink-0">
        <div class="flex items-baseline justify-center gap-1">
          <span class="text-7xl font-bold text-slate-900 tracking-tighter font-mono leading-none">{{ formattedTime }}</span>
          <span class="text-2xl font-medium text-emerald-500 font-mono ml-1">{{ formattedSeconds }}</span>
        </div>
        <p class="text-sm text-slate-500 mt-2 capitalize">{{ formattedDate }}</p>
      </div>

      <!-- HIGHLIGHT KEGIATAN -->
      <div class="flex-1 flex flex-col min-h-0">
        <div class="flex items-center gap-2 mb-3">
          <div class="h-1 w-8 bg-amber-400 rounded-full"></div>
          <h3 class="text-xs font-bold text-slate-700 tracking-[0.2em] uppercase">Highlight Kegiatan</h3>
        </div>

        <div class="flex-1 rounded-2xl overflow-hidden relative shadow-lg border border-slate-200 min-h-0">
          <div v-for="(slide, idx) in slides" :key="idx"
            :class="['absolute inset-0 transition-opacity duration-1000', currentSlide === idx ? 'opacity-100' : 'opacity-0']">
            <img :src="slide.src" class="w-full h-full object-cover" />
            <div class="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent"></div>
            <div class="absolute bottom-0 left-0 right-0 p-5">
              <h4 class="text-white text-lg font-bold leading-tight drop-shadow mb-1">{{ slide.title }}</h4>
              <p class="text-white/90 text-xs leading-snug line-clamp-2">{{ slide.desc }}</p>
            </div>
          </div>

          <!-- Indicators -->
          <div class="absolute top-3 right-3 flex gap-1.5">
            <div v-for="(_, idx) in slides" :key="idx"
              :class="['h-1.5 rounded-full transition-all shadow', currentSlide === idx ? 'w-5 bg-white' : 'w-1.5 bg-white/60']"></div>
          </div>
        </div>
      </div>

      <!-- PRAYER SCHEDULE -->
      <div class="shrink-0">
        <div class="flex items-center gap-2 mb-3">
          <div class="h-1 w-8 bg-teal-500 rounded-full"></div>
          <h3 class="text-xs font-bold text-slate-700 tracking-[0.2em] uppercase">Prayer Schedule</h3>
          <span v-if="nextPrayer" class="ml-auto text-[10px] text-teal-700 bg-teal-100 px-2 py-0.5 rounded-full font-semibold">
            Berikutnya: {{ nextPrayer.name }} {{ nextPrayer.time }}
          </span>
        </div>

        <div class="grid grid-cols-5 gap-2">
          <div v-for="prayer in prayerTimes" :key="prayer.name"
            :class="['flex flex-col items-center py-3 px-2 rounded-xl transition-all',
              prayer.name === nextPrayer?.name
                ? 'bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-lg scale-105'
                : 'bg-white border border-slate-200 text-slate-600']">
            <div :class="['h-9 w-9 rounded-full flex items-center justify-center mb-1.5',
              prayer.name === nextPrayer?.name ? 'bg-white/20' : 'bg-emerald-50']">
              <component :is="prayer.icon" :class="['h-4 w-4', prayer.name === nextPrayer?.name ? 'text-white' : 'text-emerald-600']" />
            </div>
            <span :class="['text-[10px] font-semibold', prayer.name === nextPrayer?.name ? 'text-white/90' : 'text-slate-500']">
              {{ prayer.name }}
            </span>
            <span class="text-sm font-bold font-mono mt-0.5">{{ prayer.time }}</span>
          </div>
        </div>
      </div>
    </aside>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import api from '@/lib/api'
import {
  LayoutDashboard,
  GraduationCap,
  Calendar,
  Users,
  Settings,
  LogOut,
  Menu,
  Clock,
  Percent,
  X,
  Bell,
  Search,
  ChevronDown,
  ChevronRight,
  Shield,
  Key,
  ClipboardList,
  Mail,
  Tags,
  User,
  Lock,
  Check,
} from 'lucide-vue-next'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const sidebarOpen = ref(true)
const mobileSidebarOpen = ref(false)
const openSubmenu = ref<string | null>(null)

// Notification state
const showNotifDropdown = ref(false)
const notifications = ref<any[]>([])
const unreadCount = ref(0)

// User dropdown state
const showUserDropdown = ref(false)

// Profile modal state
const showProfileModal = ref(false)
const showPasswordModal = ref(false)
const profileForm = ref({ name: '', email: '', phone: '' })
const passwordForm = ref({ currentPassword: '', newPassword: '', confirmPassword: '' })
const profileSaving = ref(false)
const passwordSaving = ref(false)

interface MenuItem {
  label: string
  icon: any
  to?: string
  children?: { label: string; to: string; icon: any }[]
}

// ============ Notifications ============
async function fetchNotifications() {
  try {
    const { data } = await api.get('/notifications?limit=5')
    notifications.value = data.notifications || []
    unreadCount.value = data.unreadCount || 0
  } catch { /* silent */ }
}

async function markAsRead(id: number) {
  await api.patch(`/notifications/${id}/read`)
  fetchNotifications()
}

async function markAllRead() {
  await api.patch('/notifications/read-all')
  fetchNotifications()
}

// ============ User Profile ============
function openProfile() {
  showUserDropdown.value = false
  profileForm.value = {
    name: authStore.user?.name || '',
    email: authStore.user?.email || '',
    phone: '',
  }
  showProfileModal.value = true
}

async function saveProfile() {
  profileSaving.value = true
  try {
    await api.patch('/auth/profile', profileForm.value)
    await authStore.fetchProfile()
    showProfileModal.value = false
  } catch (e: any) {
    alert(e.response?.data?.message || 'Gagal menyimpan profil')
  } finally {
    profileSaving.value = false
  }
}

function openChangePassword() {
  showUserDropdown.value = false
  passwordForm.value = { currentPassword: '', newPassword: '', confirmPassword: '' }
  showPasswordModal.value = true
}

async function savePassword() {
  if (passwordForm.value.newPassword !== passwordForm.value.confirmPassword) {
    alert('Password baru dan konfirmasi tidak cocok')
    return
  }
  if (passwordForm.value.newPassword.length < 6) {
    alert('Password minimal 6 karakter')
    return
  }
  passwordSaving.value = true
  try {
    await api.patch('/auth/change-password', {
      currentPassword: passwordForm.value.currentPassword,
      newPassword: passwordForm.value.newPassword,
    })
    alert('Password berhasil diubah')
    showPasswordModal.value = false
  } catch (e: any) {
    alert(e.response?.data?.message || 'Gagal mengubah password')
  } finally {
    passwordSaving.value = false
  }
}

// Close dropdowns on outside click
function handleOutsideClick(e: MouseEvent) {
  const target = e.target as HTMLElement
  if (!target.closest('.notif-dropdown-area')) showNotifDropdown.value = false
  if (!target.closest('.user-dropdown-area')) showUserDropdown.value = false
}

onMounted(() => {
  fetchNotifications()
  document.addEventListener('click', handleOutsideClick)
})

onUnmounted(() => {
  document.removeEventListener('click', handleOutsideClick)
})

const menuItems = computed(() => {
  const items: MenuItem[] = [
    { label: 'Dashboard', icon: LayoutDashboard, to: '/' },
    { label: 'Jadwal Saya', icon: Calendar, to: '/my-schedule' },
  ]

  const isAdmin = authStore.hasAnyRole(['superadmin', 'admin'])
  const isStaff = authStore.hasAnyRole(['superadmin', 'admin', 'staff'])
  const isDosen = authStore.hasRole('dosen')
  const isMahasiswa = authStore.hasRole('mahasiswa')

  // ═══════════════════════════════════════════
  // MAHASISWA MENU
  // ═══════════════════════════════════════════
  if (isMahasiswa) {
    items.push({
      label: 'Tugas Akhir',
      icon: GraduationCap,
      children: [
        { label: 'Pengajuan & Status', to: '/my-thesis', icon: GraduationCap },
        { label: 'Request Bimbingan', to: '/my-guidance', icon: Calendar },
      ]
    })
    items.push({ label: 'Survei Saya', icon: ClipboardList, to: '/surveys/my-pending' })
    items.push({ label: 'Pengajuan Surat', icon: Mail, to: '/layanan-surat' })
    return items
  }

  // ═══════════════════════════════════════════
  // DOSEN MENU
  // ═══════════════════════════════════════════
  if (isDosen && !isStaff) {
    items.push({ label: 'Survei Saya', icon: ClipboardList, to: '/surveys/my-pending' })
    return items
  }

  // ═══════════════════════════════════════════
  // ADMIN / STAFF MENU
  // ═══════════════════════════════════════════

  // --- Master Data Akademik ---
  const akademikChildren = []
  if (authStore.hasPermission('semesters.view')) akademikChildren.push({ label: 'Periode Akademik', to: '/semesters', icon: Calendar })
  if (authStore.hasPermission('prodis.view')) akademikChildren.push({ label: 'Program Studi', to: '/prodis', icon: GraduationCap })
  if (authStore.hasPermission('concentrations.view')) akademikChildren.push({ label: 'Konsentrasi', to: '/admin/academic/concentrations', icon: GraduationCap })
  if (authStore.hasPermission('curriculums.view')) akademikChildren.push({ label: 'Kurikulum', to: '/admin/academic/curriculums', icon: LayoutDashboard })
  if (authStore.hasPermission('courses.view')) akademikChildren.push({ label: 'Mata Kuliah', to: '/courses', icon: GraduationCap })
  if (authStore.hasPermission('rooms.view')) akademikChildren.push({ label: 'Ruang Kelas', to: '/rooms', icon: LayoutDashboard })
  if (authStore.hasPermission('timeslots.view')) akademikChildren.push({ label: 'Slot Waktu', to: '/timeslots', icon: Clock })
  if (authStore.hasPermission('grade_components.view')) akademikChildren.push({ label: 'Komponen Nilai', to: '/grade-components', icon: Percent })

  if (akademikChildren.length > 0) {
    items.push({ label: 'Master Akademik', icon: GraduationCap, children: akademikChildren })
  }

  // --- Data Pengguna ---
  const userChildren = []
  if (authStore.hasPermission('lecturers.view')) userChildren.push({ label: 'Dosen', to: '/lecturers', icon: Users })
  if (authStore.hasPermission('students.view')) userChildren.push({ label: 'Mahasiswa', to: '/students', icon: Users })

  if (userChildren.length > 0) {
    items.push({ label: 'Data Pengguna', icon: Users, children: userChildren })
  }

  // --- Penjadwalan & Kelas ---
  const scheduleChildren = []
  if (authStore.hasPermission('classes.view')) scheduleChildren.push({ label: 'Rombongan Belajar', to: '/classes', icon: Users })
  if (authStore.hasPermission('schedules.view')) scheduleChildren.push({ label: 'Jadwal Perkuliahan', to: '/schedules', icon: Calendar })
  if (authStore.hasPermission('schedules.generate')) scheduleChildren.push({ label: 'Request Reschedule', to: '/reschedule', icon: Clock })
  if (authStore.hasPermission('attendance.view')) scheduleChildren.push({ label: 'Monitoring Kehadiran', to: '/attendance', icon: Clock })

  if (scheduleChildren.length > 0) {
    items.push({ label: 'Penjadwalan', icon: Calendar, children: scheduleChildren })
  }

  // --- Tugas Akhir & Bimbingan ---
  const thesisChildren: any[] = []
  if (authStore.hasPermission('thesis.view')) thesisChildren.push({ label: 'Data Tugas Akhir', to: '/thesis', icon: GraduationCap })
  if (authStore.hasPermission('thesis.view')) thesisChildren.push({ label: 'Monitoring Progress', to: '/thesis/monitoring', icon: LayoutDashboard })
  if (authStore.hasPermission('guidance.manage')) thesisChildren.push({ label: 'Jadwal Bimbingan', to: '/guidance', icon: Calendar })

  if (thesisChildren.length > 0) {
    items.push({ label: 'Tugas Akhir', icon: GraduationCap, children: thesisChildren })
  }

  // --- EDOM / Survei ---
  const edomChildren: any[] = []
  if (authStore.hasPermission('surveys.manage')) edomChildren.push({ label: 'Kelola Instrumen', to: '/surveys', icon: ClipboardList })
  edomChildren.push({ label: 'Survei Saya', to: '/surveys/my-pending', icon: ClipboardList })

  if (edomChildren.length > 0) {
    items.push({ label: 'EDOM / Survei', icon: ClipboardList, children: edomChildren })
  }

  // --- Layanan Surat ---
  if (isStaff) {
    items.push({
      label: 'Layanan Surat',
      icon: Mail,
      children: [
        { label: 'Klasifikasi Kode', to: '/letters/classifications', icon: Tags },
        { label: 'Jenis Surat', to: '/letters', icon: Mail },
        { label: 'Template Surat', to: '/letters/templates', icon: Mail },
        { label: 'Inbox Pengajuan', to: '/letters/requests', icon: Mail },
        { label: 'Manajemen PIN', to: '/letters/pins', icon: Key },
      ]
    })
  }

  // --- Users & ACL ---
  if (isAdmin) {
    const aclChildren = []
    if (authStore.hasPermission('users.view')) aclChildren.push({ label: 'Users', to: '/users', icon: Users })
    if (authStore.hasPermission('roles.view')) aclChildren.push({ label: 'Roles', to: '/users/roles', icon: Shield })
    if (authStore.hasPermission('permissions.view')) aclChildren.push({ label: 'Permissions', to: '/users/permissions', icon: Key })
    if (aclChildren.length > 0) {
      items.push({ label: 'Users & ACL', icon: Shield, children: aclChildren })
    }
  }

  // --- Pengaturan ---
  if (authStore.hasPermission('settings.manage') || authStore.hasRole('superadmin')) {
    items.push({ label: 'Pengaturan', icon: Settings, to: '/settings' })
  }

  // --- Display TV (buka tab baru) ---
  if (isStaff) {
    items.push({ label: 'Display TV', icon: LayoutDashboard, to: '/display/tv' })
  }

  return items
})

function isActive(path: string) {
  if (path === '/') return route.path === '/';
  if (route.path === path) return true;
  
  if (route.path.startsWith(path + '/')) {
    // Find all menu paths to check for overlaps
    const allPaths: string[] = [];
    for (const item of menuItems.value) {
      if (item.to) allPaths.push(item.to);
      if (item.children) {
        for (const child of item.children) {
          if (child.to) allPaths.push(child.to);
        }
      }
    }
    // If there is a longer menu path that matches the current route, this path should not be active
    const hasLongerMatch = allPaths.some(p => p.length > path.length && (route.path === p || route.path.startsWith(p + '/')));
    if (hasLongerMatch) return false;
    
    return true;
  }
  return false;
}

function isSubmenuActive(item: MenuItem) {
  return item.children?.some((c) => isActive(c.to)) ?? false
}

function toggleSubmenu(label: string) {
  openSubmenu.value = openSubmenu.value === label ? null : label
}

// Auto-open the submenu if a child is active
if (menuItems.value.some((m) => m.children && isSubmenuActive(m))) {
  const active = menuItems.value.find((m) => m.children && isSubmenuActive(m))
  if (active) openSubmenu.value = active.label
}

async function handleLogout() {
  authStore.logout()
  router.push('/login')
}
</script>

<template>
  <div class="flex h-screen overflow-hidden bg-slate-50">
    <!-- Sidebar -->
    <aside
      :class="[
        'fixed inset-y-0 left-0 z-50 flex flex-col transition-all duration-300 ease-in-out',
        'bg-white border-r border-slate-200 text-slate-700 shadow-sm',
        sidebarOpen ? 'w-64' : 'w-20',
        'lg:relative',
      ]"
    >
      <!-- Logo -->
      <div class="flex h-16 items-center gap-3 px-4 border-b border-slate-100">
        <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white font-bold text-lg shrink-0 shadow-sm">
          P
        </div>
        <div v-if="sidebarOpen" class="overflow-hidden transition-all duration-300">
          <h1 class="text-slate-800 font-bold text-lg leading-tight truncate">Pasca CMS</h1>
          <p class="text-xs text-slate-500 truncate">Sistem Akademik</p>
        </div>
      </div>

      <!-- Menu -->
      <nav class="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        <template v-for="item in menuItems" :key="item.label">
          <!-- Simple link (no children) -->
          <a
            v-if="!item.children && item.to === '/display/tv'"
            :href="item.to"
            target="_blank"
            :class="[
              'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
              'text-slate-600 hover:bg-slate-50 hover:text-emerald-600',
            ]"
          >
            <component :is="item.icon" class="h-5 w-5 shrink-0 text-slate-400" />
            <span v-if="sidebarOpen" class="truncate">{{ item.label }}</span>
            <span v-if="sidebarOpen" class="ml-auto text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">↗</span>
          </a>
          <router-link
            v-else-if="!item.children"
            :to="item.to!"
            :class="[
              'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
              isActive(item.to!)
                ? 'bg-emerald-50 text-emerald-700 shadow-sm shadow-emerald-100/50'
                : 'text-slate-600 hover:bg-slate-50 hover:text-emerald-600',
            ]"
          >
            <component :is="item.icon" class="h-5 w-5 shrink-0" :class="isActive(item.to!) ? 'text-emerald-600' : 'text-slate-400'" />
            <span v-if="sidebarOpen" class="truncate">{{ item.label }}</span>
          </router-link>

          <!-- Submenu parent -->
          <div v-else>
            <button
              @click="toggleSubmenu(item.label)"
              :class="[
                'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
                isSubmenuActive(item)
                  ? 'bg-slate-50 text-slate-900'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-emerald-600',
              ]"
            >
              <component :is="item.icon" class="h-5 w-5 shrink-0" :class="isSubmenuActive(item) ? 'text-emerald-600' : 'text-slate-400'" />
              <span v-if="sidebarOpen" class="flex-1 text-left truncate">{{ item.label }}</span>
              <ChevronRight
                v-if="sidebarOpen"
                :class="[
                  'h-4 w-4 transition-transform duration-200 text-slate-400',
                  openSubmenu === item.label ? 'rotate-90' : '',
                ]"
              />
            </button>

            <!-- Submenu children -->
            <div
              v-if="sidebarOpen && openSubmenu === item.label"
              class="mt-1 ml-4 space-y-0.5 border-l border-slate-200 pl-3"
            >
              <router-link
                v-for="child in item.children"
                :key="child.to"
                :to="child.to"
                :class="[
                  'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-all duration-200',
                  isActive(child.to)
                    ? 'bg-emerald-50 text-emerald-700 font-semibold'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-emerald-600',
                ]"
              >
                <component :is="child.icon" class="h-4 w-4 shrink-0" :class="isActive(child.to) ? 'text-emerald-600' : 'text-slate-400'" />
                <span class="truncate">{{ child.label }}</span>
              </router-link>
            </div>
          </div>
        </template>
      </nav>

      <!-- User Section -->
      <div class="border-t border-slate-100 p-3 bg-slate-50/50">
        <div class="flex items-center gap-3 rounded-xl px-3 py-2.5">
          <div class="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-600 text-white text-sm font-bold shrink-0 shadow-sm shadow-emerald-200">
            {{ authStore.user?.name?.charAt(0)?.toUpperCase() || 'A' }}
          </div>
          <div v-if="sidebarOpen" class="flex-1 overflow-hidden">
            <p class="text-sm font-bold text-slate-700 truncate">{{ authStore.user?.name || 'User' }}</p>
            <p class="text-xs text-slate-500 truncate">{{ authStore.user?.roles?.[0]?.name || 'Role' }}</p>
          </div>
          <button
            v-if="sidebarOpen"
            @click="handleLogout"
            class="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-rose-600 transition-colors"
            title="Logout"
          >
            <LogOut class="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>

    <!-- Mobile Overlay -->
    <div
      v-if="mobileSidebarOpen"
      class="fixed inset-0 z-40 bg-black/50 lg:hidden"
      @click="mobileSidebarOpen = false"
    />

    <!-- Main Content -->
    <div class="flex flex-1 flex-col overflow-hidden">
      <!-- Top Bar -->
      <header class="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 lg:px-6 shadow-sm">
        <div class="flex items-center gap-4">
          <!-- Sidebar Toggle -->
          <button
            @click="sidebarOpen = !sidebarOpen"
            class="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors hidden lg:flex"
          >
            <Menu class="h-5 w-5" />
          </button>

          <!-- Mobile Toggle -->
          <button
            @click="mobileSidebarOpen = !mobileSidebarOpen"
            class="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors lg:hidden"
          >
            <component :is="mobileSidebarOpen ? X : Menu" class="h-5 w-5" />
          </button>

          <!-- Search -->
          <div class="hidden md:flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-sm text-slate-500 w-80">
            <Search class="h-4 w-4" />
            <span>Cari... (Ctrl+K)</span>
          </div>
        </div>

        <div class="flex items-center gap-3">
          <!-- Notifications -->
          <div class="relative notif-dropdown-area">
            <button @click.stop="showNotifDropdown = !showNotifDropdown" class="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors">
              <Bell class="h-5 w-5" />
              <span v-if="unreadCount > 0" class="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white">
                {{ unreadCount > 9 ? '9+' : unreadCount }}
              </span>
            </button>

            <!-- Notification Dropdown -->
            <div v-if="showNotifDropdown" class="absolute right-0 top-12 w-80 rounded-xl bg-white border border-slate-200 shadow-xl z-50 overflow-hidden">
              <div class="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                <h3 class="text-sm font-bold text-slate-800">Notifikasi</h3>
                <button v-if="unreadCount > 0" @click="markAllRead" class="text-xs text-emerald-600 hover:underline">Tandai semua dibaca</button>
              </div>
              <div class="max-h-72 overflow-y-auto">
                <div v-if="notifications.length === 0" class="p-6 text-center text-sm text-slate-400">
                  Tidak ada notifikasi
                </div>
                <div v-for="n in notifications" :key="n.id"
                  @click="markAsRead(n.id)"
                  :class="['px-4 py-3 border-b border-slate-50 cursor-pointer hover:bg-slate-50 transition-colors', !n.isRead ? 'bg-emerald-50/50' : '']">
                  <div class="flex items-start gap-2">
                    <div :class="['h-2 w-2 rounded-full mt-1.5 shrink-0', !n.isRead ? 'bg-emerald-500' : 'bg-transparent']"></div>
                    <div class="flex-1 min-w-0">
                      <p class="text-sm font-medium text-slate-700 truncate">{{ n.title }}</p>
                      <p class="text-xs text-slate-500 mt-0.5 line-clamp-2">{{ n.message }}</p>
                      <p class="text-[10px] text-slate-400 mt-1">{{ new Date(n.createdAt).toLocaleString('id-ID') }}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- User Menu -->
          <div class="relative user-dropdown-area">
            <button @click.stop="showUserDropdown = !showUserDropdown" class="hidden sm:flex items-center gap-2 rounded-xl px-3 py-1.5 hover:bg-slate-100 transition-colors">
              <div class="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 text-sm font-bold">
                {{ authStore.user?.name?.charAt(0)?.toUpperCase() || 'A' }}
              </div>
              <span class="text-sm font-medium text-slate-700">{{ authStore.user?.name || 'User' }}</span>
              <ChevronDown :class="['h-4 w-4 text-slate-400 transition-transform', showUserDropdown ? 'rotate-180' : '']" />
            </button>

            <!-- User Dropdown -->
            <div v-if="showUserDropdown" class="absolute right-0 top-12 w-56 rounded-xl bg-white border border-slate-200 shadow-xl z-50 overflow-hidden">
              <div class="px-4 py-3 border-b border-slate-100">
                <p class="text-sm font-bold text-slate-800 truncate">{{ authStore.user?.name }}</p>
                <p class="text-xs text-slate-500 truncate">{{ authStore.user?.email }}</p>
                <p class="text-[10px] text-emerald-600 font-medium mt-0.5">{{ authStore.user?.roles?.[0]?.name || 'User' }}</p>
              </div>
              <div class="py-1">
                <button @click="openProfile" class="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition-colors">
                  <User class="h-4 w-4 text-slate-400" /> Edit Profil
                </button>
                <button @click="openChangePassword" class="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition-colors">
                  <Lock class="h-4 w-4 text-slate-400" /> Ganti Password
                </button>
              </div>
              <div class="border-t border-slate-100 py-1">
                <button @click="handleLogout" class="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-rose-600 hover:bg-rose-50 transition-colors">
                  <LogOut class="h-4 w-4" /> Keluar
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <!-- Page Content -->
      <main class="flex-1 overflow-y-auto p-4 lg:p-6">
        <slot />
      </main>
    </div>

    <!-- Profile Modal -->
    <div v-if="showProfileModal" class="fixed inset-0 z-[100] flex items-center justify-center bg-black/50" @click.self="showProfileModal = false">
      <div class="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl mx-4">
        <h2 class="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
          <User class="h-5 w-5 text-emerald-600" /> Edit Profil
        </h2>
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1">Nama</label>
            <input v-model="profileForm.name" type="text" class="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400" />
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input v-model="profileForm.email" type="email" class="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400" />
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1">No. HP</label>
            <input v-model="profileForm.phone" type="text" class="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400" placeholder="08xxxxxxxxxx" />
          </div>
        </div>
        <div class="flex justify-end gap-3 mt-6">
          <button @click="showProfileModal = false" class="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">Batal</button>
          <button @click="saveProfile" :disabled="profileSaving" class="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors">
            <Check class="h-4 w-4" /> Simpan
          </button>
        </div>
      </div>
    </div>

    <!-- Change Password Modal -->
    <div v-if="showPasswordModal" class="fixed inset-0 z-[100] flex items-center justify-center bg-black/50" @click.self="showPasswordModal = false">
      <div class="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl mx-4">
        <h2 class="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
          <Lock class="h-5 w-5 text-emerald-600" /> Ganti Password
        </h2>
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1">Password Saat Ini</label>
            <input v-model="passwordForm.currentPassword" type="password" class="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400" />
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1">Password Baru</label>
            <input v-model="passwordForm.newPassword" type="password" class="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400" />
          </div>
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1">Konfirmasi Password Baru</label>
            <input v-model="passwordForm.confirmPassword" type="password" class="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400" />
          </div>
        </div>
        <div class="flex justify-end gap-3 mt-6">
          <button @click="showPasswordModal = false" class="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">Batal</button>
          <button @click="savePassword" :disabled="passwordSaving" class="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors">
            <Check class="h-4 w-4" /> Ubah Password
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

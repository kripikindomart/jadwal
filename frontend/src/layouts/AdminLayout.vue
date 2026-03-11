<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
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
} from 'lucide-vue-next'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const sidebarOpen = ref(true)
const mobileSidebarOpen = ref(false)
const openSubmenu = ref<string | null>(null)

interface MenuItem {
  label: string
  icon: any
  to?: string
  children?: { label: string; to: string; icon: any }[]
}

const menuItems = computed(() => {
  const items: MenuItem[] = [
    { label: 'Dashboard', icon: LayoutDashboard, to: '/' },
    { label: 'Jadwal Saya', icon: Calendar, to: '/my-schedule' }
  ]

  // Akademik
  const akademikChildren = []
  if (authStore.hasPermission('semesters.view')) akademikChildren.push({ label: 'Periode Akademik', to: '/semesters', icon: Calendar })
  if (authStore.hasPermission('prodis.view')) akademikChildren.push({ label: 'Program Studi', to: '/prodis', icon: GraduationCap })
  if (authStore.hasPermission('concentrations.view')) akademikChildren.push({ label: 'Konsentrasi', to: '/admin/academic/concentrations', icon: GraduationCap })
  if (authStore.hasPermission('curriculums.view')) akademikChildren.push({ label: 'Manajemen Kurikulum', to: '/admin/academic/curriculums', icon: LayoutDashboard })
  if (authStore.hasPermission('courses.view')) akademikChildren.push({ label: 'Mata Kuliah', to: '/courses', icon: GraduationCap })
  if (authStore.hasPermission('rooms.view')) akademikChildren.push({ label: 'Ruang Kelas', to: '/rooms', icon: LayoutDashboard })
  if (authStore.hasPermission('timeslots.view')) akademikChildren.push({ label: 'Slot Waktu', to: '/timeslots', icon: Clock })
  if (authStore.hasPermission('grade_components.view')) akademikChildren.push({ label: 'Komponen Nilai', to: '/grade-components', icon: Percent })
  if (authStore.hasPermission('lecturers.view')) akademikChildren.push({ label: 'Dosen', to: '/lecturers', icon: Users })
  if (authStore.hasPermission('students.view')) akademikChildren.push({ label: 'Mahasiswa', to: '/students', icon: Users })

  if (akademikChildren.length > 0) {
    items.push({
      label: 'Akademik',
      icon: GraduationCap,
      children: akademikChildren
    })
  }

  // Penjadwalan
  const scheduleChildren = []
  if (authStore.hasPermission('classes.view')) scheduleChildren.push({ label: 'Kelas', to: '/classes', icon: Users })
  if (authStore.hasPermission('schedules.view')) scheduleChildren.push({ label: 'Jadwal Perkuliahan', to: '/schedules', icon: Calendar })

  if (scheduleChildren.length > 0) {
    items.push({
      label: 'Manajemen Kelas',
      icon: Calendar,
      children: scheduleChildren
    })
  }

  // EDOM / Survei
  const edomChildren: any[] = []
  if (authStore.hasPermission('surveys.manage')) edomChildren.push({ label: 'Kelola Instrumen', to: '/surveys', icon: ClipboardList })
  edomChildren.push({ label: 'Survei Saya', to: '/surveys/my-pending', icon: ClipboardList })

  if (edomChildren.length > 0) {
    items.push({
      label: 'EDOM / Survei',
      icon: ClipboardList,
      children: edomChildren
    })
  }

  // Layanan Surat
  const letterChildren: any[] = []
  letterChildren.push({ label: 'Klasifikasi Kode', to: '/letters/classifications', icon: Tags })
  letterChildren.push({ label: 'Jenis Surat', to: '/letters', icon: Mail })
  letterChildren.push({ label: 'Template Surat', to: '/letters/templates', icon: Mail })
  letterChildren.push({ label: 'Inbox Pengajuan', to: '/letters/requests', icon: Mail })
  letterChildren.push({ label: 'Manajemen PIN', to: '/letters/pins', icon: Key })

  if (letterChildren.length > 0) {
    items.push({
      label: 'Layanan Surat',
      icon: Mail,
      children: letterChildren
    })
  }

  // Users & ACL
  const aclChildren = []
  if (authStore.hasPermission('users.view')) aclChildren.push({ label: 'Users', to: '/users', icon: Users })
  if (authStore.hasPermission('roles.view')) aclChildren.push({ label: 'Roles', to: '/users/roles', icon: Shield })
  if (authStore.hasPermission('permissions.view')) aclChildren.push({ label: 'Permissions', to: '/users/permissions', icon: Key })

  if (aclChildren.length > 0) {
    items.push({
      label: 'Users & ACL',
      icon: Users,
      children: aclChildren
    })
  }

  // Pengaturan
  if (authStore.hasPermission('settings.manage') || authStore.hasRole('superadmin')) {
    items.push({ label: 'Pengaturan', icon: Settings, to: '/settings' })
  }

  return items
})

function isActive(path: string) {
  if (path === '/') return route.path === '/'
  return route.path.startsWith(path)
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
  <div class="flex h-screen overflow-hidden bg-[var(--color-background)]">
    <!-- Sidebar -->
    <aside
      :class="[
        'fixed inset-y-0 left-0 z-50 flex flex-col transition-all duration-300 ease-in-out',
        'bg-[var(--color-sidebar-bg)] text-[var(--color-sidebar-text)]',
        sidebarOpen ? 'w-64' : 'w-20',
        'lg:relative',
      ]"
    >
      <!-- Logo -->
      <div class="flex h-16 items-center gap-3 px-4 border-b border-white/10">
        <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-primary-600)] text-white font-bold text-lg shrink-0">
          P
        </div>
        <div v-if="sidebarOpen" class="overflow-hidden transition-all duration-300">
          <h1 class="text-white font-bold text-lg leading-tight truncate">Pasca CMS</h1>
          <p class="text-xs text-slate-400 truncate">Sistem Akademik</p>
        </div>
      </div>

      <!-- Menu -->
      <nav class="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        <template v-for="item in menuItems" :key="item.label">
          <!-- Simple link (no children) -->
          <router-link
            v-if="!item.children"
            :to="item.to!"
            :class="[
              'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
              isActive(item.to!)
                ? 'bg-[var(--color-sidebar-active)] text-white shadow-lg shadow-emerald-900/30'
                : 'text-slate-300 hover:bg-[var(--color-sidebar-hover)] hover:text-white',
            ]"
          >
            <component :is="item.icon" class="h-5 w-5 shrink-0" />
            <span v-if="sidebarOpen" class="truncate">{{ item.label }}</span>
          </router-link>

          <!-- Submenu parent -->
          <div v-else>
            <button
              @click="toggleSubmenu(item.label)"
              :class="[
                'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
                isSubmenuActive(item)
                  ? 'bg-[var(--color-sidebar-hover)] text-white'
                  : 'text-slate-300 hover:bg-[var(--color-sidebar-hover)] hover:text-white',
              ]"
            >
              <component :is="item.icon" class="h-5 w-5 shrink-0" />
              <span v-if="sidebarOpen" class="flex-1 text-left truncate">{{ item.label }}</span>
              <ChevronRight
                v-if="sidebarOpen"
                :class="[
                  'h-4 w-4 transition-transform duration-200',
                  openSubmenu === item.label ? 'rotate-90' : '',
                ]"
              />
            </button>

            <!-- Submenu children -->
            <div
              v-if="sidebarOpen && openSubmenu === item.label"
              class="mt-1 ml-4 space-y-0.5 border-l border-white/10 pl-3"
            >
              <router-link
                v-for="child in item.children"
                :key="child.to"
                :to="child.to"
                :class="[
                  'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-all duration-200',
                  isActive(child.to)
                    ? 'bg-[var(--color-sidebar-active)] text-white shadow-md shadow-emerald-900/20'
                    : 'text-slate-400 hover:bg-[var(--color-sidebar-hover)] hover:text-white',
                ]"
              >
                <component :is="child.icon" class="h-4 w-4 shrink-0" />
                <span class="truncate">{{ child.label }}</span>
              </router-link>
            </div>
          </div>
        </template>
      </nav>

      <!-- User Section -->
      <div class="border-t border-white/10 p-3">
        <div class="flex items-center gap-3 rounded-xl px-3 py-2.5">
          <div class="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-600 text-white text-sm font-bold shrink-0">
            {{ authStore.user?.name?.charAt(0)?.toUpperCase() || 'A' }}
          </div>
          <div v-if="sidebarOpen" class="flex-1 overflow-hidden">
            <p class="text-sm font-medium text-white truncate">{{ authStore.user?.name || 'User' }}</p>
            <p class="text-xs text-slate-400 truncate">{{ authStore.user?.roles?.[0]?.name || 'Role' }}</p>
          </div>
          <button
            v-if="sidebarOpen"
            @click="handleLogout"
            class="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
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
          <button class="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors">
            <Bell class="h-5 w-5" />
            <span class="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white">
              3
            </span>
          </button>

          <!-- User Menu -->
          <div class="hidden sm:flex items-center gap-2 rounded-xl px-3 py-1.5 hover:bg-slate-100 cursor-pointer transition-colors">
            <div class="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 text-sm font-bold">
              {{ authStore.user?.name?.charAt(0)?.toUpperCase() || 'A' }}
            </div>
            <span class="text-sm font-medium text-slate-700">{{ authStore.user?.name || 'User' }}</span>
            <ChevronDown class="h-4 w-4 text-slate-400" />
          </div>
        </div>
      </header>

      <!-- Page Content -->
      <main class="flex-1 overflow-y-auto p-4 lg:p-6">
        <slot />
      </main>
    </div>
  </div>
</template>

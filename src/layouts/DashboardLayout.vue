<script setup>
import { computed, ref, watch, onMounted, onBeforeUnmount } from 'vue'
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'
import { useEventWorkspaceStore } from '@/stores/eventWorkspace'
import { useAuthStore } from '@/stores/auth'
import TerraLogo from '@/components/common/TerraLogo.vue'
import {
  LayoutDashboard,
  Crown,
  Building2,
  CalendarDays,
  Plus,
  ArrowLeft,
  LogOut,
  Menu,
  X,
  User,
  SlidersHorizontal,
  GanttChartSquare,
  CheckSquare,
  Users,
  Ticket,
  UserCheck,
  QrCode,
  Wallet,
  Briefcase,
  BarChart3,
  FileText,
  Home,
  ExternalLink,
  Bell,
  ReceiptText,
  History
} from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()
const store = useEventWorkspaceStore()
const authStore = useAuthStore()

const sidebarOpen = ref(false)
const mainViewportRef = ref(null)

// Resizable & Collapsible Sidebar State (Desktop)
const MIN_SIDEBAR_WIDTH = 180
const MAX_SIDEBAR_WIDTH = 380
const COLLAPSED_WIDTH = 72
const savedWidth = Number(localStorage.getItem('terra_sidebar_width'))
const sidebarWidth = ref(
  savedWidth >= MIN_SIDEBAR_WIDTH && savedWidth <= MAX_SIDEBAR_WIDTH ? savedWidth : 240
)
const sidebarCollapsed = ref(localStorage.getItem('terra_sidebar_collapsed') === 'true')
const isResizingSidebar = ref(false)

const effectiveSidebarWidth = computed(() =>
  sidebarCollapsed.value ? COLLAPSED_WIDTH : sidebarWidth.value
)

const isEventWorkspace = computed(() => Boolean(route.params.eventId))
const isTimelinePage = computed(() => route.path.endsWith('/timeline'))
const currentEvent = computed(() => {
  if (!route.params.eventId) return null
  return store.events.find((e) => e.id === route.params.eventId) || store.activeEvent
})
const subscriptionBadgeLabel = computed(() => {
  if (currentEvent.value?.entitlement) {
    const ent = currentEvent.value.entitlement
    if (ent.trial?.is_trial) return `Pro Trial • ${ent.trial.days_remaining} hr`
    return `Paket ${ent.plan_name}`
  }
  return 'Free Plan • Per Event'
})

function hasModule(key) {
  if (!currentEvent.value) return false
  return currentEvent.value.enabled_modules.includes(key)
}

function hasPermission(perm) {
  if (!currentEvent.value) return false
  return store.hasPermission(currentEvent.value.id, perm)
}

function toggleSidebarCollapse() {
  sidebarCollapsed.value = !sidebarCollapsed.value
  localStorage.setItem('terra_sidebar_collapsed', String(sidebarCollapsed.value))
}

function startSidebarResize(event) {
  if (event.button !== 0) return
  event.preventDefault()
  isResizingSidebar.value = true
  const startX = event.clientX
  const startWidth = effectiveSidebarWidth.value

  function onMove(ev) {
    const nextWidth = startWidth + (ev.clientX - startX)
    if (nextWidth < 130) {
      sidebarCollapsed.value = true
    } else {
      sidebarCollapsed.value = false
      sidebarWidth.value = Math.min(MAX_SIDEBAR_WIDTH, Math.max(MIN_SIDEBAR_WIDTH, nextWidth))
    }
  }

  function onUp() {
    isResizingSidebar.value = false
    localStorage.setItem('terra_sidebar_width', String(sidebarWidth.value))
    localStorage.setItem('terra_sidebar_collapsed', String(sidebarCollapsed.value))
    window.removeEventListener('pointermove', onMove)
    window.removeEventListener('pointerup', onUp)
  }

  window.addEventListener('pointermove', onMove)
  window.addEventListener('pointerup', onUp)
}

function resetScroll() {
  window.scrollTo(0, 0)
  document.documentElement.scrollTop = 0
  document.body.scrollTop = 0
  if (mainViewportRef.value) {
    mainViewportRef.value.scrollTop = 0
  }
}

const unreadNotifCount = computed(() => (store.notifications || []).filter((n) => !n.is_read).length)

onMounted(async () => {
  resetScroll()
  authStore.fetchCurrentUser().catch(() => {})
  store.fetchNotifications().catch(() => {})
  if (route.params.eventId) {
    store.fetchEventWorkspace(route.params.eventId)
  } else {
    store.fetchOrganizerWorkspace()
  }
})
watch(() => route.params.eventId, (newId) => {
  if (newId) {
    store.fetchEventWorkspace(newId)
  }
})
watch(() => route.fullPath, () => {
  sidebarOpen.value = false
  resetScroll()
})

onBeforeUnmount(() => {
  isResizingSidebar.value = false
})

async function handleLogout() {
  await authStore.logout()
  router.push('/organizer/login')
}
</script>

<template>
  <div
    class="fixed inset-0 overflow-hidden bg-[#fafaf9] text-black font-sans selection:bg-[#72a5e4] selection:text-black"
    :class="isResizingSidebar ? 'select-none cursor-col-resize' : ''"
    :style="{ '--sidebar-w': `${effectiveSidebarWidth}px` }"
  >
    <!-- Backdrop for mobile drawer -->
    <div
      v-if="sidebarOpen"
      @click="sidebarOpen = false"
      class="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs lg:hidden transition-opacity"
    />

    <!-- Sidebar: Resizable & Collapsible on Desktop, Drawer on Mobile -->
    <aside
      :class="[
        sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        isResizingSidebar ? '' : 'transition-[transform,width] duration-200 ease-in-out',
        'w-64 lg:w-[var(--sidebar-w)]'
      ]"
      class="fixed inset-y-0 left-0 z-50 border-r border-black bg-[#fafaf9] flex flex-col"
    >
      <!-- Brand Header: Click TERRA Logo to Collapse/Expand with Pinwheel Spin -->
      <div
        class="pt-4 pb-3 shrink-0 flex items-center justify-between border-b border-black/10"
        :class="sidebarCollapsed ? 'lg:px-2 lg:justify-center px-4' : 'px-4'"
      >
        <div
          class="flex flex-col items-start gap-1.5 min-w-0"
          :class="sidebarCollapsed ? 'lg:items-center' : ''"
        >
          <button
            type="button"
            @click="toggleSidebarCollapse"
            class="group inline-flex items-center text-left cursor-pointer focus:outline-hidden"
            :title="sidebarCollapsed ? 'Klik logo untuk perlebar sidebar' : 'Klik logo untuk ciutkan sidebar'"
          >
            <TerraLogo
              size="md"
              :show-text="!sidebarCollapsed"
              :img-class="
                'transition-transform duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:scale-105 ' +
                (sidebarCollapsed ? 'rotate-[360deg]' : 'rotate-0')
              "
            />
          </button>
          <RouterLink
            v-if="!sidebarCollapsed"
            to="/dashboard"
            class="rounded-full border border-black bg-white px-3.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-black hover:bg-[#72a5e4] transition-colors"
          >
            STUDIO
          </RouterLink>
        </div>

        <!-- Mobile Close Button -->
        <button @click="sidebarOpen = false" class="lg:hidden p-1 rounded-lg text-black hover:bg-slate-100">
          <X class="h-5 w-5" />
        </button>
      </div>

      <!-- Navigation Content -->
      <div class="flex-1 overflow-y-auto px-2.5 py-3 space-y-4">
        <!-- Global Organization Level -->
        <template v-if="!isEventWorkspace">
          <div class="space-y-1">
            <p
              v-if="!sidebarCollapsed"
              class="px-2 text-[9px] font-bold uppercase tracking-wider text-slate-500 truncate"
            >
              MENU UTAMA
            </p>
            <nav class="space-y-1">
              <RouterLink
                to="/dashboard"
                exact-active-class="bg-[#72a5e4] border border-black text-black font-bold"
                class="flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs text-slate-800 hover:bg-black/5 transition-colors"
                :class="sidebarCollapsed ? 'lg:justify-center lg:px-0' : ''"
                title="Ringkasan"
              >
                <LayoutDashboard class="h-4 w-4 shrink-0 text-black" />
                <span v-if="!sidebarCollapsed" class="truncate">Ringkasan</span>
              </RouterLink>
              <RouterLink
                to="/dashboard/organizations"
                active-class="bg-[#72a5e4] border border-black text-black font-bold"
                class="flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs text-slate-800 hover:bg-black/5 transition-colors"
                :class="sidebarCollapsed ? 'lg:justify-center lg:px-0' : ''"
                title="Organisasi Saya"
              >
                <Building2 class="h-4 w-4 shrink-0 text-black" />
                <span v-if="!sidebarCollapsed" class="truncate">Organisasi Saya</span>
              </RouterLink>
              <RouterLink
                to="/dashboard/billing"
                active-class="bg-[#72a5e4] border border-black text-black font-bold"
                class="flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs text-slate-800 hover:bg-black/5 transition-colors"
                :class="sidebarCollapsed ? 'lg:justify-center lg:px-0' : ''"
                title="Billing & Bundle"
              >
                <Crown class="h-4 w-4 shrink-0 text-black" />
                <span v-if="!sidebarCollapsed" class="truncate">Billing &amp; Bundle</span>
              </RouterLink>
              <RouterLink
                to="/dashboard/notifications"
                active-class="bg-[#72a5e4] border border-black text-black font-bold"
                class="flex items-center justify-between gap-2.5 rounded-lg px-3 py-2 text-xs text-slate-800 hover:bg-black/5 transition-colors"
                :class="sidebarCollapsed ? 'lg:justify-center lg:px-0' : ''"
                title="Notifikasi"
              >
                <span class="flex items-center gap-2.5 min-w-0">
                  <Bell class="h-4 w-4 shrink-0 text-black" />
                  <span v-if="!sidebarCollapsed" class="truncate">Notifikasi</span>
                </span>
                <span
                  v-if="!sidebarCollapsed && unreadNotifCount > 0"
                  class="rounded-full border border-black bg-[#72a5e4] px-1.5 py-0.5 text-[10px] font-bold text-black leading-none"
                >
                  {{ unreadNotifCount }}
                </span>
              </RouterLink>
            </nav>
          </div>

          <div class="space-y-1">
            <p
              v-if="!sidebarCollapsed"
              class="px-2 text-[9px] font-bold uppercase tracking-wider text-slate-500 truncate"
            >
              KELOLA ACARA
            </p>
            <nav class="space-y-1">
              <RouterLink
                to="/dashboard/events"
                exact-active-class="bg-[#72a5e4] border border-black text-black font-bold"
                class="flex items-center justify-between rounded-lg px-3 py-2 text-xs text-slate-800 hover:bg-black/5 transition-colors"
                :class="sidebarCollapsed ? 'lg:justify-center lg:px-0' : ''"
                title="Acara Saya"
              >
                <div class="flex items-center gap-2.5 min-w-0">
                  <CalendarDays class="h-4 w-4 shrink-0 text-black" />
                  <span v-if="!sidebarCollapsed" class="truncate">Acara Saya</span>
                </div>
                <span v-if="!sidebarCollapsed" class="text-[11px] font-bold text-black shrink-0">
                  {{ store.events.length }}
                </span>
              </RouterLink>
              <RouterLink
                to="/dashboard/events/create"
                active-class="bg-[#72a5e4] border border-black text-black font-bold"
                class="flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs text-slate-800 hover:bg-black/5 transition-colors"
                :class="sidebarCollapsed ? 'lg:justify-center lg:px-0' : ''"
                title="Buat Acara Baru"
              >
                <Plus class="h-4 w-4 shrink-0 text-black" />
                <span v-if="!sidebarCollapsed" class="truncate">Buat Acara Baru</span>
              </RouterLink>
            </nav>
          </div>
        </template>

        <!-- Event Workspace Level -->
        <template v-else-if="currentEvent">
          <div class="space-y-2.5">
            <RouterLink
              to="/dashboard/events"
              class="flex items-center gap-1.5 px-2 py-1 text-[11px] font-medium text-slate-600 hover:text-black transition-colors rounded-lg hover:bg-black/5"
              :class="sidebarCollapsed ? 'lg:justify-center lg:px-0' : ''"
              title="Kembali ke Daftar Acara"
            >
              <ArrowLeft class="h-3.5 w-3.5 shrink-0" />
              <span v-if="!sidebarCollapsed" class="truncate">Kembali ke Daftar Acara</span>
            </RouterLink>

            <!-- Blue Workspace Box -->
            <div
              v-if="!sidebarCollapsed"
              class="rounded-xl border border-black bg-[#72a5e4] p-3 space-y-1.5 text-black"
            >
              <span class="text-[9px] font-bold uppercase tracking-wider text-slate-900 block">
                ACARA AKTIF
              </span>
              <p class="text-xs font-bold text-black leading-snug line-clamp-2">
                {{ currentEvent.title }}
              </p>
              <div>
                <span class="inline-block rounded-full border border-black bg-white px-2.5 py-0.5 text-[10px] font-bold text-black">
                  {{ currentEvent.publication_status || currentEvent.status || 'Published' }}
                </span>
              </div>
            </div>
          </div>

          <!-- PENGATURAN ACARA -->
          <div class="space-y-1">
            <p
              v-if="!sidebarCollapsed"
              class="px-2 text-[9px] font-bold uppercase tracking-wider text-slate-500 truncate"
            >
              PENGATURAN ACARA
            </p>
            <nav class="space-y-0.5">
              <RouterLink
                :to="`/dashboard/events/${currentEvent.id}`"
                exact-active-class="bg-[#72a5e4] border border-black text-black font-bold"
                class="flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 hover:bg-black/5 transition-colors"
                :class="sidebarCollapsed ? 'lg:justify-center lg:px-0 lg:py-2' : ''"
                title="Ringkasan Acara"
              >
                <Home class="h-3.5 w-3.5 shrink-0 text-black" />
                <span v-if="!sidebarCollapsed" class="truncate">Ringkasan Acara</span>
              </RouterLink>
              <RouterLink
                v-if="hasPermission('Edit Event')"
                :to="`/dashboard/events/${currentEvent.id}/profile`"
                active-class="bg-[#72a5e4] border border-black text-black font-bold"
                class="flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 hover:bg-black/5 transition-colors"
                :class="sidebarCollapsed ? 'lg:justify-center lg:px-0 lg:py-2' : ''"
                title="Profil & Info Acara"
              >
                <FileText class="h-3.5 w-3.5 shrink-0 text-black" />
                <span v-if="!sidebarCollapsed" class="truncate">Profil &amp; Info Acara</span>
              </RouterLink>
              <RouterLink
                v-if="hasPermission('Edit Event')"
                :to="`/dashboard/events/${currentEvent.id}/modules`"
                active-class="bg-[#72a5e4] border border-black text-black font-bold"
                class="flex items-center justify-between rounded-lg px-2.5 py-1.5 text-xs text-slate-800 hover:bg-black/5 transition-colors"
                :class="sidebarCollapsed ? 'lg:justify-center lg:px-0 lg:py-2' : ''"
                title="Fitur & Modul"
              >
                <div class="flex items-center gap-2.5 min-w-0">
                  <SlidersHorizontal class="h-3.5 w-3.5 shrink-0 text-black" />
                  <span v-if="!sidebarCollapsed" class="truncate">Fitur &amp; Modul</span>
                </div>
                <span v-if="!sidebarCollapsed" class="text-[10px] font-bold text-black shrink-0">
                  {{ currentEvent.enabled_modules.length }}
                </span>
              </RouterLink>
              <RouterLink
                v-if="hasPermission('Edit Event')"
                :to="`/dashboard/events/${currentEvent.id}/billing`"
                active-class="bg-[#72a5e4] border border-black text-black font-bold"
                class="flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 hover:bg-black/5 transition-colors"
                :class="sidebarCollapsed ? 'lg:justify-center lg:px-0 lg:py-2' : ''"
                title="Paket & Billing Event"
              >
                <Crown class="h-3.5 w-3.5 shrink-0 text-black" />
                <span v-if="!sidebarCollapsed" class="truncate">Paket &amp; Billing</span>
              </RouterLink>
            </nav>
          </div>

          <!-- JADWAL & PANITIA -->
          <div
            v-if="
              ((hasModule('timeline') || hasModule('tasks')) && hasPermission('Manage Timeline')) ||
              (hasModule('team') && hasPermission('Manage Team'))
            "
            class="space-y-1"
          >
            <p
              v-if="!sidebarCollapsed"
              class="px-2 text-[9px] font-bold uppercase tracking-wider text-slate-500 truncate"
            >
              JADWAL &amp; PANITIA
            </p>
            <nav class="space-y-0.5">
              <RouterLink
                v-if="hasModule('timeline') && hasPermission('Manage Timeline')"
                :to="`/dashboard/events/${currentEvent.id}/timeline`"
                active-class="bg-[#72a5e4] border border-black text-black font-bold"
                class="flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 hover:bg-black/5 transition-colors"
                :class="sidebarCollapsed ? 'lg:justify-center lg:px-0 lg:py-2' : ''"
                title="Timeline Acara"
              >
                <GanttChartSquare class="h-3.5 w-3.5 shrink-0 text-black" />
                <span v-if="!sidebarCollapsed" class="truncate">Timeline Acara</span>
              </RouterLink>
              <RouterLink
                v-if="hasModule('tasks') && hasPermission('Manage Timeline')"
                :to="`/dashboard/events/${currentEvent.id}/tasks`"
                active-class="bg-[#72a5e4] border border-black text-black font-bold"
                class="flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 hover:bg-black/5 transition-colors"
                :class="sidebarCollapsed ? 'lg:justify-center lg:px-0 lg:py-2' : ''"
                title="Daftar Tugas"
              >
                <CheckSquare class="h-3.5 w-3.5 shrink-0 text-black" />
                <span v-if="!sidebarCollapsed" class="truncate">Daftar Tugas</span>
              </RouterLink>
              <RouterLink
                v-if="hasModule('team') && hasPermission('Manage Team')"
                :to="`/dashboard/events/${currentEvent.id}/team`"
                active-class="bg-[#72a5e4] border border-black text-black font-bold"
                class="flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 hover:bg-black/5 transition-colors"
                :class="sidebarCollapsed ? 'lg:justify-center lg:px-0 lg:py-2' : ''"
                title="Tim & Panitia"
              >
                <Users class="h-3.5 w-3.5 shrink-0 text-black" />
                <span v-if="!sidebarCollapsed" class="truncate">Tim &amp; Panitia</span>
              </RouterLink>
            </nav>
          </div>

          <!-- TIKET & PESERTA -->
          <div
            v-if="
              (hasModule('ticketing') && hasPermission('Manage Tickets')) ||
              (hasModule('participants') && hasPermission('View Participants')) ||
              (hasModule('check_in') && hasPermission('Manage Check-in'))
            "
            class="space-y-1"
          >
            <p
              v-if="!sidebarCollapsed"
              class="px-2 text-[9px] font-bold uppercase tracking-wider text-slate-500 truncate"
            >
              TIKET &amp; PESERTA
            </p>
            <nav class="space-y-0.5">
              <RouterLink
                v-if="hasModule('ticketing') && hasPermission('Manage Tickets')"
                :to="`/dashboard/events/${currentEvent.id}/tickets`"
                active-class="bg-[#72a5e4] border border-black text-black font-bold"
                class="flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 hover:bg-black/5 transition-colors"
                :class="sidebarCollapsed ? 'lg:justify-center lg:px-0 lg:py-2' : ''"
                title="Jenis Tiket"
              >
                <Ticket class="h-3.5 w-3.5 shrink-0 text-black" />
                <span v-if="!sidebarCollapsed" class="truncate">Jenis Tiket</span>
              </RouterLink>
              <RouterLink
                v-if="hasModule('ticketing') && hasPermission('Manage Tickets')"
                :to="`/dashboard/events/${currentEvent.id}/orders`"
                active-class="bg-[#72a5e4] border border-black text-black font-bold"
                class="flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 hover:bg-black/5 transition-colors"
                :class="sidebarCollapsed ? 'lg:justify-center lg:px-0 lg:py-2' : ''"
                title="Verifikasi Order"
              >
                <ReceiptText class="h-3.5 w-3.5 shrink-0 text-black" />
                <span v-if="!sidebarCollapsed" class="truncate">Verifikasi Order</span>
              </RouterLink>
              <RouterLink
                v-if="hasModule('participants') && hasPermission('View Participants')"
                :to="`/dashboard/events/${currentEvent.id}/participants`"
                active-class="bg-[#72a5e4] border border-black text-black font-bold"
                class="flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 hover:bg-black/5 transition-colors"
                :class="sidebarCollapsed ? 'lg:justify-center lg:px-0 lg:py-2' : ''"
                title="Daftar Peserta"
              >
                <UserCheck class="h-3.5 w-3.5 shrink-0 text-black" />
                <span v-if="!sidebarCollapsed" class="truncate">Daftar Peserta</span>
              </RouterLink>
              <RouterLink
                v-if="hasModule('check_in') && hasPermission('Manage Check-in')"
                :to="`/dashboard/events/${currentEvent.id}/check-in`"
                active-class="bg-[#72a5e4] border border-black text-black font-bold"
                class="flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 hover:bg-black/5 transition-colors"
                :class="sidebarCollapsed ? 'lg:justify-center lg:px-0 lg:py-2' : ''"
                title="Scan Tiket (Check-in)"
              >
                <QrCode class="h-3.5 w-3.5 shrink-0 text-black" />
                <span v-if="!sidebarCollapsed" class="truncate">Scan Tiket (Check-in)</span>
              </RouterLink>
            </nav>
          </div>

          <!-- KEUANGAN & LOGISTIK -->
          <div
            v-if="
              (hasModule('finance') && hasPermission('View Finance')) ||
              hasModule('vendors') ||
              hasModule('sponsors') ||
              hasModule('documents') ||
              hasModule('feedback')
            "
            class="space-y-1"
          >
            <p
              v-if="!sidebarCollapsed"
              class="px-2 text-[9px] font-bold uppercase tracking-wider text-slate-500 truncate"
            >
              KEUANGAN &amp; LOGISTIK
            </p>
            <nav class="space-y-0.5">
              <RouterLink
                v-if="hasModule('finance') && hasPermission('View Finance')"
                :to="`/dashboard/events/${currentEvent.id}/finance`"
                active-class="bg-[#72a5e4] border border-black text-black font-bold"
                class="flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 hover:bg-black/5 transition-colors"
                :class="sidebarCollapsed ? 'lg:justify-center lg:px-0 lg:py-2' : ''"
                title="Keuangan & Penjualan"
              >
                <Wallet class="h-3.5 w-3.5 shrink-0 text-black" />
                <span v-if="!sidebarCollapsed" class="truncate">Keuangan &amp; Penjualan</span>
              </RouterLink>
              <RouterLink
                v-if="hasModule('vendors') || hasModule('sponsors') || hasModule('documents') || hasModule('feedback')"
                :to="`/dashboard/events/${currentEvent.id}/operations`"
                active-class="bg-[#72a5e4] border border-black text-black font-bold"
                class="flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 hover:bg-black/5 transition-colors"
                :class="sidebarCollapsed ? 'lg:justify-center lg:px-0 lg:py-2' : ''"
                title="Vendor, Sponsor & Dokumen"
              >
                <Briefcase class="h-3.5 w-3.5 shrink-0 text-black" />
                <span v-if="!sidebarCollapsed" class="truncate">Vendor, Sponsor &amp; Dokumen</span>
              </RouterLink>
            </nav>
          </div>

          <!-- LAPORAN -->
          <div v-if="hasModule('reports') || hasPermission('View Event')" class="space-y-1">
            <p
              v-if="!sidebarCollapsed"
              class="px-2 text-[9px] font-bold uppercase tracking-wider text-slate-500 truncate"
            >
              LAPORAN
            </p>
            <nav class="space-y-0.5">
              <RouterLink
                v-if="hasModule('reports')"
                :to="`/dashboard/events/${currentEvent.id}/reports`"
                active-class="bg-[#72a5e4] border border-black text-black font-bold"
                class="flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 hover:bg-black/5 transition-colors"
                :class="sidebarCollapsed ? 'lg:justify-center lg:px-0 lg:py-2' : ''"
                title="Laporan & Statistik"
              >
                <BarChart3 class="h-3.5 w-3.5 shrink-0 text-black" />
                <span v-if="!sidebarCollapsed" class="truncate">Laporan &amp; Statistik</span>
              </RouterLink>
              <RouterLink
                v-if="hasPermission('View Event')"
                :to="`/dashboard/events/${currentEvent.id}/activity-logs`"
                active-class="bg-[#72a5e4] border border-black text-black font-bold"
                class="flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 hover:bg-black/5 transition-colors"
                :class="sidebarCollapsed ? 'lg:justify-center lg:px-0 lg:py-2' : ''"
                title="Log Aktivitas"
              >
                <History class="h-3.5 w-3.5 shrink-0 text-black" />
                <span v-if="!sidebarCollapsed" class="truncate">Log Aktivitas</span>
              </RouterLink>
            </nav>
          </div>
        </template>
      </div>

      <!-- Sidebar Bottom Action -->
      <div class="p-3 shrink-0 border-t border-black/10">
        <RouterLink
          to="/"
          class="flex items-center justify-center gap-2 rounded-full border border-black bg-white px-3 py-2 text-xs font-bold text-black hover:bg-slate-100 transition-colors"
          title="Lihat Halaman Publik"
        >
          <ExternalLink v-if="sidebarCollapsed" class="h-3.5 w-3.5 shrink-0" />
          <template v-else>
            <span class="truncate">Lihat Halaman Publik</span>
            <span>↗</span>
          </template>
        </RouterLink>
      </div>

      <!-- Drag-to-Resize Handle on Right Border (Desktop) -->
      <div
        @pointerdown="startSidebarResize"
        @dblclick="toggleSidebarCollapse"
        class="hidden lg:block absolute top-0 bottom-0 -right-1 w-2.5 cursor-col-resize z-50 group"
        title="Geser untuk ubah lebar sidebar (klik 2x untuk collapse)"
      >
        <div
          class="mx-auto h-full w-[2px] transition-colors"
          :class="isResizingSidebar ? 'bg-[#72a5e4]' : 'bg-transparent group-hover:bg-[#72a5e4]'"
        />
      </div>
    </aside>

    <!-- Top Navigation Bar -->
    <header
      :class="isResizingSidebar ? '' : 'transition-[left] duration-200 ease-in-out'"
      class="fixed top-0 right-0 left-0 lg:left-[var(--sidebar-w)] h-16 border-b border-black bg-[#fafaf9]/95 z-30 flex items-center justify-between px-4 sm:px-6"
    >
      <div class="flex items-center gap-3 min-w-0">
        <button
          @click="sidebarOpen = true"
          class="lg:hidden rounded-lg border border-black p-1.5 text-black hover:bg-slate-100 shrink-0"
        >
          <Menu class="h-5 w-5" />
        </button>

        <div class="flex items-center gap-2 text-xs text-slate-500 min-w-0">
          <span class="shrink-0">Penyelenggara</span>
          <span class="shrink-0">/</span>
          <span class="text-slate-700 font-medium truncate">
            {{ isEventWorkspace && currentEvent ? currentEvent.title : 'Ruang Kerja Acara' }}
          </span>
        </div>
      </div>

      <!-- User Profile, Mobile Quick QR Scanner Shortcut & Logout -->
      <div class="flex items-center gap-2 sm:gap-3 shrink-0">
        <RouterLink
          v-if="isEventWorkspace && currentEvent && hasModule('check_in')"
          :to="`/dashboard/events/${currentEvent.id}/check-in`"
          class="lg:hidden inline-flex items-center gap-1 rounded-full border border-black bg-[#72a5e4] px-3 py-1 text-[11px] font-black text-black shadow-[2px_2px_0px_#000]"
        >
          <QrCode class="h-3.5 w-3.5" />
          <span>Scan QR</span>
        </RouterLink>
        <span
          class="hidden md:inline-flex items-center gap-1 rounded-full border border-black bg-[#72a5e4] px-3 py-1 text-[10px] font-bold text-black"
        >
          {{ subscriptionBadgeLabel }}
        </span>
        <div class="text-left hidden sm:block">
          <p class="text-xs font-bold text-black">{{ authStore.user?.full_name || authStore.user?.email || 'Organizer' }}</p>
          <p class="text-[11px] text-slate-500 truncate max-w-[180px]">{{ authStore.user?.email || '' }}</p>
        </div>
        <button class="p-1 text-black hover:text-slate-600">
          <User class="h-4 w-4" />
        </button>
        <button
          @click="handleLogout"
          class="p-1 text-black hover:text-rose-600 cursor-pointer"
          title="Keluar dari Studio"
        >
          <LogOut class="h-4 w-4" />
        </button>
      </div>
    </header>

    <!-- Main Content Viewport: Full-Width Across All Sidebar Tabs -->
    <main
      ref="mainViewportRef"
      class="fixed top-16 bottom-0 right-0 left-0 lg:left-[var(--sidebar-w)] overflow-x-hidden bg-[#fafaf9] bg-grid-paper"
      :class="[
        isResizingSidebar ? '' : 'transition-[left] duration-200 ease-in-out',
        isTimelinePage ? 'p-0 overflow-y-hidden flex flex-col' : 'p-4 sm:p-6 overflow-y-auto'
      ]"
    >
      <div
        class="w-full"
        :class="isTimelinePage ? 'flex-1 min-h-0 flex flex-col' : 'pb-12'"
      >
        <RouterView v-slot="{ Component, route: currentRoute }">
          <Transition name="page-fade" mode="out-in">
            <component :is="Component" :key="currentRoute.fullPath" />
          </Transition>
        </RouterView>
      </div>
    </main>
  </div>
</template>

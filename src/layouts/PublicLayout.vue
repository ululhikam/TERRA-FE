<script setup>
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import { RouterLink, RouterView, useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import TerraLogo from '@/components/common/TerraLogo.vue'
import { LogOut, Menu, X, ArrowUpRight, ArrowUp } from 'lucide-vue-next'

const authStore = useAuthStore()
const router = useRouter()
const route = useRoute()
const mobileOpen = ref(false)
const isScrolled = ref(false)
const bubbleOpen = ref(false)
const floatingNavRef = ref(null)

function handleScroll() {
  const scrolled = window.scrollY > 72
  isScrolled.value = scrolled
  if (!scrolled) {
    bubbleOpen.value = false
  }
}

function handleDocumentClick(e) {
  if (!bubbleOpen.value) return
  if (floatingNavRef.value && !floatingNavRef.value.contains(e.target)) {
    bubbleOpen.value = false
  }
}

function handleKeydown(e) {
  if (e.key === 'Escape') {
    bubbleOpen.value = false
    mobileOpen.value = false
  }
}

watch(
  () => route.fullPath,
  () => {
    bubbleOpen.value = false
    mobileOpen.value = false
  }
)

onMounted(() => {
  handleScroll()
  window.addEventListener('scroll', handleScroll, { passive: true })
  document.addEventListener('click', handleDocumentClick)
  document.addEventListener('keydown', handleKeydown)
})

onBeforeUnmount(() => {
  window.removeEventListener('scroll', handleScroll)
  document.removeEventListener('click', handleDocumentClick)
  document.removeEventListener('keydown', handleKeydown)
})

async function handleLogout() {
  await authStore.logout()
  mobileOpen.value = false
  bubbleOpen.value = false
  router.push('/')
}

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}
</script>

<template>
  <div class="min-h-screen flex flex-col bg-[#fafaf9] text-slate-900 bg-grid-paper selection:bg-[#72a5e4] selection:text-black overflow-x-clip">
    <!-- Top Navbar: Full bar at top -> collapses into centered Logo pill on scroll -> click logo pops out Bubble Navbar -->
    <header class="sticky top-0 z-50 h-16 pointer-events-none">
      <!-- Expanded Full Navbar (visible at top of page) -->
      <div
        class="border-b border-black bg-[#fafaf9]/95 backdrop-blur-xs transition-all duration-300 ease-out"
        :class="
          isScrolled
            ? 'opacity-0 -translate-y-4 pointer-events-none'
            : 'opacity-100 translate-y-0 pointer-events-auto'
        "
      >
        <div class="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6 lg:px-8 border-x border-black/15">
          <!-- Left Brand Logo: TERRA -->
          <RouterLink to="/" class="flex items-center shrink-0">
            <TerraLogo size="md" />
          </RouterLink>

          <!-- Center Navigation Pills -->
          <nav class="hidden md:flex items-center gap-2 lg:gap-2.5">
            <a
              href="/#about"
              class="luxury-pill rounded-full border border-black bg-white px-4 py-1.5 text-xs font-semibold text-black"
            >
              About
            </a>
            <a
              href="/#pricing"
              class="luxury-pill rounded-full border border-black bg-white px-4 py-1.5 text-xs font-semibold text-black"
            >
              Pricing
            </a>
            <a
              href="/#how-it-works"
              class="luxury-pill rounded-full border border-black bg-white px-4 py-1.5 text-xs font-semibold text-black"
            >
              Cara Kerja
            </a>
            <RouterLink
              to="/events"
              class="luxury-pill rounded-full border border-black px-4 py-1.5 text-xs font-semibold"
              :class="route.path === '/events' ? 'bg-black text-white' : 'bg-white text-black'"
            >
              Jelajahi Event
            </RouterLink>
          </nav>

          <!-- Right Action Buttons -->
          <div class="hidden md:flex items-center gap-2.5 shrink-0">
            <template v-if="!authStore.isAuthenticated">
              <RouterLink
                to="/login"
                class="luxury-pill rounded-full border border-black bg-[#72a5e4] px-6 py-1.5 text-xs font-bold text-black"
              >
                Login
              </RouterLink>
            </template>

            <template v-else-if="authStore.isCustomer">
              <RouterLink
                to="/my-tickets"
                class="luxury-pill rounded-full border border-black bg-[#72a5e4] px-4 py-1.5 text-xs font-bold text-black"
              >
                Tiket Saya
              </RouterLink>
              <RouterLink
                to="/profile"
                class="luxury-pill rounded-full border border-black bg-white px-4 py-1.5 text-xs font-semibold text-black"
              >
                {{ authStore.user?.full_name || 'Nadia Putri' }} (Peserta)
              </RouterLink>
              <button
                @click="handleLogout"
                class="p-1.5 text-black hover:text-rose-600 transition-colors cursor-pointer"
                title="Keluar"
              >
                <LogOut class="h-4 w-4" />
              </button>
            </template>

            <template v-else-if="authStore.isOrganizer">
              <RouterLink
                to="/dashboard"
                class="luxury-pill rounded-full border border-black bg-[#72a5e4] px-5 py-1.5 text-xs font-bold text-black"
              >
                Dashboard
              </RouterLink>
              <RouterLink
                to="/dashboard"
                class="luxury-pill rounded-full border border-black bg-white px-5 py-1.5 text-xs font-semibold text-black"
              >
                {{ authStore.user?.full_name || 'Hikam Pratama' }}
              </RouterLink>
              <button
                @click="handleLogout"
                class="p-1.5 text-black hover:text-rose-600 transition-colors cursor-pointer"
                title="Keluar"
              >
                <LogOut class="h-4 w-4" />
              </button>
            </template>

            <template v-else>
              <RouterLink
                to="/admin"
                class="luxury-pill rounded-full border border-black bg-black px-4 py-1.5 text-xs font-bold text-white"
              >
                Admin Panel
              </RouterLink>
              <button
                @click="handleLogout"
                class="p-1.5 text-black hover:text-rose-600 transition-colors cursor-pointer"
                title="Keluar"
              >
                <LogOut class="h-4 w-4" />
              </button>
            </template>
          </div>

          <!-- Mobile Menu Button -->
          <button
            @click="mobileOpen = !mobileOpen"
            class="md:hidden rounded-lg border border-black p-2 text-black hover:bg-slate-100"
            aria-label="Toggle Menu"
          >
            <Menu v-if="!mobileOpen" class="h-5 w-5" />
            <X v-else class="h-5 w-5" />
          </button>
        </div>

        <!-- Mobile Dropdown Menu (top bar mode) -->
        <div v-if="mobileOpen && !isScrolled" class="border-b border-black bg-[#fafaf9] p-4 md:hidden flex flex-col gap-2.5">
          <div class="grid grid-cols-2 gap-2">
            <a
              href="/#about"
              @click="mobileOpen = false"
              class="rounded-full border border-black bg-white py-2 text-center text-xs font-semibold text-black"
            >
              About
            </a>
            <a
              href="/#pricing"
              @click="mobileOpen = false"
              class="rounded-full border border-black bg-white py-2 text-center text-xs font-semibold text-black"
            >
              Pricing
            </a>
            <a
              href="/#how-it-works"
              @click="mobileOpen = false"
              class="rounded-full border border-black bg-white py-2 text-center text-xs font-semibold text-black"
            >
              Cara Kerja
            </a>
            <RouterLink
              to="/events"
              @click="mobileOpen = false"
              class="rounded-full border border-black py-2 text-center text-xs font-semibold"
              :class="route.path === '/events' ? 'bg-black text-white' : 'bg-white text-black'"
            >
              Jelajahi Event
            </RouterLink>
          </div>

          <div class="pt-2 border-t border-black/15">
            <RouterLink
              v-if="!authStore.isAuthenticated"
              to="/login"
              @click="mobileOpen = false"
              class="block w-full text-center rounded-full border border-black bg-[#72a5e4] py-2.5 text-xs font-bold text-black"
            >
              Login
            </RouterLink>
            <div v-else class="flex flex-col gap-2">
              <RouterLink
                v-if="authStore.isCustomer"
                to="/my-tickets"
                @click="mobileOpen = false"
                class="block w-full text-center rounded-full border border-black bg-[#72a5e4] py-2 text-xs font-bold text-black"
              >
                Tiket Saya
              </RouterLink>
              <RouterLink
                v-if="authStore.isOrganizer"
                to="/dashboard"
                @click="mobileOpen = false"
                class="block w-full text-center rounded-full border border-black bg-[#72a5e4] py-2 text-xs font-bold text-black"
              >
                Dashboard Studio
              </RouterLink>
              <button
                @click="handleLogout"
                class="w-full text-center rounded-full border border-black bg-white py-2 text-xs font-semibold text-black"
              >
                Keluar
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Scrolled Centered Logo Pill + Expandable Floating Bubble Navbar -->
      <div
        ref="floatingNavRef"
        class="fixed top-3 inset-x-0 z-50 flex flex-col items-center px-3 transition-all duration-300 ease-out"
        :class="
          isScrolled
            ? 'opacity-100 translate-y-0 scale-100 pointer-events-none'
            : 'opacity-0 -translate-y-4 scale-90 pointer-events-none'
        "
      >
        <!-- Centered Logo Button Only -->
        <button
          type="button"
          @click.stop="bubbleOpen = !bubbleOpen"
          :aria-expanded="bubbleOpen"
          aria-label="Toggle Menu Navigasi TERRA"
          class="group relative flex h-12 w-12 items-center justify-center rounded-full border-2 border-black bg-[#fafaf9]/95 backdrop-blur-md shadow-[3px_3px_0px_#000] hover:shadow-[4px_4px_0px_#000] hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 cursor-pointer"
          :class="[
            isScrolled ? 'pointer-events-auto' : 'pointer-events-none',
            bubbleOpen ? 'bg-[#72a5e4] ring-2 ring-black/10' : ''
          ]"
        >
          <img
            src="/terra-logo.png"
            alt="TERRA"
            class="h-7 w-7 object-contain transition-transform duration-300 group-hover:scale-110"
            :class="bubbleOpen ? 'rotate-45 scale-95' : ''"
          />
        </button>

        <!-- Pop-out Bubble Navbar Menu -->
        <Transition name="bubble-pop">
          <div
            v-if="isScrolled && bubbleOpen"
            class="pointer-events-auto mt-3 w-auto max-w-[94vw] rounded-3xl md:rounded-full border-2 border-black bg-[#fafaf9]/98 backdrop-blur-md px-3 py-2.5 sm:px-4 sm:py-2 shadow-[5px_5px_0px_#000]"
          >
            <nav class="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2">
              <RouterLink
                to="/"
                @click="bubbleOpen = false"
                class="luxury-pill rounded-full border border-black px-3.5 py-1.5 text-xs font-bold transition-colors"
                :class="route.path === '/' ? 'bg-black text-white' : 'bg-white text-black'"
              >
                Beranda
              </RouterLink>
              <a
                href="/#about"
                @click="bubbleOpen = false"
                class="luxury-pill rounded-full border border-black bg-white px-3.5 py-1.5 text-xs font-semibold text-black"
              >
                About
              </a>
              <a
                href="/#pricing"
                @click="bubbleOpen = false"
                class="luxury-pill rounded-full border border-black bg-white px-3.5 py-1.5 text-xs font-semibold text-black"
              >
                Pricing
              </a>
              <a
                href="/#how-it-works"
                @click="bubbleOpen = false"
                class="luxury-pill rounded-full border border-black bg-white px-3.5 py-1.5 text-xs font-semibold text-black"
              >
                Cara Kerja
              </a>
              <RouterLink
                to="/events"
                @click="bubbleOpen = false"
                class="luxury-pill rounded-full border border-black px-3.5 py-1.5 text-xs font-semibold"
                :class="route.path === '/events' ? 'bg-black text-white' : 'bg-white text-black'"
              >
                Jelajahi Event
              </RouterLink>

              <span class="hidden sm:inline-block h-4 w-px bg-black/20 mx-0.5" />

              <template v-if="!authStore.isAuthenticated">
                <RouterLink
                  to="/login"
                  @click="bubbleOpen = false"
                  class="luxury-pill rounded-full border border-black bg-[#72a5e4] px-4 py-1.5 text-xs font-bold text-black"
                >
                  Login
                </RouterLink>
              </template>

              <template v-else-if="authStore.isCustomer">
                <RouterLink
                  to="/my-tickets"
                  @click="bubbleOpen = false"
                  class="luxury-pill rounded-full border border-black bg-[#72a5e4] px-3.5 py-1.5 text-xs font-bold text-black"
                >
                  Tiket Saya
                </RouterLink>
                <RouterLink
                  to="/profile"
                  @click="bubbleOpen = false"
                  class="luxury-pill rounded-full border border-black bg-white px-3.5 py-1.5 text-xs font-semibold text-black"
                >
                  Profil
                </RouterLink>
                <button
                  @click="handleLogout"
                  class="rounded-full border border-black bg-white p-1.5 text-black hover:bg-rose-50 hover:text-rose-600 transition-colors cursor-pointer"
                  title="Keluar"
                >
                  <LogOut class="h-3.5 w-3.5" />
                </button>
              </template>

              <template v-else-if="authStore.isOrganizer">
                <RouterLink
                  to="/dashboard"
                  @click="bubbleOpen = false"
                  class="luxury-pill rounded-full border border-black bg-[#72a5e4] px-3.5 py-1.5 text-xs font-bold text-black"
                >
                  Dashboard
                </RouterLink>
                <button
                  @click="handleLogout"
                  class="rounded-full border border-black bg-white p-1.5 text-black hover:bg-rose-50 hover:text-rose-600 transition-colors cursor-pointer"
                  title="Keluar"
                >
                  <LogOut class="h-3.5 w-3.5" />
                </button>
              </template>

              <template v-else>
                <RouterLink
                  to="/admin"
                  @click="bubbleOpen = false"
                  class="luxury-pill rounded-full border border-black bg-black px-3.5 py-1.5 text-xs font-bold text-white"
                >
                  Admin Panel
                </RouterLink>
                <button
                  @click="handleLogout"
                  class="rounded-full border border-black bg-white p-1.5 text-black hover:bg-rose-50 hover:text-rose-600 transition-colors cursor-pointer"
                  title="Keluar"
                >
                  <LogOut class="h-3.5 w-3.5" />
                </button>
              </template>
            </nav>
          </div>
        </Transition>
      </div>
    </header>

    <!-- Main Content Area -->
    <main class="flex-1">
      <RouterView />
    </main>

    <!-- =================================================================== -->
    <!-- LUXURY NEO-BRUTALIST FOOTER (CONNECTED TO SIDE RIBBONS & RAILS)     -->
    <!-- =================================================================== -->
    <footer
      class="relative overflow-hidden z-20"
      :class="route.path === '/' ? 'mt-0' : 'mt-12 border-t border-black'"
    >
      <!-- Connected Left & Right Ribbon Terminals Running Full-Height to Very Bottom Edge of Footer -->
      <svg
        v-if="route.path === '/'"
        class="pointer-events-none block absolute inset-x-0 top-0 w-full h-full z-0"
        viewBox="0 0 1440 480"
        preserveAspectRatio="none"
        fill="none"
      >
        <!-- Left ribbon starting at x=16..48,y=0 and sweeping continuously down to bottom edge (y=480) -->
        <path
          d="M 16,0 C 16,120 42,230 22,340 C 14,395 28,440 56,480 L 92,480 C 60,440 46,395 54,340 C 74,230 48,120 48,0 Z"
          fill="#fafaf9"
          stroke="#000000"
          stroke-width="2.5"
          vector-effect="non-scaling-stroke"
        />
        <line x1="17" y1="0" x2="47" y2="0" stroke="#fafaf9" stroke-width="4" vector-effect="non-scaling-stroke" />
        <path
          d="M 64,0 C 82,120 48,240 72,355 C 86,415 104,452 126,480"
          stroke="#000000"
          stroke-width="1.8"
          stroke-dasharray="5 5"
          vector-effect="non-scaling-stroke"
        />
        <!-- Right ribbon starting at x=1392..1424,y=0 and sweeping continuously down to bottom edge (y=480) -->
        <path
          d="M 1424,0 C 1424,120 1398,230 1418,340 C 1426,395 1412,440 1384,480 L 1348,480 C 1380,440 1394,395 1386,340 C 1366,230 1392,120 1392,0 Z"
          fill="#fafaf9"
          stroke="#000000"
          stroke-width="2.5"
          vector-effect="non-scaling-stroke"
        />
        <line x1="1393" y1="0" x2="1423" y2="0" stroke="#fafaf9" stroke-width="4" vector-effect="non-scaling-stroke" />
        <path
          d="M 1376,0 C 1358,120 1392,240 1368,355 C 1354,415 1336,452 1314,480"
          stroke="#000000"
          stroke-width="1.8"
          stroke-dasharray="5 5"
          vector-effect="non-scaling-stroke"
        />
      </svg>

      <div class="mx-auto max-w-5xl px-8 sm:px-10 lg:px-8 pt-12 pb-10 border-x border-black/15 relative z-10 space-y-10">
        <!-- Interlocking Stepped Pixel Bridges at Top of Footer -->
        <div v-if="route.path === '/'" class="flex items-start justify-between absolute top-0 left-8 right-8 pointer-events-none">
          <div class="flex items-start">
            <div class="h-4 w-12 bg-[#72a5e4] border-b border-x border-black" />
            <div class="h-2.5 w-8 bg-black" />
          </div>
          <div class="flex items-start">
            <div class="h-2.5 w-8 bg-black" />
            <div class="h-4 w-12 bg-[#72a5e4] border-b border-x border-black" />
          </div>
        </div>

        <span class="pointer-events-none hidden sm:block absolute top-2 -left-[5px] text-xs font-mono text-black leading-none">+</span>
        <span class="pointer-events-none hidden sm:block absolute top-2 -right-[5px] text-xs font-mono text-black leading-none">+</span>

        <!-- Top Footer Showcase CTA Card -->
        <div class="luxury-card relative rounded-2xl border-2 border-black bg-white p-6 sm:p-8 shadow-[5px_5px_0px_#000] overflow-hidden">
          <!-- Corner Pixel Accents -->
          <div class="absolute top-0 left-0 flex">
            <div class="h-2.5 w-6 bg-[#72a5e4] border-b border-r border-black" />
          </div>
          <div class="absolute bottom-0 right-0 flex">
            <div class="h-2.5 w-6 bg-black" />
          </div>

          <div class="flex flex-col items-center text-center gap-5">
            <div class="flex flex-col sm:flex-row items-center gap-3 sm:gap-4">
              <!-- Bespoke 3D Ticket Star Emblem -->
              <div class="h-12 w-12 rounded-2xl border-2 border-black bg-[#72a5e4] shadow-[3px_3px_0px_#000] flex items-center justify-center shrink-0">
                <svg class="h-6 w-6" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2L14.8 9.2L22 12L14.8 14.8L12 22L9.2 14.8L2 12L9.2 9.2L12 2Z" fill="#fff" stroke="#000" stroke-width="1.8" stroke-linejoin="round" />
                </svg>
              </div>
              <div class="space-y-1">
                <span class="text-[9px] font-bold uppercase tracking-widest text-slate-500 block">
                  READY TO LAUNCH OR ATTEND?
                </span>
                <h3 class="text-lg sm:text-xl font-black tracking-tight text-black font-sans">
                  Siap Berburu Tiket Konser atau Mengelola Event <span class="font-editorial font-normal">Skala Besar?</span>
                </h3>
              </div>
            </div>

            <div class="flex flex-wrap items-center justify-center gap-3">
              <RouterLink
                to="/events"
                class="luxury-pill rounded-full border border-black bg-[#72a5e4] px-6 py-2.5 text-xs font-bold text-black"
              >
                Jelajahi Event &rarr;
              </RouterLink>
              <RouterLink
                to="/organizer/login"
                class="luxury-pill rounded-full bg-black px-6 py-2.5 text-xs font-bold text-white"
              >
                Buka Organizer Studio
              </RouterLink>
            </div>
          </div>
        </div>

        <!-- Centered Architectural Footer Brand & Navigation Grid -->
        <div class="flex flex-col items-center text-center space-y-10 pb-10 border-b border-black">
          <!-- Brand Identity & Live Ecosystem Status (Centered cleanly away from side lines) -->
          <div class="flex flex-col items-center text-center space-y-4 max-w-md mx-auto">
            <div class="flex items-center justify-center gap-3">
              <TerraLogo size="xl" />
              <span class="rounded-full border border-black bg-[#72a5e4] px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-black shadow-[2px_2px_0px_#000]">
                v2.6
              </span>
            </div>

            <p class="text-xs text-slate-700 leading-relaxed font-editorial">
              Platform terpadu untuk manajemen event modular 13-engine dan marketplace tiket QR publik dengan validasi atomik.
            </p>

            <!-- Live Status Pill -->
            <div class="inline-flex items-center gap-2 rounded-full border border-black bg-white px-3.5 py-1 text-[10px] font-bold text-black">
              <span class="h-2 w-2 rounded-full bg-[#72a5e4] border border-black animate-pulse" />
              <span>All 13 Modular Engines Operational</span>
            </div>
          </div>

          <!-- 3-Column Centered Navigation Links -->
          <div class="w-full grid grid-cols-1 sm:grid-cols-3 gap-8 pt-2">
            <!-- Col 1: Marketplace Peserta -->
            <div class="flex flex-col items-center space-y-3">
              <h4 class="text-[10px] font-black uppercase tracking-wider text-black inline-flex items-center gap-1.5">
                <span class="h-1.5 w-1.5 bg-[#72a5e4] border border-black inline-block" />
                MARKETPLACE PESERTA
              </h4>
              <ul class="space-y-2.5 text-xs text-slate-700 font-medium">
                <li>
                  <RouterLink to="/events" class="inline-flex items-center gap-1 hover:text-black">
                    <span>Jelajahi Event</span>
                    <ArrowUpRight class="h-3 w-3 opacity-60" />
                  </RouterLink>
                </li>
                <li>
                  <RouterLink to="/login" class="inline-flex items-center gap-1 hover:text-black">
                    <span>Masuk Peserta</span>
                    <ArrowUpRight class="h-3 w-3 opacity-60" />
                  </RouterLink>
                </li>
                <li>
                  <RouterLink to="/register" class="inline-flex items-center gap-1 hover:text-black">
                    <span>Daftar Peserta</span>
                    <ArrowUpRight class="h-3 w-3 opacity-60" />
                  </RouterLink>
                </li>
                <li>
                  <RouterLink to="/my-tickets" class="inline-flex items-center gap-1 hover:text-black">
                    <span>Tiket Saya</span>
                    <ArrowUpRight class="h-3 w-3 opacity-60" />
                  </RouterLink>
                </li>
              </ul>
            </div>

            <!-- Col 2: Penyelenggara (Organizer) -->
            <div class="flex flex-col items-center space-y-3 sm:border-x sm:border-black/15 sm:px-4">
              <h4 class="text-[10px] font-black uppercase tracking-wider text-black inline-flex items-center gap-1.5">
                <span class="h-1.5 w-1.5 bg-black inline-block" />
                PENYELENGGARA (ORGANIZER)
              </h4>
              <ul class="space-y-2.5 text-xs text-slate-700 font-medium">
                <li>
                  <RouterLink to="/organizer/login" class="inline-flex items-center gap-1 hover:text-black">
                    <span>Masuk Organizer Studio</span>
                    <ArrowUpRight class="h-3 w-3 opacity-60" />
                  </RouterLink>
                </li>
                <li>
                  <RouterLink to="/organizer/register" class="inline-flex items-center gap-1 hover:text-black">
                    <span>Daftar Sebagai Organizer</span>
                    <ArrowUpRight class="h-3 w-3 opacity-60" />
                  </RouterLink>
                </li>
                <li>
                  <RouterLink to="/dashboard" class="inline-flex items-center gap-1 hover:text-black">
                    <span>Sistem 13 Modul Event</span>
                    <ArrowUpRight class="h-3 w-3 opacity-60" />
                  </RouterLink>
                </li>
              </ul>
            </div>

            <!-- Col 3: Platform -->
            <div class="flex flex-col items-center space-y-3">
              <h4 class="text-[10px] font-black uppercase tracking-wider text-black inline-flex items-center gap-1.5">
                <span class="h-1.5 w-1.5 bg-[#72a5e4] border border-black inline-block" />
                PLATFORM
              </h4>
              <ul class="space-y-2.5 text-xs text-slate-700 font-medium">
                <li>
                  <RouterLink to="/admin/login" class="inline-flex items-center gap-1 hover:text-black">
                    <span>Admin Console</span>
                    <ArrowUpRight class="h-3 w-3 opacity-60" />
                  </RouterLink>
                </li>
                <li class="pt-1">
                  <span class="inline-block rounded-lg border border-black/20 bg-white px-2.5 py-1 text-[10px] font-mono text-slate-600">
                    Vue 3 + Express API
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <!-- Bottom Signature Bar (Centered) -->
        <div class="flex flex-col items-center text-center text-xs text-slate-600 gap-4">
          <div class="flex flex-wrap items-center justify-center gap-3">
            <div class="flex items-end">
              <div class="h-3 w-3 bg-black" />
              <div class="h-3 w-6 bg-[#72a5e4] border border-black" />
            </div>
            <p class="font-medium text-black">© 2026 TERRA Platform. All rights reserved.</p>
          </div>

          <div class="flex flex-wrap items-center justify-center gap-4">
            <span class="text-[11px] text-slate-500">
              Modular Event Management &amp; Ticket Marketplace
            </span>
            <button
              @click="scrollToTop"
              type="button"
              class="luxury-pill inline-flex items-center gap-1.5 rounded-full border border-black bg-white px-4 py-1.5 text-[11px] font-bold text-black cursor-pointer"
            >
              <span>Ke Atas</span>
              <ArrowUp class="h-3 w-3" />
            </button>
          </div>
        </div>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.bubble-pop-enter-active {
  transition: opacity 0.24s cubic-bezier(0.22, 1, 0.36, 1),
    transform 0.28s cubic-bezier(0.34, 1.56, 0.64, 1);
  transform-origin: top center;
}

.bubble-pop-leave-active {
  transition: opacity 0.16s ease-in, transform 0.18s ease-in;
  transform-origin: top center;
}

.bubble-pop-enter-from,
.bubble-pop-leave-to {
  opacity: 0;
  transform: translateY(-10px) scale(0.88);
}
</style>

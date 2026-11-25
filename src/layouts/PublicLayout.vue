<script setup>
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import { RouterLink, RouterView, useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import TerraLogo from '@/components/common/TerraLogo.vue'
import { LogOut, Menu, X, ArrowUpRight, ArrowUp, Home, Compass, Tag, Ticket, User } from 'lucide-vue-next'

const authStore = useAuthStore()
const router = useRouter()
const route = useRoute()
const mobileOpen = ref(false)
const scrollProgress = ref(0)
const footerRef = ref(null)
const footerGrowth = ref(0)
let footerTarget = 0
let footerRaf = null
let prefersReducedMotion = false

function clamp01(v) {
  return Math.max(0, Math.min(1, v))
}

function stepFooterGrowth() {
  const diff = footerTarget - footerGrowth.value
  if (Math.abs(diff) < 0.001) {
    footerGrowth.value = footerTarget
    footerRaf = null
    return
  }
  footerGrowth.value += diff * 0.14
  footerRaf = requestAnimationFrame(stepFooterGrowth)
}

function updateFooterRootGrowth() {
  if (route.path !== '/' || !footerRef.value) return
  if (prefersReducedMotion) {
    footerTarget = 1
    footerGrowth.value = 1
    return
  }
  const rect = footerRef.value.getBoundingClientRect()
  const vh = window.innerHeight || 800
  const raw = (vh * 0.88 - rect.top) / Math.max(220, rect.height * 0.85)
  footerTarget = clamp01(raw)
  if (!footerRaf) {
    footerRaf = requestAnimationFrame(stepFooterGrowth)
  }
}

function handleScroll() {
  const docEl = document.documentElement
  const maxScroll = Math.max(1, docEl.scrollHeight - window.innerHeight)
  scrollProgress.value = clamp01((window.scrollY || 0) / maxScroll)
  updateFooterRootGrowth()
}

function handleKeydown(e) {
  if (e.key === 'Escape') {
    mobileOpen.value = false
  }
}

watch(
  () => route.fullPath,
  () => {
    mobileOpen.value = false
  }
)

onMounted(() => {
  prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches || false
  handleScroll()
  window.addEventListener('scroll', handleScroll, { passive: true })
  window.addEventListener('resize', updateFooterRootGrowth, { passive: true })
  window.addEventListener('keydown', handleKeydown)
})

onBeforeUnmount(() => {
  window.removeEventListener('scroll', handleScroll)
  window.removeEventListener('resize', updateFooterRootGrowth)
  window.removeEventListener('keydown', handleKeydown)
  if (footerRaf) cancelAnimationFrame(footerRaf)
})

async function handleLogout() {
  await authStore.logout()
  mobileOpen.value = false
  router.push('/')
}

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}
</script>

<template>
  <div class="min-h-dvh flex flex-col bg-[#fafaf9] text-slate-900 bg-grid-paper selection:bg-[#72a5e4] selection:text-black overflow-x-clip">
    <!-- Top Scroll Progress Bar -->
    <div class="fixed top-0 left-0 right-0 z-[60] h-[3px] bg-transparent pointer-events-none">
      <div
        class="h-full bg-[#72a5e4] border-r border-b border-black transition-[width] duration-100 ease-out"
        :style="{ width: `${Math.round(scrollProgress * 100)}%` }"
      />
    </div>

    <!-- Top Navbar: Solid architectural 64px sticky bar aligned to max-w-[1080px] -->
    <header class="sticky top-0 z-50 h-16 border-b border-black bg-[#fafaf9]">
      <div class="h-full">
        <div class="mx-auto flex h-full max-w-[1080px] items-center justify-between px-4 sm:px-6 lg:px-8">
          <!-- Left Brand Logo: TERRA -->
          <RouterLink to="/" class="flex items-center shrink-0 z-10">
            <TerraLogo size="md" />
          </RouterLink>

          <!-- Center Navigation Links -->
          <nav class="hidden md:flex items-center gap-1 lg:gap-2">
            <RouterLink
              to="/events"
              class="rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors"
              :class="route.path === '/events' ? 'bg-black text-white' : 'text-slate-700 hover:text-black hover:bg-black/5'"
            >
              Jelajahi Event
            </RouterLink>
            <a
              href="/#how-it-works"
              class="rounded-full px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:text-black hover:bg-black/5 transition-colors"
            >
              Cara Kerja
            </a>
            <a
              href="/#about"
              class="rounded-full px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:text-black hover:bg-black/5 transition-colors"
            >
              Tentang
            </a>
            <RouterLink
              to="/pricing"
              class="rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors"
              :class="route.path === '/pricing' ? 'bg-black text-white' : 'text-slate-700 hover:text-black hover:bg-black/5'"
            >
              Harga
            </RouterLink>
          </nav>

          <!-- Right Action Buttons -->
          <div class="hidden md:flex items-center gap-2 shrink-0">
            <template v-if="!authStore.isAuthenticated">
              <RouterLink
                to="/organizer/login"
                class="rounded-full px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:text-black transition-colors"
              >
                Studio EO
              </RouterLink>
              <RouterLink
                to="/login"
                class="luxury-pill rounded-full border border-black bg-[#72a5e4] px-5 py-1.5 text-xs font-bold text-black"
              >
                Masuk
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
                class="rounded-full border border-black/25 bg-white px-3.5 py-1.5 text-xs font-semibold text-black hover:border-black transition-colors max-w-[160px] truncate"
              >
                {{ authStore.user?.full_name || authStore.user?.email || 'Profil' }}
              </RouterLink>
              <button
                @click="handleLogout"
                class="p-1.5 text-slate-600 hover:text-rose-600 transition-colors cursor-pointer"
                title="Keluar"
                aria-label="Keluar"
              >
                <LogOut class="h-4 w-4" />
              </button>
            </template>

            <template v-else-if="authStore.isOrganizer">
              <RouterLink
                to="/dashboard"
                class="luxury-pill rounded-full border border-black bg-[#72a5e4] px-4 py-1.5 text-xs font-bold text-black"
              >
                Dashboard Studio
              </RouterLink>
              <RouterLink
                to="/dashboard"
                class="rounded-full border border-black/25 bg-white px-3.5 py-1.5 text-xs font-semibold text-black hover:border-black transition-colors max-w-[160px] truncate"
              >
                {{ authStore.user?.full_name || authStore.user?.email || 'Organizer' }}
              </RouterLink>
              <button
                @click="handleLogout"
                class="p-1.5 text-slate-600 hover:text-rose-600 transition-colors cursor-pointer"
                title="Keluar"
                aria-label="Keluar"
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
                class="p-1.5 text-slate-600 hover:text-rose-600 transition-colors cursor-pointer"
                title="Keluar"
                aria-label="Keluar"
              >
                <LogOut class="h-4 w-4" />
              </button>
            </template>
          </div>

          <!-- Mobile Menu Button -->
          <div class="flex md:hidden items-center z-10">
            <button
              @click="mobileOpen = !mobileOpen"
              class="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-black bg-white text-black shadow-[2px_2px_0px_#000] active:translate-y-0.5 active:shadow-none transition-all"
              :class="mobileOpen ? 'bg-[#72a5e4]' : 'bg-white'"
              aria-label="Toggle Menu"
            >
              <Menu v-if="!mobileOpen" class="h-4 w-4" />
              <X v-else class="h-4 w-4" />
            </button>
          </div>
        </div>

        <!-- Mobile Backdrop + Tactile Neo-Brutalist Drawer Sheet -->
        <Transition name="drawer-slide">
          <div
            v-if="mobileOpen"
            class="md:hidden fixed inset-x-0 top-16 z-50 px-4 pt-2 pb-4 pointer-events-auto"
          >
            <div
              class="fixed inset-0 top-16 bg-black/35 backdrop-blur-2xs -z-10"
              @click="mobileOpen = false"
            />
            <div class="rounded-3xl border-2 border-black bg-[#fafaf9] p-4 flex flex-col gap-3.5 shadow-[6px_6px_0px_#000]">
              <!-- User Status Header (if authenticated) -->
              <div
                v-if="authStore.isAuthenticated"
                class="flex items-center justify-between gap-3 rounded-2xl border border-black bg-white px-3.5 py-2.5"
              >
                <div class="flex items-center gap-2.5 min-w-0">
                  <div class="h-8 w-8 rounded-full border border-black bg-[#72a5e4] flex items-center justify-center font-black text-xs text-black shrink-0">
                    {{ (authStore.user?.full_name || authStore.user?.email || 'U').charAt(0).toUpperCase() }}
                  </div>
                  <div class="min-w-0">
                    <p class="text-xs font-black text-black truncate">
                      {{ authStore.user?.full_name || 'Pengguna TERRA' }}
                    </p>
                    <p class="text-[10px] font-medium text-slate-500 truncate">
                      {{ authStore.user?.email }}
                    </p>
                  </div>
                </div>
                <span class="rounded-full border border-black bg-[#72a5e4]/30 px-2.5 py-0.5 text-[10px] font-black uppercase text-black shrink-0">
                  {{ authStore.isOrganizer ? 'Organizer' : authStore.isAdmin ? 'Admin' : 'Peserta' }}
                </span>
              </div>

              <!-- 2x2 Quick Navigation Grid with Icons -->
              <div class="grid grid-cols-2 gap-2.5">
                <RouterLink
                  to="/events"
                  @click="mobileOpen = false"
                  class="luxury-pill flex items-center gap-2 rounded-2xl border border-black px-3.5 py-3 text-xs font-bold"
                  :class="route.path === '/events' ? 'bg-black text-white' : 'bg-white text-black'"
                >
                  <Compass class="h-4 w-4 shrink-0 text-[#72a5e4]" />
                  <span>Jelajahi Event</span>
                </RouterLink>
                <RouterLink
                  to="/pricing"
                  @click="mobileOpen = false"
                  class="luxury-pill flex items-center gap-2 rounded-2xl border border-black px-3.5 py-3 text-xs font-bold"
                  :class="route.path === '/pricing' ? 'bg-black text-white' : 'bg-white text-black'"
                >
                  <Tag class="h-4 w-4 shrink-0 text-[#72a5e4]" />
                  <span>Paket Pricing</span>
                </RouterLink>
                <a
                  href="/#about"
                  @click="mobileOpen = false"
                  class="luxury-pill flex items-center gap-2 rounded-2xl border border-black bg-white px-3.5 py-3 text-xs font-bold text-black"
                >
                  <Home class="h-4 w-4 shrink-0 text-[#72a5e4]" />
                  <span>About TERRA</span>
                </a>
                <a
                  href="/#how-it-works"
                  @click="mobileOpen = false"
                  class="luxury-pill flex items-center gap-2 rounded-2xl border border-black bg-white px-3.5 py-3 text-xs font-bold text-black"
                >
                  <ArrowUpRight class="h-4 w-4 shrink-0 text-[#72a5e4]" />
                  <span>Cara Kerja</span>
                </a>
              </div>

              <!-- Account Actions -->
              <div class="pt-2.5 border-t border-black/15">
                <div v-if="!authStore.isAuthenticated" class="grid grid-cols-2 gap-2.5">
                  <RouterLink
                    to="/login"
                    @click="mobileOpen = false"
                    class="luxury-pill block text-center rounded-full border border-black bg-[#72a5e4] py-2.5 text-xs font-black text-black shadow-[2px_2px_0px_#000]"
                  >
                    Login Peserta
                  </RouterLink>
                  <RouterLink
                    to="/organizer/login"
                    @click="mobileOpen = false"
                    class="luxury-pill block text-center rounded-full border border-black bg-black py-2.5 text-xs font-bold text-white"
                  >
                    Organizer Studio
                  </RouterLink>
                </div>
                <div v-else class="grid grid-cols-2 gap-2.5">
                  <RouterLink
                    v-if="authStore.isCustomer"
                    to="/profile"
                    @click="mobileOpen = false"
                    class="luxury-pill block text-center rounded-full border border-black bg-[#72a5e4] py-2.5 text-xs font-bold text-black"
                  >
                    Profil &amp; Pesanan
                  </RouterLink>
                  <RouterLink
                    v-else-if="authStore.isOrganizer"
                    to="/dashboard"
                    @click="mobileOpen = false"
                    class="luxury-pill block text-center rounded-full border border-black bg-[#72a5e4] py-2.5 text-xs font-bold text-black"
                  >
                    Buka Studio
                  </RouterLink>
                  <RouterLink
                    v-else
                    to="/admin"
                    @click="mobileOpen = false"
                    class="luxury-pill block text-center rounded-full border border-black bg-[#72a5e4] py-2.5 text-xs font-bold text-black"
                  >
                    Admin Panel
                  </RouterLink>
                  <button
                    @click="handleLogout"
                    class="luxury-pill w-full text-center rounded-full border border-black bg-white py-2.5 text-xs font-bold text-rose-700"
                  >
                    Keluar Akun
                  </button>
                </div>
              </div>
            </div>
          </div>
        </Transition>
      </div>
    </header>

    <!-- Main Content Area -->
    <main class="flex-1">
      <RouterView v-slot="{ Component, route: currentRoute }">
        <Transition name="page-fade" mode="out-in">
          <component :is="Component" :key="currentRoute.path" />
        </Transition>
      </RouterView>
    </main>

    <!-- =================================================================== -->
    <!-- LUXURY NEO-BRUTALIST FOOTER (CONNECTED TO SIDE RIBBONS & RAILS)     -->
    <!-- =================================================================== -->
    <footer
      ref="footerRef"
      class="relative overflow-hidden z-20 border-t border-black"
      :class="route.path === '/' ? 'mt-0' : 'mt-12'"
    >
      <!-- Connected Left & Right Ribbon Terminals Growing Seamlessly into Footer -->
      <svg
        v-if="route.path === '/'"
        class="pointer-events-none hidden xl:block absolute inset-x-0 top-0 w-full h-full z-0"
        viewBox="0 0 1440 480"
        preserveAspectRatio="none"
        fill="none"
      >
        <defs>
          <clipPath id="terra-footer-grow">
            <rect x="0" y="0" width="1440" :height="Math.max(0, footerGrowth * 490)" />
          </clipPath>
        </defs>

        <g clip-path="url(#terra-footer-grow)">
          <path
            d="M 16,0 C 16,120 42,230 22,340 C 14,395 28,440 56,480 L 92,480 C 60,440 46,395 54,340 C 74,230 48,120 48,0 Z"
            fill="#fafaf9"
            stroke="#000000"
            stroke-width="2.5"
            vector-effect="non-scaling-stroke"
          />
          <line x1="17" y1="0" x2="47" y2="0" stroke="#fafaf9" stroke-width="4" vector-effect="non-scaling-stroke" />
        </g>

        <path
          d="M 64,0 C 82,120 48,240 72,355 C 86,415 104,452 126,480"
          pathLength="1"
          :stroke-dasharray="1"
          :stroke-dashoffset="Math.max(0, 1 - footerGrowth)"
          stroke="#000000"
          stroke-width="1.8"
          stroke-linecap="round"
          vector-effect="non-scaling-stroke"
        />
        <path
          d="M 70,220 C 102,248 124,284 114,332 C 108,356 88,368 78,358"
          pathLength="1"
          :stroke-dasharray="1"
          :stroke-dashoffset="Math.max(0, 1 - Math.max(0, (footerGrowth - 0.35) / 0.5))"
          stroke="#000000"
          stroke-width="1.6"
          stroke-linecap="round"
          fill="none"
          vector-effect="non-scaling-stroke"
        />
        <g
          v-if="footerGrowth > 0.65"
          :transform="`translate(78, 358) scale(${Math.min(1, (footerGrowth - 0.65) / 0.25)})`"
        >
          <path
            d="M 0,-7 L 2,-2 L 7,0 L 2,2 L 0,7 L -2,2 L -7,0 L -2,-2 Z"
            fill="#72a5e4"
            stroke="#000000"
            stroke-width="1.5"
            stroke-linejoin="round"
          />
        </g>

        <g clip-path="url(#terra-footer-grow)">
          <path
            d="M 1424,0 C 1424,120 1398,230 1418,340 C 1426,395 1412,440 1384,480 L 1348,480 C 1380,440 1394,395 1386,340 C 1366,230 1392,120 1392,0 Z"
            fill="#fafaf9"
            stroke="#000000"
            stroke-width="2.5"
            vector-effect="non-scaling-stroke"
          />
          <line x1="1393" y1="0" x2="1423" y2="0" stroke="#fafaf9" stroke-width="4" vector-effect="non-scaling-stroke" />
        </g>

        <path
          d="M 1376,0 C 1358,120 1392,240 1368,355 C 1354,415 1336,452 1314,480"
          pathLength="1"
          :stroke-dasharray="1"
          :stroke-dashoffset="Math.max(0, 1 - footerGrowth)"
          stroke="#000000"
          stroke-width="1.8"
          stroke-linecap="round"
          vector-effect="non-scaling-stroke"
        />
        <path
          d="M 1370,220 C 1338,248 1316,284 1326,332 C 1332,356 1352,368 1362,358"
          pathLength="1"
          :stroke-dasharray="1"
          :stroke-dashoffset="Math.max(0, 1 - Math.max(0, (footerGrowth - 0.35) / 0.5))"
          stroke="#000000"
          stroke-width="1.6"
          stroke-linecap="round"
          fill="none"
          vector-effect="non-scaling-stroke"
        />
        <g
          v-if="footerGrowth > 0.65"
          :transform="`translate(1362, 358) scale(${Math.min(1, (footerGrowth - 0.65) / 0.25)})`"
        >
          <path
            d="M 0,-7 L 2,-2 L 7,0 L 2,2 L 0,7 L -2,2 L -7,0 L -2,-2 Z"
            fill="#72a5e4"
            stroke="#000000"
            stroke-width="1.5"
            stroke-linejoin="round"
          />
        </g>
      </svg>

      <div class="mx-auto max-w-[1080px] px-4 sm:px-6 lg:px-8 pt-12 pb-10 border-x border-black/15 relative z-10 space-y-10">
        <span class="pointer-events-none hidden sm:block absolute top-2 -left-[5px] text-xs font-mono text-black leading-none">+</span>
        <span class="pointer-events-none hidden sm:block absolute top-2 -right-[5px] text-xs font-mono text-black leading-none">+</span>

        <!-- Top Footer Horizontal Split CTA Bar -->
        <div class="relative rounded-2xl border-2 border-black bg-white p-6 sm:p-8 shadow-[4px_4px_0px_#000] overflow-hidden">
          <div class="absolute top-0 left-0 h-2 w-6 bg-[#72a5e4] border-b border-r border-black" />
          <div class="absolute bottom-0 right-0 h-2 w-6 bg-black" />

          <div class="flex flex-col md:flex-row md:items-center justify-between gap-6 text-left">
            <div class="space-y-1.5 max-w-xl">
              <h3 class="text-xl sm:text-2xl font-extrabold tracking-tight text-black leading-snug">
                Mulai selenggarakan acara atau temukan tiket berikutnya
              </h3>
              <p class="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Dari konser dan festival kampus hingga konferensi berskala nasional dengan tiket QR resmi.
              </p>
            </div>

            <div class="flex flex-wrap items-center gap-2.5 shrink-0">
              <RouterLink
                to="/events"
                class="luxury-pill rounded-full border border-black bg-[#72a5e4] px-5 py-2.5 text-xs font-bold text-black"
              >
                Jelajahi Event
              </RouterLink>
              <RouterLink
                to="/organizer/login"
                class="luxury-pill rounded-full border border-black bg-black px-5 py-2.5 text-xs font-bold text-white"
              >
                Buka Organizer Studio
              </RouterLink>
            </div>
          </div>
        </div>

        <!-- 12-Column International Footer Grid -->
        <div class="grid grid-cols-1 md:grid-cols-12 gap-10 py-10 border-y border-black/15 text-left">
          <!-- Brand Identity (Cols 1-5) -->
          <div class="md:col-span-5 space-y-4">
            <div class="flex items-center gap-2.5">
              <TerraLogo size="lg" />
              <span class="rounded-full border border-black bg-[#72a5e4] px-2 py-0.5 text-[10px] font-mono font-bold text-black">
                v2.6
              </span>
            </div>

            <p class="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-[44ch]">
              Platform terpadu untuk manajemen kepanitiaan 13 modul dan marketplace tiket QR digital dengan validasi anti-duplikasi.
            </p>

            <div class="inline-flex items-center gap-2 rounded-full border border-black/25 bg-white px-3 py-1 text-[11px] font-semibold text-slate-700">
              <span class="h-2 w-2 rounded-full bg-emerald-500 border border-black animate-pulse" />
              <span>13 modul aktif • Sistem operasional</span>
            </div>
          </div>

          <!-- 3 Left-Aligned Navigation Columns (Cols 6-12) -->
          <div class="md:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-8">
            <div class="space-y-3">
              <h4 class="text-xs font-bold text-black">Marketplace</h4>
              <ul class="space-y-2 text-xs text-slate-600">
                <li>
                  <RouterLink to="/events" class="hover:text-black hover:underline">Jelajahi Event</RouterLink>
                </li>
                <li>
                  <RouterLink to="/my-tickets" class="hover:text-black hover:underline">Tiket Saya</RouterLink>
                </li>
                <li>
                  <RouterLink to="/login" class="hover:text-black hover:underline">Masuk Peserta</RouterLink>
                </li>
                <li>
                  <RouterLink to="/register" class="hover:text-black hover:underline">Daftar Peserta</RouterLink>
                </li>
              </ul>
            </div>

            <div class="space-y-3">
              <h4 class="text-xs font-bold text-black">Organizer Studio</h4>
              <ul class="space-y-2 text-xs text-slate-600">
                <li>
                  <RouterLink to="/organizer/login" class="hover:text-black hover:underline">Masuk Studio</RouterLink>
                </li>
                <li>
                  <RouterLink to="/organizer/register" class="hover:text-black hover:underline">Daftar Organizer</RouterLink>
                </li>
                <li>
                  <RouterLink to="/dashboard" class="hover:text-black hover:underline">Ruang Kerja 13 Modul</RouterLink>
                </li>
                <li>
                  <RouterLink to="/pricing" class="hover:text-black hover:underline">Skema Harga</RouterLink>
                </li>
              </ul>
            </div>

            <div class="col-span-2 sm:col-span-1 space-y-3">
              <h4 class="text-xs font-bold text-black">Platform</h4>
              <ul class="space-y-2 text-xs text-slate-600">
                <li>
                  <a href="/#about" class="hover:text-black hover:underline">Tentang TERRA</a>
                </li>
                <li>
                  <a href="/#how-it-works" class="hover:text-black hover:underline">Cara Kerja</a>
                </li>
                <li>
                  <RouterLink to="/admin/login" class="hover:text-black hover:underline">Admin Console</RouterLink>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <!-- Bottom Bar: Left Copyright, Right Scroll Top -->
        <div class="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-600">
          <div class="flex items-center gap-3">
            <div class="flex items-end">
              <div class="h-3 w-3 bg-black" />
              <div class="h-3 w-5 bg-[#72a5e4] border border-black" />
            </div>
            <p class="font-medium text-black">© 2026 TERRA. Seluruh hak cipta dilindungi.</p>
          </div>

          <button
            @click="scrollToTop"
            type="button"
            class="luxury-pill inline-flex items-center gap-1.5 rounded-full border border-black bg-white px-4 py-1.5 text-xs font-semibold text-black cursor-pointer"
          >
            <span>Kembali ke atas</span>
            <ArrowUp class="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </footer>
  </div>
</template>

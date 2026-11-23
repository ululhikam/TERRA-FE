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
const isScrolled = ref(false)
const scrollProgress = ref(0)
const bubbleOpen = ref(false)
const floatingNavRef = ref(null)
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
  const scrolled = window.scrollY > 72
  isScrolled.value = scrolled
  if (!scrolled) {
    bubbleOpen.value = false
  }
  const docEl = document.documentElement
  const maxScroll = Math.max(1, docEl.scrollHeight - window.innerHeight)
  scrollProgress.value = clamp01((window.scrollY || 0) / maxScroll)
  updateFooterRootGrowth()
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
  prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches || false
  handleScroll()
  window.addEventListener('scroll', handleScroll, { passive: true })
  window.addEventListener('resize', updateFooterRootGrowth, { passive: true })
  document.addEventListener('click', handleDocumentClick)
  document.addEventListener('keydown', handleKeydown)
})

onBeforeUnmount(() => {
  window.removeEventListener('scroll', handleScroll)
  window.removeEventListener('resize', updateFooterRootGrowth)
  document.removeEventListener('click', handleDocumentClick)
  document.removeEventListener('keydown', handleKeydown)
  if (footerRaf) cancelAnimationFrame(footerRaf)
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
  <div class="min-h-dvh flex flex-col bg-[#fafaf9] text-slate-900 bg-grid-paper selection:bg-[#72a5e4] selection:text-black overflow-x-clip">
    <!-- Top Scroll Progress Bar -->
    <div class="fixed top-0 left-0 right-0 z-[60] h-[0.45vh] min-h-[3px] bg-transparent pointer-events-none">
      <div
        class="h-full bg-[#72a5e4] border-r border-b border-black transition-[width] duration-100 ease-out"
        :style="{ width: `${Math.round(scrollProgress * 100)}%` }"
      />
    </div>

    <!-- Top Navbar: Full-width edge-to-edge at top -> collapses into centered Logo pill on scroll -> click logo pops out Bubble Navbar -->
    <header class="sticky top-0 z-50 h-[8vh] min-h-[3.5rem] max-h-[5rem] pointer-events-none">
      <!-- Expanded Full Navbar (Always sticky on mobile; collapses into floating bubble on desktop scroll) -->
      <div
        class="border-b border-black bg-[#fafaf9]/95 backdrop-blur-xs transition-all duration-300 ease-out"
        :class="
          isScrolled
            ? 'opacity-100 translate-y-0 pointer-events-auto md:opacity-0 md:-translate-y-4 md:pointer-events-none'
            : 'opacity-100 translate-y-0 pointer-events-auto'
        "
      >
        <div class="relative flex h-[8vh] min-h-[3.5rem] max-h-[5rem] w-full items-center justify-between px-[3.5vw] sm:px-[2.5vw] lg:px-[2vw]">
          <!-- Left Brand Logo: TERRA -->
          <RouterLink to="/" class="flex items-center shrink-0 z-10">
            <TerraLogo size="md" />
          </RouterLink>

          <!-- Center Navigation Pills (True Viewport Center regardless of left/right width difference) -->
          <nav class="hidden md:flex items-center gap-2 lg:gap-2.5 absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <a
              href="/#about"
              class="luxury-pill rounded-full border border-black bg-white px-4 py-1.5 text-xs font-semibold text-black"
            >
              About
            </a>
            <RouterLink
              to="/pricing"
              class="luxury-pill rounded-full border border-black bg-white px-4 py-1.5 text-xs font-semibold text-black"
            >
              Pricing
            </RouterLink>
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
                {{ authStore.user?.full_name || authStore.user?.email || 'Peserta' }} (Peserta)
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
                {{ authStore.user?.full_name || authStore.user?.email || 'Organizer' }}
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

          <!-- Mobile Menu Button (Clean single control on top right) -->
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
            class="md:hidden fixed inset-x-0 top-[8vh] z-50 px-[3.5vw] pt-2 pb-4 pointer-events-auto"
          >
            <div
              class="fixed inset-0 top-[8vh] bg-black/35 backdrop-blur-2xs -z-10"
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

      <!-- Scrolled Centered Logo Pill + Expandable Floating Bubble Navbar (Desktop md+ only; mobile uses sticky app bar + bottom dock) -->
      <div
        ref="floatingNavRef"
        class="hidden md:flex fixed top-3 inset-x-0 z-50 flex-col items-center px-3 transition-all duration-300 ease-out"
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
      class="relative overflow-hidden z-20"
      :class="route.path === '/' ? 'mt-0' : 'mt-12 border-t border-black'"
    >
      <!-- Connected Left & Right Ribbon Terminals Growing Seamlessly into Footer -->
      <svg
        v-if="route.path === '/'"
        class="pointer-events-none block absolute inset-x-0 top-0 w-full h-full z-0"
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

          <!-- 3-Column Centered Navigation Links (Compact 2-col on mobile) -->
          <div class="w-full grid grid-cols-2 sm:grid-cols-3 gap-6 sm:gap-8 pt-2">
            <!-- Col 1: Marketplace Peserta -->
            <div class="flex flex-col items-center space-y-2.5">
              <h4 class="text-[10px] font-black uppercase tracking-wider text-black inline-flex items-center gap-1.5">
                <span class="h-1.5 w-1.5 bg-[#72a5e4] border border-black inline-block" />
                MARKETPLACE PESERTA
              </h4>
              <ul class="space-y-2 text-xs text-slate-700 font-medium">
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
            <div class="flex flex-col items-center space-y-2.5 sm:border-x sm:border-black/15 sm:px-4">
              <h4 class="text-[10px] font-black uppercase tracking-wider text-black inline-flex items-center gap-1.5">
                <span class="h-1.5 w-1.5 bg-black inline-block" />
                ORGANIZER
              </h4>
              <ul class="space-y-2 text-xs text-slate-700 font-medium">
                <li>
                  <RouterLink to="/organizer/login" class="inline-flex items-center gap-1 hover:text-black">
                    <span>Organizer Studio</span>
                    <ArrowUpRight class="h-3 w-3 opacity-60" />
                  </RouterLink>
                </li>
                <li>
                  <RouterLink to="/organizer/register" class="inline-flex items-center gap-1 hover:text-black">
                    <span>Daftar Organizer</span>
                    <ArrowUpRight class="h-3 w-3 opacity-60" />
                  </RouterLink>
                </li>
                <li>
                  <RouterLink to="/dashboard" class="inline-flex items-center gap-1 hover:text-black">
                    <span>13 Modul Event</span>
                    <ArrowUpRight class="h-3 w-3 opacity-60" />
                  </RouterLink>
                </li>
                <li>
                  <RouterLink to="/pricing" class="inline-flex items-center gap-1 hover:text-black">
                    <span>Paket &amp; Harga</span>
                    <ArrowUpRight class="h-3 w-3 opacity-60" />
                  </RouterLink>
                </li>
              </ul>
            </div>

            <!-- Col 3: Platform -->
            <div class="col-span-2 sm:col-span-1 flex flex-col items-center space-y-2.5 pt-2 sm:pt-0 border-t sm:border-t-0 border-black/10">
              <h4 class="text-[10px] font-black uppercase tracking-wider text-black inline-flex items-center gap-1.5">
                <span class="h-1.5 w-1.5 bg-[#72a5e4] border border-black inline-block" />
                PLATFORM
              </h4>
              <ul class="space-y-2 text-xs text-slate-700 font-medium">
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

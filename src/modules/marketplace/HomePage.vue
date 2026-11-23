<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import { useEventWorkspaceStore } from '@/stores/eventWorkspace'
import { formatDate, formatCurrency } from '@/utils/formatters'
import BubbleGraffiti from '@/components/common/BubbleGraffiti.vue'
import { Search, MapPin, ArrowUpRight } from 'lucide-vue-next'

const router = useRouter()
const store = useEventWorkspaceStore()

const searchQuery = ref('')
const selectedCity = ref('')
const activeCategory = ref('All')
const activeTab = ref('all')
const scrollY = ref(0)

const categories = computed(() => [
  { key: 'All', label: `Semua Kategori (${store.categories.length})` },
  ...store.categories.map((c) => ({ key: c.name, label: c.name }))
])

const publishedEvents = computed(() =>
  store.events.filter((e) => e.publication_status === 'Published')
)

const featuredEvent = computed(() => publishedEvents.value[0] || store.events[0])

const catalogRows = computed(() => {
  let list = publishedEvents.value.slice(1)
  if (activeCategory.value !== 'All') {
    list = publishedEvents.value.filter((e) => e.category === activeCategory.value)
  }
  if (activeTab.value === 'free') {
    list = list.filter((e) => getEventMeta(e).minPrice === 0)
  } else if (activeTab.value === 'paid') {
    list = list.filter((e) => getEventMeta(e).minPrice > 0)
  } else if (activeTab.value === 'online') {
    list = list.filter((e) => ['online', 'hybrid'].includes(e.location_type))
  }
  return list
})

function getEventMeta(evt) {
  const types = evt.ticket_types || []
  if (!types.length) {
    return { minPrice: 0, soldPct: 65, remaining: 35, priceLabel: 'Gratis' }
  }
  const prices = types.map((t) => Number(t.price))
  const minPrice = Math.min(...prices)
  const totalQuota = types.reduce((s, t) => s + Number(t.quantity), 0)
  const totalSold = types.reduce((s, t) => s + Number(t.sold_quantity), 0)
  const soldPct = totalQuota > 0 ? Math.round((totalSold / totalQuota) * 100) : 68
  const remaining = Math.max(0, totalQuota - totalSold)
  return {
    minPrice,
    soldPct,
    remaining,
    priceLabel: minPrice === 0 ? 'Gratis' : formatCurrency(minPrice)
  }
}

function handleSearch() {
  const query = {}
  const combined = [searchQuery.value.trim(), selectedCity.value].filter(Boolean).join(' ')
  if (combined) query.q = combined
  router.push({ path: '/events', query })
}

function quickSearch(q) {
  router.push({ path: '/events', query: { q } })
}

let observer = null
function handleWindowScroll() {
  scrollY.value = window.scrollY || 0
}

onMounted(() => {
  window.addEventListener('scroll', handleWindowScroll, { passive: true })
  observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible')
        }
      })
    },
    { threshold: 0.08 }
  )
  document.querySelectorAll('.reveal-section').forEach((el) => observer.observe(el))
})

onBeforeUnmount(() => {
  window.removeEventListener('scroll', handleWindowScroll)
  if (observer) observer.disconnect()
})
</script>

<template>
  <div class="relative overflow-hidden selection:bg-[#72a5e4] selection:text-black">
    <!-- =================================================================== -->
    <!-- 1. HERO SECTION (CONNECTED RIBBONS + CENTERED BOLD HEADER + MOTION) -->
    <!-- =================================================================== -->
    <section class="relative min-h-[calc(100vh-4rem)] flex flex-col justify-between overflow-visible">
      <div class="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 border-x border-black/15 relative z-10 flex-1 flex flex-col justify-between pt-4 sm:pt-6">
        <!-- Top Architectural Crosshair Nodes -->
        <span class="pointer-events-none hidden sm:block absolute top-3 -left-[5px] text-xs font-mono text-black/40 leading-none">+</span>
        <span class="pointer-events-none hidden sm:block absolute top-3 -right-[5px] text-xs font-mono text-black/40 leading-none">+</span>

        <!-- Top Row: Centered Bold "Ticketing & Event Ecosystem" + Custom Vector Emblem + Right Serif Label -->
        <div class="grid grid-cols-1 sm:grid-cols-12 items-center gap-3 mb-1 relative z-20">
          <!-- Left Custom Neo-Brutalist Ticket Emblem (Desktop) -->
          <div class="hidden sm:flex sm:col-span-2 items-center">
            <div
              class="inline-flex items-center gap-2 rounded-full border border-black bg-white px-3 py-1 shadow-[2px_2px_0px_#000]"
              :style="{ transform: `translateY(${scrollY * -0.03}px)` }"
            >
              <svg class="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none">
                <path d="M3 7C3 5.89543 3.89543 5 5 5H19C20.1046 5 21 5.89543 21 7V9.5C19.6193 9.5 18.5 10.6193 18.5 12C18.5 13.3807 19.6193 14.5 21 14.5V17C21 18.1046 20.1046 19 19 19H5C3.89543 19 3 18.1046 3 17V14.5C4.38071 14.5 5.5 13.3807 5.5 12C5.5 10.6193 4.38071 9.5 3 9.5V7Z" fill="#72a5e4" stroke="#000" stroke-width="2" />
                <path d="M9 9V15M13 9V15" stroke="#000" stroke-width="1.8" stroke-linecap="round" stroke-dasharray="2 2" />
              </svg>
              <span class="text-[10px] font-black uppercase tracking-wider text-black">QR PASS</span>
            </div>
          </div>

          <!-- Center Bold Title: "Ticketing & Event Ecosystem" -->
          <div
            class="sm:col-span-8 text-center space-y-1"
            :style="{ transform: `translateY(${scrollY * -0.05}px)` }"
          >
            <h1 class="text-xl sm:text-2xl md:text-3xl font-black tracking-tight text-black font-sans leading-none">
              Ticketing &amp; <span class="underline decoration-[#72a5e4] decoration-4 underline-offset-4">Event Ecosystem</span>
            </h1>
          </div>

          <!-- Right Serif Subtitle -->
          <div class="sm:col-span-2 text-center sm:text-right">
            <p class="font-editorial text-sm sm:text-base text-black leading-tight">
              Tiket Konser<br class="hidden sm:inline" />
              <span class="sm:hidden"> </span>&amp; Workshop
            </p>
          </div>
        </div>

        <!-- Center Pure Vector SVG Bubble Graffiti Art ("TERRA" + Unbroken Ribbons All the Way Down!) -->
        <div class="my-1 relative z-30 pointer-events-none">
          <BubbleGraffiti full-bleed :scroll-offset="scrollY" />
        </div>

        <!-- Headline & Giant 2026 Row with Scroll-Linked Rotating Seal Icon -->
        <div class="grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-6 items-end mt-2 sm:mt-4 relative z-20">
          <div class="md:col-span-7 space-y-2">
            <h2 class="text-xl sm:text-2xl md:text-[28px] font-editorial text-black leading-[1.2] tracking-tight">
              Beli Tiket Konser, Tech<br class="hidden sm:inline" />
              Summit, &amp; Workshop Resmi di TERRA
            </h2>
            <p class="text-xs text-slate-600 max-w-lg leading-relaxed">
              Temukan ribuan acara pilihan dari promotor terverifikasi. Pembayaran instan, tiket QR digital anti-duplikasi, dan jaminan transaksi 100% aman.
            </p>
          </div>

          <div class="md:col-span-5 flex items-center md:justify-end gap-4">
            <!-- Scroll-Driven Rotating Neo-Brutalist Stamp Emblem -->
            <div
              class="hidden sm:flex h-14 w-14 rounded-2xl border-2 border-black bg-[#72a5e4] shadow-[3px_3px_0px_#000] items-center justify-center shrink-0"
              :style="{ transform: `rotate(${scrollY * 0.15}deg)` }"
            >
              <svg class="h-8 w-8" viewBox="0 0 32 32" fill="none">
                <rect x="4" y="4" width="10" height="10" rx="2" fill="#fff" stroke="#000" stroke-width="2" />
                <rect x="7" y="7" width="4" height="4" fill="#000" />
                <rect x="18" y="4" width="10" height="10" rx="2" fill="#fff" stroke="#000" stroke-width="2" />
                <rect x="21" y="7" width="4" height="4" fill="#000" />
                <rect x="4" y="18" width="10" height="10" rx="2" fill="#fff" stroke="#000" stroke-width="2" />
                <rect x="7" y="21" width="4" height="4" fill="#000" />
                <path d="M18 18H23V23H18V18ZM23 23H28V28H23V23ZM25 18H28V21H25V18ZM18 25H21V28H18V25Z" fill="#000" />
              </svg>
            </div>

            <div class="inline-block text-left">
              <div class="flex items-end gap-1 leading-none">
                <span class="text-5xl sm:text-6xl md:text-7xl font-black tracking-tighter text-black font-sans">20</span>
                <div class="flex flex-col">
                  <span class="text-[8px] font-bold uppercase tracking-widest text-slate-500 mb-0.5 leading-tight">
                    SEASON PASS<br />EDITION
                  </span>
                  <span class="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-black font-sans leading-none">26</span>
                </div>
              </div>
              <p class="text-[9px] font-bold uppercase tracking-widest text-slate-500 mt-1">
                PLATFORM TIKET &amp; EVENT RESMI
              </p>
            </div>
          </div>
        </div>

        <!-- Search Bar + Right Verified Info -->
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start mt-4 sm:mt-5 relative z-20">
          <div class="lg:col-span-9">
            <form
              @submit.prevent="handleSearch"
              class="luxury-card flex flex-col sm:flex-row items-stretch sm:items-center rounded-2xl sm:rounded-full border border-black bg-white p-1.5 gap-2 sm:gap-0"
            >
              <div class="flex items-center flex-1 pl-3 py-1 sm:py-0">
                <Search class="h-3.5 w-3.5 text-slate-400 shrink-0" />
                <input
                  v-model="searchQuery"
                  type="text"
                  placeholder="Cari nama event, konser, workshop..."
                  class="w-full bg-transparent px-2.5 py-1.5 text-xs text-black placeholder:text-slate-400 focus:outline-hidden"
                />
              </div>

              <div class="flex items-center border-t sm:border-t-0 sm:border-l border-black/20 px-3 py-1.5 sm:py-1">
                <MapPin class="h-3.5 w-3.5 text-slate-400 mr-1.5 shrink-0" />
                <select
                  v-model="selectedCity"
                  class="w-full sm:w-auto bg-transparent text-xs text-slate-700 focus:outline-hidden pr-4 cursor-pointer"
                >
                  <option value="">Semua Lokasi</option>
                  <option value="Jakarta">Jakarta</option>
                  <option value="Bandung">Bandung</option>
                  <option value="Bali">Bali</option>
                  <option value="Online">Online</option>
                </select>
              </div>

              <button
                type="submit"
                class="rounded-full bg-black px-6 py-2.5 text-xs font-bold text-white hover:bg-slate-800 transition-colors shrink-0 cursor-pointer"
              >
                Cari Tiket Sekarang
              </button>
            </form>

            <!-- Populer Pills -->
            <div class="mt-2.5 flex flex-wrap items-center gap-1.5 sm:gap-2 text-[11px]">
              <span class="text-slate-500 font-medium mr-1">Populer:</span>
              <button
                v-for="tag in ['Tech Summit', 'Konser Indie', 'UI/UX Workshop', 'AI Bootcamp', 'Gratis']"
                :key="tag"
                @click="quickSearch(tag)"
                class="luxury-pill rounded-full border border-black bg-white px-3 py-0.5 text-[11px] font-medium text-black cursor-pointer"
              >
                {{ tag }}
              </button>
            </div>
          </div>

          <!-- Right Trust Note with Custom Verified Emblem -->
          <div class="lg:col-span-3 flex items-start gap-2.5 text-xs pt-0.5">
            <svg class="h-8 w-8 shrink-0 mt-0.5" viewBox="0 0 32 32" fill="none">
              <path d="M16 3L27 7.5V15.5C27 22.4 22.3 27.9 16 30C9.7 27.9 5 22.4 5 15.5V7.5L16 3Z" fill="#72a5e4" stroke="#000" stroke-width="2" stroke-linejoin="round" />
              <path d="M11.5 16L14.5 19L21 12.5" stroke="#000" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
            <div class="space-y-0.5">
              <p class="font-bold text-black leading-snug">
                100% Tiket Resmi &amp; Terverifikasi
              </p>
              <p class="text-[11px] text-slate-600 leading-relaxed">
                Terintegrasi langsung dengan gate check-in QR organizer.
              </p>
              <RouterLink to="/events" class="inline-block text-[11px] font-bold text-black underline pt-0.5 hover:opacity-75">
                Jelajahi Katalog &rarr;
              </RouterLink>
            </div>
          </div>
        </div>

        <!-- Interlocking Stepped Brutalist Bridge into Section 2 -->
        <div class="mt-6 flex items-end justify-between relative z-20">
          <div class="flex items-end pl-2 sm:pl-8">
            <div class="h-3 w-12 sm:w-16 bg-black" />
            <div class="h-6 w-8 sm:w-10 bg-black" />
            <div class="h-4 w-16 sm:w-24 bg-black" />
            <div class="h-2.5 w-14 sm:w-20 bg-black" />
            <div class="h-3.5 w-6 sm:w-8 bg-black" />
            <div class="h-2 w-10 sm:w-12 bg-black" />
          </div>
          <div class="hidden sm:flex items-end">
            <div class="h-2.5 w-8 bg-[#72a5e4] border-t border-l border-black" />
            <div class="h-5 w-12 bg-[#72a5e4] border-t border-x border-black" />
          </div>
        </div>
      </div>
    </section>

    <!-- =================================================================== -->
    <!-- 2. BLUE STRIP GUARANTEE BANNER (WITH BESPOKE 3D VECTOR ICONS)       -->
    <!-- =================================================================== -->
    <section class="relative border-y border-black bg-[#72a5e4] text-black z-10">
      <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4 border-x border-black/25 relative">
        <span class="pointer-events-none hidden sm:block absolute -top-2 -left-[5px] text-xs font-mono text-black leading-none">+</span>
        <span class="pointer-events-none hidden sm:block absolute -top-2 -right-[5px] text-xs font-mono text-black leading-none">+</span>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs divide-y sm:divide-y-0 sm:divide-x divide-black/20">
          <!-- Item 1: Custom QR Ticket Pass Emblem -->
          <div class="flex items-center gap-3 pt-2 sm:pt-0">
            <div class="h-9 w-9 rounded-xl border border-black bg-white shadow-[2px_2px_0px_#000] flex items-center justify-center shrink-0">
              <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="5" width="18" height="14" rx="2.5" fill="#72a5e4" stroke="#000" stroke-width="1.8" />
                <path d="M8 9H11V12H8V9ZM13 9H16V12H13V9ZM8 13H11V15H8V13ZM14 13V15" stroke="#000" stroke-width="1.8" stroke-linecap="round" />
              </svg>
            </div>
            <div>
              <p class="font-bold text-black">E-Ticket QR Instan</p>
              <p class="text-[11px] text-slate-900">Langsung aktif di akun &amp; email setelah checkout</p>
            </div>
          </div>

          <!-- Item 2: Custom Verified Shield Emblem -->
          <div class="flex items-center gap-3 pt-2 sm:pt-0 sm:pl-5">
            <div class="h-9 w-9 rounded-xl border border-black bg-white shadow-[2px_2px_0px_#000] flex items-center justify-center shrink-0">
              <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none">
                <path d="M12 2.5L20 6V12C20 17 16.5 20.8 12 22.5C7.5 20.8 4 17 4 12V6L12 2.5Z" fill="#72a5e4" stroke="#000" stroke-width="1.8" />
                <path d="M8.5 12.2L11 14.7L15.8 9.8" stroke="#000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </div>
            <div>
              <p class="font-bold text-black">Jaminan Tiket Resmi</p>
              <p class="text-[11px] text-slate-900">Penyelenggara terverifikasi oleh tim moderasi</p>
            </div>
          </div>

          <!-- Item 3: Custom Atomic Escrow Lock Emblem -->
          <div class="flex items-center gap-3 pt-2 sm:pt-0 sm:pl-5">
            <div class="h-9 w-9 rounded-xl border border-black bg-white shadow-[2px_2px_0px_#000] flex items-center justify-center shrink-0">
              <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none">
                <rect x="5" y="10" width="14" height="11" rx="2.5" fill="#72a5e4" stroke="#000" stroke-width="1.8" />
                <path d="M8 10V7C8 4.79086 9.79086 3 12 3C14.2091 3 16 4.79086 16 7V10" stroke="#000" stroke-width="1.8" />
                <circle cx="12" cy="15.5" r="1.5" fill="#000" />
              </svg>
            </div>
            <div>
              <p class="font-bold text-black">Transaksi Terlindungi</p>
              <p class="text-[11px] text-slate-900">Kuota atomik real-time tanpa risiko overbooking</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- =================================================================== -->
    <!-- KINETIC MOTION TICKER STRIP (CONNECTS GUARANTEE BAR TO CATALOG)     -->
    <!-- =================================================================== -->
    <div class="border-b border-black bg-black text-white py-2 overflow-hidden relative z-10 select-none">
      <div class="animate-marquee flex items-center gap-8 text-[10px] font-bold uppercase tracking-[0.2em]">
        <template v-for="n in 2" :key="n">
          <span class="flex items-center gap-2"><span class="h-2 w-2 rounded-full bg-[#72a5e4]" /> TERRA TICKETING &amp; EVENT ECOSYSTEM</span>
          <span>✦</span>
          <span class="flex items-center gap-2"><span class="h-2 w-2 rounded-full bg-[#72a5e4]" /> ATOMIC QR PASS VALIDATION</span>
          <span>✦</span>
          <span class="flex items-center gap-2"><span class="h-2 w-2 rounded-full bg-[#72a5e4]" /> 13 MODULAR WORKSPACE ENGINE</span>
          <span>✦</span>
          <span class="flex items-center gap-2"><span class="h-2 w-2 rounded-full bg-[#72a5e4]" /> 100% VERIFIED PROMOTOR &amp; ORGANIZER</span>
          <span>✦</span>
        </template>
      </div>
    </div>

    <!-- =================================================================== -->
    <!-- 3. JELAJAHI & BELI TIKET EVENT (CONNECTED VIA ARCHITECTURAL RAILS)  -->
    <!-- =================================================================== -->
    <section class="relative z-10">
      <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-0 border-x border-black/15 space-y-6 relative">
        <!-- Interlocking top-left blue pixel drop -->
        <div class="hidden sm:flex items-start absolute top-0 left-8">
          <div class="h-3.5 w-10 bg-[#72a5e4] border-b border-x border-black" />
          <div class="h-2 w-6 bg-black" />
        </div>

        <!-- Category Header & Underline Tabs -->
        <div class="space-y-3 pt-2">
          <div class="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-500">
            <span class="flex items-center gap-1.5">
              <span class="h-2 w-2 bg-black inline-block" />
              KATEGORI POPULER
            </span>
            <RouterLink to="/events" class="text-black hover:underline normal-case text-xs font-semibold">
              Lihat Semua Kategori &rarr;
            </RouterLink>
          </div>

          <div class="flex items-center gap-5 sm:gap-6 overflow-x-auto border-b border-black/15 text-xs pb-px">
            <button
              v-for="cat in categories"
              :key="cat.key"
              @click="activeCategory = cat.key"
              class="pb-2.5 whitespace-nowrap transition-colors border-b-2 -mb-px cursor-pointer"
              :class="activeCategory === cat.key ? 'border-black font-bold text-black' : 'border-transparent text-slate-500 hover:text-black'"
            >
              {{ cat.label }}
            </button>
          </div>
        </div>

        <!-- Section Heading & Sub-filter Tabs -->
        <div class="reveal-section space-y-3 pt-1">
          <div class="flex items-center justify-between gap-4">
            <div>
              <h2 class="text-2xl sm:text-3xl tracking-tight text-black">
                <strong class="font-sans font-black">Jelajahi</strong>
                <span class="font-editorial font-normal"> &amp; Beli Tiket Event</span>
              </h2>
              <p class="text-xs text-slate-500 mt-0.5">
                Pilih acara sesuai minat Anda dan amankan kuota tiket sebelum kehabisan.
              </p>
            </div>

            <!-- Custom 3D Compass / Ticket Vector Icon -->
            <div class="hidden sm:flex h-11 w-11 rounded-2xl border border-black bg-[#fafaf9] shadow-[3px_3px_0px_#000] items-center justify-center shrink-0">
              <svg class="h-6 w-6" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="9" fill="#72a5e4" stroke="#000" stroke-width="1.8" />
                <polygon points="10,10 16,8 14,14 8,16" fill="#fff" stroke="#000" stroke-width="1.6" stroke-linejoin="round" />
              </svg>
            </div>
          </div>

          <div class="flex flex-wrap items-center gap-4 sm:gap-5 text-xs pt-1">
            <button
              v-for="tab in [
                { key: 'all', label: 'Semua' },
                { key: 'hot', label: 'Paling Diminati' },
                { key: 'free', label: 'Gratis' },
                { key: 'paid', label: 'Berbayar' },
                { key: 'online', label: 'Online / Hybrid' }
              ]"
              :key="tab.key"
              @click="activeTab = tab.key"
              class="cursor-pointer transition-colors"
              :class="activeTab === tab.key ? 'font-bold text-black underline underline-offset-4' : 'text-slate-500 hover:text-black'"
            >
              {{ tab.label }}
            </button>
          </div>
        </div>

        <!-- Featured Split Card (Compact on Mobile, Rich Split on Desktop) -->
        <div
          v-if="featuredEvent"
          class="reveal-section luxury-card rounded-2xl border border-black overflow-hidden grid grid-cols-12 bg-[#72a5e4]"
        >
          <div class="col-span-5 md:col-span-6 bg-black min-h-[130px] sm:min-h-[180px] md:min-h-[240px] border-r border-black overflow-hidden">
            <img
              :src="featuredEvent.poster_url"
              :alt="featuredEvent.title"
              class="w-full h-full object-cover hover:scale-103 transition-transform duration-500"
            />
          </div>
          <div class="col-span-7 md:col-span-6 p-3 sm:p-5 md:p-7 flex flex-col justify-between text-black space-y-2.5 sm:space-y-4 md:space-y-6">
            <div class="space-y-1 sm:space-y-2">
              <span class="text-[8px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-900 block truncate">
                FEATURED • {{ (featuredEvent.location_type || 'HYBRID').toUpperCase() }}
              </span>
              <h3 class="text-xs sm:text-xl md:text-2xl font-bold tracking-tight text-black leading-snug line-clamp-2">
                {{ featuredEvent.title }}
              </h3>
              <p class="text-[10px] sm:text-xs text-slate-900 truncate">
                {{ formatDate(featuredEvent.start_date || featuredEvent.start_at) }} • {{ featuredEvent.venue_name || featuredEvent.location_name }}
              </p>
              <p class="hidden sm:block text-xs text-slate-800">
                Oleh {{ featuredEvent.organization?.name || featuredEvent.organization_name || 'Nusantara Tech Community' }}
              </p>
            </div>

            <div class="space-y-1.5 sm:space-y-3">
              <div class="hidden sm:flex justify-end text-[11px] font-bold text-black">
                <span>Sisa Kuota: {{ getEventMeta(featuredEvent).remaining }}</span>
              </div>
              <div class="pt-1.5 sm:pt-3 border-t border-black/25 flex items-center justify-between gap-2">
                <div class="min-w-0">
                  <span class="text-[8px] sm:text-[9px] font-bold uppercase tracking-wider text-slate-800 block">MULAI DARI</span>
                  <span class="text-xs sm:text-lg font-black text-black truncate block">{{ getEventMeta(featuredEvent).priceLabel }}</span>
                </div>
                <RouterLink
                  :to="`/events/${featuredEvent.slug || featuredEvent.id}`"
                  class="luxury-pill rounded-full bg-black px-3 py-1 sm:px-6 sm:py-2 text-[10px] sm:text-xs font-bold text-white shrink-0"
                >
                  Beli Tiket &rarr;
                </RouterLink>
              </div>
            </div>
          </div>
        </div>

        <!-- Compact 2-3 Column Ticket Grid on Mobile -> Sleek Horizontal Rows on Desktop -->
        <div class="reveal-section grid grid-cols-2 min-[480px]:grid-cols-3 gap-2.5 sm:grid-cols-1 sm:gap-0 sm:divide-y sm:divide-black/15 sm:border-t sm:border-black/15">
          <div
            v-for="evt in catalogRows"
            :key="evt.id"
            class="group rounded-xl border border-black bg-white p-2.5 flex flex-col justify-between gap-2 sm:rounded-none sm:border-0 sm:bg-transparent sm:p-0 sm:py-5 sm:flex-row sm:items-center sm:gap-5 hover:bg-white/60 sm:px-2 sm:-mx-2 transition-colors"
          >
            <div class="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-5 flex-1 w-full min-w-0">
              <RouterLink
                :to="`/events/${evt.slug || evt.id}`"
                class="w-full h-20 sm:w-44 sm:h-28 rounded-lg sm:rounded-xl overflow-hidden border border-black shrink-0 bg-black block"
              >
                <img :src="evt.poster_url" :alt="evt.title" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
              </RouterLink>

              <div class="space-y-0.5 sm:space-y-1 min-w-0 w-full">
                <span class="text-[8px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-400 block truncate">
                  {{ evt.category }} • {{ (evt.location_type || 'OFFLINE').toUpperCase() }}
                </span>
                <RouterLink
                  :to="`/events/${evt.slug || evt.id}`"
                  class="text-xs sm:text-base font-bold text-black group-hover:underline block leading-snug line-clamp-2"
                >
                  {{ evt.title }}
                </RouterLink>
                <p class="text-[10px] sm:text-xs text-slate-600 truncate">
                  {{ formatDate(evt.start_date || evt.start_at) }} • {{ evt.venue_name || evt.location_name }}
                </p>
                <p class="hidden sm:block text-[11px] text-slate-500">
                  {{ evt.organization?.name || evt.organization_name || 'Nusantara Tech Community' }}
                </p>
                <RouterLink
                  :to="`/events/${evt.slug || evt.id}`"
                  class="hidden sm:inline-block text-[11px] font-bold text-black hover:underline pt-1"
                >
                  Detail Event &rarr;
                </RouterLink>
              </div>
            </div>

            <!-- Right Quota Bar, Price & Blue Pill CTA -->
            <div class="w-full sm:w-52 shrink-0 space-y-1.5 sm:space-y-2 pt-1.5 sm:pt-0 border-t border-black/10 sm:border-t-0">
              <div class="space-y-0.5 sm:space-y-1">
                <div class="flex justify-between text-[9px] sm:text-[10px] text-slate-600">
                  <span class="hidden sm:inline">Terjual {{ getEventMeta(evt).soldPct }}%</span>
                  <span class="font-bold text-black">Sisa {{ getEventMeta(evt).remaining }} kursi</span>
                </div>
                <div class="h-1 w-full bg-black/15 rounded-full overflow-hidden">
                  <div class="h-full bg-black transition-all duration-500" :style="{ width: `${getEventMeta(evt).soldPct}%` }" />
                </div>
              </div>

              <div class="flex sm:block items-center justify-between gap-1">
                <span class="hidden sm:block text-[9px] uppercase font-bold text-slate-400">HARGA TIKET</span>
                <span class="text-xs sm:text-sm font-black text-black truncate">{{ getEventMeta(evt).priceLabel }}</span>
              </div>

              <RouterLink
                :to="`/events/${evt.slug || evt.id}`"
                class="luxury-pill block w-full text-center rounded-full border border-black bg-[#72a5e4] py-1 sm:py-1.5 text-[10px] sm:text-xs font-bold text-black"
              >
                Beli Tiket
              </RouterLink>
            </div>
          </div>
        </div>

        <!-- Interlocking Stepped Pixel Bridge into Section 4 (Location Bar) -->
        <div class="pt-4 flex items-end justify-between">
          <div class="flex items-end">
            <div class="h-4 w-10 bg-[#72a5e4] border-t border-x border-black" />
            <div class="h-2.5 w-16 bg-black" />
          </div>
          <div class="flex items-end">
            <div class="h-3 w-14 bg-black" />
            <div class="h-5 w-8 bg-black" />
          </div>
        </div>
      </div>
    </section>

    <!-- =================================================================== -->
    <!-- 4. CARI EVENT BERDASARKAN LOKASI (WITH CUSTOM CITY EMBLEMS)         -->
    <!-- =================================================================== -->
    <section class="relative border-y border-black bg-[#72a5e4] text-black z-10">
      <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 border-x border-black/25 relative">
        <span class="pointer-events-none hidden sm:block absolute -top-2 -left-[5px] text-xs font-mono text-black leading-none">+</span>
        <span class="pointer-events-none hidden sm:block absolute -top-2 -right-[5px] text-xs font-mono text-black leading-none">+</span>

        <div class="reveal-section grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-6 items-start">
          <div class="col-span-2 sm:col-span-3 md:col-span-1 flex items-start gap-2.5">
            <div class="h-8 w-8 rounded-lg border border-black bg-white shadow-[2px_2px_0px_#000] flex items-center justify-center shrink-0 mt-0.5">
              <MapPin class="h-4 w-4 text-black" />
            </div>
            <h3 class="text-base font-bold text-black leading-snug">
              Cari Event<br class="hidden md:inline" />
              Berdasarkan<br class="hidden md:inline" />
              Lokasi
            </h3>
          </div>

          <button
            v-for="loc in [
              { city: 'Jakarta', desc: 'Konferensi, Konser & Expo' },
              { city: 'Bandung', desc: 'Workshop Kreatif & Seni' },
              { city: 'Bali', desc: 'Meetup & Festival Internasional' },
              { city: 'Online', desc: 'Bootcamp & Webinar Nasional' }
            ]"
            :key="loc.city"
            @click="quickSearch(loc.city)"
            class="text-left md:border-l border-black/25 md:pl-5 space-y-1 group cursor-pointer"
          >
            <p class="text-xl font-editorial text-black group-hover:underline">{{ loc.city }}</p>
            <p class="text-[11px] text-slate-900">{{ loc.desc }}</p>
            <ArrowUpRight class="h-3.5 w-3.5 text-black mt-2 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </button>
        </div>
      </div>
    </section>

    <!-- =================================================================== -->
    <!-- 5 & 6. UNIFIED ORGANIZER PROMOTOR + BLACK MODULAR ENGINE SECTION    -->
    <!-- =================================================================== -->
    <section id="about" class="relative z-10">
      <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-6 border-x border-black/15 space-y-10 relative">
        <div class="hidden sm:flex items-start absolute top-0 right-10">
          <div class="h-2.5 w-8 bg-black" />
          <div class="h-4 w-12 bg-[#72a5e4] border-b border-x border-black" />
        </div>

        <!-- Official Organizer & Promotor -->
        <div class="reveal-section space-y-6">
          <div class="space-y-1">
            <h2 class="text-xl sm:text-2xl font-bold tracking-tight text-black">
              Official Organizer &amp; Promotor
            </h2>
            <p class="text-xs text-slate-500">
              Penyelenggara terverifikasi dengan standar kualitas acara terbaik.
            </p>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
            <div
              v-for="org in store.organizations"
              :key="org.id"
              class="group border-b border-black/20 pb-5 flex items-start gap-4 hover:border-black transition-colors"
            >
              <img
                :src="org.logo_url"
                :alt="org.name"
                class="h-12 w-12 rounded-xl border border-black object-cover shrink-0 bg-white group-hover:scale-105 transition-transform"
              />
              <div class="flex-1 space-y-1">
                <div class="flex items-center justify-between gap-2">
                  <h4 class="text-sm font-bold text-black">{{ org.name }}</h4>
                  <span class="text-[11px] font-bold text-black shrink-0">✓ Verified</span>
                </div>
                <p class="text-xs text-slate-600 line-clamp-2">{{ org.description }}</p>
                <RouterLink
                  :to="`/organizers/${org.slug}`"
                  class="inline-block text-[11px] font-bold text-black hover:underline pt-1"
                >
                  Lihat Profil &rarr;
                </RouterLink>
              </div>
            </div>
          </div>
        </div>

        <!-- Architectural Spine Connector into the Black Box -->
        <div class="reveal-section relative pt-2">
          <div class="flex items-end justify-between px-6">
            <div class="flex items-end">
              <div class="h-3 w-12 bg-black" />
              <div class="h-5 w-8 bg-[#72a5e4] border-t border-x border-black" />
            </div>
            <div class="h-6 w-px bg-black/30" />
            <div class="flex items-end">
              <div class="h-4 w-16 bg-black" />
            </div>
          </div>

          <!-- Black Container: E-Commerce Tiket Publik & Sistem Modular with Custom Vector Pillar Icons -->
          <div class="relative bg-black text-white p-6 sm:p-12 space-y-8 sm:space-y-10 overflow-hidden border border-black">
            <div class="absolute top-0 left-0 flex flex-col">
              <div class="h-2.5 w-6 bg-[#72a5e4]" />
              <div class="h-2.5 w-3 bg-[#72a5e4]" />
            </div>
            <div class="absolute bottom-0 right-0 flex flex-col items-end">
              <div class="h-2.5 w-3 bg-[#72a5e4]" />
              <div class="h-2.5 w-6 bg-[#72a5e4]" />
            </div>

            <div class="grid grid-cols-1 md:grid-cols-12 gap-6 sm:gap-8 items-start relative z-10">
              <div class="md:col-span-6 space-y-2">
                <span class="text-[9px] font-bold uppercase tracking-widest text-[#72a5e4] block">
                  ABOUT TERRA
                </span>
                <h2 class="text-2xl sm:text-3xl leading-tight text-white">
                  <strong class="font-sans font-bold block">E-Commerce Tiket Publik</strong>
                  <strong class="font-sans font-bold block">&amp; Sistem Manajemen</strong>
                  <span class="font-editorial font-normal block">Event Modular</span>
                </h2>
              </div>
              <div class="md:col-span-6 md:pt-5">
                <p class="text-xs text-slate-300 leading-relaxed">
                  TERRA menggabungkan kemudahan marketplace tiket untuk pengunjung dengan sistem informasi manajemen kepanitiaan untuk penyelenggara. Setiap event dapat mengaktifkan hingga 13 modul operasional sesuai skala acara.
                </p>
              </div>
            </div>

            <!-- 4 Pillars with Bespoke Vector Emblems -->
            <div class="grid grid-cols-2 md:grid-cols-4 gap-6 pt-8 border-t border-white/15 relative z-10">
              <div class="space-y-2">
                <svg class="h-7 w-7" viewBox="0 0 28 28" fill="none">
                  <rect x="3" y="3" width="9" height="9" rx="2" fill="#72a5e4" stroke="#fff" stroke-width="1.5" />
                  <rect x="16" y="3" width="9" height="9" rx="2" fill="#000" stroke="#72a5e4" stroke-width="1.5" />
                  <rect x="3" y="16" width="9" height="9" rx="2" fill="#000" stroke="#72a5e4" stroke-width="1.5" />
                  <rect x="16" y="16" width="9" height="9" rx="2" fill="#72a5e4" stroke="#fff" stroke-width="1.5" />
                </svg>
                <p class="text-lg sm:text-xl font-editorial text-white">13 Modul</p>
                <p class="text-[11px] text-slate-400 leading-relaxed">Aktifkan hanya fitur yang dibutuhkan event Anda.</p>
              </div>

              <div class="space-y-2">
                <svg class="h-7 w-7" viewBox="0 0 28 28" fill="none">
                  <path d="M4 9V5H9M19 5H24V9M24 19V23H19M9 23H4V19" stroke="#72a5e4" stroke-width="2" stroke-linecap="round" />
                  <rect x="9" y="9" width="10" height="10" rx="2" fill="#72a5e4" />
                  <path d="M12 14L13.5 15.5L16.5 12.5" stroke="#000" stroke-width="2" stroke-linecap="round" />
                </svg>
                <p class="text-lg sm:text-xl font-editorial text-white">Anti-Double</p>
                <p class="text-[11px] text-slate-400 leading-relaxed">Validasi QR code atomik mencegah tiket ganda di gate.</p>
              </div>

              <div class="space-y-2">
                <svg class="h-7 w-7" viewBox="0 0 28 28" fill="none">
                  <circle cx="14" cy="7" r="4" fill="#72a5e4" />
                  <circle cx="7" cy="21" r="4" fill="#fff" />
                  <circle cx="21" cy="21" r="4" fill="#72a5e4" />
                  <path d="M11.5 10.5L8.5 17.5M16.5 10.5L19.5 17.5M11 21H17" stroke="#72a5e4" stroke-width="1.8" />
                </svg>
                <p class="text-lg sm:text-xl font-editorial text-white">Multi-Org</p>
                <p class="text-[11px] text-slate-400 leading-relaxed">Satu akun organizer dapat mengelola banyak organisasi.</p>
              </div>

              <div class="space-y-2">
                <svg class="h-7 w-7" viewBox="0 0 28 28" fill="none">
                  <path d="M15 3L6 15H14L13 25L22 13H14L15 3Z" fill="#72a5e4" stroke="#fff" stroke-width="1.5" stroke-linejoin="round" />
                </svg>
                <p class="text-lg sm:text-xl font-editorial text-white">Real-Time</p>
                <p class="text-[11px] text-slate-400 leading-relaxed">Penjualan tiket berbayar otomatis tercatat di modul Finance.</p>
              </div>
            </div>
          </div>

          <!-- Stepped Bottom Connector flowing out of Black Box into Cara Kerja -->
          <div class="flex items-start justify-between px-8">
            <div class="flex items-start">
              <div class="h-4 w-14 bg-black" />
              <div class="h-2.5 w-8 bg-[#72a5e4] border-b border-r border-black" />
            </div>
            <div class="h-6 w-px bg-black/30" />
            <div class="flex items-start">
              <div class="h-3 w-10 bg-black" />
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- =================================================================== -->
    <!-- 7. CARA KERJA TERRA (CONNECTED VIA ARCHITECTURAL RAILS & SPINE)     -->
    <!-- =================================================================== -->
    <section id="how-it-works" class="relative z-10">
      <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-0 border-x border-black/15 space-y-6 relative">
        <span class="pointer-events-none hidden sm:block absolute top-0 -left-[5px] text-xs font-mono text-black/40 leading-none">+</span>
        <span class="pointer-events-none hidden sm:block absolute top-0 -right-[5px] text-xs font-mono text-black/40 leading-none">+</span>

        <div class="reveal-section space-y-1">
          <h2 class="text-2xl sm:text-3xl tracking-tight text-black">
            <strong class="font-sans font-black">Cara Kerja</strong>
            <span class="font-editorial font-normal"> TERRA</span>
          </h2>
          <p class="text-xs text-slate-500">
            Alur penggunaan yang dirancang jelas untuk pembeli tiket maupun penyelenggara.
          </p>
        </div>

        <div class="reveal-section grid grid-cols-1 md:grid-cols-2 gap-8 sm:gap-10 pt-4 border-t border-black/15">
          <!-- Left: Untuk Peserta -->
          <div class="space-y-4 flex flex-col justify-between md:pr-4">
            <div class="space-y-3">
              <div class="flex items-center gap-2.5">
                <div class="h-8 w-8 rounded-lg border border-black bg-[#72a5e4] shadow-[2px_2px_0px_#000] flex items-center justify-center shrink-0">
                  <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <rect x="3" y="6" width="18" height="12" rx="2" fill="#fff" stroke="#000" stroke-width="2" />
                    <circle cx="12" cy="12" r="2" fill="#000" />
                  </svg>
                </div>
                <span class="text-[9px] font-bold uppercase tracking-widest text-slate-500">ALUR PESERTA</span>
              </div>
              <h3 class="text-base font-bold text-black">Untuk Pembeli Tiket &amp; Peserta</h3>
              <p class="text-xs text-slate-600 leading-relaxed">
                Temukan event publik, pilih jenis tiket yang tersedia, lakukan checkout, dan dapatkan e-ticket ber-QR code unik yang langsung siap dipindai di lokasi acara.
              </p>
              <div class="space-y-2 pt-2 text-xs">
                <div>
                  <p class="font-bold text-black">1. Pilih Event &amp; Jenis Tiket</p>
                  <p class="text-[11px] text-slate-500">Tersedia tiket gratis komunitas maupun VIP berbayar.</p>
                </div>
                <div>
                  <p class="font-bold text-black">2. Terima Tiket QR Digital Instan</p>
                  <p class="text-[11px] text-slate-500">Tunjukkan QR code di halaman Tiket Saya saat check-in.</p>
                </div>
              </div>
            </div>

            <div class="flex flex-wrap items-center gap-3 pt-3">
              <RouterLink
                to="/events"
                class="luxury-pill rounded-full border border-black bg-[#72a5e4] px-5 py-2 text-xs font-bold text-black"
              >
                Cari Tiket Event
              </RouterLink>
              <RouterLink
                to="/login"
                class="luxury-pill rounded-full border border-black bg-white px-5 py-2 text-xs font-semibold text-black"
              >
                Login Peserta
              </RouterLink>
            </div>
          </div>

          <!-- Right: Untuk Organizer -->
          <div class="space-y-4 flex flex-col justify-between md:border-l md:border-black/15 md:pl-8">
            <div class="space-y-3">
              <div class="flex items-center gap-2.5">
                <div class="h-8 w-8 rounded-lg border border-black bg-black text-white shadow-[2px_2px_0px_#72a5e4] flex items-center justify-center shrink-0">
                  <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <rect x="3" y="3" width="7" height="7" rx="1.5" fill="#72a5e4" />
                    <rect x="14" y="3" width="7" height="7" rx="1.5" fill="#fff" />
                    <rect x="3" y="14" width="7" height="7" rx="1.5" fill="#fff" />
                    <rect x="14" y="14" width="7" height="7" rx="1.5" fill="#72a5e4" />
                  </svg>
                </div>
                <span class="text-[9px] font-bold uppercase tracking-widest text-slate-500">ALUR ORGANIZER</span>
              </div>
              <h3 class="text-base font-bold text-black">Untuk Penyelenggara (Organizer)</h3>
              <p class="text-xs text-slate-600 leading-relaxed">
                Kelola siklus acara dari nol: susun WBS Timeline, tugas panitia Kanban, RBAC tim, kuota tiket, vendor, keuangan otomatis, hingga QR gate check-in scanner.
              </p>
              <div class="space-y-2 pt-2 text-xs">
                <div>
                  <p class="font-bold text-black">1. Buat Event &amp; Aktifkan Modul</p>
                  <p class="text-[11px] text-slate-500">Pilih dari 13 modul sesuai kebutuhan kompleksitas acara.</p>
                </div>
                <div>
                  <p class="font-bold text-black">2. Publikasikan &amp; Pantau Operasional</p>
                  <p class="text-[11px] text-slate-500">Pantau penjualan tiket dan laporan keuangan real-time.</p>
                </div>
              </div>
            </div>

            <div class="flex flex-wrap items-center gap-3 pt-3">
              <RouterLink
                to="/organizer/login"
                class="luxury-pill rounded-full border border-black bg-[#72a5e4] px-5 py-2 text-xs font-bold text-black"
              >
                Masuk Organizer Studio
              </RouterLink>
              <RouterLink
                to="/organizer/register"
                class="luxury-pill rounded-full border border-black bg-white px-5 py-2 text-xs font-semibold text-black"
              >
                Daftar Organizer
              </RouterLink>
            </div>
          </div>
        </div>

        <!-- Interlocking Stepped Bridge into Pricing Section -->
        <div class="pt-6 flex items-end justify-between">
          <div class="flex items-end">
            <div class="h-3 w-16 bg-black" />
            <div class="h-5 w-10 bg-black" />
          </div>
          <div class="flex items-end">
            <div class="h-4 w-12 bg-[#72a5e4] border-t border-x border-black" />
            <div class="h-2.5 w-8 bg-black" />
          </div>
        </div>
      </div>
    </section>

    <!-- =================================================================== -->
    <!-- 8. TRANSPARAN UNTUK PESERTA & ORGANIZER (CONNECTED TO FOOTER)       -->
    <!-- =================================================================== -->
    <section id="pricing" class="relative border-y border-black bg-[#72a5e4] text-black z-10">
      <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12 border-x border-black/25 space-y-6 relative">
        <span class="pointer-events-none hidden sm:block absolute -top-2 -left-[5px] text-xs font-mono text-black leading-none">+</span>
        <span class="pointer-events-none hidden sm:block absolute -top-2 -right-[5px] text-xs font-mono text-black leading-none">+</span>

        <div class="reveal-section space-y-1">
          <span class="text-[9px] font-bold uppercase tracking-widest text-slate-900 block">PRICING</span>
          <h2 class="text-2xl sm:text-3xl tracking-tight text-black">
            <strong class="font-sans font-black">Transparan untuk</strong>
            <span class="font-editorial font-normal"> Peserta &amp; Organizer</span>
          </h2>
          <p class="text-xs text-slate-900">
            Skema biaya yang jujur dan mendukung pertumbuhan komunitas.
          </p>
        </div>

        <div class="reveal-section divide-y divide-black/25 border-y border-black/25">
          <div class="py-5 grid grid-cols-1 md:grid-cols-12 gap-3 sm:gap-4 items-center">
            <div class="md:col-span-4">
              <h4 class="text-xs font-bold text-black">Pembeli Tiket &amp; Peserta</h4>
            </div>
            <div class="md:col-span-3">
              <span class="text-2xl font-editorial text-black block leading-none">Rp 0</span>
              <span class="text-[10px] text-slate-900">Biaya Akun</span>
            </div>
            <div class="md:col-span-5">
              <p class="text-xs text-slate-900 leading-relaxed">
                Registrasi akun peserta, penyimpanan tiket QR digital, dan pemesanan event gratis tidak dikenakan biaya platform.
              </p>
            </div>
          </div>

          <div class="py-5 grid grid-cols-1 md:grid-cols-12 gap-3 sm:gap-4 items-center">
            <div class="md:col-span-4">
              <h4 class="text-xs font-bold text-black">Organizer &amp; Komunitas</h4>
            </div>
            <div class="md:col-span-3">
              <span class="text-2xl font-editorial text-black block leading-none">Gratis</span>
              <span class="text-[10px] text-slate-900">Event Gratis</span>
            </div>
            <div class="md:col-span-5">
              <p class="text-xs text-slate-900 leading-relaxed">
                Gunakan seluruh 13 modul manajemen event secara gratis untuk acara komunitas tanpa tiket berbayar, atau upgrade per event mulai Rp49.000.
              </p>
            </div>
          </div>
        </div>

        <div class="pt-2 flex justify-end">
          <RouterLink
            to="/pricing"
            class="luxury-pill rounded-full border border-black bg-black px-6 py-2.5 text-xs font-bold text-white"
          >
            Lihat Semua Paket &amp; Opsi Pembayaran &rarr;
          </RouterLink>
        </div>
      </div>
    </section>
  </div>
</template>

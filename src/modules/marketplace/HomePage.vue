<script setup>
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import { useEventWorkspaceStore } from '@/stores/eventWorkspace'
import { formatDate, formatCurrency } from '@/utils/formatters'
import BubbleGraffiti from '@/components/common/BubbleGraffiti.vue'
import {
  Search,
  MapPin,
  ArrowUpRight,
  QrCode,
  Layers,
  ShieldCheck,
  Sparkles
} from 'lucide-vue-next'

const router = useRouter()
const store = useEventWorkspaceStore()

const searchQuery = ref('')
const selectedCity = ref('')
const activeCategory = ref('All')
const activeTab = ref('all')
const activeRoleFlow = ref('customer')
const scrollY = ref(0)

const categories = computed(() => [
  { key: 'All', label: 'Semua' },
  ...store.categories.map((c) => ({ key: c.name, label: c.name }))
])

const publishedEvents = computed(() =>
  store.events.filter((e) => e.publication_status === 'Published')
)

const featuredEvent = computed(() => publishedEvents.value[0] || store.events[0])

const catalogCards = computed(() => {
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
  return list.slice(0, 6)
})

const roleFlows = {
  customer: {
    badge: 'ALUR PESERTA',
    ctaLabel: 'Jelajahi Event',
    ctaTo: '/events',
    secondaryLabel: 'Tiket Saya',
    secondaryTo: '/my-tickets',
    steps: [
      {
        num: '01',
        title: 'Pilih Acara & Tiket',
        desc: 'Temukan konser, festival kampus, atau workshop sesuai minatmu.'
      },
      {
        num: '02',
        title: 'Checkout Instan',
        desc: 'Tiket gratis langsung aktif; tiket berbayar diverifikasi cepat.'
      },
      {
        num: '03',
        title: 'Scan QR di Gate',
        desc: 'Terima PDF & email E-Ticket berlogo acara, siap dipindai.'
      }
    ]
  },
  organizer: {
    badge: 'ALUR ORGANIZER',
    ctaLabel: 'Buka Organizer Studio',
    ctaTo: '/organizer/login',
    secondaryLabel: 'Daftar Organizer',
    secondaryTo: '/organizer/register',
    steps: [
      {
        num: '01',
        title: 'Aktifkan Modul Acara',
        desc: 'Pilih dari 13 modul: Timeline WBS, Kanban, RBAC Tim, hingga RAB.'
      },
      {
        num: '02',
        title: 'Publikasi & Jual Tiket',
        desc: 'Atur tier tiket dan pantau pemasukan otomatis secara real-time.'
      },
      {
        num: '03',
        title: 'Fullscreen Gate Scanner',
        desc: 'Validasi kehadiran peserta dengan kamera QR anti-duplikasi.'
      }
    ]
  }
}

function getEventMeta(evt) {
  const types = evt.ticket_types || []
  if (!types.length) {
    return { minPrice: 0, remaining: 35, priceLabel: 'Gratis' }
  }
  const prices = types.map((t) => Number(t.price))
  const minPrice = Math.min(...prices)
  const totalQuota = types.reduce((s, t) => s + Number(t.quantity), 0)
  const totalSold = types.reduce((s, t) => s + Number(t.sold_quantity), 0)
  const remaining = Math.max(0, totalQuota - totalSold)
  return {
    minPrice,
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

function observeRevealSections() {
  if (!observer) {
    document.querySelectorAll('.reveal-section').forEach((el) => el.classList.add('is-visible'))
    return
  }
  document.querySelectorAll('.reveal-section:not(.is-visible)').forEach((el) => {
    observer.observe(el)
  })
}

watch(
  () => [featuredEvent.value?.id, store.events.length],
  () => {
    nextTick(() => {
      observeRevealSections()
    })
  }
)

onMounted(() => {
  window.addEventListener('scroll', handleWindowScroll, { passive: true })
  if (typeof IntersectionObserver !== 'undefined') {
    observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible')
          }
        })
      },
      { threshold: 0.05 }
    )
  }
  observeRevealSections()
})

onBeforeUnmount(() => {
  window.removeEventListener('scroll', handleWindowScroll)
  if (observer) observer.disconnect()
})
</script>

<template>
  <div class="relative overflow-hidden selection:bg-[#72a5e4] selection:text-black">
    <!-- =================================================================== -->
    <!-- 1. CLEAN HERO SECTION (VISUAL GRAFFITI + COMPACT SEARCH)            -->
    <!-- =================================================================== -->
    <section class="relative min-h-[92dvh] flex flex-col items-center justify-center overflow-visible">
      <div class="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-[3vh] relative z-10 space-y-[2.5vh] flex flex-col justify-center">
        <!-- Minimal Top Header -->
        <div class="flex flex-col items-center text-center space-y-2 relative z-20">
          <div class="inline-flex items-center gap-2 rounded-full border border-black bg-white px-3.5 py-1 shadow-[2px_2px_0px_#000]">
            <span class="h-2 w-2 rounded-full bg-[#72a5e4] border border-black" />
            <span class="text-[10px] font-black uppercase tracking-widest text-black">
              TICKETING &amp; MODULAR EVENT ECOSYSTEM
            </span>
          </div>
        </div>

        <!-- Center Pure Vector SVG Bubble Graffiti Art ("TERRA" + Connected Ribbons + Floating Motion Chips) -->
        <div class="relative z-30 pointer-events-none">
          <!-- Floating Kinetic Chips (Desktop & Tablet) - Symmetrical Left/Right -->
          <div
            class="hidden sm:inline-flex items-center gap-1.5 absolute -top-2 left-6 z-40 rounded-full border border-black bg-[#72a5e4] px-3 py-1 text-[10px] font-black text-black shadow-[2px_2px_0px_#000] animate-float-slow"
          >
            <QrCode class="h-3 w-3" />
            <span>INSTANT QR PASS</span>
          </div>
          <div
            class="hidden sm:inline-flex items-center gap-1.5 absolute -bottom-1 right-6 z-40 rounded-full border border-black bg-white px-3 py-1 text-[10px] font-black text-black shadow-[2px_2px_0px_#000] animate-float-slow"
            style="animation-delay: -2.5s"
          >
            <Sparkles class="h-3 w-3 text-[#72a5e4]" />
            <span>13 MODULAR ENGINES</span>
          </div>

          <BubbleGraffiti full-bleed :scroll-offset="scrollY" />
        </div>

        <!-- Concise Headline + Clean Search Pill -->
        <div class="max-w-3xl mx-auto text-center space-y-4 relative z-20 pt-2">
          <h1 class="text-2xl sm:text-4xl font-black tracking-tight text-black font-sans leading-tight">
            Tiket Konser, Festival Kampus &amp;
            <span class="font-editorial font-normal underline decoration-[#72a5e4] decoration-4 underline-offset-4">
              Ruang Kerja Event
            </span>
          </h1>

          <form
            @submit.prevent="handleSearch"
            class="luxury-card flex flex-col sm:flex-row items-stretch sm:items-center rounded-2xl sm:rounded-full border-2 border-black bg-white p-1.5 gap-2 sm:gap-0 shadow-[4px_4px_0px_#000]"
          >
            <div class="flex items-center flex-1 pl-3.5 py-1 sm:py-0">
              <Search class="h-4 w-4 text-slate-400 shrink-0" />
              <input
                v-model="searchQuery"
                type="text"
                placeholder="Cari konser, DEMAFEST, workshop..."
                class="w-full bg-transparent px-2.5 py-1.5 text-xs sm:text-sm text-black placeholder:text-slate-400 focus:outline-hidden"
              />
            </div>

            <div class="flex items-center border-t sm:border-t-0 sm:border-l border-black/15 px-3 py-1.5 sm:py-1">
              <MapPin class="h-3.5 w-3.5 text-slate-400 mr-1.5 shrink-0" />
              <select
                v-model="selectedCity"
                class="w-full sm:w-auto bg-transparent text-xs font-semibold text-slate-700 focus:outline-hidden pr-3 cursor-pointer"
              >
                <option value="">Semua Lokasi</option>
                <option value="Yogyakarta">Yogyakarta</option>
                <option value="Jakarta">Jakarta</option>
                <option value="Bandung">Bandung</option>
                <option value="Bali">Bali</option>
                <option value="Online">Online</option>
              </select>
            </div>

            <button
              type="submit"
              class="shimmer-sheen luxury-pill rounded-full bg-black px-6 py-3 sm:py-2.5 text-xs font-bold text-white hover:bg-slate-800 transition-colors shrink-0 cursor-pointer"
            >
              Cari Tiket
            </button>
          </form>

          <!-- Compact Quick Tags & Location Pills (Swipeable on Mobile) -->
          <div class="flex items-center sm:justify-center gap-2 overflow-x-auto no-scrollbar snap-x snap-mandatory py-1 px-1 text-[11px]">
            <button
              v-for="tag in ['DEMAFEST', 'Tech Summit', 'Konser', 'Workshop', 'Gratis']"
              :key="tag"
              @click="quickSearch(tag)"
              class="snap-start shrink-0 luxury-pill rounded-full border border-black bg-white px-3.5 py-1.5 sm:py-1 font-semibold text-black cursor-pointer"
            >
              {{ tag }}
            </button>
          </div>
        </div>
      </div>

      <!-- Kinetic Marquee Ticker + 3-Highlight Strip -->
      <div class="border-t border-black bg-black text-white py-2 overflow-hidden relative z-10 select-none">
        <div class="animate-marquee flex items-center gap-7 text-[10px] font-bold uppercase tracking-[0.18em]">
          <template v-for="n in 2" :key="n">
            <span class="flex items-center gap-2"><span class="h-2 w-2 rounded-full bg-[#72a5e4]" /> E-TICKET PDF &amp; EMAIL BERLOGO EVENT</span>
            <span>✦</span>
            <span class="flex items-center gap-2"><span class="h-2 w-2 rounded-full bg-[#72a5e4]" /> FULLSCREEN LIVE QR GATE SCANNER</span>
            <span>✦</span>
            <span class="flex items-center gap-2"><span class="h-2 w-2 rounded-full bg-[#72a5e4]" /> 13 MODULAR EVENT WORKSPACE</span>
            <span>✦</span>
            <span class="flex items-center gap-2"><span class="h-2 w-2 rounded-full bg-[#72a5e4]" /> 100% VERIFIED ORGANIZER</span>
            <span>✦</span>
          </template>
        </div>
      </div>

      <div class="border-y border-black bg-[#72a5e4] text-black relative z-10">
        <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center justify-center sm:justify-between gap-3 text-xs font-bold">
          <span class="inline-flex items-center gap-2">
            <QrCode class="h-4 w-4" />
            E-Ticket PDF &amp; Email Berlogo Event
          </span>
          <span class="hidden sm:inline text-black/40">•</span>
          <span class="inline-flex items-center gap-2">
            <ShieldCheck class="h-4 w-4" />
            100% Organizer Terverifikasi
          </span>
          <span class="hidden sm:inline text-black/40">•</span>
          <span class="inline-flex items-center gap-2">
            <Layers class="h-4 w-4" />
            13 Modul Manajemen Kepanitiaan
          </span>
        </div>
      </div>
    </section>

    <!-- =================================================================== -->
    <!-- 2. VISUAL EVENT SHOWCASE (CLEAN POSTER CARDS, MINIMAL TEXT)         -->
    <!-- =================================================================== -->
    <section class="relative z-10 py-[7vh]">
      <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-[3.5vh]">
        <!-- Section Title + Filter Pills -->
        <div class="reveal-section flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <span class="text-[10px] font-black uppercase tracking-widest text-slate-500 block">
              MARKETPLACE
            </span>
            <h2 class="text-2xl sm:text-3xl font-black tracking-tight text-black">
              Event <span class="font-editorial font-normal">Pilihan Minggu Ini</span>
            </h2>
          </div>

          <div class="flex flex-wrap items-center gap-1.5">
            <button
              v-for="tab in [
                { key: 'all', label: 'Semua' },
                { key: 'free', label: 'Gratis' },
                { key: 'paid', label: 'Berbayar' },
                { key: 'online', label: 'Online' }
              ]"
              :key="tab.key"
              @click="activeTab = tab.key"
              class="rounded-full border border-black px-3.5 py-1 text-xs font-bold transition-colors cursor-pointer"
              :class="activeTab === tab.key ? 'bg-black text-white' : 'bg-white text-black hover:bg-slate-100'"
            >
              {{ tab.label }}
            </button>
          </div>
        </div>

        <!-- Category Chips (Mobile Swipeable Rail) -->
        <div class="flex items-center gap-2 overflow-x-auto no-scrollbar snap-x snap-mandatory pb-1 text-xs">
          <button
            v-for="cat in categories"
            :key="cat.key"
            @click="activeCategory = cat.key"
            class="snap-start shrink-0 luxury-pill rounded-full border border-black px-4 py-1.5 whitespace-nowrap font-semibold cursor-pointer"
            :class="activeCategory === cat.key ? 'bg-[#72a5e4] text-black font-bold shadow-[2px_2px_0px_#000]' : 'bg-white text-slate-700 hover:text-black'"
          >
            {{ cat.label }}
          </button>
        </div>

        <!-- Featured Hero Event Card -->
        <RouterLink
          v-if="featuredEvent"
          :to="`/events/${featuredEvent.slug || featuredEvent.id}`"
          class="reveal-section is-visible luxury-card group rounded-3xl border-2 border-black overflow-hidden grid grid-cols-1 md:grid-cols-12 bg-[#72a5e4] shadow-[5px_5px_0px_#000]"
        >
          <div class="md:col-span-6 aspect-video md:aspect-auto bg-black border-b md:border-b-0 md:border-r border-black overflow-hidden">
            <img
              :src="featuredEvent.poster_url"
              :alt="featuredEvent.title"
              class="w-full h-full object-cover group-hover:scale-103 transition-transform duration-500"
            />
          </div>
          <div class="md:col-span-6 p-5 sm:p-7 flex flex-col justify-between text-black space-y-4">
            <div class="space-y-2">
              <div class="flex items-center gap-2">
                <span class="rounded-full border border-black bg-white px-3 py-0.5 text-[10px] font-black uppercase">
                  FEATURED
                </span>
                <span class="text-[11px] font-bold uppercase text-slate-900">
                  {{ featuredEvent.category }}
                </span>
              </div>
              <h3 class="text-xl sm:text-2xl font-black tracking-tight text-black leading-snug group-hover:underline">
                {{ featuredEvent.title }}
              </h3>
              <p class="text-xs font-semibold text-slate-900">
                {{ formatDate(featuredEvent.start_date || featuredEvent.start_at) }} •
                {{ featuredEvent.venue_name || featuredEvent.location_name }}
              </p>
            </div>

            <div class="pt-4 border-t border-black/20 flex items-center justify-between gap-3">
              <div>
                <span class="text-[9px] font-bold uppercase tracking-wider text-slate-800 block">TIKET MULAI</span>
                <span class="text-lg font-black text-black">{{ getEventMeta(featuredEvent).priceLabel }}</span>
              </div>
              <span class="luxury-pill rounded-full bg-black px-5 py-2 text-xs font-bold text-white">
                Beli Tiket &rarr;
              </span>
            </div>
          </div>
        </RouterLink>

        <!-- Clean 3-Column Poster Grid with Animated Filter Transitions -->
        <TransitionGroup
          name="card-grid"
          tag="div"
          class="reveal-section grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
        >
          <RouterLink
            v-for="evt in catalogCards"
            :key="evt.id"
            :to="`/events/${evt.slug || evt.id}`"
            class="luxury-card group rounded-2xl border-2 border-black bg-white overflow-hidden flex flex-col justify-between shadow-[3px_3px_0px_#000]"
          >
            <div>
              <div class="relative aspect-video bg-black border-b border-black overflow-hidden">
                <img
                  :src="evt.poster_url"
                  :alt="evt.title"
                  class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <span class="absolute top-2.5 left-2.5 rounded-full border border-black bg-white px-2.5 py-0.5 text-[10px] font-bold text-black">
                  {{ evt.category }}
                </span>
              </div>

              <div class="p-4 space-y-1.5">
                <h3 class="text-sm font-bold text-black group-hover:underline line-clamp-2 leading-snug">
                  {{ evt.title }}
                </h3>
                <p class="text-[11px] text-slate-600 truncate">
                  {{ formatDate(evt.start_date || evt.start_at) }} • {{ evt.venue_name || evt.location_name }}
                </p>
              </div>
            </div>

            <div class="px-4 py-3 border-t border-black/10 bg-[#fafaf9] flex items-center justify-between">
              <span class="text-xs font-black text-black">{{ getEventMeta(evt).priceLabel }}</span>
              <span class="text-[11px] font-bold text-black group-hover:translate-x-0.5 transition-transform">
                Detail &rarr;
              </span>
            </div>
          </RouterLink>
        </TransitionGroup>

        <div class="flex justify-center pt-1">
          <RouterLink
            to="/events"
            class="luxury-pill inline-flex items-center gap-2 rounded-full border-2 border-black bg-white px-6 py-2.5 text-xs font-bold text-black shadow-[3px_3px_0px_#000]"
          >
            Lihat Semua Event di Marketplace &rarr;
          </RouterLink>
        </div>
      </div>
    </section>

    <!-- =================================================================== -->
    <!-- 3. ABOUT TERRA & CARA KERJA (CLEAN BENTO GRID + TAB SWITCHER)       -->
    <!-- =================================================================== -->
    <section id="about" class="relative z-10 py-[7vh] border-t border-black/15 scroll-mt-[8vh]">
      <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-[4vh]">
        <!-- Minimal Section Header -->
        <div class="reveal-section flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div class="space-y-1.5">
            <span class="inline-flex items-center gap-1.5 rounded-full border border-black bg-[#72a5e4] px-3 py-0.5 text-[10px] font-black uppercase tracking-wider text-black">
              <Sparkles class="h-3 w-3" />
              ABOUT TERRA
            </span>
            <h2 class="text-2xl sm:text-3xl font-black tracking-tight text-black">
              Satu Ekosistem untuk <span class="font-editorial font-normal">Tiket &amp; Kepanitiaan</span>
            </h2>
          </div>
          <p class="text-xs text-slate-600 max-w-sm">
            Menggantikan spreadsheet, grup chat, dan form manual dengan 13 modul operasional yang terhubung langsung ke marketplace tiket.
          </p>
        </div>

        <!-- Bento Grid (3 Visual Cards) -->
        <div class="reveal-section grid grid-cols-1 md:grid-cols-12 gap-5">
          <!-- Bento 1: Main Black Card -->
          <div class="md:col-span-6 rounded-3xl border-2 border-black bg-black text-white p-6 sm:p-7 shadow-[4px_4px_0px_#72a5e4] flex flex-col justify-between space-y-6">
            <div class="space-y-2">
              <span class="text-[10px] font-bold uppercase tracking-widest text-[#72a5e4]">
                MODULAR ENGINE
              </span>
              <h3 class="text-xl sm:text-2xl font-bold leading-snug">
                13 Modul Kepanitiaan Sesuai Skala Acara
              </h3>
              <p class="text-xs text-slate-300 leading-relaxed">
                Aktifkan modul Timeline WBS, Kanban, RBAC Tim, Keuangan, Vendor, Sponsor, hingga Survey Evaluasi dalam satu klik.
              </p>
            </div>

            <div class="grid grid-cols-3 gap-2.5 pt-2 border-t border-white/15 text-center">
              <div class="rounded-xl bg-white/10 p-2.5">
                <span class="text-lg font-black text-[#72a5e4] block">13</span>
                <span class="text-[10px] text-slate-300">Modul Event</span>
              </div>
              <div class="rounded-xl bg-white/10 p-2.5">
                <span class="text-lg font-black text-white block">3</span>
                <span class="text-[10px] text-slate-300">Portal Akses</span>
              </div>
              <div class="rounded-xl bg-white/10 p-2.5">
                <span class="text-lg font-black text-[#72a5e4] block">100%</span>
                <span class="text-[10px] text-slate-300">Real-Time</span>
              </div>
            </div>
          </div>

          <!-- Bento 2: Blue QR Boarding-Pass Card -->
          <div class="md:col-span-3 rounded-3xl border-2 border-black bg-[#72a5e4] text-black p-6 shadow-[4px_4px_0px_#000] flex flex-col justify-between space-y-4">
            <div class="h-10 w-10 rounded-xl border border-black bg-white flex items-center justify-center shadow-[2px_2px_0px_#000]">
              <QrCode class="h-5 w-5 text-black" />
            </div>
            <div class="space-y-1.5">
              <h3 class="text-base font-black leading-snug">
                Branded QR Boarding-Pass
              </h3>
              <p class="text-xs text-slate-900 leading-relaxed">
                PDF &amp; Email E-Ticket otomatis menampilkan logo resmi acara di tengah QR Code.
              </p>
            </div>
          </div>

          <!-- Bento 3: White Fullscreen Scanner & RBAC Card -->
          <div class="md:col-span-3 rounded-3xl border-2 border-black bg-white text-black p-6 shadow-[4px_4px_0px_#000] flex flex-col justify-between space-y-4">
            <div class="h-10 w-10 rounded-xl border border-black bg-[#fafaf9] flex items-center justify-center shadow-[2px_2px_0px_#000]">
              <ShieldCheck class="h-5 w-5 text-black" />
            </div>
            <div class="space-y-1.5">
              <h3 class="text-base font-black leading-snug">
                Anti-Double Gate Check-in
              </h3>
              <p class="text-xs text-slate-600 leading-relaxed">
                Scanner kamera layar penuh dengan kunci kuota atomik mencegah duplikasi tiket.
              </p>
            </div>
          </div>
        </div>

        <!-- Interactive Cara Kerja Tab Switcher (Replaces Long 2-Column Text Wall) -->
        <div id="how-it-works" class="reveal-section rounded-3xl border-2 border-black bg-white p-6 sm:p-8 shadow-[4px_4px_0px_#000] space-y-6 scroll-mt-20">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-black/10 pb-4">
            <div>
              <span class="text-[10px] font-black uppercase tracking-widest text-slate-400 block">
                CARA KERJA TERRA
              </span>
              <h3 class="text-lg sm:text-xl font-black text-black">
                3 Langkah Mudah Memulai
              </h3>
            </div>

            <!-- Role Pill Toggle -->
            <div class="inline-flex rounded-full border border-black bg-[#fafaf9] p-1 self-start">
              <button
                type="button"
                @click="activeRoleFlow = 'customer'"
                class="rounded-full px-4 py-1.5 text-xs font-bold transition-colors cursor-pointer"
                :class="activeRoleFlow === 'customer' ? 'bg-[#72a5e4] border border-black text-black' : 'text-slate-600 hover:text-black'"
              >
                Pembeli Tiket
              </button>
              <button
                type="button"
                @click="activeRoleFlow = 'organizer'"
                class="rounded-full px-4 py-1.5 text-xs font-bold transition-colors cursor-pointer"
                :class="activeRoleFlow === 'organizer' ? 'bg-black text-white' : 'text-slate-600 hover:text-black'"
              >
                Organizer Acara
              </button>
            </div>
          </div>

          <Transition name="tab-slide" mode="out-in">
            <div :key="activeRoleFlow" class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div
                v-for="step in roleFlows[activeRoleFlow].steps"
                :key="step.num"
                class="luxury-card rounded-2xl border border-black bg-[#fafaf9] p-4 space-y-2"
              >
                <span class="inline-block rounded-lg border border-black bg-[#72a5e4] px-2.5 py-0.5 text-xs font-black text-black">
                  {{ step.num }}
                </span>
                <h4 class="text-sm font-bold text-black">{{ step.title }}</h4>
                <p class="text-xs text-slate-600 leading-relaxed">{{ step.desc }}</p>
              </div>
            </div>
          </Transition>

          <div class="flex flex-wrap items-center justify-between gap-3 pt-2">
            <!-- Verified Organizers Compact Pill Row -->
            <div class="flex flex-wrap items-center gap-2">
              <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400 mr-1">
                Verified EO:
              </span>
              <RouterLink
                v-for="org in store.organizations.slice(0, 3)"
                :key="org.id"
                :to="`/organizers/${org.slug}`"
                class="inline-flex items-center gap-1.5 rounded-full border border-black bg-[#fafaf9] px-3 py-1 text-[11px] font-bold text-black hover:bg-[#72a5e4]/30 transition-colors"
              >
                <img :src="org.logo_url" :alt="org.name" class="h-4 w-4 rounded-full object-cover border border-black" />
                <span class="truncate max-w-[140px]">{{ org.name }}</span>
                <ArrowUpRight class="h-3 w-3" />
              </RouterLink>
            </div>

            <div class="flex items-center gap-2">
              <RouterLink
                :to="roleFlows[activeRoleFlow].secondaryTo"
                class="luxury-pill rounded-full border border-black bg-white px-4 py-2 text-xs font-semibold text-black"
              >
                {{ roleFlows[activeRoleFlow].secondaryLabel }}
              </RouterLink>
              <RouterLink
                :to="roleFlows[activeRoleFlow].ctaTo"
                class="luxury-pill rounded-full border border-black bg-[#72a5e4] px-5 py-2 text-xs font-bold text-black"
              >
                {{ roleFlows[activeRoleFlow].ctaLabel }} &rarr;
              </RouterLink>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

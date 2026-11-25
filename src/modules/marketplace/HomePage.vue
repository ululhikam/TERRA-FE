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
  ShieldCheck
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
  const isFiltered = activeCategory.value !== 'All' || activeTab.value !== 'all'
  let list = isFiltered ? [...publishedEvents.value] : publishedEvents.value.slice(1)
  if (activeCategory.value !== 'All') {
    list = list.filter((e) => e.category === activeCategory.value)
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

const moduleGroups = [
  {
    phase: 'Perencanaan',
    items: ['Profil Acara', 'Timeline WBS', 'Tugas Kanban', 'Tim & Akses']
  },
  {
    phase: 'Tiket & Gate',
    items: ['Tiket QR & PDF', 'Daftar Peserta', 'Gate Scanner']
  },
  {
    phase: 'Keuangan & Relasi',
    items: ['Keuangan & RAB', 'Vendor', 'Sponsor', 'Dokumen', 'Laporan', 'Survei']
  }
]

const roleFlows = {
  customer: {
    ctaLabel: 'Jelajahi Event',
    ctaTo: '/events',
    secondaryLabel: 'Tiket Saya',
    secondaryTo: '/my-tickets',
    steps: [
      {
        num: '01',
        title: 'Pilih Acara & Tiket',
        desc: 'Temukan konser, festival kampus, atau workshop resmi sesuai minat Anda.'
      },
      {
        num: '02',
        title: 'Checkout Instan',
        desc: 'Tiket gratis langsung aktif; tiket berbayar terverifikasi cepat dan transparan.'
      },
      {
        num: '03',
        title: 'Scan QR di Gate',
        desc: 'Terima email beserta QR Code dan file PDF siap pindai saat masuk lokasi.'
      }
    ]
  },
  organizer: {
    ctaLabel: 'Buka Organizer Studio',
    ctaTo: '/organizer/login',
    secondaryLabel: 'Daftar Organizer',
    secondaryTo: '/organizer/register',
    steps: [
      {
        num: '01',
        title: 'Aktifkan Modul Acara',
        desc: 'Pilih dari 13 modul: Timeline WBS, Kanban, RBAC Tim, hingga keuangan RAB.'
      },
      {
        num: '02',
        title: 'Publikasi & Jual Tiket',
        desc: 'Atur tier kuota tiket dan pantau pemasukan tercatat otomatis secara real-time.'
      },
      {
        num: '03',
        title: 'Gate Check-in Scanner',
        desc: 'Validasi kehadiran peserta dengan kamera atau unggah gambar QR anti-duplikasi.'
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
    <!-- 1. HERO SECTION (FOCUSED GRAFFITI CENTERPIECE + SEARCH COMMAND)     -->
    <!-- =================================================================== -->
    <section class="relative sm:min-h-[82dvh] flex flex-col justify-between overflow-visible">
      <div class="w-full max-w-[1080px] mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-8 sm:py-10 relative z-10 flex-1 flex flex-col justify-center space-y-6">
        <!-- Center Pure Vector SVG Bubble Graffiti Art ("TERRA" + Scroll-Growing Roots) -->
        <div class="relative z-10 pointer-events-none">
          <BubbleGraffiti full-bleed :scroll-offset="scrollY" />
        </div>

        <!-- Confident Headline + Search Command Bar -->
        <div class="max-w-2xl mx-auto w-full text-center space-y-4 relative z-30">
          <div class="space-y-2">
            <h1 class="text-2xl sm:text-4xl md:text-[42px] font-extrabold tracking-tight text-black leading-[1.12]">
              Satu platform untuk tiket acara &amp; operasional kepanitiaan.
            </h1>
            <p class="max-w-xl mx-auto text-xs sm:text-sm text-slate-600 leading-relaxed">
              Temukan konser, festival kampus, dan workshop resmi dengan e-ticket QR &amp; PDF instan, terhubung langsung dengan 13 modul studio panitia.
            </p>
          </div>

          <!-- Search Command Bar -->
          <form
            @submit.prevent="handleSearch"
            class="flex items-center rounded-full border-2 border-black bg-white p-1.5 pl-4 gap-2 shadow-[4px_4px_0px_#000]"
          >
            <Search class="h-4 w-4 text-slate-400 shrink-0" />
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Cari konser, DEMAFEST, workshop..."
              class="w-full min-w-0 bg-transparent px-1 py-1.5 text-xs sm:text-sm text-black placeholder:text-slate-400 focus:outline-hidden"
            />

            <div class="hidden sm:flex items-center border-l border-black/15 pl-3 pr-1 shrink-0">
              <MapPin class="h-3.5 w-3.5 text-slate-400 mr-1.5 shrink-0" />
              <div class="relative inline-flex items-center">
                <select
                  v-model="selectedCity"
                  aria-label="Filter Lokasi Event"
                  class="terra-select bg-transparent text-xs font-semibold text-slate-700 focus:outline-hidden appearance-none pr-5 cursor-pointer"
                >
                  <option value="">Semua Lokasi</option>
                  <option value="Yogyakarta">Yogyakarta</option>
                  <option value="Jakarta">Jakarta</option>
                  <option value="Bandung">Bandung</option>
                  <option value="Bali">Bali</option>
                  <option value="Online">Online</option>
                </select>
                <ChevronDown class="pointer-events-none absolute right-0.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
              </div>
            </div>

            <button
              type="submit"
              class="shimmer-sheen luxury-pill rounded-full bg-black px-5 sm:px-6 py-2.5 text-xs font-bold text-white hover:bg-slate-800 transition-colors shrink-0 cursor-pointer"
            >
              Cari Acara
            </button>
          </form>

          <!-- Clean Quick-Filter Pills -->
          <div class="flex flex-wrap items-center justify-center gap-1.5 text-[11px]">
            <button
              v-for="tag in [
                { label: 'DEMAFEST', query: 'DEMAFEST' },
                { label: 'Tech Summit', query: 'Tech Summit' },
                { label: 'Konser', query: 'Konser' },
                { label: 'Workshop', query: 'Workshop' },
                { label: 'Tiket Gratis', query: 'Gratis' }
              ]"
              :key="tag.label"
              type="button"
              @click="quickSearch(tag.query)"
              class="luxury-pill rounded-full border border-black/25 bg-white px-3 py-1 font-medium text-slate-700 hover:border-black hover:text-black cursor-pointer"
            >
              {{ tag.label }}
            </button>
          </div>
        </div>
      </div>

      <!-- Single Architectural Proof Strip -->
      <div class="w-full border-y border-black bg-[#72a5e4] text-black relative z-10">
        <div class="max-w-[1080px] mx-auto px-4 sm:px-6 lg:px-8 py-3 grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 text-xs font-semibold">
          <div class="flex items-center sm:justify-start gap-2">
            <QrCode class="h-4 w-4 shrink-0" />
            <span>E-Ticket QR &amp; PDF instan</span>
          </div>
          <div class="flex items-center sm:justify-center gap-2 sm:border-x sm:border-black/20">
            <ShieldCheck class="h-4 w-4 shrink-0" />
            <span>Penyelenggara terverifikasi</span>
          </div>
          <div class="flex items-center sm:justify-end gap-2">
            <Layers class="h-4 w-4 shrink-0" />
            <span>13 modul ruang kerja panitia</span>
          </div>
        </div>
      </div>
    </section>

    <!-- =================================================================== -->
    <!-- 2. VISUAL EVENT SHOWCASE (PROGRAMME GRID)                           -->
    <!-- =================================================================== -->
    <section class="relative z-10 py-14 sm:py-20">
      <div class="max-w-[1080px] mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <!-- Left-Aligned Section Title + Segmented Filter Tabs -->
        <div class="reveal-section flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div class="space-y-1">
            <h2 class="text-2xl sm:text-3xl font-extrabold tracking-tight text-black">
              Jadwal &amp; Acara Pilihan
            </h2>
            <p class="text-xs sm:text-sm text-slate-600">
              Acara publik pilihan dari penyelenggara terverifikasi di seluruh Indonesia.
            </p>
          </div>

          <div class="inline-flex flex-wrap items-center gap-1 rounded-full border border-black bg-white p-1 self-start sm:self-auto">
            <button
              v-for="tab in [
                { key: 'all', label: 'Semua' },
                { key: 'free', label: 'Gratis' },
                { key: 'paid', label: 'Berbayar' },
                { key: 'online', label: 'Online' }
              ]"
              :key="tab.key"
              type="button"
              @click="activeTab = tab.key"
              class="rounded-full px-3.5 py-1 text-xs font-semibold transition-colors cursor-pointer"
              :class="activeTab === tab.key ? 'bg-black text-white' : 'text-slate-700 hover:text-black'"
            >
              {{ tab.label }}
            </button>
          </div>
        </div>

        <!-- Category Chips (Swipeable Rail) -->
        <div class="flex items-center gap-2 overflow-x-auto no-scrollbar snap-x snap-mandatory pb-1 text-xs">
          <button
            v-for="cat in categories"
            :key="cat.key"
            type="button"
            @click="activeCategory = cat.key"
            class="snap-start shrink-0 rounded-full border px-3.5 py-1.5 whitespace-nowrap font-semibold transition-colors cursor-pointer"
            :class="activeCategory === cat.key ? 'border-black bg-[#72a5e4] text-black font-bold' : 'border-black/20 bg-white text-slate-600 hover:border-black hover:text-black'"
          >
            {{ cat.label }}
          </button>
        </div>

        <!-- Featured Event Split Card (Festival Programme Feature) -->
        <RouterLink
          v-if="featuredEvent"
          :to="`/events/${featuredEvent.slug || featuredEvent.id}`"
          class="reveal-section is-visible luxury-card group rounded-2xl border-2 border-black overflow-hidden grid grid-cols-1 md:grid-cols-12 bg-white shadow-[4px_4px_0px_#000]"
        >
          <div class="relative md:col-span-7 aspect-[16/10] bg-black border-b md:border-b-0 md:border-r border-black overflow-hidden">
            <img
              :src="featuredEvent.poster_url"
              :alt="featuredEvent.title"
              class="w-full h-full object-cover group-hover:scale-103 transition-transform duration-500"
            />
            <span class="absolute top-3 left-3 rounded-full border border-black bg-[#72a5e4] px-3 py-0.5 text-[11px] font-bold text-black">
              Sorotan Utama
            </span>
          </div>

          <div class="md:col-span-5 p-5 sm:p-7 flex flex-col justify-between bg-[#72a5e4] text-black space-y-5">
            <div class="space-y-2.5">
              <span class="inline-block rounded-full border border-black bg-white px-3 py-0.5 text-[11px] font-semibold text-black">
                {{ featuredEvent.category }}
              </span>
              <h3 class="text-xl sm:text-2xl font-extrabold tracking-tight text-black leading-snug group-hover:underline">
                {{ featuredEvent.title }}
              </h3>
              <div class="space-y-1 text-xs font-medium text-slate-900">
                <p class="font-mono text-[11px]">{{ formatDate(featuredEvent.start_date || featuredEvent.start_at) }}</p>
                <p>{{ featuredEvent.venue_name || featuredEvent.location_name }}</p>
                <p v-if="featuredEvent.organization?.name || featuredEvent.organization_name" class="text-slate-800">
                  Oleh {{ featuredEvent.organization?.name || featuredEvent.organization_name }}
                </p>
              </div>
            </div>

            <div class="pt-4 border-t-2 border-dashed border-black/25 flex items-center justify-between gap-3">
              <div>
                <span class="text-[11px] font-medium text-slate-900 block">Tiket mulai dari</span>
                <span class="font-mono text-lg sm:text-xl font-bold text-black">{{ getEventMeta(featuredEvent).priceLabel }}</span>
              </div>
              <span class="luxury-pill rounded-full bg-black px-5 py-2.5 text-xs font-bold text-white shrink-0">
                Lihat &amp; Beli Tiket
              </span>
            </div>
          </div>
        </RouterLink>

        <!-- 3-Column Programme Grid -->
        <TransitionGroup
          v-if="catalogCards.length"
          name="card-grid"
          tag="div"
          class="reveal-section is-visible grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
        >
          <RouterLink
            v-for="evt in catalogCards"
            :key="evt.id"
            :to="`/events/${evt.slug || evt.id}`"
            class="luxury-card group rounded-2xl border border-black bg-white overflow-hidden flex flex-col justify-between"
          >
            <div class="relative aspect-[16/10] bg-black border-b border-black overflow-hidden">
              <img
                :src="evt.poster_url"
                :alt="evt.title"
                class="w-full h-full object-cover group-hover:scale-103 transition-transform duration-300"
              />
              <span class="absolute top-2.5 left-2.5 rounded-full border border-black bg-white/95 px-2.5 py-0.5 text-[11px] font-semibold text-black">
                {{ evt.category }}
              </span>
            </div>

            <div class="p-4 flex-1 flex flex-col justify-between space-y-4">
              <div class="space-y-1.5">
                <p class="font-mono text-[11px] text-slate-500">
                  {{ formatDate(evt.start_date || evt.start_at) }}
                </p>
                <h3 class="text-sm sm:text-base font-bold text-black group-hover:underline line-clamp-2 leading-snug">
                  {{ evt.title }}
                </h3>
                <p class="text-xs text-slate-600 truncate">
                  {{ evt.venue_name || evt.location_name }}
                </p>
              </div>

              <div class="pt-3 border-t border-black/10 flex items-center justify-between">
                <span class="font-mono text-xs sm:text-sm font-bold text-black">{{ getEventMeta(evt).priceLabel }}</span>
                <span class="text-[11px] font-medium text-slate-500">
                  Sisa {{ getEventMeta(evt).remaining }} kursi
                </span>
              </div>
            </div>
          </RouterLink>
        </TransitionGroup>

        <!-- Filter Empty State -->
        <div
          v-else
          class="rounded-2xl border border-dashed border-black/40 bg-white p-8 text-center space-y-3"
        >
          <p class="text-xs sm:text-sm font-semibold text-slate-700">Belum ada acara yang cocok dengan filter ini.</p>
          <button
            type="button"
            @click="activeCategory = 'All'; activeTab = 'all'"
            class="luxury-pill rounded-full border border-black bg-[#72a5e4] px-4 py-1.5 text-xs font-bold text-black cursor-pointer"
          >
            Tampilkan Semua Acara
          </button>
        </div>

        <div class="flex justify-start sm:justify-end pt-1">
          <RouterLink
            to="/events"
            class="luxury-pill inline-flex items-center gap-2 rounded-full border border-black bg-white px-5 py-2.5 text-xs font-bold text-black"
          >
            Lihat seluruh katalog acara
          </RouterLink>
        </div>
      </div>
    </section>

    <!-- =================================================================== -->
    <!-- 3. EKOSISTEM & CARA KERJA (12-COL ARCHITECTURAL BENTO)              -->
    <!-- =================================================================== -->
    <section id="about" class="relative z-10 py-14 sm:py-20 border-t border-black/15 scroll-mt-16">
      <div class="max-w-[1080px] mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        <!-- Left-Aligned Section Header -->
        <div class="reveal-section flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div class="space-y-1.5 max-w-xl">
            <h2 class="text-2xl sm:text-3xl font-extrabold tracking-tight text-black">
              Ekosistem terpadu tiket &amp; ruang kerja panitia
            </h2>
            <p class="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Menggantikan spreadsheet terpisah dan form manual dengan 13 modul operasional yang terhubung langsung ke penjualan tiket publik.
            </p>
          </div>
          <RouterLink
            to="/pricing"
            class="text-xs font-bold text-black underline underline-offset-4 hover:opacity-75 shrink-0"
          >
            Lihat skema harga per acara
          </RouterLink>
        </div>

        <!-- 12-Column Bento Grid -->
        <div class="reveal-section grid grid-cols-1 md:grid-cols-12 gap-5">
          <!-- Cols 1-7: Dark Studio Card Grouping 13 Modular Engines by Phase -->
          <div class="md:col-span-7 rounded-2xl border-2 border-black bg-black text-white p-6 sm:p-8 flex flex-col justify-between space-y-6">
            <div class="space-y-2">
              <span class="inline-block rounded-full border border-white/25 px-3 py-0.5 text-[11px] font-semibold text-[#72a5e4]">
                13 Modul Kepanitiaan
              </span>
              <h3 class="text-xl sm:text-2xl font-bold leading-snug">
                Aktifkan fitur sesuai skala acara
              </h3>
              <p class="text-xs text-slate-300 leading-relaxed max-w-[54ch]">
                Setiap acara memiliki ruang kerja modular yang bisa dinyalakan atau dimatikan kapan saja tanpa kehilangan data historis.
              </p>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-white/15">
              <div v-for="group in moduleGroups" :key="group.phase" class="space-y-2">
                <p class="text-xs font-bold text-[#72a5e4]">{{ group.phase }}</p>
                <ul class="space-y-1 text-xs text-slate-300">
                  <li v-for="item in group.items" :key="item">• {{ item }}</li>
                </ul>
              </div>
            </div>
          </div>

          <!-- Cols 8-12: Stacked Pair of Focused Value Cards -->
          <div class="md:col-span-5 flex flex-col gap-5">
            <div class="flex-1 rounded-2xl border border-black bg-[#72a5e4] text-black p-6 flex flex-col justify-between space-y-4">
              <div class="h-10 w-10 rounded-xl border border-black bg-white flex items-center justify-center">
                <QrCode class="h-5 w-5 text-black" />
              </div>
              <div class="space-y-1.5">
                <h3 class="text-base sm:text-lg font-bold leading-snug">
                  Tiket QR &amp; PDF otomatis di email
                </h3>
                <p class="text-xs text-slate-900 leading-relaxed">
                  Setelah checkout, sistem menerbitkan QR Code unik dan mengirim file PDF siap cetak langsung ke email peserta.
                </p>
              </div>
            </div>

            <div class="flex-1 rounded-2xl border border-black bg-white text-black p-6 flex flex-col justify-between space-y-4">
              <div class="h-10 w-10 rounded-xl border border-black bg-[#fafaf9] flex items-center justify-center">
                <ShieldCheck class="h-5 w-5 text-black" />
              </div>
              <div class="space-y-1.5">
                <h3 class="text-base sm:text-lg font-bold leading-snug">
                  Validasi gate anti-duplikasi
                </h3>
                <p class="text-xs text-slate-600 leading-relaxed">
                  Pemindaian kamera langsung maupun unggah gambar QR memverifikasi keaslian tiket, kesesuaian acara, dan mencegah check-in ganda.
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- Cara Kerja Chronological Sequence -->
        <div id="how-it-works" class="reveal-section rounded-2xl border border-black bg-white p-6 sm:p-8 space-y-6 scroll-mt-20">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-black/10 pb-5">
            <div class="space-y-1">
              <h3 class="text-lg sm:text-xl font-extrabold text-black">
                Alur kerja dalam tiga langkah
              </h3>
              <p class="text-xs text-slate-600">
                Pilih peran di samping untuk melihat alur penggunaan bagi pembeli tiket maupun penyelenggara.
              </p>
            </div>

            <div class="grid grid-cols-2 sm:inline-flex w-full sm:w-auto rounded-full border border-black bg-[#fafaf9] p-1">
              <button
                type="button"
                @click="activeRoleFlow = 'customer'"
                class="rounded-full px-4 py-1.5 text-xs font-bold transition-colors cursor-pointer text-center"
                :class="activeRoleFlow === 'customer' ? 'bg-[#72a5e4] border border-black text-black' : 'text-slate-600 hover:text-black'"
              >
                Pembeli Tiket
              </button>
              <button
                type="button"
                @click="activeRoleFlow = 'organizer'"
                class="rounded-full px-4 py-1.5 text-xs font-bold transition-colors cursor-pointer text-center"
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
                class="rounded-xl border border-black/20 bg-[#fafaf9] p-5 flex sm:block items-start gap-3.5 sm:space-y-3"
              >
                <span class="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-black bg-[#72a5e4] font-mono text-xs font-bold text-black shrink-0">
                  {{ step.num }}
                </span>
                <div class="space-y-1 min-w-0">
                  <h4 class="text-sm font-bold text-black">{{ step.title }}</h4>
                  <p class="text-xs text-slate-600 leading-relaxed">{{ step.desc }}</p>
                </div>
              </div>
            </div>
          </Transition>

          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
            <!-- Verified Organizers Row -->
            <div v-if="store.organizations.length" class="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 sm:pb-0">
              <span class="text-xs font-medium text-slate-500 mr-1 shrink-0">
                Penyelenggara aktif:
              </span>
              <RouterLink
                v-for="org in store.organizations.slice(0, 3)"
                :key="org.id"
                :to="`/organizers/${org.slug}`"
                class="shrink-0 inline-flex items-center gap-1.5 rounded-full border border-black/25 bg-[#fafaf9] px-3 py-1 text-xs font-semibold text-black hover:border-black transition-colors"
              >
                <img :src="org.logo_url" :alt="org.name" class="h-4 w-4 rounded-full object-cover border border-black" />
                <span class="truncate max-w-[140px]">{{ org.name }}</span>
                <ArrowUpRight class="h-3 w-3 text-slate-500" />
              </RouterLink>
            </div>

            <div class="grid grid-cols-2 sm:flex items-center gap-2.5 w-full sm:w-auto">
              <RouterLink
                :to="roleFlows[activeRoleFlow].secondaryTo"
                class="luxury-pill text-center rounded-full border border-black bg-white px-4 py-2 text-xs font-semibold text-black whitespace-nowrap"
              >
                {{ roleFlows[activeRoleFlow].secondaryLabel }}
              </RouterLink>
              <RouterLink
                :to="roleFlows[activeRoleFlow].ctaTo"
                class="luxury-pill text-center rounded-full border border-black bg-[#72a5e4] px-5 py-2 text-xs font-bold text-black whitespace-nowrap"
              >
                {{ roleFlows[activeRoleFlow].ctaLabel }}
              </RouterLink>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useEventWorkspaceStore } from '@/stores/eventWorkspace'
import api from '@/services/api'
import { formatDate, formatCurrency } from '@/utils/formatters'
import { updatePageSeo, buildBreadcrumbJsonLd } from '@/utils/seo'
import EmptyState from '@/components/common/EmptyState.vue'
import ExploreEventCard from './components/ExploreEventCard.vue'
import {
  Search,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  X,
  Sparkles,
  Flame,
  GraduationCap,
  Calendar,
  MapPin,
  Compass,
  Music,
  Cpu,
  BookOpen,
  Briefcase,
  Users,
  Palette,
  Globe,
  Tag,
  Ticket,
  ShieldCheck,
  ArrowRight,
  Star,
  Film,
  Zap,
  Smile,
  Newspaper,
  Layers
} from 'lucide-vue-next'

const FALLBACK_POSTER =
  'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200&q=80'

const route = useRoute()
const authStore = useAuthStore()
const store = useEventWorkspaceStore()

// ---------------- FILTER & SEARCH STATE (100% PRESERVED) ----------------
const search = ref(String(route.query.q || ''))
const selectedCategory = ref(String(route.query.category || ''))
const selectedFormat = ref(String(route.query.format || ''))
const selectedPriceType = ref(String(route.query.price_type || ''))
const locationQuery = ref(String(route.query.location || ''))
const dateFrom = ref('')
const dateTo = ref('')
const sortBy = ref('upcoming')
const currentPage = ref(1)
const limit = 12
const advancedFiltersOpen = ref(false)
const showAllCatalog = ref(false)

watch(
  () => route.query,
  (q) => {
    if (q.q !== undefined) search.value = String(q.q || '')
    if (q.category !== undefined) selectedCategory.value = String(q.category || '')
    if (q.format !== undefined) selectedFormat.value = String(q.format || '')
    if (q.price_type !== undefined) selectedPriceType.value = String(q.price_type || '')
    if (q.location !== undefined) locationQuery.value = String(q.location || '')
  }
)

const activeFilterCount = computed(() =>
  [
    selectedCategory.value,
    selectedFormat.value,
    selectedPriceType.value,
    locationQuery.value.trim(),
    dateFrom.value,
    dateTo.value,
    sortBy.value !== 'upcoming' ? sortBy.value : ''
  ].filter(Boolean).length
)

const isFilterActive = computed(() =>
  Boolean(
    search.value.trim() ||
      selectedCategory.value ||
      selectedFormat.value ||
      selectedPriceType.value ||
      locationQuery.value.trim() ||
      dateFrom.value ||
      dateTo.value ||
      sortBy.value !== 'upcoming' ||
      currentPage.value > 1 ||
      showAllCatalog.value
  )
)

const activeFilterChips = computed(() => {
  const chips = []
  if (search.value.trim()) chips.push({ key: 'q', label: `Cari: "${search.value.trim()}"` })
  if (selectedCategory.value) chips.push({ key: 'category', label: selectedCategory.value })
  if (selectedFormat.value) chips.push({ key: 'format', label: `Format: ${selectedFormat.value}` })
  if (selectedPriceType.value) {
    chips.push({ key: 'price', label: selectedPriceType.value === 'free' ? 'Gratis' : 'Berbayar' })
  }
  if (locationQuery.value.trim()) {
    chips.push({ key: 'location', label: `Lokasi: ${locationQuery.value.trim()}` })
  }
  if (dateFrom.value || dateTo.value) {
    chips.push({ key: 'dates', label: `${dateFrom.value || '...'} – ${dateTo.value || '...'}` })
  }
  if (sortBy.value !== 'upcoming') {
    chips.push({ key: 'sort', label: sortBy.value === 'popular' ? 'Urut: Populer' : 'Urut: Terbaru' })
  }
  return chips
})

function clearFilterChip(key) {
  if (key === 'q') search.value = ''
  if (key === 'category') selectedCategory.value = ''
  if (key === 'format') selectedFormat.value = ''
  if (key === 'price') selectedPriceType.value = ''
  if (key === 'location') locationQuery.value = ''
  if (key === 'dates') {
    dateFrom.value = ''
    dateTo.value = ''
  }
  if (key === 'sort') sortBy.value = 'upcoming'
}

// ---------------- PAGINATED RESULTS STATE ----------------
const items = ref([])
const totalPages = ref(1)
const totalCount = ref(0)
const loading = ref(false)
let debounceTimer = null

watch(
  [search, selectedCategory, () => items.value.length],
  ([q, cat]) => {
    const trimmedQ = String(q || '').trim()
    let title = 'Jelajahi Event, Konser, Seminar & Festival Kampus | TERRA'
    let description =
      'Cari dan beli tiket resmi konser, festival kampus, seminar teknologi, dan workshop terbaru di seluruh Indonesia lewat TERRA.'

    if (trimmedQ && cat) {
      title = `Hasil "${trimmedQ}" (${cat}) — Jelajahi Event | TERRA`
    } else if (cat) {
      title = `Event ${cat} — Jelajahi Tiket Resmi | TERRA`
      description = `Temukan jadwal dan tiket resmi event kategori ${cat} dengan e-ticket QR instan di TERRA.`
    } else if (trimmedQ) {
      title = `Cari "${trimmedQ}" — Tiket Event Resmi | TERRA`
    }

    updatePageSeo({
      title,
      description,
      path: '/events',
      jsonLd: [
        buildBreadcrumbJsonLd([
          { name: 'Beranda', path: '/' },
          { name: 'Jelajahi Event', path: '/events' }
        ])
      ]
    })
  },
  { immediate: true }
)

async function fetchMarketplaceEvents() {
  loading.value = true
  try {
    const params = {
      page: currentPage.value,
      limit,
      sort: sortBy.value
    }
    if (search.value.trim()) params.q = search.value.trim()
    if (selectedCategory.value) params.category = selectedCategory.value
    if (selectedFormat.value) params.format = selectedFormat.value
    if (selectedPriceType.value) params.price_type = selectedPriceType.value
    if (locationQuery.value.trim()) params.location = locationQuery.value.trim()
    if (dateFrom.value) params.date_from = dateFrom.value
    if (dateTo.value) params.date_to = dateTo.value

    const res = await api.get('/marketplace/events', { params })
    items.value = Array.isArray(res?.data) ? res.data : []
    totalPages.value = Math.max(1, Number(res?.meta?.total_pages || 1))
    totalCount.value = Number(res?.meta?.total ?? items.value.length)
  } catch {
    items.value = store.events.filter((e) => e.publication_status === 'Published')
    totalPages.value = 1
    totalCount.value = items.value.length
  } finally {
    loading.value = false
  }
}

// ---------------- DISCOVERY SHELVES HYDRATION ----------------
const discoveryPool = ref([])
const featuredList = ref([])
const discoveryLoading = ref(true)

async function loadDiscoveryData() {
  discoveryLoading.value = true
  try {
    const jobs = [
      api.get('/marketplace/events', { params: { page: 1, limit: 50, sort: 'upcoming' } }),
      api.get('/marketplace/featured')
    ]
    if (!store.categories.length || !store.organizations.length) {
      jobs.push(store.fetchMarketplace())
    }
    const [poolRes, featRes] = await Promise.all(jobs)
    discoveryPool.value = Array.isArray(poolRes?.data)
      ? poolRes.data
      : store.events.filter((e) => e.publication_status === 'Published')
    featuredList.value = Array.isArray(featRes?.data) ? featRes.data : []
  } catch {
    discoveryPool.value = store.events.filter((e) => e.publication_status === 'Published')
    featuredList.value = discoveryPool.value.filter((e) => e.is_featured)
  } finally {
    discoveryLoading.value = false
    ensureValidScheduleTab()
  }
}

onMounted(() => {
  fetchMarketplaceEvents()
  loadDiscoveryData()
  startHeroTimer()
})

onBeforeUnmount(() => {
  stopHeroTimer()
  clearTimeout(debounceTimer)
})

watch([selectedCategory, selectedFormat, selectedPriceType, dateFrom, dateTo, sortBy], () => {
  currentPage.value = 1
  fetchMarketplaceEvents()
})

watch([search, locationQuery], () => {
  currentPage.value = 1
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(fetchMarketplaceEvents, 250)
})

watch(currentPage, () => {
  fetchMarketplaceEvents()
})

function resetFilters() {
  search.value = ''
  selectedCategory.value = ''
  selectedFormat.value = ''
  selectedPriceType.value = ''
  locationQuery.value = ''
  dateFrom.value = ''
  dateTo.value = ''
  sortBy.value = 'upcoming'
  currentPage.value = 1
  showAllCatalog.value = false
}

function applyQuickFilter(patch = {}) {
  if (patch.resetFirst) {
    search.value = ''
    selectedCategory.value = ''
    selectedFormat.value = ''
    selectedPriceType.value = ''
    locationQuery.value = ''
    dateFrom.value = ''
    dateTo.value = ''
    sortBy.value = 'upcoming'
  }
  if (patch.q !== undefined) search.value = patch.q
  if (patch.category !== undefined) selectedCategory.value = patch.category
  if (patch.format !== undefined) selectedFormat.value = patch.format
  if (patch.price_type !== undefined) selectedPriceType.value = patch.price_type
  if (patch.location !== undefined) locationQuery.value = patch.location
  if (patch.date_from !== undefined) dateFrom.value = patch.date_from
  if (patch.date_to !== undefined) dateTo.value = patch.date_to
  if (patch.sort !== undefined) sortBy.value = patch.sort
  if (patch.showAll) showAllCatalog.value = true
  currentPage.value = 1

  nextTick(() => {
    document
      .getElementById('explore-catalog-anchor')
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  })
}

function getPriceDisplay(evt) {
  const types = evt?.ticket_types || []
  if (!types.length) return 'Gratis'
  const prices = types.map((t) => Number(t.price || 0))
  const minPrice = Math.min(...prices)
  return minPrice === 0 ? 'Gratis' : formatCurrency(minPrice)
}

function getSoldCount(evt) {
  return (evt?.ticket_types || []).reduce((sum, t) => sum + Number(t.sold_quantity || 0), 0)
}

// ---------------- HERO CAROUSEL ----------------
const activeSlide = ref(0)
const heroPaused = ref(false)
let heroInterval = null

const allDiscoveryEvents = computed(() =>
  discoveryPool.value.length ? discoveryPool.value : items.value
)

const heroSlides = computed(() => {
  const merged = [...featuredList.value, ...allDiscoveryEvents.value]
  const seen = new Set()
  const unique = []
  for (const evt of merged) {
    if (!evt?.id || seen.has(evt.id)) continue
    seen.add(evt.id)
    unique.push(evt)
    if (unique.length >= 5) break
  }
  return unique
})

const currentHeroSlide = computed(() => heroSlides.value[activeSlide.value] || null)

function nextSlide() {
  if (!heroSlides.value.length) return
  activeSlide.value = (activeSlide.value + 1) % heroSlides.value.length
}

function prevSlide() {
  if (!heroSlides.value.length) return
  activeSlide.value = (activeSlide.value - 1 + heroSlides.value.length) % heroSlides.value.length
}

function goToSlide(idx) {
  activeSlide.value = idx
}

function startHeroTimer() {
  stopHeroTimer()
  heroInterval = setInterval(() => {
    if (!heroPaused.value && heroSlides.value.length > 1) {
      nextSlide()
    }
  }, 5000)
}

function stopHeroTimer() {
  if (heroInterval) {
    clearInterval(heroInterval)
    heroInterval = null
  }
}

watch(heroSlides, (slides) => {
  if (activeSlide.value >= slides.length) {
    activeSlide.value = 0
  }
})

// ---------------- CURATED SHELVES ----------------
const recommendedEvents = computed(() => allDiscoveryEvents.value.slice(0, 4))

const trendingEvents = computed(() => {
  const sorted = [...allDiscoveryEvents.value].sort((a, b) => {
    const diff = getSoldCount(b) - getSoldCount(a)
    if (diff !== 0) return diff
    return Number(Boolean(b.is_featured)) - Number(Boolean(a.is_featured))
  })
  return sorted.slice(0, 3)
})

const learningEvents = computed(() => {
  const matched = allDiscoveryEvents.value.filter((e) =>
    /workshop|edukasi|seminar|teknologi|startup|bisnis|karir/i.test(
      `${e.category || ''} ${e.title || ''}`
    )
  )
  return (matched.length ? matched : allDiscoveryEvents.value).slice(0, 4)
})

// ---------------- EVENT2GO SCHEDULE WIDGET ----------------
const scheduleTab = ref('all')

function parseEventDate(evt) {
  const raw = evt?.start_at || evt?.start_date
  if (!raw) return null
  const d = new Date(raw)
  return Number.isNaN(d.getTime()) ? null : d
}

const scheduleEventsByTab = computed(() => {
  const now = new Date()
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)
  const weekEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
  const monthEnd = new Date(now.getTime() + 31 * 24 * 60 * 60 * 1000)

  const sorted = [...allDiscoveryEvents.value].sort((a, b) => {
    const da = parseEventDate(a)?.getTime() || Number.MAX_SAFE_INTEGER
    const db = parseEventDate(b)?.getTime() || Number.MAX_SAFE_INTEGER
    return da - db
  })

  const todayList = sorted.filter((e) => {
    const d = parseEventDate(e)
    return d && d >= now && d <= todayEnd
  })
  const thisWeek = sorted.filter((e) => {
    const d = parseEventDate(e)
    return d && d >= now && d <= weekEnd
  })
  const thisMonth = sorted.filter((e) => {
    const d = parseEventDate(e)
    return d && d >= now && d <= monthEnd
  })

  return {
    all: sorted.slice(0, 4),
    today: (todayList.length ? todayList : sorted).slice(0, 4),
    this_week: (thisWeek.length ? thisWeek : sorted).slice(0, 4),
    this_month: (thisMonth.length ? thisMonth : sorted).slice(0, 4)
  }
})

function ensureValidScheduleTab() {
  scheduleTab.value = 'all'
}

const activeScheduleEvents = computed(() => {
  const buckets = scheduleEventsByTab.value
  return buckets[scheduleTab.value] || buckets.all
})

function getCalendarParts(dateStr) {
  const d = dateStr ? new Date(dateStr) : null
  if (!d || Number.isNaN(d.getTime())) {
    return { month: 'TBD', day: '--' }
  }
  try {
    const month = new Intl.DateTimeFormat('id-ID', { month: 'short' })
      .format(d)
      .toUpperCase()
      .replace('.', '')
    const day = new Intl.DateTimeFormat('id-ID', { day: '2-digit' }).format(d)
    return { month, day }
  } catch {
    return { month: 'EVT', day: String(d.getDate()) }
  }
}

// ---------------- CATEGORY ICONS (EXACT LOKET APPLIKE ROW) ----------------
const loketCategories = [
  {
    label: 'Konser & Festival',
    categoryName: 'Musik & Konser',
    icon: Music,
    gradient: 'from-amber-400 to-orange-500'
  },
  {
    label: 'Seminar & Talkshow',
    categoryName: 'Workshop & Edukasi',
    icon: Users,
    gradient: 'from-pink-400 to-rose-500'
  },
  {
    label: 'Exhibition & Expo',
    categoryName: 'Bisnis & Karir',
    icon: Tag,
    gradient: 'from-orange-400 to-amber-500'
  },
  {
    label: 'Teater & Seni',
    categoryName: 'Seni & Desain',
    icon: Palette,
    gradient: 'from-purple-500 to-indigo-600'
  },
  {
    label: 'Olahraga & Lari',
    categoryName: 'Komunitas & Sosial',
    icon: Zap,
    gradient: 'from-yellow-400 to-amber-500'
  },
  {
    label: 'Workshop & Kelas',
    categoryName: 'Workshop & Edukasi',
    icon: BookOpen,
    gradient: 'from-sky-400 to-blue-600'
  },
  {
    label: 'Online & Webinar',
    categoryName: '',
    format: 'online',
    icon: Globe,
    gradient: 'from-blue-500 to-indigo-700'
  },
  {
    label: 'Atraksi & Wisata',
    categoryName: 'Komunitas & Sosial',
    icon: Smile,
    gradient: 'from-rose-400 to-pink-600'
  },
  {
    label: 'Semua Kategori',
    categoryName: '',
    showAll: true,
    icon: Compass,
    gradient: 'from-orange-500 to-red-500'
  }
]

// ---------------- LOKÉT SCREEN (SPOTLIGHT 3 POSTERS + 1 BLUE CARD) ----------------
const screenPosters = computed(() => {
  const merged = [...featuredList.value, ...allDiscoveryEvents.value]
  const seen = new Set()
  const out = []
  for (const evt of merged) {
    if (!evt?.id || seen.has(evt.id)) continue
    seen.add(evt.id)
    out.push(evt)
    if (out.length >= 3) break
  }
  return out
})

const concertEvents = computed(() => {
  const matched = allDiscoveryEvents.value.filter((e) =>
    /musik|konser|seni|desain|festival|demafest/i.test(`${e.category || ''} ${e.title || ''}`)
  )
  return (matched.length ? matched : allDiscoveryEvents.value).slice(0, 4)
})

const attractionEvents = computed(() => {
  const matched = allDiscoveryEvents.value.filter((e) =>
    /atraksi|hiburan|wisata|game|expo|komunitas/i.test(`${e.category || ''} ${e.title || ''}`)
  )
  if (matched.length >= 2) return matched.slice(0, 4)
  return allDiscoveryEvents.value.slice(1, 5)
})

const hypeEvents = computed(() => {
  return allDiscoveryEvents.value.slice(2, 6)
})

// ---------------- CITY CARDS (WITH LANDMARK ILLUSTRATIONS) ----------------
const cityConfig = [
  { label: 'DKI Jakarta', query: 'Jakarta', landmark: 'monas' },
  { label: 'Kota Yogyakarta', query: 'Yogyakarta', landmark: 'tugu' },
  { label: 'Bandung', query: 'Bandung', landmark: 'sate' },
  { label: 'Kota Surabaya', query: 'Surabaya', landmark: 'sura' },
  { label: 'Kuala Lumpur', query: 'Bali', landmark: 'kl' }
]

const cityCards = computed(() =>
  cityConfig.map((c) => {
    const qLower = c.query.toLowerCase()
    const count = allDiscoveryEvents.value.filter((e) =>
      `${e.location_name || ''} ${e.address || ''}`.toLowerCase().includes(qLower)
    ).length
    return { ...c, count }
  })
)

// ---------------- BACAAN SERU! (EDITORIAL CARDS) ----------------
const blogCards = [
  {
    badge: 'PROMO',
    headline: 'Harga Spesial — Diskon Tiket Early Bird Hingga 75% di TERRA Deals!',
    bg: 'bg-[#152955] text-white',
    img: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=600&q=80',
    title: 'Tips Berburu Tiket Konser Murah & Aman di Platform TERRA',
    link: '/pricing'
  },
  {
    badge: 'TIPS',
    headline: 'Panduan Praktis Nonton Konser & Festival Musik Tahun 2026',
    bg: 'bg-[#1e5cb3] text-white',
    img: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&q=80',
    title: 'Barang Wajib Bawa & Aturan Fast-Lane QR Code di Gate',
    link: '/events'
  },
  {
    badge: 'STUDIO',
    headline: 'Ingin Buat Event Sendiri? Aktifkan 13 Modul Mulai Rp 50rb/Bln!',
    bg: 'bg-[#f59e0b] text-slate-950',
    img: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&q=80',
    title: 'Solusi Lengkap Manajemen Tiket, Finansial RAB & Gate Scanner EO',
    link: '/pricing'
  }
]
</script>

<template>
  <div class="bg-white min-h-screen text-slate-900 pb-16">
    <!-- =================================================================== -->
    <!-- 1. SLIM CLEAN SEARCH & FILTER BAR (TOP OF PAGE)                     -->
    <!-- =================================================================== -->
    <div class="border-b border-slate-100 bg-white sticky top-16 z-30 shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
      <div id="explore-catalog-anchor" class="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-3">
        <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <!-- Search Input with Loket-style Pill Shape -->
          <div class="relative flex-1">
            <Search class="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              v-model="search"
              type="text"
              placeholder="Cari event, artis, festival, atau kota di sini..."
              class="w-full rounded-full border border-slate-200 bg-slate-50/80 pl-10 pr-9 py-2 text-xs sm:text-[13px] text-slate-900 placeholder:text-slate-400 focus:border-[#0052cc] focus:bg-white focus:outline-hidden transition-all"
            />
            <button
              v-if="search"
              type="button"
              @click="search = ''"
              aria-label="Hapus pencarian"
              class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
            >
              <X class="h-3.5 w-3.5" />
            </button>
          </div>

          <!-- Quick Filters -->
          <div class="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 [scrollbar-width:none]">
            <div class="relative shrink-0">
              <select
                v-model="selectedCategory"
                aria-label="Filter Kategori"
                class="terra-select rounded-full border border-slate-200 bg-white px-3.5 py-1.5 pr-7 text-xs font-medium text-slate-700 hover:border-slate-300 focus:border-[#0052cc] focus:outline-hidden appearance-none cursor-pointer"
              >
                <option value="">Semua Kategori</option>
                <option v-for="c in store.categories" :key="c.id" :value="c.name">{{ c.name }}</option>
              </select>
              <ChevronDown class="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            </div>

            <div class="relative shrink-0">
              <select
                v-model="selectedFormat"
                aria-label="Filter Format"
                class="terra-select rounded-full border border-slate-200 bg-white px-3.5 py-1.5 pr-7 text-xs font-medium text-slate-700 hover:border-slate-300 focus:border-[#0052cc] focus:outline-hidden appearance-none cursor-pointer"
              >
                <option value="">Format</option>
                <option value="offline">Offline</option>
                <option value="online">Online</option>
                <option value="hybrid">Hybrid</option>
              </select>
              <ChevronDown class="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            </div>

            <div class="relative shrink-0">
              <select
                v-model="sortBy"
                aria-label="Urutkan"
                class="terra-select rounded-full border border-slate-200 bg-white px-3.5 py-1.5 pr-7 text-xs font-medium text-slate-700 hover:border-slate-300 focus:border-[#0052cc] focus:outline-hidden appearance-none cursor-pointer"
              >
                <option value="upcoming">Terdekat</option>
                <option value="popular">Populer</option>
                <option value="newest">Terbaru</option>
              </select>
              <ChevronDown class="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            </div>

            <button
              type="button"
              @click="advancedFiltersOpen = !advancedFiltersOpen"
              class="inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-bold transition-colors cursor-pointer shrink-0"
              :class="
                advancedFiltersOpen || activeFilterCount > 0
                  ? 'border-[#0052cc] bg-[#0052cc]/10 text-[#0052cc]'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              "
            >
              <SlidersHorizontal class="h-3 w-3" />
              <span>Filter</span>
              <span
                v-if="activeFilterCount > 0"
                class="inline-flex h-4 w-4 items-center justify-center rounded-full bg-[#0052cc] text-[9px] font-bold text-white"
              >
                {{ activeFilterCount }}
              </span>
            </button>
          </div>
        </div>

        <!-- Advanced Filter Tray -->
        <div
          v-if="advancedFiltersOpen"
          class="pt-3 mt-2 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 items-center"
        >
          <div class="relative">
            <select
              v-model="selectedPriceType"
              aria-label="Filter Harga"
              class="terra-select w-full rounded-full border border-slate-200 bg-white px-3.5 py-1.5 pr-7 text-xs text-slate-700 focus:border-[#0052cc] focus:outline-hidden appearance-none cursor-pointer"
            >
              <option value="">Semua Harga</option>
              <option value="free">Gratis</option>
              <option value="paid">Berbayar</option>
            </select>
            <ChevronDown class="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          </div>

          <input
            v-model="locationQuery"
            type="text"
            placeholder="Kota / Lokasi..."
            class="w-full rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-[#0052cc] focus:outline-hidden"
          />

          <label class="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-700">
            <span class="text-[10px] font-bold text-slate-400">Dari:</span>
            <input v-model="dateFrom" type="date" class="w-full bg-transparent text-xs text-slate-900 focus:outline-hidden" />
          </label>

          <label class="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-700">
            <span class="text-[10px] font-bold text-slate-400">Sampai:</span>
            <input v-model="dateTo" type="date" class="w-full bg-transparent text-xs text-slate-900 focus:outline-hidden" />
          </label>

          <button
            type="button"
            @click="resetFilters"
            class="rounded-full border border-slate-200 bg-slate-50 hover:bg-slate-100 px-4 py-1.5 text-xs font-bold text-slate-700 cursor-pointer"
          >
            Reset Filter
          </button>
        </div>

        <!-- Filter Chips -->
        <div v-if="activeFilterChips.length" class="mt-2.5 flex flex-wrap items-center gap-2 text-xs">
          <span class="text-slate-400 font-medium text-[11px]">Filter aktif:</span>
          <button
            v-for="chip in activeFilterChips"
            :key="chip.key"
            type="button"
            @click="clearFilterChip(chip.key)"
            class="inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-200 text-[#0052cc] px-2.5 py-0.5 text-[11px] font-semibold hover:bg-blue-100 cursor-pointer"
          >
            <span>{{ chip.label }}</span>
            <X class="h-3 w-3" />
          </button>
          <button
            type="button"
            @click="resetFilters"
            class="text-[11px] font-bold text-slate-500 hover:text-slate-900 underline ml-1 cursor-pointer"
          >
            Hapus Semua
          </button>
        </div>
      </div>
    </div>

    <!-- =================================================================== -->
    <!-- 2. HERO CAROUSEL BANNER (ASPECT RATIO MATCHING LOKET HERO)          -->
    <!-- =================================================================== -->
    <div v-if="!isFilterActive" class="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 pt-5">
      <div
        class="relative w-full rounded-2xl overflow-hidden bg-slate-950 shadow-md group"
        @mouseenter="heroPaused = true"
        @mouseleave="heroPaused = false"
      >
        <!-- Slide Visual -->
        <div
          v-if="currentHeroSlide"
          class="relative h-[180px] sm:h-[260px] lg:h-[310px] w-full overflow-hidden"
        >
          <img
            :src="currentHeroSlide.banner_url || currentHeroSlide.poster_url || FALLBACK_POSTER"
            :alt="currentHeroSlide.title"
            class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-102"
          />
          <!-- Gentle gradient for readability -->
          <div class="absolute inset-0 bg-gradient-to-r from-black/85 via-black/40 to-transparent" />

          <!-- Banner Content -->
          <div class="absolute inset-0 flex flex-col justify-center p-6 sm:p-10 max-w-xl text-white space-y-2.5">
            <span class="inline-flex items-center gap-1 rounded-md bg-[#0052cc] px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-white w-fit">
              {{ currentHeroSlide.category || 'Featured Event' }}
            </span>
            <h2 class="text-xl sm:text-3xl font-extrabold text-white leading-tight line-clamp-2">
              {{ currentHeroSlide.title }}
            </h2>
            <p class="text-xs sm:text-sm text-slate-300 truncate">
              {{ formatDate(currentHeroSlide.start_date || currentHeroSlide.start_at) }} • {{ currentHeroSlide.location_name || 'Online' }}
            </p>
            <div class="pt-2">
              <RouterLink
                :to="`/events/${currentHeroSlide.slug || currentHeroSlide.id}`"
                class="inline-flex items-center gap-2 rounded-full bg-white text-slate-950 hover:bg-slate-100 px-5 py-2 text-xs font-bold shadow-md transition-colors"
              >
                <span>Beli Tiket</span>
                <ArrowRight class="h-3.5 w-3.5" />
              </RouterLink>
            </div>
          </div>
        </div>

        <!-- Floating Pill at Center Bottom (Matching Loket Hero LinkAja Pill) -->
        <div class="absolute bottom-3 inset-x-0 flex items-center justify-center pointer-events-none">
          <RouterLink
            to="/pricing"
            class="pointer-events-auto inline-flex items-center gap-2 rounded-full bg-white/95 backdrop-blur-md px-4 py-1.5 text-[11px] font-bold text-slate-800 shadow-md hover:bg-white transition-colors"
          >
            <span class="text-[#0052cc]">Point-Free Tickets:</span>
            <span>Beli tiket resmi atau buat event gratis di TERRA</span>
            <ChevronRight class="h-3.5 w-3.5 text-[#0052cc]" />
          </RouterLink>
        </div>

        <!-- Carousel Nav Buttons -->
        <button
          v-if="heroSlides.length > 1"
          type="button"
          @click="prevSlide"
          aria-label="Slide sebelumnya"
          class="absolute left-3 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-white/80 hover:bg-white text-slate-800 flex items-center justify-center shadow-md transition-colors cursor-pointer"
        >
          <ChevronLeft class="h-4 w-4" />
        </button>
        <button
          v-if="heroSlides.length > 1"
          type="button"
          @click="nextSlide"
          aria-label="Slide berikutnya"
          class="absolute right-3 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-white/80 hover:bg-white text-slate-800 flex items-center justify-center shadow-md transition-colors cursor-pointer"
        >
          <ChevronRight class="h-4 w-4" />
        </button>

        <!-- Slide Dots -->
        <div
          v-if="heroSlides.length > 1"
          class="absolute top-4 right-5 flex items-center gap-1.5"
        >
          <button
            v-for="(slide, idx) in heroSlides"
            :key="slide.id"
            type="button"
            @click="goToSlide(idx)"
            class="h-1.5 rounded-full transition-all cursor-pointer"
            :class="idx === activeSlide ? 'w-5 bg-white' : 'w-1.5 bg-white/50'"
          />
        </div>
      </div>
    </div>

    <!-- =================================================================== -->
    <!-- MAIN CONTENT CONTAINER                                              -->
    <!-- =================================================================== -->
    <div class="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 mt-8">
      <!-- ----------------------------------------------------------------- -->
      <!-- A. SEARCH RESULTS VIEW (WHEN SEARCH/FILTER IS ACTIVE)             -->
      <!-- ----------------------------------------------------------------- -->
      <div v-if="isFilterActive" class="space-y-6">
        <div class="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h1 class="text-xl font-bold text-slate-900">
              Hasil Pencarian Acara
            </h1>
            <p class="text-xs text-slate-500 mt-0.5">
              Menampilkan <span class="font-bold text-slate-900">{{ totalCount }}</span> event
            </p>
          </div>
          <button
            type="button"
            @click="resetFilters"
            class="inline-flex items-center gap-1 text-xs font-bold text-[#0052cc] hover:underline cursor-pointer"
          >
            <span>Kembali ke Jelajah</span>
          </button>
        </div>

        <div v-if="loading && !items.length" class="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
          <div v-for="n in 8" :key="n" class="space-y-2 animate-pulse">
            <div class="aspect-[16/9] rounded-xl bg-slate-200" />
            <div class="h-3 w-1/3 bg-slate-200 rounded" />
            <div class="h-4 w-full bg-slate-200 rounded" />
            <div class="h-3 w-1/2 bg-slate-200 rounded" />
          </div>
        </div>

        <div v-else-if="items.length" class="space-y-8">
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
            <ExploreEventCard v-for="evt in items" :key="evt.id" :event="evt" />
          </div>

          <!-- Pagination -->
          <div v-if="totalPages > 1" class="flex items-center justify-center gap-3 pt-4 text-xs">
            <button
              type="button"
              :disabled="currentPage <= 1"
              @click="currentPage--"
              class="rounded-full border border-slate-200 bg-white px-4 py-2 font-bold text-slate-700 disabled:opacity-40 cursor-pointer hover:bg-slate-50"
            >
              Sebelumnya
            </button>
            <span class="font-bold text-slate-900">
              Halaman {{ currentPage }} / {{ totalPages }}
            </span>
            <button
              type="button"
              :disabled="currentPage >= totalPages"
              @click="currentPage++"
              class="rounded-full border border-slate-200 bg-white px-4 py-2 font-bold text-slate-700 disabled:opacity-40 cursor-pointer hover:bg-slate-50"
            >
              Berikutnya
            </button>
          </div>
        </div>

        <EmptyState
          v-else
          title="Tidak ada event ditemukan"
          description="Coba ubah kata kunci atau bersihkan filter Anda."
        />
      </div>

      <!-- ----------------------------------------------------------------- -->
      <!-- B. DEFAULT LOKET-INSPIRED MULTI-SHELF DISCOVERY VIEW              -->
      <!-- ----------------------------------------------------------------- -->
      <div v-else class="space-y-12">
        <!-- 1. EVENT SERU UNTUKMU -->
        <section class="space-y-4">
          <div class="flex items-center justify-between">
            <h2 class="text-[17px] sm:text-lg font-bold text-slate-900 flex items-center gap-2">
              <span class="text-[#0052cc] font-extrabold">&gt;</span>
              <span>Event Seru Untukmu</span>
            </h2>
            <button
              type="button"
              @click="applyQuickFilter({ resetFirst: true, showAll: true })"
              class="text-xs font-bold text-[#0052cc] hover:underline cursor-pointer"
            >
              Lihat Semua &gt;
            </button>
          </div>

          <div class="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
            <ExploreEventCard
              v-for="evt in recommendedEvents"
              :key="`rec-${evt.id}`"
              :event="evt"
            />
          </div>
        </section>

        <!-- 2. LAGI TRENDING (3 WIDE BANNER CARDS) -->
        <section v-if="trendingEvents.length" class="space-y-4">
          <div class="flex items-center justify-between">
            <h2 class="text-[17px] sm:text-lg font-bold text-slate-900 flex items-center gap-2">
              <span class="text-amber-500 font-extrabold">&gt;</span>
              <span>Lagi Trending</span>
            </h2>
            <button
              type="button"
              @click="applyQuickFilter({ resetFirst: true, sort: 'popular' })"
              class="text-xs font-bold text-[#0052cc] hover:underline cursor-pointer"
            >
              Lihat Semua &gt;
            </button>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
            <RouterLink
              v-for="(evt, idx) in trendingEvents"
              :key="`trend-${evt.id}`"
              :to="`/events/${evt.slug || evt.id}`"
              class="group cursor-pointer space-y-2"
            >
              <div class="relative aspect-[16/9] w-full rounded-xl overflow-hidden bg-slate-100 shadow-xs group-hover:shadow-md transition-shadow">
                <img
                  :src="evt.banner_url || evt.poster_url || FALLBACK_POSTER"
                  :alt="evt.title"
                  loading="lazy"
                  class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <div class="space-y-1">
                <h3 class="text-sm font-bold text-slate-900 line-clamp-1 group-hover:text-[#0052cc] transition-colors">
                  {{ evt.title }}
                </h3>
                <div class="flex items-center gap-1.5 text-xs text-amber-600 font-semibold">
                  <Star class="h-3.5 w-3.5 fill-amber-400 text-amber-500" />
                  <span>Trending #{{ idx + 1 }}</span>
                  <span class="text-slate-400 font-normal ml-1">• {{ getPriceDisplay(evt) }}</span>
                </div>
              </div>
            </RouterLink>
          </div>
        </section>

        <!-- 3. PROGRAM BELAJAR TERPOPULER (WORKSHOP / EDUKASI) -->
        <section v-if="learningEvents.length" class="space-y-4">
          <div class="flex items-center justify-between">
            <h2 class="text-[17px] sm:text-lg font-bold text-slate-900 flex items-center gap-2">
              <span class="text-[#0052cc] font-extrabold">&gt;</span>
              <span>Program Belajar Terpopuler</span>
            </h2>
            <button
              type="button"
              @click="applyQuickFilter({ resetFirst: true, category: 'Workshop & Edukasi' })"
              class="text-xs font-bold text-[#0052cc] hover:underline cursor-pointer"
            >
              Lihat Semua &gt;
            </button>
          </div>

          <div class="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
            <ExploreEventCard
              v-for="evt in learningEvents"
              :key="`learn-${evt.id}`"
              :event="evt"
            />
          </div>
        </section>

        <!-- 4. EVENT2GO (SPLIT CALENDAR SCHEDULE WIDGET) -->
        <section class="border border-slate-200/90 rounded-2xl bg-white p-5 sm:p-6 shadow-xs">
          <div class="flex flex-col lg:flex-row gap-6 lg:gap-8 items-stretch">
            <!-- Left Isometric Computer/Calendar Card -->
            <div class="lg:w-[38%] rounded-xl bg-gradient-to-br from-[#122854] via-[#1a3c7e] to-[#2563eb] p-6 text-white flex flex-col justify-between relative overflow-hidden min-h-[280px]">
              <div class="space-y-2 relative z-10">
                <span class="inline-block rounded-md bg-white/20 backdrop-blur-xs px-2.5 py-1 text-[11px] font-bold">
                  Event2Go
                </span>
                <h3 class="text-2xl font-black leading-tight">
                  Semua event seru dalam genggaman.
                </h3>
                <p class="text-xs text-blue-100">
                  Cek agenda harian dan amankan tiket event pilihanmu sekarang.
                </p>
              </div>

              <!-- Graphic Elements -->
              <div class="py-4 flex justify-center relative z-10">
                <div class="w-36 h-28 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 p-3 shadow-lg flex flex-col justify-between">
                  <div class="h-3 w-12 bg-[#72a5e4] rounded" />
                  <div class="space-y-1.5">
                    <div class="h-2 w-full bg-white/40 rounded" />
                    <div class="h-2 w-3/4 bg-white/30 rounded" />
                  </div>
                  <div class="text-[10px] font-black text-[#72a5e4] text-right">TERRA.ID</div>
                </div>
              </div>

              <div class="relative z-10">
                <button
                  type="button"
                  @click="applyQuickFilter({ resetFirst: true, showAll: true })"
                  class="w-full text-center rounded-lg bg-white text-slate-900 font-bold text-xs py-2 hover:bg-blue-50 transition-colors cursor-pointer"
                >
                  Jelajahi Semua Jadwal
                </button>
              </div>
            </div>

            <!-- Right Schedule List with Date Boxes -->
            <div class="lg:w-[62%] flex flex-col justify-between space-y-4">
              <!-- Header with Tabs -->
              <div class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div class="flex items-center gap-1.5 sm:gap-2">
                  <span class="font-bold text-sm text-slate-900 mr-1 flex items-center gap-1.5">
                    <Calendar class="h-4 w-4 text-[#0052cc]" />
                    Event2Go
                  </span>
                  <button
                    v-for="t in [
                      { key: 'all', label: 'Semua' },
                      { key: 'today', label: 'Hari Ini' },
                      { key: 'this_week', label: 'Minggu Ini' },
                      { key: 'this_month', label: 'Bulan Ini' }
                    ]"
                    :key="t.key"
                    type="button"
                    @click="scheduleTab = t.key"
                    class="rounded-full px-3 py-1 text-xs font-semibold transition-colors cursor-pointer"
                    :class="
                      scheduleTab === t.key
                        ? 'bg-[#0052cc] text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    "
                  >
                    {{ t.label }}
                  </button>
                </div>

                <button
                  type="button"
                  @click="applyQuickFilter({ resetFirst: true, showAll: true })"
                  class="text-xs font-bold text-[#0052cc] hover:underline cursor-pointer"
                >
                  Lihat Semua Event &gt;
                </button>
              </div>

              <!-- 4 Event Items in Schedule -->
              <div class="divide-y divide-slate-100">
                <RouterLink
                  v-for="evt in activeScheduleEvents"
                  :key="`sched-${evt.id}`"
                  :to="`/events/${evt.slug || evt.id}`"
                  class="py-3 flex items-center gap-3.5 group hover:bg-slate-50/80 rounded-lg px-2 -mx-2 transition-colors"
                >
                  <!-- Square Date Box -->
                  <div class="w-12 h-12 rounded-lg border border-slate-200 bg-white flex flex-col items-center justify-center shrink-0 shadow-2xs">
                    <span class="text-base font-black leading-none text-slate-900">
                      {{ getCalendarParts(evt.start_at || evt.start_date).day }}
                    </span>
                    <span class="text-[9px] font-extrabold uppercase text-slate-400 mt-0.5">
                      {{ getCalendarParts(evt.start_at || evt.start_date).month }}
                    </span>
                  </div>

                  <!-- Title & Details -->
                  <div class="flex-1 min-w-0 space-y-0.5">
                    <h4 class="text-[13px] font-bold text-slate-900 truncate group-hover:text-[#0052cc] transition-colors">
                      {{ evt.title }}
                    </h4>
                    <p class="text-[11px] text-slate-500 truncate">
                      {{ formatDate(evt.start_at || evt.start_date) }} • {{ evt.location_name || 'Online' }}
                    </p>
                  </div>

                  <!-- Right Mini Banner -->
                  <div class="w-20 h-10 rounded-md overflow-hidden bg-slate-100 shrink-0">
                    <img
                      :src="evt.banner_url || evt.poster_url || FALLBACK_POSTER"
                      :alt="evt.title"
                      loading="lazy"
                      class="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  </div>
                </RouterLink>
              </div>
            </div>
          </div>
        </section>

        <!-- 5. PROMO BANNER STRIP & APPLIKE CATEGORY ICONS -->
        <section class="space-y-6">
          <!-- Horizontal Promo Banner (Matching BISA PAS BISA #PASTIBISA) -->
          <div class="rounded-2xl bg-gradient-to-r from-sky-400 via-sky-300 to-blue-400 p-3 sm:p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3 text-slate-950 overflow-hidden">
            <div class="flex items-center gap-3">
              <span class="font-black text-xs sm:text-sm tracking-wider uppercase bg-white/70 px-3 py-1 rounded-full text-blue-900">
                #PASTIBISA
              </span>
              <p class="text-xs sm:text-sm font-extrabold text-blue-950">
                Dapatkan Tiket Event Resmi dengan Pembayaran QRIS &amp; E-Ticket QR Instan!
              </p>
            </div>

            <!-- Discount / Feature Badges -->
            <div class="flex items-center gap-1.5 shrink-0">
              <span class="h-8 w-8 rounded-full bg-emerald-500 text-white font-extrabold text-[9px] flex items-center justify-center shadow-xs">
                15%
              </span>
              <span class="h-8 w-8 rounded-full bg-lime-400 text-slate-950 font-extrabold text-[9px] flex items-center justify-center shadow-xs">
                75%
              </span>
              <span class="h-8 w-8 rounded-full bg-sky-200 text-blue-950 font-extrabold text-[9px] flex items-center justify-center shadow-xs">
                Rp0
              </span>
              <span class="h-8 w-8 rounded-full bg-orange-500 text-white font-extrabold text-[9px] flex items-center justify-center shadow-xs">
                100%
              </span>
              <span class="h-8 w-8 rounded-full bg-rose-500 text-white font-extrabold text-[9px] flex items-center justify-center shadow-xs">
                50%
              </span>
            </div>
          </div>

          <!-- App-style Category Icons (Horizontal Row matching Loket) -->
          <div class="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-3 sm:gap-4">
            <button
              v-for="cat in loketCategories"
              :key="cat.label"
              type="button"
              @click="
                cat.showAll
                  ? applyQuickFilter({ resetFirst: true, showAll: true })
                  : cat.format
                    ? applyQuickFilter({ resetFirst: true, format: cat.format })
                    : applyQuickFilter({ resetFirst: true, category: cat.categoryName })
              "
              class="group flex flex-col items-center gap-2 cursor-pointer transition-transform hover:-translate-y-0.5"
            >
              <div
                class="h-14 w-14 rounded-2xl bg-gradient-to-br flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow"
                :class="cat.gradient"
              >
                <component :is="cat.icon" class="h-6 w-6 text-white" />
              </div>
              <span class="text-[11px] font-bold text-slate-700 text-center leading-tight line-clamp-2">
                {{ cat.label }}
              </span>
            </button>
          </div>
        </section>

        <!-- 6. LOKÉT SCREEN (3 VERTICAL POSTERS + 1 BLUE PROMO CARD) -->
        <section v-if="screenPosters.length" class="space-y-4">
          <div class="flex items-center justify-between">
            <h2 class="text-[17px] sm:text-lg font-bold text-slate-900 flex items-center gap-2">
              <span class="text-[#0052cc] font-extrabold">&gt;</span>
              <span>LOKÉT Screen</span>
            </h2>
          </div>

          <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <!-- 3 Vertical Poster Cards (Movie Poster Aspect Ratio) -->
            <RouterLink
              v-for="evt in screenPosters"
              :key="`screen-${evt.id}`"
              :to="`/events/${evt.slug || evt.id}`"
              class="group cursor-pointer rounded-xl overflow-hidden aspect-[2/3] relative bg-slate-900 shadow-md hover:shadow-xl transition-all"
            >
              <img
                :src="evt.poster_url || evt.banner_url || FALLBACK_POSTER"
                :alt="evt.title"
                loading="lazy"
                class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div class="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
              <div class="absolute inset-x-0 bottom-0 p-3.5 space-y-1 text-white">
                <span class="inline-block rounded-md bg-[#0052cc] px-2 py-0.5 text-[9px] font-bold">
                  {{ evt.category || 'Spotlight' }}
                </span>
                <h4 class="text-xs sm:text-sm font-bold line-clamp-2 leading-tight">
                  {{ evt.title }}
                </h4>
                <p class="text-[10px] text-slate-300">
                  {{ formatDate(evt.start_at || evt.start_date) }}
                </p>
              </div>
            </RouterLink>

            <!-- 4th Card: Loket Screen Call-to-Action Blue Card -->
            <div class="rounded-xl bg-[#152955] p-6 text-white flex flex-col justify-between aspect-[2/3] relative overflow-hidden shadow-md">
              <div class="space-y-3 relative z-10">
                <h3 class="text-lg sm:text-xl font-black leading-snug">
                  Temukan tontonan berikutnya di layar lebar.
                </h3>
                <p class="text-xs text-slate-300 leading-relaxed">
                  Beli tiket pertunjukan, konser, dan festival favoritmu sekarang.
                </p>
              </div>

              <div class="space-y-4 relative z-10">
                <RouterLink
                  to="/pricing"
                  class="block w-full text-center rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs py-2.5 transition-colors shadow-sm"
                >
                  Beli Tiket Sekarang
                </RouterLink>
                <div class="flex justify-center">
                  <div class="h-10 w-16 bg-white/10 rounded-full flex items-center justify-center">
                    <Smile class="h-6 w-6 text-amber-400" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- 7. KONSER SPESIAL UNTUKMU -->
        <section v-if="concertEvents.length" class="space-y-4">
          <div class="flex items-center justify-between">
            <h2 class="text-[17px] sm:text-lg font-bold text-slate-900 flex items-center gap-2">
              <span class="text-[#0052cc] font-extrabold">&gt;</span>
              <span>Konser Spesial Untukmu</span>
            </h2>
            <button
              type="button"
              @click="applyQuickFilter({ resetFirst: true, category: 'Musik & Konser' })"
              class="text-xs font-bold text-[#0052cc] hover:underline cursor-pointer"
            >
              Lihat Semua &gt;
            </button>
          </div>

          <div class="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
            <ExploreEventCard
              v-for="evt in concertEvents"
              :key="`concert-${evt.id}`"
              :event="evt"
            />
          </div>
        </section>

        <!-- 8. SIAP SERU-SERUAN? -->
        <section v-if="attractionEvents.length" class="space-y-4">
          <div class="flex items-center justify-between">
            <h2 class="text-[17px] sm:text-lg font-bold text-slate-900 flex items-center gap-2">
              <span class="text-[#0052cc] font-extrabold">&gt;</span>
              <span>Siap Seru-seruan?</span>
            </h2>
            <button
              type="button"
              @click="applyQuickFilter({ resetFirst: true, showAll: true })"
              class="text-xs font-bold text-[#0052cc] hover:underline cursor-pointer"
            >
              Lihat Semua &gt;
            </button>
          </div>

          <div class="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
            <ExploreEventCard
              v-for="evt in attractionEvents"
              :key="`attract-${evt.id}`"
              :event="evt"
            />
          </div>
        </section>

        <!-- 9. LAGI HYPE DI K-POP -->
        <section v-if="hypeEvents.length" class="space-y-4">
          <div class="flex items-center justify-between">
            <h2 class="text-[17px] sm:text-lg font-bold text-slate-900 flex items-center gap-2">
              <span class="text-[#0052cc] font-extrabold">&gt;</span>
              <span>Lagi Hype di K-Pop</span>
            </h2>
            <button
              type="button"
              @click="applyQuickFilter({ resetFirst: true, showAll: true })"
              class="text-xs font-bold text-[#0052cc] hover:underline cursor-pointer"
            >
              Lihat Semua &gt;
            </button>
          </div>

          <div class="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
            <ExploreEventCard
              v-for="evt in hypeEvents"
              :key="`hype-${evt.id}`"
              :event="evt"
            />
          </div>
        </section>

        <!-- 10. JELAJAHI EVENT DI KOTAMU (5 CARDS WITH LANDMARK VECTORS) -->
        <section class="space-y-4">
          <div class="flex items-center justify-between">
            <h2 class="text-[17px] sm:text-lg font-bold text-slate-900 flex items-center gap-2">
              <span class="text-[#0052cc] font-extrabold">&gt;</span>
              <span>Jelajahi Event di Kotamu</span>
            </h2>
            <button
              type="button"
              @click="applyQuickFilter({ resetFirst: true, showAll: true })"
              class="text-xs font-bold text-[#0052cc] hover:underline cursor-pointer"
            >
              Lihat Semua &gt;
            </button>
          </div>

          <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
            <button
              v-for="city in cityCards"
              :key="city.label"
              type="button"
              @click="applyQuickFilter({ resetFirst: true, location: city.query })"
              class="group relative h-20 rounded-xl border border-slate-200/90 bg-white p-3 text-left flex items-center justify-between overflow-hidden shadow-2xs hover:border-[#0052cc] hover:shadow-xs transition-all cursor-pointer"
            >
              <div class="relative z-10">
                <p class="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-[#0052cc] leading-tight">
                  {{ city.label }}
                </p>
                <span class="text-[10px] text-slate-400 block mt-0.5">
                  {{ city.count }} Event
                </span>
              </div>

              <!-- Landmark Vector Illustration -->
              <div class="w-12 h-12 flex items-center justify-center shrink-0 text-slate-300 group-hover:text-blue-500 transition-colors">
                <svg v-if="city.landmark === 'monas'" viewBox="0 0 64 64" class="h-10 w-10" fill="currentColor">
                  <path d="M31 4l3 7h-6l3-7zm-3 9h6v4h-6v-4zm1 6h4l3 34h-10l3-34zm-11 34h26l4 7H14l4-7z" />
                </svg>
                <svg v-else-if="city.landmark === 'tugu'" viewBox="0 0 64 64" class="h-10 w-10" fill="currentColor">
                  <path d="M32 6l3 10h-6l3-10zm-4 12h8v24h-8V18zm-4 25h16v6H24v-6zm-6 8h28v10H18V51z" />
                </svg>
                <svg v-else-if="city.landmark === 'sate'" viewBox="0 0 64 64" class="h-10 w-10" fill="currentColor">
                  <path d="M36 8l2 8h-4l2-8zm-6 9h12l2 10H28l2-10zm-14 12h40v8H16v-8zm-8 10h56v19H8V39z" />
                </svg>
                <svg v-else-if="city.landmark === 'sura'" viewBox="0 0 64 64" class="h-10 w-10" fill="currentColor">
                  <path d="M22 18c8-10 22-8 26 2-5 2-9 6-9 12 0 5 3 10 8 13-6 7-20 7-26-2 4-5 5-16 1-25z" />
                </svg>
                <svg v-else viewBox="0 0 64 64" class="h-10 w-10" fill="currentColor">
                  <path d="M18 14h10v44H18V14zm18 0h10v44H36V14zm-22-4h36v5H14v-5z" />
                </svg>
              </div>
            </button>
          </div>
        </section>

        <!-- 11. BACAAN SERU! (3 EDITORIAL SPLIT CARDS) -->
        <section class="space-y-4">
          <div class="flex items-center justify-between">
            <h2 class="text-[17px] sm:text-lg font-bold text-slate-900 flex items-center gap-2">
              <span class="text-[#0052cc] font-extrabold">&gt;</span>
              <span>Bacaan Seru!</span>
            </h2>
            <button
              type="button"
              @click="applyQuickFilter({ resetFirst: true, showAll: true })"
              class="text-xs font-bold text-[#0052cc] hover:underline cursor-pointer"
            >
              Lihat Semua &gt;
            </button>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
            <RouterLink
              v-for="blog in blogCards"
              :key="blog.headline"
              :to="blog.link"
              class="group cursor-pointer space-y-2"
            >
              <!-- 2-Tone Split Banner -->
              <div class="rounded-xl overflow-hidden border border-slate-200/90 shadow-2xs group-hover:shadow-md transition-shadow">
                <div class="grid grid-cols-12 h-32">
                  <div
                    class="col-span-6 p-3.5 flex flex-col justify-between"
                    :class="blog.bg"
                  >
                    <span class="text-[9px] font-black tracking-wider uppercase opacity-90">
                      {{ blog.badge }}
                    </span>
                    <p class="text-xs font-black leading-snug line-clamp-3">
                      {{ blog.headline }}
                    </p>
                  </div>
                  <div class="col-span-6 bg-slate-900 overflow-hidden">
                    <img
                      :src="blog.img"
                      :alt="blog.title"
                      loading="lazy"
                      class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                </div>
              </div>

              <!-- Title Below -->
              <h4 class="text-xs sm:text-[13px] font-bold text-slate-900 line-clamp-2 leading-snug group-hover:text-[#0052cc] transition-colors">
                {{ blog.title }}
              </h4>
            </RouterLink>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

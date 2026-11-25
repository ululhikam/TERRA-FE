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
  Star
} from 'lucide-vue-next'

const FALLBACK_POSTER =
  'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200&q=80'

const route = useRoute()
const authStore = useAuthStore()
const store = useEventWorkspaceStore()

// ---------------- FILTER & SEARCH STATE (PRESERVED) ----------------
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
  }, 5500)
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

// ---------------- TERRA2GO SCHEDULE WIDGET ----------------
const scheduleTab = ref('this_week')

function parseEventDate(evt) {
  const raw = evt?.start_at || evt?.start_date
  if (!raw) return null
  const d = new Date(raw)
  return Number.isNaN(d.getTime()) ? null : d
}

const scheduleEventsByTab = computed(() => {
  const now = new Date()
  const weekEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
  const monthEnd = new Date(now.getTime() + 31 * 24 * 60 * 60 * 1000)

  const sorted = [...allDiscoveryEvents.value].sort((a, b) => {
    const da = parseEventDate(a)?.getTime() || Number.MAX_SAFE_INTEGER
    const db = parseEventDate(b)?.getTime() || Number.MAX_SAFE_INTEGER
    return da - db
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
    this_week: thisWeek.slice(0, 4),
    this_month: thisMonth.slice(0, 4),
    upcoming_all: sorted.slice(0, 4)
  }
})

function ensureValidScheduleTab() {
  const buckets = scheduleEventsByTab.value
  if (buckets.this_week.length > 0) {
    scheduleTab.value = 'this_week'
  } else if (buckets.this_month.length > 0) {
    scheduleTab.value = 'this_month'
  } else {
    scheduleTab.value = 'upcoming_all'
  }
}

const activeScheduleEvents = computed(() => {
  const buckets = scheduleEventsByTab.value
  const list = buckets[scheduleTab.value] || []
  return list.length ? list : buckets.upcoming_all
})

function getCalendarParts(dateStr) {
  const d = dateStr ? new Date(dateStr) : null
  if (!d || Number.isNaN(d.getTime())) {
    return { month: 'TBD', day: '--', weekday: '' }
  }
  try {
    const month = new Intl.DateTimeFormat('id-ID', { month: 'short' })
      .format(d)
      .toUpperCase()
      .replace('.', '')
    const day = new Intl.DateTimeFormat('id-ID', { day: '2-digit' }).format(d)
    const weekday = new Intl.DateTimeFormat('id-ID', { weekday: 'short' }).format(d)
    return { month, day, weekday }
  } catch {
    return { month: 'EVT', day: String(d.getDate()), weekday: '' }
  }
}

function viewScheduleRange() {
  const today = new Date()
  const isoDay = (d) => d.toISOString().slice(0, 10)
  if (scheduleTab.value === 'this_week') {
    const end = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)
    applyQuickFilter({ resetFirst: true, date_from: isoDay(today), date_to: isoDay(end), showAll: true })
  } else if (scheduleTab.value === 'this_month') {
    const end = new Date(today.getTime() + 31 * 24 * 60 * 60 * 1000)
    applyQuickFilter({ resetFirst: true, date_from: isoDay(today), date_to: isoDay(end), showAll: true })
  } else {
    applyQuickFilter({ resetFirst: true, sort: 'upcoming', showAll: true })
  }
}

// ---------------- CATEGORY ICON SHORTCUTS ----------------
function resolveCategoryMeta(catName = '') {
  const lower = String(catName).toLowerCase()
  if (lower.includes('musik') || lower.includes('konser')) {
    return { icon: Music, bg: 'bg-rose-50 border-rose-200 text-rose-600' }
  }
  if (lower.includes('teknologi') || lower.includes('startup')) {
    return { icon: Cpu, bg: 'bg-sky-50 border-sky-200 text-sky-600' }
  }
  if (lower.includes('workshop') || lower.includes('edukasi')) {
    return { icon: BookOpen, bg: 'bg-amber-50 border-amber-200 text-amber-600' }
  }
  if (lower.includes('bisnis') || lower.includes('karir')) {
    return { icon: Briefcase, bg: 'bg-indigo-50 border-indigo-200 text-indigo-600' }
  }
  if (lower.includes('komunitas') || lower.includes('sosial')) {
    return { icon: Users, bg: 'bg-emerald-50 border-emerald-200 text-emerald-600' }
  }
  if (lower.includes('seni') || lower.includes('desain')) {
    return { icon: Palette, bg: 'bg-fuchsia-50 border-fuchsia-200 text-fuchsia-600' }
  }
  return { icon: Sparkles, bg: 'bg-blue-50 border-blue-200 text-[#1e5cb3]' }
}

const categoryShortcuts = computed(() => {
  const base = [
    {
      key: 'all',
      label: 'Semua Event',
      icon: Compass,
      bg: 'bg-[#72a5e4]/20 border-[#72a5e4]/50 text-[#0f172a]',
      action: () => applyQuickFilter({ resetFirst: true, showAll: true })
    }
  ]

  for (const c of store.categories || []) {
    const meta = resolveCategoryMeta(c.name)
    base.push({
      key: `cat-${c.id || c.name}`,
      label: c.name,
      icon: meta.icon,
      bg: meta.bg,
      action: () => applyQuickFilter({ resetFirst: true, category: c.name })
    })
  }

  base.push(
    {
      key: 'free',
      label: 'Tiket Gratis',
      icon: Tag,
      bg: 'bg-emerald-50 border-emerald-200 text-emerald-700',
      action: () => applyQuickFilter({ resetFirst: true, price_type: 'free' })
    },
    {
      key: 'online',
      label: 'Event Online',
      icon: Globe,
      bg: 'bg-violet-50 border-violet-200 text-violet-700',
      action: () => applyQuickFilter({ resetFirst: true, format: 'online' })
    }
  )
  return base
})

// ---------------- SPOTLIGHT, KONSER, KOMUNITAS ----------------
const spotlightEvents = computed(() => {
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

const studioCreateRoute = computed(() =>
  authStore.isOrganizer ? '/dashboard/events/create' : '/organizer/register'
)

const concertEvents = computed(() => {
  const matched = allDiscoveryEvents.value.filter((e) =>
    /musik|konser|seni|desain|festival|demafest/i.test(`${e.category || ''} ${e.title || ''}`)
  )
  return (matched.length ? matched : allDiscoveryEvents.value).slice(0, 4)
})

const communityEvents = computed(() => {
  const matched = allDiscoveryEvents.value.filter((e) =>
    /komunitas|sosial|kampus|bisnis|karir|expo/i.test(`${e.category || ''} ${e.title || ''}`)
  )
  if (matched.length >= 2) return matched.slice(0, 4)
  return allDiscoveryEvents.value.slice(0, 4)
})

// ---------------- KOTA EXPLORATION CARDS ----------------
const cityConfig = [
  { label: 'DKI Jakarta', query: 'Jakarta', landmark: 'monas' },
  { label: 'Yogyakarta', query: 'Yogyakarta', landmark: 'tugu' },
  { label: 'Bandung', query: 'Bandung', landmark: 'sate' },
  { label: 'Surabaya', query: 'Surabaya', landmark: 'sura' },
  { label: 'Bali & Online', query: 'Bali', landmark: 'bali' }
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

// ---------------- VERIFIED ORGANIZERS ("ORGANIZER PILIHAN") ----------------
const organizerSplitThemes = [
  'bg-[#5293dc] text-white',
  'bg-[#0f172a] text-white',
  'bg-[#f5b82e] text-slate-950'
]

const verifiedOrganizers = computed(() => {
  const verifiedFirst = [...(store.organizations || [])].sort(
    (a, b) =>
      Number(b.verification_status === 'verified') - Number(a.verification_status === 'verified')
  )
  return verifiedFirst.slice(0, 3)
})
</script>

<template>
  <div class="bg-[#fafaf9] min-h-screen">
    <!-- =================================================================== -->
    <!-- 1. FULL-BLEED HERO BANNER CAROUSEL                                  -->
    <!-- =================================================================== -->
    <section
      class="relative w-full bg-[#0b1220] overflow-hidden"
      @mouseenter="heroPaused = true"
      @mouseleave="heroPaused = false"
    >
      <!-- Ambient Blurred Slide Backdrop -->
      <img
        v-if="currentHeroSlide"
        :src="currentHeroSlide.banner_url || currentHeroSlide.poster_url || FALLBACK_POSTER"
        alt=""
        aria-hidden="true"
        class="pointer-events-none absolute inset-0 w-full h-full object-cover opacity-30 blur-2xl scale-110 transition-all duration-700"
      />
      <div class="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#0b1220]/70 via-[#0b1220]/55 to-[#0b1220]/90" />

      <div class="relative z-10 mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 pt-5 pb-12 sm:pt-7 sm:pb-14">
        <!-- Main Banner Frame -->
        <div
          v-if="currentHeroSlide"
          class="relative h-[230px] sm:h-[310px] lg:h-[355px] w-full rounded-2xl sm:rounded-3xl overflow-hidden border border-white/15 bg-slate-900 shadow-[0_24px_50px_-14px_rgba(0,0,0,0.65)] group"
        >
          <img
            :src="currentHeroSlide.banner_url || currentHeroSlide.poster_url || FALLBACK_POSTER"
            :alt="currentHeroSlide.title"
            class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.02]"
          />
          <div class="absolute inset-0 bg-gradient-to-r from-[#090f1d]/95 via-[#090f1d]/65 to-transparent" />
          <div class="absolute inset-0 bg-gradient-to-t from-[#090f1d]/90 via-transparent to-transparent" />

          <!-- Hero Text & CTA Overlay -->
          <div class="absolute inset-0 flex flex-col justify-between p-5 sm:p-8 lg:p-10 max-w-2xl">
            <div class="flex flex-wrap items-center gap-2">
              <span class="inline-flex items-center gap-1.5 rounded-full bg-[#72a5e4] px-3 py-1 text-[10px] sm:text-xs font-extrabold uppercase tracking-wide text-slate-950">
                <Sparkles class="h-3 w-3" />
                {{ currentHeroSlide.is_featured ? 'Spotlight Event' : currentHeroSlide.category || 'TERRA Marketplace' }}
              </span>
              <span class="rounded-full bg-white/15 backdrop-blur-xs border border-white/20 px-3 py-1 text-[10px] sm:text-xs font-semibold text-white capitalize">
                {{ currentHeroSlide.location_type || 'offline' }}
              </span>
            </div>

            <div class="space-y-2.5 sm:space-y-3.5">
              <p class="text-[11px] sm:text-xs font-medium text-sky-200 flex flex-wrap items-center gap-2">
                <span>{{ formatDate(currentHeroSlide.start_date || currentHeroSlide.start_at) }}</span>
                <span>•</span>
                <span class="truncate">{{ currentHeroSlide.location_name || 'Online Event' }}</span>
              </p>
              <h1 class="text-xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-white leading-tight line-clamp-2">
                {{ currentHeroSlide.title }}
              </h1>
              <div class="flex flex-wrap items-center gap-3 pt-1">
                <RouterLink
                  :to="`/events/${currentHeroSlide.slug || currentHeroSlide.id}`"
                  class="inline-flex items-center gap-2 rounded-full bg-[#72a5e4] hover:bg-[#8ab6eb] px-4 sm:px-6 py-2 sm:py-2.5 text-xs sm:text-sm font-extrabold text-slate-950 shadow-lg transition-colors"
                >
                  <span>Dapatkan Tiket</span>
                  <ArrowRight class="h-4 w-4" />
                </RouterLink>
                <span class="rounded-full bg-white/10 backdrop-blur-xs border border-white/20 px-3.5 py-2 text-xs font-bold text-white">
                  Mulai {{ getPriceDisplay(currentHeroSlide) }}
                </span>
              </div>
            </div>
          </div>

          <!-- Left / Right Carousel Arrows -->
          <button
            v-if="heroSlides.length > 1"
            type="button"
            @click="prevSlide"
            aria-label="Slide sebelumnya"
            class="hidden sm:flex absolute left-3 top-1/2 -translate-y-1/2 h-9 w-9 items-center justify-center rounded-full bg-black/55 hover:bg-black/80 text-white border border-white/20 backdrop-blur-xs transition-colors cursor-pointer"
          >
            <ChevronLeft class="h-4 w-4" />
          </button>
          <button
            v-if="heroSlides.length > 1"
            type="button"
            @click="nextSlide"
            aria-label="Slide berikutnya"
            class="hidden sm:flex absolute right-3 top-1/2 -translate-y-1/2 h-9 w-9 items-center justify-center rounded-full bg-black/55 hover:bg-black/80 text-white border border-white/20 backdrop-blur-xs transition-colors cursor-pointer"
          >
            <ChevronRight class="h-4 w-4" />
          </button>

          <!-- Dots Indicator -->
          <div
            v-if="heroSlides.length > 1"
            class="absolute bottom-3.5 right-5 flex items-center gap-1.5"
          >
            <button
              v-for="(slide, idx) in heroSlides"
              :key="slide.id"
              type="button"
              @click="goToSlide(idx)"
              :aria-label="`Pilih banner ${idx + 1}`"
              class="h-2 rounded-full transition-all cursor-pointer"
              :class="idx === activeSlide ? 'w-6 bg-[#72a5e4]' : 'w-2 bg-white/45 hover:bg-white/75'"
            />
          </div>
        </div>

        <!-- Fallback Banner Skeleton while Hydrating -->
        <div
          v-else
          class="h-[230px] sm:h-[310px] lg:h-[355px] w-full rounded-2xl sm:rounded-3xl border border-white/10 bg-slate-800/80 p-8 flex flex-col justify-end"
        >
          <h1 class="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
            Jelajahi Event Pilihan di TERRA
          </h1>
          <p class="mt-2 text-xs sm:text-sm text-slate-300 max-w-xl">
            Temukan konser, festival kampus, seminar teknologi, dan workshop resmi dengan e-ticket QR instan.
          </p>
        </div>
      </div>
    </section>

    <!-- =================================================================== -->
    <!-- 2. FLOATING SEARCH & FILTER BAR                                     -->
    <!-- =================================================================== -->
    <div id="explore-catalog-anchor" class="relative z-20 -mt-7 mx-auto max-w-5xl px-4 sm:px-6">
      <div class="rounded-2xl border border-slate-200/95 bg-white p-2.5 sm:p-3 shadow-[0_14px_34px_-12px_rgba(15,23,42,0.18)] space-y-3">
        <!-- Primary Toolbar Row -->
        <div class="flex flex-col lg:flex-row items-stretch lg:items-center gap-2">
          <div class="relative flex-1">
            <Search class="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              v-model="search"
              type="text"
              placeholder="Cari konser, festival kampus, seminar, atau penyelenggara..."
              class="w-full rounded-xl border border-slate-200 bg-slate-50/80 pl-10 pr-8 py-2.5 text-xs sm:text-[13px] text-slate-900 placeholder:text-slate-400 focus:border-[#72a5e4] focus:bg-white focus:outline-hidden"
            />
            <button
              v-if="search"
              type="button"
              @click="search = ''"
              aria-label="Hapus kata kunci"
              class="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
            >
              <X class="h-3.5 w-3.5" />
            </button>
          </div>

          <div class="grid grid-cols-2 sm:grid-cols-4 lg:flex items-center gap-2">
            <div class="relative">
              <select
                v-model="selectedCategory"
                aria-label="Filter Kategori"
                class="terra-select w-full rounded-xl border border-slate-200 bg-slate-50/80 px-3.5 py-2.5 pr-8 text-xs font-semibold text-slate-800 focus:border-[#72a5e4] focus:bg-white focus:outline-hidden appearance-none cursor-pointer"
              >
                <option value="">Semua Kategori</option>
                <option v-for="c in store.categories" :key="c.id" :value="c.name">{{ c.name }}</option>
              </select>
              <ChevronDown class="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
            </div>

            <div class="relative">
              <select
                v-model="selectedFormat"
                aria-label="Filter Format"
                class="terra-select w-full rounded-xl border border-slate-200 bg-slate-50/80 px-3.5 py-2.5 pr-8 text-xs font-semibold text-slate-800 focus:border-[#72a5e4] focus:bg-white focus:outline-hidden appearance-none cursor-pointer"
              >
                <option value="">Semua Format</option>
                <option value="offline">Offline</option>
                <option value="online">Online</option>
                <option value="hybrid">Hybrid</option>
              </select>
              <ChevronDown class="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
            </div>

            <div class="relative">
              <select
                v-model="sortBy"
                aria-label="Urutkan"
                class="terra-select w-full rounded-xl border border-slate-200 bg-slate-50/80 px-3.5 py-2.5 pr-8 text-xs font-semibold text-slate-800 focus:border-[#72a5e4] focus:bg-white focus:outline-hidden appearance-none cursor-pointer"
              >
                <option value="upcoming">Terdekat</option>
                <option value="popular">Populer</option>
                <option value="newest">Terbaru</option>
              </select>
              <ChevronDown class="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
            </div>

            <button
              type="button"
              @click="advancedFiltersOpen = !advancedFiltersOpen"
              class="inline-flex items-center justify-center gap-1.5 rounded-xl border px-3.5 py-2.5 text-xs font-bold transition-colors cursor-pointer shrink-0"
              :class="
                advancedFiltersOpen || activeFilterCount > 0
                  ? 'border-[#5293dc] bg-[#72a5e4] text-slate-950'
                  : 'border-slate-200 bg-white text-slate-800 hover:bg-slate-50'
              "
            >
              <SlidersHorizontal class="h-3.5 w-3.5" />
              <span>Filter Lanjutan</span>
              <span
                v-if="activeFilterCount > 0"
                class="inline-flex h-4 w-4 items-center justify-center rounded-full bg-slate-950 text-[10px] font-bold text-white"
              >
                {{ activeFilterCount }}
              </span>
            </button>
          </div>
        </div>

        <!-- Expandable Advanced Filter Panel -->
        <div
          v-if="advancedFiltersOpen"
          class="pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 items-center"
        >
          <div class="relative">
            <select
              v-model="selectedPriceType"
              aria-label="Filter Harga"
              class="terra-select w-full rounded-xl border border-slate-200 bg-slate-50/80 px-3.5 py-2 pr-8 text-xs font-medium text-slate-800 focus:border-[#72a5e4] focus:outline-hidden appearance-none cursor-pointer"
            >
              <option value="">Semua Harga</option>
              <option value="free">Gratis</option>
              <option value="paid">Berbayar</option>
            </select>
            <ChevronDown class="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
          </div>

          <input
            v-model="locationQuery"
            type="text"
            placeholder="Kota / Kampus / Venue..."
            class="w-full rounded-xl border border-slate-200 bg-slate-50/80 px-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-[#72a5e4] focus:outline-hidden"
          />

          <label class="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-1.5 text-xs text-slate-900">
            <span class="text-[11px] font-semibold text-slate-500 shrink-0">Dari:</span>
            <input
              v-model="dateFrom"
              type="date"
              aria-label="Tanggal mulai"
              class="w-full bg-transparent text-xs text-slate-900 focus:outline-hidden"
            />
          </label>

          <label class="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-1.5 text-xs text-slate-900">
            <span class="text-[11px] font-semibold text-slate-500 shrink-0">Sampai:</span>
            <input
              v-model="dateTo"
              type="date"
              aria-label="Tanggal selesai"
              class="w-full bg-transparent text-xs text-slate-900 focus:outline-hidden"
            />
          </label>

          <button
            type="button"
            @click="resetFilters"
            class="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-800 hover:bg-slate-100 cursor-pointer"
          >
            Reset Semua
          </button>
        </div>
      </div>

      <!-- Active Filter Chips Row -->
      <div v-if="activeFilterChips.length" class="mt-3 flex flex-wrap items-center gap-2 text-xs">
        <span class="text-slate-500 font-semibold">Filter aktif:</span>
        <button
          v-for="chip in activeFilterChips"
          :key="chip.key"
          type="button"
          @click="clearFilterChip(chip.key)"
          class="inline-flex items-center gap-1.5 rounded-full border border-[#72a5e4] bg-[#72a5e4]/20 px-3 py-1 text-xs font-semibold text-slate-900 hover:bg-[#72a5e4]/35 cursor-pointer"
        >
          <span>{{ chip.label }}</span>
          <X class="h-3 w-3" />
        </button>
        <button
          type="button"
          @click="resetFilters"
          class="text-xs font-bold text-[#1e5cb3] hover:underline ml-1 cursor-pointer"
        >
          Kembali ke Eksplorasi
        </button>
      </div>
    </div>

    <!-- =================================================================== -->
    <!-- MAIN BODY: FILTERED RESULTS MODE vs CURATED DISCOVERY SHELVES       -->
    <!-- =================================================================== -->
    <div class="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
      <!-- A. FILTERED / PAGINATED SEARCH MODE -->
      <div v-if="isFilterActive" class="space-y-6">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 class="text-xl sm:text-2xl font-extrabold tracking-tight text-slate-900">
              Hasil Katalog Acara
            </h2>
            <p class="text-xs text-slate-500 mt-0.5">
              Menampilkan <span class="font-bold text-slate-900">{{ totalCount }}</span> acara sesuai pencarian &amp; filter Anda.
            </p>
          </div>
          <button
            type="button"
            @click="resetFilters"
            class="self-start sm:self-auto inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-white px-4 py-1.5 text-xs font-bold text-slate-800 hover:border-slate-900 transition-colors cursor-pointer"
          >
            <X class="h-3.5 w-3.5" />
            <span>Reset &amp; Kembali ke Eksplorasi</span>
          </button>
        </div>

        <!-- Loading Skeleton Grid -->
        <div
          v-if="loading && !items.length"
          class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5"
        >
          <div
            v-for="n in 8"
            :key="n"
            class="h-72 rounded-2xl border border-slate-200 bg-white animate-pulse"
          />
        </div>

        <!-- 4-Column Results Grid -->
        <div v-else-if="items.length" class="space-y-8">
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            <ExploreEventCard v-for="evt in items" :key="evt.id" :event="evt" />
          </div>

          <!-- Pagination Controls (Preserved) -->
          <div
            v-if="totalPages > 1"
            class="flex items-center justify-center gap-3 pt-2 text-xs"
          >
            <button
              type="button"
              :disabled="currentPage <= 1"
              @click="currentPage--"
              class="rounded-full border border-slate-300 bg-white px-4 py-2 font-bold text-slate-800 hover:border-slate-900 disabled:opacity-40 cursor-pointer"
            >
              Sebelumnya
            </button>
            <span class="font-mono font-bold text-slate-900">
              Halaman {{ currentPage }} / {{ totalPages }}
            </span>
            <button
              type="button"
              :disabled="currentPage >= totalPages"
              @click="currentPage++"
              class="rounded-full border border-slate-300 bg-white px-4 py-2 font-bold text-slate-800 hover:border-slate-900 disabled:opacity-40 cursor-pointer"
            >
              Berikutnya
            </button>
          </div>
        </div>

        <EmptyState
          v-else
          title="Tidak ada acara ditemukan"
          description="Coba ubah kata kunci pencarian atau sesuaikan filter kategori Anda."
        />
      </div>

      <!-- B. CURATED LOKET-INSPIRED DISCOVERY VIEW -->
      <div v-else class="space-y-12 sm:space-y-14">
        <!-- SHELF 1: Event Seru Untukmu (4-col) -->
        <section class="space-y-4">
          <div class="flex items-center justify-between gap-3">
            <div class="flex items-center gap-2">
              <span class="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-[#72a5e4]/25 text-[#1e5cb3]">
                <Sparkles class="h-4 w-4" />
              </span>
              <h2 class="text-lg sm:text-xl font-extrabold tracking-tight text-slate-900">
                Event Seru Untukmu
              </h2>
            </div>
            <button
              type="button"
              @click="applyQuickFilter({ resetFirst: true, showAll: true })"
              class="text-xs font-bold text-[#1e5cb3] hover:underline inline-flex items-center gap-1 cursor-pointer shrink-0"
            >
              <span>Lihat Semua</span>
              <ChevronRight class="h-3.5 w-3.5" />
            </button>
          </div>

          <div
            v-if="discoveryLoading && !recommendedEvents.length"
            class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5"
          >
            <div v-for="n in 4" :key="n" class="h-64 rounded-2xl bg-slate-200/70 animate-pulse" />
          </div>
          <div
            v-else
            class="flex lg:grid lg:grid-cols-4 gap-4 sm:gap-5 overflow-x-auto pb-2 lg:pb-0 snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            <div
              v-for="evt in recommendedEvents"
              :key="`rec-${evt.id}`"
              class="min-w-[260px] sm:min-w-[280px] lg:min-w-0 snap-start flex"
            >
              <ExploreEventCard :event="evt" class="w-full" />
            </div>
          </div>
        </section>

        <!-- SHELF 2: Lagi Trending (3-col Wide Showcase) -->
        <section v-if="trendingEvents.length" class="space-y-4">
          <div class="flex items-center justify-between gap-3">
            <div class="flex items-center gap-2">
              <span class="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
                <Flame class="h-4 w-4" />
              </span>
              <h2 class="text-lg sm:text-xl font-extrabold tracking-tight text-slate-900">
                Lagi Trending
              </h2>
            </div>
            <button
              type="button"
              @click="applyQuickFilter({ resetFirst: true, sort: 'popular' })"
              class="text-xs font-bold text-[#1e5cb3] hover:underline inline-flex items-center gap-1 cursor-pointer shrink-0"
            >
              <span>Lihat Semua</span>
              <ChevronRight class="h-3.5 w-3.5" />
            </button>
          </div>

          <div class="flex md:grid md:grid-cols-3 gap-4 sm:gap-5 overflow-x-auto pb-2 md:pb-0 snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <RouterLink
              v-for="(evt, idx) in trendingEvents"
              :key="`trend-${evt.id}`"
              :to="`/events/${evt.slug || evt.id}`"
              class="min-w-[285px] md:min-w-0 snap-start group rounded-2xl border border-slate-200/90 bg-white overflow-hidden shadow-[0_2px_10px_-4px_rgba(15,23,42,0.06)] hover:shadow-[0_14px_30px_-10px_rgba(15,23,42,0.16)] hover:border-[#72a5e4] transition-all"
            >
              <div class="relative aspect-[16/9] bg-slate-900 overflow-hidden">
                <img
                  :src="evt.banner_url || evt.poster_url || FALLBACK_POSTER"
                  :alt="evt.title"
                  loading="lazy"
                  class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
                <span class="absolute top-3 left-3 rounded-full bg-slate-950/85 backdrop-blur-xs text-white px-2.5 py-0.5 text-[10px] font-extrabold">
                  #{{ idx + 1 }} Trending
                </span>
              </div>
              <div class="p-4 flex items-center justify-between gap-3">
                <div class="min-w-0 space-y-1">
                  <h3 class="text-sm font-bold text-slate-900 truncate group-hover:text-[#1e5cb3]">
                    {{ evt.title }}
                  </h3>
                  <div class="flex items-center gap-2 text-[11px] font-semibold">
                    <span class="inline-flex items-center gap-1 text-amber-600">
                      <Star class="h-3.5 w-3.5 fill-amber-400 text-amber-500" />
                      {{ getSoldCount(evt) > 0 ? `${getSoldCount(evt)}+ tiket terjual` : 'Banyak diminati' }}
                    </span>
                    <span class="text-slate-300">•</span>
                    <span class="text-slate-600 font-bold">{{ getPriceDisplay(evt) }}</span>
                  </div>
                </div>
                <span class="h-8 w-8 rounded-full border border-slate-200 bg-slate-50 group-hover:bg-[#72a5e4] group-hover:border-[#5293dc] flex items-center justify-center shrink-0 transition-colors">
                  <ChevronRight class="h-4 w-4 text-slate-700" />
                </span>
              </div>
            </RouterLink>
          </div>
        </section>

        <!-- SHELF 3: Workshop & Edukasi Terpopuler (4-col) -->
        <section v-if="learningEvents.length" class="space-y-4">
          <div class="flex items-center justify-between gap-3">
            <div class="flex items-center gap-2">
              <span class="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                <GraduationCap class="h-4 w-4" />
              </span>
              <h2 class="text-lg sm:text-xl font-extrabold tracking-tight text-slate-900">
                Workshop &amp; Edukasi Terpopuler
              </h2>
            </div>
            <button
              type="button"
              @click="applyQuickFilter({ resetFirst: true, category: 'Workshop & Edukasi' })"
              class="text-xs font-bold text-[#1e5cb3] hover:underline inline-flex items-center gap-1 cursor-pointer shrink-0"
            >
              <span>Lihat Semua</span>
              <ChevronRight class="h-3.5 w-3.5" />
            </button>
          </div>

          <div class="flex lg:grid lg:grid-cols-4 gap-4 sm:gap-5 overflow-x-auto pb-2 lg:pb-0 snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div
              v-for="evt in learningEvents"
              :key="`learn-${evt.id}`"
              class="min-w-[260px] sm:min-w-[280px] lg:min-w-0 snap-start flex"
            >
              <ExploreEventCard :event="evt" class="w-full" />
            </div>
          </div>
        </section>

        <!-- SHELF 4: TERRA2Go Split Calendar Schedule Widget -->
        <section
          v-reveal
          class="rounded-3xl border border-slate-200 bg-white p-5 sm:p-7 shadow-[0_4px_20px_-8px_rgba(15,23,42,0.08)]"
        >
          <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-stretch">
            <!-- Left Graphic Feature Panel -->
            <div class="lg:col-span-5 rounded-2xl bg-gradient-to-br from-[#0f172a] via-[#13294b] to-[#1e4b85] p-6 sm:p-7 text-white flex flex-col justify-between relative overflow-hidden min-h-[260px]">
              <div class="pointer-events-none absolute -right-10 -bottom-10 h-48 w-48 rounded-full bg-[#72a5e4]/20 blur-2xl" />
              <div class="pointer-events-none absolute right-6 top-6 opacity-15">
                <Calendar class="h-28 w-28 text-white" />
              </div>

              <div class="relative z-10 space-y-3">
                <span class="inline-flex items-center gap-1.5 rounded-full bg-[#72a5e4] px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-950">
                  <Calendar class="h-3 w-3" />
                  TERRA2Go Agenda
                </span>
                <h2 class="text-2xl sm:text-3xl font-extrabold tracking-tight leading-tight">
                  Jadwal Event Terdekat Untukmu
                </h2>
                <p class="text-xs sm:text-sm text-sky-100/90 leading-relaxed max-w-sm">
                  Cek agenda acara minggu ini atau bulan ini dan amankan e-ticket QR sebelum kuota habis.
                </p>
              </div>

              <div class="relative z-10 pt-6 flex items-center justify-between">
                <button
                  type="button"
                  @click="viewScheduleRange"
                  class="inline-flex items-center gap-2 rounded-full bg-white text-slate-950 hover:bg-[#72a5e4] px-4 py-2 text-xs font-extrabold transition-colors cursor-pointer"
                >
                  <span>Jelajahi Agenda</span>
                  <ArrowRight class="h-3.5 w-3.5" />
                </button>
                <span class="font-mono text-[11px] text-sky-200">
                  {{ allDiscoveryEvents.length }} Event Aktif
                </span>
              </div>
            </div>

            <!-- Right Tabbed Agenda List -->
            <div class="lg:col-span-7 flex flex-col justify-between space-y-4">
              <div class="flex flex-wrap items-center justify-between gap-3">
                <div class="inline-flex items-center gap-2">
                  <button
                    type="button"
                    @click="scheduleTab = 'this_week'"
                    class="rounded-full px-3.5 py-1.5 text-xs font-bold border transition-colors cursor-pointer"
                    :class="
                      scheduleTab === 'this_week'
                        ? 'border-[#5293dc] bg-[#72a5e4]/20 text-[#0f172a]'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    "
                  >
                    Minggu Ini
                  </button>
                  <button
                    type="button"
                    @click="scheduleTab = 'this_month'"
                    class="rounded-full px-3.5 py-1.5 text-xs font-bold border transition-colors cursor-pointer"
                    :class="
                      scheduleTab === 'this_month'
                        ? 'border-[#5293dc] bg-[#72a5e4]/20 text-[#0f172a]'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    "
                  >
                    Bulan Ini
                  </button>
                  <button
                    type="button"
                    @click="scheduleTab = 'upcoming_all'"
                    class="rounded-full px-3.5 py-1.5 text-xs font-bold border transition-colors cursor-pointer"
                    :class="
                      scheduleTab === 'upcoming_all'
                        ? 'border-[#5293dc] bg-[#72a5e4]/20 text-[#0f172a]'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    "
                  >
                    Segera Hadir
                  </button>
                </div>

                <button
                  type="button"
                  @click="viewScheduleRange"
                  class="text-xs font-bold text-[#1e5cb3] hover:underline inline-flex items-center gap-1 cursor-pointer"
                >
                  <span>Lihat Semua Event</span>
                  <ChevronRight class="h-3.5 w-3.5" />
                </button>
              </div>

              <div class="divide-y divide-slate-100">
                <RouterLink
                  v-for="evt in activeScheduleEvents"
                  :key="`sched-${evt.id}`"
                  :to="`/events/${evt.slug || evt.id}`"
                  class="group py-3 first:pt-1 last:pb-1 flex items-center gap-3.5 sm:gap-4 hover:bg-slate-50/80 rounded-xl px-2 -mx-2 transition-colors"
                >
                  <!-- Date Badge -->
                  <div class="w-12 h-14 rounded-xl border border-slate-200 bg-[#fafaf9] flex flex-col items-center justify-center shrink-0">
                    <span class="text-[9px] font-extrabold tracking-wider text-[#1e5cb3]">
                      {{ getCalendarParts(evt.start_at || evt.start_date).month }}
                    </span>
                    <span class="text-lg font-black leading-none text-slate-900">
                      {{ getCalendarParts(evt.start_at || evt.start_date).day }}
                    </span>
                    <span class="text-[9px] font-medium text-slate-400">
                      {{ getCalendarParts(evt.start_at || evt.start_date).weekday }}
                    </span>
                  </div>

                  <!-- Event Info -->
                  <div class="flex-1 min-w-0 space-y-1">
                    <h3 class="text-xs sm:text-sm font-bold text-slate-900 truncate group-hover:text-[#1e5cb3]">
                      {{ evt.title }}
                    </h3>
                    <p class="text-[11px] text-slate-500 truncate">
                      {{ evt.location_name || 'Online Event' }} •
                      <span class="font-bold text-slate-700">{{ getPriceDisplay(evt) }}</span>
                    </p>
                  </div>

                  <!-- Right Mini Thumbnail -->
                  <div class="hidden sm:block w-24 h-14 rounded-xl overflow-hidden bg-slate-900 border border-slate-200 shrink-0">
                    <img
                      :src="evt.poster_url || evt.banner_url || FALLBACK_POSTER"
                      :alt="evt.title"
                      loading="lazy"
                      class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                </RouterLink>
              </div>
            </div>
          </div>
        </section>

        <!-- SHELF 5: TERRA Ecosystem Promo Strip + Horizontal Icon Category Bar -->
        <section class="space-y-6">
          <!-- Full-Width Ecosystem Banner -->
          <RouterLink
            to="/pricing"
            class="block rounded-2xl sm:rounded-3xl border border-slate-900/15 bg-gradient-to-r from-[#0f172a] via-[#1b3a6b] to-[#72a5e4] p-5 sm:px-8 sm:py-6 text-white shadow-md hover:shadow-xl transition-shadow group overflow-hidden relative"
          >
            <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
              <div class="space-y-1.5">
                <div class="inline-flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-wider text-sky-200">
                  <Ticket class="h-3.5 w-3.5" />
                  <span>TERRA Studio Event Organizer</span>
                </div>
                <h2 class="text-lg sm:text-2xl font-extrabold tracking-tight text-white">
                  Bikin Event &amp; Jual Tiket QR Otomatis? Mulai Gratis 14 Hari Pro Trial!
                </h2>
                <p class="text-xs text-sky-100/90 max-w-2xl">
                  13 modul kerja kepanitiaan, pembayaran QRIS &amp; Virtual Account instan, plus Live Gate Scanner.
                </p>
              </div>

              <div class="flex flex-wrap items-center gap-2.5 shrink-0">
                <span class="rounded-full bg-emerald-400 text-slate-950 px-3.5 py-1.5 text-xs font-black">
                  Rp0 Starter
                </span>
                <span class="rounded-full bg-amber-300 text-slate-950 px-3.5 py-1.5 text-xs font-black">
                  14 Hari Pro Trial
                </span>
                <span class="inline-flex items-center gap-1.5 rounded-full bg-white text-slate-950 group-hover:bg-sky-100 px-4 py-1.5 text-xs font-extrabold transition-colors">
                  <span>Lihat Paket</span>
                  <ArrowRight class="h-3.5 w-3.5" />
                </span>
              </div>
            </div>
          </RouterLink>

          <!-- Horizontal Category Icon Shortcut Bar -->
          <div class="flex items-stretch gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <button
              v-for="cat in categoryShortcuts"
              :key="cat.key"
              type="button"
              @click="cat.action()"
              class="min-w-[104px] sm:min-w-[116px] flex-1 flex flex-col items-center gap-2 rounded-2xl border border-slate-200/80 bg-white px-3 py-3.5 hover:border-[#72a5e4] hover:shadow-sm transition-all cursor-pointer group"
            >
              <span
                class="h-10 w-10 rounded-xl border flex items-center justify-center transition-transform group-hover:scale-105"
                :class="cat.bg"
              >
                <component :is="cat.icon" class="h-5 w-5" />
              </span>
              <span class="text-[11px] font-bold text-slate-700 group-hover:text-slate-950 text-center leading-tight line-clamp-2">
                {{ cat.label }}
              </span>
            </button>
          </div>
        </section>

        <!-- SHELF 6: Spotlight Event Pilihan (3 Vertical Posters + Dark Studio EO CTA Card) -->
        <section v-if="spotlightEvents.length" class="space-y-4">
          <div class="flex items-center justify-between gap-3">
            <div class="flex items-center gap-2">
              <span class="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-[#0f172a] text-[#72a5e4]">
                <Sparkles class="h-4 w-4" />
              </span>
              <h2 class="text-lg sm:text-xl font-extrabold tracking-tight text-slate-900">
                Spotlight Event Pilihan
              </h2>
            </div>
            <span class="text-xs font-semibold text-slate-500 hidden sm:inline">
              Kurasi acara unggulan &amp; Studio EO
            </span>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            <RouterLink
              v-for="evt in spotlightEvents"
              :key="`spot-${evt.id}`"
              :to="`/events/${evt.slug || evt.id}`"
              class="group relative aspect-[3/4] rounded-2xl overflow-hidden border border-slate-200 bg-slate-900 shadow-sm hover:shadow-xl transition-all"
            >
              <img
                :src="evt.poster_url || evt.banner_url || FALLBACK_POSTER"
                :alt="evt.title"
                loading="lazy"
                class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div class="absolute inset-0 bg-gradient-to-t from-black/90 via-black/25 to-transparent" />
              <div class="absolute inset-x-0 bottom-0 p-4 space-y-1.5 text-white">
                <span class="inline-block rounded-full bg-[#72a5e4] px-2.5 py-0.5 text-[10px] font-extrabold text-slate-950">
                  {{ evt.category || 'Unggulan' }}
                </span>
                <h3 class="text-sm sm:text-base font-extrabold leading-snug line-clamp-2 group-hover:underline">
                  {{ evt.title }}
                </h3>
                <p class="text-[11px] text-slate-200 truncate">
                  {{ formatDate(evt.start_date || evt.start_at) }} • {{ getPriceDisplay(evt) }}
                </p>
              </div>
            </RouterLink>

            <!-- 4th Card: Studio EO CTA Card (matching LOKET Screen right card) -->
            <div class="relative aspect-[3/4] rounded-2xl overflow-hidden bg-gradient-to-br from-[#0f172a] via-[#13294b] to-[#1d4478] p-6 text-white flex flex-col justify-between border border-slate-800 shadow-md">
              <div class="pointer-events-none absolute -right-8 -top-8 h-36 w-36 rounded-full bg-[#72a5e4]/25 blur-2xl" />
              <div class="relative z-10 space-y-3">
                <span class="inline-flex items-center gap-1 rounded-full bg-[#72a5e4]/20 border border-[#72a5e4]/40 px-2.5 py-1 text-[10px] font-bold text-[#72a5e4]">
                  TERRA Studio EO
                </span>
                <h3 class="text-xl sm:text-2xl font-extrabold leading-tight">
                  Promosikan acaramu di halaman depan TERRA.
                </h3>
                <p class="text-xs text-sky-100/85 leading-relaxed">
                  Kelola tim panitia, jual tiket QR berbayar atau gratis, dan pantau check-in peserta secara real-time.
                </p>
              </div>

              <div class="relative z-10 space-y-2.5">
                <RouterLink
                  :to="studioCreateRoute"
                  class="block w-full text-center rounded-full bg-[#72a5e4] hover:bg-[#8bb7ec] px-4 py-2.5 text-xs font-extrabold text-slate-950 transition-colors"
                >
                  Buat Event Sekarang
                </RouterLink>
                <RouterLink
                  to="/pricing"
                  class="block w-full text-center rounded-full border border-white/25 hover:bg-white/10 px-4 py-2 text-xs font-bold text-white transition-colors"
                >
                  Pelajari Paket EO
                </RouterLink>
              </div>
            </div>
          </div>
        </section>

        <!-- SHELF 7: Konser & Festival Spesial Untukmu (4-col) -->
        <section v-if="concertEvents.length" class="space-y-4">
          <div class="flex items-center justify-between gap-3">
            <div class="flex items-center gap-2">
              <span class="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-rose-100 text-rose-600">
                <Music class="h-4 w-4" />
              </span>
              <h2 class="text-lg sm:text-xl font-extrabold tracking-tight text-slate-900">
                Konser &amp; Festival Spesial Untukmu
              </h2>
            </div>
            <button
              type="button"
              @click="applyQuickFilter({ resetFirst: true, category: 'Musik & Konser' })"
              class="text-xs font-bold text-[#1e5cb3] hover:underline inline-flex items-center gap-1 cursor-pointer shrink-0"
            >
              <span>Lihat Semua</span>
              <ChevronRight class="h-3.5 w-3.5" />
            </button>
          </div>

          <div class="flex lg:grid lg:grid-cols-4 gap-4 sm:gap-5 overflow-x-auto pb-2 lg:pb-0 snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div
              v-for="evt in concertEvents"
              :key="`concert-${evt.id}`"
              class="min-w-[260px] sm:min-w-[280px] lg:min-w-0 snap-start flex"
            >
              <ExploreEventCard :event="evt" class="w-full" />
            </div>
          </div>
        </section>

        <!-- SHELF 8: Siap Seru-seruan Bareng Komunitas? (4-col) -->
        <section v-if="communityEvents.length" class="space-y-4">
          <div class="flex items-center justify-between gap-3">
            <div class="flex items-center gap-2">
              <span class="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
                <Users class="h-4 w-4" />
              </span>
              <h2 class="text-lg sm:text-xl font-extrabold tracking-tight text-slate-900">
                Siap Seru-seruan Bareng Komunitas?
              </h2>
            </div>
            <button
              type="button"
              @click="applyQuickFilter({ resetFirst: true, category: 'Komunitas & Sosial' })"
              class="text-xs font-bold text-[#1e5cb3] hover:underline inline-flex items-center gap-1 cursor-pointer shrink-0"
            >
              <span>Lihat Semua</span>
              <ChevronRight class="h-3.5 w-3.5" />
            </button>
          </div>

          <div class="flex lg:grid lg:grid-cols-4 gap-4 sm:gap-5 overflow-x-auto pb-2 lg:pb-0 snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div
              v-for="evt in communityEvents"
              :key="`comm-${evt.id}`"
              class="min-w-[260px] sm:min-w-[280px] lg:min-w-0 snap-start flex"
            >
              <ExploreEventCard :event="evt" class="w-full" />
            </div>
          </div>
        </section>

        <!-- SHELF 9: Jelajahi Event di Kotamu (5-Column City Landmark Cards) -->
        <section v-reveal class="space-y-4">
          <div class="flex items-center justify-between gap-3">
            <div class="flex items-center gap-2">
              <span class="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-[#72a5e4]/25 text-[#1e5cb3]">
                <MapPin class="h-4 w-4" />
              </span>
              <h2 class="text-lg sm:text-xl font-extrabold tracking-tight text-slate-900">
                Jelajahi Event di Kotamu
              </h2>
            </div>
            <button
              type="button"
              @click="applyQuickFilter({ resetFirst: true, showAll: true })"
              class="text-xs font-bold text-[#1e5cb3] hover:underline inline-flex items-center gap-1 cursor-pointer shrink-0"
            >
              <span>Lihat Semua</span>
              <ChevronRight class="h-3.5 w-3.5" />
            </button>
          </div>

          <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
            <button
              v-for="city in cityCards"
              :key="city.label"
              type="button"
              @click="
                city.query === 'Bali'
                  ? applyQuickFilter({ resetFirst: true, format: 'online' })
                  : applyQuickFilter({ resetFirst: true, location: city.query })
              "
              class="group relative h-24 sm:h-28 rounded-2xl border border-slate-200/90 bg-white p-3.5 text-left flex flex-col justify-between overflow-hidden shadow-2xs hover:border-[#72a5e4] hover:shadow-md transition-all cursor-pointer"
            >
              <div class="relative z-10">
                <p class="text-xs sm:text-sm font-extrabold text-slate-900 group-hover:text-[#1e5cb3] leading-tight">
                  {{ city.label }}
                </p>
                <p class="text-[10px] font-medium text-slate-400 mt-0.5">
                  {{ city.query === 'Bali' ? 'Event Online & Resort' : `${city.count} event` }}
                </p>
              </div>
              <span class="relative z-10 inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 group-hover:bg-[#72a5e4] text-slate-600 group-hover:text-slate-950 transition-colors">
                <ChevronRight class="h-3 w-3" />
              </span>

              <!-- Custom Landmark Line Illustration -->
              <svg
                v-if="city.landmark === 'monas'"
                viewBox="0 0 64 72"
                class="pointer-events-none absolute right-2 bottom-0 h-20 w-16 text-slate-200 group-hover:text-[#72a5e4]/50 transition-colors"
                fill="currentColor"
              >
                <path d="M31 4l3 7h-6l3-7zm-3 9h6v4h-6v-4zm1 6h4l3 34h-10l3-34zm-11 34h26l4 7H14l4-7zm-6 8h38v7H12v-7z" />
              </svg>
              <svg
                v-else-if="city.landmark === 'tugu'"
                viewBox="0 0 64 72"
                class="pointer-events-none absolute right-2 bottom-0 h-20 w-16 text-slate-200 group-hover:text-[#72a5e4]/50 transition-colors"
                fill="currentColor"
              >
                <path d="M32 6l3 10h-6l3-10zm-4 12h8v24h-8V18zm-4 25h16v6H24v-6zm-6 8h28v10H18V51zm-6 11h40v6H12v-6z" />
              </svg>
              <svg
                v-else-if="city.landmark === 'sate'"
                viewBox="0 0 72 64"
                class="pointer-events-none absolute right-2 bottom-0 h-16 w-20 text-slate-200 group-hover:text-[#72a5e4]/50 transition-colors"
                fill="currentColor"
              >
                <path d="M36 8l2 8h-4l2-8zm-6 9h12l2 10H28l2-10zm-14 12h40v8H16v-8zm-8 10h56v19H8V39z" />
              </svg>
              <svg
                v-else-if="city.landmark === 'sura'"
                viewBox="0 0 64 64"
                class="pointer-events-none absolute right-2 bottom-0 h-16 w-16 text-slate-200 group-hover:text-[#72a5e4]/50 transition-colors"
                fill="currentColor"
              >
                <path d="M22 18c8-10 22-8 26 2-5 2-9 6-9 12 0 5 3 10 8 13-6 7-20 7-26-2 4-5 5-16 1-25zm-8 34h36v6H14v-6z" />
              </svg>
              <svg
                v-else
                viewBox="0 0 64 64"
                class="pointer-events-none absolute right-2 bottom-0 h-16 w-16 text-slate-200 group-hover:text-[#72a5e4]/50 transition-colors"
                fill="currentColor"
              >
                <path d="M18 14h10v44H18V14zm18 0h10v44H36V14zm-22-4h36v5H14v-5zm4 20h28v6H18v-6zm-6 26h40v4H12v-4z" />
              </svg>
            </button>
          </div>
        </section>

        <!-- SHELF 10: Organizer Terverifikasi Pilihan (3 Two-Tone Cards matching Bottom Reference Row) -->
        <section v-if="verifiedOrganizers.length" v-reveal class="space-y-4">
          <div class="flex items-center justify-between gap-3">
            <div class="flex items-center gap-2">
              <span class="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-sky-100 text-[#1e5cb3]">
                <ShieldCheck class="h-4 w-4" />
              </span>
              <h2 class="text-lg sm:text-xl font-extrabold tracking-tight text-slate-900">
                Organizer Terverifikasi Pilihan
              </h2>
            </div>
            <RouterLink
              to="/organizer/register"
              class="text-xs font-bold text-[#1e5cb3] hover:underline inline-flex items-center gap-1 shrink-0"
            >
              <span>Gabung Organizer</span>
              <ChevronRight class="h-3.5 w-3.5" />
            </RouterLink>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
            <RouterLink
              v-for="(org, idx) in verifiedOrganizers"
              :key="org.id"
              :to="`/organizers/${org.slug}`"
              class="group rounded-2xl border border-slate-200/90 bg-white overflow-hidden shadow-2xs hover:shadow-lg hover:border-[#72a5e4] transition-all flex flex-col justify-between"
            >
              <!-- Two-Tone Split Top Card -->
              <div class="grid grid-cols-12 h-36 sm:h-40">
                <div
                  class="col-span-6 p-4 flex flex-col justify-between"
                  :class="organizerSplitThemes[idx % organizerSplitThemes.length]"
                >
                  <span class="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wide opacity-90">
                    <ShieldCheck class="h-3 w-3" />
                    {{ org.verification_status === 'verified' ? 'Verified EO' : 'Official EO' }}
                  </span>
                  <p class="text-xs sm:text-sm font-extrabold leading-snug line-clamp-3">
                    {{ org.name }}
                  </p>
                </div>
                <div class="col-span-6 bg-slate-900 relative overflow-hidden">
                  <img
                    :src="org.cover_url || org.logo_url || FALLBACK_POSTER"
                    :alt="org.name"
                    loading="lazy"
                    class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                </div>
              </div>

              <!-- Card Footer Caption -->
              <div class="p-4 space-y-1.5">
                <h3 class="text-sm font-bold text-slate-900 group-hover:text-[#1e5cb3] line-clamp-1">
                  {{ org.name }} — {{ org.event_count || 0 }} Event Aktif
                </h3>
                <p class="text-xs text-slate-500 line-clamp-2">
                  {{ org.description || 'Penyelenggara acara kampus, seminar, dan konser terverifikasi di ekosistem TERRA.' }}
                </p>
              </div>
            </RouterLink>
          </div>
        </section>

        <!-- Bottom CTA Strip to Browse Full Paginated Catalog -->
        <div class="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div class="text-center sm:text-left">
            <h3 class="text-base font-extrabold text-slate-900">
              Ingin melihat seluruh daftar acara sekaligus?
            </h3>
            <p class="text-xs text-slate-500 mt-0.5">
              Jelajahi seluruh {{ totalCount }} acara dengan tampilan grid katalog lengkap dan paginasi.
            </p>
          </div>
          <button
            type="button"
            @click="applyQuickFilter({ resetFirst: true, showAll: true })"
            class="rounded-full bg-[#0f172a] hover:bg-[#1e5cb3] px-5 py-2.5 text-xs font-extrabold text-white transition-colors cursor-pointer shrink-0"
          >
            Buka Katalog Lengkap ({{ totalCount }})
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

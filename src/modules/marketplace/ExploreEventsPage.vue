<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import { useEventWorkspaceStore } from '@/stores/eventWorkspace'
import api from '@/services/api'
import { formatDate, formatCurrency } from '@/utils/formatters'
import EmptyState from '@/components/common/EmptyState.vue'
import { Search, SlidersHorizontal, X } from 'lucide-vue-next'

const route = useRoute()
const store = useEventWorkspaceStore()

const search = ref(String(route.query.q || ''))
const selectedCategory = ref(String(route.query.category || ''))
const selectedFormat = ref('')
const selectedPriceType = ref('')
const locationQuery = ref('')
const dateFrom = ref('')
const dateTo = ref('')
const sortBy = ref('upcoming')
const currentPage = ref(1)
const limit = 10
const mobileFiltersOpen = ref(false)

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

const items = ref([])
const totalPages = ref(1)
const totalCount = ref(0)
const loading = ref(false)
let debounceTimer = null

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

onMounted(fetchMarketplaceEvents)

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
}

function getPriceDisplay(evt) {
  const types = evt.ticket_types || []
  if (!types.length) return 'Gratis'
  const prices = types.map((t) => Number(t.price))
  const minPrice = Math.min(...prices)
  return minPrice === 0 ? 'Gratis' : formatCurrency(minPrice)
}
</script>

<template>
  <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 space-y-8">
    <!-- Header -->
    <div v-reveal class="space-y-1">
      <h1 class="text-3xl sm:text-4xl font-bold tracking-tight text-black font-editorial">
        Jelajahi Event
      </h1>
      <p class="text-xs sm:text-sm text-slate-600">
        Temukan acara sesuai minat, kategori, dan format yang kamu inginkan.
      </p>
    </div>

    <!-- Pill Filter Controls (Mobile: Search + Filter Drawer Button + Swipeable Category Chips) -->
    <div v-reveal="60" class="space-y-3">
      <!-- Top Row: Search Input + Mobile Filter Toggle -->
      <div class="flex sm:hidden items-center gap-2">
        <div class="relative flex-1">
          <Search class="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
          <input
            v-model="search"
            type="text"
            placeholder="Cari judul atau organizer..."
            class="w-full rounded-full border-2 border-black bg-white pl-9 pr-4 py-2.5 text-sm text-black placeholder:text-slate-400 focus:outline-hidden shadow-[2px_2px_0px_#000]"
          />
        </div>
        <button
          type="button"
          @click="mobileFiltersOpen = !mobileFiltersOpen"
          class="luxury-pill inline-flex items-center gap-1.5 rounded-full border-2 border-black px-4 py-2.5 text-xs font-bold shrink-0 shadow-[2px_2px_0px_#000]"
          :class="mobileFiltersOpen || activeFilterCount > 0 ? 'bg-[#72a5e4] text-black' : 'bg-white text-black'"
        >
          <SlidersHorizontal class="h-3.5 w-3.5" />
          <span>Filter</span>
          <span
            v-if="activeFilterCount > 0"
            class="inline-flex h-4 w-4 items-center justify-center rounded-full bg-black text-[10px] font-black text-white"
          >
            {{ activeFilterCount }}
          </span>
        </button>
      </div>

      <!-- Mobile Quick Swipeable Category Chips -->
      <div class="flex sm:hidden items-center gap-2 overflow-x-auto no-scrollbar snap-x snap-mandatory pb-1 text-xs">
        <button
          type="button"
          @click="selectedCategory = ''"
          class="snap-start shrink-0 rounded-full border border-black px-3.5 py-1.5 font-bold transition-all"
          :class="!selectedCategory ? 'bg-black text-white' : 'bg-white text-black'"
        >
          Semua ({{ totalCount }})
        </button>
        <button
          v-for="c in store.categories"
          :key="c.id"
          type="button"
          @click="selectedCategory = c.name"
          class="snap-start shrink-0 rounded-full border border-black px-3.5 py-1.5 font-semibold transition-all whitespace-nowrap"
          :class="selectedCategory === c.name ? 'bg-[#72a5e4] text-black font-bold shadow-[2px_2px_0px_#000]' : 'bg-white text-slate-700'"
        >
          {{ c.name }}
        </button>
      </div>

      <!-- Collapsible Filter Controls (Always visible on sm+, toggleable on mobile) -->
      <div :class="mobileFiltersOpen ? 'block space-y-3 rounded-3xl border-2 border-black bg-white p-4 shadow-[4px_4px_0px_#000] sm:rounded-none sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none' : 'hidden sm:block space-y-3'">
        <div class="flex sm:hidden items-center justify-between border-b border-black/10 pb-2.5">
          <span class="text-xs font-black uppercase tracking-wider text-black">Filter &amp; Urutan Event</span>
          <button type="button" @click="mobileFiltersOpen = false" class="p-1 rounded-full border border-black">
            <X class="h-3.5 w-3.5" />
          </button>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <!-- Search (Desktop/Tablet) -->
          <div class="relative hidden sm:block">
            <Search class="absolute left-4 top-3 h-3.5 w-3.5 text-slate-400" />
            <input
              v-model="search"
              type="text"
              placeholder="Cari judul atau organizer..."
              class="w-full rounded-full border border-black bg-white pl-9 pr-4 py-2.5 text-xs text-black placeholder:text-slate-400 focus:outline-hidden"
            />
          </div>

          <!-- Category Filter -->
          <div class="relative">
            <select
              v-model="selectedCategory"
              class="w-full rounded-full border border-black bg-white px-4 py-2.5 text-xs text-black focus:outline-hidden appearance-none cursor-pointer"
            >
              <option value="">Semua Kategori</option>
              <option v-for="c in store.categories" :key="c.id" :value="c.name">{{ c.name }}</option>
            </select>
            <span class="pointer-events-none absolute right-4 top-2.5 text-xs text-black">⌄</span>
          </div>

          <!-- Format Filter -->
          <div class="relative">
            <select
              v-model="selectedFormat"
              class="w-full rounded-full border border-black bg-white px-4 py-2.5 text-xs text-black focus:outline-hidden appearance-none cursor-pointer"
            >
              <option value="">Semua Format</option>
              <option value="offline">Offline</option>
              <option value="online">Online</option>
              <option value="hybrid">Hybrid</option>
            </select>
            <span class="pointer-events-none absolute right-4 top-2.5 text-xs text-black">⌄</span>
          </div>

          <!-- Sort Filter -->
          <div class="relative">
            <select
              v-model="sortBy"
              class="w-full rounded-full border border-black bg-white px-4 py-2.5 text-xs text-black focus:outline-hidden appearance-none cursor-pointer"
            >
              <option value="upcoming">Terdekat (Upcoming)</option>
              <option value="popular">Populer (Popular)</option>
              <option value="newest">Terbaru (Newest)</option>
            </select>
            <span class="pointer-events-none absolute right-4 top-2.5 text-xs text-black">⌄</span>
          </div>
        </div>

        <!-- Extended Filters Row -->
        <div class="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 sm:gap-3 items-center">
          <div class="relative col-span-2 sm:col-span-1">
            <select
              v-model="selectedPriceType"
              class="w-full rounded-full border border-black bg-white px-4 py-2 text-xs text-black focus:outline-hidden appearance-none cursor-pointer"
            >
              <option value="">Semua Harga (Gratis / Berbayar)</option>
              <option value="free">Gratis</option>
              <option value="paid">Berbayar</option>
            </select>
            <span class="pointer-events-none absolute right-4 top-2 text-xs text-black">⌄</span>
          </div>

          <input
            v-model="locationQuery"
            type="text"
            placeholder="Kota / Kampus / Venue..."
            class="col-span-2 sm:col-span-1 w-full rounded-full border border-black bg-white px-4 py-2 text-xs text-black placeholder:text-slate-400 focus:outline-hidden"
          />

          <input
            v-model="dateFrom"
            type="date"
            title="Mulai dari tanggal"
            class="w-full rounded-full border border-black bg-white px-3 sm:px-4 py-2 text-xs text-black focus:outline-hidden"
          />

          <input
            v-model="dateTo"
            type="date"
            title="Sampai tanggal"
            class="w-full rounded-full border border-black bg-white px-3 sm:px-4 py-2 text-xs text-black focus:outline-hidden"
          />

          <button
            type="button"
            @click="resetFilters"
            class="col-span-2 lg:col-span-1 rounded-full border border-black bg-[#fafaf9] px-4 py-2 text-xs font-bold text-black hover:bg-slate-100 cursor-pointer"
          >
            Reset Filter ({{ totalCount }})
          </button>
        </div>
      </div>
    </div>

    <div v-if="loading && !items.length" class="py-12 text-center text-xs text-slate-600">
      Memuat daftar event...
    </div>

    <!-- 2-Column Event Grid -->
    <div v-else-if="items.length" class="space-y-6">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <RouterLink
          v-for="(evt, idx) in items"
          :key="evt.id"
          v-reveal="idx * 70"
          :to="`/events/${evt.slug || evt.id}`"
          class="interactive-surface group rounded-3xl border border-black bg-white overflow-hidden flex flex-col justify-between"
        >
        <!-- Media / Banner with Pill Tag -->
        <div class="relative aspect-video bg-black overflow-hidden border-b border-black">
          <img
            :src="evt.poster_url"
            :alt="evt.title"
            class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-102"
          />
          <div class="absolute top-3 left-3">
            <span class="rounded-full border border-black bg-white px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-black">
              {{ evt.location_type || 'Offline' }}
            </span>
          </div>
        </div>

        <!-- Content -->
        <div class="p-6 space-y-4 flex-1 flex flex-col justify-between">
          <div class="space-y-2">
            <span class="text-[11px] font-medium text-slate-500 block">
              {{ evt.category }}
            </span>
            <h3 class="text-xl font-bold tracking-tight text-black group-hover:underline leading-snug">
              {{ evt.title }}
            </h3>
            <div class="text-xs text-slate-600 space-y-0.5 pt-1">
              <p>{{ formatDate(evt.start_date || evt.start_at) }}</p>
              <p>{{ evt.venue_name || evt.location_name }}</p>
            </div>
          </div>

        <!-- Dashed Divider & Bottom Info -->
          <div class="pt-4 border-t border-dashed border-black/30 flex items-center justify-between text-xs">
            <span class="text-slate-600">{{ evt.organization_name || evt.organization?.name || 'Nusantara Tech Community' }}</span>
            <span class="text-sm font-bold text-black">{{ getPriceDisplay(evt) }}</span>
          </div>
        </div>
      </RouterLink>
      </div>

      <!-- Pagination Controls -->
      <div
        v-if="totalPages > 1"
        class="flex items-center justify-center gap-3 pt-2 text-xs"
      >
        <button
          type="button"
          :disabled="currentPage <= 1"
          @click="currentPage--"
          class="rounded-full border border-black bg-white px-4 py-2 font-bold text-black disabled:opacity-40 cursor-pointer"
        >
          &larr; Sebelumnya
        </button>
        <span class="font-bold text-black">
          Halaman {{ currentPage }} / {{ totalPages }}
        </span>
        <button
          type="button"
          :disabled="currentPage >= totalPages"
          @click="currentPage++"
          class="rounded-full border border-black bg-white px-4 py-2 font-bold text-black disabled:opacity-40 cursor-pointer"
        >
          Berikutnya &rarr;
        </button>
      </div>
    </div>

    <EmptyState
      v-else
      title="Tidak ada event ditemukan"
      description="Coba ubah kata kunci pencarian atau sesuaikan filter kategori Anda."
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import { useEventWorkspaceStore } from '@/stores/eventWorkspace'
import api from '@/services/api'
import { formatDate, formatCurrency } from '@/utils/formatters'
import EmptyState from '@/components/common/EmptyState.vue'
import { ChevronDown, Search, SlidersHorizontal, X } from 'lucide-vue-next'

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
const limit = 12
const advancedFiltersOpen = ref(false)

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

const activeFilterChips = computed(() => {
  const chips = []
  if (selectedCategory.value) chips.push({ key: 'category', label: selectedCategory.value })
  if (selectedFormat.value) chips.push({ key: 'format', label: `Format: ${selectedFormat.value}` })
  if (selectedPriceType.value) {
    chips.push({ key: 'price', label: selectedPriceType.value === 'free' ? 'Gratis' : 'Berbayar' })
  }
  if (locationQuery.value.trim()) chips.push({ key: 'location', label: `Lokasi: ${locationQuery.value.trim()}` })
  if (dateFrom.value || dateTo.value) {
    chips.push({ key: 'dates', label: `${dateFrom.value || '...'} – ${dateTo.value || '...'}` })
  }
  return chips
})

function clearFilterChip(key) {
  if (key === 'category') selectedCategory.value = ''
  if (key === 'format') selectedFormat.value = ''
  if (key === 'price') selectedPriceType.value = ''
  if (key === 'location') locationQuery.value = ''
  if (key === 'dates') {
    dateFrom.value = ''
    dateTo.value = ''
  }
}

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
  <div class="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-10 sm:py-12 space-y-6">
    <!-- Header -->
    <div v-reveal class="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
      <div class="space-y-1">
        <h1 class="text-3xl sm:text-4xl font-extrabold tracking-tight text-black">
          Katalog Acara Publik
        </h1>
        <p class="text-xs sm:text-sm text-slate-600">
          Temukan acara sesuai minat, kategori, kota, dan jadwal yang Anda inginkan.
        </p>
      </div>
      <span class="font-mono text-xs font-semibold text-slate-600 shrink-0">
        Menampilkan {{ totalCount }} acara
      </span>
    </div>

    <!-- Clean Unified Filter Toolbar -->
    <div v-reveal="40" class="space-y-3">
      <div class="rounded-2xl border border-black bg-white p-3 space-y-3">
        <!-- Primary Toolbar Row -->
        <div class="flex flex-col lg:flex-row items-stretch lg:items-center gap-2.5">
          <div class="relative flex-1">
            <Search class="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              v-model="search"
              type="text"
              placeholder="Cari judul acara atau penyelenggara..."
              class="w-full rounded-full border border-black/25 bg-[#fafaf9] pl-10 pr-4 py-2 text-xs text-black placeholder:text-slate-400 focus:border-black focus:bg-white focus:outline-hidden"
            />
          </div>

          <div class="grid grid-cols-2 sm:grid-cols-4 lg:flex items-center gap-2">
            <div class="relative">
              <select
                v-model="selectedCategory"
                aria-label="Filter Kategori"
                class="terra-select w-full rounded-full border border-black/25 bg-[#fafaf9] px-4 py-2 pr-8 text-xs font-medium text-black focus:border-black focus:outline-hidden appearance-none cursor-pointer"
              >
                <option value="">Semua Kategori</option>
                <option v-for="c in store.categories" :key="c.id" :value="c.name">{{ c.name }}</option>
              </select>
              <ChevronDown class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
            </div>

            <div class="relative">
              <select
                v-model="selectedFormat"
                aria-label="Filter Format"
                class="terra-select w-full rounded-full border border-black/25 bg-[#fafaf9] px-4 py-2 pr-8 text-xs font-medium text-black focus:border-black focus:outline-hidden appearance-none cursor-pointer"
              >
                <option value="">Semua Format</option>
                <option value="offline">Offline</option>
                <option value="online">Online</option>
                <option value="hybrid">Hybrid</option>
              </select>
              <ChevronDown class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
            </div>

            <div class="relative">
              <select
                v-model="sortBy"
                aria-label="Urutkan"
                class="terra-select w-full rounded-full border border-black/25 bg-[#fafaf9] px-4 py-2 pr-8 text-xs font-medium text-black focus:border-black focus:outline-hidden appearance-none cursor-pointer"
              >
                <option value="upcoming">Terdekat</option>
                <option value="popular">Populer</option>
                <option value="newest">Terbaru</option>
              </select>
              <ChevronDown class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
            </div>

            <button
              type="button"
              @click="advancedFiltersOpen = !advancedFiltersOpen"
              class="inline-flex items-center justify-center gap-1.5 rounded-full border border-black px-4 py-2 text-xs font-bold transition-colors cursor-pointer shrink-0"
              :class="advancedFiltersOpen || activeFilterCount > 0 ? 'bg-[#72a5e4] text-black' : 'bg-white text-black hover:bg-slate-100'"
            >
              <SlidersHorizontal class="h-3.5 w-3.5" />
              <span>Filter Lanjutan</span>
              <span
                v-if="activeFilterCount > 0"
                class="inline-flex h-4 w-4 items-center justify-center rounded-full bg-black text-[10px] font-bold text-white"
              >
                {{ activeFilterCount }}
              </span>
            </button>
          </div>
        </div>

        <!-- Expandable Advanced Filter Panel -->
        <div
          v-if="advancedFiltersOpen"
          class="pt-3 border-t border-black/10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 items-center"
        >
          <div class="relative">
            <select
              v-model="selectedPriceType"
              aria-label="Filter Harga"
              class="terra-select w-full rounded-full border border-black/25 bg-[#fafaf9] px-4 py-2 pr-8 text-xs text-black focus:border-black focus:outline-hidden appearance-none cursor-pointer"
            >
              <option value="">Semua Harga</option>
              <option value="free">Gratis</option>
              <option value="paid">Berbayar</option>
            </select>
            <ChevronDown class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
          </div>

          <input
            v-model="locationQuery"
            type="text"
            placeholder="Kota / Kampus / Venue..."
            class="w-full rounded-full border border-black/25 bg-[#fafaf9] px-4 py-2 text-xs text-black placeholder:text-slate-400 focus:border-black focus:outline-hidden"
          />

          <label class="flex items-center gap-2 rounded-full border border-black/25 bg-[#fafaf9] px-3.5 py-1.5 text-xs text-black">
            <span class="text-[11px] font-medium text-slate-500 shrink-0">Dari:</span>
            <input
              v-model="dateFrom"
              type="date"
              aria-label="Tanggal mulai"
              class="w-full bg-transparent text-xs text-black focus:outline-hidden"
            />
          </label>

          <label class="flex items-center gap-2 rounded-full border border-black/25 bg-[#fafaf9] px-3.5 py-1.5 text-xs text-black">
            <span class="text-[11px] font-medium text-slate-500 shrink-0">Sampai:</span>
            <input
              v-model="dateTo"
              type="date"
              aria-label="Tanggal selesai"
              class="w-full bg-transparent text-xs text-black focus:outline-hidden"
            />
          </label>

          <button
            type="button"
            @click="resetFilters"
            class="rounded-full border border-black bg-white px-4 py-2 text-xs font-bold text-black hover:bg-slate-100 cursor-pointer"
          >
            Reset Semua
          </button>
        </div>
      </div>

      <!-- Active Filter Chips Row -->
      <div v-if="activeFilterChips.length" class="flex flex-wrap items-center gap-2 text-xs">
        <span class="text-slate-500 font-medium">Filter aktif:</span>
        <button
          v-for="chip in activeFilterChips"
          :key="chip.key"
          type="button"
          @click="clearFilterChip(chip.key)"
          class="inline-flex items-center gap-1.5 rounded-full border border-black bg-[#72a5e4]/25 px-3 py-1 text-xs font-semibold text-black hover:bg-[#72a5e4]/40 cursor-pointer"
        >
          <span>{{ chip.label }}</span>
          <X class="h-3 w-3" />
        </button>
        <button
          type="button"
          @click="resetFilters"
          class="text-xs font-bold text-slate-600 hover:text-black underline ml-1 cursor-pointer"
        >
          Hapus semua
        </button>
      </div>
    </div>

    <div v-if="loading && !items.length" class="py-12 text-center text-xs text-slate-600">
      Memuat daftar acara...
    </div>

    <!-- 3-Column International Poster Grid -->
    <div v-else-if="items.length" class="space-y-8">
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        <RouterLink
          v-for="(evt, idx) in items"
          :key="evt.id"
          v-reveal="idx * 50"
          :to="`/events/${evt.slug || evt.id}`"
          class="interactive-surface group rounded-2xl border border-black bg-white overflow-hidden flex flex-col justify-between"
        >
          <div class="relative aspect-[16/10] bg-black overflow-hidden border-b border-black">
            <img
              :src="evt.poster_url"
              :alt="evt.title"
              class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-103"
            />
            <span class="absolute top-3 left-3 rounded-full border border-black bg-white/95 px-2.5 py-0.5 text-[11px] font-semibold text-black capitalize">
              {{ evt.location_type || 'offline' }}
            </span>
          </div>

          <div class="p-5 space-y-4 flex-1 flex flex-col justify-between">
            <div class="space-y-1.5">
              <div class="flex items-center justify-between gap-2 text-[11px]">
                <span class="font-semibold text-slate-500 truncate">{{ evt.category }}</span>
                <span class="font-mono text-slate-500 shrink-0">{{ formatDate(evt.start_date || evt.start_at) }}</span>
              </div>
              <h3 class="text-base sm:text-lg font-bold tracking-tight text-black group-hover:underline leading-snug line-clamp-2">
                {{ evt.title }}
              </h3>
              <p class="text-xs text-slate-600 truncate">
                {{ evt.venue_name || evt.location_name }}
              </p>
            </div>

            <div class="pt-3.5 border-t border-dashed border-black/20 flex items-center justify-between gap-2 text-xs">
              <span class="text-slate-600 truncate">{{ evt.organization_name || evt.organization?.name || 'TERRA Organizer' }}</span>
              <span class="font-mono text-sm font-bold text-black shrink-0">{{ getPriceDisplay(evt) }}</span>
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
          Sebelumnya
        </button>
        <span class="font-mono font-bold text-black">
          Halaman {{ currentPage }} / {{ totalPages }}
        </span>
        <button
          type="button"
          :disabled="currentPage >= totalPages"
          @click="currentPage++"
          class="rounded-full border border-black bg-white px-4 py-2 font-bold text-black disabled:opacity-40 cursor-pointer"
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
</template>

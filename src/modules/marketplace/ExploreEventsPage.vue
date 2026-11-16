<script setup>
import { ref, computed } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import { useEventWorkspaceStore } from '@/stores/eventWorkspace'
import { MOCK_CATEGORIES } from '@/services/mockData'
import { formatDate, formatCurrency } from '@/utils/formatters'
import EmptyState from '@/components/common/EmptyState.vue'
import { Search } from 'lucide-vue-next'

const route = useRoute()
const store = useEventWorkspaceStore()

const search = ref(route.query.q || '')
const selectedCategory = ref(route.query.category || '')
const selectedFormat = ref('')
const sortBy = ref('upcoming')

const filteredEvents = computed(() => {
  let list = store.events.filter((e) => e.publication_status === 'Published')

  if (search.value.trim()) {
    const q = search.value.toLowerCase()
    list = list.filter(
      (e) =>
        e.title.toLowerCase().includes(q) ||
        (e.organization?.name && e.organization.name.toLowerCase().includes(q)) ||
        (e.venue_name && e.venue_name.toLowerCase().includes(q))
    )
  }

  if (selectedCategory.value) {
    list = list.filter((e) => e.category === selectedCategory.value)
  }

  if (selectedFormat.value) {
    list = list.filter((e) => e.location_type === selectedFormat.value)
  }

  if (sortBy.value === 'upcoming') {
    list = [...list].sort((a, b) => new Date(a.start_date || a.start_at) - new Date(b.start_date || b.start_at))
  }

  return list
})

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
    <div class="space-y-1">
      <h1 class="text-3xl sm:text-4xl font-bold tracking-tight text-black font-editorial">
        Jelajahi Event
      </h1>
      <p class="text-xs sm:text-sm text-slate-600">
        Temukan acara sesuai minat, kategori, dan format yang kamu inginkan.
      </p>
    </div>

    <!-- 4 Pill Filter Controls -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      <!-- Search -->
      <div class="relative">
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
          <option v-for="c in MOCK_CATEGORIES" :key="c.id" :value="c.name">{{ c.name }}</option>
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
          <option value="latest">Terbaru (Latest)</option>
        </select>
        <span class="pointer-events-none absolute right-4 top-2.5 text-xs text-black">⌄</span>
      </div>
    </div>

    <!-- 2-Column Event Grid -->
    <div v-if="filteredEvents.length" class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <RouterLink
        v-for="evt in filteredEvents"
        :key="evt.id"
        :to="`/events/${evt.id}`"
        class="group rounded-3xl border border-black bg-white overflow-hidden flex flex-col justify-between transition-transform hover:-translate-y-0.5"
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

    <EmptyState
      v-else
      title="Tidak ada event ditemukan"
      description="Coba ubah kata kunci pencarian atau sesuaikan filter kategori Anda."
    />
  </div>
</template>

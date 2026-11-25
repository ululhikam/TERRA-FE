<script setup>
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { formatDate, formatCurrency } from '@/utils/formatters'

const FALLBACK_POSTER =
  'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&q=80'

const props = defineProps({
  event: {
    type: Object,
    required: true
  },
  badge: {
    type: String,
    default: ''
  }
})

const imgErrored = ref(false)

const posterSrc = computed(() => {
  if (imgErrored.value) return FALLBACK_POSTER
  return props.event?.poster_url || props.event?.banner_url || FALLBACK_POSTER
})

const priceDisplay = computed(() => {
  const types = props.event?.ticket_types || []
  if (!types.length) return 'Gratis'
  const prices = types.map((t) => Number(t.price || 0))
  const minPrice = Math.min(...prices)
  return minPrice === 0 ? 'Gratis' : formatCurrency(minPrice)
})

const badgeLabel = computed(() => {
  if (props.badge) return props.badge
  const type = String(props.event?.location_type || '').toLowerCase()
  if (type === 'online') return 'Online'
  if (type === 'hybrid') return 'Hybrid'
  return ''
})

const dateDisplay = computed(() => {
  const raw = props.event?.start_date || props.event?.start_at
  if (!raw) return 'Segera Hadir'
  try {
    const d = new Date(raw)
    if (Number.isNaN(d.getTime())) return formatDate(raw)
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    }).format(d)
  } catch {
    return formatDate(raw)
  }
})

const venueDisplay = computed(() => {
  return props.event?.venue_name || props.event?.location_name || 'Online Event'
})
</script>

<template>
  <RouterLink
    :to="`/events/${event.slug || event.id}`"
    class="group flex flex-col cursor-pointer transition-all duration-200"
  >
    <!-- Card Thumbnail with Rounded-xl Corners -->
    <div class="relative aspect-[16/9] w-full rounded-xl overflow-hidden bg-slate-100 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.08)] group-hover:shadow-[0_8px_20px_-4px_rgba(0,0,0,0.14)] transition-all">
      <img
        :src="posterSrc"
        :alt="event.title"
        loading="lazy"
        @error="imgErrored = true"
        class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
      />
      <!-- Soft Gradient on bottom of thumbnail for badge clarity -->
      <div class="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

      <span
        v-if="badgeLabel"
        class="absolute top-2 left-2 rounded-md bg-black/65 backdrop-blur-xs px-2 py-0.5 text-[10px] font-bold text-white tracking-wide"
      >
        {{ badgeLabel }}
      </span>
    </div>

    <!-- Card Content Directly Below Image (Borderless Style like Loket) -->
    <div class="pt-2.5 pb-1 flex-1 flex flex-col justify-between space-y-1">
      <div>
        <p class="text-[11px] font-medium text-slate-500 truncate">
          {{ dateDisplay }}
        </p>

        <h3 class="text-[13px] sm:text-[14px] font-bold text-slate-900 leading-snug line-clamp-2 group-hover:text-[#0052cc] transition-colors mt-0.5 min-h-[2.4rem]">
          {{ event.title }}
        </h3>

        <p class="text-[11.5px] text-slate-500 truncate mt-0.5">
          {{ venueDisplay }}
        </p>
      </div>

      <div class="pt-2">
        <p class="text-[10px] font-medium text-slate-400 leading-none">Mulai dari</p>
        <p
          class="text-[14px] font-extrabold tracking-tight mt-1"
          :class="priceDisplay === 'Gratis' ? 'text-emerald-700' : 'text-slate-950'"
        >
          {{ priceDisplay }}
        </p>
      </div>
    </div>
  </RouterLink>
</template>

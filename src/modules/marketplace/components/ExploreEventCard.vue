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

const organizerName = computed(
  () => props.event?.organization_name || props.event?.organization?.name || 'TERRA Organizer'
)

const organizerInitial = computed(() =>
  String(organizerName.value || 'T').trim().charAt(0).toUpperCase()
)

const priceDisplay = computed(() => {
  const types = props.event?.ticket_types || []
  if (!types.length) return 'Gratis'
  const prices = types.map((t) => Number(t.price || 0))
  const minPrice = Math.min(...prices)
  return minPrice === 0 ? 'Gratis' : formatCurrency(minPrice)
})

const isFree = computed(() => priceDisplay.value === 'Gratis')

const badgeLabel = computed(() => {
  if (props.badge) return props.badge
  const type = String(props.event?.location_type || '').toLowerCase()
  if (type === 'online') return 'Online'
  if (type === 'hybrid') return 'Hybrid'
  if (props.event?.is_featured) return 'Pilihan'
  return ''
})
</script>

<template>
  <RouterLink
    :to="`/events/${event.slug || event.id}`"
    class="group flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white overflow-hidden shadow-[0_2px_10px_-4px_rgba(15,23,42,0.06)] hover:shadow-[0_14px_30px_-10px_rgba(15,23,42,0.16)] hover:border-[#72a5e4] hover:-translate-y-0.5 transition-all duration-200"
  >
    <div>
      <div class="relative aspect-[16/9] bg-slate-900 overflow-hidden">
        <img
          :src="posterSrc"
          :alt="event.title"
          loading="lazy"
          @error="imgErrored = true"
          class="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        <span
          v-if="badgeLabel"
          class="absolute top-2.5 left-2.5 rounded-full bg-white/95 backdrop-blur-xs border border-slate-200 px-2.5 py-0.5 text-[10px] font-bold text-slate-900 shadow-xs capitalize"
        >
          {{ badgeLabel }}
        </span>
      </div>

      <div class="p-3.5 sm:p-4 space-y-1.5">
        <p class="text-[11px] font-medium text-slate-500 truncate">
          {{ formatDate(event.start_date || event.start_at) }}
        </p>
        <h3 class="text-[13.5px] sm:text-sm font-bold text-slate-900 leading-snug line-clamp-2 group-hover:text-[#1e5cb3] transition-colors min-h-[2.4rem]">
          {{ event.title }}
        </h3>
        <p class="text-[11px] text-slate-500 truncate">
          {{ event.venue_name || event.location_name || 'Online Event' }}
        </p>
      </div>
    </div>

    <div class="px-3.5 sm:px-4 pb-3.5 sm:pb-4 pt-2 border-t border-dashed border-slate-200 space-y-2.5">
      <div>
        <span class="block text-[10px] font-medium text-slate-400">Mulai dari</span>
        <span
          class="text-sm font-extrabold tracking-tight"
          :class="isFree ? 'text-emerald-700' : 'text-slate-900'"
        >
          {{ priceDisplay }}
        </span>
      </div>

      <div class="pt-2 border-t border-slate-100 flex items-center gap-2 min-w-0">
        <img
          v-if="event.organization?.logo_url"
          :src="event.organization.logo_url"
          :alt="organizerName"
          class="h-4 w-4 rounded-full object-cover border border-slate-200 shrink-0"
        />
        <span
          v-else
          class="h-4 w-4 rounded-full bg-[#72a5e4]/30 text-[#0f172a] border border-[#72a5e4]/60 inline-flex items-center justify-center text-[9px] font-extrabold shrink-0"
        >
          {{ organizerInitial }}
        </span>
        <span class="text-[11px] font-medium text-slate-500 truncate">
          {{ organizerName }}
        </span>
      </div>
    </div>
  </RouterLink>
</template>

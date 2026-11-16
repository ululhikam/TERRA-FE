<script setup>
import { computed, ref } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import { useEventWorkspaceStore } from '@/stores/eventWorkspace'
import { formatDateTime, formatCurrency } from '@/utils/formatters'
import { useToastStore } from '@/stores/toast'
import { ArrowLeft } from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()
const store = useEventWorkspaceStore()
const toast = useToastStore()

const event = computed(() =>
  store.events.find((e) => e.slug === route.params.slug || e.id === route.params.slug) || store.events[0]
)

const selectedTicketId = ref('')
const quantity = ref(1)

const ticketTypes = computed(() => event.value?.ticket_types || [])

const activeTicket = computed(() => {
  return ticketTypes.value.find((t) => t.id === selectedTicketId.value) || ticketTypes.value[0]
})

function selectTicket(id) {
  selectedTicketId.value = id
}

function incrementQty() {
  quantity.value++
}

function decrementQty() {
  if (quantity.value > 1) quantity.value--
}

function proceedCheckout() {
  router.push({
    path: `/checkout/${event.value.slug || event.value.id}`,
    query: { ticketId: activeTicket.value?.id, qty: quantity.value }
  })
}

function shareEvent() {
  navigator.clipboard?.writeText(window.location.href)
  toast.success('Tautan event disalin ke clipboard!')
}
</script>

<template>
  <div v-if="event" class="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8 space-y-6">
    <RouterLink to="/events" class="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-black">
      <ArrowLeft class="h-3.5 w-3.5" /> Kembali ke Explore
    </RouterLink>

    <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      <!-- Left Column (8 Cols) -->
      <div class="lg:col-span-8 space-y-6">
        <!-- Main 16:9 Media Cover -->
        <div class="relative aspect-video rounded-2xl overflow-hidden border border-black bg-black">
          <img
            :src="event.banner_url || event.poster_url"
            :alt="event.title"
            class="w-full h-full object-cover"
          />
          <div class="absolute top-3.5 left-3.5">
            <span class="rounded-full border border-black bg-white px-3.5 py-1 text-[10px] font-bold uppercase tracking-wider text-black">
              {{ (event.location_type || 'HYBRID').toUpperCase() }}
            </span>
          </div>
        </div>

        <!-- Category Pill & Share Pill -->
        <div class="flex items-center justify-between gap-3">
          <span class="rounded-full border border-black bg-[#72a5e4] px-4 py-1 text-xs font-bold text-black">
            {{ event.category }}
          </span>
          <button
            @click="shareEvent"
            class="rounded-full border border-black bg-white px-4 py-1 text-xs font-semibold text-black hover:bg-slate-100"
          >
            Bagikan ↗
          </button>
        </div>

        <!-- Title -->
        <h1 class="text-3xl sm:text-4xl font-bold tracking-tight text-black font-sans leading-tight">
          {{ event.title }}
        </h1>

        <!-- Waktu Pelaksanaan & Lokasi Row -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-6 py-4 border-y border-black/15 text-xs">
          <div class="space-y-1">
            <span class="text-[9px] font-bold uppercase tracking-wider text-slate-400 block">
              WAKTU PELAKSANAAN
            </span>
            <p class="text-sm font-bold text-black">
              {{ formatDateTime(event.start_at || event.start_date) }}
            </p>
          </div>
          <div class="space-y-1">
            <span class="text-[9px] font-bold uppercase tracking-wider text-slate-400 block">
              LOKASI
            </span>
            <p class="text-sm font-bold text-black">
              {{ event.location_name || event.venue_name }}
            </p>
            <p class="text-[11px] text-slate-500">
              {{ event.address || 'Jl. Gatot Subroto, Senayan, Jakarta Pusat' }}
            </p>
          </div>
        </div>

        <!-- Tentang Event -->
        <div class="space-y-2.5 pt-1">
          <h2 class="text-lg font-bold text-black font-sans">Tentang Event</h2>
          <p class="text-sm sm:text-base font-editorial text-slate-800 leading-relaxed">
            {{ event.description }}
          </p>
        </div>

        <!-- Guest Star & Pemateri -->
        <div class="space-y-3.5 pt-3">
          <h2 class="text-lg font-bold text-black font-sans">Guest Star &amp; Pemateri</h2>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div
              v-for="sp in (event.speakers || [])"
              :key="sp.id"
              class="rounded-xl border border-black bg-[#fafaf9] p-4 space-y-3 flex flex-col justify-between"
            >
              <div class="space-y-2.5">
                <div class="flex items-center gap-3">
                  <img
                    :src="sp.avatar_url"
                    :alt="sp.name"
                    class="h-10 w-10 rounded-lg border border-black object-cover shrink-0 bg-white"
                  />
                  <div>
                    <span class="text-[8px] font-bold uppercase tracking-wider text-slate-400 block">
                      {{ sp.type || 'PEMATERI' }}
                    </span>
                    <h4 class="text-xs font-bold text-black leading-snug">{{ sp.name }}</h4>
                  </div>
                </div>
                <p class="text-[10px] text-slate-500">{{ sp.role_title }}</p>
              </div>

              <div class="pt-2.5 border-t border-black/10">
                <p class="text-[11px] font-bold text-black leading-snug">{{ sp.topic }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Rundown Acara -->
        <div class="space-y-3.5 pt-3">
          <h2 class="text-lg font-bold text-black font-sans">Rundown Acara</h2>

          <div class="space-y-2.5">
            <div
              v-for="sc in (event.schedules || []).filter(s => !s.visibility || s.visibility === 'public')"
              :key="sc.id"
              class="rounded-xl border border-black bg-[#fafaf9] p-4 flex flex-col sm:flex-row sm:items-center gap-4"
            >
              <span class="rounded-full border border-black bg-[#72a5e4] px-4 py-1 text-[11px] font-bold text-black font-mono shrink-0 text-center">
                {{ sc.start_time }} – {{ sc.end_time }}
              </span>
              <div class="space-y-0.5">
                <p class="text-xs font-bold text-black">{{ sc.title }}</p>
                <p class="text-[11px] text-slate-500">{{ sc.location }} • PIC: {{ sc.pic }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Right Column (4 Cols): Organizer Box + Sticky Pilih Tiket -->
      <div class="lg:col-span-4 space-y-4 sticky top-20">
        <!-- Diselenggarakan Oleh Card -->
        <RouterLink
          :to="`/organizers/${event.organization?.slug || 'nusantara-tech'}`"
          class="rounded-xl border border-black bg-[#fafaf9] p-4 flex items-center gap-3.5 hover:bg-white transition-colors block"
        >
          <img
            :src="event.organization?.logo_url || 'https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=200&q=80'"
            :alt="event.organization?.name"
            class="h-12 w-12 rounded-lg border border-black object-cover shrink-0 bg-white"
          />
          <div class="space-y-0.5">
            <span class="text-[9px] font-bold uppercase tracking-wider text-slate-400 block">
              DISELENGGARAKAN OLEH
            </span>
            <p class="text-xs font-bold text-black">
              {{ event.organization?.name || event.organization_name || 'Nusantara Tech Community' }}
            </p>
            <span class="text-[11px] text-slate-600 block">Lihat profil organizer ↗</span>
          </div>
        </RouterLink>

        <!-- Pilih Tiket Card -->
        <div class="rounded-2xl border border-black bg-[#fafaf9] p-6 space-y-4">
          <h3 class="text-lg font-bold text-black font-sans">Pilih Tiket</h3>

          <div class="space-y-3">
            <div
              v-for="tkt in ticketTypes"
              :key="tkt.id"
              @click="selectTicket(tkt.id)"
              class="rounded-xl border border-black p-4 cursor-pointer transition-colors space-y-3"
              :class="activeTicket?.id === tkt.id ? 'bg-[#72a5e4]/25' : 'bg-[#fafaf9] hover:bg-white'"
            >
              <div class="space-y-1">
                <div class="flex items-center justify-between gap-2">
                  <p class="text-xs font-bold text-black">{{ tkt.name }}</p>
                  <span
                    class="rounded-full border border-black px-2.5 py-0.5 text-[9px] font-bold"
                    :class="activeTicket?.id === tkt.id ? 'bg-[#72a5e4] text-black' : 'bg-white text-black'"
                  >
                    {{ tkt.status || 'On Sale' }}
                  </span>
                </div>
                <p class="text-[11px] text-slate-600 leading-snug">{{ tkt.description }}</p>
              </div>

              <div class="flex items-center justify-between text-xs pt-1">
                <span class="text-[10px] text-slate-500">
                  Sisa kuota: {{ Math.max(0, (tkt.quantity || 100) - (tkt.sold_quantity || 0)) }}
                </span>
                <span class="font-bold text-black">
                  {{ Number(tkt.price) > 0 ? formatCurrency(tkt.price) : 'Gratis' }}
                </span>
              </div>
            </div>
          </div>

          <!-- Jumlah Tiket Row -->
          <div class="pt-3 border-t border-black/15 flex items-center justify-between">
            <span class="text-xs font-bold text-black">Jumlah Tiket</span>
            <div class="flex items-center rounded-full border border-black bg-white px-3 py-1 gap-4 text-xs font-bold text-black">
              <button @click="decrementQty" type="button" class="hover:opacity-60">–</button>
              <span class="font-mono">{{ quantity }}</span>
              <button @click="incrementQty" type="button" class="hover:opacity-60">+</button>
            </div>
          </div>

          <!-- Pesan Tiket Sekarang Button -->
          <button
            @click="proceedCheckout"
            class="w-full rounded-full bg-black py-3 text-xs font-bold text-white hover:bg-slate-800 transition-colors"
          >
            Pesan Tiket Sekarang &rarr;
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

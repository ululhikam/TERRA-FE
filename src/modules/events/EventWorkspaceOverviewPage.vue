<script setup>
import { computed } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import { useEventWorkspaceStore } from '@/stores/eventWorkspace'
import { formatDateTime } from '@/utils/formatters'

const route = useRoute()
const store = useEventWorkspaceStore()

const event = computed(() => store.events.find((e) => e.id === route.params.eventId) || store.activeEvent)

const daysRemaining = computed(() => {
  return 26
})

const priorityTasks = [
  { id: 't1', phase: 'PRE-EVENT', status: 'In Progress', title: 'Persiapan Acara (2 Minggu)', pic: 'Hikam Pratama', due: '2026-11-15', pct: '80% selesai' },
  { id: 't2', phase: 'PRE-EVENT', status: 'In Progress', title: 'Booking Venue & Kontrak Hall B JCC', pic: 'Hikam Pratama', due: '2026-11-15', pct: '50% selesai' },
  { id: 't3', phase: 'MARKETING', status: 'In Progress', title: 'Marketing & Publikasi Tiket', pic: 'Rina Kusuma', due: '2026-12-01', pct: '35% selesai' },
  { id: 't4', phase: 'MARKETING', status: 'In Progress', title: 'Kampanye Sosial Media & Partner Blast', pic: 'Rina Kusuma', due: '2026-11-24', pct: '60% selesai' }
]

const readinessChecks = [
  'Profil & Lokasi Venue Event Lengkap',
  'Minimal 3 Modul Operasional Aktif',
  'Konfigurasi Jenis Tiket & Kuota Siap',
  'Milestone Timeline Panitia Ditetapkan',
  'Disetujui & Dipublikasikan di Marketplace'
]
</script>

<template>
  <div v-if="event" class="space-y-5 min-h-[calc(100vh-6rem)]">
    <!-- Top Blue Event Banner -->
    <div class="rounded-xl border border-black bg-[#72a5e4] p-6 text-black space-y-5">
      <!-- Top Row -->
      <div class="flex items-center justify-between gap-2">
        <span class="text-[9px] font-bold uppercase tracking-wider text-black">
          EVENT OVERVIEW
        </span>
        <div class="flex items-center gap-2">
          <span class="rounded-full border border-black bg-white px-3.5 py-0.5 text-[10px] font-bold text-black">
            Published
          </span>
          <span class="rounded-full border border-black bg-white px-3.5 py-0.5 text-[10px] font-bold text-black">
            Published
          </span>
        </div>
      </div>

      <!-- Middle Row -->
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div class="flex items-start sm:items-center gap-5">
          <div class="h-20 w-20 rounded-xl overflow-hidden border border-black bg-black shrink-0">
            <img :src="event.poster_url" :alt="event.title" class="h-full w-full object-cover" />
          </div>
          <div class="space-y-1">
            <h1 class="text-2xl sm:text-3xl font-bold tracking-tight text-black font-sans leading-tight max-w-md">
              {{ event.title }}
            </h1>
            <p class="text-xs text-slate-900 pt-0.5">
              {{ formatDateTime(event.start_at || event.start_date) }} • {{ event.location_name || event.venue_name }}
            </p>
            <p class="text-xs font-bold text-black">
              Kapasitas: {{ event.capacity || 600 }} Peserta
            </p>
          </div>
        </div>

        <div class="shrink-0">
          <span class="inline-block rounded-full bg-black px-8 py-3 text-xs font-bold text-white">
            H–{{ daysRemaining }} Hari
          </span>
        </div>
      </div>

      <!-- Bottom Row inside Banner -->
      <div class="pt-3 border-t border-black/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-bold text-black">
        <span>{{ event.category }} • {{ event.location_type === 'hybrid' ? 'Hybrid' : 'Offline' }} • Public</span>
        <span>Tiket Terjual: 351 / 600 • Task Panitia: 11 tugas</span>
      </div>
    </div>

    <!-- 3 Action Pills Outside Banner -->
    <div class="flex flex-wrap items-center gap-3">
      <RouterLink
        :to="`/dashboard/events/${event.id}/profile`"
        class="rounded-full border border-black bg-[#fafaf9] px-7 py-2.5 text-xs font-bold text-black hover:bg-white transition-colors"
      >
        Edit Profil Event
      </RouterLink>
      <RouterLink
        :to="`/events/${event.slug || event.id}`"
        class="rounded-full border border-black bg-[#fafaf9] px-7 py-2.5 text-xs font-bold text-black hover:bg-white transition-colors"
      >
        Marketplace ↗
      </RouterLink>
      <RouterLink
        :to="`/dashboard/events/${event.id}/modules`"
        class="rounded-full bg-black px-8 py-2.5 text-xs font-bold text-white hover:bg-slate-800 transition-colors"
      >
        Atur Modul
      </RouterLink>
    </div>

    <!-- 2-Column Grid: Event Readiness Checklist & Timeline Task Prioritas -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
      <!-- Left: Event Readiness Checklist -->
      <div class="rounded-xl border border-black bg-[#fafaf9] p-6 space-y-4">
        <div class="space-y-1">
          <h3 class="text-lg font-bold text-black font-sans">Event Readiness Checklist</h3>
          <p class="text-xs text-slate-500">Tolak ukur kesiapan operasional sebelum acara berlangsung</p>
        </div>

        <div class="space-y-2 pt-1">
          <div class="flex items-baseline gap-1.5">
            <span class="text-4xl font-black text-black font-sans leading-none">100%</span>
            <span class="text-xs text-slate-600 font-semibold">Siap</span>
          </div>
          <div class="h-1.5 w-full rounded-full bg-[#72a5e4]" />
        </div>

        <div class="space-y-2.5 pt-2">
          <div
            v-for="(label, idx) in readinessChecks"
            :key="idx"
            class="rounded-lg bg-[#72a5e4]/20 px-4 py-3 flex items-center gap-3 text-xs font-bold text-black"
          >
            <span>✓</span>
            <span>{{ label }}</span>
          </div>
        </div>
      </div>

      <!-- Right: Timeline Task Prioritas -->
      <div class="rounded-xl border border-black bg-[#fafaf9] p-6 space-y-4">
        <div class="space-y-1">
          <h3 class="text-lg font-bold text-black font-sans">Timeline Task Prioritas</h3>
          <p class="text-xs text-slate-500">Tugas panitia dengan batas waktu terdekat</p>
        </div>

        <div class="flex justify-end">
          <RouterLink
            :to="`/dashboard/events/${event.id}/timeline`"
            class="rounded-full border border-black bg-[#72a5e4] px-5 py-1.5 text-xs font-bold text-black hover:bg-[#5c93d9] transition-colors"
          >
            Buka Timeline &rarr;
          </RouterLink>
        </div>

        <div class="divide-y divide-black/15 border-t border-black/15">
          <div
            v-for="t in priorityTasks"
            :key="t.id"
            class="py-3 space-y-1 text-xs"
          >
            <span class="text-[9px] font-bold uppercase tracking-wider text-slate-500 block">
              {{ t.phase }} • {{ t.status }}
            </span>
            <div class="flex items-center justify-between font-bold text-black">
              <span>{{ t.title }}</span>
              <span class="text-[11px] font-mono">{{ t.due }}</span>
            </div>
            <div class="flex items-center justify-between text-[11px] text-slate-500">
              <span>PIC: {{ t.pic }}</span>
              <span>{{ t.pct }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

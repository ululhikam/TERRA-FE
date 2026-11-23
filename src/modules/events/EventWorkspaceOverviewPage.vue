<script setup>
import { computed } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import { useEventWorkspaceStore } from '@/stores/eventWorkspace'
import { formatDateTime } from '@/utils/formatters'

const route = useRoute()
const store = useEventWorkspaceStore()

const event = computed(() => store.events.find((e) => e.id === route.params.eventId) || store.activeEvent)

const eventTasks = computed(() =>
  store.tasks.filter((t) => !t.event_id || !event.value?.id || t.event_id === event.value.id)
)

const daysRemaining = computed(() => {
  const start = event.value?.start_at || event.value?.start_date
  if (!start) return 0
  const diff = Math.ceil((new Date(start).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  return Math.max(0, diff)
})

const ticketsSold = computed(() =>
  (event.value?.ticket_types || []).reduce((s, t) => s + (Number(t.sold_quantity) || 0), 0)
)
const ticketsTotal = computed(() =>
  (event.value?.ticket_types || []).reduce((s, t) => s + (Number(t.quantity) || 0), 0) || event.value?.capacity || 0
)

const priorityTasks = computed(() =>
  eventTasks.value
    .slice(0, 4)
    .map((t) => ({
      id: t.id,
      phase: (t.phase || 'GENERAL').toUpperCase(),
      status: t.status || 'To Do',
      title: t.title,
      pic: t.assigned_to || '-',
      due: t.due_date || t.due_at || '-',
      pct: `${t.progress ?? 0}% selesai`
    }))
)

const readinessChecks = computed(() => {
  const evt = event.value || {}
  return [
    { label: 'Profil & Lokasi Venue Event Lengkap', ok: Boolean(evt.title && (evt.location_name || evt.venue_name)) },
    { label: 'Minimal 3 Modul Operasional Aktif', ok: (evt.enabled_modules || []).length >= 3 },
    { label: 'Konfigurasi Jenis Tiket & Kuota Siap', ok: (evt.ticket_types || []).length > 0 },
    { label: 'Milestone Timeline Panitia Ditetapkan', ok: eventTasks.value.length > 0 },
    { label: 'Disetujui & Dipublikasikan di Marketplace', ok: evt.publication_status === 'Published' }
  ]
})

const readinessPct = computed(() => {
  const done = readinessChecks.value.filter((c) => c.ok).length
  return Math.round((done / readinessChecks.value.length) * 100)
})
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
            {{ event.status || 'Active' }}
          </span>
          <span class="rounded-full border border-black bg-white px-3.5 py-0.5 text-[10px] font-bold text-black">
            {{ event.publication_status || 'Unpublished' }}
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
        <span>{{ event.category || 'Umum' }} • {{ event.location_type || 'offline' }} • {{ event.visibility || 'public' }}</span>
        <span>Tiket Terjual: {{ ticketsSold }} / {{ ticketsTotal }} • Task Panitia: {{ eventTasks.length }} tugas</span>
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
            <span class="text-4xl font-black text-black font-sans leading-none">{{ readinessPct }}%</span>
            <span class="text-xs text-slate-600 font-semibold">Siap</span>
          </div>
          <div class="h-1.5 w-full rounded-full bg-slate-200 overflow-hidden">
            <div class="h-full bg-[#72a5e4] transition-all" :style="{ width: `${readinessPct}%` }" />
          </div>
        </div>

        <div class="space-y-2.5 pt-2">
          <div
            v-for="(chk, idx) in readinessChecks"
            :key="idx"
            class="rounded-lg px-4 py-3 flex items-center gap-3 text-xs font-bold text-black"
            :class="chk.ok ? 'bg-[#72a5e4]/20' : 'bg-slate-100 text-slate-500'"
          >
            <span>{{ chk.ok ? '✓' : '○' }}</span>
            <span>{{ chk.label }}</span>
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

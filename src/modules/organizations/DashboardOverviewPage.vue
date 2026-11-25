<script setup>
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { useEventWorkspaceStore } from '@/stores/eventWorkspace'
import { useAuthStore } from '@/stores/auth'
import { formatDate, formatCurrency } from '@/utils/formatters'
import { ArrowRight, CalendarDays, ExternalLink, Plus } from 'lucide-vue-next'

const store = useEventWorkspaceStore()
const authStore = useAuthStore()

const activeEvents = computed(() => store.events.slice(0, 3))
const totalSoldTickets = computed(() =>
  store.events.reduce(
    (sum, evt) => sum + (evt.ticket_types || []).reduce((s, t) => s + (Number(t.sold_quantity) || 0), 0),
    0
  )
)
const totalEstimatedRevenue = computed(() =>
  store.events.reduce((sum, evt) => sum + store.getPaidTicketRevenue(evt.id), 0)
)
</script>

<template>
  <div class="mx-auto max-w-6xl space-y-8 min-h-[calc(100vh-6rem)]">
    <!-- Welcome Masthead -->
    <section class="rounded-2xl border border-black bg-[#72a5e4] p-6 sm:p-8 text-black flex flex-col md:flex-row md:items-center justify-between gap-6">
      <div class="space-y-2 max-w-2xl">
        <p class="text-xs font-medium text-black/80">
          Ringkasan Penyelenggara
        </p>
        <h1 class="text-2xl sm:text-3xl font-bold tracking-tight text-black leading-tight">
          Selamat datang, {{ authStore.user?.full_name || authStore.user?.email || 'Organizer' }}
        </h1>
        <p class="text-sm text-black/85 leading-relaxed">
          Kelola seluruh rangkaian acara, pantau penjualan tiket berbayar maupun gratis secara langsung, dan atur tim panitia dalam satu workspace terpadu.
        </p>
      </div>

      <div class="flex flex-col sm:flex-row md:flex-col lg:flex-row items-stretch sm:items-center gap-2.5 shrink-0">
        <RouterLink
          to="/dashboard/events/create"
          class="inline-flex items-center justify-center gap-1.5 rounded-full bg-black px-5 py-2.5 text-xs font-semibold text-white hover:bg-slate-800 transition-colors"
        >
          <Plus class="h-3.5 w-3.5" />
          <span>Buat Event Baru</span>
        </RouterLink>
        <RouterLink
          to="/dashboard/organizations"
          class="inline-flex items-center justify-center rounded-full border border-black bg-white px-5 py-2.5 text-xs font-semibold text-black hover:bg-slate-100 transition-colors"
        >
          Kelola Organisasi
        </RouterLink>
      </div>
    </section>

    <!-- 4 Stats Cards Grid (100% Live Data from Backend) -->
    <section class="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <div class="rounded-2xl border border-black bg-white p-5 sm:p-6 flex flex-col justify-between gap-3">
        <span class="text-xs font-medium text-slate-600">Organisasi aktif</span>
        <span class="font-mono text-3xl font-bold tabular-nums tracking-tight text-black leading-none">{{ store.organizations.length }}</span>
        <p class="text-[11px] text-slate-500 pt-2 border-t border-black/10">Organisasi penyelenggara</p>
      </div>

      <div class="rounded-2xl border border-black bg-white p-5 sm:p-6 flex flex-col justify-between gap-3">
        <span class="text-xs font-medium text-slate-600">Event dikelola</span>
        <span class="font-mono text-3xl font-bold tabular-nums tracking-tight text-black leading-none">{{ store.events.length }}</span>
        <p class="text-[11px] text-slate-500 pt-2 border-t border-black/10">Draft &amp; terbit</p>
      </div>

      <div class="rounded-2xl border border-black bg-white p-5 sm:p-6 flex flex-col justify-between gap-3">
        <span class="text-xs font-medium text-slate-600">Tiket terdistribusi</span>
        <span class="font-mono text-3xl font-bold tabular-nums tracking-tight text-black leading-none">{{ totalSoldTickets }}</span>
        <p class="text-[11px] text-slate-500 pt-2 border-t border-black/10">Semua jenis tiket terjual</p>
      </div>

      <div class="rounded-2xl border border-black bg-white p-5 sm:p-6 flex flex-col justify-between gap-3">
        <span class="text-xs font-medium text-slate-600">Estimasi omset</span>
        <span class="font-mono text-xl sm:text-2xl font-bold tabular-nums tracking-tight text-black leading-none truncate">{{ formatCurrency(totalEstimatedRevenue) }}</span>
        <p class="text-[11px] text-slate-500 pt-2 border-t border-black/10">Pendapatan tiket berbayar</p>
      </div>
    </section>

    <!-- Active Events Table -->
    <section class="space-y-4">
      <div class="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 class="text-xl font-bold tracking-tight text-black">Daftar Event Aktif</h2>
          <p class="text-xs text-slate-600 mt-0.5">Kelola konfigurasi modul, kuota tiket, dan tim panitia per acara.</p>
        </div>
        <RouterLink to="/dashboard/events" class="inline-flex items-center gap-1 text-xs font-semibold text-black hover:underline">
          <span>Lihat semua</span>
          <ArrowRight class="h-3.5 w-3.5" />
        </RouterLink>
      </div>

      <div v-if="activeEvents.length > 0" class="rounded-2xl border border-black bg-white px-5 py-2 divide-y divide-black/10">
        <div
          v-for="evt in activeEvents"
          :key="evt.id"
          class="py-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
        >
          <div class="flex items-center gap-4 min-w-0">
            <div class="h-16 w-24 rounded-lg overflow-hidden border border-black shrink-0 bg-stone-100 flex items-center justify-center">
              <img v-if="evt.poster_url" :src="evt.poster_url" :alt="evt.title" class="h-full w-full object-cover" />
              <CalendarDays v-else class="h-5 w-5 text-slate-400" />
            </div>
            <div class="space-y-1 min-w-0">
              <div class="flex flex-wrap items-center gap-2">
                <span
                  class="rounded-full border border-black px-2.5 py-0.5 text-[10px] font-semibold text-black capitalize"
                  :class="(evt.publication_status || evt.status || 'Draft').toLowerCase() === 'published' ? 'bg-[#72a5e4]' : 'bg-stone-100'"
                >
                  {{ evt.publication_status || evt.status || 'Draft' }}
                </span>
                <span v-if="evt.category" class="text-[11px] text-slate-500 font-medium">{{ evt.category }}</span>
              </div>
              <h3 class="text-sm font-bold text-black leading-snug truncate">{{ evt.title }}</h3>
              <p class="text-xs text-slate-600">
                {{ formatDate(evt.start_date || evt.start_at) }} · {{ evt.venue_name || evt.location_name || 'Lokasi menyusul' }} · <span class="font-mono tabular-nums">{{ evt.enabled_modules?.length || 0 }}</span> modul aktif
              </p>
            </div>
          </div>

          <div class="flex flex-wrap items-center gap-2 self-end md:self-center shrink-0">
            <RouterLink
              :to="`/events/${evt.id}`"
              class="rounded-full border border-black bg-white px-3.5 py-1.5 text-xs font-semibold text-black hover:bg-slate-100 transition-colors inline-flex items-center gap-1"
            >
              <span>Preview</span>
              <ExternalLink class="h-3 w-3" />
            </RouterLink>
            <RouterLink
              :to="`/dashboard/events/${evt.id}/modules`"
              class="rounded-full border border-black bg-white px-3.5 py-1.5 text-xs font-semibold text-black hover:bg-slate-100 transition-colors"
            >
              Modul
            </RouterLink>
            <RouterLink
              :to="`/dashboard/events/${evt.id}`"
              class="rounded-full border border-black bg-[#72a5e4] px-4 py-1.5 text-xs font-semibold text-black hover:bg-[#5c93d9] transition-colors inline-flex items-center gap-1"
            >
              <span>Workspace</span>
              <ArrowRight class="h-3.5 w-3.5" />
            </RouterLink>
          </div>
        </div>
      </div>

      <div v-else class="rounded-2xl border border-black bg-white p-8 text-center space-y-3">
        <p class="text-sm font-semibold text-black">Belum ada acara yang dikelola</p>
        <p class="text-xs text-slate-600 max-w-md mx-auto">Mulai buat acara pertama Anda untuk mengatur tiket, jadwal, tim panitia, serta pemindai QR check-in.</p>
        <div class="pt-1">
          <RouterLink
            to="/dashboard/events/create"
            class="inline-flex items-center gap-1.5 rounded-full bg-black px-5 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition-colors"
          >
            <Plus class="h-3.5 w-3.5" />
            <span>Buat Event Baru</span>
          </RouterLink>
        </div>
      </div>
    </section>
  </div>
</template>

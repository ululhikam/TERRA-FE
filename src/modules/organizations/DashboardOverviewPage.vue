<script setup>
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { useEventWorkspaceStore } from '@/stores/eventWorkspace'
import { useAuthStore } from '@/stores/auth'
import { formatDate } from '@/utils/formatters'
import { ExternalLink } from 'lucide-vue-next'

const store = useEventWorkspaceStore()
const authStore = useAuthStore()

const activeEvents = computed(() => store.events.slice(0, 3))
</script>

<template>
  <div class="space-y-8 min-h-[calc(100vh-6rem)]">
    <!-- Blue Welcome Banner -->
    <div class="rounded-2xl border border-black bg-[#72a5e4] p-8 text-black flex flex-col md:flex-row md:items-center justify-between gap-6">
      <div class="space-y-2 max-w-2xl">
        <span class="text-[10px] font-bold uppercase tracking-wider text-black block">
          ORGANIZER STUDIO OVERVIEW
        </span>
        <h1 class="text-2xl sm:text-3xl font-bold tracking-tight text-black font-editorial">
          Selamat datang,<br />{{ authStore.user?.full_name || 'Hikam Pratama (Organizer)' }}!
        </h1>
        <p class="text-xs sm:text-sm text-slate-900 leading-relaxed">
          Kelola seluruh rangkaian acara, pantau penjualan tiket berbayar &amp; gratis secara real-time, dan atur tim kerja melalui sistem modular terpadu.
        </p>
      </div>

      <div class="flex flex-col sm:flex-row md:flex-col lg:flex-row items-stretch sm:items-center gap-3 shrink-0">
        <RouterLink
          to="/dashboard/events/create"
          class="rounded-full bg-black px-6 py-2.5 text-xs font-semibold text-white hover:bg-slate-800 transition-colors text-center"
        >
          + Buat Event Baru
        </RouterLink>
        <RouterLink
          to="/dashboard/organizations"
          class="rounded-full border border-black bg-white px-6 py-2.5 text-xs font-semibold text-black hover:bg-slate-100 transition-colors text-center"
        >
          Kelola Organisasi
        </RouterLink>
      </div>
    </div>

    <!-- 4 Stats Cards Grid -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div class="rounded-2xl border border-black bg-white p-6 space-y-2">
        <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">TOTAL ORGANISASI AKTIF</span>
        <span class="text-3xl font-black text-black leading-none block">2</span>
        <p class="text-[11px] text-slate-500 pt-2 border-t border-black/10">Organisasi penyelenggara</p>
      </div>

      <div class="rounded-2xl border border-black bg-white p-6 space-y-2">
        <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">TOTAL EVENT DIKELOLA</span>
        <span class="text-3xl font-black text-black leading-none block">{{ store.events.length }}</span>
        <p class="text-[11px] text-slate-500 pt-2 border-t border-black/10">Draft &amp; Published</p>
      </div>

      <div class="rounded-2xl border border-black bg-white p-6 space-y-2">
        <div class="flex items-center justify-between">
          <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400">TOTAL TIKET TERDISTRIBUSI</span>
          <span class="text-[10px] font-bold text-black">+18.4%</span>
        </div>
        <span class="text-3xl font-black text-black leading-none block">1366</span>
        <p class="text-[11px] text-slate-500 pt-2 border-t border-black/10">Semua jenis tiket</p>
      </div>

      <div class="rounded-2xl border border-black bg-white p-6 space-y-2">
        <div class="flex items-center justify-between">
          <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400">ESTIMASI OMSET TIKET</span>
          <span class="text-[10px] font-bold text-black">+24.2%</span>
        </div>
        <span class="text-xl sm:text-2xl font-black text-black leading-none block truncate">Rp 178.820.000</span>
        <p class="text-[11px] text-slate-500 pt-2 border-t border-black/10">Revenue tiket berbayar</p>
      </div>
    </div>

    <!-- Active Events Table -->
    <div class="space-y-4">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-xl font-bold tracking-tight text-black font-editorial">Daftar Event Aktif</h2>
          <p class="text-xs text-slate-600">Kelola konfigurasi modul, kuota tiket, dan tim panitia per event.</p>
        </div>
        <RouterLink to="/dashboard/events" class="text-xs font-semibold text-black hover:underline">
          Lihat Semua &rarr;
        </RouterLink>
      </div>

      <div class="rounded-2xl border border-black bg-white p-4 divide-y divide-black/10">
        <div
          v-for="evt in activeEvents"
          :key="evt.id"
          class="py-4 first:pt-2 last:pb-2 flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
        >
          <div class="flex items-center gap-4">
            <div class="h-16 w-24 rounded-lg overflow-hidden border border-black shrink-0 bg-slate-100">
              <img :src="evt.poster_url" :alt="evt.title" class="h-full w-full object-cover" />
            </div>
            <div class="space-y-1">
              <div class="flex flex-wrap items-center gap-2">
                <span class="rounded-full border border-black bg-[#72a5e4] px-2.5 py-0.2 text-[10px] font-bold text-black">
                  Published
                </span>
                <span class="text-[11px] text-slate-500 font-medium">{{ evt.category }}</span>
              </div>
              <h3 class="text-sm font-bold text-black leading-snug">{{ evt.title }}</h3>
              <p class="text-xs text-slate-600">
                {{ formatDate(evt.start_date || evt.start_at) }} • {{ evt.venue_name || evt.location_name }} • {{ evt.enabled_modules.length }} modul aktif
              </p>
            </div>
          </div>

          <div class="flex items-center gap-2 self-end md:self-center shrink-0">
            <RouterLink
              :to="`/events/${evt.id}`"
              class="rounded-full border border-black bg-white px-4 py-1.5 text-xs font-semibold text-black hover:bg-slate-100 transition-colors flex items-center gap-1"
            >
              <span>Preview</span>
              <ExternalLink class="h-3 w-3" />
            </RouterLink>
            <RouterLink
              :to="`/dashboard/events/${evt.id}/modules`"
              class="rounded-full border border-black bg-white px-4 py-1.5 text-xs font-semibold text-black hover:bg-slate-100 transition-colors"
            >
              Modul
            </RouterLink>
            <RouterLink
              :to="`/dashboard/events/${evt.id}`"
              class="rounded-full border border-black bg-[#72a5e4] px-4 py-1.5 text-xs font-bold text-black hover:bg-[#5c93d9] transition-colors"
            >
              Workspace &rarr;
            </RouterLink>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { RouterLink } from 'vue-router'
import { useEventWorkspaceStore } from '@/stores/eventWorkspace'
import { useToastStore } from '@/stores/toast'
import { formatDate } from '@/utils/formatters'

const store = useEventWorkspaceStore()
const toast = useToastStore()

async function duplicate(evt) {
  const copy = await store.duplicateEvent(evt.id)
  if (copy) {
    toast.success(`Event "${copy.title}" berhasil diduplikasi.`)
  }
}
</script>

<template>
  <div class="space-y-6 min-h-[calc(100vh-6rem)]">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div class="space-y-1">
        <span class="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">PORTFOLIO</span>
        <div class="flex items-center gap-3">
          <h1 class="text-3xl sm:text-4xl font-bold tracking-tight text-black font-editorial">
            My Events
          </h1>
          <span class="rounded-full border border-black bg-white px-3 py-0.5 text-xs font-semibold text-black">
            {{ store.events.length }} Total Event
          </span>
        </div>
        <p class="text-xs text-slate-600">
          Kelola seluruh event organisasi, status review marketplace, dan konfigurasi modular.
        </p>
      </div>

      <RouterLink
        to="/dashboard/events/create"
        class="rounded-full border border-black bg-[#72a5e4] px-6 py-2.5 text-xs font-bold text-black hover:bg-[#5c93d9] transition-colors shrink-0"
      >
        + Create New Event
      </RouterLink>
    </div>

    <!-- Event Cards Stack -->
    <div class="space-y-4">
      <div
        v-for="evt in store.events"
        :key="evt.id"
        class="rounded-2xl border border-black bg-white p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 hover:shadow-xs transition-shadow"
      >
        <div class="flex items-center gap-5">
          <div class="relative h-20 w-32 rounded-xl overflow-hidden border border-black shrink-0 bg-black">
            <img :src="evt.poster_url" :alt="evt.title" class="h-full w-full object-cover" />
            <span class="absolute bottom-1.5 left-1.5 text-[8px] font-bold uppercase tracking-widest bg-black text-white px-1.5 py-0.2 rounded-xs">
              {{ evt.location_type || 'OFFLINE' }}
            </span>
          </div>

          <div class="space-y-1.5">
            <div class="flex flex-wrap items-center gap-2">
              <span
                class="rounded-full border border-black px-2.5 py-0.2 text-[10px] font-bold"
                :class="evt.publication_status === 'Published' ? 'bg-[#72a5e4] text-black' : 'bg-white text-slate-700'"
              >
                {{ evt.publication_status }}
              </span>
              <span class="text-[11px] text-slate-500 font-medium">{{ evt.category }}</span>
            </div>

            <h3 class="text-base font-bold text-black leading-snug">{{ evt.title }}</h3>

            <p class="text-xs text-slate-600">
              {{ formatDate(evt.start_date || evt.start_at) }} • {{ evt.venue_name || evt.location_name }} • {{ evt.enabled_modules.length }} Modul
            </p>
          </div>
        </div>

        <div class="flex items-center gap-2 self-end md:self-center shrink-0">
          <button
            @click="duplicate(evt)"
            class="rounded-full border border-black bg-white px-4 py-1.5 text-xs font-semibold text-black hover:bg-slate-100 transition-colors"
          >
            Duplikat
          </button>
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
            Buka Workspace &rarr;
          </RouterLink>
        </div>
      </div>
    </div>

    <div class="pt-2 text-xs text-slate-500">
      Menampilkan {{ store.events.length }} dari {{ store.events.length }} event
    </div>
  </div>
</template>

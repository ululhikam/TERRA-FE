<script setup>
import { RouterLink } from 'vue-router'
import { useEventWorkspaceStore } from '@/stores/eventWorkspace'
import { useToastStore } from '@/stores/toast'
import { formatDate } from '@/utils/formatters'
import { Trash2, Pencil, Globe, EyeOff, Send } from 'lucide-vue-next'

const store = useEventWorkspaceStore()
const toast = useToastStore()

async function duplicate(evt) {
  try {
    const copy = await store.duplicateEvent(evt.id)
    if (copy) {
      toast.success(`Event "${copy.title}" berhasil diduplikasi.`)
    }
  } catch (err) {
    toast.error(err?.message || 'Gagal menduplikasi event.')
  }
}

async function submitReview(evt) {
  try {
    await store.submitEventReview(evt.id)
    toast.success(`Event "${evt.title}" diajukan untuk review Admin.`)
  } catch (err) {
    toast.error(err?.message || 'Gagal mengajukan review.')
  }
}

async function publish(evt) {
  try {
    await store.publishEvent(evt.id)
    toast.success(`Event "${evt.title}" dipublikasikan ke marketplace.`)
  } catch (err) {
    toast.error(err?.message || 'Gagal mempublikasikan event.')
  }
}

async function unpublish(evt) {
  try {
    await store.unpublishEvent(evt.id)
    toast.success(`Publikasi event "${evt.title}" ditarik.`)
  } catch (err) {
    toast.error(err?.message || 'Gagal menarik publikasi event.')
  }
}

async function removeEvent(evt) {
  if (!window.confirm(`Hapus event "${evt.title}"? Data terkait tidak dapat dipulihkan dari daftar aktif.`)) return
  try {
    await store.deleteEvent(evt.id)
    toast.success(`Event "${evt.title}" dihapus.`)
  } catch (err) {
    toast.error(err?.message || 'Gagal menghapus event.')
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
        class="rounded-2xl border border-black bg-white p-6 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5 hover:shadow-xs transition-shadow"
      >
        <div class="flex items-center gap-5 min-w-0">
          <div class="relative h-20 w-32 rounded-xl overflow-hidden border border-black shrink-0 bg-black">
            <img :src="evt.poster_url" :alt="evt.title" class="h-full w-full object-cover" />
            <span class="absolute bottom-1.5 left-1.5 text-[8px] font-bold uppercase tracking-widest bg-black text-white px-1.5 py-0.2 rounded-xs">
              {{ evt.location_type || 'OFFLINE' }}
            </span>
          </div>

          <div class="space-y-1.5 min-w-0">
            <div class="flex flex-wrap items-center gap-2">
              <span
                class="rounded-full border border-black px-2.5 py-0.2 text-[10px] font-bold"
                :class="evt.publication_status === 'Published' ? 'bg-[#72a5e4] text-black' : 'bg-white text-slate-700'"
              >
                {{ evt.publication_status || 'Unpublished' }}
              </span>
              <span class="text-[11px] text-slate-500 font-medium">{{ evt.category }}</span>
            </div>

            <h3 class="text-base font-bold text-black leading-snug truncate">{{ evt.title }}</h3>

            <p class="text-xs text-slate-600">
              {{ formatDate(evt.start_date || evt.start_at) }} • {{ evt.venue_name || evt.location_name || 'Venue menyusul' }} • {{ (evt.enabled_modules || []).length }} Modul
            </p>
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-2 self-end lg:self-center shrink-0">
          <RouterLink
            :to="`/dashboard/events/${evt.id}/profile`"
            class="inline-flex items-center gap-1 rounded-full border border-black bg-white px-3.5 py-1.5 text-xs font-semibold text-black hover:bg-slate-100 transition-colors"
          >
            <Pencil class="h-3 w-3" /> Edit
          </RouterLink>
          <button
            v-if="!evt.publication_status || evt.publication_status === 'Unpublished' || evt.publication_status === 'Rejected'"
            @click="submitReview(evt)"
            class="inline-flex items-center gap-1 rounded-full border border-black bg-[#fafaf9] px-3.5 py-1.5 text-xs font-semibold text-black hover:bg-slate-100 transition-colors"
          >
            <Send class="h-3 w-3" /> Ajukan Review
          </button>
          <button
            v-else-if="evt.publication_status === 'Approved'"
            @click="publish(evt)"
            class="inline-flex items-center gap-1 rounded-full border border-black bg-emerald-200 px-3.5 py-1.5 text-xs font-bold text-black hover:bg-emerald-300 transition-colors"
          >
            <Globe class="h-3 w-3" /> Publish
          </button>
          <button
            v-else-if="evt.publication_status === 'Published'"
            @click="unpublish(evt)"
            class="inline-flex items-center gap-1 rounded-full border border-black bg-amber-100 px-3.5 py-1.5 text-xs font-semibold text-black hover:bg-amber-200 transition-colors"
          >
            <EyeOff class="h-3 w-3" /> Unpublish
          </button>
          <button
            @click="duplicate(evt)"
            class="rounded-full border border-black bg-white px-3.5 py-1.5 text-xs font-semibold text-black hover:bg-slate-100 transition-colors"
          >
            Duplikat
          </button>
          <RouterLink
            :to="`/dashboard/events/${evt.id}/modules`"
            class="rounded-full border border-black bg-white px-3.5 py-1.5 text-xs font-semibold text-black hover:bg-slate-100 transition-colors"
          >
            Modul
          </RouterLink>
          <RouterLink
            :to="`/dashboard/events/${evt.id}`"
            class="rounded-full border border-black bg-[#72a5e4] px-4 py-1.5 text-xs font-bold text-black hover:bg-[#5c93d9] transition-colors"
          >
            Workspace &rarr;
          </RouterLink>
          <button
            @click="removeEvent(evt)"
            title="Hapus Event"
            class="rounded-full border border-black bg-white p-1.5 text-red-600 hover:bg-red-50 transition-colors"
          >
            <Trash2 class="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>

    <div class="pt-2 text-xs text-slate-500">
      Menampilkan {{ store.events.length }} dari {{ store.events.length }} event
    </div>
  </div>
</template>

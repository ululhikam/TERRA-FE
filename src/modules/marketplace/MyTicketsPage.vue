<script setup>
import { onMounted } from 'vue'
import { useEventWorkspaceStore } from '@/stores/eventWorkspace'
import { formatDateTime } from '@/utils/formatters'
import QrCodeCanvas from '@/components/common/QrCodeCanvas.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import { RouterLink } from 'vue-router'

const store = useEventWorkspaceStore()

onMounted(() => {
  store.fetchMyTickets()
})
</script>

<template>
  <div class="mx-auto max-w-5xl px-4 sm:px-6 py-10 space-y-8">
    <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
      <div class="space-y-1">
        <h1 class="text-3xl sm:text-4xl font-bold tracking-tight text-black font-editorial">
          Tiket Digital Saya
        </h1>
        <p class="text-xs sm:text-sm text-slate-600">
          Tunjukkan QR Code di bawah ini kepada panitia saat check-in di lokasi event.
        </p>
      </div>
      <RouterLink
        to="/profile"
        class="inline-flex items-center justify-center rounded-full border border-black bg-white px-5 py-2 text-xs font-bold text-black hover:bg-slate-100 shrink-0"
      >
        Lihat Profil &amp; Riwayat Pesanan &rarr;
      </RouterLink>
    </div>

    <div v-if="store.myTickets.length > 0" class="space-y-6">
      <div
        v-for="tkt in store.myTickets"
        :key="tkt.id"
        class="relative rounded-2xl border border-black bg-white overflow-hidden p-6 sm:p-8 flex flex-col md:flex-row items-stretch justify-between gap-6"
      >
        <!-- Left Notch (Visual ticket accent) -->
        <div class="hidden md:block absolute -top-3 right-56 w-6 h-6 rounded-full border border-black bg-[#fafaf9]" />
        <div class="hidden md:block absolute -bottom-3 right-56 w-6 h-6 rounded-full border border-black bg-[#fafaf9]" />

        <!-- Ticket Left Content -->
        <div class="space-y-3 flex-1">
          <div class="flex items-center gap-3">
            <span
              v-if="['active', 'valid'].includes(String(tkt.status || '').toLowerCase())"
              class="rounded-full border border-black bg-[#72a5e4] px-3 py-0.5 text-xs font-bold text-black"
            >
              Active
            </span>
            <span
              v-else-if="String(tkt.status || '').toLowerCase() === 'cancelled'"
              class="rounded-full border border-black bg-rose-100 px-3 py-0.5 text-xs font-bold text-rose-800"
            >
              Cancelled
            </span>
            <span
              v-else
              class="rounded-full border border-black bg-black px-3 py-0.5 text-xs font-bold text-white"
            >
              Used
            </span>
            <span class="font-mono text-xs font-semibold text-slate-700">{{ tkt.ticket_code }}</span>
          </div>

          <h2 class="text-xl font-bold tracking-tight text-black">
            {{ tkt.event_title }}
          </h2>

          <p class="text-sm font-semibold text-slate-800">
            {{ tkt.ticket_type }} • {{ tkt.participant_name }}
          </p>

          <div class="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600">
            <div>{{ formatDateTime(tkt.event_date) }}</div>
            <div>{{ tkt.location }}</div>
          </div>

          <p class="pt-2 text-[11px] text-slate-400">Order Ref: {{ tkt.order_number }}</p>
        </div>

        <!-- Dashed Divider (Desktop) -->
        <div class="hidden md:block border-r-2 border-dashed border-slate-300 mx-4" />

        <!-- Ticket Right Content (QR & Code) -->
        <div class="flex flex-col items-center justify-center gap-2 shrink-0 md:w-44 pt-4 md:pt-0 border-t md:border-t-0 border-dashed border-slate-300">
          <div class="p-2 border border-black/10 rounded-xl bg-white shadow-xs">
            <QrCodeCanvas :value="tkt.qr_payload" :size="120" />
          </div>
          <span class="text-[11px] font-mono font-medium text-slate-700 tracking-wider">
            {{ tkt.ticket_code }}
          </span>
        </div>
      </div>
    </div>

    <EmptyState
      v-else
      title="Belum ada tiket"
      description="Jelajahi event menarik di marketplace dan pesan tiket pertamamu."
    >
      <template #action>
        <RouterLink
          to="/events"
          class="rounded-full border border-black bg-[#72a5e4] px-6 py-2 text-xs font-bold text-black hover:bg-[#5c93d9]"
        >
          Jelajahi Event
        </RouterLink>
      </template>
    </EmptyState>
  </div>
</template>

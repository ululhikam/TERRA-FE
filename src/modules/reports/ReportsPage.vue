<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useEventWorkspaceStore } from '@/stores/eventWorkspace'
import { useToastStore } from '@/stores/toast'
import { formatCurrency } from '@/utils/formatters'
import { Download } from 'lucide-vue-next'

const route = useRoute()
const store = useEventWorkspaceStore()
const toast = useToastStore()

const event = computed(() => store.events.find((e) => e.id === route.params.eventId) || store.activeEvent)

const ticketBreakdown = computed(() =>
  (event.value?.ticket_types || []).map((t) => {
    const pct = t.quantity ? Math.round((t.sold_quantity / t.quantity) * 100) : 0
    return {
      ...t,
      fillPct: pct,
      revenue: Number(t.price) * Number(t.sold_quantity)
    }
  })
)

const totalSold = computed(() => ticketBreakdown.value.reduce((s, t) => s + t.sold_quantity, 0))
const totalQuota = computed(() => ticketBreakdown.value.reduce((s, t) => s + t.quantity, 0))
const sellThroughRate = computed(() =>
  totalQuota.value ? Math.round((totalSold.value / totalQuota.value) * 100) : 0
)

const ticketRevenue = computed(() => store.getPaidTicketRevenue(event.value?.id))

function exportCSV() {
  toast.success('Laporan performa event CSV berhasil diekspor.')
}
</script>

<template>
  <div v-if="event" class="space-y-6 min-h-[calc(100vh-6rem)]">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div class="space-y-1">
        <div class="flex items-center gap-2">
          <span class="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            INTELLIGENCE ENGINE
          </span>
          <span class="rounded-full border border-black bg-[#72a5e4] px-3 py-0.5 text-xs font-bold text-black">
            Konversi: {{ sellThroughRate }}% Terjual
          </span>
        </div>
        <h1 class="text-3xl font-bold tracking-tight text-black font-editorial">
          Reports &amp; Deep Analytics
        </h1>
        <p class="text-xs text-slate-600">
          Evaluasi mendalam mengenai penetrasi kuota tiket, funnel konversi kehadiran, serta kecepatan penyelesaian milestone panitia.
        </p>
      </div>

      <button
        @click="exportCSV"
        class="rounded-full border border-black bg-white px-5 py-2 text-xs font-semibold text-black hover:bg-slate-100 transition-colors flex items-center gap-2 shrink-0"
      >
        <Download class="h-3.5 w-3.5" />
        <span>Export Laporan CSV</span>
      </button>
    </div>

    <!-- 4 Stat Metric Cards -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <!-- Card 1: Blue highlight -->
      <div class="rounded-2xl border border-black bg-[#72a5e4] p-6 space-y-3 flex flex-col justify-between">
        <div>
          <span class="text-[10px] font-bold uppercase tracking-wider text-black block">SELL-THROUGH RATE</span>
          <span class="text-3xl font-black text-black leading-none mt-2 block">{{ sellThroughRate }}%</span>
        </div>
        <div class="pt-3 border-t border-black/20 text-xs">
          <p class="font-medium text-black">{{ totalSold }} dari total {{ totalQuota }} kuota tiket</p>
          <span class="text-[10px] text-slate-800">Penetrasi</span>
        </div>
      </div>

      <!-- Card 2 -->
      <div class="rounded-2xl border border-black bg-white p-6 space-y-3 flex flex-col justify-between">
        <div>
          <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">GROSS TICKET REVENUE</span>
          <span class="text-2xl font-black text-black leading-none mt-2 block">{{ formatCurrency(ticketRevenue) }}</span>
        </div>
        <div class="pt-3 border-t border-black/10 text-xs">
          <p class="font-medium text-slate-700">Otomatis dari tiket berbayar</p>
          <span class="text-[10px] text-slate-400">Auto-Sync</span>
        </div>
      </div>

      <!-- Card 3 -->
      <div class="rounded-2xl border border-black bg-white p-6 space-y-3 flex flex-col justify-between">
        <div>
          <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">NET EVENT PROFIT MARGIN</span>
          <span class="text-2xl font-black text-black leading-none mt-2 block">Rp 23.800.000</span>
        </div>
        <div class="pt-3 border-t border-black/10 text-xs">
          <p class="font-medium text-slate-700">Beban: Rp 48.200.000</p>
          <span class="text-[10px] text-slate-400">+Surplus</span>
        </div>
      </div>

      <!-- Card 4 -->
      <div class="rounded-2xl border border-black bg-white p-6 space-y-3 flex flex-col justify-between">
        <div>
          <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">ATTENDANCE TURNOUT</span>
          <span class="text-2xl font-black text-black leading-none mt-2 block">50%</span>
        </div>
        <div class="pt-3 border-t border-black/10 text-xs">
          <p class="font-medium text-slate-700">2 / 4 peserta hadir di gate</p>
          <span class="text-[10px] text-slate-400">Konversi</span>
        </div>
      </div>
    </div>

    <!-- Performa Penjualan & Kontribusi per Tiket -->
    <div class="rounded-2xl border border-black bg-white p-6 space-y-5">
      <div class="flex items-center justify-between pb-2 border-b border-black/10">
        <div>
          <h3 class="text-base font-bold text-black">Performa Penjualan &amp; Kontribusi per Tiket</h3>
          <p class="text-xs text-slate-500">Pantau jenis tiket paling diminati dan kontribusi pendapatannya</p>
        </div>
        <span class="rounded-full border border-black bg-[#72a5e4] px-3 py-0.5 text-xs font-bold text-black">
          {{ ticketBreakdown.length }} Tipe Tiket
        </span>
      </div>

      <div class="space-y-4">
        <div
          v-for="t in ticketBreakdown"
          :key="t.id"
          class="space-y-1.5"
        >
          <div class="flex items-center justify-between text-xs">
            <span class="font-bold text-black">{{ t.name }}</span>
            <span class="text-slate-500">{{ Number(t.price) > 0 ? formatCurrency(t.price) : 'Gratis' }}</span>
            <span class="font-bold text-black">{{ Number(t.revenue) > 0 ? formatCurrency(t.revenue) : 'Gratis' }}</span>
            <span class="text-slate-500 font-mono">{{ t.sold_quantity }} / {{ t.quantity }} ({{ t.fillPct }}%)</span>
          </div>
          <div class="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
            <div
              class="h-full bg-[#72a5e4]"
              :style="{ width: `${t.fillPct}%` }"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Bottom 2-Column Split: Conversion Funnel & Task Velocity -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <!-- Left: Attendance Conversion Funnel -->
      <div class="rounded-2xl border border-black bg-white p-6 space-y-4">
        <div>
          <h3 class="text-base font-bold text-black">Attendance Conversion Funnel</h3>
          <span class="text-[10px] uppercase font-bold text-slate-400 block mt-1">TAHAPAN PESERTA</span>
        </div>

        <div class="space-y-3 text-xs">
          <div class="space-y-1">
            <div class="flex justify-between font-semibold text-black">
              <span>1. Total Kuota Tiket Tersedia</span>
              <span>600 Kuota</span>
            </div>
            <div class="h-6 rounded-lg bg-[#72a5e4] flex items-center px-3 text-[10px] font-bold text-black">
              100% Kuota Basis
            </div>
          </div>

          <div class="space-y-1">
            <div class="flex justify-between font-semibold text-black">
              <span>2. Tiket Terjual / Terdaftar</span>
              <span>351 Peserta (59%)</span>
            </div>
            <div class="h-6 rounded-lg bg-[#72a5e4]/70 flex items-center px-3 text-[10px] font-bold text-black" style="width: 59%">
              59% Terjual
            </div>
          </div>
        </div>
      </div>

      <!-- Right: Task Velocity per Fase Pengerjaan -->
      <div class="rounded-2xl border border-black bg-white p-6 space-y-4">
        <div>
          <h3 class="text-base font-bold text-black">Task Velocity per Fase Pengerjaan</h3>
          <span class="text-[10px] uppercase font-bold text-slate-400 block mt-1">MILESTONE PANITIA</span>
        </div>

        <div class="space-y-4 text-xs">
          <div class="space-y-1">
            <div class="flex justify-between font-semibold text-black">
              <span>Pre-Event (4 task)</span>
              <span>83% Selesai</span>
            </div>
            <div class="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
              <div class="h-full bg-[#72a5e4]" style="width: 83%" />
            </div>
          </div>

          <div class="space-y-1">
            <div class="flex justify-between font-semibold text-black">
              <span>Marketing (3 task)</span>
              <span>45% Selesai</span>
            </div>
            <div class="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
              <div class="h-full bg-[#72a5e4]" style="width: 45%" />
            </div>
          </div>

          <div class="space-y-1">
            <div class="flex justify-between font-semibold text-black">
              <span>Production (3 task)</span>
              <span>43% Selesai</span>
            </div>
            <div class="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
              <div class="h-full bg-[#72a5e4]" style="width: 43%" />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

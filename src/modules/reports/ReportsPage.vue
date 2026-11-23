<script setup>
import { computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useEventWorkspaceStore } from '@/stores/eventWorkspace'
import { useToastStore } from '@/stores/toast'
import { formatCurrency } from '@/utils/formatters'
import { Download } from 'lucide-vue-next'

const route = useRoute()
const store = useEventWorkspaceStore()
const toast = useToastStore()

const event = computed(() => store.events.find((e) => e.id === route.params.eventId) || store.activeEvent)
const remoteReport = computed(() =>
  store.eventReport?.event_id === event.value?.id ? store.eventReport : null
)

onMounted(() => {
  if (route.params.eventId) {
    store.fetchEventReports(route.params.eventId).catch(() => {})
  }
})

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
const totalIncome = computed(() => {
  const extra = store.finance.incomes
    .filter((i) => !i.event_id || i.event_id === event.value?.id)
    .reduce((s, i) => s + Number(i.amount || 0), 0)
  return ticketRevenue.value + extra
})
const totalExpense = computed(() =>
  store.finance.expenses
    .filter((e) => !e.event_id || e.event_id === event.value?.id)
    .reduce((s, e) => s + Number(e.amount || 0), 0)
)
const netProfit = computed(() => totalIncome.value - totalExpense.value)

const eventParticipants = computed(() =>
  store.participants.filter((p) => !p.event_id || p.event_id === event.value?.id)
)
const checkedInCount = computed(() => eventParticipants.value.filter((p) => p.checked_in).length)
const turnoutPct = computed(() =>
  eventParticipants.value.length
    ? Math.round((checkedInCount.value / eventParticipants.value.length) * 100)
    : 0
)

const taskVelocityByPhase = computed(() => {
  const eventTasks = store.tasks.filter((t) => !t.event_id || t.event_id === event.value?.id)
  const phases = ['Pre-Event', 'Marketing', 'Production', 'Event Day', 'Post-Event']
  return phases
    .map((phase) => {
      const group = eventTasks.filter((t) => t.phase === phase)
      if (!group.length) return null
      const avg = Math.round(group.reduce((s, t) => s + (Number(t.progress) || 0), 0) / group.length)
      return { phase, count: group.length, avgPct: avg }
    })
    .filter(Boolean)
})

function exportCSV() {
  const rows = [
    ['Tiket', 'Harga', 'Terjual', 'Kuota', 'Pendapatan'],
    ...ticketBreakdown.value.map((t) => [t.name, t.price, t.sold_quantity, t.quantity, t.revenue])
  ]
  const csv = rows.map((r) => r.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `reports-${event.value?.id || 'event'}.csv`
  link.click()
  URL.revokeObjectURL(url)
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
          <span class="text-2xl font-black text-black leading-none mt-2 block">{{ formatCurrency(netProfit) }}</span>
        </div>
        <div class="pt-3 border-t border-black/10 text-xs">
          <p class="font-medium text-slate-700">Beban: {{ formatCurrency(totalExpense) }}</p>
          <span class="text-[10px] text-slate-400">{{ netProfit >= 0 ? '+Surplus' : 'Defisit' }}</span>
        </div>
      </div>

      <!-- Card 4 -->
      <div class="rounded-2xl border border-black bg-white p-6 space-y-3 flex flex-col justify-between">
        <div>
          <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">ATTENDANCE TURNOUT</span>
          <span class="text-2xl font-black text-black leading-none mt-2 block">{{ turnoutPct }}%</span>
        </div>
        <div class="pt-3 border-t border-black/10 text-xs">
          <p class="font-medium text-slate-700">{{ checkedInCount }} / {{ eventParticipants.length }} peserta hadir di gate</p>
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
              <span>{{ totalQuota }} Kuota</span>
            </div>
            <div class="h-6 rounded-lg bg-[#72a5e4] flex items-center px-3 text-[10px] font-bold text-black">
              100% Kuota Basis
            </div>
          </div>

          <div class="space-y-1">
            <div class="flex justify-between font-semibold text-black">
              <span>2. Tiket Terjual / Terdaftar</span>
              <span>{{ totalSold }} Peserta ({{ sellThroughRate }}%)</span>
            </div>
            <div
              class="h-6 rounded-lg bg-[#72a5e4]/70 flex items-center px-3 text-[10px] font-bold text-black transition-all"
              :style="{ width: `${Math.max(10, sellThroughRate)}%` }"
            >
              {{ sellThroughRate }}% Terjual
            </div>
          </div>

          <div class="space-y-1">
            <div class="flex justify-between font-semibold text-black">
              <span>3. Peserta Hadir (Checked-in)</span>
              <span>{{ checkedInCount }} Hadir ({{ turnoutPct }}%)</span>
            </div>
            <div
              class="h-6 rounded-lg border border-black bg-emerald-300 flex items-center px-3 text-[10px] font-bold text-black transition-all"
              :style="{ width: `${Math.max(10, turnoutPct)}%` }"
            >
              {{ turnoutPct }}% Kehadiran
            </div>
          </div>
        </div>
      </div>

      <!-- Operational Summary Grid -->
      <div class="lg:col-span-2 rounded-2xl border border-black bg-[#fafaf9] p-6 space-y-4">
        <div class="flex items-center justify-between gap-2">
          <div>
            <h2 class="text-base font-bold text-black">Ringkasan Operasional &amp; Kesiapan Event</h2>
            <p class="text-[11px] text-slate-600">Agregasi real-time dari modul tugas, jadwal, vendor, dan sponsor.</p>
          </div>
          <span
            v-if="remoteReport"
            class="rounded-full border border-black bg-white px-2.5 py-0.5 text-[10px] font-bold text-black"
          >
            Live Sync Backend
          </span>
        </div>

        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div class="rounded-xl border border-black bg-white p-3.5 space-y-1">
            <span class="text-[10px] font-bold uppercase text-slate-500">Task Selesai</span>
            <p class="text-lg font-black text-black">
              {{ remoteReport?.tasks_summary?.done ?? store.tasks.filter((t) => (t.event_id === event.id) && (t.status === 'Done' || t.status === 'completed')).length }}
              <span class="text-xs font-semibold text-slate-500">
                / {{ remoteReport?.tasks_summary?.total ?? store.tasks.filter((t) => t.event_id === event.id).length }}
              </span>
            </p>
          </div>
          <div class="rounded-xl border border-black bg-white p-3.5 space-y-1">
            <span class="text-[10px] font-bold uppercase text-slate-500">Sesi Rundown</span>
            <p class="text-lg font-black text-black">
              {{ remoteReport?.schedules_total ?? (event.schedules || []).length }} Sesi
            </p>
          </div>
          <div class="rounded-xl border border-black bg-white p-3.5 space-y-1">
            <span class="text-[10px] font-bold uppercase text-slate-500">Vendor Terdaftar</span>
            <p class="text-lg font-black text-black">
              {{ remoteReport?.vendors_count ?? store.vendors.filter((v) => !v.event_id || v.event_id === event.id).length }}
            </p>
          </div>
          <div class="rounded-xl border border-black bg-white p-3.5 space-y-1">
            <span class="text-[10px] font-bold uppercase text-slate-500">Sponsor Aktif</span>
            <p class="text-lg font-black text-black">
              {{ remoteReport?.sponsors_count ?? store.sponsors.filter((s) => !s.event_id || s.event_id === event.id).length }}
            </p>
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
          <div v-for="ph in taskVelocityByPhase" :key="ph.phase" class="space-y-1">
            <div class="flex justify-between font-semibold text-black">
              <span>{{ ph.phase }} ({{ ph.count }} task)</span>
              <span>{{ ph.avgPct }}% Selesai</span>
            </div>
            <div class="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
              <div class="h-full bg-[#72a5e4] transition-all" :style="{ width: `${ph.avgPct}%` }" />
            </div>
          </div>
          <div v-if="!taskVelocityByPhase.length" class="text-slate-500">
            Belum ada tugas/milestone pada event ini.
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

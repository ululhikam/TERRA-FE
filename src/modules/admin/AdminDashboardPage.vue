<script setup>
import { computed } from 'vue'
import { useEventWorkspaceStore } from '@/stores/eventWorkspace'

const store = useEventWorkspaceStore()
const pendingCount = computed(() =>
  store.adminDashboard?.pending_events ??
  store.events.filter((e) => e.publication_status === 'Pending Review').length
)
const totalOrganizations = computed(() => store.adminDashboard?.total_organizations ?? store.organizations.length)
const totalEvents = computed(() => store.adminDashboard?.total_events ?? store.events.length)
const totalIssuedTickets = computed(() => store.adminDashboard?.total_issued_tickets ?? store.myTickets.length)
</script>

<template>
  <div class="space-y-6 min-h-[calc(100vh-6rem)]">
    <div class="space-y-1">
      <span class="text-[9px] font-bold uppercase tracking-widest text-slate-500 block">
        SUPERVISION CONSOLE
      </span>
      <h1 class="text-3xl font-bold text-black font-sans">Platform Admin Dashboard</h1>
      <p class="text-xs text-slate-500">Monitoring ekosistem TERRA secara keseluruhan.</p>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <div class="rounded-xl border border-black bg-[#72a5e4] p-6 space-y-2">
        <span class="text-[10px] font-bold uppercase tracking-wider text-black block">TOTAL ORGANISASI</span>
        <span class="text-3xl font-black text-black leading-none block">{{ totalOrganizations }}</span>
        <p class="text-[11px] text-slate-900 pt-2 border-t border-black/20">Terdaftar di platform</p>
      </div>

      <div class="rounded-xl border border-black bg-[#fafaf9] p-6 space-y-2">
        <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">TOTAL EVENT</span>
        <span class="text-3xl font-black text-black leading-none block">{{ totalEvents }}</span>
        <p class="text-[11px] text-slate-500 pt-2 border-t border-black/10">Seluruh status</p>
      </div>

      <div class="rounded-xl border border-black bg-[#fafaf9] p-6 space-y-2">
        <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">MENUNGGU MODERASI</span>
        <span class="text-3xl font-black text-black leading-none block">{{ pendingCount }}</span>
        <p class="text-[11px] text-slate-500 pt-2 border-t border-black/10">Antrian review admin</p>
      </div>

      <div class="rounded-xl border border-black bg-[#fafaf9] p-6 space-y-2">
        <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">TOTAL TIKET TERBIT</span>
        <span class="text-3xl font-black text-black leading-none block">{{ totalIssuedTickets }}</span>
        <p class="text-[11px] text-slate-500 pt-2 border-t border-black/10">Tiket QR aktif</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useEventWorkspaceStore } from '@/stores/eventWorkspace'
import { useToastStore } from '@/stores/toast'
import { formatCurrency, formatDateTime } from '@/utils/formatters'

const store = useEventWorkspaceStore()
const toast = useToastStore()
const activeTab = ref('reports')

onMounted(async () => {
  await Promise.all([
    store.fetchAdminWorkspace().catch(() => {}),
    store.fetchAdminOrders().catch(() => {})
  ])
})

async function setReportStatus(rep, status) {
  try {
    await store.updateAdminReportStatus(rep.id, status)
    toast.success(`Laporan diperbarui menjadi "${status}".`)
  } catch (err) {
    toast.error(err?.message || 'Gagal memperbarui status laporan.')
  }
}
</script>

<template>
  <div class="space-y-6 min-h-[calc(100vh-6rem)]">
    <div class="space-y-1">
      <span class="text-[9px] font-bold uppercase tracking-widest text-slate-500 block">PLATFORM OVERSIGHT</span>
      <h1 class="text-3xl font-bold text-black font-sans">Reports &amp; Orders Oversight</h1>
      <p class="text-xs text-slate-500">Tinjau laporan penyalahgunaan event dari pengguna serta pantau seluruh transaksi tiket lintas platform.</p>
    </div>

    <div class="flex gap-2">
      <button
        @click="activeTab = 'reports'"
        class="rounded-full border border-black px-5 py-2 text-xs font-bold transition-colors"
        :class="activeTab === 'reports' ? 'bg-black text-white' : 'bg-white text-black hover:bg-slate-100'"
      >
        Laporan Pengguna ({{ store.adminReports.length }})
      </button>
      <button
        @click="activeTab = 'orders'"
        class="rounded-full border border-black px-5 py-2 text-xs font-bold transition-colors"
        :class="activeTab === 'orders' ? 'bg-black text-white' : 'bg-white text-black hover:bg-slate-100'"
      >
        Global Ticket Orders ({{ store.adminOrders.length }})
      </button>
    </div>

    <!-- Event Reports -->
    <div v-if="activeTab === 'reports'" class="rounded-xl border border-black bg-[#fafaf9] overflow-hidden">
      <div class="overflow-x-auto">
        <table class="min-w-full text-left text-xs">
          <thead class="bg-[#72a5e4]/30 border-b border-black text-[10px] font-bold uppercase text-black">
            <tr>
              <th class="px-5 py-3.5">EVENT ID</th>
              <th class="px-5 py-3.5">ALASAN &amp; DESKRIPSI</th>
              <th class="px-5 py-3.5">STATUS</th>
              <th class="px-5 py-3.5 text-right">AKSI</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-black/10">
            <tr v-for="rep in store.adminReports" :key="rep.id" class="hover:bg-white">
              <td class="px-5 py-4 font-mono text-[11px]">{{ rep.event_id }}</td>
              <td class="px-5 py-4">
                <p class="font-bold text-black">{{ rep.reason }}</p>
                <p class="text-slate-600 mt-0.5">{{ rep.description }}</p>
              </td>
              <td class="px-5 py-4">
                <span class="rounded-full border border-black bg-white px-3 py-0.5 text-[10px] font-bold uppercase">
                  {{ rep.status }}
                </span>
              </td>
              <td class="px-5 py-4 text-right space-x-1.5">
                <button
                  @click="setReportStatus(rep, 'in_review')"
                  class="rounded-full border border-black bg-white px-3 py-1 text-[11px] font-semibold hover:bg-slate-100"
                >
                  Review
                </button>
                <button
                  @click="setReportStatus(rep, 'resolved')"
                  class="rounded-full border border-black bg-[#72a5e4] px-3 py-1 text-[11px] font-bold hover:bg-[#5c93d9]"
                >
                  Resolve
                </button>
                <button
                  @click="setReportStatus(rep, 'dismissed')"
                  class="rounded-full border border-black bg-white px-3 py-1 text-[11px] font-semibold hover:bg-rose-50"
                >
                  Dismiss
                </button>
              </td>
            </tr>
            <tr v-if="!store.adminReports.length">
              <td colspan="4" class="px-5 py-8 text-center text-slate-500">Belum ada laporan event masuk.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Global Orders -->
    <div v-else class="rounded-xl border border-black bg-[#fafaf9] overflow-hidden">
      <div class="overflow-x-auto">
        <table class="min-w-full text-left text-xs">
          <thead class="bg-[#72a5e4]/30 border-b border-black text-[10px] font-bold uppercase text-black">
            <tr>
              <th class="px-5 py-3.5">ORDER REF</th>
              <th class="px-5 py-3.5">EVENT</th>
              <th class="px-5 py-3.5">QTY / TOTAL</th>
              <th class="px-5 py-3.5">STATUS</th>
              <th class="px-5 py-3.5">TANGGAL</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-black/10">
            <tr v-for="ord in store.adminOrders" :key="ord.id" class="hover:bg-white">
              <td class="px-5 py-4 font-mono font-bold text-black">{{ ord.order_number }}</td>
              <td class="px-5 py-4 font-semibold text-black">{{ ord.event_title || ord.event_id }}</td>
              <td class="px-5 py-4">{{ ord.quantity }}x • {{ Number(ord.total) === 0 ? 'Gratis' : formatCurrency(ord.total) }}</td>
              <td class="px-5 py-4">
                <span class="rounded-full border border-black bg-white px-2.5 py-0.5 text-[10px] font-bold">
                  {{ ord.order_status }} / {{ ord.payment_status }}
                </span>
              </td>
              <td class="px-5 py-4 text-slate-500">{{ formatDateTime(ord.created_at) }}</td>
            </tr>
            <tr v-if="!store.adminOrders.length">
              <td colspan="5" class="px-5 py-8 text-center text-slate-500">Belum ada pesanan tiket di platform.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { useEventWorkspaceStore } from '@/stores/eventWorkspace'
import { formatCurrency, formatDateTime } from '@/utils/formatters'
import { Layers, Receipt, History, ArrowRight } from 'lucide-vue-next'

const store = useEventWorkspaceStore()
const history = ref({ transactions: [], bundle_credits: [], audit_logs: [] })
const loading = ref(true)

onMounted(async () => {
  loading.value = true
  try {
    const res = await store.fetchOrganizerBillingHistory()
    if (res) history.value = res
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="space-y-6 min-h-[calc(100vh-6rem)]">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div class="space-y-1">
        <span class="text-[9px] font-bold uppercase tracking-widest text-slate-500 block">
          ORGANIZATION BILLING &amp; BUNDLES
        </span>
        <h1 class="text-3xl font-bold text-black font-sans">Riwayat Transaksi &amp; Kuota Bundle</h1>
        <p class="text-xs text-slate-600">
          Pembayaran berlaku per event tanpa perpanjangan otomatis. Gunakan kuota bundle atau buka menu Billing di masing-masing event.
        </p>
      </div>
      <RouterLink
        to="/pricing"
        class="rounded-full border border-black bg-[#72a5e4] px-5 py-2.5 text-xs font-bold text-black hover:bg-[#5c93d9] inline-flex items-center gap-1.5 shrink-0"
      >
        <span>Lihat Semua Paket TERRA</span>
        <ArrowRight class="h-3.5 w-3.5" />
      </RouterLink>
    </div>

    <!-- Bundle Credits -->
    <div class="rounded-2xl border border-black bg-[#fafaf9] p-6 space-y-4">
      <div class="flex items-center gap-2">
        <Layers class="h-4 w-4 text-black" />
        <h2 class="text-base font-bold text-black">Kuota Multi-Event Bundle Organisasi</h2>
      </div>
      <div v-if="history.bundle_credits.length" class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div
          v-for="c in history.bundle_credits"
          :key="c.id"
          class="rounded-xl border border-black bg-white p-4 space-y-1.5 text-xs"
        >
          <span class="rounded-full border border-black bg-[#72a5e4] px-2.5 py-0.5 text-[10px] font-bold uppercase">
            {{ c.plan_code }}
          </span>
          <h3 class="font-bold text-black text-sm pt-1">{{ c.bundle_name }}</h3>
          <p class="text-slate-600">
            Tersisa <strong class="text-black">{{ c.remaining_credits }}</strong> dari {{ c.total_credits }} event
          </p>
        </div>
      </div>
      <p v-else class="text-xs text-slate-500">
        Belum ada kuota multi-event bundle aktif. Anda dapat membeli bundle dari halaman Paket &amp; Billing di tiap event.
      </p>
    </div>

    <!-- Transactions -->
    <div class="rounded-2xl border border-black bg-white overflow-hidden">
      <div class="border-b border-black px-6 py-4 bg-[#fafaf9] flex items-center gap-2">
        <Receipt class="h-4 w-4 text-black" />
        <h2 class="text-sm font-bold text-black">Seluruh Transaksi &amp; Invoice ({{ history.transactions.length }})</h2>
      </div>
      <div class="overflow-x-auto">
        <table class="min-w-full text-left text-xs">
          <thead class="bg-[#72a5e4]/25 border-b border-black text-[10px] font-bold uppercase text-black">
            <tr>
              <th class="px-5 py-3">INVOICE</th>
              <th class="px-5 py-3">EVENT / TARGET</th>
              <th class="px-5 py-3">PAKET</th>
              <th class="px-5 py-3">NOMINAL</th>
              <th class="px-5 py-3">STATUS</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-black/10">
            <tr v-for="tx in history.transactions" :key="tx.id" class="hover:bg-[#fafaf9]">
              <td class="px-5 py-3 font-mono font-bold text-black">
                {{ tx.invoice_number }}
                <div class="text-[10px] font-sans font-normal text-slate-500">{{ formatDateTime(tx.created_at) }}</div>
              </td>
              <td class="px-5 py-3 text-slate-700">{{ tx.event?.title || 'Multi-Event Bundle' }}</td>
              <td class="px-5 py-3 font-bold text-black">{{ tx.plan_name }}</td>
              <td class="px-5 py-3 font-bold text-black">{{ formatCurrency(tx.final_amount_idr) }}</td>
              <td class="px-5 py-3">
                <span
                  class="rounded-full border border-black px-2.5 py-0.5 text-[10px] font-bold"
                  :class="tx.status === 'Paid' ? 'bg-[#72a5e4] text-black' : 'bg-amber-100 text-amber-900'"
                >
                  {{ tx.status }}
                </span>
              </td>
            </tr>
            <tr v-if="!history.transactions.length">
              <td colspan="5" class="px-5 py-6 text-center text-slate-500">Belum ada transaksi billing.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Audit Logs -->
    <div class="rounded-2xl border border-black bg-[#fafaf9] p-6 space-y-3">
      <div class="flex items-center gap-2">
        <History class="h-4 w-4 text-black" />
        <h2 class="text-sm font-bold text-black">Log Riwayat Paket &amp; Trial</h2>
      </div>
      <div v-if="history.audit_logs.length" class="space-y-2 text-xs">
        <div
          v-for="log in history.audit_logs"
          :key="log.id"
          class="rounded-xl border border-black/15 bg-white px-4 py-2.5 flex items-center justify-between gap-2"
        >
          <div>
            <span class="font-mono font-bold text-black">{{ log.action }}</span>
            <span v-if="log.from_plan || log.to_plan" class="ml-2 text-slate-600">
              {{ log.from_plan || '-' }} &rarr; {{ log.to_plan || '-' }}
            </span>
          </div>
          <span class="text-[10px] text-slate-400">{{ formatDateTime(log.created_at) }}</span>
        </div>
      </div>
      <p v-else class="text-xs text-slate-500">Belum ada catatan perubahan paket.</p>
    </div>
  </div>
</template>

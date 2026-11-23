<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useEventWorkspaceStore } from '@/stores/eventWorkspace'
import { useToastStore } from '@/stores/toast'
import { formatCurrency, formatDateTime } from '@/utils/formatters'
import { CheckCircle2, RefreshCw, ExternalLink } from 'lucide-vue-next'

const route = useRoute()
const store = useEventWorkspaceStore()
const toast = useToastStore()

const eventId = computed(() => route.params.eventId || store.activeEvent?.id)
const loading = ref(true)
const verifyingId = ref('')
const statusFilter = ref('ALL')

const orders = computed(() => {
  const base = store.eventOrders.filter((o) => o.event_id === eventId.value)
  if (statusFilter.value === 'PENDING') return base.filter((o) => o.order_status === 'Pending' || o.payment_status === 'Pending')
  if (statusFilter.value === 'CONFIRMED') return base.filter((o) => o.order_status === 'Confirmed')
  if (statusFilter.value === 'CANCELLED') return base.filter((o) => o.order_status === 'Cancelled')
  return base
})

async function loadOrders() {
  if (!eventId.value) return
  loading.value = true
  try {
    await store.fetchEventOrders(eventId.value)
  } catch (err) {
    toast.error(err?.message || 'Gagal memuat daftar pesanan.')
  } finally {
    loading.value = false
  }
}

onMounted(loadOrders)

async function handleVerify(order) {
  verifyingId.value = order.id
  try {
    await store.verifyOrderPayment(eventId.value, order.id)
    toast.success(`Pembayaran order ${order.order_number} diverifikasi! E-Tiket QR kini aktif.`)
  } catch (err) {
    toast.error(err?.message || 'Gagal memverifikasi pembayaran order.')
  } finally {
    verifyingId.value = ''
  }
}
</script>

<template>
  <div class="space-y-6 min-h-[calc(100vh-6rem)]">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div class="space-y-1">
        <span class="text-[10px] font-bold uppercase tracking-wider text-slate-500">TICKETING OPERATIONS</span>
        <h1 class="text-3xl font-bold tracking-tight text-black font-sans">Orders &amp; Verifikasi Pembayaran</h1>
        <p class="text-xs text-slate-600">
          Pesanan tiket berbayar berstatus Pending hingga panitia memverifikasi bukti pembayaran untuk mengaktifkan QR Code.
        </p>
      </div>
      <div class="flex items-center gap-2">
        <select v-model="statusFilter" class="rounded-full border border-black bg-white px-4 py-2 text-xs font-semibold text-black">
          <option value="ALL">Semua Order</option>
          <option value="PENDING">Perlu Verifikasi (Pending)</option>
          <option value="CONFIRMED">Confirmed</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
        <button
          @click="loadOrders"
          class="inline-flex items-center gap-1.5 rounded-full border border-black bg-white px-4 py-2 text-xs font-bold text-black hover:bg-slate-100"
        >
          <RefreshCw class="h-3.5 w-3.5" /> Refresh
        </button>
      </div>
    </div>

    <div class="rounded-2xl border border-black bg-white overflow-hidden">
      <div class="overflow-x-auto">
        <table class="min-w-full text-left text-xs">
          <thead class="bg-[#72a5e4]/30 border-b border-black text-[10px] font-bold uppercase text-black">
            <tr>
              <th class="px-5 py-3.5">ORDER NUMBER</th>
              <th class="px-5 py-3.5">QTY</th>
              <th class="px-5 py-3.5">TOTAL</th>
              <th class="px-5 py-3.5">STATUS ORDER / BAYAR</th>
              <th class="px-5 py-3.5">BUKTI BAYAR &amp; CATATAN</th>
              <th class="px-5 py-3.5">WAKTU</th>
              <th class="px-5 py-3.5 text-right">AKSI</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-black/10">
            <tr v-if="loading">
              <td colspan="7" class="px-5 py-8 text-center text-slate-500">Memuat pesanan event...</td>
            </tr>
            <tr v-for="ord in orders" :key="ord.id" class="hover:bg-[#fafaf9]">
              <td class="px-5 py-4 font-mono font-bold text-black">{{ ord.order_number }}</td>
              <td class="px-5 py-4">{{ ord.quantity }}x</td>
              <td class="px-5 py-4 font-bold text-black">
                {{ Number(ord.total) === 0 ? 'Gratis' : formatCurrency(ord.total) }}
              </td>
              <td class="px-5 py-4">
                <div class="flex flex-wrap gap-1.5">
                  <span
                    class="rounded-full border border-black px-2.5 py-0.5 text-[10px] font-bold"
                    :class="ord.order_status === 'Confirmed' ? 'bg-[#72a5e4] text-black' : ord.order_status === 'Cancelled' ? 'bg-rose-100 text-rose-800' : 'bg-amber-200 text-black'"
                  >
                    {{ ord.order_status }}
                  </span>
                  <span class="rounded-full border border-black bg-white px-2.5 py-0.5 text-[10px] font-semibold">
                    {{ ord.payment_status }}
                  </span>
                </div>
              </td>
              <td class="px-5 py-4 text-slate-600 max-w-xs">
                <p v-if="ord.payment_notes" class="truncate">{{ ord.payment_notes }}</p>
                <a
                  v-if="ord.payment_proof_url && ord.payment_proof_url.startsWith('http')"
                  :href="ord.payment_proof_url"
                  target="_blank"
                  rel="noopener"
                  class="inline-flex items-center gap-1 font-bold text-black underline mt-0.5"
                >
                  Lihat Bukti <ExternalLink class="h-3 w-3" />
                </a>
                <span v-else-if="ord.payment_proof_url" class="font-mono text-[11px] text-black break-all">
                  {{ ord.payment_proof_url }}
                </span>
                <span v-else class="text-slate-400">Belum ada bukti</span>
              </td>
              <td class="px-5 py-4 text-[11px] text-slate-500">{{ formatDateTime(ord.created_at) }}</td>
              <td class="px-5 py-4 text-right">
                <button
                  v-if="ord.order_status === 'Pending' || ord.payment_status === 'Pending'"
                  @click="handleVerify(ord)"
                  :disabled="verifyingId === ord.id"
                  class="inline-flex items-center gap-1.5 rounded-full border border-black bg-[#72a5e4] px-3.5 py-1.5 text-xs font-bold text-black hover:bg-[#5c93d9] disabled:opacity-50 cursor-pointer"
                >
                  <CheckCircle2 class="h-3.5 w-3.5" />
                  <span>{{ verifyingId === ord.id ? 'Memproses...' : 'Verifikasi & Aktifkan QR' }}</span>
                </button>
                <span v-else class="text-[11px] font-semibold text-slate-500">—</span>
              </td>
            </tr>
            <tr v-if="!loading && !orders.length">
              <td colspan="7" class="px-5 py-8 text-center text-slate-500">Belum ada transaksi order pada filter ini.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

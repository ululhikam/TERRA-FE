<script setup>
import { computed, ref, onBeforeUnmount, onMounted, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { useEventWorkspaceStore } from '@/stores/eventWorkspace'
import { useToastStore } from '@/stores/toast'
import { formatCurrency, formatDateTime } from '@/utils/formatters'
import { downloadTicketQrPng, generateTicketQrPayload } from '@/utils/qrCode'
import { openMidtransSnap } from '@/utils/midtrans'
import QrCodeCanvas from '@/components/common/QrCodeCanvas.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import { Download, Maximize2, Copy, X, FileText, CreditCard, RefreshCw, ArrowRight } from 'lucide-vue-next'

const store = useEventWorkspaceStore()
const toast = useToastStore()
const enlargedTicket = ref(null)
const payingOrderId = ref('')
const syncingOrderId = ref('')
const cancellingOrderId = ref('')

const pendingPaidOrders = computed(() =>
  (store.myOrders || []).filter(
    (o) =>
      o.order_status !== 'Cancelled' &&
      o.order_status !== 'Confirmed' &&
      !['Paid', 'Verified', 'Not Required'].includes(o.payment_status) &&
      Number(o.total || 0) > 0
  )
)

function isTicketActive(status) {
  return ['valid', 'active'].includes(String(status || '').toLowerCase())
}

function isTicketCancelled(status) {
  return String(status || '').toLowerCase() === 'cancelled'
}

function isTicketPending(status) {
  return String(status || '').toLowerCase() === 'pending'
}

function getTicketQrValue(tkt) {
  return (
    tkt.qr_payload ||
    generateTicketQrPayload({
      ticketCode: tkt.ticket_code,
      eventId: tkt.event_id
    })
  )
}

async function handleDownloadQrPng(tkt) {
  try {
    await downloadTicketQrPng(tkt)
    toast.success(`QR Code tiket ${tkt.ticket_code} (.png) berhasil diunduh.`)
  } catch (err) {
    toast.error(err.message || 'Gagal mengunduh QR Code.')
  }
}

async function handleDownloadQrPdf(tkt) {
  try {
    await store.downloadTicketQrPdf(tkt)
    toast.success(`PDF QR tiket ${tkt.ticket_code} berhasil diunduh.`)
  } catch (err) {
    toast.error(err.message || 'Gagal mengunduh PDF QR.')
  }
}

async function handleCopyCode(text) {
  try {
    await navigator.clipboard?.writeText(text)
    toast.success(`Kode "${text}" disalin ke clipboard.`)
  } catch {
    toast.error('Gagal menyalin kode.')
  }
}

async function syncOrder(orderId, { silent = false, midtransOrderId = '', expectSettled = false } = {}) {
  syncingOrderId.value = orderId
  try {
    const maxAttempts = expectSettled ? 3 : 1
    let res = null
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      if (attempt > 0) await new Promise((r) => setTimeout(r, attempt === 1 ? 1500 : 2000))
      res = await store.syncOrderPaymentStatus(orderId, midtransOrderId, expectSettled ? 'settlement' : '')
      if (res?.payment_state === 'settled' || res?.order?.order_status === 'Confirmed') break
    }
    await store.fetchMyTickets().catch(() => {})
    if (!silent) {
      if (res?.payment_state === 'settled' || res?.order?.order_status === 'Confirmed') {
        toast.success('Pembayaran terkonfirmasi! Tiket QR Anda sudah aktif.')
      } else {
        toast.info(`Status pembayaran: ${res?.order?.payment_status || 'Pending'}.`)
      }
    }
  } catch (err) {
    if (!silent) toast.error(err?.message || 'Gagal menyinkronkan status pembayaran.')
  } finally {
    syncingOrderId.value = ''
  }
}

async function handlePayPendingOrder(ord, { forceNew = false } = {}) {
  payingOrderId.value = ord.id
  try {
    const session = await store.createOrderSnapToken(ord.id, { forceNew })
    if (session?.already_settled || session?.payment_state === 'settled') {
      await store.fetchMyTickets().catch(() => {})
      await store.fetchMyOrders().catch(() => {})
      toast.success('Pembayaran terkonfirmasi! Tiket QR Anda sudah aktif.')
      return
    }
    if (!session?.snap_token) {
      toast.error(session?.snap_error || 'Token pembayaran Midtrans belum tersedia.')
      return
    }
    const snapRes = await openMidtransSnap(session.snap_token, {
      clientKey: session.client_key,
      snapJsUrl: session.snap_js_url
    })
    await syncOrder(ord.id, {
      silent: snapRes.status === 'closed',
      midtransOrderId: snapRes?.result?.order_id || session.midtrans_order_id || '',
      expectSettled: snapRes.status === 'success'
    })
  } catch (err) {
    if (err?.code === 'PAYMENT_ALREADY_SETTLED') {
      await syncOrder(ord.id, { expectSettled: true })
      return
    }
    toast.error(err?.message || 'Gagal membuka jendela pembayaran Midtrans.')
  } finally {
    payingOrderId.value = ''
  }
}

async function handleCancelPending(ordId) {
  cancellingOrderId.value = ordId
  try {
    await store.cancelMyOrder(ordId)
    toast.success('Pesanan dibatalkan & kuota tiket dikembalikan.')
  } catch (err) {
    toast.error(err?.message || 'Gagal membatalkan pesanan.')
  } finally {
    cancellingOrderId.value = ''
  }
}

async function syncAllPendingOrders() {
  if (!pendingPaidOrders.value.length || syncingOrderId.value || payingOrderId.value) return
  for (const ord of pendingPaidOrders.value.slice(0, 3)) {
    await syncOrder(ord.id, { silent: true })
  }
}

let ticketsPollTimer = null
let ticketsPollTicks = 0

function stopTicketsPolling() {
  if (ticketsPollTimer) {
    clearInterval(ticketsPollTimer)
    ticketsPollTimer = null
  }
  ticketsPollTicks = 0
}

function handleTicketsFocus() {
  if (typeof document !== 'undefined' && document.hidden) return
  syncAllPendingOrders()
}

watch(
  () => pendingPaidOrders.value.length,
  (count) => {
    if (!count) {
      stopTicketsPolling()
      return
    }
    if (ticketsPollTimer) return
    ticketsPollTicks = 0
    ticketsPollTimer = setInterval(() => {
      ticketsPollTicks += 1
      if (ticketsPollTicks > 30) {
        stopTicketsPolling()
        return
      }
      syncAllPendingOrders()
    }, 5000)
  }
)

if (typeof window !== 'undefined') {
  window.addEventListener('focus', handleTicketsFocus)
  document.addEventListener('visibilitychange', handleTicketsFocus)
}

onBeforeUnmount(() => {
  stopTicketsPolling()
  if (typeof window !== 'undefined') {
    window.removeEventListener('focus', handleTicketsFocus)
    document.removeEventListener('visibilitychange', handleTicketsFocus)
  }
})

onMounted(async () => {
  await Promise.all([
    store.fetchMyTickets().catch(() => {}),
    store.fetchMyOrders().catch(() => {})
  ])
  await syncAllPendingOrders()
})
</script>

<template>
  <div class="mx-auto max-w-5xl px-4 sm:px-6 py-10 space-y-8">
    <div v-reveal class="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
      <div class="space-y-1">
        <h1 class="text-3xl sm:text-4xl font-bold tracking-tight text-black font-editorial">
          Tiket Digital Saya
        </h1>
        <p class="text-xs sm:text-sm text-slate-600">
          Tunjukkan QR Code di bawah ini kepada panitia saat check-in di lokasi event, atau unduh dalam format PDF/PNG.
        </p>
      </div>
      <RouterLink
        to="/profile"
        class="luxury-pill inline-flex items-center justify-center gap-1.5 rounded-full border border-black bg-white px-5 py-2 text-xs font-bold text-black hover:bg-slate-100 shrink-0"
      >
        <span>Lihat Profil &amp; Riwayat Pesanan</span>
        <ArrowRight class="h-3.5 w-3.5" />
      </RouterLink>
    </div>

    <!-- Pending Midtrans Orders Section -->
    <div v-if="pendingPaidOrders.length" class="space-y-3">
      <h2 class="text-sm font-bold text-black">Pesanan Menunggu Pembayaran ({{ pendingPaidOrders.length }})</h2>
      <div class="space-y-3">
        <div
          v-for="ord in pendingPaidOrders"
          :key="ord.id"
          class="rounded-2xl border-2 border-black bg-amber-100 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-[3px_3px_0px_#000]"
        >
          <div class="space-y-1">
            <div class="flex flex-wrap items-center gap-2">
              <span class="rounded-full border border-black bg-white px-2.5 py-0.5 text-[10px] font-bold text-amber-800">
                Menunggu Pembayaran
              </span>
              <span class="font-mono text-xs font-bold text-black">{{ ord.order_number }}</span>
            </div>
            <p class="text-xs font-semibold text-black">
              {{ ord.quantity }} tiket • Total {{ formatCurrency(ord.total) }}
            </p>
            <p class="text-[11px] text-slate-700">
              QR Code &amp; e-ticket PDF akan otomatis aktif setelah pembayaran Midtrans lunas.
            </p>
          </div>
          <div class="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              @click="handlePayPendingOrder(ord)"
              :disabled="payingOrderId === ord.id || cancellingOrderId === ord.id"
              class="inline-flex items-center gap-1.5 rounded-full border border-black bg-[#72a5e4] px-4 py-2 text-xs font-bold text-black hover:bg-[#5c93d9] cursor-pointer disabled:opacity-50"
            >
              <CreditCard class="h-3.5 w-3.5" />
              <span>{{ payingOrderId === ord.id ? 'Membuka...' : 'Bayar Sekarang' }}</span>
            </button>
            <button
              type="button"
              @click="syncOrder(ord.id)"
              :disabled="syncingOrderId === ord.id"
              class="inline-flex items-center gap-1 rounded-full border border-black bg-white px-3.5 py-2 text-xs font-semibold text-black hover:bg-slate-100 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw class="h-3.5 w-3.5" :class="syncingOrderId === ord.id ? 'animate-spin' : ''" />
              <span>Cek Status</span>
            </button>
            <button
              type="button"
              @click="handleCancelPending(ord.id)"
              :disabled="cancellingOrderId === ord.id"
              class="rounded-full border border-rose-600 bg-white px-3.5 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50 cursor-pointer disabled:opacity-50"
            >
              Batalkan
            </button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="store.myTickets.filter((t) => !isTicketPending(t.status)).length > 0" class="space-y-6">
      <div
        v-for="(tkt, idx) in store.myTickets.filter((t) => !isTicketPending(t.status))"
        :key="tkt.id"
        v-reveal="idx * 70"
        class="interactive-surface relative rounded-3xl border-2 border-black bg-white overflow-hidden p-5 sm:p-8 flex flex-col md:flex-row items-stretch justify-between gap-5 sm:gap-6 shadow-[4px_4px_0px_#000]"
      >
        <!-- Desktop Perforation Notches -->
        <div class="hidden md:block absolute -top-3 right-56 w-6 h-6 rounded-full border-2 border-black bg-[#fafaf9]" />
        <div class="hidden md:block absolute -bottom-3 right-56 w-6 h-6 rounded-full border-2 border-black bg-[#fafaf9]" />

        <!-- Ticket Left Content -->
        <div class="space-y-3 flex-1">
          <div class="flex items-center justify-between sm:justify-start gap-3 flex-wrap">
            <div class="flex items-center gap-2">
              <span
                v-if="isTicketActive(tkt.status)"
                class="rounded-full border border-black bg-[#72a5e4] px-3 py-0.5 text-xs font-bold text-black"
              >
                Active
              </span>
              <span
                v-else-if="isTicketCancelled(tkt.status)"
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
            </div>
            <span class="font-mono text-xs font-bold text-slate-700 bg-[#fafaf9] border border-black/15 rounded-lg px-2 py-0.5">{{ tkt.ticket_code }}</span>
          </div>

          <h2 class="text-lg sm:text-xl font-black tracking-tight text-black leading-snug">
            {{ tkt.event_title }}
          </h2>

          <p class="text-xs sm:text-sm font-semibold text-slate-800">
            {{ tkt.ticket_type }} • {{ tkt.participant_name }}
          </p>

          <div class="pt-1 grid grid-cols-1 sm:grid-cols-2 gap-1.5 sm:gap-2 text-xs text-slate-600">
            <div class="font-medium text-slate-800">{{ formatDateTime(tkt.event_date) }}</div>
            <div>{{ tkt.location }}</div>
          </div>

          <div class="pt-2 space-y-2.5 sm:space-y-0 sm:flex sm:flex-wrap sm:items-center sm:justify-between gap-3">
            <p class="text-[11px] text-slate-400">Order Ref: {{ tkt.order_number }}</p>

            <!-- 2x2 Touch Action Grid on Mobile, Inline Row on Desktop -->
            <div class="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2">
              <button
                type="button"
                @click="handleDownloadQrPdf(tkt)"
                class="luxury-pill inline-flex items-center justify-center gap-1.5 rounded-full border border-black bg-[#72a5e4] px-3.5 py-2 sm:py-1.5 text-[11px] font-bold text-black cursor-pointer"
              >
                <FileText class="h-3.5 w-3.5" />
                PDF QR
              </button>
              <button
                type="button"
                @click="handleDownloadQrPng(tkt)"
                class="luxury-pill inline-flex items-center justify-center gap-1.5 rounded-full border border-black bg-black px-3.5 py-2 sm:py-1.5 text-[11px] font-bold text-white cursor-pointer"
              >
                <Download class="h-3.5 w-3.5" />
                PNG
              </button>
              <button
                type="button"
                @click="enlargedTicket = tkt"
                class="luxury-pill inline-flex items-center justify-center gap-1.5 rounded-full border border-black bg-white px-3 py-2 sm:py-1.5 text-[11px] font-semibold text-black cursor-pointer"
              >
                <Maximize2 class="h-3.5 w-3.5" />
                Perbesar
              </button>
              <button
                type="button"
                @click="handleCopyCode(tkt.ticket_code)"
                class="luxury-pill inline-flex items-center justify-center gap-1.5 rounded-full border border-black bg-white px-3 py-2 sm:py-1.5 text-[11px] font-semibold text-black cursor-pointer"
              >
                <Copy class="h-3.5 w-3.5" />
                Salin
              </button>
            </div>
          </div>
        </div>

        <!-- Dashed Divider (Desktop) -->
        <div class="hidden md:block border-r-2 border-dashed border-slate-300 mx-4" />

        <!-- Ticket Right Content (QR & Code) with Mobile Boarding-Pass Perforation Notches -->
        <div class="relative flex flex-col items-center justify-center gap-2 shrink-0 md:w-44 pt-5 md:pt-0 border-t-2 md:border-t-0 border-dashed border-slate-300">
          <div class="md:hidden absolute -top-3 -left-8 w-6 h-6 rounded-full border-2 border-black bg-[#fafaf9]" />
          <div class="md:hidden absolute -top-3 -right-8 w-6 h-6 rounded-full border-2 border-black bg-[#fafaf9]" />
          <button
            type="button"
            @click="enlargedTicket = tkt"
            class="p-2.5 border-2 border-black rounded-2xl bg-white shadow-[3px_3px_0px_#000] active:scale-95 transition-all duration-200 hover:scale-103 cursor-pointer"
            title="Klik untuk perbesar QR Code"
          >
            <QrCodeCanvas :value="getTicketQrValue(tkt)" :src="tkt.qr_data_url" :size="136" />
          </button>
          <span class="text-[11px] font-mono font-bold text-slate-700 tracking-wider">
            Ketuk QR untuk Fullscreen
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
          class="luxury-pill rounded-full border border-black bg-[#72a5e4] px-6 py-2 text-xs font-bold text-black"
        >
          Jelajahi Event
        </RouterLink>
      </template>
    </EmptyState>

    <!-- Enlarged QR Modal -->
    <Transition name="modal-pop">
      <div
        v-if="enlargedTicket"
        @click.self="enlargedTicket = null"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-2xs"
      >
        <div class="w-full max-w-sm rounded-3xl border-2 border-black bg-white p-6 space-y-5 text-center shadow-[6px_6px_0px_#000]">
          <div class="flex items-center justify-between border-b border-black/15 pb-3">
            <span class="text-xs font-bold uppercase tracking-wider text-slate-500">QR Code Tiket</span>
            <button
              type="button"
              @click="enlargedTicket = null"
              class="p-1 rounded-full border border-black hover:bg-slate-100 cursor-pointer"
            >
              <X class="h-4 w-4" />
            </button>
          </div>

          <div class="space-y-1">
            <h3 class="text-base font-bold text-black">{{ enlargedTicket.event_title }}</h3>
            <p class="text-xs text-slate-600">{{ enlargedTicket.ticket_type }} • {{ enlargedTicket.participant_name }}</p>
          </div>

          <div class="flex justify-center">
            <div class="p-3 rounded-2xl border border-black bg-white">
              <QrCodeCanvas :value="getTicketQrValue(enlargedTicket)" :src="enlargedTicket.qr_data_url" :size="240" />
            </div>
          </div>

          <div class="space-y-1">
            <p class="font-mono text-sm font-bold text-black">{{ enlargedTicket.ticket_code }}</p>
            <p class="font-mono text-[10px] text-slate-400 break-all">{{ getTicketQrValue(enlargedTicket) }}</p>
          </div>

          <div class="flex flex-wrap items-center justify-center gap-2 pt-2">
            <button
              type="button"
              @click="handleDownloadQrPdf(enlargedTicket)"
              class="luxury-pill inline-flex items-center gap-1.5 rounded-full border border-black bg-[#72a5e4] px-4 py-2 text-xs font-bold text-black cursor-pointer"
            >
              <FileText class="h-3.5 w-3.5" />
              PDF QR
            </button>
            <button
              type="button"
              @click="handleDownloadQrPng(enlargedTicket)"
              class="luxury-pill inline-flex items-center gap-1.5 rounded-full bg-black px-4 py-2 text-xs font-bold text-white cursor-pointer"
            >
              <Download class="h-3.5 w-3.5" />
              PNG
            </button>
            <button
              type="button"
              @click="handleCopyCode(getTicketQrValue(enlargedTicket))"
              class="luxury-pill inline-flex items-center gap-1.5 rounded-full border border-black bg-white px-4 py-2 text-xs font-semibold text-black cursor-pointer"
            >
              <Copy class="h-3.5 w-3.5" />
              Salin Payload
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

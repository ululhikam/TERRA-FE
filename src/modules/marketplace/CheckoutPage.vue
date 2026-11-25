<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import { z } from 'zod'
import { useEventWorkspaceStore } from '@/stores/eventWorkspace'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'
import { formatCurrency, formatDateTime } from '@/utils/formatters'
import { downloadTicketQrPng, generateTicketQrPayload } from '@/utils/qrCode'
import { openMidtransSnap } from '@/utils/midtrans'
import QrCodeCanvas from '@/components/common/QrCodeCanvas.vue'
import { CheckCircle2, Download, ArrowRight, Copy, FileText, Mail, X, CreditCard, RefreshCw, Repeat, Trash2, AlertCircle } from 'lucide-vue-next'

const route = useRoute()
const store = useEventWorkspaceStore()
const authStore = useAuthStore()
const toast = useToastStore()

const loadingEvent = ref(true)
const submitting = ref(false)
const completedOrder = ref(null)
const showEmailPreview = ref(false)

const event = computed(() =>
  store.events.find((e) => e.slug === route.params.eventSlug || e.id === route.params.eventSlug) || null
)

const existingPendingOrderForEvent = computed(() => {
  if (!event.value?.id || completedOrder.value) return null
  return (
    (store.myOrders || []).find(
      (o) =>
        o.event_id === event.value.id &&
        o.order_status === 'Pending' &&
        Number(o.total || 0) > 0
    ) || null
  )
})

function mapOrderSyncToCompleted(order, tickets = [], emailStatus = null) {
  return {
    orderId: order.id,
    orderNumber: order.order_number,
    total: order.total,
    quantity: order.quantity,
    orderStatus: order.order_status,
    paymentStatus: order.payment_status,
    order,
    tickets: tickets || [],
    emailStatus: emailStatus || null,
    emailNotification: emailStatus || null
  }
}

onMounted(async () => {
  loadingEvent.value = true
  try {
    await store.fetchEventPublic(route.params.eventSlug).catch(() => {})
    const rawOrderQuery =
      route.query.order_id ?? route.query.order_ref ?? ''
    const resolvedOrderParam = Array.isArray(rawOrderQuery)
      ? rawOrderQuery[rawOrderQuery.length - 1]
      : rawOrderQuery
    const redirectOrderRef = String(resolvedOrderParam || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .pop() || ''
    const rawTxStatus = Array.isArray(route.query.transaction_status)
      ? route.query.transaction_status[route.query.transaction_status.length - 1]
      : route.query.transaction_status
    const redirectSettled = ['settlement', 'capture'].includes(
      String(rawTxStatus || '').toLowerCase()
    )
    if (redirectOrderRef && authStore.isAuthenticated) {
      try {
        const maxAttempts = redirectSettled ? 3 : 1
        let syncRes = null
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
          if (attempt > 0) await new Promise((r) => setTimeout(r, attempt === 1 ? 1500 : 2000))
          syncRes = await store.syncOrderPaymentStatus(redirectOrderRef, redirectOrderRef)
          if (syncRes?.payment_state === 'settled' || syncRes?.order?.order_status === 'Confirmed') break
        }
        if (syncRes?.order) {
          completedOrder.value = mapOrderSyncToCompleted(
            syncRes.order,
            syncRes.tickets || [],
            syncRes.email_status || null
          )
          if (syncRes?.payment_state === 'settled' || syncRes?.order?.order_status === 'Confirmed') {
            toast.success('Pembayaran terkonfirmasi! E-Tiket QR kini aktif dan dikirim ke email Anda.')
          } else if (syncRes?.order?.order_status === 'Cancelled') {
            toast.info('Pesanan ini telah dibatalkan atau kedaluwarsa.')
          }
        }
      } catch (err) {
        toast.error(err?.message || 'Gagal memuat status pesanan dari pengalihan Midtrans.')
      }
    } else if (authStore.isAuthenticated) {
      await store.fetchMyOrders().catch(() => [])
    }
  } catch {
    // Handled by empty state below
  } finally {
    loadingEvent.value = false
  }
})

const selectedTicketId = ref(route.query.ticketId ? String(route.query.ticketId) : '')

watch(
  event,
  (evt) => {
    if (!evt?.ticket_types?.length) return
    const exists = evt.ticket_types.some((t) => t.id === selectedTicketId.value)
    if (!exists) {
      const firstAvailable = evt.ticket_types.find((t) => t.status === 'On Sale') || evt.ticket_types[0]
      selectedTicketId.value = firstAvailable?.id || ''
    }
  },
  { immediate: true }
)

const ticketType = computed(() => {
  if (!event.value?.ticket_types?.length) return null
  return (
    event.value.ticket_types.find((t) => t.id === selectedTicketId.value) ||
    event.value.ticket_types[0]
  )
})

const remainingQuota = computed(() => {
  if (!ticketType.value) return 0
  return Math.max(0, Number(ticketType.value.quantity || 0) - Number(ticketType.value.sold_quantity || 0))
})

const minQty = computed(() => Math.max(1, Number(ticketType.value?.min_per_order || 1)))

const isSoldOut = computed(
  () => !ticketType.value || ticketType.value.status !== 'On Sale' || remainingQuota.value < minQty.value
)

const maxQty = computed(() => {
  const limit = Number(ticketType.value?.max_per_order || 5)
  if (remainingQuota.value <= 0) return minQty.value
  return Math.max(minQty.value, Math.min(limit, remainingQuota.value))
})

const quantity = ref(Math.max(1, Number(route.query.qty) || 1))
watch(
  [minQty, maxQty],
  ([minVal, maxVal]) => {
    if (quantity.value < minVal) quantity.value = minVal
    if (quantity.value > maxVal) quantity.value = maxVal
  },
  { immediate: true }
)

const fullName = ref(authStore.user?.full_name || '')
const email = ref(authStore.user?.email || '')
const phone = ref(authStore.user?.phone || '')
const institution = ref('')
const memberId = ref('')
const launchingSnap = ref(false)
const syncingPayment = ref(false)
const cancellingOrder = ref(false)
const errorMsg = ref('')

watch(
  () => authStore.user,
  (u) => {
    if (!u) return
    if (!fullName.value) fullName.value = u.full_name || ''
    if (!email.value) email.value = u.email || ''
    if (!phone.value) phone.value = u.phone || ''
  },
  { immediate: true }
)

const schema = z.object({
  full_name: z.string().min(2, 'Nama peserta minimal 2 karakter'),
  email: z.string().email('Format email tidak valid'),
  phone: z.string().min(8, 'Nomor telepon minimal 8 digit')
})

const totalAmount = computed(() => {
  const price = Number(ticketType.value?.price) || 0
  return price * quantity.value
})

function getTicketQrValue(ticket) {
  return (
    ticket.qr_payload ||
    generateTicketQrPayload({
      ticketCode: ticket.ticket_code,
      eventId: ticket.event_id
    })
  )
}

async function handleDownloadQrPng(ticket) {
  try {
    await downloadTicketQrPng(ticket)
    toast.success(`QR Code tiket ${ticket.ticket_code} (.png) berhasil diunduh.`)
  } catch (err) {
    toast.error(err.message || 'Gagal mengunduh QR Code.')
  }
}

async function handleDownloadTicketPdf(ticket) {
  try {
    await store.downloadTicketQrPdf(ticket)
    toast.success(`PDF QR tiket ${ticket.ticket_code} berhasil diunduh.`)
  } catch (err) {
    toast.error(err.message || 'Gagal mengunduh PDF QR.')
  }
}

async function handleDownloadOrderPdf() {
  if (!completedOrder.value) return
  try {
    await store.downloadOrderQrPdf(
      completedOrder.value.orderId,
      completedOrder.value.orderNumber,
      completedOrder.value.emailNotification?.pdf_download_url
    )
    toast.success(`PDF semua QR (${completedOrder.value.orderNumber}) berhasil diunduh.`)
  } catch (err) {
    toast.error(err.message || 'Gagal mengunduh PDF QR.')
  }
}

async function copyCode(text) {
  try {
    await navigator.clipboard?.writeText(text)
    toast.success(`Kode "${text}" disalin ke clipboard.`)
  } catch {
    toast.error('Gagal menyalin kode.')
  }
}

async function confirmOrder() {
  errorMsg.value = ''
  if (!event.value || !ticketType.value) {
    errorMsg.value = 'Jenis tiket belum tersedia.'
    return
  }

  const parsed = schema.safeParse({
    full_name: fullName.value.trim(),
    email: email.value.trim(),
    phone: phone.value.trim()
  })
  if (!parsed.success) {
    errorMsg.value = parsed.error.issues[0].message
    return
  }

  submitting.value = true
  try {
    const registration_data = {}
    if (institution.value.trim()) registration_data.institution = institution.value.trim()
    if (memberId.value.trim()) registration_data.member_id = memberId.value.trim()

    const res = await store.placeOrder({
      eventId: event.value.id,
      ticketTypeId: ticketType.value.id,
      quantity: quantity.value,
      attendee: {
        ...parsed.data,
        ...(Object.keys(registration_data).length ? { registration_data } : {})
      }
    })
    completedOrder.value = res
    if (res.orderStatus === 'Pending') {
      toast.info(`Pesanan ${res.orderNumber} dibuat. Membuka pembayaran Midtrans...`)
      await launchMidtransPayment(res.payment)
    } else {
      toast.success(`Pesanan ${res.orderNumber} berhasil! QR Code & Email PDF siap digunakan.`)
    }
  } catch (err) {
    errorMsg.value = err?.message || 'Gagal memproses checkout tiket.'
  } finally {
    submitting.value = false
  }
}

async function syncCompletedOrderStatus({ silent = false, midtransOrderId = '', expectSettled = false } = {}) {
  if (!completedOrder.value?.orderId) return
  syncingPayment.value = true
  try {
    const maxAttempts = expectSettled ? 3 : 1
    let syncRes = null
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      if (attempt > 0) {
        await new Promise((r) => setTimeout(r, attempt === 1 ? 1500 : 2000))
      }
      syncRes = await store.syncOrderPaymentStatus(completedOrder.value.orderId, midtransOrderId)
      if (syncRes?.payment_state === 'settled' || syncRes?.order?.order_status === 'Confirmed') break
    }
    if (syncRes?.order) {
      completedOrder.value = {
        ...completedOrder.value,
        orderStatus: syncRes.order.order_status,
        paymentStatus: syncRes.order.payment_status,
        order: syncRes.order,
        tickets: syncRes.tickets?.length ? syncRes.tickets : completedOrder.value.tickets,
        emailStatus: syncRes.email_status || completedOrder.value.emailStatus,
        emailNotification: syncRes.email_status || completedOrder.value.emailNotification
      }
    }
    if (!silent) {
      if (syncRes?.payment_state === 'settled' || syncRes?.order?.order_status === 'Confirmed') {
        toast.success('Pembayaran terkonfirmasi! E-Tiket QR kini aktif dan dikirim ke email Anda.')
      } else {
        toast.info('Status pembayaran masih Pending. Selesaikan pembayaran di jendela Midtrans.')
      }
    }
  } catch (err) {
    if (!silent) toast.error(err?.message || 'Gagal memeriksa status pembayaran.')
  } finally {
    syncingPayment.value = false
  }
}

const isOrderCancelled = computed(() => {
  if (!completedOrder.value) return false
  return (
    completedOrder.value.orderStatus === 'Cancelled' ||
    ['Expired', 'Cancelled', 'Denied', 'Refunded'].includes(completedOrder.value.paymentStatus)
  )
})

async function resumeExistingPendingOrder(pendingOrd) {
  if (!pendingOrd?.id) return
  completedOrder.value = mapOrderSyncToCompleted(pendingOrd, [])
  await launchMidtransPayment()
}

async function handleCancelExistingOrder(orderId) {
  if (!orderId) return
  cancellingOrder.value = true
  try {
    await store.cancelMyOrder(orderId)
    await store.fetchEventPublic(route.params.eventSlug).catch(() => {})
    toast.success('Pesanan lama dibatalkan & kuota dikembalikan.')
  } catch (err) {
    toast.error(err?.message || 'Gagal membatalkan pesanan lama.')
  } finally {
    cancellingOrder.value = false
  }
}

async function handleCancelPendingOrder() {
  if (!completedOrder.value?.orderId) return
  cancellingOrder.value = true
  try {
    await store.cancelMyOrder(completedOrder.value.orderId)
    await store.fetchEventPublic(route.params.eventSlug).catch(() => {})
    completedOrder.value = null
    toast.success('Pesanan dibatalkan & kuota dikembalikan. Silakan pilih ulang tiket Anda.')
  } catch (err) {
    toast.error(err?.message || 'Gagal membatalkan pesanan.')
  } finally {
    cancellingOrder.value = false
  }
}

async function launchMidtransPayment(initialPayment = null, { forceNew = false } = {}) {
  if (!completedOrder.value?.orderId) return
  launchingSnap.value = true
  try {
    const session =
      !forceNew && initialPayment?.snap_token
        ? initialPayment
        : await store.createOrderSnapToken(completedOrder.value.orderId, { forceNew })
    if (session?.already_settled || session?.payment_state === 'settled') {
      if (session.order) {
        completedOrder.value = mapOrderSyncToCompleted(
          session.order,
          session.tickets || completedOrder.value.tickets,
          session.email_status || completedOrder.value.emailStatus
        )
      } else {
        await syncCompletedOrderStatus({ silent: true, expectSettled: true })
      }
      toast.success('Pembayaran terkonfirmasi! E-Tiket QR kini aktif dan dikirim ke email Anda.')
      return
    }
    if (!session?.snap_token) {
      toast.error(session?.snap_error || 'Token pembayaran Midtrans belum siap. Periksa konfigurasi MIDTRANS_SERVER_KEY & CLIENT_KEY.')
      return
    }
    const snapResult = await openMidtransSnap(session.snap_token, {
      clientKey: session.client_key,
      snapJsUrl: session.snap_js_url
    })
    if (snapResult.status === 'closed') {
      toast.info('Jendela pembayaran ditutup. Klik "Bayar Sekarang" untuk melanjutkan atau batalkan jika ingin mengubah pesanan.')
    }
    await syncCompletedOrderStatus({
      silent: snapResult.status === 'closed',
      midtransOrderId: snapResult?.result?.order_id || session.midtrans_order_id || '',
      expectSettled: snapResult.status === 'success'
    })
  } catch (err) {
    if (err?.code === 'PAYMENT_ALREADY_SETTLED') {
      await syncCompletedOrderStatus({ expectSettled: true })
      return
    }
    toast.error(err?.message || 'Gagal membuka pembayaran Midtrans.')
  } finally {
    launchingSnap.value = false
  }
}

let pendingPollTimer = null
let pendingPollTicks = 0

function stopPendingOrderPolling() {
  if (pendingPollTimer) {
    clearInterval(pendingPollTimer)
    pendingPollTimer = null
  }
  pendingPollTicks = 0
}

function handleCheckoutFocusOrVisible() {
  if (typeof document !== 'undefined' && document.hidden) return
  if (
    completedOrder.value?.orderId &&
    Number(completedOrder.value?.total || 0) > 0 &&
    !['Confirmed', 'Cancelled'].includes(completedOrder.value?.orderStatus) &&
    !['Paid', 'Verified', 'Not Required'].includes(completedOrder.value?.paymentStatus) &&
    !syncingPayment.value
  ) {
    syncCompletedOrderStatus({ silent: true })
  }
}

watch(
  () => [completedOrder.value?.orderId, completedOrder.value?.orderStatus, completedOrder.value?.paymentStatus],
  ([orderId, orderStatus, paymentStatus]) => {
    const needsSync =
      Boolean(orderId) &&
      Number(completedOrder.value?.total || 0) > 0 &&
      !['Confirmed', 'Cancelled'].includes(orderStatus) &&
      !['Paid', 'Verified', 'Not Required'].includes(paymentStatus)

    if (!needsSync) {
      stopPendingOrderPolling()
      return
    }
    if (pendingPollTimer) return
    pendingPollTicks = 0
    pendingPollTimer = setInterval(() => {
      pendingPollTicks += 1
      if (pendingPollTicks > 30) {
        stopPendingOrderPolling()
        return
      }
      if (!syncingPayment.value && !launchingSnap.value) {
        syncCompletedOrderStatus({ silent: true })
      }
    }, 4000)
  }
)

if (typeof window !== 'undefined') {
  window.addEventListener('focus', handleCheckoutFocusOrVisible)
  document.addEventListener('visibilitychange', handleCheckoutFocusOrVisible)
}

onBeforeUnmount(() => {
  stopPendingOrderPolling()
  if (typeof window !== 'undefined') {
    window.removeEventListener('focus', handleCheckoutFocusOrVisible)
    document.removeEventListener('visibilitychange', handleCheckoutFocusOrVisible)
  }
})
</script>

<template>
  <div v-if="loadingEvent && !event" class="mx-auto max-w-5xl px-4 sm:px-6 py-16 text-center space-y-3 min-h-[calc(100vh-14rem)]">
    <div class="mx-auto h-8 w-8 rounded-full border-2 border-black border-t-[#72a5e4] animate-spin" />
    <p class="text-xs font-semibold text-slate-600">Memuat detail event &amp; tiket...</p>
  </div>

  <div v-else-if="event" class="mx-auto max-w-5xl px-4 sm:px-6 py-10 space-y-6 min-h-[calc(100vh-14rem)]">
    <!-- Order Success, Pending, or Cancelled View -->
    <template v-if="completedOrder">
      <div
        v-reveal
        class="rounded-2xl border-2 border-black p-6 sm:p-8 shadow-[4px_4px_0px_#000] flex flex-col lg:flex-row lg:items-center justify-between gap-4"
        :class="
          isOrderCancelled
            ? 'bg-rose-100'
            : completedOrder.orderStatus === 'Pending'
              ? 'bg-amber-200'
              : 'bg-[#72a5e4]'
        "
      >
        <div class="space-y-1.5">
          <div class="inline-flex items-center gap-2 rounded-full border border-black bg-white px-3 py-1 text-[11px] font-bold text-black">
            <AlertCircle
              v-if="isOrderCancelled"
              class="h-3.5 w-3.5 text-rose-600"
            />
            <CheckCircle2
              v-else
              class="h-3.5 w-3.5"
              :class="completedOrder.orderStatus === 'Pending' ? 'text-amber-600' : 'text-emerald-600'"
            />
            {{
              isOrderCancelled
                ? 'PESANAN DIBATALKAN / KEDALUWARSA'
                : completedOrder.orderStatus === 'Pending'
                  ? 'MENUNGGU PEMBAYARAN MIDTRANS'
                  : 'PEMBELIAN BERHASIL • QR & EMAIL TERKIRIM'
            }}
          </div>
          <h1 class="text-2xl sm:text-3xl font-bold tracking-tight text-black font-sans">
            {{
              isOrderCancelled
                ? 'Pesanan Tiket Tidak Aktif'
                : completedOrder.orderStatus === 'Pending'
                  ? 'Selesaikan Pembayaran Instan via Midtrans'
                  : 'Tiket Digital & QR Code Siap Digunakan'
            }}
          </h1>
          <p class="text-xs text-slate-900">
            Order Ref: <span class="font-mono font-bold">{{ completedOrder.orderNumber }}</span>
            <span v-if="isOrderCancelled">
              • Status: {{ completedOrder.paymentStatus || completedOrder.orderStatus }} — Kuota tiket telah dikembalikan.
            </span>
            <span v-else-if="completedOrder.orderStatus === 'Pending'">
              • Total {{ formatCurrency(completedOrder.total) }} • Sinkronisasi status otomatis aktif
            </span>
            <span v-else-if="completedOrder.emailNotification?.recipient">
              • Email QR dikirim ke <strong>{{ completedOrder.emailNotification.recipient }}</strong>
            </span>
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-2 shrink-0">
          <button
            v-if="isOrderCancelled"
            type="button"
            @click="completedOrder = null"
            class="luxury-pill inline-flex items-center gap-1.5 rounded-full border border-black bg-black px-5 py-2.5 text-xs font-bold text-white cursor-pointer"
          >
            <span>Pesan Tiket Baru</span>
            <ArrowRight class="h-3.5 w-3.5" />
          </button>
          <button
            v-if="!isOrderCancelled && completedOrder.emailNotification?.preview_url"
            type="button"
            @click="showEmailPreview = true"
            class="luxury-pill inline-flex items-center gap-1.5 rounded-full border border-black bg-white px-4 py-2.5 text-xs font-bold text-black cursor-pointer"
          >
            <Mail class="h-3.5 w-3.5" />
            <span>Lihat Email QR</span>
          </button>
          <button
            v-if="!isOrderCancelled && completedOrder.orderId && completedOrder.orderStatus !== 'Pending'"
            type="button"
            @click="handleDownloadOrderPdf"
            class="luxury-pill inline-flex items-center gap-1.5 rounded-full border border-black bg-white px-4 py-2.5 text-xs font-bold text-black cursor-pointer"
          >
            <FileText class="h-3.5 w-3.5" />
            <span>Unduh PDF QR</span>
          </button>
          <RouterLink
            v-if="!isOrderCancelled && completedOrder.orderStatus !== 'Pending'"
            to="/my-tickets"
            class="luxury-pill inline-flex items-center justify-center gap-2 rounded-full border border-black bg-black px-5 py-2.5 text-xs font-bold text-white"
          >
            <span>Tiket Saya</span>
            <ArrowRight class="h-3.5 w-3.5" />
          </RouterLink>
          <RouterLink
            to="/profile"
            class="luxury-pill inline-flex items-center justify-center rounded-full border border-black bg-white px-4 py-2.5 text-xs font-semibold text-black"
          >
            Profil
          </RouterLink>
        </div>
      </div>

      <!-- Midtrans Instant Payment Card -->
      <div
        v-if="!isOrderCancelled && completedOrder.orderStatus === 'Pending'"
        class="rounded-2xl border-2 border-black bg-white p-6 space-y-4 shadow-[4px_4px_0px_#000]"
      >
        <div class="flex flex-wrap items-center justify-between gap-2 border-b border-black/15 pb-3">
          <div>
            <h2 class="text-base font-bold text-black">Pembayaran Otomatis Midtrans Snap</h2>
            <p class="text-xs text-slate-600">
              Pilih QRIS, Virtual Account (BCA / BNI / BRI / Mandiri), GoPay, ShopeePay, atau Kartu. QR Code tiket aktif otomatis setelah lunas.
            </p>
          </div>
          <span class="rounded-full border border-black bg-[#72a5e4] px-3 py-1 text-[11px] font-bold text-black">
            Midtrans Snap
          </span>
        </div>

        <div class="flex flex-wrap items-center gap-3 pt-1">
          <button
            type="button"
            @click="launchMidtransPayment()"
            :disabled="launchingSnap || cancellingOrder"
            class="shimmer-sheen luxury-pill inline-flex items-center gap-2 rounded-full border border-black bg-[#72a5e4] px-6 py-2.5 text-xs font-black text-black shadow-[3px_3px_0px_#000] cursor-pointer disabled:opacity-50"
          >
            <CreditCard class="h-4 w-4" />
            <span>{{ launchingSnap ? 'Membuka Midtrans Snap...' : 'Bayar Sekarang via Midtrans' }}</span>
          </button>

          <button
            type="button"
            @click="launchMidtransPayment(null, { forceNew: true })"
            :disabled="launchingSnap || cancellingOrder"
            class="luxury-pill inline-flex items-center gap-1.5 rounded-full border border-black bg-white px-5 py-2.5 text-xs font-bold text-black hover:bg-slate-100 cursor-pointer disabled:opacity-50"
          >
            <Repeat class="h-3.5 w-3.5" />
            <span>Ganti Metode Pembayaran</span>
          </button>

          <button
            type="button"
            @click="syncCompletedOrderStatus()"
            :disabled="syncingPayment || cancellingOrder"
            class="luxury-pill inline-flex items-center gap-1.5 rounded-full border border-black bg-white px-5 py-2.5 text-xs font-bold text-black hover:bg-slate-100 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw class="h-3.5 w-3.5" :class="syncingPayment ? 'animate-spin' : ''" />
            <span>{{ syncingPayment ? 'Memeriksa...' : 'Cek Status Pembayaran' }}</span>
          </button>

          <button
            type="button"
            @click="handleCancelPendingOrder"
            :disabled="cancellingOrder || launchingSnap"
            class="luxury-pill inline-flex items-center gap-1.5 rounded-full border border-rose-600 bg-rose-50 px-5 py-2.5 text-xs font-bold text-rose-700 hover:bg-rose-100 cursor-pointer disabled:opacity-50"
          >
            <Trash2 class="h-3.5 w-3.5" />
            <span>{{ cancellingOrder ? 'Membatalkan...' : 'Batalkan & Ubah Pesanan' }}</span>
          </button>
        </div>
      </div>

      <div
        v-if="!isOrderCancelled && completedOrder.orderStatus !== 'Pending' && completedOrder.tickets?.length"
        class="grid grid-cols-1 md:grid-cols-2 gap-6"
      >
        <div
          v-for="(tkt, idx) in completedOrder.tickets"
          :key="tkt.id"
          v-reveal="idx * 80"
          class="interactive-surface rounded-2xl border border-black bg-white p-6 flex flex-col sm:flex-row items-center gap-5 justify-between"
        >
          <div class="space-y-2 text-center sm:text-left">
            <span class="inline-block rounded-full border border-black bg-[#72a5e4] px-3 py-0.5 text-[10px] font-bold text-black">
              {{ tkt.status || 'Active' }}
            </span>
            <h2 class="text-base font-bold text-black">{{ tkt.event_title || event.title }}</h2>
            <p class="text-xs font-semibold text-slate-700">
              {{ tkt.ticket_type }} • {{ tkt.participant_name }}
            </p>
            <p class="text-[11px] font-mono font-bold text-slate-800">{{ tkt.ticket_code }}</p>

            <div class="pt-2 flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <button
                type="button"
                @click="handleDownloadTicketPdf(tkt)"
                class="luxury-pill inline-flex items-center gap-1.5 rounded-full border border-black bg-[#72a5e4] px-3.5 py-1.5 text-[11px] font-bold text-black cursor-pointer"
              >
                <FileText class="h-3.5 w-3.5" />
                PDF QR
              </button>
              <button
                type="button"
                @click="handleDownloadQrPng(tkt)"
                class="luxury-pill inline-flex items-center gap-1.5 rounded-full border border-black bg-black px-3.5 py-1.5 text-[11px] font-bold text-white cursor-pointer"
              >
                <Download class="h-3.5 w-3.5" />
                PNG
              </button>
              <button
                type="button"
                @click="copyCode(tkt.ticket_code)"
                class="luxury-pill inline-flex items-center gap-1.5 rounded-full border border-black bg-white px-3 py-1.5 text-[11px] font-semibold text-black cursor-pointer"
              >
                <Copy class="h-3 w-3" />
                Salin
              </button>
            </div>
          </div>

          <div class="shrink-0 p-2 rounded-xl border border-black/15 bg-white">
            <QrCodeCanvas :value="getTicketQrValue(tkt)" :src="tkt.qr_data_url" :size="140" />
          </div>
        </div>
      </div>

      <!-- Email Preview Modal -->
      <Transition name="modal-pop">
        <div
          v-if="showEmailPreview && completedOrder.emailNotification?.preview_url"
          @click.self="showEmailPreview = false"
          class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-2xs"
        >
          <div class="w-full max-w-2xl rounded-3xl border-2 border-black bg-white overflow-hidden shadow-[6px_6px_0px_#000] flex flex-col max-h-[88vh]">
            <div class="flex items-center justify-between px-6 py-4 border-b border-black bg-[#fafaf9]">
              <div class="min-w-0">
                <p class="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  PRATINJAU EMAIL TIKET ({{ completedOrder.emailNotification.mode }})
                </p>
                <p class="text-xs font-bold text-black truncate">
                  Kepada: {{ completedOrder.emailNotification.recipient }} — {{ completedOrder.emailNotification.subject }}
                </p>
              </div>
              <button
                type="button"
                @click="showEmailPreview = false"
                class="p-1.5 rounded-full border border-black bg-white hover:bg-slate-100 cursor-pointer shrink-0"
              >
                <X class="h-4 w-4" />
              </button>
            </div>
            <iframe
              :src="completedOrder.emailNotification.preview_url"
              title="Pratinjau Email QR Tiket"
              class="w-full flex-1 min-h-[480px] bg-[#fafaf9]"
            />
          </div>
        </div>
      </Transition>
    </template>

    <!-- Checkout Form View -->
    <template v-else>
      <div v-reveal class="space-y-1">
        <span class="text-[9px] font-bold uppercase tracking-widest text-slate-500 block">
          CHECKOUT
        </span>
        <h1 class="text-3xl font-bold tracking-tight text-black font-sans">
          Checkout &amp; Registrasi Peserta
        </h1>
      </div>

      <div
        v-if="existingPendingOrderForEvent"
        class="rounded-2xl border-2 border-black bg-amber-100 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-[3px_3px_0px_#000]"
      >
        <div class="space-y-1 text-xs">
          <p class="font-bold text-black">
            Anda memiliki pesanan belum dibayar untuk event ini (<span class="font-mono">{{ existingPendingOrderForEvent.order_number }}</span>)
          </p>
          <p class="text-slate-700">
            Total {{ formatCurrency(existingPendingOrderForEvent.total) }} ({{ existingPendingOrderForEvent.quantity }} tiket). Lanjutkan pembayaran atau batalkan agar kuota kembali tersedia.
          </p>
        </div>
        <div class="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            @click="resumeExistingPendingOrder(existingPendingOrderForEvent)"
            :disabled="launchingSnap || cancellingOrder"
            class="rounded-full border border-black bg-[#72a5e4] px-4 py-2 text-xs font-bold text-black hover:bg-[#5c93d9] cursor-pointer disabled:opacity-50"
          >
            Lanjutkan Pembayaran
          </button>
          <button
            type="button"
            @click="handleCancelExistingOrder(existingPendingOrderForEvent.id)"
            :disabled="cancellingOrder || launchingSnap"
            class="rounded-full border border-rose-600 bg-white px-4 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50 cursor-pointer disabled:opacity-50"
          >
            Batalkan Pesanan Lama
          </button>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        <!-- Left Column: Data Peserta -->
        <div v-reveal="60" class="md:col-span-7 rounded-xl border border-black bg-[#fafaf9] p-6 sm:p-7 space-y-5">
          <h2 class="text-lg font-bold text-black font-sans">Data Peserta &amp; Pilihan Tiket</h2>

          <form @submit.prevent="confirmOrder" class="space-y-4 text-xs">
            <div v-if="errorMsg" class="rounded-lg border border-rose-300 bg-rose-50 p-3 text-rose-700 font-medium">
              {{ errorMsg }}
            </div>

            <div v-if="event.ticket_types?.length" class="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div class="sm:col-span-2 space-y-1.5">
                <label class="font-bold text-black block">Pilih Jenis Tiket</label>
                <select
                  v-model="selectedTicketId"
                  class="w-full rounded-lg border border-black bg-white p-3 text-xs sm:text-sm text-black focus:outline-hidden"
                >
                  <option
                    v-for="tkt in event.ticket_types"
                    :key="tkt.id"
                    :value="tkt.id"
                    :disabled="tkt.status !== 'On Sale'"
                  >
                    {{ tkt.name }} — {{ tkt.price > 0 ? formatCurrency(tkt.price) : 'Gratis' }}
                    ({{ tkt.status === 'On Sale' ? `Sisa ${Math.max(0, tkt.quantity - tkt.sold_quantity)}` : tkt.status }})
                  </option>
                </select>
              </div>
              <div class="space-y-1.5">
                <label class="font-bold text-black block">Jumlah</label>
                <input
                  v-model.number="quantity"
                  type="number"
                  :min="minQty"
                  :max="maxQty"
                  class="w-full rounded-lg border border-black bg-white p-3 text-xs sm:text-sm text-black focus:outline-hidden"
                />
              </div>
            </div>

            <div class="space-y-1.5">
              <label class="font-bold text-black block">Nama Lengkap</label>
              <input
                v-model="fullName"
                type="text"
                required
                class="w-full rounded-lg border border-black bg-white p-3 text-xs sm:text-sm text-black focus:outline-hidden"
              />
            </div>

            <div class="space-y-1.5">
              <label class="font-bold text-black block">Email (Pengiriman QR &amp; PDF E-Ticket)</label>
              <input
                v-model="email"
                type="email"
                required
                class="w-full rounded-lg border border-black bg-white p-3 text-xs sm:text-sm text-black focus:outline-hidden"
              />
            </div>

            <div class="space-y-1.5">
              <label class="font-bold text-black block">Nomor WhatsApp / Telepon</label>
              <input
                v-model="phone"
                type="text"
                required
                placeholder="0812xxxxxxxx"
                class="w-full rounded-lg border border-black bg-white p-3 text-xs sm:text-sm text-black focus:outline-hidden"
              />
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div class="space-y-1.5">
                <label class="font-bold text-black block">Instansi / Fakultas (Opsional)</label>
                <input
                  v-model="institution"
                  type="text"
                  placeholder="Contoh: Fakultas Teknik / Umum"
                  class="w-full rounded-lg border border-black bg-white p-3 text-xs sm:text-sm text-black focus:outline-hidden"
                />
              </div>
              <div class="space-y-1.5">
                <label class="font-bold text-black block">NIM / ID Anggota (Opsional)</label>
                <input
                  v-model="memberId"
                  type="text"
                  placeholder="Contoh: 2023004001"
                  class="w-full rounded-lg border border-black bg-white p-3 text-xs sm:text-sm text-black focus:outline-hidden"
                />
              </div>
            </div>

            <div class="pt-2">
              <button
                type="submit"
                :disabled="submitting || isSoldOut"
                class="luxury-pill inline-flex items-center justify-center gap-1.5 w-full rounded-full bg-black py-3.5 text-xs font-bold text-white hover:bg-slate-800 disabled:opacity-50 cursor-pointer"
              >
                <span>
                  {{
                    submitting
                      ? 'Memproses Pesanan...'
                      : isSoldOut
                        ? 'Tiket Habis / Tidak Tersedia'
                        : totalAmount > 0
                          ? 'Lanjut ke Pembayaran Midtrans'
                          : 'Konfirmasi Pesanan & Kirim Email QR'
                  }}
                </span>
                <ArrowRight v-if="!submitting && !isSoldOut && totalAmount > 0" class="h-3.5 w-3.5" />
              </button>
            </div>
          </form>
        </div>

        <!-- Right Column: Solid Blue Ringkasan Pesanan -->
        <div v-reveal="120" class="md:col-span-5 rounded-xl border border-black bg-[#72a5e4] p-6 sm:p-7 space-y-4 text-black shadow-[4px_4px_0px_#000]">
          <h2 class="text-lg font-bold text-black font-sans">Ringkasan Pesanan</h2>

          <div class="space-y-1">
            <p class="text-base font-bold text-black leading-snug">{{ event.title }}</p>
            <p class="text-xs text-slate-900">{{ formatDateTime(event.start_at || event.start_date) }}</p>
          </div>

          <div class="py-3 border-y border-black/20 flex items-center justify-between text-xs">
            <span class="text-slate-900">{{ ticketType?.name || 'Tiket' }} × {{ quantity }}</span>
            <span class="font-bold text-black">
              {{ totalAmount > 0 ? formatCurrency(totalAmount) : 'Gratis' }}
            </span>
          </div>

          <div class="pt-1 flex items-center justify-between">
            <span class="text-sm font-bold text-black">Total</span>
            <span class="text-xl font-black text-black">
              {{ totalAmount > 0 ? formatCurrency(totalAmount) : 'Gratis' }}
            </span>
          </div>

          <div v-if="totalAmount > 0" class="pt-3 border-t border-black/20 space-y-1.5 text-[11px]">
            <p class="font-bold uppercase tracking-wider text-black">Pembayaran Instan Midtrans</p>
            <p class="text-slate-900 leading-relaxed">
              Mendukung QRIS, Virtual Account (BCA, BNI, BRI, Mandiri), GoPay, ShopeePay, dan Kartu Kredit/Debit dengan aktivasi QR otomatis.
            </p>
          </div>
        </div>
      </div>
    </template>
  </div>

  <div v-else class="mx-auto max-w-xl px-4 py-16 text-center space-y-4 min-h-[calc(100vh-14rem)]">
    <h1 class="text-2xl font-bold font-editorial text-black">Event Tidak Ditemukan</h1>
    <p class="text-xs text-slate-600">Event mungkin belum dipublikasikan atau tautan sudah berubah.</p>
    <RouterLink
      to="/events"
      class="luxury-pill inline-flex items-center gap-1.5 rounded-full border border-black bg-[#72a5e4] px-6 py-2.5 text-xs font-bold text-black"
    >
      <span>Kembali ke Marketplace</span>
      <ArrowRight class="h-3.5 w-3.5" />
    </RouterLink>
  </div>
</template>

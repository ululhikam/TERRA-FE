<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useEventWorkspaceStore } from '@/stores/eventWorkspace'
import { useToastStore } from '@/stores/toast'
import api from '@/services/api'
import { formatCurrency, formatDateTime } from '@/utils/formatters'
import { openMidtransSnap } from '@/utils/midtrans'
import {
  Crown,
  Receipt,
  CheckCircle2,
  Lock,
  CreditCard,
  RefreshCw,
  Repeat,
  ShieldCheck
} from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const store = useEventWorkspaceStore()
const toast = useToastStore()

const plan = ref({
  code: 'monthly_50k',
  name: 'TERRA Studio Subscribe',
  description:
    'Akses penuh seluruh fitur Event Organizer, 13 modul manajemen kepanitiaan, tiket QR otomatis, dan Live Gate Scanner tanpa batas jumlah event.',
  price_idr: 50000,
  duration_days: 30,
  features: [
    'Unlimited event aktif selama 30 hari masa langganan',
    'Seluruh 13 modul manajemen kepanitiaan terbuka penuh',
    'Penjualan tiket gratis & berbayar otomatis via Midtrans',
    'E-Ticket QR Code & PDF otomatis ke email peserta',
    'Fullscreen Live QR Gate Scanner & ekspor data peserta',
    'Manajemen Tim Panitia, Timeline WBS, Kanban & Keuangan RAB'
  ]
})

const history = ref({ transactions: [], bundle_credits: [], audit_logs: [] })
const loading = ref(true)
const subscribing = ref(false)
const payingTxId = ref('')
const switchingTxId = ref('')
const syncingTxId = ref('')

const isSubscribed = computed(() => Boolean(authStore.hasActiveSubscription))
const subscription = computed(() => authStore.user?.subscription || null)
const pendingInvoice = computed(() =>
  (history.value?.transactions || []).find((t) => t.status === 'Pending' && Number(t.final_amount_idr || 0) > 0) || null
)

async function loadAll() {
  loading.value = true
  try {
    const [catRes, histRes] = await Promise.all([
      api.get('/pricing/catalog').catch(() => null),
      store.fetchOrganizerBillingHistory().catch(() => null),
      authStore.fetchCurrentUser().catch(() => null)
    ])
    if (catRes?.data?.plans?.[0]) plan.value = catRes.data.plans[0]
    if (histRes) history.value = histRes
  } finally {
    loading.value = false
  }
}

onMounted(loadAll)

async function handleSubscribe() {
  subscribing.value = true
  try {
    const res = await store.subscribeOrganizerMonthly({ forceNew: false })
    const refreshed = await store.fetchOrganizerBillingHistory().catch(() => null)
    if (refreshed) history.value = refreshed

    if (res?.transaction?.status === 'Paid') {
      await authStore.fetchCurrentUser().catch(() => {})
      await store.fetchOrganizerWorkspace().catch(() => {})
      toast.success('Langganan Anda sudah aktif!')
      return
    }
    if (res?.transaction?.id) {
      await handlePayTx(res.transaction, { forceNew: false, initialPayment: res.payment })
    }
  } catch (err) {
    toast.error(err?.message || 'Gagal memulai pembayaran langganan Midtrans.')
  } finally {
    subscribing.value = false
  }
}

async function handlePayTx(tx, { forceNew = false, initialPayment = null } = {}) {
  if (!tx?.id) return
  if (forceNew) switchingTxId.value = tx.id
  else payingTxId.value = tx.id

  try {
    const session =
      !forceNew && initialPayment?.snap_token
        ? initialPayment
        : await store.createBillingSnapToken(tx.id, { forceNew })

    if (!session?.snap_token) {
      toast.error('Token pembayaran Midtrans belum tersedia.')
      return
    }

    const snapRes = await openMidtransSnap(session.snap_token, {
      clientKey: session.client_key,
      snapJsUrl: session.snap_js_url
    })
    await handleSyncTx(tx.id, { silent: snapRes.status === 'closed' })
  } catch (err) {
    toast.error(err?.message || 'Gagal membuka Midtrans Snap.')
  } finally {
    payingTxId.value = ''
    switchingTxId.value = ''
  }
}

async function handleSyncTx(txId, { silent = false } = {}) {
  syncingTxId.value = txId
  try {
    const wasLocked = !authStore.hasActiveSubscription
    const res = await store.syncBillingPaymentStatus(txId)
    const refreshed = await store.fetchOrganizerBillingHistory().catch(() => null)
    if (refreshed) history.value = refreshed

    if (res?.transaction?.status === 'Paid' || res?.subscription?.is_active) {
      await authStore.fetchCurrentUser().catch(() => {})
      await store.fetchOrganizerWorkspace().catch(() => {})
      toast.success('Pembayaran berhasil! Seluruh fitur Studio TERRA kini terbuka.')
      if (wasLocked && route.query.locked === '1') {
        router.replace('/dashboard')
      }
    } else if (!silent) {
      toast.info(`Status transaksi: ${res?.transaction?.status || 'Pending'}.`)
    }
  } catch (err) {
    if (!silent) toast.error(err?.message || 'Gagal memeriksa status transaksi.')
  } finally {
    syncingTxId.value = ''
  }
}
</script>

<template>
  <div class="space-y-6 min-h-[calc(100vh-6rem)]">
    <!-- Unsubscribed Lock Notice -->
    <div
      v-if="!isSubscribed"
      class="rounded-2xl border-2 border-black bg-amber-200 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-[4px_4px_0_#000]"
    >
      <div class="flex items-start gap-3">
        <span class="h-9 w-9 rounded-full border border-black bg-white flex items-center justify-center shrink-0">
          <Lock class="h-4 w-4 text-black" />
        </span>
        <div class="space-y-0.5">
          <h2 class="text-sm font-black text-black">Akun Organizer Belum Berlangganan</h2>
          <p class="text-xs text-slate-900">
            Seluruh fitur pembuatan event, organisasi, tiket, dan modul kepanitiaan terkunci. Aktifkan langganan <strong>{{ formatCurrency(plan.price_idr) }} / bulan</strong> melalui Midtrans untuk mulai menggunakan Studio.
          </p>
        </div>
      </div>
      <button
        type="button"
        @click="handleSubscribe"
        :disabled="subscribing || Boolean(payingTxId)"
        class="rounded-full border border-black bg-black px-5 py-2.5 text-xs font-bold text-white hover:bg-slate-800 shrink-0 cursor-pointer disabled:opacity-50"
      >
        {{ subscribing ? 'Membuka Midtrans...' : 'Aktifkan Sekarang (Rp 50rb)' }}
      </button>
    </div>

    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div class="space-y-1">
        <span class="text-[9px] font-bold uppercase tracking-widest text-slate-500 block">
          PRICING &amp; LANGGANAN STUDIO
        </span>
        <h1 class="text-3xl font-bold text-black font-sans">Pricing &amp; Langganan Bulanan</h1>
        <p class="text-xs text-slate-600">
          Harga &amp; paket yang sama persis dengan halaman Pricing publik: 1 paket all-access via Midtrans tanpa biaya tersembunyi.
        </p>
      </div>
      <span
        class="self-start sm:self-auto rounded-full border border-black px-4 py-1.5 text-xs font-bold text-black"
        :class="isSubscribed ? 'bg-emerald-200' : 'bg-amber-200'"
      >
        {{
          isSubscribed
            ? `Langganan Aktif (${subscription?.days_remaining || 30} hari tersisa)`
            : 'Status: Belum Berlangganan'
        }}
      </span>
    </div>

    <!-- Single Monthly Plan Card (Same as Public /pricing) -->
    <div class="rounded-3xl border-2 border-black bg-white shadow-[5px_5px_0_#000] overflow-hidden">
      <div class="bg-[#72a5e4] border-b-2 border-black px-6 py-3 flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-black">
        <span class="inline-flex items-center gap-1.5 uppercase tracking-wider">
          <Crown class="h-4 w-4" /> {{ plan.name }}
        </span>
        <span class="rounded-full border border-black bg-white px-3 py-0.5 text-[11px]">
          Midtrans Otomatis • Rp 50.000 / Bulan
        </span>
      </div>

      <div class="p-6 sm:p-8 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div class="lg:col-span-7 space-y-4">
          <div class="flex items-baseline gap-2">
            <span class="font-mono text-3xl sm:text-4xl font-black text-black">
              {{ formatCurrency(plan.price_idr) }}
            </span>
            <span class="text-xs sm:text-sm font-semibold text-slate-600">/ bulan (30 hari)</span>
          </div>
          <p class="text-xs text-slate-600 leading-relaxed">{{ plan.description }}</p>
          <ul class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-800 pt-1">
            <li v-for="(feat, i) in (plan.features || [])" :key="i" class="flex items-start gap-2">
              <CheckCircle2 class="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
              <span>{{ feat }}</span>
            </li>
          </ul>
        </div>

        <div class="lg:col-span-5 rounded-2xl border border-black bg-[#fafaf9] p-5 space-y-4">
          <div class="space-y-1 text-xs">
            <p class="font-bold text-black flex items-center gap-1.5">
              <ShieldCheck class="h-4 w-4 text-emerald-600" /> Pembayaran Resmi Midtrans Snap
            </p>
            <p class="text-[11px] text-slate-600">
              QRIS, Virtual Account (BCA, BNI, BRI, Mandiri, Permata), GoPay, ShopeePay, dan Kartu Kredit/Debit.
            </p>
            <p v-if="subscription?.expires_at" class="text-[11px] font-semibold text-emerald-800 pt-1">
              Masa aktif hingga: {{ formatDateTime(subscription.expires_at) }}
            </p>
          </div>

          <button
            type="button"
            @click="handleSubscribe"
            :disabled="subscribing || Boolean(payingTxId) || Boolean(switchingTxId)"
            class="w-full rounded-full border border-black bg-[#72a5e4] py-3 px-4 text-xs font-black text-black hover:bg-[#5c93d9] shadow-[3px_3px_0_#000] inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <CreditCard class="h-4 w-4" />
            <span>
              {{
                subscribing
                  ? 'Membuat Invoice...'
                  : isSubscribed
                    ? 'Perpanjang Langganan (+30 Hari) — Rp 50.000'
                    : 'Subscribe Sekarang via Midtrans — Rp 50.000'
              }}
            </span>
          </button>

          <!-- Pending Transaction Quick Controls including Instant Payment Method Switch -->
          <div v-if="pendingInvoice" class="rounded-xl border border-black bg-white p-3.5 space-y-2.5 text-xs">
            <div class="flex items-center justify-between">
              <span class="font-mono font-bold text-black">{{ pendingInvoice.invoice_number }}</span>
              <span class="rounded-full border border-black bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold">
                Pending
              </span>
            </div>
            <p class="text-[11px] text-slate-600">
              Sudah memilih metode pembayaran tapi ingin ganti ke channel lain? Klik <strong>Ganti Metode</strong> tanpa perlu menunggu kadaluarsa.
            </p>
            <div class="flex flex-wrap gap-2">
              <button
                type="button"
                @click="handlePayTx(pendingInvoice, { forceNew: false })"
                :disabled="payingTxId === pendingInvoice.id || switchingTxId === pendingInvoice.id"
                class="flex-1 rounded-full border border-black bg-black px-3 py-1.5 text-[11px] font-bold text-white hover:bg-slate-800 cursor-pointer disabled:opacity-50"
              >
                {{ payingTxId === pendingInvoice.id ? 'Membuka...' : 'Bayar' }}
              </button>
              <button
                type="button"
                @click="handlePayTx(pendingInvoice, { forceNew: true })"
                :disabled="payingTxId === pendingInvoice.id || switchingTxId === pendingInvoice.id"
                class="flex-1 inline-flex items-center justify-center gap-1 rounded-full border border-black bg-white px-3 py-1.5 text-[11px] font-bold text-black hover:bg-slate-100 cursor-pointer disabled:opacity-50"
              >
                <Repeat class="h-3 w-3" />
                <span>{{ switchingTxId === pendingInvoice.id ? 'Mereset...' : 'Ganti Metode' }}</span>
              </button>
              <button
                type="button"
                @click="handleSyncTx(pendingInvoice.id)"
                :disabled="syncingTxId === pendingInvoice.id"
                class="inline-flex items-center justify-center gap-1 rounded-full border border-black/30 bg-[#fafaf9] px-3 py-1.5 text-[11px] font-bold text-black hover:bg-slate-100 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw class="h-3 w-3" :class="syncingTxId === pendingInvoice.id ? 'animate-spin' : ''" />
                <span>Cek</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Transactions Table -->
    <div class="rounded-2xl border border-black bg-white overflow-hidden">
      <div class="border-b border-black px-6 py-4 bg-[#fafaf9] flex items-center gap-2">
        <Receipt class="h-4 w-4 text-black" />
        <h2 class="text-sm font-bold text-black">Riwayat Pembayaran Langganan ({{ history.transactions.length }})</h2>
      </div>
      <div class="overflow-x-auto">
        <table class="min-w-full text-left text-xs">
          <thead class="bg-[#72a5e4]/25 border-b border-black text-[10px] font-bold uppercase text-black">
            <tr>
              <th class="px-5 py-3">INVOICE</th>
              <th class="px-5 py-3">PAKET</th>
              <th class="px-5 py-3">NOMINAL</th>
              <th class="px-5 py-3">STATUS</th>
              <th class="px-5 py-3 text-right">AKSI MIDTRANS</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-black/10">
            <tr v-for="tx in history.transactions" :key="tx.id" class="hover:bg-[#fafaf9]">
              <td class="px-5 py-3 font-mono font-bold text-black">
                {{ tx.invoice_number }}
                <div class="text-[10px] font-sans font-normal text-slate-500">{{ formatDateTime(tx.created_at) }}</div>
              </td>
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
              <td class="px-5 py-3 text-right">
                <div class="inline-flex items-center justify-end gap-2">
                  <button
                    v-if="tx.status !== 'Paid' && Number(tx.final_amount_idr || 0) > 0"
                    type="button"
                    @click="handlePayTx(tx, { forceNew: false })"
                    :disabled="payingTxId === tx.id || switchingTxId === tx.id"
                    class="rounded-full border border-black bg-[#72a5e4] px-3 py-1 text-[11px] font-bold text-black hover:bg-[#5c93d9] inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    <CreditCard class="h-3 w-3" />
                    <span>{{ payingTxId === tx.id ? 'Membuka...' : 'Bayar' }}</span>
                  </button>
                  <button
                    v-if="tx.status !== 'Paid' && Number(tx.final_amount_idr || 0) > 0"
                    type="button"
                    @click="handlePayTx(tx, { forceNew: true })"
                    :disabled="payingTxId === tx.id || switchingTxId === tx.id"
                    class="rounded-full border border-black bg-white px-3 py-1 text-[11px] font-bold text-black hover:bg-slate-100 inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    <Repeat class="h-3 w-3" />
                    <span>{{ switchingTxId === tx.id ? 'Mereset...' : 'Ganti Metode' }}</span>
                  </button>
                  <button
                    v-if="tx.status !== 'Paid' && Number(tx.final_amount_idr || 0) > 0"
                    type="button"
                    @click="handleSyncTx(tx.id)"
                    :disabled="syncingTxId === tx.id"
                    class="rounded-full border border-black bg-white px-3 py-1 text-[11px] font-bold text-black hover:bg-slate-100 inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw class="h-3 w-3" :class="syncingTxId === tx.id ? 'animate-spin' : ''" />
                    <span>Cek</span>
                  </button>
                  <span v-else-if="tx.status === 'Paid'" class="text-[11px] font-bold text-emerald-700">Lunas ✓</span>
                </div>
              </td>
            </tr>
            <tr v-if="!loading && !history.transactions.length">
              <td colspan="5" class="px-5 py-6 text-center text-slate-500">Belum ada transaksi langganan.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

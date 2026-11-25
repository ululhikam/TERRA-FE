<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import api from '@/services/api'
import { useAuthStore } from '@/stores/auth'
import { useEventWorkspaceStore } from '@/stores/eventWorkspace'
import { useToastStore } from '@/stores/toast'
import { formatCurrency, formatDateTime } from '@/utils/formatters'
import { openMidtransSnap } from '@/utils/midtrans'
import { updatePageSeo, buildBreadcrumbJsonLd, SITE_URL } from '@/utils/seo'
import { CheckCircle2, Crown, CreditCard, RefreshCw, ShieldCheck, ArrowRight, Repeat } from 'lucide-vue-next'

const authStore = useAuthStore()
const workspace = useEventWorkspaceStore()
const toast = useToastStore()

const plan = ref({
  code: 'monthly_50k',
  name: 'TERRA Studio Subscribe',
  tagline: 'Langganan Bulanan All-Access 13 Modul',
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

const loading = ref(true)
const subscribing = ref(false)
const payingSnap = ref(false)
const switchingMethod = ref(false)
const syncingSnap = ref(false)
const activeInvoice = ref(null)

watch(
  plan,
  (p) => {
    const price = Number(p?.price_idr || 50000)
    updatePageSeo({
      title: 'Harga Langganan TERRA Studio Rp 50.000 / Bulan | TERRA',
      description:
        'Berlangganan TERRA Studio Rp 50.000 per bulan via Midtrans untuk akses penuh 13 modul manajemen event, ticketing QR otomatis, dan Live Gate Scanner.',
      path: '/pricing',
      jsonLd: [
        {
          '@context': 'https://schema.org',
          '@type': 'SoftwareApplication',
          name: 'TERRA Studio Subscribe',
          applicationCategory: 'BusinessApplication',
          operatingSystem: 'Web',
          url: `${SITE_URL}/pricing`,
          offers: {
            '@type': 'Offer',
            priceCurrency: 'IDR',
            price,
            availability: 'https://schema.org/InStock'
          }
        },
        buildBreadcrumbJsonLd([
          { name: 'Beranda', path: '/' },
          { name: 'Pricing & Langganan', path: '/pricing' }
        ])
      ]
    })
  },
  { immediate: true }
)

onMounted(async () => {
  loading.value = true
  try {
    const res = await api.get('/pricing/catalog')
    if (res?.data?.plans?.[0]) {
      plan.value = res.data.plans[0]
    }
    if (authStore.isOrganizer) {
      await authStore.fetchCurrentUser().catch(() => {})
      const hist = await workspace.fetchOrganizerBillingHistory().catch(() => null)
      const pendingTx = (hist?.transactions || []).find((t) => t.status === 'Pending')
      if (pendingTx) {
        activeInvoice.value = pendingTx
        await syncInvoiceStatus({ silent: true })
      }
    }
  } finally {
    loading.value = false
  }
})

const subscription = computed(() => authStore.user?.subscription || null)
const isSubscribed = computed(() => Boolean(authStore.hasActiveSubscription))

async function openSnapSession(tx, { forceNew = false, initialPayment = null } = {}) {
  if (!tx?.id) return
  if (forceNew) switchingMethod.value = true
  else payingSnap.value = true

  try {
    const session =
      !forceNew && initialPayment?.snap_token
        ? initialPayment
        : await workspace.createBillingSnapToken(tx.id, { forceNew })

    if (!session?.snap_token) {
      toast.error('Token pembayaran Midtrans belum tersedia.')
      return
    }

    const snapRes = await openMidtransSnap(session.snap_token, {
      clientKey: session.client_key,
      snapJsUrl: session.snap_js_url
    })
    await syncInvoiceStatus({
      silent: snapRes.status === 'closed',
      midtransOrderId: snapRes?.result?.order_id || session.midtrans_order_id || '',
      expectSettled: snapRes.status === 'success'
    })
  } catch (err) {
    toast.error(err?.message || 'Gagal membuka jendela Midtrans Snap.')
  } finally {
    payingSnap.value = false
    switchingMethod.value = false
  }
}

async function handleSubscribe() {
  if (!authStore.isOrganizer) return
  subscribing.value = true
  try {
    const res = await workspace.subscribeOrganizerMonthly({ forceNew: false })
    activeInvoice.value = res?.transaction || null
    if (res?.transaction?.status === 'Paid') {
      await authStore.fetchCurrentUser().catch(() => {})
      toast.success('Langganan TERRA Studio Anda sudah aktif!')
      return
    }
    if (res?.transaction?.id) {
      await openSnapSession(res.transaction, { initialPayment: res.payment })
    }
  } catch (err) {
    toast.error(err?.message || 'Gagal memproses langganan Midtrans.')
  } finally {
    subscribing.value = false
  }
}

async function syncInvoiceStatus({ silent = false, midtransOrderId = '', expectSettled = false } = {}) {
  if (!activeInvoice.value?.id) return
  syncingSnap.value = true
  try {
    const maxAttempts = expectSettled ? 3 : 1
    let res = null
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      if (attempt > 0) {
        await new Promise((r) => setTimeout(r, attempt === 1 ? 1500 : 2000))
      }
      res = await workspace.syncBillingPaymentStatus(activeInvoice.value.id, midtransOrderId)
      if (res?.transaction) activeInvoice.value = res.transaction
      if (res?.transaction?.status === 'Paid' || res?.subscription?.is_active) break
    }
    if (res?.transaction?.status === 'Paid' || res?.subscription?.is_active) {
      await authStore.fetchCurrentUser().catch(() => {})
      toast.success('Pembayaran berhasil! Seluruh fitur TERRA Studio kini aktif 30 hari.')
    } else if (!silent) {
      toast.info(`Status invoice: ${res?.transaction?.status || 'Pending'}.`)
    }
  } catch (err) {
    if (!silent) toast.error(err?.message || 'Gagal memeriksa status pembayaran.')
  } finally {
    syncingSnap.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-10 sm:py-14 space-y-8">
    <!-- Hero Header -->
    <div class="text-center max-w-2xl mx-auto space-y-3">
      <span class="inline-flex items-center gap-1.5 rounded-full border border-black bg-[#72a5e4] px-4 py-1 text-[11px] font-bold text-black">
        <Crown class="h-3.5 w-3.5" /> 1 PAKET ALL-ACCESS • TANPA BATAS EVENT
      </span>
      <h1 class="text-3xl sm:text-5xl font-extrabold tracking-tight text-black leading-tight">
        Satu harga simpel untuk semua fitur Studio
      </h1>
      <p class="text-xs sm:text-sm text-slate-600 leading-relaxed">
        Berlangganan <strong>{{ formatCurrency(plan.price_idr) }} / bulan</strong> via Midtrans untuk membuka seluruh 13 modul manajemen event, penjualan tiket QR otomatis, dan Live Gate Scanner.
      </p>
    </div>

    <div v-if="loading" class="py-12 text-center text-xs text-slate-500">
      Memuat informasi paket langganan TERRA...
    </div>

    <!-- Single Monthly Subscription Card -->
    <div
      v-else
      class="rounded-3xl border-2 border-black bg-white shadow-[6px_6px_0_#000] overflow-hidden"
    >
      <div class="bg-[#72a5e4] border-b-2 border-black px-6 sm:px-8 py-3.5 flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-black">
        <span class="inline-flex items-center gap-1.5 uppercase tracking-wider">
          <Crown class="h-4 w-4" /> {{ plan.name }}
        </span>
        <span class="rounded-full border border-black bg-white px-3 py-0.5 text-[11px]">
          Pembayaran Otomatis Midtrans
        </span>
      </div>

      <div class="p-6 sm:p-8 grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        <!-- Left Price & Features -->
        <div class="md:col-span-7 space-y-5">
          <div>
            <div class="flex items-baseline gap-2">
              <span class="font-mono text-4xl sm:text-5xl font-black tracking-tight text-black">
                {{ formatCurrency(plan.price_idr) }}
              </span>
              <span class="text-sm font-semibold text-slate-600">/ bulan (30 hari)</span>
            </div>
            <p class="text-xs sm:text-sm text-slate-600 mt-2 leading-relaxed">
              {{ plan.description }}
            </p>
          </div>

          <ul class="space-y-2.5 text-xs sm:text-sm text-slate-800 pt-1">
            <li v-for="(feat, i) in (plan.features || [])" :key="i" class="flex items-start gap-2.5">
              <CheckCircle2 class="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>{{ feat }}</span>
            </li>
          </ul>
        </div>

        <!-- Right Checkout / Subscribe Action Box -->
        <div class="md:col-span-5 rounded-2xl border-2 border-black bg-[#fafaf9] p-5 space-y-4">
          <div class="space-y-1">
            <span class="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
              Metode Pembayaran Resmi
            </span>
            <p class="text-sm font-extrabold text-black flex items-center gap-1.5">
              <ShieldCheck class="h-4 w-4 text-emerald-600" /> Midtrans Payment Gateway
            </p>
            <p class="text-[11px] text-slate-600 leading-relaxed">
              QRIS, Virtual Account (BCA, BNI, BRI, Mandiri, Permata), GoPay, ShopeePay, atau Kartu. Fitur langsung aktif otomatis tanpa hubungi admin.
            </p>
          </div>

          <!-- Logged in as Organizer -->
          <template v-if="authStore.isOrganizer">
            <div
              class="rounded-xl border border-black px-3.5 py-2.5 text-xs"
              :class="isSubscribed ? 'bg-emerald-100 text-emerald-950' : 'bg-amber-100 text-amber-950'"
            >
              <p class="font-bold">
                {{ isSubscribed ? 'Status: Langganan Aktif' : 'Status: Belum Berlangganan' }}
              </p>
              <p v-if="isSubscribed && subscription?.expires_at" class="text-[11px] mt-0.5">
                Berlaku hingga {{ formatDateTime(subscription.expires_at) }} ({{ subscription.days_remaining }} hari tersisa)
              </p>
              <p v-else class="text-[11px] mt-0.5">
                Aktifkan langganan untuk membuka seluruh fitur Studio.
              </p>
            </div>

            <button
              type="button"
              @click="handleSubscribe"
              :disabled="subscribing || payingSnap || switchingMethod"
              class="w-full rounded-full border border-black bg-[#72a5e4] py-3 px-4 text-xs sm:text-sm font-black text-black hover:bg-[#5c93d9] shadow-[3px_3px_0_#000] transition-colors inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <CreditCard class="h-4 w-4" />
              <span>
                {{
                  subscribing || payingSnap
                    ? 'Membuka Midtrans Snap...'
                    : isSubscribed
                      ? 'Perpanjang +30 Hari — Rp 50.000'
                      : 'Berlangganan Sekarang — Rp 50.000'
                }}
              </span>
            </button>

            <!-- Active Pending Invoice Actions + Instant Payment Method Switch -->
            <div
              v-if="activeInvoice && activeInvoice.status !== 'Paid'"
              class="rounded-xl border border-black bg-white p-3.5 space-y-2.5 text-xs"
            >
              <div class="flex items-center justify-between">
                <span class="font-mono font-bold text-black">{{ activeInvoice.invoice_number }}</span>
                <span class="rounded-full border border-black bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold">
                  {{ activeInvoice.status }}
                </span>
              </div>
              <div class="grid grid-cols-1 gap-2">
                <button
                  type="button"
                  @click="openSnapSession(activeInvoice, { forceNew: false })"
                  :disabled="payingSnap || switchingMethod"
                  class="w-full rounded-full border border-black bg-black py-2 text-[11px] font-bold text-white hover:bg-slate-800 cursor-pointer disabled:opacity-50"
                >
                  {{ payingSnap ? 'Membuka...' : 'Lanjutkan Pembayaran' }}
                </button>
                <button
                  type="button"
                  @click="openSnapSession(activeInvoice, { forceNew: true })"
                  :disabled="payingSnap || switchingMethod"
                  class="w-full inline-flex items-center justify-center gap-1.5 rounded-full border border-black bg-white py-2 text-[11px] font-bold text-black hover:bg-slate-100 cursor-pointer disabled:opacity-50"
                >
                  <Repeat class="h-3.5 w-3.5" />
                  <span>{{ switchingMethod ? 'Mereset Metode...' : 'Ganti Metode Pembayaran' }}</span>
                </button>
                <button
                  type="button"
                  @click="syncInvoiceStatus()"
                  :disabled="syncingSnap"
                  class="w-full inline-flex items-center justify-center gap-1.5 rounded-full border border-black/30 bg-[#fafaf9] py-1.5 text-[11px] font-semibold text-black hover:bg-slate-100 cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw class="h-3 w-3" :class="syncingSnap ? 'animate-spin' : ''" />
                  <span>{{ syncingSnap ? 'Memeriksa...' : 'Cek Status Pembayaran' }}</span>
                </button>
              </div>
            </div>
          </template>

          <!-- Guest or Customer -->
          <template v-else>
            <div class="space-y-2.5">
              <RouterLink
                to="/organizer/register"
                class="w-full rounded-full border border-black bg-[#72a5e4] py-3 px-4 text-xs sm:text-sm font-black text-black hover:bg-[#5c93d9] shadow-[3px_3px_0_#000] transition-colors inline-flex items-center justify-center gap-2"
              >
                <span>Daftar &amp; Subscribe (Rp 50rb/bln)</span>
                <ArrowRight class="h-4 w-4" />
              </RouterLink>
              <RouterLink
                to="/organizer/login"
                class="w-full rounded-full border border-black bg-white py-2.5 px-4 text-xs font-bold text-black hover:bg-slate-100 transition-colors inline-flex items-center justify-center"
              >
                Masuk Organizer (Google / Email)
              </RouterLink>
            </div>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

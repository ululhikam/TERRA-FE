<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useEventWorkspaceStore } from '@/stores/eventWorkspace'
import { useToastStore } from '@/stores/toast'
import { formatCurrency, formatDateTime } from '@/utils/formatters'
import { openMidtransSnap } from '@/utils/midtrans'
import {
  Sparkles,
  Crown,
  AlertTriangle,
  ArrowDownCircle,
  Layers,
  CreditCard,
  RefreshCw
} from 'lucide-vue-next'

const route = useRoute()
const authStore = useAuthStore()
const store = useEventWorkspaceStore()
const toast = useToastStore()

const eventId = computed(() => route.params.eventId || store.activeEvent?.id || 'evt-1')
const event = computed(() => store.events.find((e) => e.id === eventId.value) || store.activeEvent)

const catalog = ref({ plans: [], bundles: [], promos: [], admin_whatsapp: '6287897192601', manual_payment_instructions: {} })
const entitlement = ref(null)
const history = ref({ transactions: [], bundle_credits: [], audit_logs: [] })
const loading = ref(true)

const selectedPlanCode = ref('pro')
const selectedBundleId = ref('')
const promoCode = ref('')
const useEarlyAccess = ref(false)
const isCommunity = ref(false)
const communityOrgProof = ref('')
const paymentMethod = ref('payment_gateway')
const preview = ref(null)
const checkingOut = ref(false)
const activatingTrial = ref(false)
const downgrading = ref(false)
const payingTxId = ref('')
const syncingTxId = ref('')
const activeInvoice = ref(null)

async function loadBillingData() {
  loading.value = true
  try {
    const [cat, ent, hist] = await Promise.all([
      store.fetchPricingCatalog(),
      store.fetchEventEntitlement(eventId.value),
      store.fetchOrganizerBillingHistory()
    ])
    if (cat) catalog.value = cat
    if (ent) entitlement.value = ent
    if (hist) history.value = hist
    if (ent?.plan_code === 'free') selectedPlanCode.value = 'starter'
    else if (ent?.plan_code === 'starter') selectedPlanCode.value = 'pro'
    else selectedPlanCode.value = 'ultimate'
  } catch (err) {
    toast.error(err?.message || 'Gagal memuat informasi billing event.')
  } finally {
    loading.value = false
  }
}

onMounted(loadBillingData)
watch(() => eventId.value, loadBillingData)

async function refreshPreview() {
  if (!event.value) return
  try {
    preview.value = await store.previewBillingCheckout({
      plan_code: selectedPlanCode.value,
      bundle_id: selectedBundleId.value || null,
      event_id: selectedBundleId.value ? null : eventId.value,
      promo_code: promoCode.value.trim(),
      use_early_access: useEarlyAccess.value,
      is_community: isCommunity.value
    })
  } catch (err) {
    toast.error(err?.message || 'Kode promo tidak valid.')
  }
}

watch(
  [selectedPlanCode, selectedBundleId, useEarlyAccess, isCommunity, () => eventId.value],
  refreshPreview,
  { immediate: true }
)

async function handleActivateTrial() {
  activatingTrial.value = true
  try {
    entitlement.value = await store.activateEventTrial(eventId.value)
    await store.fetchEventWorkspace(eventId.value)
    history.value = await store.fetchOrganizerBillingHistory()
    toast.success('14 Days Pro Access aktif! Seluruh 13 modul kini terbuka.')
  } catch (err) {
    toast.error(err?.message || 'Gagal mengaktifkan trial.')
  } finally {
    activatingTrial.value = false
  }
}

async function handleCheckout() {
  if (!event.value) return
  checkingOut.value = true
  try {
    const res = await store.createBillingCheckout({
      organization_id: event.value.organization_id,
      event_id: selectedBundleId.value ? null : eventId.value,
      plan_code: selectedPlanCode.value,
      bundle_id: selectedBundleId.value || null,
      promo_code: promoCode.value.trim(),
      use_early_access: useEarlyAccess.value,
      is_community: isCommunity.value,
      community_org_proof: communityOrgProof.value.trim(),
      payment_method: 'payment_gateway'
    })
    activeInvoice.value = res?.transaction || null
    history.value = await store.fetchOrganizerBillingHistory()
    if (res?.transaction?.status === 'Paid') {
      entitlement.value = await store.fetchEventEntitlement(eventId.value)
      await store.fetchEventWorkspace(eventId.value)
      toast.success('Paket langsung aktif!')
    } else if (res?.transaction?.id) {
      toast.info(`Invoice ${res.transaction.invoice_number} dibuat. Membuka Midtrans Snap...`)
      await handlePayTransaction(res.transaction, res.payment)
    }
  } catch (err) {
    toast.error(err?.message || 'Gagal membuat transaksi billing.')
  } finally {
    checkingOut.value = false
  }
}

async function handlePayTransaction(tx, initialPayment = null) {
  payingTxId.value = tx.id
  try {
    const session = initialPayment?.snap_token
      ? initialPayment
      : await store.createBillingSnapToken(tx.id)
    if (!session?.snap_token) {
      toast.error('Token pembayaran Midtrans belum tersedia. Pastikan API key Midtrans aktif di server.')
      return
    }
    const snapRes = await openMidtransSnap(session.snap_token, {
      clientKey: session.client_key,
      snapJsUrl: session.snap_js_url
    })
    await handleSyncTransaction(tx.id, { silent: snapRes.status === 'closed' })
  } catch (err) {
    toast.error(err?.message || 'Gagal membuka jendela pembayaran Midtrans.')
  } finally {
    payingTxId.value = ''
  }
}

async function handleSyncTransaction(txId, { silent = false } = {}) {
  syncingTxId.value = txId
  try {
    const syncRes = await store.syncBillingPaymentStatus(txId)
    history.value = await store.fetchOrganizerBillingHistory()
    if (syncRes?.transaction?.status === 'Paid') {
      entitlement.value = await store.fetchEventEntitlement(eventId.value)
      await store.fetchEventWorkspace(eventId.value)
      if (!silent) toast.success('Pembayaran lunas! Paket event & modul telah aktif otomatis.')
    } else if (!silent) {
      toast.info(`Status invoice: ${syncRes?.transaction?.status || 'Pending'}.`)
    }
  } catch (err) {
    if (!silent) toast.error(err?.message || 'Gagal memeriksa status transaksi.')
  } finally {
    syncingTxId.value = ''
  }
}

async function handleApplyBundleCredit(creditId) {
  try {
    entitlement.value = await store.applyBundleCreditToEvent(eventId.value, creditId)
    await store.fetchEventWorkspace(eventId.value)
    history.value = await store.fetchOrganizerBillingHistory()
    toast.success('Kuota bundle berhasil diterapkan pada event ini!')
  } catch (err) {
    toast.error(err?.message || 'Gagal menerapkan kuota bundle.')
  }
}

async function handleDowngrade(targetCode) {
  downgrading.value = true
  try {
    entitlement.value = await store.downgradeEventPlan(eventId.value, targetCode)
    await store.fetchEventWorkspace(eventId.value)
    history.value = await store.fetchOrganizerBillingHistory()
    toast.success(`Paket event diturunkan ke ${targetCode.toUpperCase()}. Data tetap tersimpan.`)
  } catch (err) {
    toast.error(err?.message || 'Downgrade belum dapat diproses karena penggunaan melebihi batas kuota.')
  } finally {
    downgrading.value = false
  }
}
</script>

<template>
  <div v-if="event" class="space-y-6 min-h-[calc(100vh-6rem)]">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div class="space-y-1">
        <span class="text-[9px] font-bold uppercase tracking-widest text-slate-500 block">
          EVENT ENTITLEMENT &amp; PRICING
        </span>
        <h1 class="text-3xl font-bold text-black font-sans">Paket, Kuota &amp; Billing Event</h1>
        <p class="text-xs text-slate-600">
          Pembayaran berlaku per event. Paket aktif menentukan batas peserta, panitia, dan akses modul pada <strong>{{ event.title }}</strong>.
        </p>
      </div>

      <button
        v-if="entitlement?.trial?.eligible"
        type="button"
        @click="handleActivateTrial"
        :disabled="activatingTrial"
        class="inline-flex items-center gap-2 rounded-full border-2 border-black bg-[#72a5e4] px-5 py-2.5 text-xs font-bold text-black hover:bg-[#5c93d9] cursor-pointer disabled:opacity-50 shrink-0 shadow-[3px_3px_0_#000]"
      >
        <Sparkles class="h-4 w-4" />
        <span>{{ activatingTrial ? 'Mengaktifkan...' : 'Aktifkan 14 Days Pro Access (Gratis)' }}</span>
      </button>
    </div>

    <!-- Trial Warning Banner if <= 3 days -->
    <div
      v-if="entitlement?.trial?.warning"
      class="rounded-2xl border-2 border-black bg-amber-100 p-4 flex items-center gap-3 text-xs text-amber-950"
    >
      <AlertTriangle class="h-5 w-5 shrink-0" />
      <p class="font-bold">{{ entitlement.trial.warning }}</p>
    </div>

    <!-- Current Entitlement & Usage Cards -->
    <div v-if="entitlement" class="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div class="rounded-2xl border-2 border-black bg-[#72a5e4] p-5 space-y-2">
        <span class="text-[10px] font-bold uppercase tracking-wider text-black">PAKET EVENT SAAT INI</span>
        <div class="flex items-center gap-2">
          <Crown class="h-5 w-5 text-black" />
          <span class="text-2xl font-black text-black">{{ entitlement.plan_name }}</span>
        </div>
        <p class="text-[11px] font-semibold text-black">
          Status: {{ entitlement.trial?.is_trial ? `Trial (${entitlement.trial.days_remaining} hari tersisa)` : entitlement.subscription?.status }}
        </p>
      </div>

      <div class="rounded-2xl border border-black bg-white p-5 space-y-2">
        <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400">KUOTA PESERTA</span>
        <p class="text-2xl font-black text-black">
          {{ entitlement.usage.participants_count }} / {{ entitlement.limits.max_participants }}
        </p>
        <div class="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
          <div
            class="h-full bg-[#72a5e4]"
            :style="{ width: `${Math.min(100, Math.round((entitlement.usage.participants_count / Math.max(1, entitlement.limits.max_participants)) * 100))}%` }"
          />
        </div>
      </div>

      <div class="rounded-2xl border border-black bg-white p-5 space-y-2">
        <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400">TIM &amp; PANITIA</span>
        <p class="text-2xl font-black text-black">
          {{ entitlement.usage.team_members_count }} / {{ entitlement.limits.max_team_members }}
        </p>
        <p class="text-[11px] text-slate-500">Anggota aktif &amp; undangan</p>
      </div>

      <div class="rounded-2xl border border-black bg-white p-5 space-y-2">
        <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400">AKSES MODUL</span>
        <p class="text-2xl font-black text-black">{{ entitlement.allowed_modules.length }} / 13</p>
        <p class="text-[11px] text-slate-500">Penyimpanan: {{ entitlement.usage.storage_used_mb }} / {{ entitlement.limits.max_storage_mb }} MB</p>
      </div>
    </div>

    <!-- Available Bundle Credits for Organization -->
    <div
      v-if="history.bundle_credits.some(c => c.remaining_credits > 0)"
      class="rounded-2xl border-2 border-black bg-[#72a5e4]/20 p-5 space-y-3"
    >
      <div class="flex items-center gap-2">
        <Layers class="h-4 w-4 text-black" />
        <h3 class="text-sm font-bold text-black">Kuota Multi-Event Bundle Tersedia</h3>
      </div>
      <div class="flex flex-wrap gap-3">
        <div
          v-for="crd in history.bundle_credits.filter(c => c.remaining_credits > 0)"
          :key="crd.id"
          class="rounded-xl border border-black bg-white px-4 py-3 flex items-center gap-4 text-xs"
        >
          <div>
            <p class="font-bold text-black">{{ crd.bundle_name }}</p>
            <p class="text-[11px] text-slate-500">Sisa {{ crd.remaining_credits }} dari {{ crd.total_credits }} event</p>
          </div>
          <button
            type="button"
            @click="handleApplyBundleCredit(crd.id)"
            class="rounded-full border border-black bg-[#72a5e4] px-4 py-1.5 text-[11px] font-bold text-black hover:bg-[#5c93d9] cursor-pointer"
          >
            Pakai 1 Kredit
          </button>
        </div>
      </div>
    </div>

    <!-- Upgrade / Order Form + Live Transparent Calculator -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      <div class="lg:col-span-7 rounded-2xl border-2 border-black bg-white p-6 space-y-5">
        <h2 class="text-lg font-bold text-black">Pilih / Upgrade Paket Event atau Beli Bundle</h2>

        <!-- Single Event Plan Pills -->
        <div class="space-y-2">
          <label class="text-xs font-bold text-black block">Paket Per Event</label>
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <button
              v-for="p in catalog.plans"
              :key="p.code"
              type="button"
              @click="selectedPlanCode = p.code; selectedBundleId = ''"
              class="rounded-xl border border-black p-3 text-left transition-colors cursor-pointer"
              :class="!selectedBundleId && selectedPlanCode === p.code ? 'bg-[#72a5e4] text-black font-bold' : 'bg-[#fafaf9] hover:bg-white'"
            >
              <div class="text-xs font-black">{{ p.name }}</div>
              <div class="text-[11px] mt-0.5">{{ p.price_idr === 0 ? 'Rp0' : formatCurrency(p.price_idr) }}</div>
              <div class="text-[10px] text-slate-600 mt-1">{{ p.max_participants }} peserta</div>
            </button>
          </div>
        </div>

        <!-- Bundle Packages Option -->
        <div class="space-y-2 pt-2 border-t border-black/10">
          <label class="text-xs font-bold text-black block">Atau Beli Multi-Event Bundle Hemat</label>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <button
              v-for="b in catalog.bundles"
              :key="b.id"
              type="button"
              @click="selectedBundleId = selectedBundleId === b.id ? '' : b.id"
              class="rounded-xl border border-black p-3 text-left transition-colors cursor-pointer"
              :class="selectedBundleId === b.id ? 'bg-[#72a5e4] text-black' : 'bg-[#fafaf9] hover:bg-white'"
            >
              <div class="flex items-center justify-between text-xs font-bold">
                <span>{{ b.name }}</span>
                <span>{{ formatCurrency(b.bundle_price_idr) }}</span>
              </div>
              <p class="text-[10px] text-slate-600 mt-1">{{ b.description }}</p>
            </button>
          </div>
        </div>

        <!-- Promo & Discount Controls -->
        <div class="space-y-3 pt-2 border-t border-black/10 text-xs">
          <div class="flex flex-wrap gap-4">
            <label class="inline-flex items-center gap-2 font-semibold text-black cursor-pointer">
              <input v-model="useEarlyAccess" type="checkbox" class="rounded border-black" />
              <span>Gunakan Harga Early Access</span>
            </label>
            <label class="inline-flex items-center gap-2 font-semibold text-black cursor-pointer">
              <input v-model="isCommunity" type="checkbox" class="rounded border-black" />
              <span>Diskon BEM / UKM / Komunitas</span>
            </label>
          </div>

          <div v-if="isCommunity" class="space-y-1">
            <label class="font-bold text-black block">Nama Organisasi / Kampus / Komunitas (Verifikasi)</label>
            <input
              v-model="communityOrgProof"
              type="text"
              placeholder="Contoh: BEM Fakultas Ilmu Komputer Universitas Indonesia"
              class="w-full rounded-xl border border-black bg-[#fafaf9] p-2.5 text-xs text-black"
            />
          </div>

          <div class="flex gap-2">
            <input
              v-model="promoCode"
              type="text"
              placeholder="Kode Promo (misal: EARLY100 atau BEMUKM25)"
              class="flex-1 rounded-xl border border-black bg-[#fafaf9] px-3 py-2 text-xs text-black uppercase"
            />
            <button
              type="button"
              @click="refreshPreview"
              class="rounded-xl border border-black bg-white px-4 py-2 text-xs font-bold hover:bg-slate-100 cursor-pointer"
            >
              Terapkan Promo
            </button>
          </div>

          <div class="space-y-1.5">
            <label class="font-bold text-black block">Metode Pembayaran Otomatis</label>
            <div class="rounded-xl border-2 border-black bg-[#72a5e4]/25 p-3.5 text-left space-y-1">
              <div class="flex items-center justify-between text-xs font-black text-black">
                <span class="inline-flex items-center gap-1.5"><CreditCard class="h-4 w-4" /> Midtrans Snap Payment Gateway</span>
                <span class="rounded-full border border-black bg-[#72a5e4] px-2.5 py-0.5 text-[10px] font-bold text-black">Instan</span>
              </div>
              <p class="text-[11px] text-slate-700">
                QRIS, Virtual Account (BCA, BNI, BRI, Mandiri), GoPay, ShopeePay &amp; Kartu. Paket event aktif otomatis setelah pembayaran sukses.
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- Transparent Price Summary & Checkout -->
      <div class="lg:col-span-5 rounded-2xl border-2 border-black bg-[#fafaf9] p-6 space-y-4">
        <h3 class="text-base font-bold text-black">Ringkasan Tagihan Transparan</h3>

        <div v-if="preview" class="space-y-2.5 text-xs">
          <div class="flex justify-between">
            <span class="text-slate-600">Paket Dipilih</span>
            <span class="font-bold text-black">{{ preview.plan_name }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-slate-600">Harga Dasar</span>
            <span class="font-semibold text-black">{{ formatCurrency(preview.base_price_idr) }}</span>
          </div>
          <div v-if="preview.discount_idr > 0" class="flex justify-between text-emerald-700 font-semibold">
            <span>Diskon {{ preview.applied_promo?.code || 'Early Access' }}</span>
            <span>-{{ formatCurrency(preview.discount_idr) }}</span>
          </div>
          <div v-if="preview.upgrade_credit_idr > 0" class="flex justify-between text-blue-700 font-semibold">
            <span>Kredit Upgrade Paket Sebelumnya</span>
            <span>-{{ formatCurrency(preview.upgrade_credit_idr) }}</span>
          </div>
          <div class="pt-3 border-t border-black/15 flex justify-between text-base font-black text-black">
            <span>Total Dibayar</span>
            <span>{{ formatCurrency(preview.final_amount_idr) }}</span>
          </div>
          <p class="text-[10px] text-slate-500">
            Tanpa biaya tersembunyi • Tanpa auto-renewal • Snapshot fitur &amp; kuota terkunci saat pembelian.
          </p>
        </div>

        <button
          type="button"
          @click="handleCheckout"
          :disabled="checkingOut"
          class="w-full rounded-full bg-black py-3 text-xs font-bold text-white hover:bg-slate-800 cursor-pointer disabled:opacity-50"
        >
          {{
            checkingOut
              ? 'Menyiapkan Pembayaran...'
              : preview?.final_amount_idr === 0
                ? 'Aktifkan Paket Sekarang →'
                : 'Bayar via Midtrans Snap →'
          }}
        </button>

        <!-- Explicit Downgrade Section -->
        <div v-if="entitlement && entitlement.plan_code !== 'free'" class="pt-3 border-t border-black/15 space-y-2">
          <p class="text-[11px] font-bold text-slate-600">Ingin beralih ke paket lebih rendah?</p>
          <button
            type="button"
            @click="handleDowngrade('free')"
            :disabled="downgrading"
            class="w-full rounded-full border border-black bg-white py-2 text-[11px] font-bold text-black hover:bg-slate-100 inline-flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <ArrowDownCircle class="h-3.5 w-3.5" />
            <span>{{ downgrading ? 'Memproses...' : 'Downgrade ke FREE (Data Tetap Aman)' }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Transactions Table with Proof Upload & WA Admin Link -->
    <div class="rounded-2xl border border-black bg-white overflow-hidden">
      <div class="border-b border-black px-6 py-4 bg-[#fafaf9]">
        <h3 class="text-sm font-bold text-black">Riwayat Transaksi &amp; Invoice ({{ history.transactions.length }})</h3>
      </div>
      <div class="overflow-x-auto">
        <table class="min-w-full text-left text-xs">
          <thead class="bg-[#72a5e4]/25 border-b border-black text-[10px] font-bold uppercase text-black">
            <tr>
              <th class="px-5 py-3">INVOICE</th>
              <th class="px-5 py-3">PAKET</th>
              <th class="px-5 py-3">NOMINAL</th>
              <th class="px-5 py-3">STATUS</th>
              <th class="px-5 py-3 text-right">AKSI PEMBAYARAN</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-black/10">
            <tr v-for="tx in history.transactions" :key="tx.id" class="hover:bg-[#fafaf9]">
              <td class="px-5 py-3.5 font-mono font-bold text-black">
                {{ tx.invoice_number }}
                <div class="text-[10px] font-sans font-normal text-slate-500">{{ formatDateTime(tx.created_at) }}</div>
              </td>
              <td class="px-5 py-3.5 font-semibold text-black">{{ tx.plan_name }}</td>
              <td class="px-5 py-3.5 font-bold text-black">{{ formatCurrency(tx.final_amount_idr) }}</td>
              <td class="px-5 py-3.5">
                <span
                  class="rounded-full border border-black px-2.5 py-0.5 text-[10px] font-bold"
                  :class="tx.status === 'Paid' ? 'bg-[#72a5e4] text-black' : tx.status === 'Rejected' || tx.status === 'Expired' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-900'"
                >
                  {{ tx.status }}
                </span>
              </td>
              <td class="px-5 py-3.5 text-right">
                <div class="inline-flex flex-wrap items-center justify-end gap-2">
                  <button
                    v-if="['Pending', 'Waiting Verification', 'Expired'].includes(tx.status) && Number(tx.final_amount_idr || 0) > 0"
                    type="button"
                    @click="handlePayTransaction(tx)"
                    :disabled="payingTxId === tx.id"
                    class="rounded-full border border-black bg-[#72a5e4] px-3.5 py-1 text-[11px] font-bold text-black hover:bg-[#5c93d9] cursor-pointer inline-flex items-center gap-1 disabled:opacity-50"
                  >
                    <CreditCard class="h-3 w-3" />
                    <span>{{ payingTxId === tx.id ? 'Membuka...' : 'Bayar Midtrans' }}</span>
                  </button>
                  <button
                    v-if="tx.status !== 'Paid' && Number(tx.final_amount_idr || 0) > 0"
                    type="button"
                    @click="handleSyncTransaction(tx.id)"
                    :disabled="syncingTxId === tx.id"
                    class="rounded-full border border-black bg-white px-3 py-1 text-[11px] font-bold text-black hover:bg-slate-100 cursor-pointer inline-flex items-center gap-1 disabled:opacity-50"
                  >
                    <RefreshCw class="h-3 w-3" :class="syncingTxId === tx.id ? 'animate-spin' : ''" />
                    <span>{{ syncingTxId === tx.id ? 'Cek...' : 'Cek Status' }}</span>
                  </button>
                  <span v-else-if="tx.status === 'Paid'" class="text-[11px] font-bold text-emerald-700">
                    Lunas {{ tx.payment_provider ? `(${tx.payment_provider})` : '' }} ✓
                  </span>
                </div>
              </td>
            </tr>
            <tr v-if="!history.transactions.length">
              <td colspan="5" class="px-5 py-6 text-center text-slate-500">
                Belum ada riwayat transaksi pembelian paket atau bundle.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

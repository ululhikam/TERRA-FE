<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import api from '@/services/api'
import { useAuthStore } from '@/stores/auth'
import { useEventWorkspaceStore } from '@/stores/eventWorkspace'
import { useToastStore } from '@/stores/toast'
import { formatCurrency } from '@/utils/formatters'
import {
  CheckCircle2,
  Sparkles,
  Tag,
  Layers,
  ArrowRight,
  MessageCircle,
  CreditCard,
  Copy,
  X,
  UploadCloud
} from 'lucide-vue-next'

const authStore = useAuthStore()
const workspace = useEventWorkspaceStore()
const toast = useToastStore()

const plans = ref([])
const bundles = ref([])
const promos = ref([])
const adminWhatsapp = ref('6287897192601')
const manualInstructions = ref({
  bank_name: 'Bank BCA',
  account_number: '5410-8899-2026',
  account_holder: 'PT TERRA EKOSISTEM DIGITAL'
})
const loading = ref(true)
const showCommunityPrices = ref(false)

// Selected item modal state (NO redirect to /organizer/register!)
const selectedItem = ref(null) // { kind: 'plan' | 'bundle' | 'trial', code, name, price_idr, promo_hint }
const promoCodeInput = ref('')
const useEarlyAccess = ref(false)
const livePreview = ref(null)
const loadingPreview = ref(false)
const createdInvoice = ref(null)
const creatingInvoice = ref(false)
const uploadingProof = ref(false)

const waForm = reactive({
  organization_name: '',
  customer_name: authStore.user?.full_name || '',
  email: authStore.user?.email || '',
  contact: authStore.user?.phone || '',
  notes: ''
})

onMounted(async () => {
  loading.value = true
  try {
    const res = await api.get('/pricing/catalog')
    if (res?.data) {
      plans.value = res.data.plans || []
      bundles.value = res.data.bundles || []
      promos.value = res.data.promos || []
      if (res.data.admin_whatsapp) adminWhatsapp.value = res.data.admin_whatsapp
      if (res.data.manual_payment_instructions) {
        manualInstructions.value = res.data.manual_payment_instructions
      }
    }
    if (authStore.isOrganizer && !workspace.organizations.length) {
      workspace.fetchOrganizerWorkspace().catch(() => {})
    }
  } finally {
    loading.value = false
  }
})

function displayedPrice(plan) {
  const base = Number(plan.price_idr || 0)
  if (base === 0) return 0
  if (showCommunityPrices.value && Number(plan.community_discount_pct || 0) > 0) {
    return Math.round(base * (1 - Number(plan.community_discount_pct) / 100))
  }
  return base
}

async function computePreview() {
  if (!selectedItem.value) return
  if (selectedItem.value.kind === 'trial') {
    livePreview.value = {
      plan_name: '14 Days Pro Access (Free Trial)',
      base_price_idr: 0,
      discount_idr: 0,
      final_amount_idr: 0
    }
    return
  }
  loadingPreview.value = true
  try {
    const res = await api.post('/pricing/preview', {
      plan_code: selectedItem.value.plan_code || 'pro',
      bundle_id: selectedItem.value.kind === 'bundle' ? selectedItem.value.id : null,
      promo_code: promoCodeInput.value.trim(),
      use_early_access: useEarlyAccess.value,
      is_community: showCommunityPrices.value
    })
    livePreview.value = res?.data || null
  } catch (err) {
    toast.error(err?.message || 'Kode promo tidak berlaku.')
  } finally {
    loadingPreview.value = false
  }
}

function openPaymentSelector(item) {
  selectedItem.value = item
  createdInvoice.value = null
  if (!waForm.customer_name && authStore.user?.full_name) waForm.customer_name = authStore.user.full_name
  if (!waForm.email && authStore.user?.email) waForm.email = authStore.user.email
  if (!waForm.contact && authStore.user?.phone) waForm.contact = authStore.user.phone
  if (!waForm.organization_name && workspace.organizations?.[0]?.name) {
    waForm.organization_name = workspace.organizations[0].name
  }
  computePreview()
}

function selectPlan(plan) {
  openPaymentSelector({
    kind: 'plan',
    id: plan.id,
    plan_code: plan.code,
    name: `${plan.name} (${plan.price_idr === 0 ? 'Rp0 / Gratis' : formatCurrency(plan.price_idr) + ' / event'})`,
    base_price_idr: Number(plan.price_idr || 0)
  })
}

function selectBundle(bundle) {
  openPaymentSelector({
    kind: 'bundle',
    id: bundle.id,
    plan_code: bundle.plan_code,
    name: `${bundle.name} (${bundle.event_quota} Event)`,
    base_price_idr: Number(bundle.bundle_price_idr || 0)
  })
}

function selectTrial() {
  openPaymentSelector({
    kind: 'trial',
    plan_code: 'pro',
    name: '14 Days Pro Access (Free Trial)',
    base_price_idr: 0
  })
}

function closeModal() {
  selectedItem.value = null
  livePreview.value = null
  createdInvoice.value = null
}

const finalPayableAmount = computed(() => {
  if (livePreview.value) return Number(livePreview.value.final_amount_idr ?? 0)
  return Number(selectedItem.value?.base_price_idr ?? 0)
})

const whatsappMessage = computed(() => {
  const pkgLabel = selectedItem.value?.name || 'Paket Event TERRA'
  const lines = [
    `Halo Admin TERRA, saya ingin memilih / memproses pembayaran paket berikut:`,
    `- Paket Dipilih: ${pkgLabel}`,
    `- Estimasi Total: ${finalPayableAmount.value === 0 ? 'Rp0 (Gratis / Trial)' : formatCurrency(finalPayableAmount.value)}`,
    ...(createdInvoice.value?.invoice_number ? [`- No. Invoice: ${createdInvoice.value.invoice_number}`] : []),
    ...(promoCodeInput.value.trim() ? [`- Kode Promo: ${promoCodeInput.value.trim().toUpperCase()}`] : []),
    `- Nama Organisasi: ${waForm.organization_name || '-'}`,
    `- Nama Pelanggan: ${waForm.customer_name || '-'}`,
    `- Email: ${waForm.email || '-'}`,
    `- Kontak: ${waForm.contact || '-'}`,
    ...(waForm.notes.trim() ? [`- Catatan: ${waForm.notes.trim()}`] : [])
  ]
  return lines.join('\n')
})

const whatsappHref = computed(() => {
  const num = String(adminWhatsapp.value || '6287897192601').replace(/[^0-9]/g, '')
  return `https://wa.me/${num}?text=${encodeURIComponent(whatsappMessage.value)}`
})

async function copyWaTemplate() {
  try {
    await navigator.clipboard.writeText(whatsappMessage.value)
    toast.success('Template pesan WhatsApp berhasil disalin!')
  } catch {
    toast.info('Silakan salin manual dari kotak pratinjau pesan.')
  }
}

async function createManualInvoice() {
  if (!authStore.isOrganizer || !workspace.organizations?.[0]?.id) {
    toast.info('Klik tombol WhatsApp Admin di samping untuk memproses aktivasi & pembuatan akun/invoice.')
    return
  }
  if (!selectedItem.value || selectedItem.value.kind === 'trial') return
  creatingInvoice.value = true
  try {
    const res = await workspace.createBillingCheckout({
      organization_id: workspace.organizations[0].id,
      event_id: workspace.events?.[0]?.id || null,
      plan_code: selectedItem.value.plan_code || 'pro',
      bundle_id: selectedItem.value.kind === 'bundle' ? selectedItem.value.id : null,
      promo_code: promoCodeInput.value.trim(),
      use_early_access: useEarlyAccess.value,
      is_community: showCommunityPrices.value,
      community_org_proof: waForm.organization_name,
      payment_method: 'manual_transfer'
    })
    createdInvoice.value = res?.transaction || null
    toast.success(`Invoice ${createdInvoice.value?.invoice_number} dibuat! Silakan transfer & unggah bukti atau kirim ke WA Admin.`)
  } catch (err) {
    toast.error(err?.message || 'Gagal membuat invoice.')
  } finally {
    creatingInvoice.value = false
  }
}

async function handleProofUpload(e) {
  const file = e.target.files?.[0]
  if (!file || !createdInvoice.value?.id) return
  uploadingProof.value = true
  try {
    const updated = await workspace.uploadBillingProof(createdInvoice.value.id, file)
    createdInvoice.value = updated
    toast.success('Bukti transfer diunggah ke Supabase Storage! Menunggu verifikasi Admin.')
  } catch (err) {
    toast.error(err?.message || 'Gagal mengunggah bukti pembayaran.')
  } finally {
    uploadingProof.value = false
    e.target.value = ''
  }
}
</script>

<template>
  <div class="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-10 sm:py-14 space-y-12">
    <!-- Hero Header -->
    <div class="text-center max-w-2xl mx-auto space-y-4">
      <h1 class="text-3xl sm:text-5xl font-extrabold tracking-tight text-black leading-tight">
        Skema harga transparan per acara
      </h1>
      <p class="text-xs sm:text-sm text-slate-600 leading-relaxed">
        Bayar hanya untuk acara yang Anda selenggarakan — tanpa langganan bulanan otomatis, tanpa biaya tersembunyi, dan tanpa komisi tiket.
      </p>

      <!-- Community Toggle -->
      <div class="pt-2 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          @click="showCommunityPrices = !showCommunityPrices"
          class="inline-flex items-center gap-2 rounded-full border border-black px-5 py-2 text-xs font-bold transition-colors cursor-pointer"
          :class="showCommunityPrices ? 'bg-[#72a5e4] text-black' : 'bg-white text-black hover:bg-slate-100'"
        >
          <Tag class="h-3.5 w-3.5" />
          <span>
            {{ showCommunityPrices ? '✓ Menampilkan Harga Diskon BEM / UKM / Komunitas' : 'Cek Harga Khusus Mahasiswa, BEM, UKM & Komunitas' }}
          </span>
        </button>
      </div>
    </div>

    <!-- 4 Main Tiers -->
    <div v-if="loading" class="py-12 text-center text-xs text-slate-500">
      Memuat daftar paket harga TERRA...
    </div>

    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 items-stretch">
      <div
        v-for="plan in plans"
        :key="plan.code"
        class="rounded-2xl flex flex-col justify-between overflow-hidden transition-transform"
        :class="
          plan.is_popular
            ? 'border-2 border-black bg-white shadow-[5px_5px_0_#000]'
            : 'border-[1.5px] border-black bg-white'
        "
      >
        <div
          v-if="plan.is_popular"
          class="bg-[#72a5e4] border-b border-black px-6 py-2 flex items-center justify-between text-xs font-bold text-black"
        >
          <span>{{ plan.name }}</span>
          <span>Paling Populer</span>
        </div>

        <div class="p-6 flex-1 flex flex-col justify-between space-y-6">
          <div class="space-y-4">
            <div v-if="!plan.is_popular" class="flex items-center justify-between gap-2">
              <span class="rounded-full border border-black bg-[#fafaf9] px-3 py-0.5 text-[11px] font-bold text-black">
                {{ plan.name }}
              </span>
              <span
                v-if="plan.trial_days > 0"
                class="rounded-full border border-black/30 bg-white px-2.5 py-0.5 text-[11px] font-semibold text-black"
              >
                Trial {{ plan.trial_days }} Hari
              </span>
            </div>

            <div>
              <div class="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
                <span class="font-mono text-2xl xl:text-[26px] font-bold tracking-tight tabular-nums text-black whitespace-nowrap">
                  {{ displayedPrice(plan) === 0 ? 'Rp0' : formatCurrency(displayedPrice(plan)) }}
                </span>
                <span class="text-xs font-medium text-slate-500 whitespace-nowrap">
                  {{ plan.price_idr === 0 ? '/ gratis' : '/ event' }}
                </span>
              </div>
              <p
                v-if="showCommunityPrices && plan.community_discount_pct > 0"
                class="text-[11px] font-bold text-emerald-700 mt-1"
              >
                Hemat {{ plan.community_discount_pct }}% dari {{ formatCurrency(plan.price_idr) }}
              </p>
              <p
                v-else-if="plan.early_access_price_idr"
                class="text-[11px] font-medium text-slate-600 mt-1"
              >
                Early Access: <strong class="font-mono text-black">{{ formatCurrency(plan.early_access_price_idr) }}</strong>
              </p>
            </div>

            <p class="text-xs text-slate-600 leading-relaxed">
              {{ plan.description }}
            </p>

            <div class="rounded-xl border border-black/15 bg-[#fafaf9] p-3 text-[11px] space-y-1.5">
              <div class="flex justify-between">
                <span class="text-slate-500">Maks. Peserta</span>
                <span class="font-mono font-bold text-black">{{ Number(plan.max_participants).toLocaleString('id-ID') }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-slate-500">Panitia / Tim</span>
                <span class="font-mono font-bold text-black">{{ plan.max_team_members }} akun</span>
              </div>
              <div class="flex justify-between">
                <span class="text-slate-500">Modul Aktif</span>
                <span class="font-mono font-bold text-black">{{ (plan.allowed_modules || []).length }} / 13</span>
              </div>
            </div>

            <ul class="space-y-2 text-xs text-slate-700 pt-1">
              <li v-for="(feat, i) in (plan.features || [])" :key="i" class="flex items-start gap-2">
                <CheckCircle2 class="h-3.5 w-3.5 text-black shrink-0 mt-0.5" />
                <span>{{ feat }}</span>
              </li>
            </ul>
          </div>

          <button
            type="button"
            @click="selectPlan(plan)"
            class="luxury-pill w-full rounded-full border border-black py-3 px-4 text-xs font-bold text-center inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            :class="
              plan.is_popular
                ? 'bg-black text-white hover:bg-slate-800'
                : 'bg-[#fafaf9] text-black hover:bg-[#72a5e4]'
            "
          >
            <span>{{ plan.price_idr === 0 ? 'Aktifkan Paket Free' : `Pilih Paket ${plan.name}` }}</span>
            <ArrowRight class="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>

    <!-- 14 Days Pro Access Trial Banner -->
    <div class="rounded-3xl border-2 border-black bg-[#72a5e4]/25 p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
      <div class="space-y-2 max-w-2xl">
        <span class="inline-flex items-center gap-1.5 rounded-full border border-black bg-white px-3 py-0.5 text-[10px] font-bold text-black">
          <Sparkles class="h-3 w-3" /> Program uji coba tanpa risiko
        </span>
        <h2 class="text-2xl font-bold text-black font-editorial">
          14 Days Pro Access — Gratis Tanpa Kartu Kredit
        </h2>
        <p class="text-xs sm:text-sm text-slate-700 leading-relaxed">
          Aktifkan akses penuh seluruh 13 modul Pro selama 14 hari pada event Anda. Tidak ada pembayaran otomatis; setelah trial selesai, seluruh data Anda tetap tersimpan aman.
        </p>
      </div>
      <button
        type="button"
        @click="selectTrial"
        class="inline-flex items-center justify-center gap-1.5 rounded-full border border-black bg-black px-6 py-3 text-xs font-bold text-white hover:bg-slate-800 shrink-0 cursor-pointer"
      >
        <span>Coba 14 Days Pro Access</span>
        <ArrowRight class="h-3.5 w-3.5" />
      </button>
    </div>

    <!-- Multi-Event Bundles & Active Promos -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <div class="lg:col-span-7 rounded-3xl border-2 border-black bg-white p-6 space-y-4">
        <div class="flex items-center gap-2">
          <Layers class="h-4 w-4 text-black" />
          <h2 class="text-lg font-bold text-black">Multi-Event Bundle Hemat</h2>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div
            v-for="bnd in bundles"
            :key="bnd.id"
            class="rounded-2xl border border-black bg-[#fafaf9] p-4 space-y-2 flex flex-col justify-between"
          >
            <div class="space-y-1">
              <span class="rounded-full border border-black bg-[#72a5e4] px-2.5 py-0.5 text-[10px] font-bold uppercase text-black">
                {{ bnd.event_quota }} Event • {{ bnd.plan_code.toUpperCase() }}
              </span>
              <h3 class="text-sm font-bold text-black pt-1">{{ bnd.name }}</h3>
              <p class="font-mono text-xl font-bold tabular-nums text-black">{{ formatCurrency(bnd.bundle_price_idr) }}</p>
              <p class="text-[11px] text-slate-600">{{ bnd.description }}</p>
            </div>
            <button
              type="button"
              @click="selectBundle(bnd)"
              class="inline-flex items-center justify-center gap-1.5 w-full text-center rounded-full border border-black bg-white py-2 text-[11px] font-bold text-black hover:bg-black hover:text-white transition-colors cursor-pointer"
            >
              <span>Pilih Kuota Bundle</span>
              <ArrowRight class="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      <div class="lg:col-span-5 rounded-3xl border-2 border-black bg-[#fafaf9] p-6 space-y-4">
        <h2 class="text-lg font-bold text-black">Kode Promo &amp; Komunitas Aktif</h2>
        <div class="space-y-2.5">
          <div
            v-for="prm in promos"
            :key="prm.id"
            class="rounded-xl border border-black bg-white p-3.5 flex items-center justify-between gap-3"
          >
            <div>
              <p class="font-mono text-xs font-black text-black">{{ prm.code }}</p>
              <p class="text-[11px] text-slate-600">{{ prm.name }}</p>
            </div>
            <span class="rounded-full border border-black bg-[#72a5e4] px-3 py-1 text-xs font-bold text-black shrink-0">
              {{ prm.discount_type === 'percent' ? `${prm.discount_value}% OFF` : formatCurrency(prm.discount_value) }}
            </span>
          </div>
        </div>
        <p class="text-[11px] text-slate-500">
          Klik paket mana saja untuk memilih pembayaran atau menghubungi WhatsApp Admin (+62 878-9719-2601).
        </p>
      </div>
    </div>

    <!-- Modal Pilihan Pembayaran (Payment Gateway / Transfer Manual vs Hubungi WA Admin) -->
    <div
      v-if="selectedItem"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-xs overflow-y-auto"
    >
      <div class="w-full max-w-4xl rounded-3xl border-2 border-black bg-[#fafaf9] p-6 sm:p-8 space-y-6 my-auto shadow-[8px_8px_0_#000]">
        <div class="flex items-start justify-between gap-4 border-b border-black/20 pb-4">
          <div class="space-y-1">
            <span class="rounded-full border border-black bg-[#72a5e4] px-3 py-0.5 text-[10px] font-bold uppercase text-black">
              KONFIRMASI PEMBAYARAN / AKTIVASI PAKET
            </span>
            <h2 class="text-2xl font-bold text-black font-editorial">{{ selectedItem.name }}</h2>
            <p v-if="livePreview" class="text-xs text-slate-700">
              Total Tagihan Transparan:
              <strong class="text-black text-sm">
                {{ finalPayableAmount === 0 ? 'Rp0 (Gratis / Trial)' : formatCurrency(finalPayableAmount) }}
              </strong>
              <span v-if="livePreview.discount_idr > 0" class="text-emerald-700 font-bold ml-1">
                (Hemat {{ formatCurrency(livePreview.discount_idr) }})
              </span>
            </p>
          </div>
          <button
            type="button"
            @click="closeModal"
            class="p-1.5 rounded-full border border-black bg-white hover:bg-slate-100 cursor-pointer shrink-0"
          >
            <X class="h-4 w-4" />
          </button>
        </div>

        <!-- Promo & Early Access Controls inside Modal -->
        <div v-if="selectedItem.kind !== 'trial' && selectedItem.base_price_idr > 0" class="rounded-2xl border border-black bg-white p-4 flex flex-col sm:flex-row sm:items-center gap-3 text-xs">
          <label class="inline-flex items-center gap-2 font-semibold text-black cursor-pointer">
            <input v-model="useEarlyAccess" type="checkbox" @change="computePreview" />
            <span>Early Access</span>
          </label>
          <label class="inline-flex items-center gap-2 font-semibold text-black cursor-pointer">
            <input v-model="showCommunityPrices" type="checkbox" @change="computePreview" />
            <span>Diskon Komunitas / BEM / UKM</span>
          </label>
          <div class="flex flex-1 gap-2">
            <input
              v-model="promoCodeInput"
              type="text"
              placeholder="Kode Promo (EARLY100 / BEMUKM25)"
              class="flex-1 rounded-full border border-black bg-[#fafaf9] px-3.5 py-1.5 text-xs text-black uppercase"
            />
            <button
              type="button"
              @click="computePreview"
              :disabled="loadingPreview"
              class="rounded-full border border-black bg-[#72a5e4] px-4 py-1.5 text-xs font-bold text-black hover:bg-[#5c93d9] cursor-pointer"
            >
              {{ loadingPreview ? '...' : 'Terapkan' }}
            </button>
          </div>
        </div>

        <!-- 2 Payment Options Cards -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-5 items-stretch">
          <!-- Opsi 1: Hubungi Admin via WhatsApp -->
          <div class="rounded-2xl border-2 border-black bg-white p-5 space-y-4 flex flex-col justify-between">
            <div class="space-y-3">
              <div class="flex items-center justify-between gap-2">
                <span class="inline-flex items-center gap-1.5 rounded-full border border-black bg-[#72a5e4] px-3 py-0.5 text-[10px] font-bold uppercase text-black">
                  <MessageCircle class="h-3 w-3" /> Opsi 1 • WhatsApp Admin
                </span>
                <span class="text-[11px] font-bold text-black">+62 878-9719-2601</span>
              </div>

              <p class="text-xs text-slate-600">
                Isi data di bawah untuk langsung menghubungi Admin WA agar paket / akun Anda diproses dan diaktifkan.
              </p>

              <div class="space-y-2 text-xs">
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label class="block text-[11px] font-bold text-black mb-1">Nama Organisasi</label>
                    <input
                      v-model="waForm.organization_name"
                      type="text"
                      placeholder="Nama BEM / Komunitas / EO"
                      class="w-full rounded-lg border border-black bg-[#fafaf9] px-3 py-2 text-xs text-black"
                    />
                  </div>
                  <div>
                    <label class="block text-[11px] font-bold text-black mb-1">Nama Pelanggan</label>
                    <input
                      v-model="waForm.customer_name"
                      type="text"
                      placeholder="Nama lengkap Anda"
                      class="w-full rounded-lg border border-black bg-[#fafaf9] px-3 py-2 text-xs text-black"
                    />
                  </div>
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label class="block text-[11px] font-bold text-black mb-1">Email</label>
                    <input
                      v-model="waForm.email"
                      type="email"
                      placeholder="email@organisasi.id"
                      class="w-full rounded-lg border border-black bg-[#fafaf9] px-3 py-2 text-xs text-black"
                    />
                  </div>
                  <div>
                    <label class="block text-[11px] font-bold text-black mb-1">Kontak / No. WA</label>
                    <input
                      v-model="waForm.contact"
                      type="tel"
                      placeholder="08xxxxxxxxxx"
                      class="w-full rounded-lg border border-black bg-[#fafaf9] px-3 py-2 text-xs text-black"
                    />
                  </div>
                </div>
              </div>

              <div class="rounded-xl border border-black/20 bg-[#fafaf9] p-3 space-y-1">
                <div class="flex items-center justify-between">
                  <span class="text-[10px] font-bold uppercase text-slate-500">Pratinjau Pesan WA</span>
                  <button
                    type="button"
                    @click="copyWaTemplate"
                    class="inline-flex items-center gap-1 text-[10px] font-bold text-black hover:underline cursor-pointer"
                  >
                    <Copy class="h-3 w-3" /> Salin
                  </button>
                </div>
                <pre class="whitespace-pre-wrap font-mono text-[10px] text-slate-700 leading-relaxed">{{ whatsappMessage }}</pre>
              </div>
            </div>

            <a
              :href="whatsappHref"
              target="_blank"
              rel="noopener noreferrer"
              class="w-full rounded-full border border-black bg-[#72a5e4] py-3 px-4 text-xs font-bold text-black hover:bg-[#5c93d9] transition-colors inline-flex items-center justify-center gap-2"
            >
              <MessageCircle class="h-4 w-4" />
              <span>Hubungi Admin via WhatsApp ↗</span>
            </a>
          </div>

          <!-- Opsi 2: Bayar Payment (Transfer Manual / Payment Gateway Soon) -->
          <div class="rounded-2xl border-2 border-black bg-white p-5 space-y-4 flex flex-col justify-between">
            <div class="space-y-3">
              <div class="flex items-center justify-between gap-2">
                <span class="inline-flex items-center gap-1.5 rounded-full border border-black bg-[#fafaf9] px-3 py-0.5 text-[10px] font-bold uppercase text-black">
                  <CreditCard class="h-3 w-3" /> Opsi 2 • Bayar Payment
                </span>
                <span class="rounded-full border border-black bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold text-amber-900">
                  Payment Gateway (Soon)
                </span>
              </div>

              <!-- Payment Gateway Soon Box -->
              <div class="rounded-xl border border-dashed border-black/40 bg-slate-50 p-3.5 space-y-1 text-xs">
                <p class="font-bold text-black">Payment Gateway Otomatis (Segera Hadir)</p>
                <p class="text-[11px] text-slate-600">
                  Pembayaran instan via QRIS, Virtual Account (BCA/Mandiri/BNI/BRI), dan E-Wallet otomatis akan tersedia pada tahap berikutnya.
                </p>
              </div>

              <!-- Manual Transfer Instructions -->
              <div class="rounded-xl border border-black bg-[#fafaf9] p-4 space-y-1.5 text-xs">
                <span class="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                  Pembayaran Transfer Manual Tersedia Sekarang
                </span>
                <p class="text-sm font-black text-black">
                  {{ manualInstructions.bank_name }} • {{ manualInstructions.account_number }}
                </p>
                <p class="text-slate-700 font-semibold">a.n. {{ manualInstructions.account_holder }}</p>
                <p class="text-[11px] text-slate-500">
                  Total Transfer: <strong class="text-black">{{ finalPayableAmount === 0 ? 'Rp0' : formatCurrency(finalPayableAmount) }}</strong>
                </p>
              </div>

              <!-- If Organizer logged in, allow instant invoice + proof upload right here -->
              <div v-if="createdInvoice" class="rounded-xl border border-black bg-[#72a5e4]/20 p-3.5 space-y-2 text-xs">
                <p class="font-bold text-black">
                  Invoice: <span class="font-mono">{{ createdInvoice.invoice_number }}</span> ({{ createdInvoice.status }})
                </p>
                <label class="inline-flex items-center gap-1.5 rounded-full border border-black bg-white px-4 py-1.5 text-[11px] font-bold cursor-pointer hover:bg-slate-100">
                  <UploadCloud class="h-3.5 w-3.5" />
                  <span>{{ uploadingProof ? 'Mengunggah...' : createdInvoice.payment_proof_url ? '✓ Bukti Terunggah (Ganti)' : 'Unggah Bukti Transfer' }}</span>
                  <input type="file" accept="image/*" class="hidden" @change="handleProofUpload" />
                </label>
              </div>
            </div>

            <div class="space-y-2">
              <button
                v-if="authStore.isOrganizer && selectedItem.kind !== 'trial'"
                type="button"
                @click="createManualInvoice"
                :disabled="creatingInvoice"
                class="w-full rounded-full bg-black py-3 px-4 text-xs font-bold text-white hover:bg-slate-800 cursor-pointer disabled:opacity-50"
              >
                {{ creatingInvoice ? 'Membuat Invoice...' : 'Buat Invoice Pembayaran Manual' }}
              </button>
              <a
                v-else
                :href="whatsappHref"
                target="_blank"
                rel="noopener noreferrer"
                class="w-full rounded-full bg-black py-3 px-4 text-xs font-bold text-white hover:bg-slate-800 inline-flex items-center justify-center gap-2"
              >
                <span>Kirim Bukti Transfer via WhatsApp Admin ↗</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

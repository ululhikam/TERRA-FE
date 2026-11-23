<script setup>
import { onMounted, reactive, ref } from 'vue'
import { useEventWorkspaceStore } from '@/stores/eventWorkspace'
import { useToastStore } from '@/stores/toast'
import { formatCurrency, formatDateTime } from '@/utils/formatters'
import { CheckCircle2, XCircle, Sliders, Tag, Layers, Receipt } from 'lucide-vue-next'

const store = useEventWorkspaceStore()
const toast = useToastStore()

const activeTab = ref('transactions') // 'transactions' | 'plans' | 'promos' | 'audit'
const overview = ref({
  plans: [],
  bundles: [],
  promos: [],
  transactions: [],
  subscriptions: [],
  audit_logs: [],
  stats: { total_paid_revenue_idr: 0, paid_transactions_count: 0, waiting_verification_count: 0 }
})
const loading = ref(true)
const savingPlan = ref('')

const newPromo = reactive({
  code: '',
  name: '',
  promo_type: 'promo',
  discount_type: 'percent',
  discount_value: 20,
  requires_verification: false,
  max_redemptions: ''
})

const newBundle = reactive({
  code: '',
  name: '',
  plan_code: 'pro',
  event_quota: 3,
  bundle_price_idr: 299000,
  description: ''
})

async function loadOverview() {
  loading.value = true
  try {
    const res = await store.fetchAdminPricingOverview()
    if (res) overview.value = res
  } catch (err) {
    toast.error(err?.message || 'Gagal memuat konsol pricing admin.')
  } finally {
    loading.value = false
  }
}

onMounted(loadOverview)

async function verifyTx(tx, status) {
  try {
    await store.adminVerifyBillingTransaction(tx.id, {
      status,
      admin_notes: status === 'Paid' ? 'Pembayaran valid & paket diaktifkan Admin.' : 'Pembayaran ditolak Admin.'
    })
    toast.success(`Invoice ${tx.invoice_number} diperbarui ke ${status}.`)
    await loadOverview()
  } catch (err) {
    toast.error(err?.message || 'Gagal memverifikasi transaksi.')
  }
}

async function savePlanConfig(plan) {
  savingPlan.value = plan.code
  try {
    await store.adminUpdatePricingPlan(plan.code, {
      price_idr: Number(plan.price_idr),
      max_active_events: Number(plan.max_active_events),
      max_participants: Number(plan.max_participants),
      max_team_members: Number(plan.max_team_members),
      max_storage_mb: Number(plan.max_storage_mb),
      trial_days: Number(plan.trial_days || 0),
      early_access_price_idr: plan.early_access_price_idr === '' || plan.early_access_price_idr === null ? null : Number(plan.early_access_price_idr),
      community_discount_pct: Number(plan.community_discount_pct || 0),
      is_active: Boolean(plan.is_active)
    })
    toast.success(`Konfigurasi paket ${plan.name} berhasil disimpan.`)
    await loadOverview()
  } catch (err) {
    toast.error(err?.message || 'Gagal menyimpan konfigurasi paket.')
  } finally {
    savingPlan.value = ''
  }
}

async function handleCreatePromo() {
  try {
    await store.adminSavePromo({
      ...newPromo,
      max_redemptions: newPromo.max_redemptions ? Number(newPromo.max_redemptions) : null
    })
    toast.success(`Kode promo ${newPromo.code.toUpperCase()} disimpan.`)
    newPromo.code = ''
    newPromo.name = ''
    await loadOverview()
  } catch (err) {
    toast.error(err?.message || 'Gagal menyimpan kode promo.')
  }
}

async function handleCreateBundle() {
  try {
    await store.adminSaveBundle({ ...newBundle })
    toast.success(`Paket bundle ${newBundle.name} disimpan.`)
    newBundle.code = ''
    newBundle.name = ''
    newBundle.description = ''
    await loadOverview()
  } catch (err) {
    toast.error(err?.message || 'Gagal menyimpan bundle.')
  }
}
</script>

<template>
  <div class="space-y-6 min-h-[calc(100vh-6rem)]">
    <div class="space-y-1">
      <span class="text-[9px] font-bold uppercase tracking-widest text-slate-500 block">
        REVENUE &amp; ENTITLEMENTS
      </span>
      <h1 class="text-3xl font-bold text-black font-sans">Pricing, Billing &amp; Verifikasi Pembayaran</h1>
      <p class="text-xs text-slate-500">
        Atur harga, kuota, modul, promo, bundle, serta verifikasi bukti pembayaran manual Organizer secara dinamis tanpa ubah kode.
      </p>
    </div>

    <!-- Stats Cards -->
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div class="rounded-2xl border border-black bg-[#72a5e4] p-5 space-y-1">
        <span class="text-[10px] font-bold uppercase tracking-wider text-black">TOTAL PENDAPATAN VERIFIED</span>
        <p class="text-2xl font-black text-black">{{ formatCurrency(overview.stats.total_paid_revenue_idr) }}</p>
      </div>
      <div class="rounded-2xl border border-black bg-white p-5 space-y-1">
        <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400">MENUNGGU VERIFIKASI</span>
        <p class="text-2xl font-black text-black">{{ overview.stats.waiting_verification_count }} transaksi</p>
      </div>
      <div class="rounded-2xl border border-black bg-white p-5 space-y-1">
        <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400">EVENT TERDAFTAR ENTITLEMENT</span>
        <p class="text-2xl font-black text-black">{{ overview.subscriptions.length }} event</p>
      </div>
    </div>

    <!-- Navigation Tabs -->
    <div class="flex flex-wrap gap-2">
      <button
        type="button"
        @click="activeTab = 'transactions'"
        class="rounded-full border border-black px-5 py-2 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
        :class="activeTab === 'transactions' ? 'bg-black text-white' : 'bg-white text-black'"
      >
        <Receipt class="h-3.5 w-3.5" /> Transaksi &amp; Verifikasi ({{ overview.transactions.length }})
      </button>
      <button
        type="button"
        @click="activeTab = 'plans'"
        class="rounded-full border border-black px-5 py-2 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
        :class="activeTab === 'plans' ? 'bg-black text-white' : 'bg-white text-black'"
      >
        <Sliders class="h-3.5 w-3.5" /> Paket &amp; Kuota ({{ overview.plans.length }})
      </button>
      <button
        type="button"
        @click="activeTab = 'promos'"
        class="rounded-full border border-black px-5 py-2 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
        :class="activeTab === 'promos' ? 'bg-black text-white' : 'bg-white text-black'"
      >
        <Tag class="h-3.5 w-3.5" /> Promo &amp; Bundle
      </button>
      <button
        type="button"
        @click="activeTab = 'audit'"
        class="rounded-full border border-black px-5 py-2 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
        :class="activeTab === 'audit' ? 'bg-black text-white' : 'bg-white text-black'"
      >
        <Layers class="h-3.5 w-3.5" /> Audit &amp; Distribusi Event
      </button>
    </div>

    <!-- TAB 1: TRANSACTIONS & VERIFICATION -->
    <div v-if="activeTab === 'transactions'" class="rounded-2xl border border-black bg-white overflow-hidden">
      <div class="overflow-x-auto">
        <table class="min-w-full text-left text-xs">
          <thead class="bg-[#72a5e4]/25 border-b border-black text-[10px] font-bold uppercase text-black">
            <tr>
              <th class="px-5 py-3">INVOICE</th>
              <th class="px-5 py-3">ORGANISASI / EVENT</th>
              <th class="px-5 py-3">PAKET &amp; PROMO</th>
              <th class="px-5 py-3">NOMINAL</th>
              <th class="px-5 py-3">STATUS</th>
              <th class="px-5 py-3 text-right">VERIFIKASI</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-black/10">
            <tr v-for="tx in overview.transactions" :key="tx.id" class="hover:bg-[#fafaf9]">
              <td class="px-5 py-3.5 font-mono font-bold text-black">
                {{ tx.invoice_number }}
                <div class="text-[10px] font-sans font-normal text-slate-500">{{ formatDateTime(tx.created_at) }}</div>
              </td>
              <td class="px-5 py-3.5">
                <div class="font-bold text-black">{{ tx.organization?.name || tx.organization_id }}</div>
                <div class="text-[11px] text-slate-500">{{ tx.event?.title || tx.target_type }}</div>
                <div v-if="tx.community_org_proof" class="text-[10px] text-blue-700 font-semibold">
                  Komunitas: {{ tx.community_org_proof }}
                </div>
              </td>
              <td class="px-5 py-3.5">
                <span class="font-bold text-black">{{ tx.plan_name }}</span>
                <div v-if="tx.promo_code" class="text-[10px] font-mono text-emerald-700">Promo: {{ tx.promo_code }}</div>
                <a
                  v-if="tx.payment_proof_url"
                  :href="tx.payment_proof_url"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="text-[10px] font-bold underline text-black block mt-0.5"
                >
                  Lihat Bukti Transfer ↗
                </a>
              </td>
              <td class="px-5 py-3.5 font-bold text-black">{{ formatCurrency(tx.final_amount_idr) }}</td>
              <td class="px-5 py-3.5">
                <span
                  class="rounded-full border border-black px-2.5 py-0.5 text-[10px] font-bold"
                  :class="tx.status === 'Paid' ? 'bg-[#72a5e4] text-black' : tx.status === 'Rejected' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-900'"
                >
                  {{ tx.status }}
                </span>
              </td>
              <td class="px-5 py-3.5 text-right">
                <div class="inline-flex gap-1.5">
                  <button
                    v-if="tx.status !== 'Paid'"
                    type="button"
                    @click="verifyTx(tx, 'Paid')"
                    class="rounded-full border border-black bg-[#72a5e4] px-3 py-1 text-[11px] font-bold text-black hover:bg-[#5c93d9] inline-flex items-center gap-1 cursor-pointer"
                  >
                    <CheckCircle2 class="h-3 w-3" /> Valid (Paid)
                  </button>
                  <button
                    v-if="['Pending', 'Waiting Verification'].includes(tx.status)"
                    type="button"
                    @click="verifyTx(tx, 'Rejected')"
                    class="rounded-full border border-black bg-white px-3 py-1 text-[11px] font-bold text-rose-700 hover:bg-rose-50 inline-flex items-center gap-1 cursor-pointer"
                  >
                    <XCircle class="h-3 w-3" /> Tolak
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="!overview.transactions.length">
              <td colspan="6" class="px-5 py-8 text-center text-slate-500">Belum ada transaksi masuk.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- TAB 2: PLANS CONFIGURATION -->
    <div v-else-if="activeTab === 'plans'" class="grid grid-cols-1 md:grid-cols-2 gap-5">
      <div
        v-for="plan in overview.plans"
        :key="plan.code"
        class="rounded-2xl border-2 border-black bg-white p-5 space-y-4 text-xs"
      >
        <div class="flex items-center justify-between border-b border-black/15 pb-3">
          <div>
            <span class="font-mono text-[10px] font-bold uppercase text-slate-400">{{ plan.code }}</span>
            <h3 class="text-lg font-black text-black">{{ plan.name }}</h3>
          </div>
          <label class="inline-flex items-center gap-2 font-bold cursor-pointer">
            <input v-model="plan.is_active" type="checkbox" />
            <span>Aktif</span>
          </label>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="font-bold text-black block mb-1">Harga Normal (IDR)</label>
            <input v-model.number="plan.price_idr" type="number" min="0" class="w-full rounded-lg border border-black p-2" />
          </div>
          <div>
            <label class="font-bold text-black block mb-1">Harga Early Access (IDR)</label>
            <input v-model="plan.early_access_price_idr" type="number" min="0" placeholder="Kosongkan jika nonaktif" class="w-full rounded-lg border border-black p-2" />
          </div>
          <div>
            <label class="font-bold text-black block mb-1">Maks. Peserta / Event</label>
            <input v-model.number="plan.max_participants" type="number" min="1" class="w-full rounded-lg border border-black p-2" />
          </div>
          <div>
            <label class="font-bold text-black block mb-1">Maks. Panitia / Tim</label>
            <input v-model.number="plan.max_team_members" type="number" min="1" class="w-full rounded-lg border border-black p-2" />
          </div>
          <div>
            <label class="font-bold text-black block mb-1">Maks. Event Aktif Org</label>
            <input v-model.number="plan.max_active_events" type="number" min="1" class="w-full rounded-lg border border-black p-2" />
          </div>
          <div>
            <label class="font-bold text-black block mb-1">Storage (MB) &amp; Diskon Komunitas (%)</label>
            <div class="grid grid-cols-2 gap-2">
              <input v-model.number="plan.max_storage_mb" type="number" min="10" class="w-full rounded-lg border border-black p-2" />
              <input v-model.number="plan.community_discount_pct" type="number" min="0" max="90" class="w-full rounded-lg border border-black p-2" />
            </div>
          </div>
          <div>
            <label class="font-bold text-black block mb-1">Masa Free Trial (Hari)</label>
            <input v-model.number="plan.trial_days" type="number" min="0" max="90" class="w-full rounded-lg border border-black p-2" />
          </div>
          <div class="flex items-end">
            <button
              type="button"
              @click="savePlanConfig(plan)"
              :disabled="savingPlan === plan.code"
              class="w-full rounded-full bg-black py-2.5 font-bold text-white hover:bg-slate-800 cursor-pointer disabled:opacity-50"
            >
              {{ savingPlan === plan.code ? 'Menyimpan...' : 'Simpan Konfigurasi' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- TAB 3: PROMOS & BUNDLES -->
    <div v-else-if="activeTab === 'promos'" class="grid grid-cols-1 lg:grid-cols-2 gap-6 text-xs">
      <div class="rounded-2xl border border-black bg-white p-5 space-y-4">
        <h3 class="text-base font-bold text-black">Kelola Kode Promo &amp; Komunitas</h3>
        <form @submit.prevent="handleCreatePromo" class="grid grid-cols-2 gap-2.5">
          <input v-model="newPromo.code" required placeholder="KODE (mis: HIMATEK30)" class="rounded-lg border border-black p-2 uppercase" />
          <input v-model="newPromo.name" required placeholder="Nama Program Promo" class="rounded-lg border border-black p-2" />
          <select v-model="newPromo.promo_type" class="rounded-lg border border-black p-2 bg-white">
            <option value="promo">Promo Umum</option>
            <option value="community">Community / BEM / UKM</option>
            <option value="early_access">Early Access</option>
          </select>
          <div class="grid grid-cols-2 gap-2">
            <select v-model="newPromo.discount_type" class="rounded-lg border border-black p-2 bg-white">
              <option value="percent">% Diskon</option>
              <option value="fixed">Rp Tetap</option>
            </select>
            <input v-model.number="newPromo.discount_value" type="number" min="1" required class="rounded-lg border border-black p-2" />
          </div>
          <button type="submit" class="col-span-2 rounded-full bg-black py-2.5 font-bold text-white hover:bg-slate-800 cursor-pointer">
            + Simpan Kode Promo
          </button>
        </form>

        <div class="space-y-2 pt-2">
          <div v-for="prm in overview.promos" :key="prm.id" class="rounded-xl border border-black/20 bg-[#fafaf9] p-3 flex justify-between items-center">
            <div>
              <span class="font-mono font-bold text-black">{{ prm.code }}</span>
              <span class="ml-2 text-slate-600">{{ prm.name }}</span>
            </div>
            <span class="font-bold text-black">
              {{ prm.discount_type === 'percent' ? `${prm.discount_value}%` : formatCurrency(prm.discount_value) }} • Dipakai {{ prm.used_count }}x
            </span>
          </div>
        </div>
      </div>

      <div class="rounded-2xl border border-black bg-white p-5 space-y-4">
        <h3 class="text-base font-bold text-black">Kelola Multi-Event Bundle</h3>
        <form @submit.prevent="handleCreateBundle" class="grid grid-cols-2 gap-2.5">
          <input v-model="newBundle.code" required placeholder="kode-bundle" class="rounded-lg border border-black p-2" />
          <input v-model="newBundle.name" required placeholder="Nama Bundle" class="rounded-lg border border-black p-2" />
          <select v-model="newBundle.plan_code" class="rounded-lg border border-black p-2 bg-white">
            <option value="starter">STARTER</option>
            <option value="pro">PRO</option>
            <option value="ultimate">ULTIMATE</option>
          </select>
          <input v-model.number="newBundle.event_quota" type="number" min="2" required placeholder="Jumlah Event" class="rounded-lg border border-black p-2" />
          <input v-model.number="newBundle.bundle_price_idr" type="number" min="0" required placeholder="Harga Bundle IDR" class="rounded-lg border border-black p-2" />
          <input v-model="newBundle.description" placeholder="Deskripsi singkat" class="rounded-lg border border-black p-2" />
          <button type="submit" class="col-span-2 rounded-full bg-[#72a5e4] border border-black py-2.5 font-bold text-black hover:bg-[#5c93d9] cursor-pointer">
            + Simpan Paket Bundle
          </button>
        </form>

        <div class="space-y-2 pt-2">
          <div v-for="bnd in overview.bundles" :key="bnd.id" class="rounded-xl border border-black/20 bg-[#fafaf9] p-3 flex justify-between items-center">
            <div>
              <p class="font-bold text-black">{{ bnd.name }}</p>
              <p class="text-[11px] text-slate-500">{{ bnd.event_quota }} Event {{ bnd.plan_code.toUpperCase() }}</p>
            </div>
            <span class="font-black text-black">{{ formatCurrency(bnd.bundle_price_idr) }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- TAB 4: AUDIT LOGS & EVENT PLAN DISTRIBUTION -->
    <div v-else class="grid grid-cols-1 lg:grid-cols-2 gap-6 text-xs">
      <div class="rounded-2xl border border-black bg-white p-5 space-y-3">
        <h3 class="text-sm font-bold text-black">Penggunaan Paket per Event</h3>
        <div v-for="sub in overview.subscriptions" :key="sub.id" class="rounded-xl border border-black/15 bg-[#fafaf9] p-3 flex justify-between items-center">
          <div>
            <p class="font-bold text-black">{{ sub.event?.title || sub.event_id }}</p>
            <p class="text-[10px] text-slate-500">{{ sub.organization?.name || sub.organization_id }}</p>
          </div>
          <span class="rounded-full border border-black bg-[#72a5e4] px-3 py-0.5 text-[10px] font-bold text-black">
            {{ sub.plan_name }} ({{ sub.status }})
          </span>
        </div>
      </div>

      <div class="rounded-2xl border border-black bg-white p-5 space-y-3">
        <h3 class="text-sm font-bold text-black">Audit Log Billing &amp; Perubahan Paket</h3>
        <div v-for="log in overview.audit_logs" :key="log.id" class="rounded-xl border border-black/15 bg-[#fafaf9] p-3 flex justify-between items-center">
          <div>
            <span class="font-mono font-bold text-black">{{ log.action }}</span>
            <p class="text-[10px] text-slate-500">{{ log.from_plan || '-' }} &rarr; {{ log.to_plan || '-' }}</p>
          </div>
          <span class="text-[10px] text-slate-400">{{ formatDateTime(log.created_at) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useEventWorkspaceStore } from '@/stores/eventWorkspace'
import { useToastStore } from '@/stores/toast'
import { formatCurrency } from '@/utils/formatters'
import { Download, Plus, X } from 'lucide-vue-next'

const route = useRoute()
const store = useEventWorkspaceStore()
const toast = useToastStore()

const eventId = computed(() => route.params.eventId || store.activeEvent?.id || 'evt-1')
const paidTickets = computed(() => store.getPaidTicketBreakdown(eventId.value))
const ticketSalesRevenue = computed(() => store.getPaidTicketRevenue(eventId.value))
const eventIncomes = computed(() =>
  store.finance.incomes.filter((i) => !i.event_id || i.event_id === eventId.value)
)
const eventExpenses = computed(() =>
  store.finance.expenses.filter((e) => !e.event_id || e.event_id === eventId.value)
)
const manualIncome = computed(() => eventIncomes.value.reduce((s, i) => s + Number(i.amount || 0), 0))
const totalIncome = computed(() => ticketSalesRevenue.value + manualIncome.value)
const totalExpense = computed(() => eventExpenses.value.reduce((s, e) => s + Number(e.amount || 0), 0))
const netBalance = computed(() => totalIncome.value - totalExpense.value)

const budget = computed(() => store.finance.budget || 75000000)
const budgetUtilization = computed(() => {
  if (budget.value <= 0) return 0
  return Math.round((totalExpense.value / budget.value) * 100)
})

const txType = ref('expense')
const category = ref('Operasional')
const description = ref('')
const amount = ref(0)
const showForm = ref(false)

async function addTransaction() {
  if (!description.value.trim() || amount.value <= 0) return
  await store.addFinanceRecord(eventId.value, txType.value, {
    category: category.value,
    description: description.value.trim(),
    amount: Number(amount.value)
  })
  description.value = ''
  amount.value = 0
  showForm.value = false
  toast.success('Transaksi keuangan berhasil dicatat.')
}

function exportCSV() {
  const rows = [
    ['Tipe', 'Kategori', 'Deskripsi', 'Nominal', 'Tanggal'],
    ...paidTickets.value.map((t) => ['Pemasukan Tiket', t.name, `${t.sold} tiket terjual`, t.revenue, new Date().toISOString().slice(0, 10)]),
    ...eventIncomes.value.map((i) => ['Pemasukan', i.category, i.description, i.amount, i.date || i.created_at || '']),
    ...eventExpenses.value.map((e) => ['Pengeluaran', e.category, e.description, -Math.abs(e.amount), e.date || e.created_at || ''])
  ]
  const csv = rows.map((r) => r.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `finance-${eventId.value}.csv`
  link.click()
  URL.revokeObjectURL(url)
  toast.success('Buku kas dan invoice CSV berhasil diekspor.')
}
</script>

<template>
  <div class="space-y-6 min-h-[calc(100vh-6rem)]">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div class="space-y-1">
        <div class="flex items-center gap-2">
          <span class="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            AUTOMATED LEDGER
          </span>
          <span class="rounded-full border border-black bg-[#72a5e4] px-3 py-0.5 text-xs font-bold text-black">
            Surplus (+)
          </span>
        </div>
        <h1 class="text-3xl font-bold tracking-tight text-black font-editorial">
          Finance &amp; Ticket Revenue
        </h1>
        <p class="text-xs text-slate-600">
          Pemasukan tiket berbayar terhitung otomatis secara atomik dan terintegrasi dengan pembukuan pengeluaran.
        </p>
      </div>

      <div class="flex items-center gap-2.5">
        <button
          @click="exportCSV"
          class="rounded-full border border-black bg-white px-5 py-2 text-xs font-semibold text-black hover:bg-slate-100 transition-colors flex items-center gap-1.5"
        >
          <Download class="h-3.5 w-3.5" />
          <span>Export CSV</span>
        </button>
        <button
          @click="showForm = true"
          class="rounded-full bg-black px-5 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition-colors"
        >
          + Catat Transaksi
        </button>
      </div>
    </div>

    <!-- 4 Stat Metric Cards -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <!-- Card 1: Sky-blue accent -->
      <div class="rounded-2xl border border-black bg-[#72a5e4] p-6 space-y-3 flex flex-col justify-between">
        <div>
          <span class="text-[10px] font-bold uppercase tracking-wider text-black block">REVENUE TIKET BERBAYAR</span>
          <span class="text-2xl sm:text-3xl font-black text-black leading-none mt-2 block">{{ formatCurrency(ticketSalesRevenue) }}</span>
        </div>
        <div class="pt-3 border-t border-black/20 text-xs">
          <p class="font-medium text-black">Sinkron otomatis dari Ticketing</p>
          <span class="text-[10px] text-slate-800">Auto-Sync</span>
        </div>
      </div>

      <!-- Card 2 -->
      <div class="rounded-2xl border border-black bg-white p-6 space-y-3 flex flex-col justify-between">
        <div>
          <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">TOTAL PEMASUKAN ACARA</span>
          <span class="text-2xl sm:text-3xl font-black text-black leading-none mt-2 block">{{ formatCurrency(totalIncome) }}</span>
        </div>
        <div class="pt-3 border-t border-black/10 text-xs">
          <p class="font-medium text-slate-700">Tiket + Sponsor ({{ formatCurrency(manualIncome) }})</p>
          <span class="text-[10px] text-slate-400">+Total</span>
        </div>
      </div>

      <!-- Card 3 -->
      <div class="rounded-2xl border border-black bg-white p-6 space-y-3 flex flex-col justify-between">
        <div>
          <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">TOTAL PENGELUARAN</span>
          <span class="text-2xl sm:text-3xl font-black text-black leading-none mt-2 block">{{ formatCurrency(totalExpense) }}</span>
        </div>
        <div class="pt-3 border-t border-black/10 text-xs">
          <p class="font-medium text-slate-700">{{ budgetUtilization }}% dari anggaran</p>
          <span class="text-[10px] text-slate-400">Beban</span>
        </div>
      </div>

      <!-- Card 4 -->
      <div class="rounded-2xl border border-black bg-white p-6 space-y-3 flex flex-col justify-between">
        <div>
          <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">SALDO BERSIH (NET PROFIT)</span>
          <span class="text-2xl sm:text-3xl font-black text-black leading-none mt-2 block">{{ formatCurrency(netBalance) }}</span>
        </div>
        <div class="pt-3 border-t border-black/10 text-xs">
          <p class="font-medium text-slate-700">Kondisi Finansial Sehat</p>
          <span class="text-[10px] text-slate-400">Surplus</span>
        </div>
      </div>
    </div>

    <!-- Serapan Anggaran Acara (Budget Utilization) -->
    <div class="rounded-2xl border border-black bg-white p-6 space-y-3">
      <div class="flex items-center justify-between text-xs">
        <div>
          <h3 class="text-sm font-bold text-black">Serapan Anggaran Acara (Budget Utilization)</h3>
          <p class="text-[11px] text-slate-500">Total batas anggaran yang dialokasikan: {{ formatCurrency(budget) }}</p>
        </div>
        <span class="text-sm font-bold text-black">{{ formatCurrency(totalExpense) }} ({{ budgetUtilization }}%)</span>
      </div>
      <div class="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
        <div
          class="h-full bg-[#72a5e4] transition-all"
          :style="{ width: `${budgetUtilization}%` }"
        />
      </div>
    </div>

    <!-- Pemasukan Real-time dari Penjualan Tiket Berbayar -->
    <div class="rounded-2xl border border-black bg-white p-6 space-y-4">
      <div class="flex items-center justify-between pb-2 border-b border-black/10">
        <div>
          <h3 class="text-base font-bold text-black">Pemasukan Real-time dari Penjualan Tiket Berbayar</h3>
          <p class="text-xs text-slate-500">Dihitung otomatis per kuota tiket berbayar yang dipesan pengunjung</p>
        </div>
        <span class="rounded-full border border-black bg-[#72a5e4] px-3 py-0.5 text-xs font-bold text-black">
          Auto-Synced
        </span>
      </div>

      <div class="divide-y divide-black/10">
        <div
          v-for="t in paidTickets"
          :key="t.id"
          class="py-3 flex items-center justify-between text-xs"
        >
          <div>
            <h4 class="font-bold text-black text-sm">{{ t.name }}</h4>
            <p class="text-slate-500 text-[11px]">{{ t.sold }} tiket terjual • {{ formatCurrency(t.price) }}</p>
          </div>
          <span class="font-bold text-black text-base">+{{ formatCurrency(t.revenue) }}</span>
        </div>
        <div v-if="!paidTickets.length" class="py-4 text-xs text-slate-500">
          Belum ada penjualan tiket berbayar pada event ini.
        </div>
      </div>
    </div>

    <!-- Bottom 2-Column: Pemasukan Tambahan & Pengeluaran -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <!-- Left: Pemasukan Tambahan -->
      <div class="rounded-2xl border border-black bg-white p-6 space-y-4">
        <div class="flex items-center justify-between pb-2 border-b border-black/10">
          <div>
            <h3 class="text-sm font-bold text-black">Pemasukan Tambahan (Sponsorship &amp; Grant)</h3>
            <span class="text-base font-bold text-black block mt-1">+{{ formatCurrency(manualIncome) }}</span>
          </div>
        </div>

        <div class="divide-y divide-black/10 text-xs">
          <div v-for="inc in eventIncomes" :key="inc.id" class="py-3 flex items-center justify-between">
            <div>
              <p class="font-bold text-black">{{ inc.description }}</p>
              <p class="text-[11px] text-slate-500">{{ inc.category }} • {{ inc.date || inc.created_at?.slice(0, 10) || '-' }}</p>
            </div>
            <span class="font-bold text-black">+{{ formatCurrency(inc.amount) }}</span>
          </div>
          <div v-if="!eventIncomes.length" class="py-4 text-slate-500">
            Belum ada catatan pemasukan tambahan.
          </div>
        </div>
      </div>

      <!-- Right: Rincian Pengeluaran Operasional -->
      <div class="rounded-2xl border border-black bg-white p-6 space-y-4 flex flex-col justify-between">
        <div>
          <div class="flex items-center justify-between pb-2 border-b border-black/10">
            <div>
              <h3 class="text-sm font-bold text-black">Rincian Pengeluaran Operasional</h3>
              <span class="text-base font-bold text-black block mt-1">-{{ formatCurrency(totalExpense) }}</span>
            </div>
          </div>

          <div class="divide-y divide-black/10 text-xs">
            <div v-for="exp in eventExpenses" :key="exp.id" class="py-3 flex items-center justify-between">
              <div>
                <p class="font-bold text-black">{{ exp.description }}</p>
                <p class="text-[11px] text-slate-500">{{ exp.category }} • {{ exp.date || exp.created_at?.slice(0, 10) || '-' }}</p>
              </div>
              <span class="font-bold text-black">-{{ formatCurrency(exp.amount) }}</span>
            </div>
            <div v-if="!eventExpenses.length" class="py-4 text-slate-500">
              Belum ada catatan pengeluaran operasional.
            </div>
          </div>
        </div>

        <div class="pt-2">
          <button class="w-full rounded-full border border-black bg-white py-1.5 text-xs font-semibold text-black hover:bg-slate-100">
            Rincian lainnya ↓
          </button>
        </div>
      </div>
    </div>

    <!-- Modal Catat Transaksi Baru -->
    <div
      v-if="showForm"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-2xs"
    >
      <div class="w-full max-w-md rounded-3xl border-2 border-black bg-white p-6 sm:p-8 space-y-6">
        <div class="flex items-center justify-between border-b border-black/20 pb-3">
          <h3 class="text-xl font-bold text-black font-editorial">Catat Transaksi Keuangan</h3>
          <button @click="showForm = false" class="p-1 rounded-full border border-black hover:bg-slate-100">
            <X class="h-4 w-4" />
          </button>
        </div>

        <form @submit.prevent="addTransaction" class="space-y-4 text-xs">
          <div class="grid grid-cols-2 gap-3">
            <button
              type="button"
              @click="txType = 'expense'"
              class="rounded-full border border-black py-2 font-bold transition-colors"
              :class="txType === 'expense' ? 'bg-black text-white' : 'bg-white text-black'"
            >
              Pengeluaran
            </button>
            <button
              type="button"
              @click="txType = 'income'"
              class="rounded-full border border-black py-2 font-bold transition-colors"
              :class="txType === 'income' ? 'bg-[#72a5e4] text-black' : 'bg-white text-black'"
            >
              Pemasukan
            </button>
          </div>

          <div class="space-y-1">
            <label class="font-bold text-black">Deskripsi Transaksi</label>
            <input
              v-model="description"
              type="text"
              required
              placeholder="Contoh: Pembayaran DP Konsumsi VIP"
              class="w-full rounded-xl border border-black p-2.5 text-black focus:outline-hidden"
            />
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-1">
              <label class="font-bold text-black">Kategori</label>
              <select
                v-model="category"
                class="w-full rounded-xl border border-black p-2.5 text-black focus:outline-hidden"
              >
                <option value="Operasional">Operasional</option>
                <option value="Venue & Logistik">Venue &amp; Logistik</option>
                <option value="Marketing">Marketing</option>
                <option value="Sponsorship">Sponsorship</option>
              </select>
            </div>

            <div class="space-y-1">
              <label class="font-bold text-black">Nominal (Rp)</label>
              <input
                v-model="amount"
                type="number"
                min="1000"
                step="10000"
                required
                class="w-full rounded-xl border border-black p-2.5 text-black focus:outline-hidden"
              />
            </div>
          </div>

          <div class="pt-4 flex justify-end gap-3 border-t border-black/20">
            <button
              type="button"
              @click="showForm = false"
              class="rounded-full border border-black bg-white px-5 py-2 font-semibold text-black hover:bg-slate-100"
            >
              Batal
            </button>
            <button
              type="submit"
              class="rounded-full bg-black px-6 py-2 font-bold text-white hover:bg-slate-800"
            >
              Simpan Transaksi
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

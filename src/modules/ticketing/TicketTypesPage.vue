<script setup>
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useEventWorkspaceStore } from '@/stores/eventWorkspace'
import { useToastStore } from '@/stores/toast'
import { formatCurrency } from '@/utils/formatters'
import { Power, X } from 'lucide-vue-next'

const route = useRoute()
const store = useEventWorkspaceStore()
const toast = useToastStore()

const event = computed(() => store.events.find((e) => e.id === route.params.eventId) || store.activeEvent)

const name = ref('')
const price = ref(0)
const quantity = ref(100)
const description = ref('')
const showForm = ref(false)

async function addTicketType() {
  if (!name.value.trim() || !event.value) return
  await store.addTicketType(event.value.id, {
    name: name.value,
    description: description.value || 'Tiket masuk resmi event.',
    price: Number(price.value),
    quantity: Number(quantity.value)
  })
  name.value = ''
  price.value = 0
  description.value = ''
  showForm.value = false
  toast.success('Jenis tiket baru berhasil ditambahkan.')
}

async function toggleTicketStatus(tkt) {
  await store.toggleTicketTypeStatus(tkt)
  toast.info(`Status tiket ${tkt.name} diubah menjadi ${tkt.status}.`)
}

function getRevenue(tkt) {
  const sold = Number(tkt.sold_quantity) || 0
  const cost = Number(tkt.price) || 0
  if (cost === 0) return 'Gratis'
  return formatCurrency(sold * cost)
}
</script>

<template>
  <div v-if="event" class="space-y-6 min-h-[calc(100vh-6rem)]">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div class="space-y-1">
        <div class="flex items-center gap-2">
          <span class="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            INVENTORY &amp; PRICING
          </span>
          <span class="rounded-full border border-black bg-[#72a5e4] px-3 py-0.5 text-xs font-bold text-black">
            {{ event.ticket_types.length }} Tipe Tiket
          </span>
        </div>
        <h1 class="text-3xl font-bold tracking-tight text-black font-editorial">
          Ticketing Management
        </h1>
        <p class="text-xs text-slate-600">
          Konfigurasi kuota tiket gratis maupun berbayar. Penjualan tiket berbayar otomatis tercatat di modul Finance.
        </p>
      </div>

      <button
        @click="showForm = true"
        class="rounded-full bg-black px-6 py-2.5 text-xs font-semibold text-white hover:bg-slate-800 transition-colors shrink-0"
      >
        + Buat Jenis Tiket
      </button>
    </div>

    <!-- Ticket Cards Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div
        v-for="tkt in event.ticket_types"
        :key="tkt.id"
        class="rounded-2xl border border-black bg-white p-6 space-y-5 transition-all"
      >
        <!-- Top Title & Badge -->
        <div class="space-y-1">
          <div class="flex items-center justify-between">
            <h3 class="text-lg font-bold text-black">{{ tkt.name }}</h3>
            <span
              class="rounded-full border border-black px-3 py-0.5 text-[10px] font-bold uppercase"
              :class="Number(tkt.price) > 0 ? 'bg-[#72a5e4] text-black' : 'bg-white text-black'"
            >
              {{ Number(tkt.price) > 0 ? 'PAID' : 'FREE' }}
            </span>
          </div>
          <p class="text-xs text-slate-500 line-clamp-2">{{ tkt.description }}</p>
        </div>

        <!-- Quota Progress -->
        <div class="space-y-1.5">
          <div class="flex items-center justify-between text-xs font-semibold">
            <span class="text-slate-800">
              Kuota Terjual: {{ tkt.sold_quantity }} / {{ tkt.quantity }}
            </span>
            <span class="text-slate-500 font-mono">
              {{ tkt.quantity ? Math.round((tkt.sold_quantity / tkt.quantity) * 100) : 0 }}%
            </span>
          </div>
          <div class="h-1.5 w-full rounded-full bg-slate-200 overflow-hidden">
            <div
              class="h-full bg-[#72a5e4] transition-all"
              :style="{ width: `${tkt.quantity ? Math.min(100, Math.round((tkt.sold_quantity / tkt.quantity) * 100)) : 0}%` }"
            />
          </div>
        </div>

        <!-- Financial Breakdown -->
        <div class="grid grid-cols-2 gap-4 pt-2 border-t border-black/10">
          <div>
            <span class="text-[10px] uppercase font-bold text-slate-400 block">HARGA SATUAN</span>
            <span class="text-base font-bold text-black">
              {{ Number(tkt.price) > 0 ? formatCurrency(tkt.price) : 'Gratis' }}
            </span>
          </div>
          <div>
            <span class="text-[10px] uppercase font-bold text-slate-400 block">AKUMULASI REVENUE</span>
            <span class="text-base font-bold text-black">
              {{ getRevenue(tkt) }}
            </span>
          </div>
        </div>

        <!-- Status & Actions -->
        <div class="flex items-center justify-between pt-3 border-t border-black/10">
          <span
            class="rounded-full border border-black px-3 py-1 text-xs font-semibold flex items-center gap-1.5"
            :class="tkt.status === 'On Sale' ? 'bg-[#72a5e4] text-black font-bold' : 'bg-slate-100 text-slate-600'"
          >
            <span class="h-2 w-2 rounded-full" :class="tkt.status === 'On Sale' ? 'bg-black' : 'bg-slate-400'" />
            <span>{{ tkt.status }}</span>
          </span>

          <button
            @click="toggleTicketStatus(tkt)"
            class="p-2 rounded-full border border-black text-black hover:bg-slate-100 transition-colors"
            title="Ubah Status On Sale / Nonaktif"
          >
            <Power class="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>

    <!-- Modal Buat Tiket Baru -->
    <div
      v-if="showForm"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-2xs"
    >
      <div class="w-full max-w-md rounded-3xl border-2 border-black bg-white p-6 sm:p-8 space-y-6">
        <div class="flex items-center justify-between border-b border-black/20 pb-3">
          <h3 class="text-xl font-bold text-black font-editorial">Buat Jenis Tiket Baru</h3>
          <button @click="showForm = false" class="p-1 rounded-full border border-black hover:bg-slate-100">
            <X class="h-4 w-4" />
          </button>
        </div>

        <form @submit.prevent="addTicketType" class="space-y-4 text-xs">
          <div class="space-y-1">
            <label class="font-bold text-black">Nama Tiket</label>
            <input
              v-model="name"
              type="text"
              required
              placeholder="Contoh: Early Bird Pass"
              class="w-full rounded-xl border border-black p-2.5 text-black focus:outline-hidden"
            />
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-1">
              <label class="font-bold text-black">Harga (Rp)</label>
              <input
                v-model="price"
                type="number"
                min="0"
                step="5000"
                required
                class="w-full rounded-xl border border-black p-2.5 text-black focus:outline-hidden"
              />
              <span class="text-[10px] text-slate-500">Isi 0 untuk tiket Gratis</span>
            </div>

            <div class="space-y-1">
              <label class="font-bold text-black">Kuota Maksimal</label>
              <input
                v-model="quantity"
                type="number"
                min="1"
                required
                class="w-full rounded-xl border border-black p-2.5 text-black focus:outline-hidden"
              />
            </div>
          </div>

          <div class="space-y-1">
            <label class="font-bold text-black">Deskripsi &amp; Fasilitas Tiket</label>
            <textarea
              v-model="description"
              rows="3"
              placeholder="Jelajahi sesi seminar, snack, merchandise..."
              class="w-full rounded-xl border border-black p-2.5 text-black focus:outline-hidden resize-none"
            />
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
              Simpan Tiket
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

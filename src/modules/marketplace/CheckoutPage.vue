<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import { z } from 'zod'
import { useEventWorkspaceStore } from '@/stores/eventWorkspace'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'
import { formatCurrency, formatDateTime } from '@/utils/formatters'

const route = useRoute()
const router = useRouter()
const store = useEventWorkspaceStore()
const authStore = useAuthStore()
const toast = useToastStore()

const loadingEvent = ref(true)
const submitting = ref(false)

const event = computed(() =>
  store.events.find((e) => e.slug === route.params.eventSlug || e.id === route.params.eventSlug) || null
)

onMounted(async () => {
  loadingEvent.value = true
  try {
    if (!event.value || !event.value.ticket_types?.length) {
      await store.fetchEventPublic(route.params.eventSlug)
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

const maxQty = computed(() => {
  const limit = Number(ticketType.value?.max_per_order || 5)
  return Math.max(1, Math.min(limit, remainingQuota.value || limit))
})

const quantity = ref(Math.max(1, Number(route.query.qty) || 1))
const fullName = ref(authStore.user?.full_name || '')
const email = ref(authStore.user?.email || '')
const phone = ref(authStore.user?.phone || '')
const errorMsg = ref('')

const schema = z.object({
  full_name: z.string().min(2, 'Nama peserta minimal 2 karakter'),
  email: z.string().email('Format email tidak valid'),
  phone: z.string().min(8, 'Nomor telepon minimal 8 digit')
})

const totalAmount = computed(() => {
  const price = Number(ticketType.value?.price) || 0
  return price * quantity.value
})

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
    const res = await store.placeOrder({
      eventId: event.value.id,
      ticketTypeId: ticketType.value.id,
      quantity: quantity.value,
      attendee: parsed.data
    })
    toast.success(`Pesanan ${res.orderNumber} berhasil! Tiket digital telah diterbitkan.`)
    router.push('/profile')
  } catch (err) {
    errorMsg.value = err?.message || 'Gagal memproses checkout tiket.'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div v-if="loadingEvent && !event" class="mx-auto max-w-5xl px-4 sm:px-6 py-16 text-center space-y-3 min-h-[calc(100vh-14rem)]">
    <div class="mx-auto h-8 w-8 rounded-full border-2 border-black border-t-[#72a5e4] animate-spin" />
    <p class="text-xs font-semibold text-slate-600">Memuat detail event &amp; tiket...</p>
  </div>

  <div v-else-if="event" class="mx-auto max-w-5xl px-4 sm:px-6 py-10 space-y-6 min-h-[calc(100vh-14rem)]">
    <div class="space-y-1">
      <span class="text-[9px] font-bold uppercase tracking-widest text-slate-500 block">
        CHECKOUT
      </span>
      <h1 class="text-3xl font-bold tracking-tight text-black font-sans">
        Checkout &amp; Registrasi Peserta
      </h1>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
      <!-- Left Column: Data Peserta -->
      <div class="md:col-span-7 rounded-xl border border-black bg-[#fafaf9] p-6 sm:p-7 space-y-5">
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
                min="1"
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
            <label class="font-bold text-black block">Email (Pengiriman E-Ticket)</label>
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

          <div class="pt-2">
            <button
              type="submit"
              :disabled="submitting || !ticketType || ticketType.status !== 'On Sale'"
              class="w-full rounded-full bg-black py-3.5 text-xs font-bold text-white hover:bg-slate-800 transition-colors disabled:opacity-50 cursor-pointer"
            >
              {{ submitting ? 'Memproses Pesanan...' : '✓ Konfirmasi Pesanan' }}
            </button>
          </div>
        </form>
      </div>

      <!-- Right Column: Solid Blue Ringkasan Pesanan -->
      <div class="md:col-span-5 rounded-xl border border-black bg-[#72a5e4] p-6 sm:p-7 space-y-4 text-black">
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
      </div>
    </div>
  </div>

  <div v-else class="mx-auto max-w-xl px-4 py-16 text-center space-y-4 min-h-[calc(100vh-14rem)]">
    <h1 class="text-2xl font-bold font-editorial text-black">Event Tidak Ditemukan</h1>
    <p class="text-xs text-slate-600">Event mungkin belum dipublikasikan atau tautan sudah berubah.</p>
    <RouterLink
      to="/events"
      class="inline-block rounded-full border border-black bg-[#72a5e4] px-6 py-2.5 text-xs font-bold text-black"
    >
      Kembali ke Marketplace &rarr;
    </RouterLink>
  </div>
</template>

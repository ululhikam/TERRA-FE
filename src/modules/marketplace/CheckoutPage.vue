<script setup>
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
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

const event = computed(() =>
  store.events.find((e) => e.slug === route.params.eventSlug || e.id === route.params.eventSlug) || store.events[0]
)

const ticketType = computed(() => {
  if (!event.value) return null
  return (
    event.value.ticket_types.find((t) => t.id === route.query.ticketId) ||
    event.value.ticket_types[0]
  )
})

const quantity = ref(Number(route.query.qty) || 1)
const fullName = ref(authStore.user?.full_name || 'Hikam Pratama (Organizer)')
const email = ref(authStore.user?.email || 'organizer@nusantaratech.id')
const phone = ref('081234567890')
const errorMsg = ref('')

const schema = z.object({
  full_name: z.string().min(2, 'Nama peserta wajib diisi'),
  email: z.string().email('Format email tidak valid'),
  phone: z.string().min(8, 'Nomor telepon minimal 8 digit')
})

const totalAmount = computed(() => {
  const price = Number(ticketType.value?.price) || 0
  return price * quantity.value
})

async function confirmOrder() {
  errorMsg.value = ''
  const parsed = schema.safeParse({
    full_name: fullName.value,
    email: email.value,
    phone: phone.value
  })
  if (!parsed.success) {
    errorMsg.value = parsed.error.issues[0].message
    return
  }

  try {
    const res = await store.placeOrder({
      eventId: event.value.id,
      ticketTypeId: ticketType.value.id,
      quantity: quantity.value,
      attendee: parsed.data
    })
    toast.success(`Pesanan ${res.orderNumber} berhasil! Tiket digital telah diterbitkan.`)
    router.push('/my-tickets')
  } catch (err) {
    errorMsg.value = err.message
  }
}
</script>

<template>
  <div v-if="event" class="mx-auto max-w-5xl px-4 sm:px-6 py-10 space-y-6 min-h-[calc(100vh-14rem)]">
    <!-- Top Heading -->
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
        <h2 class="text-lg font-bold text-black font-sans">Data Peserta</h2>

        <form @submit.prevent="confirmOrder" class="space-y-4 text-xs">
          <div v-if="errorMsg" class="rounded-lg border border-rose-300 bg-rose-50 p-3 text-rose-700">
            {{ errorMsg }}
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
            <label class="font-bold text-black block">Email (Pengiriman Tiket)</label>
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
              class="w-full rounded-lg border border-black bg-white p-3 text-xs sm:text-sm text-black focus:outline-hidden"
            />
          </div>

          <div class="pt-2">
            <button
              type="submit"
              class="w-full rounded-full bg-black py-3.5 text-xs font-bold text-white hover:bg-slate-800 transition-colors"
            >
              ✓ Konfirmasi Pesanan
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
          <span class="text-slate-900">{{ ticketType?.name }} × {{ quantity }}</span>
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
</template>

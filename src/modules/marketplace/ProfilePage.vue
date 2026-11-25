<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useEventWorkspaceStore } from '@/stores/eventWorkspace'
import { useToastStore } from '@/stores/toast'
import { formatCurrency, formatDateTime } from '@/utils/formatters'
import { openMidtransSnap } from '@/utils/midtrans'
import QrCodeCanvas from '@/components/common/QrCodeCanvas.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import {
  Ticket,
  Receipt,
  Settings,
  ShieldCheck,
  CalendarDays,
  MapPin,
  LogOut,
  Compass,
  CreditCard,
  RefreshCw,
  Repeat
} from 'lucide-vue-next'

const router = useRouter()
const authStore = useAuthStore()
const workspace = useEventWorkspaceStore()
const toast = useToastStore()

const activeTab = ref('tickets')
const loadingData = ref(true)
const cancellingOrderId = ref('')
const payingOrderId = ref('')
const syncingOrderId = ref('')

const fullName = ref(authStore.user?.full_name || '')
const email = ref(authStore.user?.email || '')
const phone = ref(authStore.user?.phone || '')
const bio = ref(authStore.user?.bio || '')
const saving = ref(false)
const uploadingAvatar = ref(false)

async function handleAvatarUpload(e) {
  const file = e.target.files?.[0]
  if (!file) return
  uploadingAvatar.value = true
  try {
    const uploaded = await workspace.uploadMedia(file, { folder: 'avatars', bucketType: 'media' })
    if (uploaded?.public_url) {
      await authStore.updateProfile({ avatar_url: uploaded.public_url })
      toast.success('Foto profil berhasil diperbarui di Supabase Storage.')
    }
  } catch (err) {
    toast.error(err?.message || 'Gagal mengunggah foto profil.')
  } finally {
    uploadingAvatar.value = false
    e.target.value = ''
  }
}

watch(
  () => authStore.user,
  (u) => {
    if (!u) return
    fullName.value = u.full_name || ''
    email.value = u.email || ''
    phone.value = u.phone || ''
    bio.value = u.bio || ''
  },
  { immediate: true }
)

onMounted(async () => {
  loadingData.value = true
  try {
    await Promise.all([
      authStore.fetchCurrentUser().catch(() => {}),
      workspace.fetchMyTickets().catch(() => {}),
      workspace.fetchMyOrders().catch(() => {})
    ])
    await syncPendingMidtransOrders()
  } finally {
    loadingData.value = false
  }
})

let profilePollTimer = null
let profilePollTicks = 0

const pendingMidtransOrders = computed(() =>
  (workspace.myOrders || []).filter(
    (o) =>
      o.order_status !== 'Cancelled' &&
      o.order_status !== 'Confirmed' &&
      !['Paid', 'Verified', 'Not Required'].includes(o.payment_status) &&
      Number(o.total || 0) > 0
  )
)

async function syncPendingMidtransOrders() {
  if (!pendingMidtransOrders.value.length || syncingOrderId.value || payingOrderId.value) return
  for (const ord of pendingMidtransOrders.value.slice(0, 3)) {
    await handleSyncOrder(ord.id, { silent: true })
  }
}

function stopProfilePolling() {
  if (profilePollTimer) {
    clearInterval(profilePollTimer)
    profilePollTimer = null
  }
  profilePollTicks = 0
}

function handleProfileFocus() {
  if (typeof document !== 'undefined' && document.hidden) return
  syncPendingMidtransOrders()
}

watch(
  () => pendingMidtransOrders.value.length,
  (count) => {
    if (!count) {
      stopProfilePolling()
      return
    }
    if (profilePollTimer) return
    profilePollTicks = 0
    profilePollTimer = setInterval(() => {
      profilePollTicks += 1
      if (profilePollTicks > 30) {
        stopProfilePolling()
        return
      }
      syncPendingMidtransOrders()
    }, 5000)
  }
)

if (typeof window !== 'undefined') {
  window.addEventListener('focus', handleProfileFocus)
  document.addEventListener('visibilitychange', handleProfileFocus)
}

onBeforeUnmount(() => {
  stopProfilePolling()
  if (typeof window !== 'undefined') {
    window.removeEventListener('focus', handleProfileFocus)
    document.removeEventListener('visibilitychange', handleProfileFocus)
  }
})

const activeTicketsCount = computed(
  () =>
    workspace.myTickets.filter((t) =>
      ['active', 'valid'].includes(String(t.status || '').toLowerCase())
    ).length
)

const usedTicketsCount = computed(
  () =>
    workspace.myTickets.filter((t) => String(t.status || '').toLowerCase() === 'used').length
)

const userInitials = computed(() => {
  const name = authStore.user?.full_name || authStore.user?.email || 'P'
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p.charAt(0).toUpperCase())
    .join('')
})

const authBadgeLabel = computed(() => {
  if (authStore.user?.provider === 'google') return 'Akun Google Terverifikasi'
  if (authStore.user?.email_verified !== false) return 'Email Terverifikasi OTP'
  return 'Menunggu Verifikasi'
})

async function saveProfile() {
  saving.value = true
  try {
    await authStore.updateProfile({
      full_name: fullName.value.trim(),
      phone: phone.value.trim(),
      bio: bio.value.trim()
    })
    toast.success('Profil akun berhasil diperbarui ke server.')
  } catch (err) {
    toast.error(err?.message || 'Gagal memperbarui profil.')
  } finally {
    saving.value = false
  }
}

async function handleCancelOrder(orderId) {
  cancellingOrderId.value = orderId
  try {
    await workspace.cancelMyOrder(orderId)
    toast.success('Pesanan dibatalkan & kuota tiket dikembalikan.')
  } catch (err) {
    toast.error(err?.message || 'Gagal membatalkan pesanan.')
  } finally {
    cancellingOrderId.value = ''
  }
}

async function handlePayOrder(order, { forceNew = false } = {}) {
  payingOrderId.value = order.id
  try {
    const session = await workspace.createOrderSnapToken(order.id, { forceNew })
    const snapRes = await openMidtransSnap(session.snap_token, {
      clientKey: session.client_key,
      snapJsUrl: session.snap_js_url
    })
    await handleSyncOrder(order.id, {
      silent: snapRes.status === 'closed',
      midtransOrderId: snapRes?.result?.order_id || session.midtrans_order_id || '',
      expectSettled: snapRes.status === 'success'
    })
  } catch (err) {
    toast.error(err?.message || 'Gagal membuka pembayaran Midtrans.')
  } finally {
    payingOrderId.value = ''
  }
}

async function handleSyncOrder(orderId, { silent = false, midtransOrderId = '', expectSettled = false } = {}) {
  syncingOrderId.value = orderId
  try {
    const maxAttempts = expectSettled ? 3 : 1
    let res = null
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      if (attempt > 0) {
        await new Promise((r) => setTimeout(r, attempt === 1 ? 1500 : 2000))
      }
      res = await workspace.syncOrderPaymentStatus(orderId, midtransOrderId, expectSettled ? 'settlement' : '')
      if (res?.payment_state === 'settled' || res?.order?.order_status === 'Confirmed') break
    }
    await workspace.fetchMyTickets().catch(() => {})
    if (!silent) {
      if (res?.payment_state === 'settled' || res?.order?.order_status === 'Confirmed') {
        toast.success('Pembayaran terkonfirmasi! Tiket QR Anda sudah aktif.')
      } else {
        toast.info(`Status pembayaran: ${res?.order?.payment_status || 'Pending'}.`)
      }
    }
  } catch (err) {
    if (!silent) toast.error(err?.message || 'Gagal menyinkronkan status pembayaran.')
  } finally {
    syncingOrderId.value = ''
  }
}

async function handleLogout() {
  await authStore.logout()
  router.push('/login')
}
</script>

<template>
  <div class="mx-auto max-w-5xl px-4 sm:px-6 py-8 sm:py-10 space-y-8 min-h-[calc(100vh-14rem)]">
    <!-- Top Editorial Profile Header Card -->
    <section class="rounded-3xl border-2 border-black bg-[#fafaf9] p-6 sm:p-8 shadow-[6px_6px_0_#000] space-y-6">
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div class="flex items-center gap-4 sm:gap-5">
          <div class="relative shrink-0 group">
            <img
              v-if="authStore.user?.avatar_url"
              :src="authStore.user.avatar_url"
              :alt="authStore.user.full_name"
              class="h-16 w-16 sm:h-20 sm:w-20 rounded-2xl border-2 border-black object-cover bg-white"
            />
            <div
              v-else
              class="h-16 w-16 sm:h-20 sm:w-20 rounded-2xl border-2 border-black bg-[#72a5e4] flex items-center justify-center font-black text-xl sm:text-2xl text-black"
            >
              {{ userInitials }}
            </div>
            <label
              class="mt-1.5 block text-center rounded-full border border-black bg-white px-2.5 py-0.5 text-[10px] font-bold text-black hover:bg-[#72a5e4] cursor-pointer"
              title="Unggah Foto Profil ke Supabase Storage"
            >
              <span>{{ uploadingAvatar ? 'Uploading...' : 'Ubah Foto' }}</span>
              <input type="file" accept="image/*" class="hidden" :disabled="uploadingAvatar" @change="handleAvatarUpload" />
            </label>
          </div>

          <div class="space-y-1.5 min-w-0">
            <div class="flex flex-wrap items-center gap-2">
              <span class="rounded-full border border-black bg-white px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider text-black">
                {{ authStore.user?.role === 'organizer' ? 'Organizer' : 'Peserta' }}
              </span>
              <span class="inline-flex items-center gap-1 rounded-full border border-black bg-[#72a5e4] px-3 py-0.5 text-[10px] font-bold text-black">
                <ShieldCheck class="h-3 w-3" />
                <span>{{ authBadgeLabel }}</span>
              </span>
            </div>
            <h1 class="text-2xl sm:text-3xl font-bold text-black font-editorial truncate">
              {{ authStore.user?.full_name || 'Pengguna TERRA' }}
            </h1>
            <p class="text-xs sm:text-sm text-slate-600 truncate">
              {{ authStore.user?.email }}
              <span v-if="authStore.user?.phone"> • {{ authStore.user.phone }}</span>
            </p>
            <p v-if="authStore.user?.bio" class="text-xs text-slate-700 max-w-xl">
              {{ authStore.user.bio }}
            </p>
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-2.5 shrink-0">
          <RouterLink
            to="/events"
            class="inline-flex items-center gap-1.5 rounded-full border border-black bg-[#72a5e4] px-5 py-2 text-xs font-bold text-black hover:bg-[#5c93d9] transition-colors"
          >
            <Compass class="h-3.5 w-3.5" />
            <span>Jelajahi Event</span>
          </RouterLink>
          <button
            type="button"
            @click="handleLogout"
            class="inline-flex items-center gap-1.5 rounded-full border border-black bg-white px-4 py-2 text-xs font-bold text-black hover:bg-rose-50 hover:text-rose-700 transition-colors cursor-pointer"
          >
            <LogOut class="h-3.5 w-3.5" />
            <span>Keluar</span>
          </button>
        </div>
      </div>

      <!-- Account Stats Bar -->
      <div class="grid grid-cols-3 gap-3 pt-4 border-t border-black/15">
        <div class="rounded-2xl border border-black bg-white p-3.5 sm:p-4">
          <span class="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Tiket Aktif</span>
          <p class="text-xl sm:text-2xl font-black text-black mt-1">{{ activeTicketsCount }}</p>
        </div>
        <div class="rounded-2xl border border-black bg-white p-3.5 sm:p-4">
          <span class="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Sudah Check-in</span>
          <p class="text-xl sm:text-2xl font-black text-black mt-1">{{ usedTicketsCount }}</p>
        </div>
        <div class="rounded-2xl border border-black bg-white p-3.5 sm:p-4">
          <span class="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Total Pesanan</span>
          <p class="text-xl sm:text-2xl font-black text-black mt-1">{{ workspace.myOrders.length }}</p>
        </div>
      </div>
    </section>

    <!-- Navigation Tabs -->
    <div class="flex flex-wrap gap-2 border-b border-black/15 pb-3">
      <button
        type="button"
        @click="activeTab = 'tickets'"
        class="inline-flex items-center gap-2 rounded-full border border-black px-5 py-2 text-xs font-bold transition-colors cursor-pointer"
        :class="activeTab === 'tickets' ? 'bg-black text-white' : 'bg-white text-black hover:bg-slate-100'"
      >
        <Ticket class="h-3.5 w-3.5" />
        <span>Tiket Saya ({{ workspace.myTickets.length }})</span>
      </button>
      <button
        type="button"
        @click="activeTab = 'orders'"
        class="inline-flex items-center gap-2 rounded-full border border-black px-5 py-2 text-xs font-bold transition-colors cursor-pointer"
        :class="activeTab === 'orders' ? 'bg-black text-white' : 'bg-white text-black hover:bg-slate-100'"
      >
        <Receipt class="h-3.5 w-3.5" />
        <span>Riwayat Pesanan ({{ workspace.myOrders.length }})</span>
      </button>
      <button
        type="button"
        @click="activeTab = 'settings'"
        class="inline-flex items-center gap-2 rounded-full border border-black px-5 py-2 text-xs font-bold transition-colors cursor-pointer"
        :class="activeTab === 'settings' ? 'bg-black text-white' : 'bg-white text-black hover:bg-slate-100'"
      >
        <Settings class="h-3.5 w-3.5" />
        <span>Pengaturan Profil</span>
      </button>
    </div>

    <!-- TAB 1: TIKET SAYA -->
    <section v-if="activeTab === 'tickets'" class="space-y-5">
      <div v-if="loadingData && workspace.myTickets.length === 0" class="py-12 text-center text-xs text-slate-500">
        Memuat tiket digital Anda...
      </div>

      <div v-else-if="workspace.myTickets.length > 0" class="space-y-5">
        <div
          v-for="tkt in workspace.myTickets"
          :key="tkt.id"
          class="relative rounded-2xl border border-black bg-white overflow-hidden p-6 sm:p-7 flex flex-col md:flex-row items-stretch justify-between gap-6"
        >
          <div class="hidden md:block absolute -top-3 right-56 w-6 h-6 rounded-full border border-black bg-[#fafaf9]" />
          <div class="hidden md:block absolute -bottom-3 right-56 w-6 h-6 rounded-full border border-black bg-[#fafaf9]" />

          <div class="space-y-3 flex-1">
            <div class="flex flex-wrap items-center gap-2.5">
              <span
                v-if="['active', 'valid'].includes(String(tkt.status || '').toLowerCase())"
                class="rounded-full border border-black bg-[#72a5e4] px-3 py-0.5 text-xs font-bold text-black"
              >
                Active
              </span>
              <span
                v-else-if="String(tkt.status || '').toLowerCase() === 'cancelled'"
                class="rounded-full border border-black bg-rose-100 px-3 py-0.5 text-xs font-bold text-rose-800"
              >
                Cancelled
              </span>
              <span
                v-else
                class="rounded-full border border-black bg-black px-3 py-0.5 text-xs font-bold text-white"
              >
                Used
              </span>
              <span class="font-mono text-xs font-bold text-slate-800">{{ tkt.ticket_code }}</span>
            </div>

            <h2 class="text-xl font-bold tracking-tight text-black font-editorial">
              {{ tkt.event_title || 'Event TERRA' }}
            </h2>

            <p class="text-xs sm:text-sm font-semibold text-slate-800">
              {{ tkt.ticket_type || 'Tiket Event' }} • {{ tkt.participant_name || authStore.user?.full_name }}
            </p>

            <div class="pt-1 flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-slate-600">
              <span v-if="tkt.event_date" class="inline-flex items-center gap-1.5">
                <CalendarDays class="h-3.5 w-3.5 text-black" />
                {{ formatDateTime(tkt.event_date) }}
              </span>
              <span v-if="tkt.location" class="inline-flex items-center gap-1.5">
                <MapPin class="h-3.5 w-3.5 text-black" />
                {{ tkt.location }}
              </span>
            </div>

            <p v-if="tkt.order_number" class="text-[11px] text-slate-400 font-mono">
              Order Ref: {{ tkt.order_number }}
            </p>
          </div>

          <div class="hidden md:block border-r-2 border-dashed border-slate-300 mx-4" />

          <div class="flex flex-col items-center justify-center gap-2 shrink-0 md:w-44 pt-4 md:pt-0 border-t md:border-t-0 border-dashed border-slate-300">
            <div class="p-2 border border-black/15 rounded-xl bg-white shadow-xs">
              <QrCodeCanvas :value="tkt.qr_payload" :size="112" />
            </div>
            <span class="text-[11px] font-mono font-bold text-slate-700 tracking-wider">
              {{ tkt.ticket_code }}
            </span>
          </div>
        </div>
      </div>

      <EmptyState
        v-else
        title="Belum ada tiket aktif"
        description="Jelajahi event menarik di marketplace TERRA dan pesan tiket pertamamu."
      >
        <RouterLink
          to="/events"
          class="inline-block rounded-full border border-black bg-[#72a5e4] px-6 py-2.5 text-xs font-bold text-black hover:bg-[#5c93d9]"
        >
          Cari Event Sekarang &rarr;
        </RouterLink>
      </EmptyState>
    </section>

    <!-- TAB 2: RIWAYAT PESANAN -->
    <section v-else-if="activeTab === 'orders'" class="space-y-4">
      <div v-if="workspace.myOrders.length > 0" class="space-y-4">
        <div
          v-for="ord in workspace.myOrders"
          :key="ord.id"
          class="rounded-2xl border border-black bg-white p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        >
          <div class="space-y-1.5">
            <div class="flex flex-wrap items-center gap-2">
              <span class="font-mono text-xs font-bold text-black">{{ ord.order_number }}</span>
              <span
                class="rounded-full border border-black px-2.5 py-0.5 text-[10px] font-bold"
                :class="
                  ord.order_status === 'Cancelled'
                    ? 'bg-rose-100 text-rose-800'
                    : 'bg-[#72a5e4] text-black'
                "
              >
                {{ ord.order_status }}
              </span>
              <span class="rounded-full border border-black/30 bg-[#fafaf9] px-2.5 py-0.5 text-[10px] font-semibold text-slate-700">
                Pembayaran: {{ ord.payment_status }}
              </span>
            </div>
            <p class="text-xs text-slate-600">
              Jumlah: <strong>{{ ord.quantity }} tiket</strong> • Total:
              <strong class="text-black">{{ formatCurrency(ord.total) }}</strong>
            </p>
            <p class="text-[11px] text-slate-400">
              Dibuat pada {{ formatDateTime(ord.created_at) }}
            </p>
          </div>

          <div class="flex flex-wrap items-center gap-2 shrink-0">
            <button
              v-if="ord.order_status === 'Pending' && Number(ord.total || 0) > 0"
              type="button"
              @click="handlePayOrder(ord)"
              :disabled="payingOrderId === ord.id"
              class="inline-flex items-center gap-1.5 rounded-full border border-black bg-[#72a5e4] px-4 py-1.5 text-xs font-bold text-black hover:bg-[#5c93d9] disabled:opacity-50 cursor-pointer"
            >
              <CreditCard class="h-3.5 w-3.5" />
              <span>{{ payingOrderId === ord.id ? 'Membuka...' : 'Bayar Sekarang' }}</span>
            </button>
            <button
              v-if="ord.order_status === 'Pending' && Number(ord.total || 0) > 0"
              type="button"
              @click="handlePayOrder(ord, { forceNew: true })"
              :disabled="payingOrderId === ord.id"
              class="inline-flex items-center gap-1.5 rounded-full border border-black bg-white px-3.5 py-1.5 text-xs font-bold text-black hover:bg-slate-100 disabled:opacity-50 cursor-pointer"
            >
              <Repeat class="h-3.5 w-3.5" />
              <span>Ganti Metode</span>
            </button>
            <button
              v-if="ord.order_status === 'Pending' && Number(ord.total || 0) > 0"
              type="button"
              @click="handleSyncOrder(ord.id)"
              :disabled="syncingOrderId === ord.id"
              class="inline-flex items-center gap-1.5 rounded-full border border-black bg-white px-3.5 py-1.5 text-xs font-bold text-black hover:bg-slate-100 disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw class="h-3.5 w-3.5" :class="syncingOrderId === ord.id ? 'animate-spin' : ''" />
              <span>{{ syncingOrderId === ord.id ? 'Cek...' : 'Cek Status' }}</span>
            </button>
            <button
              v-if="ord.order_status !== 'Cancelled'"
              type="button"
              @click="handleCancelOrder(ord.id)"
              :disabled="cancellingOrderId === ord.id"
              class="rounded-full border border-black bg-white px-4 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-50 disabled:opacity-50 cursor-pointer"
            >
              {{ cancellingOrderId === ord.id ? 'Membatalkan...' : 'Batalkan Pesanan' }}
            </button>
          </div>
        </div>
      </div>

      <EmptyState
        v-else
        title="Belum ada riwayat pesanan"
        description="Transaksi pembelian tiket Anda akan muncul lengkap di sini."
      >
        <RouterLink
          to="/events"
          class="inline-block rounded-full border border-black bg-[#72a5e4] px-6 py-2.5 text-xs font-bold text-black hover:bg-[#5c93d9]"
        >
          Jelajahi Marketplace &rarr;
        </RouterLink>
      </EmptyState>
    </section>

    <!-- TAB 3: PENGATURAN PROFIL -->
    <section v-else>
      <form
        @submit.prevent="saveProfile"
        class="rounded-2xl border border-black bg-[#fafaf9] p-6 sm:p-8 space-y-5 text-xs max-w-2xl"
      >
        <div class="space-y-1">
          <h2 class="text-lg font-bold text-black font-editorial">Pengaturan Data Diri</h2>
          <p class="text-xs text-slate-600">Perbarui informasi nama, kontak telepon, dan bio akun peserta Anda.</p>
        </div>

        <div class="space-y-1.5">
          <label class="block font-bold text-black">Nama Lengkap</label>
          <input
            v-model="fullName"
            type="text"
            required
            class="w-full rounded-xl border border-black bg-white p-3 text-xs sm:text-sm text-black focus:outline-hidden"
          />
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div class="space-y-1.5">
            <label class="block font-bold text-black">Email Akun</label>
            <input
              v-model="email"
              type="email"
              disabled
              class="w-full rounded-xl border border-black/40 bg-slate-100 p-3 text-xs sm:text-sm text-slate-500"
            />
          </div>
          <div class="space-y-1.5">
            <label class="block font-bold text-black">Nomor WhatsApp / Telepon</label>
            <input
              v-model="phone"
              type="tel"
              placeholder="0812xxxxxxxx"
              class="w-full rounded-xl border border-black bg-white p-3 text-xs sm:text-sm text-black focus:outline-hidden"
            />
          </div>
        </div>

        <div class="space-y-1.5">
          <label class="block font-bold text-black">Bio Singkat</label>
          <textarea
            v-model="bio"
            rows="3"
            placeholder="Ceritakan singkat tentang profil atau minat event Anda..."
            class="w-full rounded-xl border border-black bg-white p-3 text-xs sm:text-sm text-black focus:outline-hidden resize-none"
          />
        </div>

        <div class="pt-2 flex justify-end">
          <button
            type="submit"
            :disabled="saving"
            class="rounded-full bg-black px-8 py-3 text-xs font-bold text-white hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50"
          >
            {{ saving ? 'Menyimpan...' : 'Simpan Perubahan' }}
          </button>
        </div>
      </form>
    </section>
  </div>
</template>

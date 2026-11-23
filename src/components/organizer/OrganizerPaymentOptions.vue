<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import api from '@/services/api'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'
import { MessageCircle, CreditCard, Copy, Lock, CheckCircle2, RefreshCw } from 'lucide-vue-next'

const props = defineProps({
  mode: {
    type: String,
    default: 'register' // 'register' | 'locked'
  },
  defaultOrgName: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['refresh-access'])

const authStore = useAuthStore()
const toast = useToastStore()

const adminWhatsapp = ref('6287897192601')
const checking = ref(false)

const form = reactive({
  organization_name: props.defaultOrgName || '',
  customer_name: authStore.user?.full_name || '',
  email: authStore.user?.email || '',
  contact: authStore.user?.phone || ''
})

watch(
  () => authStore.user,
  (u) => {
    if (!u) return
    if (!form.customer_name) form.customer_name = u.full_name || ''
    if (!form.email) form.email = u.email || ''
    if (!form.contact) form.contact = u.phone || ''
  },
  { immediate: true }
)

onMounted(async () => {
  try {
    const res = await api.get('/auth/organizer/plans')
    if (res?.data?.admin_whatsapp) {
      adminWhatsapp.value = res.data.admin_whatsapp
    }
  } catch {
    // Fallback default number stays
  }
})

const whatsappMessage = computed(() => {
  const actionLabel =
    props.mode === 'locked'
      ? 'aktivasi / upgrade paket event TERRA (Starter Rp 49k / Pro Rp 129k / Ultimate Rp 299k / Bundle)'
      : 'pendaftaran & aktivasi akun User Organizer + paket event TERRA (Starter 49k / Pro 129k / Ultimate 299k / Bundle)'

  return [
    `Halo Admin TERRA, saya ingin melakukan ${actionLabel}:`,
    `- Nama Organisasi: ${form.organization_name || '-'}`,
    `- Nama Pelanggan: ${form.customer_name || '-'}`,
    `- Email: ${form.email || '-'}`,
    `- Kontak: ${form.contact || '-'}`
  ].join('\n')
})

const whatsappHref = computed(() => {
  const num = String(adminWhatsapp.value || '6287897192601').replace(/[^0-9]/g, '')
  return `https://wa.me/${num}?text=${encodeURIComponent(whatsappMessage.value)}`
})

async function copyTemplate() {
  try {
    await navigator.clipboard.writeText(whatsappMessage.value)
    toast.success('Template pesan WhatsApp disalin ke clipboard!')
  } catch {
    toast.info('Silakan salin manual dari kotak pratinjau pesan.')
  }
}

async function handleCheckAccess() {
  checking.value = true
  try {
    await authStore.fetchCurrentUser()
    emit('refresh-access')
    if (authStore.user?.subscription?.is_active) {
      toast.success('Langganan Anda aktif! Semua modul dibuka kembali.')
    } else {
      toast.info('Status masih belum aktif. Pastikan Admin telah memproses aktivasi akun Anda.')
    }
  } finally {
    checking.value = false
  }
}
</script>

<template>
  <div class="space-y-5">
    <div
      v-if="mode === 'locked'"
      class="rounded-2xl border-2 border-black bg-[#fafaf9] p-6 shadow-[4px_4px_0_#000] space-y-3"
    >
      <div class="flex flex-wrap items-center justify-between gap-3">
        <span class="inline-flex items-center gap-1.5 rounded-full border border-black bg-rose-100 px-3.5 py-1 text-[11px] font-bold text-rose-800">
          <Lock class="h-3.5 w-3.5" />
          <span>Akses Modul Ditutup Sementara</span>
        </span>
        <button
          type="button"
          @click="handleCheckAccess"
          :disabled="checking"
          class="inline-flex items-center gap-1.5 rounded-full border border-black bg-white px-4 py-1.5 text-xs font-bold text-black hover:bg-slate-100 cursor-pointer disabled:opacity-50"
        >
          <RefreshCw class="h-3.5 w-3.5" :class="checking ? 'animate-spin' : ''" />
          <span>{{ checking ? 'Memeriksa...' : 'Cek Ulang Status Akses' }}</span>
        </button>
      </div>
      <h2 class="text-2xl font-bold text-black font-editorial">
        Aktifkan Paket Full Access 1 Bulan (Rp 100.000)
      </h2>
      <p class="text-xs sm:text-sm text-slate-600 leading-relaxed">
        Masa gratis / langganan Organizer Anda telah habis atau belum dibayar. Semua pekerjaan dan data di dalam modul (event, jadwal, peserta, tiket, keuangan) tetap tersimpan aman dan akan terbuka kembali setelah pembayaran dikonfirmasi.
      </p>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
      <!-- Opsi 1: Hubungi Admin via WhatsApp -->
      <div class="rounded-2xl border-2 border-black bg-white p-5 space-y-4 flex flex-col justify-between shadow-[4px_4px_0_#000]">
        <div class="space-y-3">
          <div class="flex items-center justify-between gap-2">
            <span class="inline-flex items-center gap-1.5 rounded-full border border-black bg-[#72a5e4] px-3 py-0.5 text-[10px] font-bold uppercase text-black">
              <MessageCircle class="h-3 w-3" /> Opsi 1 • Tersedia Sekarang
            </span>
            <span class="text-xs font-black text-black">Mulai Rp 49.000 / event</span>
          </div>

          <div>
            <h3 class="text-base font-bold text-black">Hubungi Admin via WhatsApp</h3>
            <p class="text-[11px] text-slate-600 mt-0.5">
              Lengkapi data di bawah agar Admin menambahkan / mengaktifkan akun Organizer Anda secara langsung.
            </p>
          </div>

          <div class="space-y-2 text-xs">
            <div>
              <label class="block text-[11px] font-bold text-black mb-1">Nama Organisasi</label>
              <input
                v-model="form.organization_name"
                type="text"
                placeholder="Contoh: Nusantara Event Lab"
                class="w-full rounded-lg border border-black bg-[#fafaf9] px-3 py-2 text-xs text-black focus:outline-hidden"
              />
            </div>
            <div>
              <label class="block text-[11px] font-bold text-black mb-1">Nama Pelanggan (PIC)</label>
              <input
                v-model="form.customer_name"
                type="text"
                placeholder="Nama lengkap Anda"
                class="w-full rounded-lg border border-black bg-[#fafaf9] px-3 py-2 text-xs text-black focus:outline-hidden"
              />
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label class="block text-[11px] font-bold text-black mb-1">Email</label>
                <input
                  v-model="form.email"
                  type="email"
                  placeholder="email@organisasi.id"
                  class="w-full rounded-lg border border-black bg-[#fafaf9] px-3 py-2 text-xs text-black focus:outline-hidden"
                />
              </div>
              <div>
                <label class="block text-[11px] font-bold text-black mb-1">Kontak / No. WA</label>
                <input
                  v-model="form.contact"
                  type="tel"
                  placeholder="0812xxxxxxxx"
                  class="w-full rounded-lg border border-black bg-[#fafaf9] px-3 py-2 text-xs text-black focus:outline-hidden"
                />
              </div>
            </div>
          </div>

          <div class="rounded-xl border border-black/20 bg-[#fafaf9] p-3 space-y-1.5">
            <div class="flex items-center justify-between">
              <span class="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Template Pesan Otomatis
              </span>
              <button
                type="button"
                @click="copyTemplate"
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
          class="w-full rounded-full border border-black bg-[#72a5e4] py-3 px-4 text-xs font-bold text-black hover:bg-[#5c93d9] transition-colors inline-flex items-center justify-center gap-2 text-center"
        >
          <MessageCircle class="h-4 w-4" />
          <span>Hubungi Admin via WA ↗</span>
        </a>
      </div>

      <!-- Opsi 2: Payment Gateway (Soon) -->
      <div class="rounded-2xl border border-black bg-[#fafaf9] p-5 space-y-4 flex flex-col justify-between opacity-90">
        <div class="space-y-3">
          <div class="flex items-center justify-between gap-2">
            <span class="inline-flex items-center gap-1.5 rounded-full border border-black bg-white px-3 py-0.5 text-[10px] font-bold uppercase text-slate-700">
              <CreditCard class="h-3 w-3" /> Opsi 2 • Payment Gateway
            </span>
            <span class="rounded-full border border-black bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold uppercase text-amber-900">
              Soon
            </span>
          </div>

          <div>
            <h3 class="text-base font-bold text-black">Pembayaran Otomatis (Payment Gateway)</h3>
            <p class="text-xs text-slate-600 mt-1 leading-relaxed">
              Pembayaran instan via QRIS, Virtual Account (BCA/Mandiri/BNI/BRI), dan E-Wallet otomatis akan segera tersedia di pembaruan berikutnya.
            </p>
          </div>

          <ul class="space-y-1.5 text-[11px] text-slate-600 pt-1">
            <li class="flex items-center gap-2">
              <CheckCircle2 class="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <span>Aktivasi instan otomatis 24/7 setelah transfer</span>
            </li>
            <li class="flex items-center gap-2">
              <CheckCircle2 class="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <span>QRIS, Virtual Account Bank, &amp; E-Wallet</span>
            </li>
            <li class="flex items-center gap-2">
              <CheckCircle2 class="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <span>Invoice &amp; perpanjangan bulanan otomatis</span>
            </li>
          </ul>
        </div>

        <button
          type="button"
          disabled
          class="w-full rounded-full border border-black/40 bg-slate-200 py-3 px-4 text-xs font-bold text-slate-600 cursor-not-allowed"
        >
          Payment Gateway (Segera Hadir / Soon)
        </button>
      </div>
    </div>
  </div>
</template>

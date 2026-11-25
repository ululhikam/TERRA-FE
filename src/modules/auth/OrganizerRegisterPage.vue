<script setup>
import { ref } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import { z } from 'zod'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'
import BubbleGraffiti from '@/components/common/BubbleGraffiti.vue'
import TerraLogo from '@/components/common/TerraLogo.vue'
import { User, Building2, Mail, Lock, ArrowLeft, Crown, CheckCircle2 } from 'lucide-vue-next'

const router = useRouter()
const authStore = useAuthStore()
const toast = useToastStore()

const fullName = ref('')
const orgName = ref('')
const email = ref('')
const password = ref('')
const loading = ref(false)
const errorMsg = ref('')

const schema = z.object({
  full_name: z.string().min(2, 'Nama lengkap minimal 2 karakter'),
  organization_name: z.string().min(3, 'Nama organisasi minimal 3 karakter'),
  email: z.string().email('Format email tidak valid'),
  password: z.string().min(6, 'Password minimal 6 karakter')
})

function handleGoogleRegister() {
  authStore.startGoogleAuth('/dashboard/billing', {
    role: 'organizer',
    organizationName: orgName.value.trim()
  })
}

async function handleSubmit() {
  errorMsg.value = ''
  const parsed = schema.safeParse({
    full_name: fullName.value,
    organization_name: orgName.value,
    email: email.value,
    password: password.value
  })
  if (!parsed.success) {
    errorMsg.value = parsed.error.issues[0].message
    return
  }
  loading.value = true
  try {
    const res = await authStore.register({
      ...parsed.data,
      role: 'organizer',
      plan: 'unsubscribed'
    })
    if (res?.requires_otp) {
      toast.info('Kode OTP verifikasi dikirim ke email Organizer Anda.')
      router.push({ name: 'verify-otp', query: { email: parsed.data.email, portal: 'organizer' } })
      return
    }
    toast.success('Akun dibuat! Silakan aktifkan langganan Rp 50.000/bulan via Midtrans.')
    router.push('/dashboard/billing')
  } catch (err) {
    if (err?.code === 'EMAIL_NOT_VERIFIED' && err?.details?.[0]?.otp_session_token) {
      const ctx = err.details[0]
      authStore.setPendingOtp({
        email: ctx.email,
        otp_session_token: ctx.otp_session_token,
        portal: 'organizer'
      })
      toast.info(err.message || 'Email belum terverifikasi OTP.')
      router.push({ name: 'verify-otp', query: { email: ctx.email, portal: 'organizer' } })
      return
    }
    errorMsg.value = err.message || 'Gagal mendaftar organizer.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center px-4 py-10 bg-[#fafaf9] bg-grid-paper">
    <div class="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
      <!-- Left Branding Frame -->
      <div class="lg:col-span-5 relative border border-black bg-[#fafaf9] p-8 sm:p-10 flex flex-col justify-between overflow-hidden min-h-[520px]">
        <div class="absolute top-0 left-0 flex flex-col">
          <div class="h-3.5 w-7 bg-black" />
          <div class="h-3.5 w-3.5 bg-black" />
        </div>
        <div class="absolute bottom-0 right-0 flex flex-col items-end">
          <div class="h-4 w-5 bg-black" />
          <div class="h-4 w-10 bg-black" />
        </div>

        <div class="space-y-4 pt-2">
          <TerraLogo size="lg" />
          <p class="text-2xl sm:text-[28px] font-editorial text-black leading-[1.25]">
            Mulai kelola event<br />
            profesional dengan<br />
            13 sistem modular.
          </p>
        </div>

        <div class="-mx-8 sm:-mx-10 my-4 bg-white/60 py-1">
          <BubbleGraffiti />
        </div>

        <div class="rounded-2xl border-2 border-black bg-white p-4 space-y-2 shadow-[3px_3px_0_#000]">
          <div class="flex items-center justify-between">
            <span class="inline-flex items-center gap-1 rounded-full border border-black bg-[#72a5e4] px-2.5 py-0.5 text-[10px] font-bold text-black">
              <Crown class="h-3 w-3" /> TERRA Studio Subscribe
            </span>
            <span class="font-mono text-sm font-black text-black">Rp 50.000 / bln</span>
          </div>
          <ul class="space-y-1 text-[11px] text-slate-700">
            <li class="flex items-center gap-1.5">
              <CheckCircle2 class="h-3.5 w-3.5 text-emerald-600 shrink-0" />
              <span>Akses penuh seluruh 13 modul &amp; event tak terbatas</span>
            </li>
            <li class="flex items-center gap-1.5">
              <CheckCircle2 class="h-3.5 w-3.5 text-emerald-600 shrink-0" />
              <span>Aktivasi instan via Midtrans (QRIS, VA, E-Wallet)</span>
            </li>
          </ul>
        </div>
      </div>

      <!-- Right Form -->
      <div class="lg:col-span-7 flex flex-col justify-center space-y-5 px-1 sm:px-4">
        <div class="space-y-3">
          <RouterLink
            to="/"
            class="inline-flex items-center gap-1.5 text-xs font-medium text-black hover:underline transition-colors"
          >
            <ArrowLeft class="h-3.5 w-3.5" />
            <span>Kembali ke Marketplace</span>
          </RouterLink>

          <div>
            <span class="inline-block rounded-full border border-black bg-white px-5 py-1 text-xs font-semibold text-black">
              Registrasi Event Organizer
            </span>
            <h1 class="mt-3 text-3xl sm:text-4xl tracking-tight text-black leading-tight">
              <strong class="font-sans font-black block">Daftar Studio</strong>
              <span class="font-editorial font-normal block">Penyelenggara Event</span>
            </h1>
            <p class="text-xs text-slate-600 mt-1.5">
              Daftar akun gratis terlebih dahulu, lalu aktifkan langganan <strong>Rp 50.000 / bulan</strong> via Midtrans untuk membuka semua fitur Studio.
            </p>
          </div>
        </div>

        <!-- Google OAuth Register -->
        <button
          type="button"
          @click="handleGoogleRegister"
          class="w-full flex items-center justify-center gap-2.5 rounded-full border-2 border-black bg-white py-3 text-xs sm:text-sm font-bold text-black hover:bg-slate-100 shadow-[3px_3px_0_#000] transition-colors cursor-pointer"
        >
          <svg class="h-4 w-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z" />
            <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24z" />
            <path fill="#FBBC05" d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14z" />
            <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96z" />
          </svg>
          <span>Daftar Instan dengan Google</span>
        </button>

        <div class="relative flex items-center py-0.5">
          <div class="flex-grow border-t border-black/15" />
          <span class="mx-3 shrink text-[11px] font-semibold uppercase tracking-wider text-slate-400">atau daftar dengan email</span>
          <div class="flex-grow border-t border-black/15" />
        </div>

        <form @submit.prevent="handleSubmit" class="space-y-3.5 rounded-2xl border border-black bg-white p-6">
          <div v-if="errorMsg" class="rounded-xl border border-rose-300 bg-rose-50 p-3 text-xs text-rose-700">
            {{ errorMsg }}
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div class="space-y-1">
              <label class="block text-xs font-semibold text-black">Nama Penyelenggara (PIC)</label>
              <div class="relative">
                <User class="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
                <input
                  v-model="fullName"
                  type="text"
                  required
                  class="w-full rounded-xl border border-black bg-white pl-10 pr-4 py-2.5 text-xs sm:text-sm text-black placeholder:text-slate-400 focus:outline-hidden"
                  placeholder="Hikam Pratama"
                />
              </div>
            </div>

            <div class="space-y-1">
              <label class="block text-xs font-semibold text-black">Nama Organisasi / Komunitas</label>
              <div class="relative">
                <Building2 class="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
                <input
                  v-model="orgName"
                  type="text"
                  required
                  class="w-full rounded-xl border border-black bg-white pl-10 pr-4 py-2.5 text-xs sm:text-sm text-black placeholder:text-slate-400 focus:outline-hidden"
                  placeholder="Nama organisasi Anda"
                />
              </div>
            </div>
          </div>

          <div class="space-y-1">
            <label class="block text-xs font-semibold text-black">Email Resmi (untuk Kode OTP)</label>
            <div class="relative">
              <Mail class="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
              <input
                v-model="email"
                type="email"
                required
                class="w-full rounded-xl border border-black bg-white pl-10 pr-4 py-2.5 text-xs sm:text-sm text-black placeholder:text-slate-400 focus:outline-hidden"
                placeholder="organizer@organisasi.id"
              />
            </div>
          </div>

          <div class="space-y-1">
            <label class="block text-xs font-semibold text-black">Password</label>
            <div class="relative">
              <Lock class="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
              <input
                v-model="password"
                type="password"
                required
                class="w-full rounded-xl border border-black bg-white pl-10 pr-4 py-2.5 text-xs sm:text-sm text-black placeholder:text-slate-400 focus:outline-hidden"
                placeholder="Minimal 6 karakter"
              />
            </div>
          </div>

          <button
            type="submit"
            :disabled="loading"
            class="w-full rounded-full border border-black bg-[#72a5e4] py-3.5 text-xs sm:text-sm font-bold text-black hover:bg-[#5c93d9] transition-colors disabled:opacity-50 mt-2 cursor-pointer"
          >
            {{ loading ? 'Mendaftarkan & Mengirim OTP...' : 'Daftar Akun & Lanjut Berlangganan' }}
          </button>
        </form>

        <div class="pt-1 text-xs text-slate-500">
          <p>
            Sudah terdaftar sebagai Organizer?
            <RouterLink to="/organizer/login" class="font-bold text-black hover:underline">Masuk ke Studio</RouterLink>
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

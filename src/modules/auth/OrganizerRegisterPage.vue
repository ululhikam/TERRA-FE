<script setup>
import { ref } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import { z } from 'zod'
import { useAuthStore } from '@/stores/auth'
import { useEventWorkspaceStore } from '@/stores/eventWorkspace'
import { useToastStore } from '@/stores/toast'
import BubbleGraffiti from '@/components/common/BubbleGraffiti.vue'
import TerraLogo from '@/components/common/TerraLogo.vue'
import OrganizerPaymentOptions from '@/components/organizer/OrganizerPaymentOptions.vue'
import { User, Building2, Mail, Lock, ArrowLeft, Sparkles, Crown, CheckCircle2 } from 'lucide-vue-next'

const router = useRouter()
const authStore = useAuthStore()
const workspace = useEventWorkspaceStore()
const toast = useToastStore()

// 'choose_plan' | 'trial_form' | 'paid_options'
const step = ref('choose_plan')

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
      plan: 'free_trial'
    })
    if (res?.requires_otp) {
      toast.info('Kode OTP verifikasi dikirim ke email Organizer Anda.')
      router.push({ name: 'verify-otp', query: { email: parsed.data.email, portal: 'organizer' } })
      return
    }
    await workspace.fetchOrganizerWorkspace()
    toast.success('Akun & Organisasi Free Trial 2 minggu berhasil dibuat!')
    router.push('/dashboard')
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
      <div class="lg:col-span-5 relative border border-black bg-[#fafaf9] p-8 sm:p-10 flex flex-col justify-between overflow-hidden min-h-[500px]">
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

        <div class="pt-2 space-y-1">
          <span class="text-[10px] font-bold uppercase tracking-widest text-black block">
            ORGANIZER PORTAL
          </span>
          <p class="text-[11px] text-slate-600">
            Tersedia Free Trial 2 Minggu (verifikasi OTP + ganti email bila salah) atau aktivasi Full Access 1 Bulan Rp 100.000.
          </p>
        </div>
      </div>

      <!-- Right Dynamic Onboarding Steps -->
      <div class="lg:col-span-7 flex flex-col justify-center space-y-5 px-1 sm:px-4">
        <div class="space-y-3">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <RouterLink
              to="/"
              class="inline-flex items-center gap-1.5 text-xs font-medium text-black hover:underline transition-colors"
            >
              <ArrowLeft class="h-3.5 w-3.5" />
              <span>Kembali ke Marketplace</span>
            </RouterLink>

            <button
              v-if="step !== 'choose_plan'"
              type="button"
              @click="step = 'choose_plan'"
              class="inline-flex items-center gap-1 rounded-full border border-black bg-white px-3.5 py-1 text-[11px] font-bold text-black hover:bg-slate-100 cursor-pointer"
            >
              <ArrowLeft class="h-3 w-3" /> Pilih Paket Lain
            </button>
          </div>

          <div>
            <span class="inline-block rounded-full border border-black bg-white px-5 py-1 text-xs font-semibold text-black">
              {{
                step === 'choose_plan'
                  ? 'Pilih Paket Organizer'
                  : step === 'trial_form'
                    ? 'Free Trial 2 Minggu • Register Manual'
                    : 'Full Access 1 Bulan • Opsi Pembayaran'
              }}
            </span>
            <h1 class="mt-3 text-3xl sm:text-4xl tracking-tight text-black leading-tight">
              <strong class="font-sans font-black block">
                {{
                  step === 'choose_plan'
                    ? 'Gabung Studio'
                    : step === 'trial_form'
                      ? 'Daftar Free Trial'
                      : 'Aktivasi 1 Bulan'
                }}
              </strong>
              <span class="font-editorial font-normal block">
                {{
                  step === 'choose_plan'
                    ? 'Penyelenggara Event'
                    : step === 'trial_form'
                      ? 'Verifikasi OTP Email'
                      : 'Pilih Metode Aktivasi'
                }}
              </span>
            </h1>
          </div>
        </div>

        <!-- STEP 1: 2 CARDS (FREE TRIAL 2 MINGGU vs 1 BULAN BAYAR FULL ACCESS 100K) -->
        <div v-if="step === 'choose_plan'" class="grid grid-cols-1 sm:grid-cols-2 gap-4 items-stretch">
          <!-- Card 1: Free Plan + 14 Days Pro Access Trial -->
          <div class="rounded-2xl border-2 border-black bg-white p-6 space-y-5 flex flex-col justify-between shadow-[4px_4px_0_#000]">
            <div class="space-y-3">
              <div class="flex items-center justify-between gap-2">
                <span class="inline-flex items-center gap-1 rounded-full border border-black bg-[#fafaf9] px-3 py-0.5 text-[10px] font-bold uppercase text-black">
                  <Sparkles class="h-3 w-3" /> Free + 14 Days Pro Trial
                </span>
                <span class="text-sm font-black text-black">Rp0</span>
              </div>

              <div>
                <h2 class="text-lg font-bold text-black">Mulai Gratis &amp; 14 Hari Pro Access</h2>
                <p class="text-xs text-slate-600 mt-1">
                  Gratis selamanya untuk paket Free (100 peserta) + bonus uji coba 14 Days Pro Access per event dengan verifikasi OTP email.
                </p>
              </div>

              <ul class="space-y-1.5 text-xs text-slate-700 pt-1">
                <li class="flex items-center gap-2">
                  <CheckCircle2 class="h-3.5 w-3.5 text-black shrink-0" />
                  <span>Tanpa kartu kredit &amp; tanpa biaya otomatis</span>
                </li>
                <li class="flex items-center gap-2">
                  <CheckCircle2 class="h-3.5 w-3.5 text-black shrink-0" />
                  <span>Registrasi manual + verifikasi OTP email</span>
                </li>
                <li class="flex items-center gap-2">
                  <CheckCircle2 class="h-3.5 w-3.5 text-black shrink-0" />
                  <span>Opsi ubah email jika email OTP salah</span>
                </li>
              </ul>
            </div>

            <button
              type="button"
              @click="step = 'trial_form'"
              class="w-full rounded-full border border-black bg-[#72a5e4] py-3 text-xs font-bold text-black hover:bg-[#5c93d9] transition-colors cursor-pointer"
            >
              Connect &rarr;
            </button>
          </div>

          <!-- Card 2: Paid Per-Event Tiers (Starter 49k / Pro 129k / Ultimate 299k) -->
          <div class="rounded-2xl border-2 border-black bg-[#fafaf9] p-6 space-y-5 flex flex-col justify-between shadow-[4px_4px_0_#000]">
            <div class="space-y-3">
              <div class="flex items-center justify-between gap-2">
                <span class="inline-flex items-center gap-1 rounded-full border border-black bg-[#72a5e4] px-3 py-0.5 text-[10px] font-bold uppercase text-black">
                  <Crown class="h-3 w-3" /> Paket Per Event
                </span>
                <span class="text-sm font-black text-black">Mulai 49k</span>
              </div>

              <div>
                <h2 class="text-lg font-bold text-black">Starter 49k / Pro 129k / Ultimate 299k</h2>
                <p class="text-xs text-slate-600 mt-1">
                  Bayar per event sesuai skala acara (hingga 10.000 peserta), diskon Early Access &amp; BEM/UKM/Komunitas, serta Bundle hemat.
                </p>
              </div>

              <ul class="space-y-1.5 text-xs text-slate-700 pt-1">
                <li class="flex items-center gap-2">
                  <CheckCircle2 class="h-3.5 w-3.5 text-black shrink-0" />
                  <span>Aktivasi cepat via WhatsApp Admin TERRA</span>
                </li>
                <li class="flex items-center gap-2">
                  <CheckCircle2 class="h-3.5 w-3.5 text-black shrink-0" />
                  <span>Template pesan lengkap siap kirim</span>
                </li>
                <li class="flex items-center gap-2">
                  <CheckCircle2 class="h-3.5 w-3.5 text-black shrink-0" />
                  <span>Payment Gateway (Segera Hadir / Soon)</span>
                </li>
              </ul>
            </div>

            <button
              type="button"
              @click="step = 'paid_options'"
              class="w-full rounded-full bg-black py-3 text-xs font-bold text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Setuju &rarr;
            </button>
          </div>
        </div>

        <!-- STEP 2A: FORM REGISTER MANUAL + VERIFY OTP EMAIL -->
        <form v-else-if="step === 'trial_form'" @submit.prevent="handleSubmit" class="space-y-3.5 rounded-2xl border border-black bg-white p-6">
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
            <p class="text-[11px] text-slate-500">
              Jika email salah atau gagal terkirim, Anda dapat langsung menggantinya di halaman verifikasi OTP.
            </p>
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
            class="w-full rounded-full bg-black py-3.5 text-xs sm:text-sm font-semibold text-white hover:bg-slate-800 transition-colors disabled:opacity-50 mt-2 cursor-pointer"
          >
            {{ loading ? 'Mendaftarkan & Mengirim OTP...' : 'Buat Akun Trial 2 Minggu' }}
          </button>
        </form>

        <!-- STEP 2B: 2 CARDS (HUBUNGI ADMIN VIA WA + PAYMENT GATEWAY SOON) -->
        <div v-else class="space-y-4">
          <OrganizerPaymentOptions mode="register" />
          <p class="text-xs text-slate-600">
            Sudah dikirimkan akun oleh Admin setelah konfirmasi WhatsApp?
            <RouterLink to="/organizer/login" class="font-bold text-black underline ml-1">
              Masuk ke Studio Organizer &rarr;
            </RouterLink>
          </p>
        </div>

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

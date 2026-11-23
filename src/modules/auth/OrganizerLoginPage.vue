<script setup>
import { ref } from 'vue'
import { useRouter, useRoute, RouterLink } from 'vue-router'
import { z } from 'zod'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'
import BubbleGraffiti from '@/components/common/BubbleGraffiti.vue'
import TerraLogo from '@/components/common/TerraLogo.vue'
import { Mail, Lock, ArrowLeft } from 'lucide-vue-next'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const toast = useToastStore()

const email = ref('')
const password = ref('')
const loading = ref(false)
const errorMsg = ref('')

const schema = z.object({
  email: z.string().email('Format email tidak valid'),
  password: z.string().min(6, 'Password minimal 6 karakter')
})

async function handleSubmit() {
  errorMsg.value = ''
  const parsed = schema.safeParse({ email: email.value, password: password.value })
  if (!parsed.success) {
    errorMsg.value = parsed.error.issues[0].message
    return
  }
  loading.value = true
  try {
    const user = await authStore.login({
      email: email.value,
      password: password.value,
      portalRole: 'organizer'
    })
    toast.success(`Selamat datang di Studio, ${user.full_name}!`)
    const redirect = route.query.redirect || '/dashboard'
    router.push(redirect)
  } catch (err) {
    if (err?.code === 'EMAIL_NOT_VERIFIED' && err?.details?.[0]?.otp_session_token) {
      const ctx = err.details[0]
      authStore.setPendingOtp({
        email: ctx.email,
        otp_session_token: ctx.otp_session_token,
        portal: 'organizer'
      })
      toast.info('Email Organizer belum diverifikasi OTP.')
      router.push({ name: 'verify-otp', query: { email: ctx.email, portal: 'organizer' } })
      return
    }
    errorMsg.value = err.message || 'Gagal masuk ke dashboard organizer.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center px-4 py-10 bg-[#fafaf9] bg-grid-paper">
    <div class="w-full max-w-5xl grid grid-cols-1 md:grid-cols-12 gap-10 items-center">
      <!-- Left Branding Frame with Stepped Black Corner Blocks -->
      <div class="md:col-span-6 relative border border-black bg-[#fafaf9] p-8 sm:p-10 flex flex-col justify-between overflow-hidden min-h-[500px]">
        <!-- Top-left stepped black block -->
        <div class="absolute top-0 left-0 flex flex-col">
          <div class="h-3.5 w-7 bg-black" />
          <div class="h-3.5 w-3.5 bg-black" />
        </div>
        <!-- Bottom-right stepped black block -->
        <div class="absolute bottom-0 right-0 flex flex-col items-end">
          <div class="h-4 w-5 bg-black" />
          <div class="h-4 w-10 bg-black" />
        </div>

        <div class="space-y-4 pt-2">
          <TerraLogo size="lg" />
          <p class="text-2xl sm:text-[28px] font-editorial text-black leading-[1.25]">
            Kelola organisasi,<br />
            modul event, tiket,<br />
            dan peserta.
          </p>
        </div>

        <div class="-mx-8 sm:-mx-10 my-4 bg-white/60 py-1">
          <BubbleGraffiti />
        </div>

        <div class="pt-2">
          <span class="text-[10px] font-bold uppercase tracking-widest text-black">
            ORGANIZER PORTAL
          </span>
        </div>
      </div>

      <!-- Right Form -->
      <div class="md:col-span-6 flex flex-col justify-center space-y-6 px-2 sm:px-6">
        <div class="space-y-4">
          <RouterLink
            to="/"
            class="inline-flex items-center gap-1.5 text-xs font-medium text-black hover:underline transition-colors"
          >
            <ArrowLeft class="h-3.5 w-3.5" />
            <span>Kembali ke Marketplace</span>
          </RouterLink>

          <div>
            <span class="inline-block rounded-full border border-black bg-white px-5 py-1 text-xs font-semibold text-black">
              Organizer Portal
            </span>
            <h1 class="mt-4 text-3xl sm:text-4xl tracking-tight text-black leading-tight">
              <strong class="font-sans font-black block">Masuk Organizer</strong>
              <span class="font-editorial font-normal block">Studio</span>
            </h1>
          </div>
        </div>

        <form @submit.prevent="handleSubmit" class="space-y-4">
          <div v-if="errorMsg" class="rounded-xl border border-rose-300 bg-rose-50 p-3 text-xs text-rose-700">
            {{ errorMsg }}
          </div>

          <div class="space-y-1.5">
            <label class="block text-xs font-semibold text-black">Email Organizer</label>
            <div class="relative">
              <Mail class="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" />
              <input
                v-model="email"
                type="email"
                required
                class="w-full rounded-xl border border-black bg-white pl-10 pr-4 py-3 text-xs sm:text-sm text-black placeholder:text-slate-400 focus:outline-hidden"
                placeholder="organizer@nusantaratech.id"
              />
            </div>
          </div>

          <div class="space-y-1.5">
            <div class="flex items-center justify-between">
              <label class="block text-xs font-semibold text-black">Password</label>
              <RouterLink to="/forgot-password" class="text-[11px] font-bold text-black hover:underline">
                Lupa Password?
              </RouterLink>
            </div>
            <div class="relative">
              <Lock class="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" />
              <input
                v-model="password"
                type="password"
                required
                class="w-full rounded-xl border border-black bg-white pl-10 pr-4 py-3 text-xs sm:text-sm text-black placeholder:text-slate-400 focus:outline-hidden"
                placeholder="••••••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            :disabled="loading"
            class="w-full rounded-full bg-black py-3.5 text-xs sm:text-sm font-semibold text-white hover:bg-slate-800 transition-colors disabled:opacity-50 mt-2"
          >
            {{ loading ? 'Memproses...' : 'Masuk ke Dashboard Organizer' }}
          </button>
        </form>

        <div class="space-y-4 pt-1 text-xs text-slate-500">
          <p>
            Belum memiliki akun Organizer?
            <RouterLink to="/organizer/register" class="font-bold text-black hover:underline">Pilih Paket (Free Trial / 100k) &amp; Daftar</RouterLink>
          </p>

          <div class="pt-4 border-t border-black/10 space-y-1">
            <p class="text-slate-400 text-[11px]">Ingin membeli tiket atau melihat e-ticket?</p>
            <RouterLink to="/login" class="font-bold text-black hover:underline inline-block">
              Masuk dengan Google di Portal Peserta &rarr;
            </RouterLink>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

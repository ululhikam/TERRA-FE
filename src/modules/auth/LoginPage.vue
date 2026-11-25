<script setup>
import { onMounted, ref } from 'vue'
import { useRouter, useRoute, RouterLink } from 'vue-router'
import { z } from 'zod'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'
import BubbleGraffiti from '@/components/common/BubbleGraffiti.vue'
import TerraLogo from '@/components/common/TerraLogo.vue'
import { Mail, Lock } from 'lucide-vue-next'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const toast = useToastStore()

const email = ref('')
const password = ref('')
const loading = ref(false)
const errorMsg = ref('')

onMounted(() => {
  if (route.query.oauth_error) {
    errorMsg.value = String(route.query.oauth_error)
  }
})

function handleGoogleLogin() {
  const redirect = route.query.redirect ? String(route.query.redirect) : '/my-tickets'
  authStore.startGoogleAuth(redirect, { role: 'customer' })
}

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
      portalRole: 'customer'
    })
    toast.success(`Selamat datang, ${user.full_name}!`)
    const redirect = route.query.redirect || '/profile'
    router.push(redirect)
  } catch (err) {
    if (err?.code === 'EMAIL_NOT_VERIFIED' && err?.details?.[0]?.otp_session_token) {
      const ctx = err.details[0]
      authStore.setPendingOtp({
        email: ctx.email,
        otp_session_token: ctx.otp_session_token,
        portal: 'customer'
      })
      toast.info('Email belum diverifikasi. Silakan masukkan kode OTP.')
      router.push({
        name: 'verify-otp',
        query: {
          email: ctx.email,
          portal: 'customer',
          ...(route.query.redirect ? { redirect: String(route.query.redirect) } : {})
        }
      })
      return
    }
    errorMsg.value = err.message || 'Gagal masuk ke akun peserta.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-[calc(100vh-14rem)] flex items-center justify-center px-4 py-10">
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
            Pesan tiket event<br />
            dan akses QR tiket<br />
            digital Anda
          </p>
        </div>

        <div class="-mx-8 sm:-mx-10 my-4 bg-white/60 py-1">
          <BubbleGraffiti />
        </div>

        <div class="pt-2">
          <span class="text-[10px] font-bold uppercase tracking-widest text-black">
            PORTAL PESERTA
          </span>
        </div>
      </div>

      <!-- Right Form -->
      <div class="md:col-span-6 flex flex-col justify-center space-y-6 px-2 sm:px-6">
        <div>
          <span class="inline-block rounded-full border border-black bg-white px-5 py-1 text-xs font-semibold text-black">
            Portal Peserta
          </span>
          <h1 class="mt-4 text-3xl sm:text-4xl tracking-tight text-black leading-tight">
            <strong class="font-sans font-black block">Masuk sebagai</strong>
            <span class="font-editorial font-normal block">Peserta</span>
          </h1>
        </div>

        <form @submit.prevent="handleSubmit" class="space-y-4">
          <div v-if="errorMsg" class="rounded-xl border border-rose-300 bg-rose-50 p-3 text-xs text-rose-700">
            {{ errorMsg }}
          </div>

          <div class="space-y-1.5">
            <label class="block text-xs font-semibold text-black">Email</label>
            <div class="relative">
              <Mail class="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" />
              <input
                v-model="email"
                type="email"
                required
                class="w-full rounded-xl border border-black bg-white pl-10 pr-4 py-3 text-xs sm:text-sm text-black placeholder:text-slate-400 focus:outline-hidden"
                placeholder="peserta@terra.id"
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
            class="w-full rounded-full border border-black bg-[#72a5e4] py-3.5 text-xs sm:text-sm font-bold text-black hover:bg-[#5c93d9] transition-colors disabled:opacity-50 mt-2"
          >
            {{ loading ? 'Memproses...' : 'Masuk Peserta' }}
          </button>
        </form>

        <div class="relative flex items-center py-1">
          <div class="flex-grow border-t border-black/15" />
          <span class="mx-3 shrink text-[11px] font-semibold uppercase tracking-wider text-slate-400">atau</span>
          <div class="flex-grow border-t border-black/15" />
        </div>

        <button
          type="button"
          @click="handleGoogleLogin"
          class="w-full flex items-center justify-center gap-2.5 rounded-full border border-black bg-white py-3 text-xs sm:text-sm font-bold text-black hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <svg class="h-4 w-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z" />
            <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24z" />
            <path fill="#FBBC05" d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14z" />
            <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96z" />
          </svg>
          <span>Lanjutkan dengan Google</span>
        </button>

        <div class="space-y-4 pt-1 text-xs text-slate-500">
          <p>
            Belum punya akun peserta?
            <RouterLink to="/register" class="font-bold text-black hover:underline">Daftar Gratis</RouterLink>
          </p>

          <div class="pt-4 border-t border-black/10 space-y-1">
            <p class="text-slate-400 text-[11px]">Ingin membuat atau mengelola event?</p>
            <RouterLink to="/organizer/login" class="font-bold text-black hover:underline inline-block">
              Masuk ke Portal Organizer &rarr;
            </RouterLink>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

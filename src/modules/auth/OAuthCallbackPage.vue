<script setup>
import { onMounted, ref } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'
import TerraLogo from '@/components/common/TerraLogo.vue'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const toast = useToastStore()

const status = ref('loading')
const errorMsg = ref('')

onMounted(async () => {
  const errParam = route.query.error || route.query.oauth_error
  if (errParam) {
    status.value = 'error'
    errorMsg.value = String(errParam)
    return
  }

  const token = route.query.token ? String(route.query.token) : ''
  const nextPath =
    typeof route.query.next === 'string' && route.query.next.startsWith('/')
      ? route.query.next
      : '/my-tickets'

  if (!token) {
    status.value = 'error'
    errorMsg.value = 'Token autentikasi Google tidak ditemukan.'
    return
  }

  try {
    const user = await authStore.loginWithToken(token)
    toast.success(`Selamat datang, ${user.full_name}!`)
    router.replace(nextPath)
  } catch (err) {
    status.value = 'error'
    errorMsg.value = err?.message || 'Gagal menyelesaikan autentikasi Google.'
  }
})
</script>

<template>
  <div class="min-h-[calc(100vh-14rem)] flex items-center justify-center px-4 py-12">
    <div class="w-full max-w-md rounded-3xl border-2 border-black bg-[#fafaf9] p-8 space-y-6 text-center shadow-[6px_6px_0_#000]">
      <div class="flex justify-center">
        <TerraLogo size="lg" />
      </div>

      <template v-if="status === 'loading'">
        <div class="space-y-2">
          <div class="mx-auto h-8 w-8 rounded-full border-2 border-black border-t-[#72a5e4] animate-spin" />
          <h1 class="text-2xl font-bold font-editorial text-black">Menyambungkan Akun Google...</h1>
          <p class="text-xs text-slate-600">
            Mohon tunggu sebentar, kami sedang memverifikasi sesi Google OAuth Anda.
          </p>
        </div>
      </template>

      <template v-else>
        <div class="space-y-3">
          <span class="inline-block rounded-full border border-black bg-rose-100 px-4 py-1 text-[10px] font-bold uppercase tracking-wider text-rose-700">
            Google OAuth Gagal
          </span>
          <h1 class="text-2xl font-bold font-editorial text-black">Tidak Dapat Masuk</h1>
          <p class="text-xs text-slate-700">{{ errorMsg }}</p>
          <div class="pt-3 flex justify-center gap-3">
            <RouterLink
              to="/login"
              class="rounded-full border border-black bg-[#72a5e4] px-6 py-2.5 text-xs font-bold text-black hover:bg-[#5c93d9]"
            >
              Kembali ke Login
            </RouterLink>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

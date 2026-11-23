<script setup>
import { ref } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import { z } from 'zod'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'
import TerraLogo from '@/components/common/TerraLogo.vue'
import { Mail, Lock, ArrowLeft } from 'lucide-vue-next'

const router = useRouter()
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
    await authStore.login({
      email: email.value,
      password: password.value,
      portalRole: 'admin'
    })
    toast.success('Berhasil masuk ke Platform Admin Console.')
    router.push('/admin')
  } catch (err) {
    errorMsg.value = err.message || 'Akses administrator ditolak.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-[#fafaf9] bg-grid-paper px-4 py-12">
    <div class="w-full max-w-md rounded-3xl border-2 border-black bg-white p-8 space-y-6">
      <RouterLink
        to="/"
        class="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-black transition-colors"
      >
        <ArrowLeft class="h-3.5 w-3.5" />
        <span>Kembali ke Marketplace</span>
      </RouterLink>

      <div class="space-y-2">
        <TerraLogo size="md" />
        <div>
          <span class="rounded-full border border-black bg-black text-white px-3 py-0.5 text-[10px] font-bold uppercase tracking-widest">
            Restricted Access
          </span>
        </div>
        <h1 class="text-2xl sm:text-3xl font-bold tracking-tight text-black font-editorial pt-2">
          Admin Console
        </h1>
        <p class="text-xs text-slate-500">
          Supervisi platform, moderasi event promotor, dan verifikasi organisasi.
        </p>
      </div>

      <form @submit.prevent="handleSubmit" class="space-y-4 text-xs">
        <div v-if="errorMsg" class="rounded-xl border border-rose-300 bg-rose-50 p-3 text-rose-700">
          {{ errorMsg }}
        </div>

        <div class="space-y-1.5">
          <label class="font-bold text-black">Email Administrator</label>
          <div class="relative">
            <Mail class="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
            <input
              v-model="email"
              type="email"
              required
              class="w-full rounded-xl border border-black bg-white pl-10 pr-3 py-2.5 text-black placeholder:text-slate-400 focus:outline-hidden"
              placeholder="admin@terra.id"
            />
          </div>
        </div>

        <div class="space-y-1.5">
          <label class="font-bold text-black">Password</label>
          <div class="relative">
            <Lock class="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
            <input
              v-model="password"
              type="password"
              required
              class="w-full rounded-xl border border-black bg-white pl-10 pr-3 py-2.5 text-black placeholder:text-slate-400 focus:outline-hidden"
              placeholder="••••••••"
            />
          </div>
        </div>

        <button
          type="submit"
          :disabled="loading"
          class="w-full rounded-full bg-black py-3 text-xs sm:text-sm font-semibold text-white hover:bg-slate-800 transition-colors disabled:opacity-50"
        >
          {{ loading ? 'Memverifikasi...' : 'Masuk Console' }}
        </button>
      </form>
    </div>
  </div>
</template>

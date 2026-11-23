<script setup>
import { ref } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import { useEventWorkspaceStore } from '@/stores/eventWorkspace'
import { useToastStore } from '@/stores/toast'
import TerraLogo from '@/components/common/TerraLogo.vue'
import { Mail, KeyRound, Lock, ArrowLeft } from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()
const store = useEventWorkspaceStore()
const toast = useToastStore()

const email = ref(String(route.query.email || ''))
const otpCode = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const loading = ref(false)
const errorMsg = ref('')

async function handleReset() {
  errorMsg.value = ''
  if (!/^\d{6}$/.test(otpCode.value.trim())) {
    errorMsg.value = 'Kode OTP reset harus tepat 6 digit angka.'
    return
  }
  if (newPassword.value.length < 6) {
    errorMsg.value = 'Kata sandi baru minimal 6 karakter.'
    return
  }
  if (newPassword.value !== confirmPassword.value) {
    errorMsg.value = 'Konfirmasi kata sandi tidak cocok.'
    return
  }

  loading.value = true
  try {
    await store.resetPassword({
      email: email.value.trim(),
      otp_code: otpCode.value.trim(),
      new_password: newPassword.value
    })
    toast.success('Kata sandi berhasil diperbarui! Silakan login dengan kata sandi baru.')
    router.push('/login')
  } catch (err) {
    errorMsg.value = err?.message || 'Gagal mengatur ulang kata sandi.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-[calc(100vh-14rem)] flex items-center justify-center px-4 py-10">
    <div class="w-full max-w-md rounded-2xl border-2 border-black bg-[#fafaf9] p-6 sm:p-8 space-y-6 shadow-[4px_4px_0px_#000]">
      <div class="space-y-2">
        <TerraLogo size="md" />
        <h1 class="text-2xl font-bold text-black font-sans pt-2">Reset Kata Sandi</h1>
        <p class="text-xs text-slate-600">
          Masukkan email, kode OTP 6 digit dari email Anda, serta kata sandi baru.
        </p>
      </div>

      <div v-if="errorMsg" class="rounded-xl border border-rose-600 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
        {{ errorMsg }}
      </div>

      <form @submit.prevent="handleReset" class="space-y-4">
        <div class="space-y-1">
          <label class="block text-xs font-semibold text-black">Email</label>
          <div class="relative">
            <Mail class="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" />
            <input
              v-model="email"
              type="email"
              required
              placeholder="nama@email.com"
              class="w-full rounded-xl border border-black bg-white pl-10 pr-4 py-3 text-xs text-black focus:outline-hidden"
            />
          </div>
        </div>

        <div class="space-y-1">
          <label class="block text-xs font-semibold text-black">Kode OTP (6 Digit)</label>
          <div class="relative">
            <KeyRound class="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" />
            <input
              v-model="otpCode"
              type="text"
              maxlength="6"
              required
              placeholder="123456"
              class="w-full rounded-xl border border-black bg-white pl-10 pr-4 py-3 text-xs font-mono tracking-widest text-black focus:outline-hidden"
            />
          </div>
        </div>

        <div class="space-y-1">
          <label class="block text-xs font-semibold text-black">Kata Sandi Baru</label>
          <div class="relative">
            <Lock class="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" />
            <input
              v-model="newPassword"
              type="password"
              required
              minlength="6"
              placeholder="Minimal 6 karakter"
              class="w-full rounded-xl border border-black bg-white pl-10 pr-4 py-3 text-xs text-black focus:outline-hidden"
            />
          </div>
        </div>

        <div class="space-y-1">
          <label class="block text-xs font-semibold text-black">Ulangi Kata Sandi Baru</label>
          <div class="relative">
            <Lock class="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" />
            <input
              v-model="confirmPassword"
              type="password"
              required
              placeholder="Ketik ulang kata sandi baru"
              class="w-full rounded-xl border border-black bg-white pl-10 pr-4 py-3 text-xs text-black focus:outline-hidden"
            />
          </div>
        </div>

        <button
          type="submit"
          :disabled="loading"
          class="w-full rounded-full bg-black py-3 text-xs sm:text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {{ loading ? 'Menyimpan...' : 'Simpan Kata Sandi Baru' }}
        </button>
      </form>

      <div class="pt-2 border-t border-black/10 flex items-center justify-between text-xs">
        <RouterLink to="/forgot-password" class="inline-flex items-center gap-1 font-semibold text-black hover:underline">
          <ArrowLeft class="h-3.5 w-3.5" /> Minta OTP Ulang
        </RouterLink>
        <RouterLink to="/login" class="font-bold text-black hover:underline">Login Peserta</RouterLink>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import { useEventWorkspaceStore } from '@/stores/eventWorkspace'
import { useToastStore } from '@/stores/toast'
import TerraLogo from '@/components/common/TerraLogo.vue'
import { Mail, ArrowLeft } from 'lucide-vue-next'

const router = useRouter()
const store = useEventWorkspaceStore()
const toast = useToastStore()

const email = ref('')
const loading = ref(false)
const errorMsg = ref('')

async function handleSubmit() {
  errorMsg.value = ''
  if (!email.value.trim()) {
    errorMsg.value = 'Masukkan alamat email yang terdaftar.'
    return
  }
  loading.value = true
  try {
    await store.forgotPassword(email.value.trim())
    toast.success('Jika email terdaftar, kode OTP reset kata sandi telah dikirim.')
    router.push({ name: 'reset-password', query: { email: email.value.trim() } })
  } catch (err) {
    errorMsg.value = err?.message || 'Gagal mengirim permintaan reset kata sandi.'
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
        <h1 class="text-2xl font-bold text-black font-sans pt-2">Lupa Kata Sandi</h1>
        <p class="text-xs text-slate-600">
          Masukkan email akun TERRA Anda. Kami akan mengirimkan kode OTP 6 digit untuk mengatur ulang kata sandi.
        </p>
      </div>

      <div v-if="errorMsg" class="rounded-xl border border-rose-600 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
        {{ errorMsg }}
      </div>

      <form @submit.prevent="handleSubmit" class="space-y-4">
        <div class="space-y-1.5">
          <label class="block text-xs font-semibold text-black">Alamat Email</label>
          <div class="relative">
            <Mail class="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" />
            <input
              v-model="email"
              type="email"
              required
              placeholder="nama@email.com"
              class="w-full rounded-xl border border-black bg-white pl-10 pr-4 py-3 text-xs sm:text-sm text-black focus:outline-hidden"
            />
          </div>
        </div>

        <button
          type="submit"
          :disabled="loading"
          class="w-full rounded-full border border-black bg-[#72a5e4] py-3 text-xs sm:text-sm font-bold text-black hover:bg-[#5c93d9] disabled:opacity-50"
        >
          {{ loading ? 'Mengirim OTP...' : 'Kirim Kode OTP Reset' }}
        </button>
      </form>

      <div class="pt-2 border-t border-black/10 flex items-center justify-between text-xs">
        <RouterLink to="/login" class="inline-flex items-center gap-1 font-semibold text-black hover:underline">
          <ArrowLeft class="h-3.5 w-3.5" /> Kembali ke Login
        </RouterLink>
        <RouterLink to="/reset-password" class="font-bold text-black hover:underline">
          Sudah punya kode OTP?
        </RouterLink>
      </div>
    </div>
  </div>
</template>

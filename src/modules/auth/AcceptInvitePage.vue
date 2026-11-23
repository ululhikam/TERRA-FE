<script setup>
import { onMounted, ref } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useEventWorkspaceStore } from '@/stores/eventWorkspace'
import { useToastStore } from '@/stores/toast'
import TerraLogo from '@/components/common/TerraLogo.vue'
import { ShieldCheck, Lock, User } from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const workspaceStore = useEventWorkspaceStore()
const toast = useToastStore()

const token = ref(route.query.token ? String(route.query.token) : '')
const loadingInvite = ref(true)
const submitting = ref(false)
const invite = ref(null)
const errorMsg = ref('')

const fullName = ref('')
const password = ref('')

onMounted(async () => {
  if (!token.value) {
    errorMsg.value = 'Tautan undangan tidak memiliki token yang valid.'
    loadingInvite.value = false
    return
  }

  try {
    const data = await authStore.fetchInvite(token.value)
    invite.value = data
    fullName.value = data.name || ''
  } catch (err) {
    errorMsg.value = err?.message || 'Undangan tidak ditemukan atau sudah kedaluwarsa.'
  } finally {
    loadingInvite.value = false
  }
})

async function handleAccept() {
  errorMsg.value = ''
  if (password.value.length < 6) {
    errorMsg.value = 'Kata sandi minimal 6 karakter.'
    return
  }
  submitting.value = true
  try {
    const result = await authStore.acceptInvite({
      token: token.value,
      full_name: fullName.value.trim(),
      password: password.value
    })
    await workspaceStore.fetchOrganizerWorkspace()
    toast.success(`Bergabung sebagai panitia ${invite.value?.event_title || ''}!`)
    router.replace(`/dashboard/events/${result.event_id}`)
  } catch (err) {
    errorMsg.value = err?.message || 'Gagal menerima undangan kepanitiaan.'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-[#fafaf9] flex items-center justify-center px-4 py-12">
    <div class="w-full max-w-lg rounded-3xl border-2 border-black bg-white p-6 sm:p-8 space-y-6 shadow-[6px_6px_0_#000]">
      <div class="flex items-center justify-between border-b border-black/15 pb-4">
        <TerraLogo size="md" />
        <span class="rounded-full border border-black bg-[#72a5e4] px-3.5 py-1 text-[10px] font-bold uppercase tracking-wider text-black">
          Undangan Panitia
        </span>
      </div>

      <div v-if="loadingInvite" class="py-10 text-center space-y-3">
        <div class="mx-auto h-8 w-8 rounded-full border-2 border-black border-t-[#72a5e4] animate-spin" />
        <p class="text-xs font-medium text-slate-600">Memuat detail undangan...</p>
      </div>

      <div v-else-if="!invite" class="py-6 text-center space-y-4">
        <h1 class="text-2xl font-bold font-editorial text-black">Undangan Tidak Valid</h1>
        <p class="text-xs text-rose-700 bg-rose-50 border border-rose-300 rounded-xl p-3">
          {{ errorMsg }}
        </p>
        <RouterLink
          to="/organizer/login"
          class="inline-block rounded-full border border-black bg-black px-6 py-2.5 text-xs font-bold text-white hover:bg-slate-800"
        >
          Ke Login Organizer
        </RouterLink>
      </div>

      <template v-else>
        <div class="space-y-3">
          <p class="text-xs text-slate-600">
            <strong>{{ invite.inviter_name }}</strong> mengundang Anda bergabung ke tim pengelola event:
          </p>
          <div class="rounded-2xl border border-black bg-[#fafaf9] p-4 space-y-2.5">
            <h1 class="text-xl font-bold font-editorial text-black">{{ invite.event_title }}</h1>
            <p class="text-xs text-slate-700">
              Email: <strong>{{ invite.email }}</strong> • Peran: <strong>{{ invite.role }}</strong> • Divisi: <strong>{{ invite.department }}</strong>
            </p>
            <div class="pt-1 space-y-1.5">
              <div class="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                <ShieldCheck class="h-3.5 w-3.5 text-black" />
                <span>Hak Akses yang Diberikan Organizer</span>
              </div>
              <div class="flex flex-wrap gap-1.5">
                <span
                  v-for="perm in invite.permissions"
                  :key="perm"
                  class="rounded-full border border-black bg-[#72a5e4] px-3 py-0.5 text-[11px] font-bold text-black"
                >
                  {{ perm }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <form @submit.prevent="handleAccept" class="space-y-4">
          <div v-if="errorMsg" class="rounded-xl border border-rose-300 bg-rose-50 p-3 text-xs text-rose-700">
            {{ errorMsg }}
          </div>

          <div class="space-y-1">
            <label class="block text-xs font-bold text-black">Nama Lengkap Anda</label>
            <div class="relative">
              <User class="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
              <input
                v-model="fullName"
                type="text"
                required
                class="w-full rounded-xl border border-black bg-white pl-10 pr-4 py-2.5 text-xs sm:text-sm text-black focus:outline-hidden"
                placeholder="Nama lengkap"
              />
            </div>
          </div>

          <div class="space-y-1">
            <label class="block text-xs font-bold text-black">Buat Kata Sandi Akun</label>
            <div class="relative">
              <Lock class="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
              <input
                v-model="password"
                type="password"
                required
                minlength="6"
                class="w-full rounded-xl border border-black bg-white pl-10 pr-4 py-2.5 text-xs sm:text-sm text-black focus:outline-hidden"
                placeholder="Minimal 6 karakter"
              />
            </div>
          </div>

          <button
            type="submit"
            :disabled="submitting"
            class="w-full rounded-full border border-black bg-black py-3 text-xs sm:text-sm font-bold text-white hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            {{ submitting ? 'Memproses...' : 'Terima Undangan & Masuk Studio' }}
          </button>
        </form>
      </template>
    </div>
  </div>
</template>

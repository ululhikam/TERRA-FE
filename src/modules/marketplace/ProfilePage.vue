<script setup>
import { ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'

const authStore = useAuthStore()
const toast = useToastStore()

const fullName = ref(authStore.user?.full_name || 'Nadia Putri')
const email = ref(authStore.user?.email || 'peserta@terra.id')
const bio = ref('Event enthusiast & software builder.')

function saveProfile() {
  if (authStore.user) {
    authStore.user.full_name = fullName.value
  }
  toast.success('Profil akun berhasil diperbarui.')
}
</script>

<template>
  <div class="mx-auto max-w-2xl px-4 sm:px-6 py-10 space-y-6 min-h-[calc(100vh-14rem)]">
    <div class="space-y-1">
      <span class="text-[9px] font-bold uppercase tracking-widest text-slate-500 block">
        ACCOUNT SETTINGS
      </span>
      <h1 class="text-3xl font-bold text-black font-sans">
        Profil <span class="font-editorial font-normal">Akun</span>
      </h1>
    </div>

    <form @submit.prevent="saveProfile" class="rounded-2xl border border-black bg-[#fafaf9] p-6 sm:p-8 space-y-5 text-xs">
      <div class="space-y-1.5">
        <label class="block font-bold text-black">Nama Lengkap</label>
        <input
          v-model="fullName"
          type="text"
          class="w-full rounded-xl border border-black bg-white p-3 text-xs sm:text-sm text-black focus:outline-hidden"
        />
      </div>
      <div class="space-y-1.5">
        <label class="block font-bold text-black">Email</label>
        <input
          v-model="email"
          type="email"
          disabled
          class="w-full rounded-xl border border-black/40 bg-slate-100 p-3 text-xs sm:text-sm text-slate-500"
        />
      </div>
      <div class="space-y-1.5">
        <label class="block font-bold text-black">Bio</label>
        <textarea
          v-model="bio"
          rows="3"
          class="w-full rounded-xl border border-black bg-white p-3 text-xs sm:text-sm text-black focus:outline-hidden resize-none"
        />
      </div>
      <div class="pt-2 flex justify-end">
        <button
          type="submit"
          class="rounded-full bg-black px-8 py-3 text-xs font-bold text-white hover:bg-slate-800 transition-colors"
        >
          Simpan Perubahan
        </button>
      </div>
    </form>
  </div>
</template>

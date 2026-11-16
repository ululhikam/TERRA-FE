<script setup>
import { ref } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import { z } from 'zod'
import { useAuthStore } from '@/stores/auth'
import { useEventWorkspaceStore } from '@/stores/eventWorkspace'
import { useToastStore } from '@/stores/toast'
import { slugify } from '@/utils/formatters'
import BubbleGraffiti from '@/components/common/BubbleGraffiti.vue'
import TerraLogo from '@/components/common/TerraLogo.vue'
import { User, Building2, Mail, Lock, ArrowLeft } from 'lucide-vue-next'

const router = useRouter()
const authStore = useAuthStore()
const workspace = useEventWorkspaceStore()
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
    await authStore.register({ ...parsed.data, role: 'organizer' })
    workspace.organizations.unshift({
      id: 'org-' + Date.now(),
      name: orgName.value,
      slug: slugify(orgName.value),
      description: 'Organisasi penyelenggara event di TERRA.',
      logo_url: 'https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=200&q=80',
      cover_url: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200&q=80',
      email: email.value,
      website: 'https://terra.id',
      verification_status: 'pending',
      member_count: 1,
      event_count: 0
    })
    toast.success('Akun & Organisasi berhasil dibuat!')
    router.push('/dashboard')
  } catch (err) {
    errorMsg.value = err.message || 'Gagal mendaftar organizer.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center px-4 py-10 bg-[#fafaf9] bg-grid-paper">
    <div class="w-full max-w-5xl grid grid-cols-1 md:grid-cols-12 gap-10 items-center">
      <!-- Left Branding Frame -->
      <div class="md:col-span-6 relative border border-black bg-[#fafaf9] p-8 sm:p-10 flex flex-col justify-between overflow-hidden min-h-[500px]">
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

        <div class="pt-2">
          <span class="text-[10px] font-bold uppercase tracking-widest text-black">
            ORGANIZER PORTAL
          </span>
        </div>
      </div>

      <!-- Right Form -->
      <div class="md:col-span-6 flex flex-col justify-center space-y-5 px-2 sm:px-6">
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
              Organizer Registration
            </span>
            <h1 class="mt-3 text-3xl sm:text-4xl tracking-tight text-black leading-tight">
              <strong class="font-sans font-black block">Daftar Organizer</strong>
              <span class="font-editorial font-normal block">Studio</span>
            </h1>
          </div>
        </div>

        <form @submit.prevent="handleSubmit" class="space-y-3.5">
          <div v-if="errorMsg" class="rounded-xl border border-rose-300 bg-rose-50 p-3 text-xs text-rose-700">
            {{ errorMsg }}
          </div>

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
                placeholder="Nusantara Tech Community"
              />
            </div>
          </div>

          <div class="space-y-1">
            <label class="block text-xs font-semibold text-black">Email Resmi</label>
            <div class="relative">
              <Mail class="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
              <input
                v-model="email"
                type="email"
                required
                class="w-full rounded-xl border border-black bg-white pl-10 pr-4 py-2.5 text-xs sm:text-sm text-black placeholder:text-slate-400 focus:outline-hidden"
                placeholder="organizer@nusantaratech.id"
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
            class="w-full rounded-full bg-black py-3.5 text-xs sm:text-sm font-semibold text-white hover:bg-slate-800 transition-colors disabled:opacity-50 mt-2"
          >
            {{ loading ? 'Mendaftarkan...' : 'Buat Akun Organizer' }}
          </button>
        </form>

        <div class="pt-1 text-xs text-slate-500">
          <p>
            Sudah terdaftar?
            <RouterLink to="/organizer/login" class="font-bold text-black hover:underline">Masuk ke Studio</RouterLink>
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

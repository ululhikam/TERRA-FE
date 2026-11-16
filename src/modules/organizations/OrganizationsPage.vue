<script setup>
import { ref } from 'vue'
import { useEventWorkspaceStore } from '@/stores/eventWorkspace'
import { useToastStore } from '@/stores/toast'
import { slugify } from '@/utils/formatters'
import { X } from 'lucide-vue-next'

const store = useEventWorkspaceStore()
const toast = useToastStore()

const showForm = ref(false)
const orgName = ref('')
const orgEmail = ref('')
const orgDesc = ref('')

async function createOrg() {
  if (!orgName.value.trim()) return
  const name = orgName.value.trim()
  await store.createOrganization({
    name,
    slug: slugify(name),
    description: orgDesc.value || 'Organisasi penyelenggara event.',
    email: orgEmail.value || 'contact@org.id',
    website: 'https://terra.id'
  })
  toast.success(`Organisasi "${name}" berhasil dibuat.`)
  orgName.value = ''
  orgEmail.value = ''
  orgDesc.value = ''
  showForm.value = false
}
</script>

<template>
  <div class="space-y-8 min-h-[calc(100vh-6rem)]">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div class="space-y-1">
        <h1 class="text-3xl sm:text-4xl font-bold tracking-tight text-black font-editorial">
          <strong class="font-sans font-black">My</strong> Organizations
        </h1>
        <p class="text-xs sm:text-sm text-slate-600">
          Kelola organisasi penyelenggara event dan keanggotaan tim.
        </p>
      </div>

      <button
        @click="showForm = true"
        class="rounded-full border border-black bg-[#72a5e4] px-6 py-2.5 text-xs font-bold text-black hover:bg-[#5c93d9] transition-colors shrink-0"
      >
        + Buat Organisasi
      </button>
    </div>

    <!-- 2-Column Organization Cards -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div
        v-for="org in store.organizations"
        :key="org.id"
        class="rounded-2xl border border-black bg-white p-6 space-y-4 flex flex-col justify-between hover:shadow-xs transition-shadow"
      >
        <div class="space-y-3">
          <div class="flex items-start gap-4">
            <div class="h-14 w-14 rounded-xl border border-black overflow-hidden shrink-0 bg-slate-100">
              <img :src="org.logo_url" :alt="org.name" class="h-full w-full object-cover" />
            </div>
            <div class="space-y-1 flex-1">
              <div class="flex items-center justify-between gap-2">
                <h3 class="text-lg font-bold text-black leading-snug">{{ org.name }}</h3>
              </div>
              <p class="text-xs font-mono text-slate-400">/{{ org.slug }}</p>
            </div>
          </div>

          <div>
            <span
              class="rounded-full border border-black px-3 py-0.5 text-[10px] font-bold"
              :class="org.verification_status === 'verified' ? 'bg-[#72a5e4] text-black' : 'bg-white text-slate-700'"
            >
              {{ org.verification_status }}
            </span>
          </div>

          <p class="text-xs text-slate-600 leading-relaxed pt-1">
            {{ org.description }}
          </p>
        </div>

        <div class="pt-4 border-t border-black/10 flex items-center justify-between text-xs font-bold text-black">
          <span>{{ org.member_count || 4 }} Anggota</span>
          <span>{{ org.event_count || 2 }} Event</span>
        </div>
      </div>
    </div>

    <!-- Bottom Footnote -->
    <div class="pt-8 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
      TERRA / ORGANIZER STUDIO
    </div>

    <!-- Modal Form Buat Organisasi -->
    <div
      v-if="showForm"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-2xs"
    >
      <div class="w-full max-w-md rounded-3xl border-2 border-black bg-white p-6 sm:p-8 space-y-6">
        <div class="flex items-center justify-between border-b border-black/20 pb-3">
          <h3 class="text-xl font-bold text-black font-editorial">Buat Organisasi Penyelenggara</h3>
          <button @click="showForm = false" class="p-1 rounded-full border border-black hover:bg-slate-100">
            <X class="h-4 w-4" />
          </button>
        </div>

        <form @submit.prevent="createOrg" class="space-y-4 text-xs">
          <div class="space-y-1">
            <label class="font-bold text-black">Nama Organisasi</label>
            <input
              v-model="orgName"
              type="text"
              required
              placeholder="Contoh: Nusantara Tech Community"
              class="w-full rounded-xl border border-black p-2.5 text-black focus:outline-hidden"
            />
          </div>

          <div class="space-y-1">
            <label class="font-bold text-black">Email Kontak Resmi</label>
            <input
              v-model="orgEmail"
              type="email"
              placeholder="team@nusantaratech.id"
              class="w-full rounded-xl border border-black p-2.5 text-black focus:outline-hidden"
            />
          </div>

          <div class="space-y-1">
            <label class="font-bold text-black">Deskripsi Singkat</label>
            <textarea
              v-model="orgDesc"
              rows="3"
              placeholder="Komunitas pengembang perangkat lunak, AI, dan startup..."
              class="w-full rounded-xl border border-black p-2.5 text-black focus:outline-hidden resize-none"
            />
          </div>

          <div class="pt-4 flex justify-end gap-3 border-t border-black/20">
            <button
              type="button"
              @click="showForm = false"
              class="rounded-full border border-black bg-white px-5 py-2 font-semibold text-black hover:bg-slate-100"
            >
              Batal
            </button>
            <button
              type="submit"
              class="rounded-full bg-black px-6 py-2 font-bold text-white hover:bg-slate-800"
            >
              Simpan Organisasi
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

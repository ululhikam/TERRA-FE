<script setup>
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useEventWorkspaceStore } from '@/stores/eventWorkspace'
import { useToastStore } from '@/stores/toast'
import { slugify } from '@/utils/formatters'
import { Calendar } from 'lucide-vue-next'

const router = useRouter()
const store = useEventWorkspaceStore()
const toast = useToastStore()

const title = ref('')
const organizationId = ref(store.organizations[0]?.id || '')
const category = ref(store.categories[0]?.name || '')

watch(
  () => store.organizations,
  (orgs) => {
    if (!organizationId.value && orgs.length) organizationId.value = orgs[0].id
  },
  { immediate: true }
)
watch(
  () => store.categories,
  (cats) => {
    if (!category.value && cats.length) category.value = cats[0].name
  },
  { immediate: true }
)
const locationType = ref('offline')
const locationName = ref('')
const address = ref('')
const startAt = ref('2026-12-28T09:00')
const endAt = ref('2026-12-28T17:00')
const capacity = ref(100)
const description = ref('')
const posterUrl = ref('')
const bannerUrl = ref('')
const uploadingMedia = ref('')

async function handleEventMediaUpload(e, target) {
  const file = e.target.files?.[0]
  if (!file) return
  uploadingMedia.value = target
  try {
    const uploaded = await store.uploadMedia(file, {
      folder: target === 'poster' ? 'posters' : 'banners',
      bucketType: 'media'
    })
    if (uploaded?.public_url) {
      if (target === 'poster') posterUrl.value = uploaded.public_url
      else bannerUrl.value = uploaded.public_url
      toast.success('Gambar berhasil diunggah ke Supabase Storage.')
    }
  } catch (err) {
    toast.error(err?.message || 'Gagal mengunggah gambar.')
  } finally {
    uploadingMedia.value = ''
    e.target.value = ''
  }
}

async function handleCreate() {
  if (!title.value.trim()) return
  const org = store.organizations.find(o => o.id === organizationId.value) || store.organizations[0]
  const evt = await store.createEvent({
    organization_id: organizationId.value,
    organization_name: org?.name || 'Nusantara Tech Community',
    title: title.value,
    slug: slugify(title.value) + '-' + Math.floor(100 + Math.random() * 900),
    category: category.value,
    location_type: locationType.value,
    venue_name: locationName.value || 'Jakarta Convention Center (Hall B)',
    location_name: locationName.value || 'Jakarta Convention Center (Hall B)',
    address: address.value || 'Jl. Gatot Subroto No.1, Jakarta Pusat',
    start_date: startAt.value,
    end_date: endAt.value,
    start_at: startAt.value,
    end_at: endAt.value,
    timezone: 'Asia/Jakarta',
    capacity: Number(capacity.value) || 100,
    publication_status: 'Published',
    description: description.value,
    poster_url: posterUrl.value || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=900&q=80',
    banner_url: bannerUrl.value || posterUrl.value || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1400&q=80'
  })
  toast.success('Event berhasil dibuat! Silakan tentukan modul pengelolaan yang dibutuhkan.')
  router.push(`/dashboard/events/${evt.id}/modules`)
}
</script>

<template>
  <div class="space-y-6 w-full min-h-[calc(100vh-6rem)]">
    <!-- Header -->
    <div class="space-y-1 pb-4 border-b border-black">
      <h1 class="text-3xl sm:text-4xl font-bold tracking-tight text-black font-editorial">
        <strong class="font-sans font-black">Create</strong> New Event
      </h1>
      <p class="text-xs sm:text-sm text-slate-600">
        Isi informasi dasar event, lalu pilih modul pengelolaan yang dibutuhkan.
      </p>
    </div>

    <!-- Form Content -->
    <form @submit.prevent="handleCreate" class="space-y-6">
      <!-- Judul Event -->
      <div class="space-y-1.5">
        <label class="block text-xs font-semibold text-slate-800">Judul Event</label>
        <input
          v-model="title"
          type="text"
          required
          placeholder="Contoh: Tech Conference Jakarta 2026"
          class="w-full rounded-xl border border-black bg-white p-3 text-xs sm:text-sm text-black placeholder:text-slate-400 focus:outline-hidden"
        />
      </div>

      <!-- Organisasi & Kategori -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div class="space-y-1.5">
          <label class="block text-xs font-semibold text-slate-800">Organisasi</label>
          <div class="relative">
            <select
              v-model="organizationId"
              class="w-full rounded-xl border border-black bg-white p-3 text-xs sm:text-sm text-black focus:outline-hidden appearance-none cursor-pointer"
            >
              <option v-for="org in store.organizations" :key="org.id" :value="org.id">{{ org.name }}</option>
            </select>
            <span class="pointer-events-none absolute right-4 top-3 text-xs">⌄</span>
          </div>
        </div>

        <div class="space-y-1.5">
          <label class="block text-xs font-semibold text-slate-800">Kategori</label>
          <div class="relative">
            <select
              v-model="category"
              class="w-full rounded-xl border border-black bg-white p-3 text-xs sm:text-sm text-black focus:outline-hidden appearance-none cursor-pointer"
            >
              <option v-for="c in store.categories" :key="c.id" :value="c.name">{{ c.name }}</option>
            </select>
            <span class="pointer-events-none absolute right-4 top-3 text-xs">⌄</span>
          </div>
        </div>
      </div>

      <!-- Format, Venue, Kapasitas -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div class="space-y-1.5">
          <label class="block text-xs font-semibold text-slate-800">Format Event</label>
          <div class="relative">
            <select
              v-model="locationType"
              class="w-full rounded-xl border border-black bg-white p-3 text-xs sm:text-sm text-black focus:outline-hidden appearance-none cursor-pointer"
            >
              <option value="offline">Offline</option>
              <option value="online">Online</option>
              <option value="hybrid">Hybrid</option>
            </select>
            <span class="pointer-events-none absolute right-4 top-3 text-xs">⌄</span>
          </div>
        </div>

        <div class="space-y-1.5">
          <label class="block text-xs font-semibold text-slate-800">Nama Venue / Platform</label>
          <input
            v-model="locationName"
            type="text"
            placeholder="JCC / Zoom"
            class="w-full rounded-xl border border-black bg-white p-3 text-xs sm:text-sm text-black placeholder:text-slate-400 focus:outline-hidden"
          />
        </div>

        <div class="space-y-1.5">
          <label class="block text-xs font-semibold text-slate-800">Kapasitas</label>
          <input
            v-model="capacity"
            type="number"
            min="10"
            class="w-full rounded-xl border border-black bg-white p-3 text-xs sm:text-sm text-black placeholder:text-slate-400 focus:outline-hidden"
          />
        </div>
      </div>

      <!-- Waktu Mulai & Waktu Selesai -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div class="space-y-1.5">
          <label class="block text-xs font-semibold text-slate-800">Waktu Mulai</label>
          <input
            v-model="startAt"
            type="datetime-local"
            required
            class="w-full rounded-xl border border-black bg-white p-3 text-xs sm:text-sm text-black focus:outline-hidden"
          />
        </div>

        <div class="space-y-1.5">
          <label class="block text-xs font-semibold text-slate-800">Waktu Selesai</label>
          <input
            v-model="endAt"
            type="datetime-local"
            required
            class="w-full rounded-xl border border-black bg-white p-3 text-xs sm:text-sm text-black focus:outline-hidden"
          />
        </div>
      </div>

      <!-- Deskripsi Event -->
      <div class="space-y-1.5">
        <label class="block text-xs font-semibold text-slate-800">Deskripsi Event</label>
        <textarea
          v-model="description"
          rows="4"
          placeholder="Jelaskan detail acara, pembicara, dan manfaat untuk peserta..."
          class="w-full rounded-xl border border-black bg-white p-3 text-xs sm:text-sm text-black placeholder:text-slate-400 focus:outline-hidden resize-none"
        />
      </div>

      <!-- Media Poster & Banner (Upload ke Supabase Storage) -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div class="space-y-1.5">
          <label class="block text-xs font-semibold text-slate-800">Poster Event (Supabase Storage)</label>
          <div class="flex items-center gap-3">
            <label class="rounded-full border border-black bg-white px-4 py-2 text-xs font-bold text-black hover:bg-slate-100 cursor-pointer shrink-0">
              <span>{{ uploadingMedia === 'poster' ? 'Mengunggah...' : '↑ Upload Poster' }}</span>
              <input type="file" accept="image/*" class="hidden" @change="handleEventMediaUpload($event, 'poster')" />
            </label>
            <span class="text-[11px] text-slate-500 truncate">{{ posterUrl || 'Default poster jika kosong' }}</span>
          </div>
        </div>
        <div class="space-y-1.5">
          <label class="block text-xs font-semibold text-slate-800">Banner Cover 16:9 (Supabase Storage)</label>
          <div class="flex items-center gap-3">
            <label class="rounded-full border border-black bg-white px-4 py-2 text-xs font-bold text-black hover:bg-slate-100 cursor-pointer shrink-0">
              <span>{{ uploadingMedia === 'banner' ? 'Mengunggah...' : '↑ Upload Banner' }}</span>
              <input type="file" accept="image/*" class="hidden" @change="handleEventMediaUpload($event, 'banner')" />
            </label>
            <span class="text-[11px] text-slate-500 truncate">{{ bannerUrl || 'Mengikuti poster jika kosong' }}</span>
          </div>
        </div>
      </div>

      <!-- Bottom Button -->
      <div class="pt-4 flex justify-end">
        <button
          type="submit"
          class="rounded-full bg-black px-8 py-3 text-xs sm:text-sm font-semibold text-white hover:bg-slate-800 transition-colors"
        >
          Buat Event &amp; Pilih Modul
        </button>
      </div>
    </form>
  </div>
</template>

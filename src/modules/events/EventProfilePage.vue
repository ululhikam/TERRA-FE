<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import { useEventWorkspaceStore } from '@/stores/eventWorkspace'
import { useToastStore } from '@/stores/toast'
import { slugify } from '@/utils/formatters'
import { Trash2 } from 'lucide-vue-next'

const route = useRoute()
const store = useEventWorkspaceStore()
const toast = useToastStore()

const event = computed(() => store.events.find((e) => e.id === route.params.eventId) || store.activeEvent)

function toLocalDatetimeInput(isoStr) {
  if (!isoStr) return ''
  return isoStr.slice(0, 16)
}

const form = reactive({
  title: '',
  slug: '',
  category: '',
  description: '',
  poster_url: '',
  banner_url: '',
  gallery: [],
  location_type: 'hybrid',
  location_name: '',
  address: '',
  online_url: '',
  start_at: '',
  end_at: '',
  capacity: 600,
  visibility: 'public',
  status: 'Draft',
  theme_color: '#1e3a8a',
  speakers: [],
  schedules: []
})

const newGalleryUrl = ref('')

const newSpeaker = reactive({
  name: '',
  type: 'Pemateri',
  role_title: '',
  topic: '',
  avatar_url: ''
})

const newSchedule = reactive({
  date: '',
  track: '',
  title: '',
  description: '',
  start_time: '09:00',
  end_time: '10:30',
  location: 'Main Stage',
  pic: '',
  visibility: 'public'
})

function loadEventIntoForm(evt) {
  if (!evt) return
  form.title = evt.title || ''
  form.slug = evt.slug || ''
  form.category = evt.category || store.categories[0]?.name || ''
  form.description = evt.description || ''
  form.poster_url = evt.poster_url || ''
  form.banner_url = evt.banner_url || ''
  form.gallery = [...(evt.gallery || [])]
  form.location_type = evt.location_type || 'hybrid'
  form.location_name = evt.location_name || evt.venue_name || ''
  form.address = evt.address || ''
  form.online_url = evt.online_url || ''
  form.start_at = toLocalDatetimeInput(evt.start_at || evt.start_date)
  form.end_at = toLocalDatetimeInput(evt.end_at || evt.end_date)
  form.capacity = evt.capacity ?? 600
  form.visibility = evt.visibility || 'public'
  form.status = evt.status || 'Draft'
  form.theme_color = evt.theme_color || '#1e3a8a'
  form.speakers = (evt.speakers || []).map((s) => ({ ...s }))
  form.schedules = (evt.schedules || []).map((s) => ({ ...s }))
  if (!newSchedule.date && evt.start_at) newSchedule.date = evt.start_at.slice(0, 10)
}

watch(event, loadEventIntoForm, { immediate: true })

const uploadingField = ref('')

async function handleImageUpload(e, targetField, folder = 'events') {
  const file = e.target.files?.[0]
  if (!file) return
  uploadingField.value = targetField
  try {
    const uploaded = await store.uploadMedia(file, { folder, bucketType: 'media' })
    if (uploaded?.public_url) {
      form[targetField] = uploaded.public_url
      toast.success('Gambar berhasil diunggah ke Supabase Storage.')
    }
  } catch (err) {
    toast.error(err?.message || 'Gagal mengunggah gambar ke Supabase.')
  } finally {
    uploadingField.value = ''
    e.target.value = ''
  }
}

async function handleGalleryUpload(e) {
  const file = e.target.files?.[0]
  if (!file) return
  uploadingField.value = 'gallery'
  try {
    const uploaded = await store.uploadMedia(file, { folder: 'gallery', bucketType: 'media' })
    if (uploaded?.public_url) {
      form.gallery.push(uploaded.public_url)
      toast.success('Foto galeri diunggah ke Supabase Storage.')
    }
  } catch (err) {
    toast.error(err?.message || 'Gagal mengunggah foto galeri.')
  } finally {
    uploadingField.value = ''
    e.target.value = ''
  }
}

async function handleSpeakerAvatarUpload(e) {
  const file = e.target.files?.[0]
  if (!file) return
  uploadingField.value = 'speaker_avatar'
  try {
    const uploaded = await store.uploadMedia(file, { folder: 'speakers', bucketType: 'media' })
    if (uploaded?.public_url) {
      newSpeaker.avatar_url = uploaded.public_url
      toast.success('Foto pemateri diunggah ke Supabase Storage.')
    }
  } catch (err) {
    toast.error(err?.message || 'Gagal mengunggah foto pemateri.')
  } finally {
    uploadingField.value = ''
    e.target.value = ''
  }
}

function addGalleryItem() {
  if (!newGalleryUrl.value.trim()) return
  form.gallery.push(newGalleryUrl.value.trim())
  newGalleryUrl.value = ''
  toast.success('Gambar galeri ditambahkan.')
}

function removeGalleryItem(idx) {
  form.gallery.splice(idx, 1)
}

function addSpeaker() {
  if (!newSpeaker.name.trim()) return
  form.speakers.push({
    id: 'sp-' + Date.now(),
    name: newSpeaker.name.trim(),
    type: newSpeaker.type,
    role_title: newSpeaker.role_title.trim(),
    topic: newSpeaker.topic.trim(),
    avatar_url: newSpeaker.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&q=80'
  })
  newSpeaker.name = ''
  newSpeaker.role_title = ''
  newSpeaker.topic = ''
  newSpeaker.avatar_url = ''
  toast.success('Pemateri berhasil ditambahkan.')
}

function removeSpeaker(idx) {
  form.speakers.splice(idx, 1)
}

function addSchedule() {
  if (!newSchedule.title.trim()) return
  form.schedules.push({
    id: 'sc-' + Date.now(),
    date: newSchedule.date || (form.start_at ? form.start_at.slice(0, 10) : ''),
    track: newSchedule.track.trim(),
    title: newSchedule.title.trim(),
    description: newSchedule.description.trim(),
    start_time: newSchedule.start_time,
    end_time: newSchedule.end_time,
    location: newSchedule.location,
    pic: newSchedule.pic,
    visibility: newSchedule.visibility || 'public'
  })
  newSchedule.title = ''
  newSchedule.description = ''
  toast.success('Sesi rundown berhasil ditambahkan.')
}

function removeSchedule(idx) {
  form.schedules.splice(idx, 1)
}

async function saveChanges() {
  if (!event.value) return
  try {
    await store.updateEventProfile(event.value.id, {
      title: form.title,
      slug: form.slug || undefined,
      category: form.category,
      description: form.description,
      poster_url: form.poster_url,
      banner_url: form.banner_url,
      location_type: form.location_type,
      location_name: form.location_name,
      address: form.address,
      online_url: form.online_url || undefined,
      start_at: form.start_at,
      end_at: form.end_at,
      capacity: Number(form.capacity) || 100,
      visibility: form.visibility,
      status: form.status,
      theme_color: form.theme_color || undefined,
      gallery: [...form.gallery],
      speakers: [...form.speakers],
      schedules: [...form.schedules]
    })
    toast.success('Perubahan profil & branding event berhasil disimpan!')
  } catch (err) {
    toast.error(err?.message || 'Gagal menyimpan perubahan event.')
  }
}
</script>

<template>
  <div v-if="event" class="space-y-6 min-h-[calc(100vh-6rem)]">
    <!-- Top Header -->
    <div class="space-y-4">
      <div class="space-y-1">
        <div class="flex flex-wrap items-center gap-2.5">
          <span class="text-[9px] font-bold uppercase tracking-wider text-slate-500">
            CORE EVENT
          </span>
          <span
            class="rounded-full border border-black px-3.5 py-0.5 text-[10px] font-bold text-black"
            :class="event.publication_status === 'Published' ? 'bg-[#72a5e4]' : 'bg-amber-100'"
          >
            {{ event.publication_status || 'Unpublished' }}
          </span>
          <span class="rounded-full border border-black bg-white px-3.5 py-0.5 text-[10px] font-bold text-black">
            {{ event.status || 'Draft' }}
          </span>
        </div>
        <h1 class="text-3xl font-bold tracking-tight text-black font-sans pt-1">
          Event Profile &amp; Branding
        </h1>
        <p class="text-xs text-slate-500">
          Atur informasi dasar, foto poster, banner cover, deskripsi, waktu, lokasi, serta visibilitas event Anda.
        </p>
      </div>

      <div class="flex justify-end items-center gap-3">
        <RouterLink
          :to="`/events/${event.slug || event.id}`"
          class="rounded-full border border-black bg-[#fafaf9] px-6 py-2.5 text-xs font-bold text-black hover:bg-white transition-colors"
        >
          Preview Publik ↗
        </RouterLink>
        <button
          @click="saveChanges"
          class="rounded-full bg-black px-8 py-2.5 text-xs font-bold text-white hover:bg-slate-800 transition-colors cursor-pointer"
        >
          Simpan Perubahan
        </button>
      </div>
    </div>

    <!-- Section 0: Informasi Dasar, Jadwal, Lokasi & Status -->
    <div class="rounded-xl border border-black bg-[#fafaf9] p-6 space-y-5">
      <div class="border-b border-black/15 pb-3 space-y-1">
        <h3 class="text-lg font-bold text-black font-sans">Informasi Dasar, Lokasi &amp; Jadwal Utama</h3>
        <p class="text-xs text-slate-500">Kelola judul, slug URL publik, deskripsi, waktu acara, lokasi, kapasitas, dan status operasional.</p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        <div class="space-y-1">
          <label class="font-bold text-black">Judul Event</label>
          <input v-model="form.title" type="text" class="w-full rounded-lg border border-black bg-white p-2.5 text-black" />
        </div>
        <div class="space-y-1">
          <label class="font-bold text-black">Slug URL Publik</label>
          <input v-model="form.slug" type="text" class="w-full rounded-lg border border-black bg-white p-2.5 font-mono text-black" />
        </div>
        <div class="space-y-1">
          <label class="font-bold text-black">Kategori</label>
          <select v-model="form.category" class="w-full rounded-lg border border-black bg-white p-2.5 text-black">
            <option v-for="c in store.categories" :key="c.id" :value="c.name">{{ c.name }}</option>
            <option v-if="form.category && !store.categories.some((c) => c.name === form.category)" :value="form.category">{{ form.category }}</option>
          </select>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div class="space-y-1">
            <label class="font-bold text-black">Status Operasional</label>
            <select v-model="form.status" class="w-full rounded-lg border border-black bg-white p-2.5 text-black">
              <option value="Draft">Draft</option>
              <option value="Preparation">Preparation</option>
              <option value="Published">Published</option>
              <option value="Ongoing">Ongoing</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>
          <div class="space-y-1">
            <label class="font-bold text-black">Visibilitas</label>
            <select v-model="form.visibility" class="w-full rounded-lg border border-black bg-white p-2.5 text-black">
              <option value="public">Public Marketplace</option>
              <option value="private">Private Link</option>
            </select>
          </div>
        </div>
      </div>

      <div class="space-y-1 text-xs">
        <label class="font-bold text-black">Deskripsi Lengkap Event</label>
        <textarea v-model="form.description" rows="4" class="w-full rounded-lg border border-black bg-white p-3 text-black" />
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
        <div class="space-y-1">
          <label class="font-bold text-black">Format Venue</label>
          <select v-model="form.location_type" class="w-full rounded-lg border border-black bg-white p-2.5 text-black">
            <option value="offline">Offline</option>
            <option value="online">Online</option>
            <option value="hybrid">Hybrid</option>
          </select>
        </div>
        <div class="space-y-1">
          <label class="font-bold text-black">Nama Venue / Platform</label>
          <input v-model="form.location_name" type="text" class="w-full rounded-lg border border-black bg-white p-2.5 text-black" />
        </div>
        <div class="space-y-1">
          <label class="font-bold text-black">Kapasitas Peserta</label>
          <input v-model.number="form.capacity" type="number" min="1" class="w-full rounded-lg border border-black bg-white p-2.5 text-black" />
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        <div class="space-y-1">
          <label class="font-bold text-black">Alamat Lengkap</label>
          <input v-model="form.address" type="text" class="w-full rounded-lg border border-black bg-white p-2.5 text-black" />
        </div>
        <div class="space-y-1">
          <label class="font-bold text-black">Tautan Online / Meeting (Opsional)</label>
          <input v-model="form.online_url" type="text" placeholder="https://..." class="w-full rounded-lg border border-black bg-white p-2.5 text-black" />
        </div>
        <div class="space-y-1">
          <label class="font-bold text-black">Waktu Mulai</label>
          <input v-model="form.start_at" type="datetime-local" class="w-full rounded-lg border border-black bg-white p-2.5 text-black" />
        </div>
        <div class="space-y-1">
          <label class="font-bold text-black">Waktu Selesai</label>
          <input v-model="form.end_at" type="datetime-local" class="w-full rounded-lg border border-black bg-white p-2.5 text-black" />
        </div>
      </div>
    </div>

    <!-- Section 1: Foto Profil (Poster) & Banner Cover (100% Match to Screenshot 14) -->
    <div class="rounded-xl border border-black bg-[#fafaf9] p-6 space-y-5">
      <div class="border-b border-black/15 pb-3 space-y-1">
        <h3 class="text-lg font-bold text-black font-sans">Foto Profil (Poster) &amp; Banner Cover</h3>
        <p class="text-xs text-slate-500">Foto ini tampil di kartu marketplace, halaman detail event, dan di sidebar workspace.</p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        <!-- Left (4 Cols): Foto Profil / Poster Event -->
        <div class="md:col-span-4 space-y-2.5">
          <label class="block text-xs font-bold text-black">Foto Profil / Poster Event</label>
          <div class="aspect-[4/5] w-full rounded-xl overflow-hidden bg-black relative">
            <img :src="form.poster_url" alt="Poster" class="w-full h-full object-cover" />
            <label class="absolute bottom-3 left-4 right-4 text-center rounded-full bg-black/80 py-2 text-xs font-bold text-white hover:bg-black cursor-pointer">
              <span>{{ uploadingField === 'poster_url' ? 'Mengunggah ke Supabase...' : '↑ Unggah Foto Profil' }}</span>
              <input type="file" accept="image/*" class="hidden" :disabled="Boolean(uploadingField)" @change="handleImageUpload($event, 'poster_url', 'posters')" />
            </label>
          </div>
          <input
            v-model="form.poster_url"
            type="text"
            class="w-full rounded-lg border border-black bg-[#fafaf9] p-2.5 text-[11px] text-slate-700 focus:outline-hidden"
          />
        </div>

        <!-- Right (8 Cols): Banner Cover Event (16:9) -->
        <div class="md:col-span-8 space-y-2.5">
          <label class="block text-xs font-bold text-black">Banner Cover Event (16:9)</label>
          <div class="aspect-[16/9] w-full rounded-xl overflow-hidden bg-black relative">
            <img :src="form.banner_url || form.poster_url" alt="Banner" class="w-full h-full object-cover" />
            <label class="absolute bottom-3 right-4 rounded-full bg-black/80 px-5 py-2 text-xs font-bold text-white hover:bg-black cursor-pointer">
              <span>{{ uploadingField === 'banner_url' ? 'Mengunggah ke Supabase...' : '↑ Ganti Banner Cover' }}</span>
              <input type="file" accept="image/*" class="hidden" :disabled="Boolean(uploadingField)" @change="handleImageUpload($event, 'banner_url', 'banners')" />
            </label>
          </div>
          <input
            v-model="form.banner_url"
            type="text"
            class="w-full rounded-lg border border-black bg-[#fafaf9] p-2.5 text-[11px] text-slate-700 focus:outline-hidden"
          />
        </div>
      </div>

      <!-- Galeri Foto Tambahan (Opsional) inside same card -->
      <div class="pt-4 border-t border-black/15 space-y-2.5">
        <label class="block text-xs font-bold text-black">Galeri Foto Tambahan (Opsional)</label>
        <div class="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
          <input
            v-model="newGalleryUrl"
            type="text"
            placeholder="Tempel URL gambar galeri atau unggah file..."
            class="flex-1 rounded-lg border border-black bg-[#fafaf9] p-3 text-xs text-black placeholder:text-slate-400 focus:outline-hidden"
          />
          <label class="rounded-full border border-black bg-white px-5 py-3 text-xs font-bold text-black hover:bg-slate-100 shrink-0 text-center cursor-pointer">
            <span>{{ uploadingField === 'gallery' ? 'Mengunggah...' : '↑ Unggah File' }}</span>
            <input type="file" accept="image/*" class="hidden" :disabled="Boolean(uploadingField)" @change="handleGalleryUpload" />
          </label>
          <button
            @click="addGalleryItem"
            type="button"
            class="rounded-full border border-black bg-[#72a5e4] px-8 py-3 text-xs font-bold text-black hover:bg-[#5c93d9] shrink-0"
          >
            + Tambah
          </button>
        </div>

        <div v-if="form.gallery.length" class="flex flex-wrap gap-3 pt-2">
          <div
            v-for="(img, idx) in form.gallery"
            :key="idx"
            class="h-20 w-28 rounded-lg border border-black overflow-hidden relative group shrink-0 bg-black"
          >
            <img :src="img" alt="Gallery" class="h-full w-full object-cover" />
            <button
              @click="removeGalleryItem(idx)"
              class="absolute top-1 right-1 p-1 rounded-full bg-black text-white hover:bg-rose-600"
            >
              <Trash2 class="h-3 w-3" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Section 2: Guest Star & Pemateri -->
    <div class="rounded-xl border border-black bg-[#fafaf9] p-6 space-y-5">
      <div class="border-b border-black/15 pb-3 space-y-1">
        <h3 class="text-lg font-bold text-black font-sans">Guest Star &amp; Pemateri</h3>
        <p class="text-xs text-slate-500">Daftar pembicara, keynote speaker, atau bintang tamu yang tampil di halaman publik.</p>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div
          v-for="(sp, idx) in form.speakers"
          :key="sp.id"
          class="rounded-xl border border-black bg-white p-4 space-y-2.5 relative group"
        >
          <div class="flex items-center gap-3">
            <img :src="sp.avatar_url" :alt="sp.name" class="h-10 w-10 rounded-lg border border-black object-cover" />
            <div>
              <span class="text-[9px] font-bold uppercase text-slate-400 block">{{ sp.type }}</span>
              <h4 class="text-xs font-bold text-black">{{ sp.name }}</h4>
              <p class="text-[10px] text-slate-500">{{ sp.role_title }}</p>
            </div>
          </div>
          <p class="text-xs font-bold text-black pt-2 border-t border-black/10">{{ sp.topic }}</p>
          <button
            @click="removeSpeaker(idx)"
            class="absolute top-2 right-2 text-slate-400 hover:text-rose-600"
          >
            <Trash2 class="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-5 gap-3 text-xs pt-2 items-center">
        <input v-model="newSpeaker.name" placeholder="Nama Pemateri..." class="rounded-lg border border-black p-2.5 bg-white" />
        <input v-model="newSpeaker.role_title" placeholder="Jabatan & Perusahaan..." class="rounded-lg border border-black p-2.5 bg-white" />
        <input v-model="newSpeaker.topic" placeholder="Topik Bahasan..." class="rounded-lg border border-black p-2.5 bg-white" />
        <label class="rounded-lg border border-black p-2.5 bg-white text-center font-semibold cursor-pointer hover:bg-slate-50 truncate">
          <span>{{ uploadingField === 'speaker_avatar' ? 'Mengunggah...' : newSpeaker.avatar_url ? '✓ Foto Siap' : '↑ Foto Pemateri' }}</span>
          <input type="file" accept="image/*" class="hidden" :disabled="Boolean(uploadingField)" @change="handleSpeakerAvatarUpload" />
        </label>
        <button @click="addSpeaker" type="button" class="rounded-full bg-black text-white font-bold py-2.5">
          + Tambah Pemateri
        </button>
      </div>
    </div>

    <!-- Section 3: Rundown Acara -->
    <div class="rounded-xl border border-black bg-[#fafaf9] p-6 space-y-5">
      <div class="border-b border-black/15 pb-3 space-y-1">
        <h3 class="text-lg font-bold text-black font-sans">Rundown Acara</h3>
        <p class="text-xs text-slate-500">Susunan jadwal sesi acara yang tampil di halaman detail event publik.</p>
      </div>

      <div class="space-y-2.5">
        <div
          v-for="(sc, idx) in form.schedules"
          :key="sc.id"
          class="rounded-xl border border-black bg-white p-4 flex items-center justify-between text-xs"
        >
          <div class="flex flex-wrap items-center gap-3">
            <span v-if="sc.date" class="rounded-full border border-black bg-white px-2.5 py-0.5 text-[10px] font-mono font-bold text-black">
              {{ sc.date }}
            </span>
            <span class="rounded-full border border-black bg-[#72a5e4] px-3.5 py-1 font-bold text-black font-mono">
              {{ sc.start_time }} – {{ sc.end_time }}
            </span>
            <span v-if="sc.track" class="rounded-full border border-black bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold text-black">
              {{ sc.track }}
            </span>
            <div>
              <p class="font-bold text-black">{{ sc.title }}</p>
              <p class="text-slate-500 text-[11px]">{{ sc.location }} • PIC: {{ sc.pic || '-' }} • {{ sc.visibility || 'public' }}</p>
              <p v-if="sc.description" class="text-slate-600 text-[11px] mt-0.5">{{ sc.description }}</p>
            </div>
          </div>
          <button @click="removeSchedule(idx)" class="text-slate-400 hover:text-rose-600">
            <Trash2 class="h-4 w-4" />
          </button>
        </div>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-6 gap-2.5 text-xs pt-2">
        <input v-model="newSchedule.date" type="date" class="rounded-lg border border-black p-2.5 bg-white" />
        <input v-model="newSchedule.title" placeholder="Nama Sesi..." class="sm:col-span-2 rounded-lg border border-black p-2.5 bg-white" />
        <input v-model="newSchedule.track" placeholder="Zona / Track (opsional)" class="rounded-lg border border-black p-2.5 bg-white" />
        <input v-model="newSchedule.start_time" placeholder="09:00" class="rounded-lg border border-black p-2.5 bg-white" />
        <input v-model="newSchedule.end_time" placeholder="10:30" class="rounded-lg border border-black p-2.5 bg-white" />
        <input v-model="newSchedule.location" placeholder="Lokasi Zona..." class="sm:col-span-2 rounded-lg border border-black p-2.5 bg-white" />
        <input v-model="newSchedule.pic" placeholder="Pengisi / PIC..." class="rounded-lg border border-black p-2.5 bg-white" />
        <select v-model="newSchedule.visibility" class="rounded-lg border border-black p-2.5 bg-white">
          <option value="public">Publik</option>
          <option value="internal">Internal</option>
        </select>
        <input v-model="newSchedule.description" placeholder="Deskripsi sesi..." class="sm:col-span-2 rounded-lg border border-black p-2.5 bg-white" />
        <button @click="addSchedule" type="button" class="sm:col-span-6 rounded-full bg-black text-white font-bold py-2.5 cursor-pointer">
          + Tambah Sesi Rundown
        </button>
      </div>
    </div>
  </div>
</template>

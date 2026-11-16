<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import { useEventWorkspaceStore } from '@/stores/eventWorkspace'
import { useToastStore } from '@/stores/toast'
import { MOCK_CATEGORIES } from '@/services/mockData'
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
  start_at: '',
  end_at: '',
  capacity: 600,
  visibility: 'public',
  status: 'Published',
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
  title: '',
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
  form.category = evt.category || MOCK_CATEGORIES[0].name
  form.description = evt.description || ''
  form.poster_url = evt.poster_url || ''
  form.banner_url = evt.banner_url || ''
  form.gallery = [...(evt.gallery || [])]
  form.location_type = evt.location_type || 'hybrid'
  form.location_name = evt.location_name || evt.venue_name || ''
  form.address = evt.address || ''
  form.start_at = toLocalDatetimeInput(evt.start_at || evt.start_date)
  form.end_at = toLocalDatetimeInput(evt.end_at || evt.end_date)
  form.capacity = evt.capacity ?? 600
  form.visibility = evt.visibility || 'public'
  form.status = evt.publication_status || 'Published'
  form.speakers = (evt.speakers || []).map((s) => ({ ...s }))
  form.schedules = (evt.schedules || []).map((s) => ({ ...s }))
}

watch(event, loadEventIntoForm, { immediate: true })

function handleLocalImageUpload(e, targetField) {
  const file = e.target.files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => {
    form[targetField] = String(reader.result)
    toast.success('Gambar berhasil dimuat.')
  }
  reader.readAsDataURL(file)
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
    title: newSchedule.title.trim(),
    start_time: newSchedule.start_time,
    end_time: newSchedule.end_time,
    location: newSchedule.location,
    pic: newSchedule.pic,
    visibility: 'public'
  })
  newSchedule.title = ''
  toast.success('Sesi rundown berhasil ditambahkan.')
}

function removeSchedule(idx) {
  form.schedules.splice(idx, 1)
}

async function saveChanges() {
  if (!event.value) return
  await store.updateEventProfile(event.value.id, {
    title: form.title,
    category: form.category,
    description: form.description,
    poster_url: form.poster_url,
    banner_url: form.banner_url,
    location_type: form.location_type,
    location_name: form.location_name,
    address: form.address,
    start_at: form.start_at,
    end_at: form.end_at,
    capacity: Number(form.capacity) || 100,
    visibility: form.visibility,
    publication_status: form.status,
    gallery: [...form.gallery],
    speakers: [...form.speakers],
    schedules: [...form.schedules]
  })
  toast.success('Perubahan profil & branding event berhasil disimpan!')
}
</script>

<template>
  <div v-if="event" class="space-y-6 min-h-[calc(100vh-6rem)]">
    <!-- Top Header -->
    <div class="space-y-4">
      <div class="space-y-1">
        <div class="flex items-center gap-3">
          <span class="text-[9px] font-bold uppercase tracking-wider text-slate-500">
            CORE EVENT
          </span>
          <span class="rounded-full border border-black bg-[#72a5e4] px-3.5 py-0.5 text-[10px] font-bold text-black">
            Published
          </span>
          <span class="rounded-full border border-black bg-white px-3.5 py-0.5 text-[10px] font-bold text-black">
            Published
          </span>
        </div>
        <h1 class="text-3xl font-bold tracking-tight text-black font-sans pt-1">
          Event Profile &amp; Branding
        </h1>
        <p class="text-xs text-slate-500">
          Atur foto profil/poster, banner cover, deskripsi, waktu, lokasi, serta visibilitas event Anda.
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
          class="rounded-full bg-black px-8 py-2.5 text-xs font-bold text-white hover:bg-slate-800 transition-colors"
        >
          Simpan Perubahan
        </button>
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
              <span>↑ Unggah Foto Profil</span>
              <input type="file" accept="image/*" class="hidden" @change="handleLocalImageUpload($event, 'poster_url')" />
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
              <span>↑ Ganti Banner Cover</span>
              <input type="file" accept="image/*" class="hidden" @change="handleLocalImageUpload($event, 'banner_url')" />
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
            placeholder="Tempel URL gambar galeri..."
            class="flex-1 rounded-lg border border-black bg-[#fafaf9] p-3 text-xs text-black placeholder:text-slate-400 focus:outline-hidden"
          />
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

      <div class="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs pt-2">
        <input v-model="newSpeaker.name" placeholder="Nama Pemateri..." class="rounded-lg border border-black p-2.5 bg-white" />
        <input v-model="newSpeaker.role_title" placeholder="Jabatan & Perusahaan..." class="rounded-lg border border-black p-2.5 bg-white" />
        <input v-model="newSpeaker.topic" placeholder="Topik Bahasan..." class="rounded-lg border border-black p-2.5 bg-white" />
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
          <div class="flex items-center gap-4">
            <span class="rounded-full border border-black bg-[#72a5e4] px-3.5 py-1 font-bold text-black font-mono">
              {{ sc.start_time }} – {{ sc.end_time }}
            </span>
            <div>
              <p class="font-bold text-black">{{ sc.title }}</p>
              <p class="text-slate-500 text-[11px]">{{ sc.location }} • Pengisi/PIC: {{ sc.pic }}</p>
            </div>
          </div>
          <button @click="removeSchedule(idx)" class="text-slate-400 hover:text-rose-600">
            <Trash2 class="h-4 w-4" />
          </button>
        </div>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-5 gap-3 text-xs pt-2">
        <input v-model="newSchedule.title" placeholder="Nama Sesi..." class="sm:col-span-2 rounded-lg border border-black p-2.5 bg-white" />
        <input v-model="newSchedule.start_time" placeholder="09:00" class="rounded-lg border border-black p-2.5 bg-white" />
        <input v-model="newSchedule.end_time" placeholder="10:30" class="rounded-lg border border-black p-2.5 bg-white" />
        <button @click="addSchedule" type="button" class="rounded-full bg-black text-white font-bold py-2.5">
          + Tambah Sesi
        </button>
      </div>
    </div>
  </div>
</template>

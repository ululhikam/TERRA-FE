<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useEventWorkspaceStore } from '@/stores/eventWorkspace'
import { useToastStore } from '@/stores/toast'
import { formatDateTime } from '@/utils/formatters'
import { Users, MapPin, Clock, MessageSquare, Send, Plus, CheckCircle2, Trash2, X } from 'lucide-vue-next'

const props = defineProps({
  eventKey: {
    type: String,
    required: true
  },
  eventTitle: {
    type: String,
    default: 'Event TERRA'
  }
})

const route = useRoute()
const authStore = useAuthStore()
const store = useEventWorkspaceStore()
const toast = useToastStore()

const posts = ref([])
const loading = ref(false)
const submitting = ref(false)
const showCompose = ref(false)
const searchQuery = ref('')
const filterTransport = ref('ALL')
const openReplies = reactive({})
const replyDrafts = reactive({})
const sendingReplyFor = ref('')

const TRANSPORT_OPTIONS = [
  'KRL / MRT / TransJakarta',
  'Carpool / Mobil',
  'Motor Konvoi',
  'Kereta / Travel',
  'Ketemuan di Venue'
]

const form = reactive({
  title: '',
  departure_city: '',
  departure_point: '',
  departure_time: '',
  transport_mode: 'KRL / MRT / TransJakarta',
  slots_available: 3,
  contact_note: '',
  notes: ''
})

async function loadPosts() {
  if (!props.eventKey) return
  loading.value = true
  try {
    posts.value = await store.fetchCompanionPosts(props.eventKey)
    if (posts.value.length > 0) {
      openReplies[posts.value[0].id] = true
    }
  } catch {
    posts.value = []
  } finally {
    loading.value = false
  }
}

watch(() => props.eventKey, loadPosts, { immediate: true })

const filteredPosts = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  return posts.value.filter((p) => {
    const matchMode = filterTransport.value === 'ALL' || p.transport_mode === filterTransport.value
    if (!matchMode) return false
    if (!q) return true
    return (
      String(p.title || '').toLowerCase().includes(q) ||
      String(p.departure_city || '').toLowerCase().includes(q) ||
      String(p.departure_point || '').toLowerCase().includes(q) ||
      String(p.notes || '').toLowerCase().includes(q)
    )
  })
})

function toggleReplies(postId) {
  openReplies[postId] = !openReplies[postId]
}

function getInitials(name = '') {
  return (
    String(name)
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p.charAt(0).toUpperCase())
      .join('') || 'P'
  )
}

function canManage(post) {
  return (
    authStore.isAuthenticated &&
    (authStore.user?.id === post.author_id || authStore.user?.role === 'admin')
  )
}

async function submitPost() {
  if (!authStore.isAuthenticated) {
    toast.error('Silakan masuk terlebih dahulu untuk membuat ajakan berangkat bareng.')
    return
  }
  submitting.value = true
  try {
    const created = await store.createCompanionPost(props.eventKey, {
      ...form,
      slots_available: Number(form.slots_available) || 3
    })
    if (created) {
      posts.value.unshift(created)
      openReplies[created.id] = true
    }
    form.title = ''
    form.departure_city = ''
    form.departure_point = ''
    form.departure_time = ''
    form.contact_note = ''
    form.notes = ''
    form.slots_available = 3
    showCompose.value = false
    toast.success('Ajakan berangkat bareng berhasil diposting!')
  } catch (err) {
    toast.error(err?.message || 'Gagal memposting ajakan forum.')
  } finally {
    submitting.value = false
  }
}

async function submitReply(postId) {
  const text = String(replyDrafts[postId] || '').trim()
  if (!text) return
  if (!authStore.isAuthenticated) {
    toast.error('Silakan masuk terlebih dahulu untuk membalas.')
    return
  }
  sendingReplyFor.value = postId
  try {
    const updated = await store.replyCompanionPost(postId, text)
    if (updated) {
      const idx = posts.value.findIndex((p) => p.id === postId)
      if (idx !== -1) posts.value[idx] = updated
    }
    replyDrafts[postId] = ''
    openReplies[postId] = true
    toast.success('Balasan terkirim ke forum!')
  } catch (err) {
    toast.error(err?.message || 'Gagal mengirim balasan.')
  } finally {
    sendingReplyFor.value = ''
  }
}

async function togglePostStatus(post) {
  const nextStatus = post.status === 'open' ? 'full' : 'open'
  try {
    const updated = await store.updateCompanionPost(post.id, { status: nextStatus })
    if (updated) {
      const idx = posts.value.findIndex((p) => p.id === post.id)
      if (idx !== -1) posts.value[idx] = updated
    }
    toast.success(nextStatus === 'full' ? 'Ditandai penuh.' : 'Dibuka kembali.')
  } catch (err) {
    toast.error(err?.message || 'Gagal memperbarui status.')
  }
}

async function removePost(postId) {
  try {
    await store.deleteCompanionPost(postId)
    posts.value = posts.value.filter((p) => p.id !== postId)
    toast.success('Ajakan dihapus dari forum.')
  } catch (err) {
    toast.error(err?.message || 'Gagal menghapus postingan.')
  }
}
</script>

<template>
  <section class="pt-4 space-y-4">
    <!-- Section Header Card -->
    <div class="rounded-2xl border border-black bg-[#fafaf9] p-5 sm:p-6 space-y-4">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div class="space-y-1">
          <div class="flex flex-wrap items-center gap-2">
            <span class="rounded-full border border-black bg-[#72a5e4] px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider text-black inline-flex items-center gap-1">
              <Users class="h-3 w-3" /> Forum Teman Berangkat
            </span>
            <span class="text-[11px] font-semibold text-slate-500">
              {{ posts.length }} ajakan aktif
            </span>
          </div>
          <h2 class="text-lg sm:text-xl font-bold text-black font-sans">
            Cari Barengan ke {{ eventTitle }}
          </h2>
          <p class="text-xs text-slate-600">
            Datang sendiri? Temukan peserta lain yang searah, atur titik kumpul, atau patungan transportasi ke venue.
          </p>
        </div>

        <button
          v-if="authStore.isAuthenticated"
          type="button"
          @click="showCompose = !showCompose"
          class="rounded-full border border-black px-4 py-2 text-xs font-bold inline-flex items-center justify-center gap-1.5 shrink-0 cursor-pointer transition-colors"
          :class="showCompose ? 'bg-white text-black hover:bg-slate-100' : 'bg-black text-white hover:bg-slate-800'"
        >
          <component :is="showCompose ? X : Plus" class="h-3.5 w-3.5" />
          <span>{{ showCompose ? 'Tutup Form' : 'Buat Ajakan Barengan' }}</span>
        </button>

        <RouterLink
          v-else
          :to="{ path: '/login', query: { redirect: route.fullPath } }"
          class="rounded-full border border-black bg-black px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 inline-flex items-center justify-center gap-1.5 shrink-0"
        >
          <Plus class="h-3.5 w-3.5" />
          <span>Masuk untuk Posting</span>
        </RouterLink>
      </div>

      <!-- Form Buat Ajakan Baru -->
      <form
        v-if="showCompose && authStore.isAuthenticated"
        @submit.prevent="submitPost"
        class="rounded-xl border border-black bg-white p-4 sm:p-5 space-y-3 text-xs"
      >
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div class="sm:col-span-2 space-y-1">
            <label class="font-bold text-black">Judul Ajakan</label>
            <input
              v-model="form.title"
              type="text"
              required
              minlength="3"
              placeholder="Contoh: Barengan KRL / MRT dari Blok M ke Hall B JCC"
              class="w-full rounded-lg border border-black p-2.5 text-black focus:outline-hidden"
            />
          </div>

          <div class="space-y-1">
            <label class="font-bold text-black">Kota / Area Asal</label>
            <input
              v-model="form.departure_city"
              type="text"
              required
              minlength="2"
              placeholder="Jakarta Selatan / Depok / Bandung"
              class="w-full rounded-lg border border-black p-2.5 text-black focus:outline-hidden"
            />
          </div>

          <div class="space-y-1">
            <label class="font-bold text-black">Titik Kumpul (Meeting Point)</label>
            <input
              v-model="form.departure_point"
              type="text"
              required
              minlength="2"
              placeholder="Stasiun MRT Blok M / Pintu Timur"
              class="w-full rounded-lg border border-black p-2.5 text-black focus:outline-hidden"
            />
          </div>

          <div class="space-y-1">
            <label class="font-bold text-black">Moda Transportasi</label>
            <select
              v-model="form.transport_mode"
              class="w-full rounded-lg border border-black p-2.5 text-black bg-white focus:outline-hidden"
            >
              <option v-for="opt in TRANSPORT_OPTIONS" :key="opt" :value="opt">
                {{ opt }}
              </option>
            </select>
          </div>

          <div class="grid grid-cols-2 gap-2.5">
            <div class="space-y-1">
              <label class="font-bold text-black">Jam Berangkat</label>
              <input
                v-model="form.departure_time"
                type="text"
                placeholder="07:30 WIB"
                class="w-full rounded-lg border border-black p-2.5 text-black focus:outline-hidden"
              />
            </div>
            <div class="space-y-1">
              <label class="font-bold text-black">Kuota Teman</label>
              <input
                v-model="form.slots_available"
                type="number"
                min="1"
                max="20"
                class="w-full rounded-lg border border-black p-2.5 text-black focus:outline-hidden"
              />
            </div>
          </div>

          <div class="sm:col-span-2 space-y-1">
            <label class="font-bold text-black">Info Kontak / Koordinasi (Opsional)</label>
            <input
              v-model="form.contact_note"
              type="text"
              placeholder="Misal: Balas thread ini dulu, nanti lanjut grup WhatsApp / IG @username"
              class="w-full rounded-lg border border-black p-2.5 text-black focus:outline-hidden"
            />
          </div>

          <div class="sm:col-span-2 space-y-1">
            <label class="font-bold text-black">Detail Rencana Berangkat</label>
            <textarea
              v-model="form.notes"
              rows="2"
              required
              minlength="5"
              placeholder="Ceritakan rute, estimasi kumpul, atau preferensi barengan..."
              class="w-full rounded-lg border border-black p-2.5 text-black focus:outline-hidden resize-none"
            />
          </div>
        </div>

        <div class="flex justify-end gap-2 pt-1">
          <button
            type="button"
            @click="showCompose = false"
            class="rounded-full border border-black bg-white px-4 py-2 font-semibold text-black hover:bg-slate-100 cursor-pointer"
          >
            Batal
          </button>
          <button
            type="submit"
            :disabled="submitting"
            class="rounded-full bg-[#72a5e4] border border-black px-5 py-2 font-bold text-black hover:bg-[#5c93d9] disabled:opacity-50 cursor-pointer"
          >
            {{ submitting ? 'Memposting...' : 'Publikasikan Ajakan' }}
          </button>
        </div>
      </form>

      <!-- Search & Filter Bar -->
      <div class="flex flex-col sm:flex-row gap-2.5 text-xs">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Cari kota asal, stasiun, atau titik kumpul..."
          class="flex-1 rounded-full border border-black bg-white px-4 py-2 text-black placeholder:text-slate-400 focus:outline-hidden"
        />
        <select
          v-model="filterTransport"
          class="rounded-full border border-black bg-white px-4 py-2 font-semibold text-black focus:outline-hidden"
        >
          <option value="ALL">Semua Transportasi</option>
          <option v-for="opt in TRANSPORT_OPTIONS" :key="opt" :value="opt">
            {{ opt }}
          </option>
        </select>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="py-8 text-center text-xs text-slate-500">
        Memuat forum teman berangkat...
      </div>

      <!-- Empty State -->
      <div
        v-else-if="filteredPosts.length === 0"
        class="rounded-xl border border-dashed border-black/40 bg-white p-6 text-center space-y-2"
      >
        <p class="text-xs font-bold text-black">Belum ada ajakan berangkat bareng yang cocok.</p>
        <p class="text-[11px] text-slate-500">
          Jadilah yang pertama membuat ajakan dari area kamu supaya peserta lain bisa ikut!
        </p>
      </div>

      <!-- Posts List -->
      <div v-else class="space-y-3.5">
        <article
          v-for="post in filteredPosts"
          :key="post.id"
          class="rounded-xl border border-black bg-white p-4 sm:p-5 space-y-3"
        >
          <!-- Author & Status Row -->
          <div class="flex items-start justify-between gap-3">
            <div class="flex items-center gap-3 min-w-0">
              <img
                v-if="post.author?.avatar_url"
                :src="post.author.avatar_url"
                :alt="post.author.full_name"
                class="h-9 w-9 rounded-full border border-black object-cover shrink-0 bg-[#fafaf9]"
              />
              <div
                v-else
                class="h-9 w-9 rounded-full border border-black bg-[#72a5e4] flex items-center justify-center text-xs font-black text-black shrink-0"
              >
                {{ getInitials(post.author?.full_name) }}
              </div>
              <div class="min-w-0">
                <div class="flex flex-wrap items-center gap-1.5">
                  <span class="text-xs font-bold text-black truncate">
                    {{ post.author?.full_name || 'Peserta TERRA' }}
                  </span>
                  <span
                    v-if="post.author?.has_ticket"
                    class="inline-flex items-center gap-0.5 rounded-full border border-black bg-[#72a5e4]/35 px-2 py-0.5 text-[9px] font-bold text-black"
                  >
                    <CheckCircle2 class="h-2.5 w-2.5" /> Punya Tiket
                  </span>
                </div>
                <p class="text-[10px] text-slate-500">
                  {{ formatDateTime(post.created_at) }}
                </p>
              </div>
            </div>

            <div class="flex items-center gap-1.5 shrink-0">
              <span
                class="rounded-full border border-black px-2.5 py-0.5 text-[10px] font-bold uppercase"
                :class="post.status === 'open' ? 'bg-[#72a5e4] text-black' : 'bg-slate-200 text-slate-700'"
              >
                {{ post.status === 'open' ? `Cari ${post.slots_available} Orang` : post.status === 'full' ? 'Sudah Penuh' : 'Ditutup' }}
              </span>
              <button
                v-if="canManage(post)"
                type="button"
                @click="togglePostStatus(post)"
                class="rounded-full border border-black bg-white px-2.5 py-0.5 text-[10px] font-semibold hover:bg-slate-100 cursor-pointer"
              >
                {{ post.status === 'open' ? 'Tandai Penuh' : 'Buka Lagi' }}
              </button>
              <button
                v-if="canManage(post)"
                type="button"
                @click="removePost(post.id)"
                title="Hapus ajakan"
                class="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
              >
                <Trash2 class="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <!-- Post Title & Route Metadata -->
          <div class="space-y-2">
            <h3 class="text-sm sm:text-base font-bold text-black leading-snug">
              {{ post.title }}
            </h3>
            <div class="flex flex-wrap gap-2 text-[11px]">
              <span class="inline-flex items-center gap-1 rounded-full border border-black/30 bg-[#fafaf9] px-2.5 py-0.5 font-semibold text-black">
                <MapPin class="h-3 w-3" /> {{ post.departure_city }} • {{ post.departure_point }}
              </span>
              <span
                v-if="post.departure_time"
                class="inline-flex items-center gap-1 rounded-full border border-black/30 bg-[#fafaf9] px-2.5 py-0.5 font-semibold text-black"
              >
                <Clock class="h-3 w-3" /> {{ post.departure_time }}
              </span>
              <span class="inline-flex items-center gap-1 rounded-full border border-black/30 bg-[#fafaf9] px-2.5 py-0.5 font-semibold text-slate-700">
                {{ post.transport_mode }}
              </span>
            </div>
            <p class="text-xs text-slate-700 leading-relaxed">
              {{ post.notes }}
            </p>
            <p v-if="post.contact_note" class="text-[11px] font-medium text-slate-600">
              Koordinasi: <span class="text-black font-semibold">{{ post.contact_note }}</span>
            </p>
          </div>

          <!-- Replies Toggle & Inline Thread -->
          <div class="pt-2.5 border-t border-black/10 space-y-3">
            <button
              type="button"
              @click="toggleReplies(post.id)"
              class="inline-flex items-center gap-1.5 text-[11px] font-bold text-black hover:underline cursor-pointer"
            >
              <MessageSquare class="h-3.5 w-3.5" />
              <span>
                {{ (post.replies || []).length }} Balasan •
                {{ openReplies[post.id] ? 'Sembunyikan Diskusi' : 'Gabung / Balas Diskusi' }}
              </span>
            </button>

            <div v-if="openReplies[post.id]" class="space-y-2.5 pl-3 border-l-2 border-black/20">
              <div
                v-for="rep in (post.replies || [])"
                :key="rep.id"
                class="rounded-lg border border-black/15 bg-[#fafaf9] p-3 space-y-1 text-xs"
              >
                <div class="flex flex-wrap items-center justify-between gap-2">
                  <div class="flex items-center gap-1.5">
                    <span class="font-bold text-black">{{ rep.author?.full_name || 'Peserta' }}</span>
                    <span
                      v-if="rep.author?.has_ticket"
                      class="rounded-full border border-black/40 bg-[#72a5e4]/30 px-1.5 py-0.5 text-[9px] font-bold text-black"
                    >
                      Punya Tiket
                    </span>
                  </div>
                  <span class="text-[10px] text-slate-400">{{ formatDateTime(rep.created_at) }}</span>
                </div>
                <p class="text-slate-700">{{ rep.message }}</p>
              </div>

              <!-- Reply Input -->
              <form
                v-if="authStore.isAuthenticated"
                @submit.prevent="submitReply(post.id)"
                class="flex gap-2 pt-1"
              >
                <input
                  v-model="replyDrafts[post.id]"
                  type="text"
                  minlength="2"
                  placeholder="Tulis balasan (misal: Aku ikut dari titik ini ya!)..."
                  class="flex-1 rounded-full border border-black bg-white px-3.5 py-1.5 text-xs text-black placeholder:text-slate-400 focus:outline-hidden"
                />
                <button
                  type="submit"
                  :disabled="sendingReplyFor === post.id || !String(replyDrafts[post.id] || '').trim()"
                  class="rounded-full border border-black bg-[#72a5e4] px-3.5 py-1.5 text-xs font-bold text-black hover:bg-[#5c93d9] disabled:opacity-50 inline-flex items-center gap-1 cursor-pointer"
                >
                  <Send class="h-3 w-3" />
                  <span>{{ sendingReplyFor === post.id ? '...' : 'Kirim' }}</span>
                </button>
              </form>
              <p v-else class="text-[11px] text-slate-500">
                <RouterLink :to="{ path: '/login', query: { redirect: route.fullPath } }" class="font-bold text-black underline">
                  Masuk ke akun
                </RouterLink>
                untuk ikut nimbrung atau membalas ajakan ini.
              </p>
            </div>
          </div>
        </article>
      </div>
    </div>
  </section>
</template>

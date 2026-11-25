<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import { useEventWorkspaceStore } from '@/stores/eventWorkspace'
import { useAuthStore } from '@/stores/auth'
import { formatDateTime, formatCurrency } from '@/utils/formatters'
import { useToastStore } from '@/stores/toast'
import EventCompanionForum from './components/EventCompanionForum.vue'
import { ArrowLeft, ArrowRight, Flag, MessageSquarePlus, X } from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()
const store = useEventWorkspaceStore()
const authStore = useAuthStore()
const toast = useToastStore()

const event = computed(() =>
  store.events.find((e) => e.slug === route.params.slug || e.id === route.params.slug) || store.events[0]
)

const publicSurveys = ref([])
const surveyAnswers = reactive({})
const submittedSurveyIds = ref([])
const submittingSurveyId = ref('')

const showReportModal = ref(false)
const reportReason = ref('Informasi Event Menyesatkan')
const reportDescription = ref('')
const submittingReport = ref(false)

async function loadEventAndSurveys(slug) {
  await store.fetchEventPublic(slug).catch(() => {})
  if (event.value?.id) {
    publicSurveys.value = await store.fetchPublicSurveys(event.value.id).catch(() => [])
    publicSurveys.value.forEach((srv) => {
      if (!surveyAnswers[srv.id]) surveyAnswers[srv.id] = {}
    })
  }
}

onMounted(() => {
  loadEventAndSurveys(route.params.slug)
})

watch(
  () => route.params.slug,
  (newSlug) => {
    if (newSlug) loadEventAndSurveys(newSlug)
  }
)

const selectedTicketId = ref('')
const quantity = ref(1)

const ticketTypes = computed(() => event.value?.ticket_types || [])

const activeTicket = computed(() => {
  return ticketTypes.value.find((t) => t.id === selectedTicketId.value) || ticketTypes.value[0]
})

const minQty = computed(() => Math.max(1, Number(activeTicket.value?.min_per_order || 1)))
const maxQty = computed(() => {
  const remaining = Math.max(
    1,
    Number(activeTicket.value?.quantity || 100) - Number(activeTicket.value?.sold_quantity || 0)
  )
  const limit = Number(activeTicket.value?.max_per_order || 5)
  return Math.max(minQty.value, Math.min(limit, remaining))
})

const selectedSubtotal = computed(() => {
  const price = Number(activeTicket.value?.price || 0)
  return price * quantity.value
})

watch(
  [minQty, maxQty],
  ([minVal, maxVal]) => {
    if (quantity.value < minVal) quantity.value = minVal
    if (quantity.value > maxVal) quantity.value = maxVal
  },
  { immediate: true }
)

function selectTicket(id) {
  selectedTicketId.value = id
}

function incrementQty() {
  if (quantity.value < maxQty.value) quantity.value++
}

function decrementQty() {
  if (quantity.value > minQty.value) quantity.value--
}

function speakerAvatar(sp) {
  if (sp?.avatar_url) return sp.avatar_url
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(sp?.name || 'Guest')}&background=72a5e4&color=000`
}

async function handleSubmitSurvey(srv) {
  if (!authStore.isAuthenticated) {
    router.push({ path: '/login', query: { redirect: route.fullPath } })
    return
  }
  submittingSurveyId.value = srv.id
  try {
    await store.submitSurveyResponse(srv.id, surveyAnswers[srv.id] || {})
    submittedSurveyIds.value.push(srv.id)
    toast.success('Terima kasih! Respons survei Anda telah direkam.')
  } catch (err) {
    toast.error(err?.message || 'Gagal mengirim respons survei.')
  } finally {
    submittingSurveyId.value = ''
  }
}

async function handleSubmitReport() {
  if (!event.value?.id || reportDescription.value.trim().length < 5) {
    toast.error('Deskripsi laporan minimal 5 karakter.')
    return
  }
  submittingReport.value = true
  try {
    await store.reportPublicEvent(event.value.id, {
      reason: reportReason.value,
      description: reportDescription.value.trim()
    })
    showReportModal.value = false
    reportDescription.value = ''
    toast.success('Laporan dikirim ke tim moderasi Admin TERRA.')
  } catch (err) {
    toast.error(err?.message || 'Gagal mengirim laporan event.')
  } finally {
    submittingReport.value = false
  }
}

function proceedCheckout() {
  router.push({
    path: `/checkout/${event.value.slug || event.value.id}`,
    query: { ticketId: activeTicket.value?.id, qty: quantity.value }
  })
}

function shareEvent() {
  navigator.clipboard?.writeText(window.location.href)
  toast.success('Tautan event disalin ke clipboard!')
}
</script>

<template>
  <div v-if="event" class="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-6">
    <!-- Top Breadcrumb & Quick Actions -->
    <div class="flex items-center justify-between gap-3">
      <RouterLink to="/events" class="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-black transition-colors">
        <ArrowLeft class="h-3.5 w-3.5" /> Kembali ke Katalog Acara
      </RouterLink>

      <div class="flex items-center gap-2">
        <button
          type="button"
          @click="shareEvent"
          class="rounded-full border border-black/30 bg-white px-3.5 py-1.5 text-xs font-semibold text-black hover:border-black cursor-pointer transition-colors"
        >
          Bagikan Tautan
        </button>
        <button
          type="button"
          @click="showReportModal = true"
          class="inline-flex items-center gap-1 rounded-full border border-black/30 bg-white px-3.5 py-1.5 text-xs font-semibold text-rose-700 hover:border-rose-600 hover:bg-rose-50 cursor-pointer transition-colors"
        >
          <Flag class="h-3 w-3" />
          Laporkan
        </button>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      <!-- Left Column (8 Cols) -->
      <div class="lg:col-span-8 space-y-8">
        <!-- Main 16:9 Media Cover -->
        <div class="relative aspect-video rounded-2xl overflow-hidden border-2 border-black bg-black">
          <img
            :src="event.banner_url || event.poster_url"
            :alt="event.title"
            class="w-full h-full object-cover"
          />
          <div class="absolute top-3.5 left-3.5 flex items-center gap-2">
            <span class="rounded-full border border-black bg-[#72a5e4] px-3 py-1 text-[11px] font-bold text-black">
              {{ event.category }}
            </span>
            <span class="rounded-full border border-black bg-white px-3 py-1 text-[11px] font-semibold text-black capitalize">
              {{ event.location_type || 'hybrid' }}
            </span>
          </div>
        </div>

        <!-- Event Masthead -->
        <div class="space-y-4">
          <h1 class="text-2xl sm:text-4xl font-extrabold tracking-tight text-black leading-[1.15]">
            {{ event.title }}
          </h1>

          <!-- Architectural Info Grid -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-2xl border border-black bg-white p-5">
            <div class="space-y-1">
              <span class="text-[11px] font-semibold text-slate-500 block">Waktu Pelaksanaan</span>
              <p class="font-mono text-xs sm:text-sm font-bold text-black">
                {{ formatDateTime(event.start_at || event.start_date) }}
              </p>
            </div>
            <div class="space-y-1 sm:border-l sm:border-black/15 sm:pl-4">
              <span class="text-[11px] font-semibold text-slate-500 block">Lokasi Venue</span>
              <p class="text-xs sm:text-sm font-bold text-black">
                {{ event.location_name || event.venue_name }}
              </p>
              <p class="text-xs text-slate-500 leading-snug">
                {{ event.address || 'Informasi alamat terkonfirmasi saat checkout' }}
              </p>
            </div>
          </div>
        </div>

        <!-- Tentang Event (Clean Readable Sans) -->
        <div class="space-y-2.5">
          <h2 class="text-lg font-bold text-black">Tentang Acara</h2>
          <p class="max-w-[68ch] text-sm sm:text-[15px] text-slate-700 leading-relaxed">
            {{ event.description }}
          </p>
        </div>

        <!-- Guest Star & Pemateri -->
        <div class="space-y-3.5 pt-3">
          <h2 class="text-lg font-bold text-black font-sans">Guest Star &amp; Pemateri</h2>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div
              v-for="sp in (event.speakers || [])"
              :key="sp.id"
              class="rounded-xl border border-black bg-[#fafaf9] p-4 space-y-3 flex flex-col justify-between"
            >
              <div class="space-y-2.5">
                <div class="flex items-center gap-3">
                  <img
                    :src="speakerAvatar(sp)"
                    :alt="sp.name"
                    @error="(e) => { e.target.src = speakerAvatar({ name: sp.name }) }"
                    class="h-10 w-10 rounded-lg border border-black object-cover shrink-0 bg-white"
                  />
                  <div>
                    <span class="text-[8px] font-bold uppercase tracking-wider text-slate-400 block">
                      {{ sp.type || 'PEMATERI' }}
                    </span>
                    <h4 class="text-xs font-bold text-black leading-snug">{{ sp.name }}</h4>
                  </div>
                </div>
                <p class="text-[10px] text-slate-500">{{ sp.role_title }}</p>
              </div>

              <div class="pt-2.5 border-t border-black/10">
                <p class="text-[11px] font-bold text-black leading-snug">{{ sp.topic }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Rundown Acara (Vertical Chronological Programme) -->
        <div v-if="(event.schedules || []).filter(s => !s.visibility || s.visibility === 'public').length" class="space-y-3.5 pt-2">
          <h2 class="text-lg font-bold text-black">Rundown Acara</h2>

          <div class="rounded-2xl border border-black bg-white divide-y divide-black/10 overflow-hidden">
            <div
              v-for="sc in (event.schedules || []).filter(s => !s.visibility || s.visibility === 'public')"
              :key="sc.id"
              class="p-4 sm:px-5 flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-5"
            >
              <div class="sm:w-44 shrink-0 font-mono text-xs font-bold text-black">
                <span>{{ sc.start_time }} – {{ sc.end_time }}</span>
                <span v-if="sc.date" class="block text-[11px] font-normal text-slate-500">{{ sc.date }}</span>
              </div>
              <div class="space-y-1 flex-1 min-w-0">
                <div class="flex flex-wrap items-center gap-2">
                  <p class="text-sm font-bold text-black">{{ sc.title }}</p>
                  <span
                    v-if="sc.track"
                    class="rounded-full border border-black/30 bg-[#72a5e4]/25 px-2.5 py-0.5 text-[10px] font-semibold text-black"
                  >
                    {{ sc.track }}
                  </span>
                </div>
                <p v-if="sc.description" class="text-xs text-slate-600 leading-relaxed">{{ sc.description }}</p>
                <p class="text-[11px] text-slate-500">{{ sc.location }} • PIC: {{ sc.pic || 'Panitia' }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Sub-Events / Rangkaian Pre-Event -->
        <div v-if="(event.sub_events || []).length" class="space-y-3.5 pt-3">
          <div class="flex items-center justify-between gap-2">
            <h2 class="text-lg font-bold text-black font-sans">Rangkaian Pre-Event &amp; Sub-Event</h2>
            <span class="rounded-full border border-black bg-[#72a5e4] px-3 py-0.5 text-[10px] font-bold text-black">
              {{ event.sub_events.length }} Agenda Terkait
            </span>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <RouterLink
              v-for="sub in event.sub_events"
              :key="sub.id"
              :to="`/events/${sub.slug || sub.id}`"
              class="rounded-xl border border-black bg-[#fafaf9] p-4 hover:bg-white transition-colors space-y-1.5 block"
            >
              <div class="flex items-center justify-between gap-2 text-[10px] font-bold text-slate-500 uppercase">
                <span>{{ sub.category || 'Pre-Event' }}</span>
                <span>{{ sub.location_type || 'offline' }}</span>
              </div>
              <h3 class="text-sm font-bold text-black leading-snug">{{ sub.title }}</h3>
              <p class="text-[11px] text-slate-600">{{ formatDateTime(sub.start_at || sub.start_date) }}</p>
              <p class="text-[11px] font-semibold text-black">{{ sub.location_name || sub.venue_name }}</p>
            </RouterLink>
          </div>
        </div>

        <!-- Galeri Dokumentasi / Poster Event -->
        <div v-if="(event.gallery || []).length" class="space-y-3 pt-3">
          <h2 class="text-lg font-bold text-black font-sans">Galeri Visual Event</h2>
          <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <img
              v-for="(imgUrl, idx) in event.gallery"
              :key="idx"
              :src="imgUrl"
              :alt="`${event.title} gallery ${idx + 1}`"
              class="aspect-video w-full rounded-xl border border-black object-cover bg-slate-100"
            />
          </div>
        </div>

        <!-- Survei Evaluasi Publik -->
        <div v-if="publicSurveys.length" class="space-y-4 pt-3">
          <div class="flex items-center gap-2">
            <MessageSquarePlus class="h-4 w-4 text-black" />
            <h2 class="text-lg font-bold text-black font-sans">Survei &amp; Aspirasi Peserta</h2>
          </div>

          <div
            v-for="srv in publicSurveys"
            :key="srv.id"
            class="rounded-2xl border border-black bg-[#fafaf9] p-5 space-y-4"
          >
            <div>
              <h3 class="text-sm font-bold text-black">{{ srv.title }}</h3>
              <p class="text-xs text-slate-600 mt-0.5">{{ srv.description }}</p>
            </div>

            <div v-if="submittedSurveyIds.includes(srv.id)" class="rounded-xl border border-black bg-emerald-100 p-3 text-xs font-bold text-black">
              ✓ Jawaban survei Anda sudah diterima.
            </div>

            <form v-else @submit.prevent="handleSubmitSurvey(srv)" class="space-y-3 text-xs">
              <template v-if="(srv.questions || []).length">
                <div v-for="(q, qIdx) in srv.questions" :key="q.id || qIdx" class="space-y-1.5">
                  <label class="font-bold text-black block">{{ qIdx + 1 }}. {{ q.question }}</label>
                  <select
                    v-if="q.question_type === 'rating'"
                    v-model="surveyAnswers[srv.id][q.id || q.question]"
                    required
                    class="w-full rounded-lg border border-black bg-white p-2 text-black"
                  >
                    <option value="">Pilih Rating...</option>
                    <option value="5">5 - Sangat Puas</option>
                    <option value="4">4 - Puas</option>
                    <option value="3">3 - Cukup</option>
                    <option value="2">2 - Kurang</option>
                    <option value="1">1 - Sangat Kurang</option>
                  </select>
                  <select
                    v-else-if="q.question_type === 'multiple_choice' && (q.options || []).length"
                    v-model="surveyAnswers[srv.id][q.id || q.question]"
                    required
                    class="w-full rounded-lg border border-black bg-white p-2 text-black"
                  >
                    <option value="">Pilih Jawaban...</option>
                    <option v-for="opt in q.options" :key="opt" :value="opt">{{ opt }}</option>
                  </select>
                  <input
                    v-else
                    v-model="surveyAnswers[srv.id][q.id || q.question]"
                    type="text"
                    required
                    placeholder="Tuliskan tanggapan Anda..."
                    class="w-full rounded-lg border border-black bg-white p-2 text-black focus:outline-hidden"
                  />
                </div>
              </template>
              <div v-else class="space-y-1.5">
                <label class="font-bold text-black block">Tanggapan Anda</label>
                <textarea
                  v-model="surveyAnswers[srv.id].feedback"
                  rows="2"
                  required
                  placeholder="Tuliskan masukan atau aspirasi..."
                  class="w-full rounded-lg border border-black bg-white p-2 text-black focus:outline-hidden resize-none"
                />
              </div>

              <button
                type="submit"
                :disabled="submittingSurveyId === srv.id"
                class="rounded-full bg-black px-5 py-2 text-xs font-bold text-white hover:bg-slate-800 disabled:opacity-60 cursor-pointer"
              >
                {{ authStore.isAuthenticated ? (submittingSurveyId === srv.id ? 'Mengirim...' : 'Kirim Jawaban Survei') : 'Masuk untuk Isi Survei →' }}
              </button>
            </form>
          </div>
        </div>

        <!-- Forum Teman Berangkat Bareng ke Event -->
        <EventCompanionForum
          :event-key="event.slug || event.id"
          :event-title="event.title"
        />
      </div>

      <!-- Right Column (4 Cols): Organizer Box + Sticky Admission Ticket Stub -->
      <div class="lg:col-span-4 space-y-4 sticky top-22">
        <!-- Diselenggarakan Oleh Card -->
        <RouterLink
          :to="`/organizers/${event.organization?.slug || 'nusantara-tech'}`"
          class="rounded-2xl border border-black bg-white p-4 flex items-center gap-3.5 hover:bg-slate-50 transition-colors block"
        >
          <img
            :src="event.organization?.logo_url || 'https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=200&q=80'"
            :alt="event.organization?.name"
            class="h-11 w-11 rounded-xl border border-black object-cover shrink-0 bg-white"
          />
          <div class="space-y-0.5 min-w-0">
            <span class="text-[11px] font-medium text-slate-500 block">
              Diselenggarakan oleh
            </span>
            <p class="text-xs font-bold text-black truncate">
              {{ event.organization?.name || event.organization_name || 'Nusantara Tech Community' }}
            </p>
            <span class="text-[11px] font-semibold text-slate-700 underline underline-offset-2 block">Lihat profil organizer</span>
          </div>
        </RouterLink>

        <!-- Admission Ticket Stub -->
        <div class="rounded-2xl border-2 border-black bg-white shadow-[4px_4px_0px_#000] overflow-hidden">
          <div class="bg-[#72a5e4] border-b border-black px-5 py-3.5 flex items-center justify-between">
            <h3 class="text-sm font-extrabold text-black">Pilih Tiket</h3>
            <span class="font-mono text-[11px] font-bold text-black">
              {{ ticketTypes.length }} kategori
            </span>
          </div>

          <div class="p-5 space-y-3">
            <div
              v-for="tkt in ticketTypes"
              :key="tkt.id"
              @click="selectTicket(tkt.id)"
              class="rounded-xl border p-3.5 cursor-pointer transition-colors space-y-2"
              :class="activeTicket?.id === tkt.id ? 'border-black bg-[#72a5e4]/20' : 'border-black/20 bg-[#fafaf9] hover:border-black'"
            >
              <div class="flex items-start justify-between gap-2">
                <p class="text-xs font-bold text-black leading-snug">{{ tkt.name }}</p>
                <span
                  class="rounded-full border border-black px-2 py-0.5 text-[10px] font-bold shrink-0"
                  :class="activeTicket?.id === tkt.id ? 'bg-[#72a5e4] text-black' : 'bg-white text-black'"
                >
                  {{ tkt.status || 'On Sale' }}
                </span>
              </div>
              <p v-if="tkt.description" class="text-[11px] text-slate-600 leading-snug">{{ tkt.description }}</p>

              <div class="flex items-center justify-between text-xs pt-1">
                <span class="font-mono text-[11px] text-slate-500">
                  Sisa {{ Math.max(0, (tkt.quantity || 100) - (tkt.sold_quantity || 0)) }}
                </span>
                <span class="font-mono font-bold text-black">
                  {{ Number(tkt.price) > 0 ? formatCurrency(tkt.price) : 'Gratis' }}
                </span>
              </div>
            </div>
          </div>

          <!-- Perforated Ticket Divider -->
          <div class="ticket-stub-divider px-5 py-4 space-y-4 bg-[#fafaf9]">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold text-black">Jumlah Tiket</span>
              <div class="flex items-center rounded-full border border-black bg-white px-3 py-1 gap-4 text-xs font-bold text-black">
                <button @click="decrementQty" type="button" class="hover:opacity-60 cursor-pointer" aria-label="Kurangi">–</button>
                <span class="font-mono">{{ quantity }}</span>
                <button @click="incrementQty" type="button" class="hover:opacity-60 cursor-pointer" aria-label="Tambah">+</button>
              </div>
            </div>

            <div class="flex items-center justify-between text-xs pt-1 border-t border-black/10">
              <span class="font-semibold text-slate-600">Subtotal ({{ quantity }} tiket)</span>
              <span class="font-mono text-base font-extrabold text-black">
                {{ selectedSubtotal > 0 ? formatCurrency(selectedSubtotal) : 'Gratis' }}
              </span>
            </div>

            <button
              @click="proceedCheckout"
              class="shimmer-sheen luxury-pill w-full rounded-full bg-black py-3 text-xs font-bold text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Lanjut ke Checkout
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Mobile Sticky Bottom Ticket Action Bar (Thumb-Ergonomic with Tier Switcher) -->
    <div
      v-if="activeTicket"
      class="lg:hidden fixed bottom-3 inset-x-3 z-40 rounded-2xl border-2 border-black bg-white/96 backdrop-blur-md p-3 shadow-[4px_4px_0px_#000] flex items-center justify-between gap-2.5"
    >
      <div class="min-w-0 flex-1">
        <div v-if="ticketTypes.length > 1" class="relative">
          <select
            :value="activeTicket.id"
            @change="selectTicket($event.target.value)"
            aria-label="Pilih Kategori Tiket"
            class="w-full bg-transparent text-[11px] font-black text-slate-700 truncate pr-4 focus:outline-hidden cursor-pointer"
          >
            <option v-for="t in ticketTypes" :key="t.id" :value="t.id">
              {{ t.name }} — {{ Number(t.price) > 0 ? formatCurrency(t.price) : 'Gratis' }}
            </option>
          </select>
        </div>
        <p v-else class="text-[11px] font-bold text-slate-500 truncate">{{ activeTicket.name }}</p>
        <p class="text-sm font-black text-black leading-tight">
          {{ Number(activeTicket.price) > 0 ? formatCurrency(Number(activeTicket.price) * quantity) : 'Gratis' }}
          <span class="text-[10px] font-semibold text-slate-500">({{ quantity }} tiket)</span>
        </p>
      </div>
      <div class="flex items-center gap-2 shrink-0">
        <div class="flex items-center rounded-full border border-black bg-[#fafaf9] p-0.5 gap-1 text-xs font-bold text-black">
          <button
            @click="decrementQty"
            type="button"
            aria-label="Kurangi jumlah tiket"
            class="h-8 w-8 rounded-full flex items-center justify-center active:bg-[#72a5e4] active:scale-90 transition-all"
          >
            –
          </button>
          <span class="font-mono min-w-[18px] text-center">{{ quantity }}</span>
          <button
            @click="incrementQty"
            type="button"
            aria-label="Tambah jumlah tiket"
            class="h-8 w-8 rounded-full flex items-center justify-center active:bg-[#72a5e4] active:scale-90 transition-all"
          >
            +
          </button>
        </div>
        <button
          @click="proceedCheckout"
          type="button"
          class="shimmer-sheen luxury-pill rounded-full border border-black bg-[#72a5e4] px-4 py-2.5 text-xs font-black text-black shadow-[2px_2px_0px_#000] cursor-pointer"
        >
          Beli &rarr;
        </button>
      </div>
    </div>

    <!-- Modal Laporkan Event -->
    <div
      v-if="showReportModal"
      @click.self="showReportModal = false"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-2xs"
    >
      <div class="w-full max-w-md rounded-3xl border-2 border-black bg-white p-6 space-y-4">
        <div class="flex items-center justify-between border-b border-black/15 pb-3">
          <h3 class="text-lg font-bold text-black font-editorial">Laporkan Event Ini</h3>
          <button @click="showReportModal = false" class="p-1 rounded-full border border-black hover:bg-slate-100">
            <X class="h-4 w-4" />
          </button>
        </div>
        <form @submit.prevent="handleSubmitReport" class="space-y-3 text-xs">
          <div class="space-y-1">
            <label class="font-bold text-black">Alasan Pelaporan</label>
            <select v-model="reportReason" class="w-full rounded-xl border border-black bg-white p-2.5 text-black">
              <option value="Informasi Event Menyesatkan">Informasi Event Menyesatkan</option>
              <option value="Indikasi Penipuan Tiket">Indikasi Penipuan Tiket</option>
              <option value="Konten Tidak Pantas / SARA">Konten Tidak Pantas / SARA</option>
              <option value="Duplikasi atau Spam">Duplikasi atau Spam</option>
            </select>
          </div>
          <div class="space-y-1">
            <label class="font-bold text-black">Detail Penjelasan</label>
            <textarea
              v-model="reportDescription"
              rows="3"
              required
              placeholder="Jelaskan masalah yang Anda temukan (min. 5 karakter)..."
              class="w-full rounded-xl border border-black p-2.5 text-black focus:outline-hidden resize-none"
            />
          </div>
          <div class="flex justify-end gap-2 pt-2">
            <button
              type="button"
              @click="showReportModal = false"
              class="rounded-full border border-black bg-white px-4 py-2 font-semibold text-black"
            >
              Batal
            </button>
            <button
              type="submit"
              :disabled="submittingReport"
              class="rounded-full bg-rose-600 px-5 py-2 font-bold text-white hover:bg-rose-700 disabled:opacity-60"
            >
              {{ submittingReport ? 'Mengirim...' : 'Kirim Laporan' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, nextTick, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useEventWorkspaceStore } from '@/stores/eventWorkspace'
import { useToastStore } from '@/stores/toast'
import { createCameraQrScanner, scanTicketQrFromFile, parseScannedQrPayload } from '@/utils/qrCode'
import {
  Scan,
  CheckCircle2,
  AlertTriangle,
  Upload,
  Camera,
  CameraOff,
  Maximize2,
  Minimize2,
  ArrowLeft,
  SwitchCamera,
  X,
  Keyboard
} from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()
const store = useEventWorkspaceStore()
const toast = useToastStore()

const eventId = computed(() => route.params.eventId || store.activeEvent?.id || 'evt-1')
const ticketInput = ref('')
const participantQuery = ref('')
const selectedStation = ref('Gate A - Main Lobby')
const lastResult = ref(null)
const scannerActive = ref(false)
const isScanningFile = ref(false)
const cameraError = ref('')
const qrFileInput = ref(null)
const isPageFullscreen = ref(true)
const isNativeFullscreen = ref(false)
const cameraFacingMode = ref('environment')
const showFullscreenManual = ref(false)
const fullscreenRootRef = ref(null)
let scannerController = null

watch(
  [isPageFullscreen, scannerActive],
  ([pageFs, camFs]) => {
    if (typeof document !== 'undefined') {
      document.body.style.overflow = pageFs || camFs ? 'hidden' : ''
    }
  },
  { immediate: true }
)

function enterNativeFullscreen(el = document.documentElement) {
  try {
    if (typeof document !== 'undefined' && !document.fullscreenElement) {
      el?.requestFullscreen?.()?.catch?.(() => {})
    }
  } catch {
    // Browser may block fullscreen without direct gesture
  }
}

function exitNativeFullscreen() {
  try {
    if (typeof document !== 'undefined' && document.fullscreenElement) {
      document.exitFullscreen?.()?.catch?.(() => {})
    }
  } catch {
    // Ignore exit errors
  }
}

function toggleNativeFullscreen() {
  if (isNativeFullscreen.value) {
    exitNativeFullscreen()
  } else {
    enterNativeFullscreen()
  }
}

function handleFullscreenChange() {
  if (typeof document !== 'undefined') {
    isNativeFullscreen.value = Boolean(document.fullscreenElement)
  }
}

function handleKeydown(e) {
  if (e.key === 'Escape' && scannerActive.value) {
    stopScanner()
  }
}

async function goBackToEvent() {
  await stopScanner()
  exitNativeFullscreen()
  if (typeof document !== 'undefined') {
    document.body.style.overflow = ''
  }
  router.push(`/dashboard/events/${eventId.value}`)
}

const eventParticipants = computed(() =>
  store.participants.filter((p) => !p.event_id || p.event_id === eventId.value)
)
const matchingPendingParticipants = computed(() => {
  const q = participantQuery.value.trim().toLowerCase()
  const base = eventParticipants.value.filter((p) => !p.checked_in && p.ticket_code)
  if (!q) return base.slice(0, 4)
  return base
    .filter(
      (p) =>
        (p.full_name || '').toLowerCase().includes(q) ||
        (p.email || '').toLowerCase().includes(q) ||
        (p.ticket_code || '').toLowerCase().includes(q)
    )
    .slice(0, 6)
})
const checkedInCount = computed(() => eventParticipants.value.filter((p) => p.checked_in).length)
const totalParticipants = computed(() => eventParticipants.value.length)
const waitingCount = computed(() => Math.max(0, totalParticipants.value - checkedInCount.value))
const attendancePct = computed(() =>
  totalParticipants.value > 0 ? Math.round((checkedInCount.value / totalParticipants.value) * 100) : 0
)
const recentCheckIns = computed(() =>
  store.checkinLogs.filter((log) => !log.event_id || log.event_id === eventId.value)
)

function formatCheckInTime(val) {
  if (!val) return '-'
  if (typeof val === 'string' && val.includes('WIB')) return val
  const d = new Date(val)
  if (Number.isNaN(d.getTime())) return String(val)
  return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB'
}

async function startScanner() {
  cameraError.value = ''
  if (scannerController) {
    await scannerController.stop().catch(() => {})
    scannerController = null
  }

  scannerActive.value = true
  await nextTick()
  enterNativeFullscreen()

  scannerController = createCameraQrScanner('qr-reader', {
    fps: 12,
    qrbox: (viewfinderWidth, viewfinderHeight) => {
      const minEdge = Math.min(viewfinderWidth, viewfinderHeight)
      const size = Math.round(Math.max(220, Math.min(minEdge * 0.65, 360)))
      return { width: size, height: size }
    },
    cooldownMs: 3000,
    onDecode: async (decodedText) => {
      await processCode(decodedText)
    },
    onError: () => {
      cameraError.value = 'Kamera tidak terdeteksi atau izin ditolak. Gunakan Scan Gambar QR atau input manual.'
    }
  })

  try {
    await scannerController.start({ facingMode: cameraFacingMode.value })
  } catch {
    if (scannerController) {
      await scannerController.stop().catch(() => {})
      scannerController = null
    }
    scannerActive.value = false
    cameraError.value = 'Kamera tidak terdeteksi atau izin ditolak. Gunakan Scan Gambar QR atau input manual.'
  }
}

async function stopScanner() {
  if (scannerController) {
    await scannerController.stop().catch(() => {})
    scannerController = null
  }
  scannerActive.value = false
  showFullscreenManual.value = false
}

async function switchCamera() {
  cameraFacingMode.value = cameraFacingMode.value === 'environment' ? 'user' : 'environment'
  if (scannerActive.value) {
    await stopScanner()
    await nextTick()
    await startScanner()
  }
}

function triggerFileUpload() {
  qrFileInput.value?.click()
}

async function handleQrImageUpload(event) {
  const file = event.target.files?.[0]
  if (!file) return
  cameraError.value = ''
  isScanningFile.value = true

  try {
    const { decodedText } = await scanTicketQrFromFile(file)
    await processCode(decodedText)
  } catch {
    const message = 'QR Code tidak terbaca pada gambar tersebut. Pastikan gambar jelas dan tidak terpotong.'
    lastResult.value = {
      success: false,
      ok: false,
      status: 'QR_UNREADABLE',
      message
    }
    toast.error(message)
  } finally {
    isScanningFile.value = false
    if (qrFileInput.value) qrFileInput.value.value = ''
  }
}

async function processCode(code) {
  const parsed = parseScannedQrPayload(code)
  const res = await store.checkInTicket(parsed.raw || code, selectedStation.value, eventId.value)
  lastResult.value = {
    ...res,
    scannedCode: parsed.ticketCode || code,
    station: selectedStation.value,
    timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  }
  if (res.success || res.ok) {
    toast.success(`Check-in berhasil: ${res.participant?.full_name || res.ticket?.ticket_code}`)
  } else {
    toast.error(res.message)
  }
  ticketInput.value = ''
}

function handleManual() {
  if (!ticketInput.value.trim()) return
  processCode(ticketInput.value.trim())
}

function exportCheckinsCsv() {
  const rows = [
    ['Kode Tiket', 'Nama Peserta', 'Kategori Tiket', 'Gate/Station', 'Waktu Check-in'],
    ...recentCheckIns.value.map((l) => [l.ticket_code, l.participant_name, l.ticket_type, l.station, l.checked_in_at])
  ]
  const csv = rows.map((r) => r.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `checkins-${eventId.value}.csv`
  link.click()
  URL.revokeObjectURL(url)
  toast.success('Log check-in CSV berhasil diekspor.')
}

onMounted(() => {
  if (typeof window !== 'undefined') {
    window.addEventListener('keydown', handleKeydown)
  }
  if (typeof document !== 'undefined') {
    document.addEventListener('fullscreenchange', handleFullscreenChange)
  }
  if (eventId.value) {
    store.fetchEventWorkspace(eventId.value)
  }
})

onBeforeUnmount(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('keydown', handleKeydown)
  }
  if (typeof document !== 'undefined') {
    document.removeEventListener('fullscreenchange', handleFullscreenChange)
    document.body.style.overflow = ''
  }
  stopScanner()
  exitNativeFullscreen()
})
</script>

<template>
  <Teleport to="body" :disabled="!isPageFullscreen">
    <div
      ref="fullscreenRootRef"
      :class="
        isPageFullscreen
          ? 'fixed inset-0 z-[80] bg-[#fafaf9] overflow-y-auto p-4 sm:p-6 lg:p-8'
          : 'space-y-6 min-h-[calc(100vh-6rem)]'
      "
    >
      <div :class="isPageFullscreen ? 'mx-auto max-w-7xl space-y-6 pb-8' : 'space-y-6'">
        <!-- Header -->
        <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div class="space-y-1">
            <div class="flex flex-wrap items-center gap-2">
              <button
                v-if="isPageFullscreen"
                type="button"
                @click="goBackToEvent"
                class="inline-flex items-center gap-1.5 rounded-full border border-black bg-white px-3.5 py-1 text-xs font-bold text-black hover:bg-slate-100 cursor-pointer"
              >
                <ArrowLeft class="h-3.5 w-3.5" />
                Kembali
              </button>
              <span class="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                GATE ATTENDANCE
              </span>
              <span class="rounded-full border border-black bg-[#72a5e4] px-3 py-0.5 text-xs font-bold text-black">
                {{ scannerActive ? 'Camera Active' : 'Scanner Ready' }}
              </span>
            </div>
            <h1 class="text-3xl font-bold tracking-tight text-black font-editorial">
              Live Check-in Scanner
            </h1>
            <p class="text-xs text-slate-600">
              Pindai QR Code tiket menggunakan kamera layar penuh, unggah gambar QR, atau input kode manual dengan validasi anti-duplikasi.
            </p>
          </div>

          <div class="flex flex-wrap items-center gap-2">
            <div class="relative w-full sm:w-56">
              <select
                v-model="selectedStation"
                class="w-full rounded-full border border-black bg-white px-5 py-2 text-xs font-semibold text-black focus:outline-hidden appearance-none cursor-pointer"
              >
                <option value="Gate A - Main Lobby">Gate A - Main Lobby</option>
                <option value="Gate B - VIP Lounge">Gate B - VIP Lounge</option>
                <option value="Gate C - Side Entrance">Gate C - Side Entrance</option>
              </select>
              <span class="pointer-events-none absolute right-4 top-2 text-xs">⌄</span>
            </div>

            <button
              type="button"
              @click="toggleNativeFullscreen"
              class="inline-flex items-center gap-1.5 rounded-full border border-black bg-white px-4 py-2 text-xs font-bold text-black hover:bg-slate-100 cursor-pointer"
            >
              <Minimize2 v-if="isNativeFullscreen" class="h-3.5 w-3.5" />
              <Maximize2 v-else class="h-3.5 w-3.5" />
              {{ isNativeFullscreen ? 'Keluar Layar Penuh' : 'Layar Penuh' }}
            </button>

            <button
              type="button"
              @click="isPageFullscreen = !isPageFullscreen"
              class="inline-flex items-center gap-1.5 rounded-full border border-black bg-black px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 cursor-pointer"
            >
              {{ isPageFullscreen ? 'Tampilkan Sidebar' : 'Mode Layar Penuh' }}
            </button>
          </div>
        </div>

    <!-- 3 Stat Metrics -->
    <div v-reveal class="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div class="interactive-surface rounded-2xl border border-black bg-white p-6 space-y-2 flex flex-col justify-between">
        <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">TOTAL PESERTA TERDAFTAR</span>
        <span class="text-3xl font-black text-black leading-none block">{{ totalParticipants }}</span>
        <p class="text-[11px] text-slate-500 pt-2 border-t border-black/10">Database registrasi acara</p>
      </div>

      <div class="interactive-surface rounded-2xl border border-black bg-[#72a5e4] p-6 space-y-2 flex flex-col justify-between">
        <span class="text-[10px] font-bold uppercase tracking-wider text-black block">PESERTA HADIR (CHECKED-IN)</span>
        <span class="text-3xl font-black text-black leading-none block">{{ checkedInCount }} Hadir</span>
        <p class="text-[11px] text-slate-900 pt-2 border-t border-black/20">
          {{ attendancePct }}% kehadiran fisik
        </p>
      </div>

      <div class="interactive-surface rounded-2xl border border-black bg-white p-6 space-y-2 flex flex-col justify-between">
        <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">MENUNGGU DI GATE</span>
        <span class="text-3xl font-black text-black leading-none block">{{ waitingCount }}</span>
        <p class="text-[11px] text-slate-500 pt-2 border-t border-black/10">Belum melakukan check-in</p>
      </div>
    </div>

    <!-- Last Scan Result Banner -->
    <Transition name="modal-pop">
      <div
        v-if="lastResult"
        class="rounded-2xl border border-black p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-[3px_3px_0px_#000]"
        :class="lastResult.success ? 'bg-emerald-50' : 'bg-rose-50'"
      >
        <div class="flex items-start gap-3">
          <CheckCircle2 v-if="lastResult.success" class="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
          <AlertTriangle v-else class="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
          <div class="space-y-0.5">
            <p class="text-xs font-bold uppercase tracking-wider" :class="lastResult.success ? 'text-emerald-800' : 'text-rose-800'">
              {{ lastResult.success ? 'CHECK-IN BERHASIL' : `VALIDASI GAGAL (${lastResult.status || 'ERROR'})` }}
            </p>
            <p class="text-sm font-bold text-black">{{ lastResult.message }}</p>
            <p v-if="lastResult.participant" class="text-xs text-slate-700 font-mono">
              {{ lastResult.participant.full_name }} • {{ lastResult.participant.ticket_type || lastResult.ticket?.ticket_type }} • {{ lastResult.scannedCode }}
            </p>
          </div>
        </div>
        <span class="text-[11px] font-mono text-slate-600 shrink-0">
          {{ lastResult.station }} • {{ lastResult.timestamp }}
        </span>
      </div>
    </Transition>

    <!-- Main Content 2 Columns -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      <!-- Left Column: Camera Scanner & Image QR Scanner -->
      <div class="lg:col-span-7 rounded-2xl border border-black bg-white p-6 space-y-4">
        <div class="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-black/10">
          <h3 class="text-base font-bold text-black">Kamera &amp; Upload QR Scanner</h3>
          <div class="flex items-center gap-2">
            <input
              ref="qrFileInput"
              type="file"
              accept="image/*"
              class="hidden"
              @change="handleQrImageUpload"
            />
            <button
              type="button"
              :disabled="isScanningFile"
              @click="triggerFileUpload"
              class="inline-flex items-center gap-1.5 rounded-full border border-black bg-white px-4 py-1.5 text-xs font-semibold text-black hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-60"
            >
              <Upload class="h-3.5 w-3.5" />
              {{ isScanningFile ? 'Memindai...' : 'Scan Gambar QR' }}
            </button>
            <button
              v-if="!scannerActive"
              type="button"
              @click="startScanner"
              class="inline-flex items-center gap-1.5 rounded-full bg-black px-5 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <Camera class="h-3.5 w-3.5" />
              Buka Kamera
            </button>
            <button
              v-else
              type="button"
              @click="stopScanner"
              class="inline-flex items-center gap-1.5 rounded-full border border-black bg-white px-5 py-1.5 text-xs font-semibold text-black hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <CameraOff class="h-3.5 w-3.5" />
              Tutup Kamera
            </button>
          </div>
        </div>

        <div
          v-if="cameraError"
          class="rounded-xl border border-amber-400 bg-amber-50 p-3 text-xs font-medium text-amber-900 flex items-center gap-2"
        >
          <AlertTriangle class="h-4 w-4 text-amber-700 shrink-0" />
          <span>{{ cameraError }}</span>
        </div>

        <!-- Camera / Viewfinder Box -->
        <div class="relative rounded-xl border border-black bg-black text-white p-8 flex flex-col items-center justify-center min-h-[340px] overflow-hidden">
          <div class="space-y-4 text-center max-w-sm">
            <div class="mx-auto w-16 h-16 rounded-2xl border-2 border-dashed border-white/50 flex items-center justify-center">
              <Scan class="h-8 w-8 text-[#72a5e4]" />
            </div>
            <div>
              <h4 class="text-base font-bold text-white">
                {{ scannerActive ? 'Kamera Layar Penuh Sedang Aktif' : 'Kamera Layar Penuh Siap Digunakan' }}
              </h4>
              <p class="text-xs text-slate-300 mt-1 leading-relaxed">
                Klik <strong>Buka Kamera</strong> untuk masuk ke mode pemindaian QR layar penuh, atau klik <strong>Scan Gambar QR</strong> untuk memindai file PNG/JPG tiket.
              </p>
            </div>
            <button
              v-if="!scannerActive"
              type="button"
              @click="startScanner"
              class="inline-flex items-center gap-2 rounded-full bg-[#72a5e4] border border-black px-5 py-2 text-xs font-bold text-black hover:bg-[#5c93d9] cursor-pointer"
            >
              <Camera class="h-4 w-4" />
              Buka Kamera Layar Penuh
            </button>
          </div>
        </div>

        <div class="flex items-center justify-between text-xs text-slate-600 pt-2 border-t border-black/10">
          <span>Stasiun Pemindaian Aktif: {{ selectedStation }}</span>
          <span class="flex items-center gap-1 font-semibold text-black">
            <span>✓</span> Atomic Validated
          </span>
        </div>
      </div>

      <!-- Right Column: Manual Validation & Live Stream -->
      <div class="lg:col-span-5 space-y-6">
        <!-- Top Card: Validasi Manual -->
        <div class="rounded-2xl border border-black bg-white p-6 space-y-4">
          <div>
            <h3 class="text-base font-bold text-black">Validasi Manual Kode Tiket</h3>
            <p class="text-xs text-slate-500">Masukkan nomor tiket atau payload QR jika kamera tidak dapat digunakan</p>
          </div>

          <form @submit.prevent="handleManual" class="flex gap-2">
            <input
              v-model="ticketInput"
              type="text"
              placeholder="Contoh: EVT26-9841-AB"
              class="flex-1 rounded-xl border border-black bg-white px-4 py-2.5 text-xs text-black font-mono placeholder:text-slate-400 focus:outline-hidden"
            />
            <button
              type="submit"
              class="rounded-xl bg-black px-6 py-2.5 text-xs font-semibold text-white hover:bg-slate-800 transition-colors shrink-0 cursor-pointer"
            >
              Check-in
            </button>
          </form>

          <!-- Live Participant Lookup -->
          <div class="space-y-2.5 pt-2 border-t border-black/10">
            <div class="flex items-center justify-between gap-2">
              <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                CARI PESERTA BELUM CHECK-IN:
              </span>
              <button
                type="button"
                @click="exportCheckinsCsv"
                class="rounded-full border border-black bg-white px-3 py-1 text-[10px] font-bold text-black hover:bg-slate-100 cursor-pointer"
              >
                Export CSV
              </button>
            </div>
            <input
              v-model="participantQuery"
              type="text"
              placeholder="Cari nama, email, atau kode tiket peserta..."
              class="w-full rounded-xl border border-black bg-[#fafaf9] px-3.5 py-2 text-xs text-black focus:outline-hidden"
            />
            <div v-if="matchingPendingParticipants.length" class="space-y-1.5 max-h-44 overflow-y-auto">
              <div
                v-for="p in matchingPendingParticipants"
                :key="p.id"
                class="flex items-center justify-between gap-2 rounded-xl border border-black/20 bg-[#fafaf9] px-3 py-2 text-xs"
              >
                <div class="min-w-0">
                  <p class="font-bold text-black truncate">{{ p.full_name }}</p>
                  <p class="text-[10px] font-mono text-slate-500 truncate">{{ p.ticket_code }} • {{ p.email }}</p>
                </div>
                <button
                  type="button"
                  @click="processCode(p.ticket_code)"
                  class="rounded-full border border-black bg-[#72a5e4] px-3 py-1 text-[11px] font-bold text-black hover:bg-[#5c93d9] shrink-0 cursor-pointer"
                >
                  Check-in
                </button>
              </div>
            </div>
            <p v-else class="text-[11px] text-slate-500">
              Tidak ada peserta menunggu check-in yang cocok.
            </p>
          </div>
        </div>

        <!-- Bottom Card: Live Stream Check-in Terkini -->
        <div class="rounded-2xl border border-black bg-white p-6 space-y-4">
          <div class="flex items-center justify-between pb-2 border-b border-black/10">
            <h3 class="text-sm font-bold text-black">Live Stream Check-in Terkini</h3>
            <span class="rounded-full border border-black bg-[#72a5e4] px-2.5 py-0.2 text-[10px] font-bold text-black">
              REAL-TIME
            </span>
          </div>

          <div class="divide-y divide-black/10 text-xs">
            <div v-for="log in recentCheckIns" :key="log.id" class="py-2.5 flex items-center justify-between">
              <div>
                <p class="font-bold text-black">{{ log.participant_name }}</p>
                <p class="text-[11px] text-slate-500 font-mono">{{ log.ticket_type }} • {{ log.ticket_code }}</p>
                <p class="text-[10px] text-slate-400">{{ log.station }}</p>
              </div>
              <span class="text-xs font-mono font-bold text-black">{{ formatCheckInTime(log.checked_in_at) }}</span>
            </div>
            <div v-if="!recentCheckIns.length" class="py-3 text-slate-500">
              Belum ada peserta check-in di gate ini.
            </div>
          </div>
        </div>
      </div>
    </div>
      </div>
    </div>
  </Teleport>

  <!-- Full-Bleed Live Camera QR Scanner Overlay -->
  <Teleport to="body">
    <div
      v-if="scannerActive"
      class="fixed inset-0 z-[95] bg-black text-white flex flex-col overflow-hidden"
    >
      <!-- Camera Viewfinder -->
      <div class="relative flex-1 w-full h-full bg-black overflow-hidden">
        <div id="qr-reader" class="fullscreen-qr-reader w-full h-full" />
      </div>

      <!-- Top Floating HUD -->
      <div class="absolute top-0 inset-x-0 z-20 p-4 sm:p-5 bg-gradient-to-b from-black/85 via-black/50 to-transparent flex flex-wrap items-center justify-between gap-3">
        <div class="flex flex-wrap items-center gap-2">
          <span class="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/70 bg-emerald-500/20 px-3 py-1 text-xs font-bold text-emerald-200 backdrop-blur-xs">
            <span class="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            LIVE SCANNER
          </span>
          <select
            v-model="selectedStation"
            class="rounded-full border border-white/30 bg-black/70 px-3.5 py-1 text-xs font-semibold text-white focus:outline-hidden backdrop-blur-xs cursor-pointer"
          >
            <option value="Gate A - Main Lobby">Gate A - Main Lobby</option>
            <option value="Gate B - VIP Lounge">Gate B - VIP Lounge</option>
            <option value="Gate C - Side Entrance">Gate C - Side Entrance</option>
          </select>
          <span class="rounded-full border border-black bg-[#72a5e4] px-3 py-1 text-xs font-bold text-black">
            {{ checkedInCount }} / {{ totalParticipants }} Hadir
          </span>
        </div>

        <div class="flex items-center gap-2">
          <button
            type="button"
            @click="switchCamera"
            class="inline-flex items-center gap-1.5 rounded-full border border-white/30 bg-black/70 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-white/15 backdrop-blur-xs cursor-pointer"
          >
            <SwitchCamera class="h-3.5 w-3.5" />
            Ganti Kamera
          </button>
          <button
            type="button"
            @click="stopScanner"
            class="inline-flex items-center gap-1.5 rounded-full border border-black bg-white px-4 py-1.5 text-xs font-bold text-black hover:bg-slate-200 cursor-pointer"
          >
            <X class="h-3.5 w-3.5" />
            Tutup
          </button>
        </div>
      </div>

      <!-- Bottom Floating HUD -->
      <div class="absolute bottom-0 inset-x-0 z-20 p-4 sm:p-6 bg-gradient-to-t from-black/95 via-black/75 to-transparent space-y-3">
        <div
          v-if="lastResult"
          class="mx-auto max-w-2xl rounded-2xl border-2 border-black p-3.5 sm:p-4 flex items-center justify-between gap-3 text-black shadow-[3px_3px_0px_#000]"
          :class="lastResult.success ? 'bg-emerald-300' : 'bg-rose-300'"
        >
          <div class="flex items-start gap-2.5 min-w-0">
            <CheckCircle2 v-if="lastResult.success" class="h-5 w-5 text-black shrink-0 mt-0.5" />
            <AlertTriangle v-else class="h-5 w-5 text-black shrink-0 mt-0.5" />
            <div class="min-w-0">
              <p class="text-[11px] font-black uppercase tracking-wider">
                {{ lastResult.success ? 'CHECK-IN BERHASIL' : `VALIDASI GAGAL (${lastResult.status || 'ERROR'})` }}
              </p>
              <p class="text-xs sm:text-sm font-bold truncate">{{ lastResult.message }}</p>
              <p v-if="lastResult.participant" class="text-[11px] font-mono truncate">
                {{ lastResult.participant.full_name }} • {{ lastResult.scannedCode }}
              </p>
            </div>
          </div>
          <button
            type="button"
            @click="lastResult = null"
            class="rounded-full border border-black bg-white p-1 text-black hover:bg-slate-100 shrink-0 cursor-pointer"
          >
            <X class="h-3.5 w-3.5" />
          </button>
        </div>

        <form
          v-if="showFullscreenManual"
          @submit.prevent="handleManual"
          class="mx-auto max-w-xl flex gap-2"
        >
          <input
            v-model="ticketInput"
            type="text"
            placeholder="Masukkan kode tiket manual..."
            class="flex-1 rounded-full border border-white/40 bg-black/80 px-4 py-2 text-xs text-white font-mono placeholder:text-slate-400 focus:outline-hidden"
          />
          <button
            type="submit"
            class="rounded-full border border-black bg-[#72a5e4] px-5 py-2 text-xs font-bold text-black hover:bg-[#5c93d9] cursor-pointer shrink-0"
          >
            Check-in
          </button>
        </form>

        <div class="flex flex-wrap items-center justify-center gap-2.5">
          <button
            type="button"
            :disabled="isScanningFile"
            @click="triggerFileUpload"
            class="inline-flex items-center gap-1.5 rounded-full border border-white/30 bg-black/75 px-4 py-2 text-xs font-semibold text-white hover:bg-white/15 backdrop-blur-xs cursor-pointer disabled:opacity-60"
          >
            <Upload class="h-3.5 w-3.5" />
            {{ isScanningFile ? 'Memindai...' : 'Scan Gambar QR' }}
          </button>
          <button
            type="button"
            @click="showFullscreenManual = !showFullscreenManual"
            class="inline-flex items-center gap-1.5 rounded-full border border-white/30 bg-black/75 px-4 py-2 text-xs font-semibold text-white hover:bg-white/15 backdrop-blur-xs cursor-pointer"
          >
            <Keyboard class="h-3.5 w-3.5" />
            Input Manual
          </button>
          <button
            type="button"
            @click="stopScanner"
            class="inline-flex items-center gap-1.5 rounded-full border border-black bg-rose-500 px-5 py-2 text-xs font-bold text-white hover:bg-rose-600 cursor-pointer"
          >
            <CameraOff class="h-3.5 w-3.5" />
            Tutup Kamera
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
:deep(.fullscreen-qr-reader) {
  width: 100% !important;
  height: 100% !important;
  border: none !important;
}

:deep(.fullscreen-qr-reader video) {
  width: 100% !important;
  height: 100% !important;
  object-fit: cover !important;
}
</style>

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
  Keyboard,
  Users,
  History,
  Volume2,
  VolumeX,
  FlipHorizontal2,
  Sparkles,
  ShieldCheck
} from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()
const store = useEventWorkspaceStore()
const toast = useToastStore()

const eventId = computed(() => route.params.eventId || store.activeEvent?.id || 'evt-1')
const currentEvent = computed(
  () => store.events.find((e) => e.id === eventId.value) || store.activeEvent
)

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
const isCameraMirrored = ref(false)
const soundEnabled = ref(true)
const activeHudPanel = ref(null) // 'manual' | 'search' | 'logs' | null
const scanFlashState = ref('idle') // 'idle' | 'success' | 'error'
const fullscreenRootRef = ref(null)
let scannerController = null
let flashTimeout = null

watch(
  [isPageFullscreen, scannerActive],
  ([pageFs, camFs]) => {
    if (typeof document !== 'undefined') {
      document.body.style.overflow = pageFs || camFs ? 'hidden' : ''
    }
  },
  { immediate: true }
)

function playScanTone(isSuccess) {
  if (!soundEnabled.value || typeof window === 'undefined') return
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext
    if (!AudioCtx) return
    const ctx = new AudioCtx()
    const now = ctx.currentTime

    if (isSuccess) {
      const osc1 = ctx.createOscillator()
      const gain1 = ctx.createGain()
      osc1.type = 'sine'
      osc1.frequency.setValueAtTime(880, now)
      osc1.frequency.exponentialRampToValueAtTime(1318.5, now + 0.14)
      gain1.gain.setValueAtTime(0.14, now)
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.24)
      osc1.connect(gain1)
      gain1.connect(ctx.destination)
      osc1.start(now)
      osc1.stop(now + 0.25)
    } else {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sawtooth'
      osc.frequency.setValueAtTime(240, now)
      osc.frequency.setValueAtTime(180, now + 0.12)
      gain.gain.setValueAtTime(0.12, now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(now)
      osc.stop(now + 0.3)
    }
  } catch {
    // Ignore audio errors when browser blocks autoplay
  }
}

function triggerReticleFlash(isSuccess) {
  if (flashTimeout) clearTimeout(flashTimeout)
  scanFlashState.value = isSuccess ? 'success' : 'error'
  flashTimeout = setTimeout(() => {
    scanFlashState.value = 'idle'
  }, 2200)
}

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
  if (e.key === 'Escape') {
    if (activeHudPanel.value) {
      activeHudPanel.value = null
    } else if (scannerActive.value) {
      stopScanner()
    }
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
  if (!q) return base.slice(0, 5)
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
const latestLog = computed(() => recentCheckIns.value[0] || null)

function formatCheckInTime(val) {
  if (!val) return '-'
  if (typeof val === 'string' && val.includes('WIB')) return val
  const d = new Date(val)
  if (Number.isNaN(d.getTime())) return String(val)
  return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB'
}

function toggleHudPanel(panel) {
  activeHudPanel.value = activeHudPanel.value === panel ? null : panel
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

  // Pass qrbox: null so html5-qrcode scans full frame cleanly without injecting broken #qr-shaded-region
  scannerController = createCameraQrScanner('qr-reader', {
    fps: 15,
    qrbox: null,
    cooldownMs: 3000,
    onDecode: async (decodedText) => {
      await processCode(decodedText)
    },
    onError: () => {
      cameraError.value =
        'Kamera tidak terdeteksi atau izin ditolak. Gunakan Scan Gambar QR atau input manual.'
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
    cameraError.value =
      'Kamera tidak terdeteksi atau izin ditolak. Gunakan Scan Gambar QR atau input manual.'
  }
}

async function stopScanner() {
  if (scannerController) {
    await scannerController.stop().catch(() => {})
    scannerController = null
  }
  scannerActive.value = false
  activeHudPanel.value = null
}

async function switchCamera() {
  cameraFacingMode.value = cameraFacingMode.value === 'environment' ? 'user' : 'environment'
  isCameraMirrored.value = cameraFacingMode.value === 'user'
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
    const message =
      'QR Code tidak terbaca pada gambar tersebut. Pastikan gambar jelas dan tidak terpotong.'
    lastResult.value = {
      success: false,
      ok: false,
      status: 'QR_UNREADABLE',
      message,
      station: selectedStation.value,
      timestamp: new Date().toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      })
    }
    triggerReticleFlash(false)
    playScanTone(false)
    toast.error(message)
  } finally {
    isScanningFile.value = false
    if (qrFileInput.value) qrFileInput.value.value = ''
  }
}

async function processCode(code) {
  const parsed = parseScannedQrPayload(code)
  const res = await store.checkInTicket(parsed.raw || code, selectedStation.value, eventId.value)
  const isOk = Boolean(res.success || res.ok)
  lastResult.value = {
    ...res,
    success: isOk,
    scannedCode: parsed.ticketCode || code,
    station: selectedStation.value,
    timestamp: new Date().toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }
  triggerReticleFlash(isOk)
  playScanTone(isOk)
  if (isOk) {
    toast.success(`Check-in berhasil: ${res.participant?.full_name || res.ticket?.ticket_code}`)
    if (activeHudPanel.value === 'manual') {
      activeHudPanel.value = null
    }
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
    ...recentCheckIns.value.map((l) => [
      l.ticket_code,
      l.participant_name,
      l.ticket_type,
      l.station,
      l.checked_in_at
    ])
  ]
  const csv = rows
    .map((r) => r.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\n')
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
  if (flashTimeout) clearTimeout(flashTimeout)
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
          ? 'fixed inset-0 z-[80] bg-[#fafaf9] bg-grid-paper overflow-y-auto p-4 sm:p-6 lg:p-8'
          : 'space-y-6 min-h-[calc(100vh-6rem)]'
      "
    >
      <div :class="isPageFullscreen ? 'mx-auto max-w-7xl space-y-6 pb-8' : 'space-y-6'">
        <!-- Header -->
        <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div class="space-y-1.5">
            <div class="flex flex-wrap items-center gap-2">
              <button
                v-if="isPageFullscreen"
                type="button"
                @click="goBackToEvent"
                class="luxury-pill inline-flex items-center gap-1.5 rounded-full border border-black bg-white px-3.5 py-1 text-xs font-bold text-black hover:bg-slate-100 cursor-pointer"
              >
                <ArrowLeft class="h-3.5 w-3.5" />
                Kembali ke Workspace
              </button>
              <span class="rounded-full border border-black bg-black px-3 py-0.5 text-[10px] font-black uppercase tracking-wider text-white">
                GATE KIOSK
              </span>
              <span class="rounded-full border border-black bg-[#72a5e4] px-3 py-0.5 text-xs font-bold text-black">
                {{ scannerActive ? 'Camera Live' : 'Scanner Ready' }}
              </span>
            </div>
            <h1 class="text-2xl sm:text-3xl font-black tracking-tight text-black font-editorial">
              {{ currentEvent?.title || 'Live Check-in Scanner' }}
            </h1>
            <p class="text-xs text-slate-600">
              Pindai QR E-Ticket peserta secara real-time dengan kunci validasi atomik anti-duplikasi.
            </p>
          </div>

          <div class="flex flex-wrap items-center gap-2">
            <div class="relative w-full sm:w-56">
              <select
                v-model="selectedStation"
                class="w-full rounded-full border-2 border-black bg-white px-4 py-2 text-xs font-bold text-black focus:outline-hidden appearance-none cursor-pointer shadow-[2px_2px_0px_#000]"
              >
                <option value="Gate A - Main Lobby">Gate A - Main Lobby</option>
                <option value="Gate B - VIP Lounge">Gate B - VIP Lounge</option>
                <option value="Gate C - Side Entrance">Gate C - Side Entrance</option>
              </select>
              <span class="pointer-events-none absolute right-4 top-2 text-xs font-bold">⌄</span>
            </div>

            <button
              type="button"
              @click="toggleNativeFullscreen"
              class="luxury-pill inline-flex items-center gap-1.5 rounded-full border border-black bg-white px-4 py-2 text-xs font-bold text-black hover:bg-slate-100 cursor-pointer"
            >
              <Minimize2 v-if="isNativeFullscreen" class="h-3.5 w-3.5" />
              <Maximize2 v-else class="h-3.5 w-3.5" />
              {{ isNativeFullscreen ? 'Keluar Fullscreen' : 'Fullscreen' }}
            </button>

            <button
              type="button"
              @click="isPageFullscreen = !isPageFullscreen"
              class="luxury-pill inline-flex items-center gap-1.5 rounded-full border border-black bg-black px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 cursor-pointer"
            >
              {{ isPageFullscreen ? 'Tampilkan Sidebar' : 'Mode Kiosk' }}
            </button>
          </div>
        </div>

        <!-- 3 Stat Metrics -->
        <div v-reveal class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div class="interactive-surface rounded-2xl border-2 border-black bg-white p-5 sm:p-6 space-y-2 flex flex-col justify-between shadow-[3px_3px_0px_#000]">
            <span class="text-[10px] font-black uppercase tracking-wider text-slate-400 block">TOTAL PESERTA TERDAFTAR</span>
            <span class="text-3xl font-black text-black leading-none block">{{ totalParticipants }}</span>
            <p class="text-[11px] text-slate-500 pt-2 border-t border-black/10">Database registrasi acara</p>
          </div>

          <div class="interactive-surface rounded-2xl border-2 border-black bg-[#72a5e4] p-5 sm:p-6 space-y-2.5 flex flex-col justify-between shadow-[3px_3px_0px_#000]">
            <div class="flex items-center justify-between">
              <span class="text-[10px] font-black uppercase tracking-wider text-black">PESERTA HADIR (CHECKED-IN)</span>
              <span class="rounded-full border border-black bg-white px-2 py-0.5 text-[10px] font-black text-black">{{ attendancePct }}%</span>
            </div>
            <span class="text-3xl font-black text-black leading-none block">{{ checkedInCount }} Hadir</span>
            <div class="space-y-1 pt-1">
              <div class="h-2 w-full rounded-full border border-black bg-white/70 overflow-hidden">
                <div class="h-full bg-black transition-all duration-500" :style="{ width: `${attendancePct}%` }" />
              </div>
              <p class="text-[11px] font-semibold text-slate-900">Tervalidasi di gate acara</p>
            </div>
          </div>

          <div class="interactive-surface rounded-2xl border-2 border-black bg-white p-5 sm:p-6 space-y-2 flex flex-col justify-between shadow-[3px_3px_0px_#000]">
            <span class="text-[10px] font-black uppercase tracking-wider text-slate-400 block">MENUNGGU DI GATE</span>
            <span class="text-3xl font-black text-black leading-none block">{{ waitingCount }}</span>
            <p class="text-[11px] text-slate-500 pt-2 border-t border-black/10">Belum melakukan check-in</p>
          </div>
        </div>

        <!-- Last Scan Result Banner -->
        <Transition name="modal-pop">
          <div
            v-if="lastResult"
            class="rounded-2xl border-2 border-black p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-[4px_4px_0px_#000]"
            :class="lastResult.success ? 'bg-emerald-100' : 'bg-rose-100'"
          >
            <div class="flex items-start gap-3">
              <CheckCircle2 v-if="lastResult.success" class="h-6 w-6 text-emerald-700 shrink-0 mt-0.5" />
              <AlertTriangle v-else class="h-6 w-6 text-rose-700 shrink-0 mt-0.5" />
              <div class="space-y-0.5">
                <p class="text-xs font-black uppercase tracking-wider" :class="lastResult.success ? 'text-emerald-900' : 'text-rose-900'">
                  {{ lastResult.success ? 'CHECK-IN BERHASIL' : `VALIDASI GAGAL (${lastResult.status || 'ERROR'})` }}
                </p>
                <p class="text-sm font-bold text-black">{{ lastResult.message }}</p>
                <p v-if="lastResult.participant" class="text-xs text-slate-800 font-mono">
                  {{ lastResult.participant.full_name }} • {{ lastResult.participant.ticket_type || lastResult.ticket?.ticket_type }} • {{ lastResult.scannedCode }}
                </p>
              </div>
            </div>
            <span class="text-[11px] font-mono font-bold text-slate-700 shrink-0">
              {{ lastResult.station }} • {{ lastResult.timestamp }}
            </span>
          </div>
        </Transition>

        <!-- Main Content 2 Columns -->
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <!-- Left Column: Camera Launchpad & Image QR Scanner -->
          <div class="lg:col-span-7 rounded-3xl border-2 border-black bg-white p-5 sm:p-6 space-y-4 shadow-[4px_4px_0px_#000]">
            <div class="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-black/10">
              <div class="flex items-center gap-2">
                <span class="h-2.5 w-2.5 rounded-full bg-[#72a5e4] border border-black" />
                <h3 class="text-base font-black text-black">Optical QR Gate Scanner</h3>
              </div>
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
                  class="luxury-pill inline-flex items-center gap-1.5 rounded-full border border-black bg-white px-4 py-1.5 text-xs font-bold text-black hover:bg-slate-100 cursor-pointer disabled:opacity-60"
                >
                  <Upload class="h-3.5 w-3.5" />
                  {{ isScanningFile ? 'Memindai...' : 'Upload Gambar QR' }}
                </button>
                <button
                  v-if="!scannerActive"
                  type="button"
                  @click="startScanner"
                  class="luxury-pill inline-flex items-center gap-1.5 rounded-full border border-black bg-[#72a5e4] px-5 py-1.5 text-xs font-black text-black shadow-[2px_2px_0px_#000] cursor-pointer"
                >
                  <Camera class="h-3.5 w-3.5" />
                  Buka Kamera
                </button>
              </div>
            </div>

            <div
              v-if="cameraError"
              class="rounded-xl border border-amber-500 bg-amber-50 p-3 text-xs font-semibold text-amber-900 flex items-center gap-2"
            >
              <AlertTriangle class="h-4 w-4 text-amber-700 shrink-0" />
              <span>{{ cameraError }}</span>
            </div>

            <!-- Stylish Kiosk Camera Launchpad -->
            <div class="relative rounded-2xl border-2 border-black bg-slate-950 text-white p-8 flex flex-col items-center justify-center min-h-[340px] overflow-hidden">
              <!-- Subtle HUD Grid Background -->
              <div
                class="pointer-events-none absolute inset-0 opacity-20"
                style="background-image: linear-gradient(to right, rgba(114,165,228,0.25) 1px, transparent 1px), linear-gradient(to bottom, rgba(114,165,228,0.25) 1px, transparent 1px); background-size: 32px 32px;"
              />

              <div class="relative z-10 space-y-5 text-center max-w-md">
                <!-- Preview HUD Reticle Icon -->
                <div class="relative mx-auto w-24 h-24 flex items-center justify-center">
                  <span class="absolute top-0 left-0 w-5 h-5 border-t-3 border-l-3 border-[#72a5e4] rounded-tl-lg" />
                  <span class="absolute top-0 right-0 w-5 h-5 border-t-3 border-r-3 border-[#72a5e4] rounded-tr-lg" />
                  <span class="absolute bottom-0 left-0 w-5 h-5 border-b-3 border-l-3 border-[#72a5e4] rounded-bl-lg" />
                  <span class="absolute bottom-0 right-0 w-5 h-5 border-b-3 border-r-3 border-[#72a5e4] rounded-br-lg" />
                  <Scan class="h-10 w-10 text-[#72a5e4]" />
                </div>

                <div class="space-y-1.5">
                  <span class="inline-flex items-center gap-1.5 rounded-full border border-[#72a5e4]/40 bg-[#72a5e4]/15 px-3 py-0.5 text-[10px] font-black uppercase tracking-widest text-[#72a5e4]">
                    <Sparkles class="h-3 w-3" />
                    FULLSCREEN HUD KIOSK
                  </span>
                  <h4 class="text-lg font-black text-white">
                    Siap Memindai QR E-Ticket Peserta
                  </h4>
                  <p class="text-xs text-slate-300 leading-relaxed">
                    Mode kamera layar penuh dilengkapi reticle pemindai laser, indikator suara otomatis, pencarian peserta instan, dan proteksi anti-tiket ganda.
                  </p>
                </div>

                <div class="flex flex-wrap items-center justify-center gap-2.5 pt-1">
                  <button
                    type="button"
                    @click="startScanner"
                    class="shimmer-sheen luxury-pill inline-flex items-center gap-2 rounded-full border-2 border-black bg-[#72a5e4] px-6 py-2.5 text-xs font-black text-black shadow-[3px_3px_0px_#fff] cursor-pointer"
                  >
                    <Camera class="h-4 w-4" />
                    Mulai Kamera Layar Penuh
                  </button>
                  <button
                    type="button"
                    @click="triggerFileUpload"
                    class="luxury-pill inline-flex items-center gap-1.5 rounded-full border border-white/30 bg-white/10 px-4 py-2.5 text-xs font-bold text-white hover:bg-white/20 cursor-pointer"
                  >
                    <Upload class="h-3.5 w-3.5" />
                    Pilih File Gambar QR
                  </button>
                </div>
              </div>
            </div>

            <div class="flex items-center justify-between text-xs text-slate-600 pt-2 border-t border-black/10">
              <span>Gate Aktif: <strong class="text-black">{{ selectedStation }}</strong></span>
              <span class="inline-flex items-center gap-1 font-bold text-black">
                <ShieldCheck class="h-4 w-4 text-[#72a5e4]" />
                Atomic Lock Active
              </span>
            </div>
          </div>

          <!-- Right Column: Manual Validation & Live Stream -->
          <div class="lg:col-span-5 space-y-6">
            <!-- Top Card: Validasi Manual -->
            <div class="rounded-3xl border-2 border-black bg-white p-5 sm:p-6 space-y-4 shadow-[4px_4px_0px_#000]">
              <div>
                <h3 class="text-base font-black text-black">Validasi Manual &amp; Pencarian Peserta</h3>
                <p class="text-xs text-slate-500">Masukkan kode tiket atau cari nama peserta jika layar QR bermasalah</p>
              </div>

              <form @submit.prevent="handleManual" class="flex gap-2">
                <input
                  v-model="ticketInput"
                  type="text"
                  placeholder="Contoh: DEMAFEST26-VIP-001"
                  class="flex-1 rounded-xl border border-black bg-white px-4 py-2.5 text-xs text-black font-mono placeholder:text-slate-400 focus:outline-hidden"
                />
                <button
                  type="submit"
                  class="luxury-pill rounded-xl bg-black px-5 py-2.5 text-xs font-bold text-white hover:bg-slate-800 shrink-0 cursor-pointer"
                >
                  Check-in
                </button>
              </form>

              <!-- Live Participant Lookup -->
              <div class="space-y-2.5 pt-3 border-t border-black/10">
                <div class="flex items-center justify-between gap-2">
                  <span class="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                    DAFTAR TUNGGU PESERTA ({{ waitingCount }}):
                  </span>
                  <button
                    type="button"
                    @click="exportCheckinsCsv"
                    class="luxury-pill rounded-full border border-black bg-white px-3 py-1 text-[10px] font-bold text-black hover:bg-slate-100 cursor-pointer"
                  >
                    Export CSV
                  </button>
                </div>
                <input
                  v-model="participantQuery"
                  type="text"
                  placeholder="Cari nama, email, atau kode tiket..."
                  class="w-full rounded-xl border border-black bg-[#fafaf9] px-3.5 py-2 text-xs text-black focus:outline-hidden"
                />
                <div v-if="matchingPendingParticipants.length" class="space-y-1.5 max-h-48 overflow-y-auto pr-0.5">
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
                      class="luxury-pill rounded-full border border-black bg-[#72a5e4] px-3 py-1 text-[11px] font-bold text-black shrink-0 cursor-pointer"
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
            <div class="rounded-3xl border-2 border-black bg-white p-5 sm:p-6 space-y-4 shadow-[4px_4px_0px_#000]">
              <div class="flex items-center justify-between pb-2 border-b border-black/10">
                <h3 class="text-sm font-black text-black">Live Stream Check-in Terkini</h3>
                <span class="rounded-full border border-black bg-[#72a5e4] px-2.5 py-0.5 text-[10px] font-black text-black">
                  REAL-TIME
                </span>
              </div>

              <div class="divide-y divide-black/10 text-xs max-h-60 overflow-y-auto">
                <div v-for="log in recentCheckIns" :key="log.id" class="py-2.5 flex items-center justify-between gap-2">
                  <div class="min-w-0">
                    <p class="font-bold text-black truncate">{{ log.participant_name }}</p>
                    <p class="text-[11px] text-slate-500 font-mono truncate">{{ log.ticket_type }} • {{ log.ticket_code }}</p>
                    <p class="text-[10px] text-slate-400">{{ log.station }}</p>
                  </div>
                  <span class="text-xs font-mono font-bold text-black shrink-0">{{ formatCheckInTime(log.checked_in_at) }}</span>
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

  <!-- ========================================================================= -->
  <!-- PRO-GRADE FULLSCREEN LIVE CAMERA HUD OVERLAY                              -->
  <!-- ========================================================================= -->
  <Teleport to="body">
    <div
      v-if="scannerActive"
      class="fixed inset-0 z-[95] bg-slate-950 text-white flex flex-col overflow-hidden select-none"
    >
      <!-- 1. Full-Bleed Clear Camera Feed -->
      <div class="relative flex-1 w-full h-full bg-slate-950 overflow-hidden">
        <div
          id="qr-reader"
          class="fullscreen-qr-reader w-full h-full"
          :class="isCameraMirrored ? 'is-mirrored' : ''"
        />
      </div>

      <!-- 2. Center Precision TERRA Viewfinder Reticle + Smooth Outer Vignette -->
      <div class="pointer-events-none fixed inset-0 z-10 flex flex-col items-center justify-center px-6">
        <div
          class="relative w-[min(68vw,290px)] h-[min(68vw,290px)] sm:w-[330px] sm:h-[330px] rounded-3xl transition-transform duration-300"
          :class="[
            scanFlashState === 'success'
              ? 'scale-105 shadow-[0_0_0_9999px_rgba(2,24,16,0.62),0_0_50px_rgba(52,211,153,0.45)]'
              : scanFlashState === 'error'
                ? 'scale-97 shadow-[0_0_0_9999px_rgba(32,6,14,0.65),0_0_50px_rgba(251,113,133,0.45)]'
                : 'shadow-[0_0_0_9999px_rgba(3,7,18,0.56),0_0_40px_rgba(114,165,228,0.22)]'
          ]"
        >
          <!-- Subtle inner border frame -->
          <div
            class="absolute inset-0 rounded-3xl border transition-colors duration-300"
            :class="
              scanFlashState === 'success'
                ? 'border-emerald-400/60 bg-emerald-400/8'
                : scanFlashState === 'error'
                  ? 'border-rose-400/60 bg-rose-400/8'
                  : 'border-white/20'
            "
          />

          <!-- Top Telemetry Pill on Reticle -->
          <div class="absolute -top-3.5 left-1/2 -translate-x-1/2 whitespace-nowrap">
            <span
              class="inline-flex items-center gap-1.5 rounded-full border px-3 py-0.5 text-[10px] font-black uppercase tracking-widest shadow-lg transition-colors duration-300"
              :class="
                scanFlashState === 'success'
                  ? 'border-emerald-300 bg-emerald-400 text-slate-950'
                  : scanFlashState === 'error'
                    ? 'border-rose-300 bg-rose-500 text-white'
                    : 'border-black bg-[#72a5e4] text-black'
              "
            >
              <span
                class="h-1.5 w-1.5 rounded-full"
                :class="scanFlashState === 'idle' ? 'bg-black animate-ping' : 'bg-current'"
              />
              {{
                scanFlashState === 'success'
                  ? 'TIKET VALID • SILAKAN MASUK'
                  : scanFlashState === 'error'
                    ? 'VALIDASI DITOLAK'
                    : 'TERRA OPTICAL SCANNER'
              }}
            </span>
          </div>

          <!-- 4 Sculpted Corner Brackets -->
          <span
            class="absolute -top-1 -left-1 w-9 h-9 border-t-4 border-l-4 rounded-tl-3xl transition-colors duration-300"
            :class="
              scanFlashState === 'success'
                ? 'border-emerald-400'
                : scanFlashState === 'error'
                  ? 'border-rose-400'
                  : 'border-[#72a5e4]'
            "
          />
          <span
            class="absolute -top-1 -right-1 w-9 h-9 border-t-4 border-r-4 rounded-tr-3xl transition-colors duration-300"
            :class="
              scanFlashState === 'success'
                ? 'border-emerald-400'
                : scanFlashState === 'error'
                  ? 'border-rose-400'
                  : 'border-[#72a5e4]'
            "
          />
          <span
            class="absolute -bottom-1 -left-1 w-9 h-9 border-b-4 border-l-4 rounded-bl-3xl transition-colors duration-300"
            :class="
              scanFlashState === 'success'
                ? 'border-emerald-400'
                : scanFlashState === 'error'
                  ? 'border-rose-400'
                  : 'border-[#72a5e4]'
            "
          />
          <span
            class="absolute -bottom-1 -right-1 w-9 h-9 border-b-4 border-r-4 rounded-br-3xl transition-colors duration-300"
            :class="
              scanFlashState === 'success'
                ? 'border-emerald-400'
                : scanFlashState === 'error'
                  ? 'border-rose-400'
                  : 'border-[#72a5e4]'
            "
          />

          <!-- Center Subtle Crosshair -->
          <div class="absolute inset-0 flex items-center justify-center opacity-30">
            <div class="w-5 h-[1px] bg-white" />
            <div class="h-5 w-[1px] bg-white absolute" />
          </div>

          <!-- Animated Laser Sweep Line -->
          <div
            class="scanner-laser-line absolute inset-x-3 h-[2px] rounded-full"
            :class="
              scanFlashState === 'success'
                ? 'bg-gradient-to-r from-transparent via-emerald-300 to-transparent shadow-[0_0_16px_#34d399]'
                : scanFlashState === 'error'
                  ? 'bg-gradient-to-r from-transparent via-rose-400 to-transparent shadow-[0_0_16px_#fb7185]'
                  : 'bg-gradient-to-r from-transparent via-[#72a5e4] to-transparent shadow-[0_0_18px_#72a5e4]'
            "
          />
        </div>

        <!-- Helper Caption Below Reticle -->
        <div class="mt-5 text-center space-y-1">
          <p class="inline-flex items-center gap-2 rounded-full border border-white/15 bg-slate-950/70 backdrop-blur-md px-4 py-1.5 text-xs font-semibold text-slate-200 shadow-lg">
            <Scan class="h-3.5 w-3.5 text-[#72a5e4]" />
            <span>Arahkan QR Code E-Ticket ke dalam bingkai pemindai</span>
          </p>
        </div>
      </div>

      <!-- 3. Top Floating Glass Command Bar -->
      <div class="fixed top-0 inset-x-0 z-30 p-3 sm:p-4 pointer-events-none">
        <div class="pointer-events-auto mx-auto max-w-5xl rounded-2xl border border-white/15 bg-slate-950/75 backdrop-blur-xl px-3.5 sm:px-5 py-2.5 sm:py-3 shadow-[0_12px_40px_rgba(0,0,0,0.55)] flex flex-wrap items-center justify-between gap-2.5">
          <!-- Left: TERRA Brand + Event Name + Gate Selector -->
          <div class="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div class="h-9 w-9 rounded-xl border border-black bg-white flex items-center justify-center shrink-0 shadow-[2px_2px_0px_#72a5e4]">
              <img src="/terra-logo.png" alt="TERRA" class="h-5 w-5 object-contain" />
            </div>
            <div class="min-w-0">
              <div class="flex items-center gap-2">
                <span class="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-emerald-400">
                  <span class="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  LIVE GATE
                </span>
                <span class="text-white/25">•</span>
                <select
                  v-model="selectedStation"
                  aria-label="Pilih Gate Check-in"
                  class="bg-transparent text-[11px] font-bold text-[#72a5e4] focus:outline-hidden cursor-pointer pr-1"
                >
                  <option class="bg-slate-900 text-white" value="Gate A - Main Lobby">Gate A - Main Lobby</option>
                  <option class="bg-slate-900 text-white" value="Gate B - VIP Lounge">Gate B - VIP Lounge</option>
                  <option class="bg-slate-900 text-white" value="Gate C - Side Entrance">Gate C - Side Entrance</option>
                </select>
              </div>
              <p class="text-xs sm:text-sm font-black text-white truncate max-w-[46vw] sm:max-w-xs">
                {{ currentEvent?.title || 'TERRA Event Check-in' }}
              </p>
            </div>
          </div>

          <!-- Center/Right: Live Attendance Progress + Camera Utilities -->
          <div class="flex items-center gap-1.5 sm:gap-2 ml-auto">
            <!-- Attendance Meter Pill -->
            <div class="hidden sm:flex items-center gap-2.5 rounded-xl border border-white/15 bg-white/8 px-3 py-1.5">
              <div class="text-right">
                <span class="text-[11px] font-black text-white block leading-none">
                  {{ checkedInCount }} / {{ totalParticipants }} Hadir
                </span>
                <span class="text-[9px] font-semibold text-slate-400">
                  {{ waitingCount }} menunggu ({{ attendancePct }}%)
                </span>
              </div>
              <div class="w-12 h-2 rounded-full bg-white/15 overflow-hidden">
                <div class="h-full bg-[#72a5e4] transition-all duration-500" :style="{ width: `${attendancePct}%` }" />
              </div>
            </div>

            <!-- Compact Mobile Attendance Badge -->
            <span class="sm:hidden rounded-full border border-black bg-[#72a5e4] px-2.5 py-1 text-[11px] font-black text-black">
              {{ checkedInCount }}/{{ totalParticipants }}
            </span>

            <!-- Sound Beep Toggle -->
            <button
              type="button"
              @click="soundEnabled = !soundEnabled"
              :title="soundEnabled ? 'Suara Beep Aktif' : 'Suara Beep Nonaktif'"
              class="h-9 w-9 rounded-xl border border-white/15 bg-white/8 hover:bg-white/15 flex items-center justify-center text-white transition-colors cursor-pointer"
            >
              <Volume2 v-if="soundEnabled" class="h-4 w-4 text-[#72a5e4]" />
              <VolumeX v-else class="h-4 w-4 text-slate-400" />
            </button>

            <!-- Mirror Video Toggle -->
            <button
              type="button"
              @click="isCameraMirrored = !isCameraMirrored"
              title="Cerminkan Kamera (Mirror)"
              class="hidden sm:flex h-9 w-9 rounded-xl border border-white/15 hover:bg-white/15 items-center justify-center transition-colors cursor-pointer"
              :class="isCameraMirrored ? 'bg-[#72a5e4] text-black border-black' : 'bg-white/8 text-white'"
            >
              <FlipHorizontal2 class="h-4 w-4" />
            </button>

            <!-- Switch Front/Rear Camera -->
            <button
              type="button"
              @click="switchCamera"
              title="Ganti Kamera Depan / Belakang"
              class="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/8 hover:bg-white/15 px-3 py-2 text-xs font-bold text-white transition-colors cursor-pointer"
            >
              <SwitchCamera class="h-3.5 w-3.5 text-[#72a5e4]" />
              <span class="hidden md:inline">Kamera</span>
            </button>

            <!-- Close Scanner -->
            <button
              type="button"
              @click="stopScanner"
              class="inline-flex items-center gap-1 rounded-xl border border-black bg-white hover:bg-slate-200 px-3 sm:px-3.5 py-2 text-xs font-black text-black transition-colors cursor-pointer"
            >
              <X class="h-3.5 w-3.5" />
              <span>Selesai</span>
            </button>
          </div>
        </div>
      </div>

      <!-- 4. Bottom Floating HUD: Scan Result Card + Interactive Popover + Unified Dock -->
      <div class="fixed bottom-0 inset-x-0 z-30 p-3 sm:p-5 pointer-events-none space-y-2.5">
        <!-- Pop-up Boarding Pass Scan Verification Card -->
        <Transition name="modal-pop">
          <div
            v-if="lastResult"
            class="pointer-events-auto mx-auto max-w-lg rounded-2xl border-2 border-black p-3.5 sm:p-4 flex items-center justify-between gap-3 text-black shadow-[4px_4px_0px_#000]"
            :class="lastResult.success ? 'bg-emerald-300' : 'bg-rose-300'"
          >
            <div class="flex items-center gap-3 min-w-0">
              <div
                class="h-11 w-11 rounded-xl border-2 border-black flex items-center justify-center shrink-0 font-black text-sm"
                :class="lastResult.success ? 'bg-white text-emerald-700' : 'bg-white text-rose-700'"
              >
                <CheckCircle2 v-if="lastResult.success" class="h-6 w-6" />
                <AlertTriangle v-else class="h-6 w-6" />
              </div>
              <div class="min-w-0">
                <div class="flex items-center gap-1.5 flex-wrap">
                  <span class="rounded-full border border-black bg-black px-2 py-0.2 text-[9px] font-black uppercase tracking-wider text-white">
                    {{ lastResult.success ? 'ACCESS GRANTED' : lastResult.status || 'DENIED' }}
                  </span>
                  <span class="text-[10px] font-mono font-bold text-black/75">{{ lastResult.timestamp }}</span>
                </div>
                <p class="text-xs sm:text-sm font-black text-black truncate mt-0.5">
                  {{ lastResult.participant?.full_name || lastResult.message }}
                </p>
                <p class="text-[11px] font-mono font-semibold text-black/80 truncate">
                  {{
                    lastResult.participant
                      ? `${lastResult.participant.ticket_type || lastResult.ticket?.ticket_type || 'Tiket'} • ${lastResult.scannedCode}`
                      : lastResult.scannedCode
                  }}
                </p>
              </div>
            </div>
            <button
              type="button"
              @click="lastResult = null"
              aria-label="Tutup notifikasi hasil scan"
              class="rounded-xl border border-black bg-white p-1.5 text-black hover:bg-slate-100 shrink-0 cursor-pointer"
            >
              <X class="h-4 w-4" />
            </button>
          </div>
        </Transition>

        <!-- Subtle Last Checked-in Ticker when idle -->
        <div
          v-if="!lastResult && !activeHudPanel && latestLog"
          class="mx-auto w-fit max-w-[92vw] rounded-full border border-white/15 bg-slate-950/75 backdrop-blur-md px-3.5 py-1 text-[11px] text-slate-300 flex items-center gap-2"
        >
          <span class="h-1.5 w-1.5 rounded-full bg-[#72a5e4]" />
          <span class="truncate">
            Terakhir masuk: <strong class="text-white">{{ latestLog.participant_name }}</strong> ({{ latestLog.ticket_type }}) • {{ formatCheckInTime(latestLog.checked_in_at) }}
          </span>
        </div>

        <!-- Expandable HUD Drawer: Manual Input / Participant Search / Recent Gate Logs -->
        <Transition name="sheet-up">
          <div
            v-if="activeHudPanel"
            class="pointer-events-auto mx-auto max-w-lg rounded-2xl border border-white/20 bg-slate-950/90 backdrop-blur-xl p-4 shadow-2xl space-y-3"
          >
            <div class="flex items-center justify-between border-b border-white/10 pb-2">
              <span class="text-xs font-black uppercase tracking-wider text-[#72a5e4]">
                {{
                  activeHudPanel === 'manual'
                    ? 'Input Manual Kode Tiket'
                    : activeHudPanel === 'search'
                      ? `Cari Peserta Belum Check-in (${waitingCount})`
                      : `Riwayat Gate Terkini (${recentCheckIns.length})`
                }}
              </span>
              <button
                type="button"
                @click="activeHudPanel = null"
                class="rounded-lg border border-white/20 p-1 text-slate-300 hover:text-white cursor-pointer"
              >
                <X class="h-3.5 w-3.5" />
              </button>
            </div>

            <!-- Panel 1: Manual Code Input -->
            <form v-if="activeHudPanel === 'manual'" @submit.prevent="handleManual" class="flex gap-2">
              <input
                v-model="ticketInput"
                type="text"
                placeholder="Ketik kode tiket (mis. DEMAFEST26-VIP-001)..."
                class="flex-1 rounded-xl border border-white/25 bg-white/10 px-3.5 py-2.5 text-xs text-white font-mono placeholder:text-slate-400 focus:outline-hidden focus:border-[#72a5e4]"
              />
              <button
                type="submit"
                class="rounded-xl border border-black bg-[#72a5e4] px-5 py-2.5 text-xs font-black text-black hover:bg-[#5c93d9] cursor-pointer shrink-0"
              >
                Validasi
              </button>
            </form>

            <!-- Panel 2: Live Participant Search -->
            <div v-else-if="activeHudPanel === 'search'" class="space-y-2.5">
              <input
                v-model="participantQuery"
                type="text"
                placeholder="Ketik nama, email, atau kode tiket peserta..."
                class="w-full rounded-xl border border-white/25 bg-white/10 px-3.5 py-2 text-xs text-white placeholder:text-slate-400 focus:outline-hidden focus:border-[#72a5e4]"
              />
              <div v-if="matchingPendingParticipants.length" class="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                <div
                  v-for="p in matchingPendingParticipants"
                  :key="p.id"
                  class="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs"
                >
                  <div class="min-w-0">
                    <p class="font-bold text-white truncate">{{ p.full_name }}</p>
                    <p class="text-[10px] font-mono text-slate-400 truncate">{{ p.ticket_code }} • {{ p.email }}</p>
                  </div>
                  <button
                    type="button"
                    @click="processCode(p.ticket_code)"
                    class="rounded-full border border-black bg-[#72a5e4] px-3 py-1 text-[11px] font-black text-black hover:bg-[#5c93d9] shrink-0 cursor-pointer"
                  >
                    Check-in
                  </button>
                </div>
              </div>
              <p v-else class="text-xs text-slate-400 py-2 text-center">
                Semua peserta yang cocok sudah check-in atau tidak ditemukan.
              </p>
            </div>

            <!-- Panel 3: Recent Gate Check-in Logs -->
            <div v-else-if="activeHudPanel === 'logs'" class="space-y-1.5 max-h-48 overflow-y-auto pr-1 text-xs">
              <div
                v-for="log in recentCheckIns.slice(0, 8)"
                :key="log.id"
                class="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2"
              >
                <div class="min-w-0">
                  <p class="font-bold text-white truncate">{{ log.participant_name }}</p>
                  <p class="text-[10px] font-mono text-slate-400 truncate">{{ log.ticket_type }} • {{ log.ticket_code }}</p>
                </div>
                <span class="text-[11px] font-mono font-bold text-[#72a5e4] shrink-0">
                  {{ formatCheckInTime(log.checked_in_at) }}
                </span>
              </div>
              <p v-if="!recentCheckIns.length" class="text-xs text-slate-400 py-2 text-center">
                Belum ada riwayat check-in pada sesi ini.
              </p>
            </div>
          </div>
        </Transition>

        <!-- Unified Bottom Glass Control Dock -->
        <div class="pointer-events-auto mx-auto w-fit max-w-full rounded-2xl border border-white/15 bg-slate-950/80 backdrop-blur-xl p-1.5 shadow-[0_12px_40px_rgba(0,0,0,0.65)] flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          <button
            type="button"
            :disabled="isScanningFile"
            @click="triggerFileUpload"
            class="inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold text-white hover:bg-white/12 transition-colors cursor-pointer shrink-0 disabled:opacity-50"
          >
            <Upload class="h-3.5 w-3.5 text-[#72a5e4]" />
            <span>{{ isScanningFile ? 'Memindai...' : 'Gambar QR' }}</span>
          </button>

          <button
            type="button"
            @click="toggleHudPanel('manual')"
            class="inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition-colors cursor-pointer shrink-0"
            :class="activeHudPanel === 'manual' ? 'bg-[#72a5e4] text-black' : 'text-white hover:bg-white/12'"
          >
            <Keyboard class="h-3.5 w-3.5" :class="activeHudPanel === 'manual' ? 'text-black' : 'text-[#72a5e4]'" />
            <span>Input Kode</span>
          </button>

          <button
            type="button"
            @click="toggleHudPanel('search')"
            class="inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition-colors cursor-pointer shrink-0"
            :class="activeHudPanel === 'search' ? 'bg-[#72a5e4] text-black' : 'text-white hover:bg-white/12'"
          >
            <Users class="h-3.5 w-3.5" :class="activeHudPanel === 'search' ? 'text-black' : 'text-[#72a5e4]'" />
            <span>Cari Peserta</span>
            <span
              class="rounded-full px-1.5 py-0.2 text-[10px] font-black"
              :class="activeHudPanel === 'search' ? 'bg-black text-white' : 'bg-white/15 text-slate-200'"
            >
              {{ waitingCount }}
            </span>
          </button>

          <button
            type="button"
            @click="toggleHudPanel('logs')"
            class="inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition-colors cursor-pointer shrink-0"
            :class="activeHudPanel === 'logs' ? 'bg-[#72a5e4] text-black' : 'text-white hover:bg-white/12'"
          >
            <History class="h-3.5 w-3.5" :class="activeHudPanel === 'logs' ? 'text-black' : 'text-[#72a5e4]'" />
            <span class="hidden sm:inline">Riwayat</span>
            <span
              class="rounded-full px-1.5 py-0.2 text-[10px] font-black"
              :class="activeHudPanel === 'logs' ? 'bg-black text-white' : 'bg-white/15 text-slate-200'"
            >
              {{ recentCheckIns.length }}
            </span>
          </button>

          <div class="h-5 w-[1px] bg-white/15 mx-0.5 shrink-0" />

          <button
            type="button"
            @click="stopScanner"
            class="inline-flex items-center gap-1.5 rounded-xl bg-rose-500/90 hover:bg-rose-500 px-3.5 py-2 text-xs font-black text-white transition-colors cursor-pointer shrink-0"
          >
            <CameraOff class="h-3.5 w-3.5" />
            <span>Stop</span>
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

:deep(.fullscreen-qr-reader.is-mirrored video) {
  transform: scaleX(-1);
}

:deep(#qr-shaded-region) {
  display: none !important;
}

@keyframes laserSweep {
  0%,
  100% {
    top: 10%;
    opacity: 0.55;
  }
  50% {
    top: 88%;
    opacity: 1;
  }
}

.scanner-laser-line {
  animation: laserSweep 2.4s cubic-bezier(0.45, 0, 0.55, 1) infinite;
}

@media (prefers-reduced-motion: reduce) {
  .scanner-laser-line {
    animation: none;
    top: 50%;
  }
}
</style>

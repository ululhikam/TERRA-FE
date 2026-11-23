<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRoute } from 'vue-router'
import { useEventWorkspaceStore } from '@/stores/eventWorkspace'
import { useToastStore } from '@/stores/toast'
import { createCameraQrScanner, scanTicketQrFromFile, parseScannedQrPayload } from '@/utils/qrCode'
import { Scan, CheckCircle2, AlertTriangle, Upload, Camera, CameraOff } from 'lucide-vue-next'

const route = useRoute()
const store = useEventWorkspaceStore()
const toast = useToastStore()

const eventId = computed(() => route.params.eventId || store.activeEvent?.id || 'evt-1')
const ticketInput = ref('')
const selectedStation = ref('Gate A - Main Lobby')
const lastResult = ref(null)
const scannerActive = ref(false)
const isScanningFile = ref(false)
const cameraError = ref('')
const qrFileInput = ref(null)
let scannerController = null

const eventParticipants = computed(() =>
  store.participants.filter((p) => !p.event_id || p.event_id === eventId.value)
)
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
  if (!scannerController) {
    scannerController = createCameraQrScanner('qr-reader', {
      fps: 12,
      qrbox: 240,
      cooldownMs: 3000,
      onDecode: async (decodedText) => {
        await processCode(decodedText)
      },
      onError: () => {
        cameraError.value = 'Kamera tidak terdeteksi atau izin ditolak. Gunakan Scan Gambar QR atau input manual.'
      }
    })
  }

  try {
    scannerActive.value = true
    await scannerController.start({ facingMode: 'environment' })
  } catch {
    scannerActive.value = false
    cameraError.value = 'Kamera tidak terdeteksi atau izin ditolak. Gunakan Scan Gambar QR atau input manual.'
  }
}

async function stopScanner() {
  if (scannerController) {
    await scannerController.stop()
  }
  scannerActive.value = false
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

function testTicket(code) {
  ticketInput.value = code
  handleManual()
}

onMounted(() => {
  if (eventId.value) {
    store.fetchEventWorkspace(eventId.value)
  }
})

onBeforeUnmount(() => {
  stopScanner()
})
</script>

<template>
  <div class="space-y-6 min-h-[calc(100vh-6rem)]">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div class="space-y-1">
        <div class="flex items-center gap-2">
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
          Pindai QR Code tiket menggunakan kamera perangkat, unggah gambar QR, atau input kode manual dengan validasi anti-duplikasi.
        </p>
      </div>

      <div class="relative w-full sm:w-60">
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
          <div id="qr-reader" class="w-full max-w-[320px] rounded-lg overflow-hidden" :class="scannerActive ? 'block' : 'hidden'" />

          <div v-if="!scannerActive" class="space-y-4 text-center max-w-sm">
            <div class="mx-auto w-16 h-16 rounded-2xl border-2 border-dashed border-white/50 flex items-center justify-center">
              <Scan class="h-8 w-8 text-[#72a5e4]" />
            </div>
            <div>
              <h4 class="text-base font-bold text-white">Kamera Siap Digunakan</h4>
              <p class="text-xs text-slate-300 mt-1 leading-relaxed">
                Klik <strong>Buka Kamera</strong> untuk memindai QR Code tiket secara langsung, atau klik <strong>Scan Gambar QR</strong> untuk memindai file PNG/JPG tiket.
              </p>
            </div>
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

          <!-- Quick Test Samples -->
          <div class="space-y-2 pt-2 border-t border-black/10">
            <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              UJI CEPAT SAMPEL TIKET:
            </span>
            <div class="grid grid-cols-2 gap-2">
              <button
                type="button"
                @click="testTicket('EVT26-9841-AB')"
                class="rounded-full border border-black bg-[#72a5e4] px-3 py-1.5 text-[11px] font-bold text-black hover:bg-[#5c93d9] truncate text-center cursor-pointer"
              >
                EVT26-9841-AB (Active)
              </button>
              <button
                type="button"
                @click="testTicket('EVT26-3310-XY')"
                class="rounded-full border border-black bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 truncate text-center cursor-pointer"
              >
                EVT26-3310-XY (Used)
              </button>
              <button
                type="button"
                @click="testTicket('EVT26-7721-KL')"
                class="rounded-full border border-black bg-[#72a5e4] px-3 py-1.5 text-[11px] font-bold text-black hover:bg-[#5c93d9] truncate text-center cursor-pointer"
              >
                EVT26-7721-KL (Active)
              </button>
              <button
                type="button"
                @click="testTicket('EVT26-4402-MN')"
                class="rounded-full border border-black bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 truncate text-center cursor-pointer"
              >
                EVT26-4402-MN (Used)
              </button>
            </div>
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
</template>

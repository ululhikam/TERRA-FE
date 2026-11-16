<script setup>
import { ref, computed, onBeforeUnmount } from 'vue'
import { useRoute } from 'vue-router'
import { Html5Qrcode } from 'html5-qrcode'
import { useEventWorkspaceStore } from '@/stores/eventWorkspace'
import { useToastStore } from '@/stores/toast'
import { Scan, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-vue-next'

const route = useRoute()
const store = useEventWorkspaceStore()
const toast = useToastStore()

const eventId = computed(() => route.params.eventId || store.activeEvent?.id || 'evt-1')
const ticketInput = ref('')
const selectedStation = ref('Gate A - Main Lobby')
const lastResult = ref(null)
const scannerActive = ref(false)
const cameraError = ref('')
let html5QrCode = null

const eventParticipants = computed(() =>
  store.participants.filter((p) => !p.event_id || p.event_id === eventId.value)
)
const checkedInCount = computed(() => eventParticipants.value.filter((p) => p.checked_in).length)
const totalParticipants = computed(() => eventParticipants.value.length)
const waitingCount = computed(() => Math.max(0, totalParticipants.value - checkedInCount.value))
const recentCheckIns = computed(() =>
  store.checkinLogs.filter((log) => !log.event_id || log.event_id === eventId.value)
)

async function startScanner() {
  cameraError.value = ''
  try {
    html5QrCode = new Html5Qrcode('qr-reader')
    scannerActive.value = true
    await html5QrCode.start(
      { facingMode: 'environment' },
      { fps: 12, qrbox: { width: 240, height: 240 } },
      (decodedText) => {
        processCode(decodedText)
      },
      () => {}
    )
  } catch (err) {
    scannerActive.value = false
    cameraError.value = 'Kamera tidak terdeteksi. Gunakan input manual di sebelah kanan.'
  }
}

async function stopScanner() {
  if (html5QrCode && scannerActive.value) {
    try {
      await html5QrCode.stop()
      html5QrCode.clear()
    } catch {
      // ignore cleanup
    }
  }
  scannerActive.value = false
}

async function processCode(code) {
  const res = await store.checkInTicket(code, selectedStation.value)
  lastResult.value = res
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
            Scanner Ready
          </span>
        </div>
        <h1 class="text-3xl font-bold tracking-tight text-black font-editorial">
          Live Check-in Scanner
        </h1>
        <p class="text-xs text-slate-600">
          Pindai QR Code tiket menggunakan kamera perangkat atau input kode manual dengan validasi anti-duplikasi.
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
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div class="rounded-2xl border border-black bg-white p-6 space-y-2 flex flex-col justify-between">
        <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">TOTAL PESERTA TERDAFTAR</span>
        <span class="text-3xl font-black text-black leading-none block">{{ totalParticipants }}</span>
        <p class="text-[11px] text-slate-500 pt-2 border-t border-black/10">Database registrasi acara</p>
      </div>

      <div class="rounded-2xl border border-black bg-[#72a5e4] p-6 space-y-2 flex flex-col justify-between">
        <span class="text-[10px] font-bold uppercase tracking-wider text-black block">PESERTA HADIR (CHECKED-IN)</span>
        <span class="text-3xl font-black text-black leading-none block">{{ checkedInCount }} Hadir</span>
        <p class="text-[11px] text-slate-900 pt-2 border-t border-black/20">
          {{ Math.round((checkedInCount / totalParticipants) * 100) }}% kehadiran fisik
        </p>
      </div>

      <div class="rounded-2xl border border-black bg-white p-6 space-y-2 flex flex-col justify-between">
        <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">MENUNGGU DI GATE</span>
        <span class="text-3xl font-black text-black leading-none block">{{ waitingCount }}</span>
        <p class="text-[11px] text-slate-500 pt-2 border-t border-black/10">Belum melakukan check-in</p>
      </div>
    </div>

    <!-- Main Content 2 Columns -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      <!-- Left Column: Camera Scanner -->
      <div class="lg:col-span-7 rounded-2xl border border-black bg-white p-6 space-y-4">
        <div class="flex items-center justify-between pb-2 border-b border-black/10">
          <h3 class="text-base font-bold text-black">Kamera QR Scanner</h3>
          <button
            v-if="!scannerActive"
            @click="startScanner"
            class="rounded-full bg-black px-5 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 transition-colors"
          >
            Buka Kamera
          </button>
          <button
            v-else
            @click="stopScanner"
            class="rounded-full border border-black bg-white px-5 py-1.5 text-xs font-semibold text-black hover:bg-slate-100 transition-colors"
          >
            Tutup Kamera
          </button>
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
                Arahkan kamera ke QR Code pada tiket digital peserta untuk memproses verifikasi instan.
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
            <p class="text-xs text-slate-500">Masukkan nomor tiket jika barcode tidak dapat dipindai</p>
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
              class="rounded-xl bg-black px-6 py-2.5 text-xs font-semibold text-white hover:bg-slate-800 transition-colors shrink-0"
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
                @click="testTicket('EVT26-9841-AB')"
                class="rounded-full border border-black bg-[#72a5e4] px-3 py-1.5 text-[11px] font-bold text-black hover:bg-[#5c93d9] truncate text-center"
              >
                EVT26-9841-AB (Active)
              </button>
              <button
                @click="testTicket('EVT26-3310-XY')"
                class="rounded-full border border-black bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 truncate text-center"
              >
                EVT26-3310-XY (Used)
              </button>
              <button
                @click="testTicket('EVT26-7721-KL')"
                class="rounded-full border border-black bg-[#72a5e4] px-3 py-1.5 text-[11px] font-bold text-black hover:bg-[#5c93d9] truncate text-center"
              >
                EVT26-7721-KL (Active)
              </button>
              <button
                @click="testTicket('EVT26-4402-MN')"
                class="rounded-full border border-black bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 truncate text-center"
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
              <span class="text-xs font-mono font-bold text-black">{{ log.checked_in_at }}</span>
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

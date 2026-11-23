<script setup>
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useEventWorkspaceStore } from '@/stores/eventWorkspace'
import { useToastStore } from '@/stores/toast'
import { Download, X, Pencil, Trash2 } from 'lucide-vue-next'

const route = useRoute()
const store = useEventWorkspaceStore()
const toast = useToastStore()

const search = ref('')
const checkinFilter = ref('all')
const showManualForm = ref(false)
const editingParticipantId = ref(null)
const manualName = ref('')
const manualEmail = ref('')
const manualPhone = ref('')
const manualTicketType = ref('')
const manualStatus = ref('Confirmed')
const manualCheckedIn = ref(false)
const savingParticipant = ref(false)

const eventId = computed(() => route.params.eventId || store.activeEvent?.id || 'evt-1')
const event = computed(() => store.events.find((e) => e.id === eventId.value) || store.activeEvent)

const participantsList = computed(() => {
  let list = store.participants.filter((p) => !p.event_id || p.event_id === eventId.value)

  if (checkinFilter.value === 'checked_in') list = list.filter((p) => p.checked_in)
  if (checkinFilter.value === 'not_checked_in') list = list.filter((p) => !p.checked_in)

  if (search.value.trim()) {
    const q = search.value.toLowerCase()
    list = list.filter(
      (p) =>
        (p.full_name || '').toLowerCase().includes(q) ||
        (p.email || '').toLowerCase().includes(q) ||
        (p.ticket_code || '').toLowerCase().includes(q)
    )
  }
  return list
})

function openCreateParticipant() {
  editingParticipantId.value = null
  manualName.value = ''
  manualEmail.value = ''
  manualPhone.value = ''
  manualTicketType.value = event.value?.ticket_types?.[0]?.name || 'General Admission'
  manualStatus.value = 'Confirmed'
  manualCheckedIn.value = false
  showManualForm.value = true
}

function openEditParticipant(p) {
  editingParticipantId.value = p.id
  manualName.value = p.full_name || ''
  manualEmail.value = p.email || ''
  manualPhone.value = p.phone || ''
  manualTicketType.value = p.ticket_type || event.value?.ticket_types?.[0]?.name || ''
  manualStatus.value = p.registration_status || 'Confirmed'
  manualCheckedIn.value = Boolean(p.checked_in)
  showManualForm.value = true
}

async function saveParticipant() {
  if (!manualName.value.trim() || !manualEmail.value.trim()) return
  savingParticipant.value = true
  try {
    if (editingParticipantId.value) {
      await store.updateParticipant(editingParticipantId.value, {
        full_name: manualName.value.trim(),
        email: manualEmail.value.trim(),
        phone: manualPhone.value || '',
        ticket_type: manualTicketType.value || undefined,
        registration_status: manualStatus.value,
        checked_in: manualCheckedIn.value
      })
      toast.success(`Data peserta "${manualName.value.trim()}" diperbarui.`)
    } else {
      await store.addManualParticipant(eventId.value, {
        full_name: manualName.value.trim(),
        email: manualEmail.value.trim(),
        phone: manualPhone.value || '081200000000',
        ticket_type: manualTicketType.value || event.value?.ticket_types?.[0]?.name || 'General Admission'
      })
      toast.success('Peserta manual on-the-spot berhasil didaftarkan.')
    }
    showManualForm.value = false
  } catch (err) {
    toast.error(err?.message || 'Gagal menyimpan data peserta.')
  } finally {
    savingParticipant.value = false
  }
}

async function toggleCheckIn(p) {
  try {
    const next = !p.checked_in
    await store.updateParticipant(p.id, { checked_in: next })
    toast.success(`${p.full_name} ditandai ${next ? 'Sudah Hadir' : 'Belum Check-in'}.`)
  } catch (err) {
    toast.error(err?.message || 'Gagal mengubah status kehadiran.')
  }
}

async function removeParticipant(p) {
  if (!window.confirm(`Hapus peserta "${p.full_name}" dari daftar event?`)) return
  try {
    await store.deleteParticipant(p.id)
    toast.success(`Peserta "${p.full_name}" dihapus.`)
  } catch (err) {
    toast.error(err?.message || 'Gagal menghapus peserta.')
  }
}

function exportCSV() {
  const rows = [
    ['Nama', 'Email', 'Telepon', 'Tiket', 'Kode Tiket', 'Status Check-in'],
    ...participantsList.value.map((p) => [
      p.full_name,
      p.email,
      p.phone,
      p.ticket_type,
      p.ticket_code,
      p.checked_in ? 'Hadir' : 'Belum Check-in'
    ])
  ]
  const csv = rows.map((r) => r.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `participants-${eventId.value}.csv`
  link.click()
  URL.revokeObjectURL(url)
  toast.success('Daftar data peserta & QR tiket CSV berhasil diekspor.')
}
</script>

<template>
  <div class="space-y-6 min-h-[calc(100vh-6rem)]">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div class="space-y-1">
        <div class="flex items-center gap-2">
          <span class="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            ATTENDEE DIRECTORY
          </span>
          <span class="rounded-full border border-black bg-[#72a5e4] px-3 py-0.5 text-xs font-bold text-black">
            {{ participantsList.length }} Peserta Terdaftar
          </span>
        </div>
        <h1 class="text-3xl font-bold tracking-tight text-black font-editorial">
          Participant Management
        </h1>
        <p class="text-xs text-slate-600">
          Kelola database peserta terdaftar, status kehadiran di gate, serta registrasi manual on-the-spot.
        </p>
      </div>

      <div class="flex items-center gap-2.5">
        <button
          @click="openCreateParticipant"
          class="rounded-full bg-black px-5 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition-colors"
        >
          + Daftar Manual
        </button>
        <button
          @click="exportCSV"
          class="rounded-full border border-black bg-white px-5 py-2 text-xs font-semibold text-black hover:bg-slate-100 transition-colors flex items-center gap-1.5"
        >
          <Download class="h-3.5 w-3.5" />
          <span>Export CSV</span>
        </button>
      </div>
    </div>

    <!-- Filter Bar -->
    <div class="flex flex-col sm:flex-row items-center gap-3">
      <div class="relative w-full sm:flex-1">
        <input
          v-model="search"
          type="text"
          placeholder="Cari berdasarkan nama peserta, email, atau kode tiket..."
          class="w-full rounded-full border border-black bg-white px-5 py-2.5 text-xs text-black placeholder:text-slate-400 focus:outline-hidden"
        />
      </div>

      <div class="relative w-full sm:w-64">
        <select
          v-model="checkinFilter"
          class="w-full rounded-full border border-black bg-white px-5 py-2.5 text-xs text-black focus:outline-hidden appearance-none cursor-pointer"
        >
          <option value="all">Semua Status Kehadiran</option>
          <option value="checked_in">Sudah Hadir</option>
          <option value="not_checked_in">Belum Hadir</option>
        </select>
        <span class="pointer-events-none absolute right-4 top-2.5 text-xs">⌄</span>
      </div>
    </div>

    <!-- Participants Table Card -->
    <div class="rounded-2xl border border-black bg-white overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs">
          <thead class="bg-[#72a5e4]/30 border-b border-black text-[10px] font-bold uppercase text-slate-800">
            <tr>
              <th class="py-3.5 px-6">DATA PESERTA</th>
              <th class="py-3.5 px-6">TIPE TIKET</th>
              <th class="py-3.5 px-6">KODE TIKET</th>
              <th class="py-3.5 px-6">STATUS ORDER</th>
              <th class="py-3.5 px-6">KEHADIRAN DI GATE</th>
              <th class="py-3.5 px-6 text-right">AKSI</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-black/10">
            <tr v-for="p in participantsList" :key="p.id" class="hover:bg-slate-50/50">
              <td class="py-4 px-6">
                <p class="font-bold text-black text-sm">{{ p.full_name }}</p>
                <p class="text-[11px] text-slate-500 font-mono">{{ p.email }} • {{ p.phone }}</p>
              </td>
              <td class="py-4 px-6 text-slate-800 font-medium">{{ p.ticket_type }}</td>
              <td class="py-4 px-6 font-mono font-bold text-slate-700">{{ p.ticket_code }}</td>
              <td class="py-4 px-6">
                <span class="rounded-full border border-black bg-[#72a5e4] px-3 py-1 text-xs font-semibold text-black inline-flex items-center gap-1.5">
                  <span>●</span>
                  <span>{{ p.registration_status || 'Confirmed' }}</span>
                </span>
              </td>
              <td class="py-4 px-6">
                <button
                  @click="toggleCheckIn(p)"
                  :title="p.checked_in ? 'Klik untuk batalkan check-in' : 'Klik untuk tandai hadir'"
                  class="rounded-full border border-black px-3 py-1 text-xs inline-flex items-center gap-1.5 transition-colors"
                  :class="p.checked_in ? 'bg-[#72a5e4] font-bold text-black' : 'bg-white font-semibold text-slate-700 hover:bg-slate-100'"
                >
                  <span>{{ p.checked_in ? '✓' : '●' }}</span>
                  <span>{{ p.checked_in ? 'Hadir (Scanned)' : 'Belum Check-in' }}</span>
                </button>
              </td>
              <td class="py-4 px-6 text-right">
                <div class="inline-flex items-center gap-1.5">
                  <button
                    @click="openEditParticipant(p)"
                    title="Edit Peserta"
                    class="rounded-full border border-black p-1.5 text-black hover:bg-slate-100"
                  >
                    <Pencil class="h-3.5 w-3.5" />
                  </button>
                  <button
                    @click="removeParticipant(p)"
                    title="Hapus Peserta"
                    class="rounded-full border border-black p-1.5 text-red-600 hover:bg-red-50"
                  >
                    <Trash2 class="h-3.5 w-3.5" />
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="!participantsList.length">
              <td colspan="6" class="py-8 px-6 text-center text-slate-500">
                Belum ada peserta sesuai filter pencarian.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Modal Registrasi / Edit Peserta -->
    <div
      v-if="showManualForm"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-2xs"
    >
      <div class="w-full max-w-md rounded-3xl border-2 border-black bg-white p-6 sm:p-8 space-y-6">
        <div class="flex items-center justify-between border-b border-black/20 pb-3">
          <h3 class="text-xl font-bold text-black font-editorial">
            {{ editingParticipantId ? 'Edit Data Peserta' : 'Daftar Manual On-The-Spot' }}
          </h3>
          <button @click="showManualForm = false" class="p-1 rounded-full border border-black hover:bg-slate-100">
            <X class="h-4 w-4" />
          </button>
        </div>

        <form @submit.prevent="saveParticipant" class="space-y-4 text-xs">
          <div class="space-y-1">
            <label class="font-bold text-black">Nama Lengkap</label>
            <input
              v-model="manualName"
              type="text"
              required
              placeholder="Contoh: Rendi Gunawan"
              class="w-full rounded-xl border border-black p-2.5 text-black focus:outline-hidden"
            />
          </div>

          <div class="space-y-1">
            <label class="font-bold text-black">Email</label>
            <input
              v-model="manualEmail"
              type="email"
              required
              placeholder="rendi@example.com"
              class="w-full rounded-xl border border-black p-2.5 text-black focus:outline-hidden"
            />
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div class="space-y-1">
              <label class="font-bold text-black">Nomor WhatsApp</label>
              <input
                v-model="manualPhone"
                type="text"
                placeholder="0812-xxxx-xxxx"
                class="w-full rounded-xl border border-black p-2.5 text-black focus:outline-hidden"
              />
            </div>

            <div class="space-y-1">
              <label class="font-bold text-black">Tipe Tiket</label>
              <select
                v-if="event?.ticket_types?.length"
                v-model="manualTicketType"
                class="w-full rounded-xl border border-black p-2.5 text-black bg-white focus:outline-hidden"
              >
                <option v-for="t in event.ticket_types" :key="t.id" :value="t.name">
                  {{ t.name }}
                </option>
              </select>
              <input
                v-else
                v-model="manualTicketType"
                type="text"
                placeholder="General Admission"
                class="w-full rounded-xl border border-black p-2.5 text-black focus:outline-hidden"
              />
            </div>
          </div>

          <div v-if="editingParticipantId" class="grid grid-cols-2 gap-3 pt-1">
            <div class="space-y-1">
              <label class="font-bold text-black">Status Registrasi</label>
              <select
                v-model="manualStatus"
                class="w-full rounded-xl border border-black p-2.5 text-black bg-white focus:outline-hidden"
              >
                <option value="Confirmed">Confirmed</option>
                <option value="Pending">Pending</option>
                <option value="Cancelled">Cancelled</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>
            <label class="flex items-center gap-2 pt-5 font-bold text-black cursor-pointer">
              <input v-model="manualCheckedIn" type="checkbox" class="h-4 w-4 accent-black" />
              <span>Sudah Check-in</span>
            </label>
          </div>

          <div class="pt-4 flex justify-end gap-3 border-t border-black/20">
            <button
              type="button"
              @click="showManualForm = false"
              class="rounded-full border border-black bg-white px-5 py-2 font-semibold text-black hover:bg-slate-100"
            >
              Batal
            </button>
            <button
              type="submit"
              :disabled="savingParticipant"
              class="rounded-full bg-black px-6 py-2 font-bold text-white hover:bg-slate-800 disabled:opacity-60"
            >
              {{ savingParticipant ? 'Menyimpan...' : editingParticipantId ? 'Simpan Perubahan' : 'Daftarkan Peserta' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

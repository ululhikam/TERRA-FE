<script setup>
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useEventWorkspaceStore } from '@/stores/eventWorkspace'
import { useToastStore } from '@/stores/toast'
import { X } from 'lucide-vue-next'

const route = useRoute()
const store = useEventWorkspaceStore()
const toast = useToastStore()

const allPermissions = [
  'View Event',
  'Edit Event',
  'Manage Timeline',
  'Manage Tickets',
  'View Participants',
  'Manage Check-in',
  'View Finance',
  'Manage Team'
]

const members = computed(() =>
  store.teamMembers.filter((m) => !m.event_id || m.event_id === route.params.eventId)
)

const email = ref('')
const name = ref('')
const role = ref('Staff')
const department = ref('Ticketing & Gate')
const showForm = ref(false)

async function inviteMember() {
  if (!email.value.trim()) return
  await store.inviteTeamMember(route.params.eventId, {
    name: name.value.trim() || email.value.split('@')[0],
    email: email.value.trim(),
    role: role.value,
    department: department.value
  })
  email.value = ''
  name.value = ''
  showForm.value = false
  toast.success('Undangan anggota panitia berhasil dikirim.')
}

async function togglePermission(member, perm) {
  if (member.role === 'Owner') {
    toast.info('Owner memiliki seluruh hak akses secara default.')
    return
  }
  const nextPerms = member.permissions.includes(perm)
    ? member.permissions.filter((p) => p !== perm)
    : [...member.permissions, perm]
  await store.updateTeamMember(route.params.eventId, member.id, { permissions: nextPerms })
}

async function removeMember(memberId) {
  await store.removeTeamMember(route.params.eventId, memberId)
  toast.success('Anggota berhasil dihapus dari kepanitiaan.')
}
</script>

<template>
  <div class="space-y-6 min-h-[calc(100vh-6rem)]">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div class="space-y-1">
        <div class="flex items-center gap-2">
          <span class="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            RBAC ACCESS CONTROL
          </span>
          <span class="rounded-full border border-black bg-[#72a5e4] px-3 py-0.5 text-xs font-bold text-black">
            {{ members.length }} Anggota Panitia
          </span>
        </div>
        <h1 class="text-3xl font-bold tracking-tight text-black font-editorial">
          Team Management &amp; Permissions
        </h1>
        <p class="text-xs text-slate-600">
          Atur peran anggota panitia dan aktifkan izin granular per modul secara fleksibel.
        </p>
      </div>

      <button
        @click="showForm = true"
        class="rounded-full bg-black px-6 py-2.5 text-xs font-semibold text-white hover:bg-slate-800 transition-colors shrink-0"
      >
        + Undang Panitia
      </button>
    </div>

    <!-- Member Cards -->
    <div class="space-y-4">
      <div
        v-for="member in members"
        :key="member.id"
        class="rounded-2xl border border-black bg-white p-6 space-y-4 transition-all"
      >
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div class="flex items-center gap-3">
            <div class="h-10 w-10 rounded-xl border border-black bg-[#72a5e4] flex items-center justify-center font-bold text-sm text-black shrink-0">
              {{ member.name.charAt(0).toUpperCase() }}
            </div>
            <div>
              <h3 class="text-sm font-bold text-black">{{ member.name }}</h3>
              <p class="text-xs text-slate-500">{{ member.email }} • {{ member.department }}</p>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <span class="rounded-full border border-black bg-white px-4 py-1 text-xs font-semibold text-black">
              {{ member.role }}
            </span>
            <button
              v-if="member.role !== 'Owner'"
              @click="removeMember(member.id)"
              class="rounded-full border border-black bg-white px-4 py-1 text-xs font-semibold text-black hover:bg-rose-50 hover:text-rose-600"
            >
              Hapus
            </button>
          </div>
        </div>

        <!-- Granular Permissions Checklist -->
        <div class="space-y-2 pt-2 border-t border-black/10">
          <span class="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
            HAK AKSES GRANULAR (KLIK UNTUK MENGUBAH):
          </span>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="perm in allPermissions"
              :key="perm"
              @click="togglePermission(member, perm)"
              type="button"
              class="rounded-full border border-black px-3 py-1 text-xs font-semibold transition-colors flex items-center gap-1.5"
              :class="member.permissions.includes(perm) ? 'bg-[#72a5e4] text-black font-bold' : 'bg-white text-slate-700 hover:bg-slate-50'"
            >
              <span v-if="member.permissions.includes(perm)">✓</span>
              <span v-else>+</span>
              <span>{{ perm }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal Popup Invite Panitia -->
    <div
      v-if="showForm"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-2xs"
    >
      <div class="w-full max-w-md rounded-3xl border-2 border-black bg-white p-6 sm:p-8 space-y-6">
        <div class="flex items-center justify-between border-b border-black/20 pb-3">
          <h3 class="text-xl font-bold text-black font-editorial">Undang Panitia Baru</h3>
          <button @click="showForm = false" class="p-1 rounded-full border border-black hover:bg-slate-100">
            <X class="h-4 w-4" />
          </button>
        </div>

        <form @submit.prevent="inviteMember" class="space-y-4 text-xs">
          <div class="space-y-1">
            <label class="font-bold text-black">Nama Lengkap</label>
            <input
              v-model="name"
              type="text"
              required
              placeholder="Contoh: Dimas Wijaya"
              class="w-full rounded-xl border border-black p-2.5 text-black focus:outline-hidden"
            />
          </div>

          <div class="space-y-1">
            <label class="font-bold text-black">Email</label>
            <input
              v-model="email"
              type="email"
              required
              placeholder="dimas@example.com"
              class="w-full rounded-xl border border-black p-2.5 text-black focus:outline-hidden"
            />
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-1">
              <label class="font-bold text-black">Peran (Role)</label>
              <select
                v-model="role"
                class="w-full rounded-xl border border-black p-2.5 text-black focus:outline-hidden"
              >
                <option value="Manager">Manager</option>
                <option value="Staff">Staff</option>
                <option value="Admin">Admin</option>
              </select>
            </div>

            <div class="space-y-1">
              <label class="font-bold text-black">Divisi / Departemen</label>
              <input
                v-model="department"
                type="text"
                placeholder="Gate & Check-in"
                class="w-full rounded-xl border border-black p-2.5 text-black focus:outline-hidden"
              />
            </div>
          </div>

          <div class="pt-4 flex justify-end gap-3 border-t border-black/20">
            <button
              type="button"
              @click="showForm = false"
              class="rounded-full border border-black bg-white px-5 py-2 font-semibold text-black hover:bg-slate-100"
            >
              Batal
            </button>
            <button
              type="submit"
              class="rounded-full bg-black px-6 py-2 font-bold text-white hover:bg-slate-800"
            >
              Kirim Undangan
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

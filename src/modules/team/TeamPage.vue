<script setup>
import { ref, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useEventWorkspaceStore } from '@/stores/eventWorkspace'
import { useToastStore } from '@/stores/toast'
import { X, Copy, Check, Mail, Pencil } from 'lucide-vue-next'

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

const rolePresets = {
  Staff: ['View Event', 'Manage Check-in'],
  Manager: ['View Event', 'Edit Event', 'Manage Timeline', 'View Participants'],
  Admin: [...allPermissions],
  Owner: [...allPermissions]
}

const members = computed(() =>
  store.teamMembers.filter((m) => !m.event_id || m.event_id === route.params.eventId)
)

const email = ref('')
const name = ref('')
const role = ref('Staff')
const department = ref('Ticketing & Gate')
const selectedPermissions = ref([...rolePresets.Staff])
const showForm = ref(false)
const submitting = ref(false)
const lastInvite = ref(null)
const copiedLink = ref(false)

watch(role, (nextRole) => {
  selectedPermissions.value = [...(rolePresets[nextRole] || ['View Event'])]
})

function toggleDraftPermission(perm) {
  if (perm === 'View Event') return
  if (selectedPermissions.value.includes(perm)) {
    selectedPermissions.value = selectedPermissions.value.filter((p) => p !== perm)
  } else {
    selectedPermissions.value = [...selectedPermissions.value, perm]
  }
}

async function copyInviteUrl() {
  if (!lastInvite.value?.invite_url) return
  try {
    await navigator.clipboard.writeText(lastInvite.value.invite_url)
    copiedLink.value = true
    toast.success('Tautan undangan disalin.')
    setTimeout(() => {
      copiedLink.value = false
    }, 2000)
  } catch {
    toast.info('Silakan salin tautan secara manual.')
  }
}

async function inviteMember() {
  if (!email.value.trim()) return
  submitting.value = true
  try {
    const invitedEmail = email.value.trim()
    const result = await store.inviteTeamMember(route.params.eventId, {
      name: name.value.trim() || invitedEmail.split('@')[0],
      email: invitedEmail,
      role: role.value,
      department: department.value,
      permissions: selectedPermissions.value
    })
    lastInvite.value = {
      email: invitedEmail,
      invite_url: result?.invite_url,
      email_status: result?.email_status
    }
    email.value = ''
    name.value = ''
    role.value = 'Staff'
    selectedPermissions.value = [...rolePresets.Staff]
    showForm.value = false
    if (result?.email_status?.sent) {
      toast.success(`Undangan email dikirim ke ${invitedEmail} via Resend.`)
    } else {
      toast.info('Panitia ditambahkan. Salin tautan undangan atau lengkapi RESEND_API_KEY di .env.')
    }
  } catch (err) {
    toast.error(err?.message || 'Gagal mengundang anggota panitia.')
  } finally {
    submitting.value = false
  }
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
  if (!window.confirm('Hapus anggota ini dari kepanitiaan event?')) return
  try {
    await store.removeTeamMember(route.params.eventId, memberId)
    toast.success('Anggota berhasil dihapus dari kepanitiaan.')
  } catch (err) {
    toast.error(err?.message || 'Gagal menghapus anggota.')
  }
}

const editingMember = ref(null)
const editRole = ref('Staff')
const editDept = ref('')
const savingMemberEdit = ref(false)

function openEditMember(member) {
  editingMember.value = member
  editRole.value = member.role || 'Staff'
  editDept.value = member.department || ''
}

async function saveMemberEdit() {
  if (!editingMember.value) return
  savingMemberEdit.value = true
  try {
    await store.updateTeamMember(route.params.eventId, editingMember.value.id, {
      role: editRole.value,
      department: editDept.value.trim() || 'Operasional'
    })
    editingMember.value = null
    toast.success('Role & departemen panitia diperbarui.')
  } catch (err) {
    toast.error(err?.message || 'Gagal memperbarui anggota panitia.')
  } finally {
    savingMemberEdit.value = false
  }
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

    <!-- Invite Status & Link Banner -->
    <div
      v-if="lastInvite"
      class="rounded-2xl border border-black bg-[#fafaf9] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
    >
      <div class="space-y-1 text-xs">
        <div class="flex items-center gap-2 font-bold text-black">
          <Mail class="h-4 w-4 text-black" />
          <span v-if="lastInvite.email_status?.sent">
            Email undangan berhasil dikirim via Resend ke {{ lastInvite.email }}
          </span>
          <span v-else>
            Anggota {{ lastInvite.email }} ditambahkan (Email Resend: {{ lastInvite.email_status?.reason || 'Belum dikonfigurasi' }})
          </span>
        </div>
        <p v-if="lastInvite.invite_url" class="text-[11px] text-slate-600 break-all">
          Link undangan: <code class="font-mono text-black">{{ lastInvite.invite_url }}</code>
        </p>
      </div>
      <div class="flex items-center gap-2 shrink-0">
        <button
          v-if="lastInvite.invite_url"
          type="button"
          @click="copyInviteUrl"
          class="inline-flex items-center gap-1.5 rounded-full border border-black bg-[#72a5e4] px-4 py-1.5 text-xs font-bold text-black hover:bg-[#5c93d9]"
        >
          <Check v-if="copiedLink" class="h-3.5 w-3.5" />
          <Copy v-else class="h-3.5 w-3.5" />
          <span>{{ copiedLink ? 'Tersalin' : 'Salin Link' }}</span>
        </button>
        <button
          type="button"
          @click="lastInvite = null"
          class="rounded-full border border-black bg-white p-1.5 hover:bg-slate-100"
        >
          <X class="h-3.5 w-3.5" />
        </button>
      </div>
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

          <div class="flex items-center gap-2 flex-wrap">
            <span
              class="rounded-full border border-black px-3 py-1 text-[11px] font-bold"
              :class="member.status === 'Pending' ? 'bg-amber-100 text-amber-900' : 'bg-emerald-100 text-emerald-900'"
            >
              {{ member.status || 'Active' }}
            </span>
            <span class="rounded-full border border-black bg-white px-4 py-1 text-xs font-semibold text-black">
              {{ member.role }}
            </span>
            <button
              v-if="member.role !== 'Owner'"
              @click="openEditMember(member)"
              title="Edit Role & Departemen"
              class="inline-flex items-center gap-1 rounded-full border border-black bg-white px-3 py-1 text-xs font-semibold text-black hover:bg-slate-100"
            >
              <Pencil class="h-3 w-3" /> Edit
            </button>
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

    <!-- Modal Edit Role & Departemen Panitia -->
    <div
      v-if="editingMember"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-2xs"
    >
      <div class="w-full max-w-sm rounded-3xl border-2 border-black bg-white p-6 space-y-5">
        <div class="flex items-center justify-between border-b border-black/20 pb-3">
          <div>
            <h3 class="text-lg font-bold text-black font-editorial">Edit Anggota Panitia</h3>
            <p class="text-[11px] text-slate-500">{{ editingMember.name }} ({{ editingMember.email }})</p>
          </div>
          <button @click="editingMember = null" class="p-1 rounded-full border border-black hover:bg-slate-100">
            <X class="h-4 w-4" />
          </button>
        </div>

        <form @submit.prevent="saveMemberEdit" class="space-y-4 text-xs">
          <div class="space-y-1">
            <label class="font-bold text-black">Peran (Role)</label>
            <select v-model="editRole" class="w-full rounded-xl border border-black p-2.5 text-black bg-white">
              <option value="Admin">Admin</option>
              <option value="Manager">Manager</option>
              <option value="Staff">Staff</option>
              <option value="Viewer">Viewer</option>
            </select>
          </div>
          <div class="space-y-1">
            <label class="font-bold text-black">Divisi / Departemen</label>
            <input
              v-model="editDept"
              type="text"
              placeholder="Contoh: Acara, Humas, Logistik"
              class="w-full rounded-xl border border-black p-2.5 text-black focus:outline-hidden"
            />
          </div>
          <div class="pt-3 flex justify-end gap-2 border-t border-black/20">
            <button
              type="button"
              @click="editingMember = null"
              class="rounded-full border border-black bg-white px-4 py-2 font-semibold text-black hover:bg-slate-100"
            >
              Batal
            </button>
            <button
              type="submit"
              :disabled="savingMemberEdit"
              class="rounded-full bg-black px-5 py-2 font-bold text-white hover:bg-slate-800 disabled:opacity-60"
            >
              {{ savingMemberEdit ? 'Menyimpan...' : 'Simpan Perubahan' }}
            </button>
          </div>
        </form>
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

          <div class="space-y-1.5 pt-1">
            <label class="font-bold text-black block">
              Atur Hak Akses Event (Sesuai Aturan Organizer)
            </label>
            <div class="flex flex-wrap gap-1.5">
              <button
                v-for="perm in allPermissions"
                :key="perm"
                type="button"
                @click="toggleDraftPermission(perm)"
                class="rounded-full border border-black px-2.5 py-1 text-[11px] font-semibold transition-colors"
                :class="selectedPermissions.includes(perm) ? 'bg-[#72a5e4] text-black font-bold' : 'bg-white text-slate-600 hover:bg-slate-50'"
              >
                <span v-if="selectedPermissions.includes(perm)">✓ </span>
                <span v-else>+ </span>
                {{ perm }}
              </button>
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
              :disabled="submitting"
              class="rounded-full bg-black px-6 py-2 font-bold text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {{ submitting ? 'Mengirim...' : 'Kirim Undangan' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useEventWorkspaceStore } from '@/stores/eventWorkspace'
import { useToastStore } from '@/stores/toast'
import { slugify } from '@/utils/formatters'
import { X, Pencil, Trash2, Users, ShieldCheck } from 'lucide-vue-next'

const store = useEventWorkspaceStore()
const toast = useToastStore()

const showForm = ref(false)
const editingOrgId = ref(null)
const orgName = ref('')
const orgEmail = ref('')
const orgPhone = ref('')
const orgWebsite = ref('')
const orgDesc = ref('')
const orgLogoUrl = ref('')
const orgCoverUrl = ref('')
const uploadingOrgMedia = ref('')
const savingOrg = ref(false)

// Organization Members Modal
const activeMembersOrg = ref(null)
const orgMembers = ref([])
const loadingMembers = ref(false)
const memberEmail = ref('')
const memberRole = ref('Staff')
const addingMember = ref(false)

function openCreateOrg() {
  editingOrgId.value = null
  orgName.value = ''
  orgEmail.value = ''
  orgPhone.value = ''
  orgWebsite.value = ''
  orgDesc.value = ''
  orgLogoUrl.value = ''
  orgCoverUrl.value = ''
  showForm.value = true
}

function openEditOrg(org) {
  editingOrgId.value = org.id
  orgName.value = org.name || ''
  orgEmail.value = org.email || ''
  orgPhone.value = org.phone || ''
  orgWebsite.value = org.website || ''
  orgDesc.value = org.description || ''
  orgLogoUrl.value = org.logo_url || ''
  orgCoverUrl.value = org.cover_url || ''
  showForm.value = true
}

async function handleOrgMediaUpload(e, target) {
  const file = e.target.files?.[0]
  if (!file) return
  uploadingOrgMedia.value = target
  try {
    const uploaded = await store.uploadMedia(file, { folder: 'organizations', bucketType: 'media' })
    if (uploaded?.public_url) {
      if (target === 'logo') orgLogoUrl.value = uploaded.public_url
      else orgCoverUrl.value = uploaded.public_url
      toast.success('Media organisasi diunggah ke Supabase Storage.')
    }
  } catch (err) {
    toast.error(err?.message || 'Gagal mengunggah media organisasi.')
  } finally {
    uploadingOrgMedia.value = ''
    e.target.value = ''
  }
}

async function saveOrg() {
  if (!orgName.value.trim()) return
  savingOrg.value = true
  try {
    const name = orgName.value.trim()
    const payload = {
      name,
      description: orgDesc.value || 'Organisasi penyelenggara event.',
      email: orgEmail.value || 'contact@org.id',
      phone: orgPhone.value || undefined,
      website: orgWebsite.value || 'https://terra.id',
      logo_url: orgLogoUrl.value || undefined,
      cover_url: orgCoverUrl.value || undefined
    }
    if (editingOrgId.value) {
      await store.updateOrganization(editingOrgId.value, payload)
      toast.success(`Organisasi "${name}" diperbarui.`)
    } else {
      await store.createOrganization({ ...payload, slug: slugify(name) })
      toast.success(`Organisasi "${name}" berhasil dibuat.`)
    }
    showForm.value = false
  } catch (err) {
    toast.error(err?.message || 'Gagal menyimpan data organisasi.')
  } finally {
    savingOrg.value = false
  }
}

async function removeOrg(org) {
  if (!window.confirm(`Hapus organisasi "${org.name}"? Tindakan ini tidak dapat dibatalkan.`)) return
  try {
    await store.deleteOrganization(org.id)
    toast.success(`Organisasi "${org.name}" dihapus.`)
  } catch (err) {
    toast.error(err?.message || 'Gagal menghapus organisasi.')
  }
}

async function submitVerification(org) {
  try {
    await store.requestOrgVerification(org.id)
    toast.success(`Pengajuan verifikasi "${org.name}" dikirim ke Admin.`)
  } catch (err) {
    toast.error(err?.message || 'Gagal mengajukan verifikasi.')
  }
}

async function openMembersModal(org) {
  activeMembersOrg.value = org
  loadingMembers.value = true
  try {
    orgMembers.value = await store.fetchOrgMembers(org.id)
  } catch (err) {
    orgMembers.value = org.members || []
    toast.error(err?.message || 'Gagal memuat anggota organisasi.')
  } finally {
    loadingMembers.value = false
  }
}

async function addMember() {
  if (!activeMembersOrg.value || !memberEmail.value.trim()) return
  addingMember.value = true
  try {
    const added = await store.addOrgMember(activeMembersOrg.value.id, {
      email: memberEmail.value.trim(),
      role: memberRole.value
    })
    if (added) {
      orgMembers.value = await store.fetchOrgMembers(activeMembersOrg.value.id)
      toast.success(`Anggota ${memberEmail.value.trim()} ditambahkan.`)
      memberEmail.value = ''
    }
  } catch (err) {
    toast.error(err?.message || 'Gagal menambahkan anggota.')
  } finally {
    addingMember.value = false
  }
}

async function changeMemberRole(member, role) {
  if (!activeMembersOrg.value) return
  try {
    await store.updateOrgMember(activeMembersOrg.value.id, member.id, { role })
    member.role = role
    toast.success(`Role ${member.name || member.email} diubah ke ${role}.`)
  } catch (err) {
    toast.error(err?.message || 'Gagal memperbarui role anggota.')
  }
}

async function deleteOrgMember(member) {
  if (!activeMembersOrg.value) return
  try {
    await store.removeOrgMember(activeMembersOrg.value.id, member.id)
    orgMembers.value = orgMembers.value.filter((m) => m.id !== member.id)
    toast.success('Anggota dihapus dari organisasi.')
  } catch (err) {
    toast.error(err?.message || 'Gagal menghapus anggota.')
  }
}
</script>

<template>
  <div class="space-y-8 min-h-[calc(100vh-6rem)]">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div class="space-y-1">
        <h1 class="text-3xl sm:text-4xl font-bold tracking-tight text-black font-editorial">
          <strong class="font-sans font-black">My</strong> Organizations
        </h1>
        <p class="text-xs sm:text-sm text-slate-600">
          Kelola organisasi penyelenggara event dan keanggotaan tim.
        </p>
      </div>

      <button
        @click="openCreateOrg"
        class="rounded-full border border-black bg-[#72a5e4] px-6 py-2.5 text-xs font-bold text-black hover:bg-[#5c93d9] transition-colors shrink-0"
      >
        + Buat Organisasi
      </button>
    </div>

    <!-- 2-Column Organization Cards -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div
        v-for="org in store.organizations"
        :key="org.id"
        class="rounded-2xl border border-black bg-white p-6 space-y-4 flex flex-col justify-between hover:shadow-xs transition-shadow"
      >
        <div class="space-y-3">
          <div class="flex items-start gap-4">
            <div class="h-14 w-14 rounded-xl border border-black overflow-hidden shrink-0 bg-slate-100 flex items-center justify-center font-bold text-slate-500">
              <img v-if="org.logo_url" :src="org.logo_url" :alt="org.name" class="h-full w-full object-cover" />
              <span v-else>{{ org.name?.slice(0, 2)?.toUpperCase() || 'OR' }}</span>
            </div>
            <div class="space-y-1 flex-1 min-w-0">
              <div class="flex items-start justify-between gap-2">
                <h3 class="text-lg font-bold text-black leading-snug truncate">{{ org.name }}</h3>
                <div class="flex items-center gap-1.5 shrink-0">
                  <button
                    @click="openEditOrg(org)"
                    title="Edit Organisasi"
                    class="rounded-full border border-black bg-white p-1.5 text-black hover:bg-slate-100"
                  >
                    <Pencil class="h-3.5 w-3.5" />
                  </button>
                  <button
                    @click="removeOrg(org)"
                    title="Hapus Organisasi"
                    class="rounded-full border border-black bg-white p-1.5 text-red-600 hover:bg-red-50"
                  >
                    <Trash2 class="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <p class="text-xs font-mono text-slate-400">/{{ org.slug }}</p>
            </div>
          </div>

          <div class="flex flex-wrap items-center gap-2">
            <span
              class="rounded-full border border-black px-3 py-0.5 text-[10px] font-bold"
              :class="org.verification_status === 'verified' ? 'bg-[#72a5e4] text-black' : 'bg-white text-slate-700'"
            >
              {{ org.verification_status || 'unverified' }}
            </span>
            <button
              v-if="org.verification_status !== 'verified' && org.verification_status !== 'pending'"
              @click="submitVerification(org)"
              class="inline-flex items-center gap-1 rounded-full border border-black bg-[#fafaf9] px-2.5 py-0.5 text-[10px] font-bold text-black hover:bg-slate-100"
            >
              <ShieldCheck class="h-3 w-3" /> Ajukan Verifikasi
            </button>
          </div>

          <p class="text-xs text-slate-600 leading-relaxed pt-1">
            {{ org.description }}
          </p>
        </div>

        <div class="pt-4 border-t border-black/10 flex items-center justify-between gap-2 text-xs font-bold text-black">
          <div class="flex items-center gap-3">
            <span>{{ org.member_count ?? org.members?.length ?? 0 }} Anggota</span>
            <span>&bull;</span>
            <span>{{ org.event_count ?? 0 }} Event</span>
          </div>
          <button
            @click="openMembersModal(org)"
            class="inline-flex items-center gap-1.5 rounded-full border border-black bg-white px-3 py-1 text-[11px] font-bold hover:bg-slate-100"
          >
            <Users class="h-3 w-3" /> Kelola Anggota
          </button>
        </div>
      </div>
    </div>

    <div
      v-if="!store.organizations.length"
      class="rounded-2xl border border-dashed border-black bg-white p-10 text-center text-xs text-slate-500"
    >
      Belum ada organisasi. Klik "+ Buat Organisasi" untuk mulai mengelola event.
    </div>

    <!-- Bottom Footnote -->
    <div class="pt-8 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
      TERRA / ORGANIZER STUDIO
    </div>

    <!-- Modal Form Buat / Edit Organisasi -->
    <div
      v-if="showForm"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-2xs"
    >
      <div class="w-full max-w-md rounded-3xl border-2 border-black bg-white p-6 sm:p-8 space-y-5 max-h-[90vh] overflow-y-auto">
        <div class="flex items-center justify-between border-b border-black/20 pb-3">
          <h3 class="text-xl font-bold text-black font-editorial">
            {{ editingOrgId ? 'Edit Organisasi' : 'Buat Organisasi Penyelenggara' }}
          </h3>
          <button @click="showForm = false" class="p-1 rounded-full border border-black hover:bg-slate-100">
            <X class="h-4 w-4" />
          </button>
        </div>

        <form @submit.prevent="saveOrg" class="space-y-4 text-xs">
          <div class="space-y-1">
            <label class="font-bold text-black">Nama Organisasi</label>
            <input
              v-model="orgName"
              type="text"
              required
              placeholder="Contoh: Nusantara Tech Community"
              class="w-full rounded-xl border border-black p-2.5 text-black focus:outline-hidden"
            />
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div class="space-y-1">
              <label class="font-bold text-black">Email Kontak Resmi</label>
              <input
                v-model="orgEmail"
                type="email"
                placeholder="team@nusantaratech.id"
                class="w-full rounded-xl border border-black p-2.5 text-black focus:outline-hidden"
              />
            </div>
            <div class="space-y-1">
              <label class="font-bold text-black">No. WhatsApp / Telepon</label>
              <input
                v-model="orgPhone"
                type="text"
                placeholder="+62 812-..."
                class="w-full rounded-xl border border-black p-2.5 text-black focus:outline-hidden"
              />
            </div>
          </div>

          <div class="space-y-1">
            <label class="font-bold text-black">Website / Sosial Media</label>
            <input
              v-model="orgWebsite"
              type="text"
              placeholder="https://organisasi.id"
              class="w-full rounded-xl border border-black p-2.5 text-black focus:outline-hidden"
            />
          </div>

          <div class="space-y-1">
            <label class="font-bold text-black">Deskripsi Singkat</label>
            <textarea
              v-model="orgDesc"
              rows="3"
              placeholder="Komunitas pengembang perangkat lunak, AI, dan startup..."
              class="w-full rounded-xl border border-black p-2.5 text-black focus:outline-hidden resize-none"
            />
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div class="space-y-1">
              <label class="font-bold text-black block">Logo Organisasi</label>
              <label class="block rounded-xl border border-black bg-[#fafaf9] p-2.5 text-center font-semibold cursor-pointer hover:bg-slate-100 truncate">
                <span>{{ uploadingOrgMedia === 'logo' ? 'Mengunggah...' : orgLogoUrl ? '✓ Logo Siap' : '↑ Upload Logo' }}</span>
                <input type="file" accept="image/*" class="hidden" @change="handleOrgMediaUpload($event, 'logo')" />
              </label>
            </div>
            <div class="space-y-1">
              <label class="font-bold text-black block">Banner Cover</label>
              <label class="block rounded-xl border border-black bg-[#fafaf9] p-2.5 text-center font-semibold cursor-pointer hover:bg-slate-100 truncate">
                <span>{{ uploadingOrgMedia === 'cover' ? 'Mengunggah...' : orgCoverUrl ? '✓ Cover Siap' : '↑ Upload Cover' }}</span>
                <input type="file" accept="image/*" class="hidden" @change="handleOrgMediaUpload($event, 'cover')" />
              </label>
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
              :disabled="savingOrg"
              class="rounded-full bg-black px-6 py-2 font-bold text-white hover:bg-slate-800 disabled:opacity-60"
            >
              {{ savingOrg ? 'Menyimpan...' : editingOrgId ? 'Simpan Perubahan' : 'Simpan Organisasi' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Modal Kelola Anggota Organisasi -->
    <div
      v-if="activeMembersOrg"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-2xs"
    >
      <div class="w-full max-w-lg rounded-3xl border-2 border-black bg-white p-6 sm:p-8 space-y-5 max-h-[90vh] overflow-y-auto">
        <div class="flex items-center justify-between border-b border-black/20 pb-3">
          <div>
            <h3 class="text-xl font-bold text-black font-editorial">Anggota Organisasi</h3>
            <p class="text-[11px] text-slate-500">{{ activeMembersOrg.name }}</p>
          </div>
          <button @click="activeMembersOrg = null" class="p-1 rounded-full border border-black hover:bg-slate-100">
            <X class="h-4 w-4" />
          </button>
        </div>

        <form @submit.prevent="addMember" class="flex flex-col sm:flex-row gap-2 text-xs">
          <input
            v-model="memberEmail"
            type="email"
            required
            placeholder="email-anggota@org.id"
            class="flex-1 rounded-xl border border-black px-3 py-2 text-black focus:outline-hidden"
          />
          <select v-model="memberRole" class="rounded-xl border border-black px-3 py-2 text-black bg-white">
            <option value="Admin">Admin</option>
            <option value="Manager">Manager</option>
            <option value="Staff">Staff</option>
            <option value="Viewer">Viewer</option>
          </select>
          <button
            type="submit"
            :disabled="addingMember"
            class="rounded-full border border-black bg-[#72a5e4] px-4 py-2 font-bold text-black hover:bg-[#5c93d9]"
          >
            {{ addingMember ? '...' : '+ Tambah' }}
          </button>
        </form>

        <div class="divide-y divide-black/10 text-xs">
          <div v-if="loadingMembers" class="py-4 text-center text-slate-500">Memuat anggota...</div>
          <div
            v-for="m in orgMembers"
            :key="m.id"
            class="py-3 flex items-center justify-between gap-3"
          >
            <div class="min-w-0">
              <p class="font-bold text-black truncate">{{ m.name || m.email }}</p>
              <p class="text-[11px] text-slate-500 truncate">{{ m.email }}</p>
            </div>
            <div class="flex items-center gap-2 shrink-0">
              <select
                :value="m.role"
                @change="changeMemberRole(m, $event.target.value)"
                class="rounded-full border border-black bg-white px-2.5 py-1 text-[11px] font-bold"
              >
                <option value="Owner">Owner</option>
                <option value="Admin">Admin</option>
                <option value="Manager">Manager</option>
                <option value="Staff">Staff</option>
                <option value="Viewer">Viewer</option>
              </select>
              <button
                v-if="m.role !== 'Owner'"
                @click="deleteOrgMember(m)"
                class="rounded-full border border-black p-1 text-red-600 hover:bg-red-50"
                title="Hapus anggota"
              >
                <Trash2 class="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
          <div v-if="!loadingMembers && !orgMembers.length" class="py-4 text-center text-slate-500">
            Belum ada anggota tambahan.
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

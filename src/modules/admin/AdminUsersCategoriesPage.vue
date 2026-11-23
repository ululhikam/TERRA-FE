<script setup>
import { reactive, ref } from 'vue'
import { useEventWorkspaceStore } from '@/stores/eventWorkspace'
import { useToastStore } from '@/stores/toast'
import { Trash2, UserPlus, X, CheckCircle2, Lock } from 'lucide-vue-next'

const store = useEventWorkspaceStore()
const toast = useToastStore()
const newCat = ref('')

const showAddOrganizer = ref(false)
const creatingOrganizer = ref(false)
const form = reactive({
  organization_name: '',
  full_name: '',
  email: '',
  phone: '',
  password: '',
  plan: 'pro_monthly',
  duration_days: 30
})

async function addCategory() {
  if (!newCat.value.trim()) return
  await store.createCategory({ name: newCat.value.trim() })
  newCat.value = ''
  toast.success('Kategori baru ditambahkan.')
}

async function removeCategory(cat) {
  await store.deleteCategory(cat.id)
  toast.info(`Kategori "${cat.name}" dihapus.`)
}

async function toggleSuspend(u) {
  await store.toggleUserStatus(u)
  toast.success(`Status ${u.full_name || u.email} diperbarui.`)
}

async function handleCreateOrganizer() {
  creatingOrganizer.value = true
  try {
    const res = await store.createAdminOrganizer({
      ...form,
      duration_days: Number(form.duration_days) || (form.plan === 'free_trial' ? 14 : 30)
    })
    toast.success(
      `User Organizer "${res?.organizer?.full_name || form.full_name}" berhasil ditambahkan & aktif.`
    )
    form.organization_name = ''
    form.full_name = ''
    form.email = ''
    form.phone = ''
    form.password = ''
    form.plan = 'pro_monthly'
    form.duration_days = 30
    showAddOrganizer.value = false
  } catch (err) {
    toast.error(err?.message || 'Gagal menambahkan user organizer.')
  } finally {
    creatingOrganizer.value = false
  }
}

async function setSubscription(u, active) {
  try {
    await store.updateOrganizerSubscription(
      u.id,
      active
        ? { plan: 'pro_monthly', status: 'active', duration_days: 30 }
        : { plan: 'unpaid', status: 'expired', duration_days: 0 }
    )
    toast.success(
      active
        ? `Paket 1 Bulan Organizer ${u.full_name || u.email} diaktifkan.`
        : `Akses modul Organizer ${u.full_name || u.email} ditutup (expired).`
    )
  } catch (err) {
    toast.error(err?.message || 'Gagal memperbarui langganan organizer.')
  }
}
</script>

<template>
  <div class="space-y-6 min-h-[calc(100vh-6rem)]">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div class="space-y-1">
        <span class="text-[9px] font-bold uppercase tracking-widest text-slate-500 block">
          MASTER DATA
        </span>
        <h1 class="text-3xl font-bold text-black font-sans">Users &amp; Categories Management</h1>
        <p class="text-xs text-slate-500">
          Kelola pengguna platform, tambah akun Organizer dari konfirmasi WhatsApp, dan atur masa aktif langganan.
        </p>
      </div>

      <button
        type="button"
        @click="showAddOrganizer = true"
        class="inline-flex items-center gap-2 rounded-full border border-black bg-[#72a5e4] px-5 py-2.5 text-xs font-bold text-black hover:bg-[#5c93d9] transition-colors cursor-pointer shrink-0"
      >
        <UserPlus class="h-4 w-4" />
        <span>+ Tambah User Organizer</span>
      </button>
    </div>

    <div class="rounded-xl border border-black bg-[#fafaf9] p-6 space-y-4">
      <h2 class="text-base font-bold text-black">Kategori Event</h2>
      <form @submit.prevent="addCategory" class="flex gap-2.5 max-w-md">
        <input
          v-model="newCat"
          type="text"
          placeholder="Nama kategori baru..."
          class="flex-1 rounded-full border border-black bg-white px-4 py-2 text-xs text-black focus:outline-hidden"
        />
        <button
          type="submit"
          class="rounded-full bg-black px-6 py-2 text-xs font-bold text-white hover:bg-slate-800 cursor-pointer"
        >
          + Tambah
        </button>
      </form>
      <div class="flex flex-wrap gap-2">
        <span
          v-for="c in store.categories"
          :key="c.id"
          class="inline-flex items-center gap-2 rounded-full border border-black bg-white px-3.5 py-1 text-xs font-semibold text-black"
        >
          <span>{{ c.name }}</span>
          <button
            @click="removeCategory(c)"
            type="button"
            class="text-slate-400 hover:text-rose-600 cursor-pointer"
            title="Hapus kategori"
          >
            <Trash2 class="h-3 w-3" />
          </button>
        </span>
      </div>
    </div>

    <div class="rounded-xl border border-black bg-[#fafaf9] overflow-hidden">
      <div class="border-b border-black px-6 py-4 bg-white flex items-center justify-between gap-2">
        <h2 class="text-sm font-bold text-black">Daftar Pengguna ({{ store.adminUsers.length }})</h2>
      </div>
      <div class="overflow-x-auto">
        <table class="min-w-full text-left text-xs">
          <thead class="bg-[#72a5e4]/30 border-b border-black text-[10px] font-bold uppercase text-black">
            <tr>
              <th class="px-6 py-3">NAMA</th>
              <th class="px-6 py-3">EMAIL &amp; KONTAK</th>
              <th class="px-6 py-3">ROLE</th>
              <th class="px-6 py-3">LANGGANAN / STATUS</th>
              <th class="px-6 py-3 text-right">AKSI</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-black/10">
            <tr v-for="u in store.adminUsers" :key="u.id" class="hover:bg-white">
              <td class="px-6 py-3.5 font-bold text-black">{{ u.full_name || u.name }}</td>
              <td class="px-6 py-3.5 text-slate-600">
                <div>{{ u.email }}</div>
                <div v-if="u.phone" class="text-[11px] text-slate-400">{{ u.phone }}</div>
              </td>
              <td class="px-6 py-3.5 capitalize font-semibold text-black">{{ u.role }}</td>
              <td class="px-6 py-3.5">
                <div class="flex flex-wrap items-center gap-1.5">
                  <span
                    class="rounded-full border border-black px-3 py-0.5 text-[10px] font-bold text-black"
                    :class="u.is_suspended ? 'bg-rose-100 text-rose-800' : 'bg-[#72a5e4]'"
                  >
                    {{ u.is_suspended ? 'Suspended' : 'Active' }}
                  </span>
                  <span
                    v-if="u.role === 'organizer' && u.subscription"
                    class="inline-flex items-center gap-1 rounded-full border border-black px-2.5 py-0.5 text-[10px] font-bold"
                    :class="u.subscription.is_active ? 'bg-white text-black' : 'bg-rose-100 text-rose-900'"
                  >
                    <component :is="u.subscription.is_active ? CheckCircle2 : Lock" class="h-2.5 w-2.5" />
                    <span v-if="u.subscription.is_active">
                      {{ u.subscription.plan === 'free_trial' ? 'Trial' : 'Pro 1 Bln' }} • {{ u.subscription.days_remaining }} hr
                    </span>
                    <span v-else>Terkunci / Expired</span>
                  </span>
                </div>
              </td>
              <td class="px-6 py-3.5 text-right">
                <div class="inline-flex flex-wrap justify-end gap-1.5">
                  <button
                    v-if="u.role === 'organizer'"
                    @click="setSubscription(u, !u.subscription?.is_active)"
                    type="button"
                    class="rounded-full border border-black px-3 py-1 text-[11px] font-bold cursor-pointer"
                    :class="u.subscription?.is_active ? 'bg-white text-rose-700 hover:bg-rose-50' : 'bg-[#72a5e4] text-black hover:bg-[#5c93d9]'"
                  >
                    {{ u.subscription?.is_active ? 'Tutup Akses' : 'Aktifkan 1 Bln' }}
                  </button>
                  <button
                    @click="toggleSuspend(u)"
                    type="button"
                    class="rounded-full border border-black bg-white px-3 py-1 text-[11px] font-semibold hover:bg-slate-100 cursor-pointer"
                  >
                    {{ u.is_suspended ? 'Aktifkan' : 'Suspend' }}
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="!store.adminUsers.length">
              <td colspan="5" class="px-6 py-6 text-center text-slate-500">
                Belum ada data pengguna dari server.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Modal Tambah User Organizer -->
    <div
      v-if="showAddOrganizer"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-2xs"
    >
      <div class="w-full max-w-lg rounded-3xl border-2 border-black bg-white p-6 sm:p-8 space-y-5">
        <div class="flex items-center justify-between border-b border-black/20 pb-3">
          <div>
            <h3 class="text-xl font-bold text-black font-editorial">Tambah User Organizer</h3>
            <p class="text-[11px] text-slate-500">Buat akun Organizer aktif setelah konfirmasi pembayaran via WhatsApp.</p>
          </div>
          <button @click="showAddOrganizer = false" class="p-1 rounded-full border border-black hover:bg-slate-100 cursor-pointer">
            <X class="h-4 w-4" />
          </button>
        </div>

        <form @submit.prevent="handleCreateOrganizer" class="space-y-3.5 text-xs">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div class="space-y-1">
              <label class="font-bold text-black">Nama Organisasi</label>
              <input
                v-model="form.organization_name"
                type="text"
                required
                placeholder="Nusantara Event Lab"
                class="w-full rounded-xl border border-black p-2.5 text-black focus:outline-hidden"
              />
            </div>
            <div class="space-y-1">
              <label class="font-bold text-black">Nama Pelanggan (PIC)</label>
              <input
                v-model="form.full_name"
                type="text"
                required
                placeholder="Nama Penanggung Jawab"
                class="w-full rounded-xl border border-black p-2.5 text-black focus:outline-hidden"
              />
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div class="space-y-1">
              <label class="font-bold text-black">Email Akun</label>
              <input
                v-model="form.email"
                type="email"
                required
                placeholder="organizer@organisasi.id"
                class="w-full rounded-xl border border-black p-2.5 text-black focus:outline-hidden"
              />
            </div>
            <div class="space-y-1">
              <label class="font-bold text-black">Kontak / No. WhatsApp</label>
              <input
                v-model="form.phone"
                type="tel"
                placeholder="0812xxxxxxxx"
                class="w-full rounded-xl border border-black p-2.5 text-black focus:outline-hidden"
              />
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div class="space-y-1">
              <label class="font-bold text-black">Password Awal</label>
              <input
                v-model="form.password"
                type="text"
                required
                minlength="6"
                placeholder="Minimal 6 karakter"
                class="w-full rounded-xl border border-black p-2.5 text-black focus:outline-hidden"
              />
            </div>
            <div class="space-y-1">
              <label class="font-bold text-black">Paket Akses</label>
              <select
                v-model="form.plan"
                @change="form.duration_days = form.plan === 'free_trial' ? 14 : 30"
                class="w-full rounded-xl border border-black p-2.5 text-black bg-white focus:outline-hidden"
              >
                <option value="pro_monthly">1 Bulan Full Access (100k)</option>
                <option value="free_trial">Free Trial 2 Minggu</option>
              </select>
            </div>
            <div class="space-y-1">
              <label class="font-bold text-black">Durasi (Hari)</label>
              <input
                v-model="form.duration_days"
                type="number"
                min="1"
                max="3650"
                class="w-full rounded-xl border border-black p-2.5 text-black focus:outline-hidden"
              />
            </div>
          </div>

          <div class="pt-4 flex justify-end gap-2.5 border-t border-black/20">
            <button
              type="button"
              @click="showAddOrganizer = false"
              class="rounded-full border border-black bg-white px-5 py-2 font-semibold text-black hover:bg-slate-100 cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              :disabled="creatingOrganizer"
              class="rounded-full border border-black bg-[#72a5e4] px-6 py-2 font-bold text-black hover:bg-[#5c93d9] disabled:opacity-50 cursor-pointer"
            >
              {{ creatingOrganizer ? 'Menyimpan...' : 'Buat & Aktifkan Organizer' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

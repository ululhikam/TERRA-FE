<script setup>
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useEventWorkspaceStore } from '@/stores/eventWorkspace'
import { useToastStore } from '@/stores/toast'
import { X, Plus, Download } from 'lucide-vue-next'

const route = useRoute()
const store = useEventWorkspaceStore()
const toast = useToastStore()
const activeTab = ref('vendors')

const eventId = computed(() => route.params.eventId || store.activeEvent?.id || 'evt-1')
const vendors = computed(() =>
  store.vendors.filter((v) => !v.event_id || v.event_id === eventId.value)
)
const sponsors = computed(() =>
  store.sponsors.filter((s) => !s.event_id || s.event_id === eventId.value)
)
const documents = computed(() =>
  store.documents.filter((d) => !d.event_id || d.event_id === eventId.value)
)

const showVendorModal = ref(false)
const newName = ref('')
const newCat = ref('Logistik & Venue')
const newContact = ref('')
const newValue = ref('Rp 5.000.000')

async function addVendor() {
  if (!newName.value.trim()) return
  await store.addVendor(eventId.value, {
    name: newName.value.trim(),
    category: newCat.value,
    contact: newContact.value || '0812-0000-1234',
    value: newValue.value || 'Rp 5.000.000',
    status: 'Confirmed'
  })
  newName.value = ''
  newContact.value = ''
  showVendorModal.value = false
  toast.success('Vendor baru berhasil ditambahkan.')
}
</script>

<template>
  <div class="space-y-6 min-h-[calc(100vh-6rem)]">
    <!-- Header -->
    <div class="space-y-1">
      <span class="text-[10px] font-bold uppercase tracking-wider text-slate-500">LOGISTICS HUB</span>
      <h1 class="text-3xl font-bold tracking-tight text-black font-editorial">
        Operations, Vendors &amp; Partners
      </h1>
      <p class="text-xs text-slate-600">
        Kelola database rekanan vendor, paket kemitraan sponsor, arsip dokumen, dan survei kepuasan.
      </p>
    </div>

    <!-- Tab Pills Bar -->
    <div class="flex flex-wrap items-center gap-2.5">
      <button
        @click="activeTab = 'vendors'"
        class="rounded-full border border-black px-5 py-2 text-xs font-semibold transition-colors"
        :class="activeTab === 'vendors' ? 'bg-black text-white' : 'bg-white text-black hover:bg-slate-100'"
      >
        Vendor &amp; Mitra Layanan
      </button>
      <button
        @click="activeTab = 'sponsors'"
        class="rounded-full border border-black px-5 py-2 text-xs font-semibold transition-colors"
        :class="activeTab === 'sponsors' ? 'bg-black text-white' : 'bg-white text-black hover:bg-slate-100'"
      >
        Sponsorship &amp; Partners
      </button>
      <button
        @click="activeTab = 'docs'"
        class="rounded-full border border-black px-5 py-2 text-xs font-semibold transition-colors"
        :class="activeTab === 'docs' ? 'bg-black text-white' : 'bg-white text-black hover:bg-slate-100'"
      >
        Dokumen &amp; Lampiran
      </button>
      <button
        @click="activeTab = 'feedback'"
        class="rounded-full border border-black px-5 py-2 text-xs font-semibold transition-colors"
        :class="activeTab === 'feedback' ? 'bg-black text-white' : 'bg-white text-black hover:bg-slate-100'"
      >
        Survei Peserta
      </button>
    </div>

    <!-- Active Tab: Vendors -->
    <div v-if="activeTab === 'vendors'" class="space-y-4">
      <div class="flex items-center justify-between">
        <span class="text-xs text-slate-600 font-medium">Total {{ vendors.length }} Vendor Terdaftar</span>
        <button
          @click="showVendorModal = true"
          class="rounded-full bg-black px-5 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition-colors"
        >
          + Tambah Vendor
        </button>
      </div>

      <!-- Table Card -->
      <div class="rounded-2xl border border-black bg-white overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs">
            <thead class="bg-[#72a5e4]/30 border-b border-black text-[10px] font-bold uppercase text-slate-800">
              <tr>
                <th class="py-3.5 px-6">NAMA REKANAN VENDOR</th>
                <th class="py-3.5 px-6">KATEGORI LAYANAN</th>
                <th class="py-3.5 px-6">KONTAK PERSON</th>
                <th class="py-3.5 px-6">ESTIMASI KONTRAK</th>
                <th class="py-3.5 px-6 text-right">STATUS</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-black/10">
              <tr v-for="v in vendors" :key="v.id" class="hover:bg-slate-50/50">
                <td class="py-4 px-6 font-bold text-black">{{ v.name }}</td>
                <td class="py-4 px-6 text-slate-700">{{ v.category }}</td>
                <td class="py-4 px-6 font-mono text-slate-600">{{ v.contact }}</td>
                <td class="py-4 px-6 font-bold text-black">{{ v.value }}</td>
                <td class="py-4 px-6 text-right">
                  <span
                    class="rounded-full border border-black px-3 py-1 text-xs font-semibold inline-flex items-center gap-1.5"
                    :class="v.status === 'Confirmed' ? 'bg-[#72a5e4] text-black font-bold' : 'bg-white text-slate-700'"
                  >
                    <span>●</span>
                    <span>{{ v.status }}</span>
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Active Tab: Sponsorship -->
    <div v-else-if="activeTab === 'sponsors'" class="space-y-4">
      <div class="flex items-center justify-between">
        <span class="text-xs text-slate-600 font-medium">Total {{ sponsors.length }} Mitra Sponsor</span>
      </div>
      <div class="rounded-2xl border border-black bg-white overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs">
            <thead class="bg-[#72a5e4]/30 border-b border-black text-[10px] font-bold uppercase text-slate-800">
              <tr>
                <th class="py-3.5 px-6">NAMA PERUSAHAAN</th>
                <th class="py-3.5 px-6">TIER SPONSOR</th>
                <th class="py-3.5 px-6">PIC SPONSOR</th>
                <th class="py-3.5 px-6">NILAI KONTRIBUSI</th>
                <th class="py-3.5 px-6 text-right">STATUS</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-black/10">
              <tr v-for="s in sponsors" :key="s.id" class="hover:bg-slate-50/50">
                <td class="py-4 px-6 font-bold text-black">{{ s.name }}</td>
                <td class="py-4 px-6 text-slate-700">{{ s.tier }}</td>
                <td class="py-4 px-6 text-slate-600">{{ s.pic }}</td>
                <td class="py-4 px-6 font-bold text-black">{{ s.contribution }}</td>
                <td class="py-4 px-6 text-right">
                  <span
                    class="rounded-full border border-black px-3 py-1 text-xs font-semibold inline-flex items-center gap-1.5"
                    :class="s.status === 'Confirmed' ? 'bg-[#72a5e4] text-black font-bold' : 'bg-white text-slate-700'"
                  >
                    <span>●</span>
                    <span>{{ s.status }}</span>
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Active Tab: Docs -->
    <div v-else-if="activeTab === 'docs'" class="space-y-4">
      <div class="flex items-center justify-between">
        <span class="text-xs text-slate-600 font-medium">Total {{ documents.length }} Dokumen Tersimpan</span>
      </div>
      <div class="rounded-2xl border border-black bg-white overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs">
            <thead class="bg-[#72a5e4]/30 border-b border-black text-[10px] font-bold uppercase text-slate-800">
              <tr>
                <th class="py-3.5 px-6">NAMA DOKUMEN</th>
                <th class="py-3.5 px-6">KATEGORI</th>
                <th class="py-3.5 px-6">UKURAN</th>
                <th class="py-3.5 px-6">DIPERBARUI</th>
                <th class="py-3.5 px-6 text-right">AKSI</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-black/10">
              <tr v-for="d in documents" :key="d.id" class="hover:bg-slate-50/50">
                <td class="py-4 px-6 font-bold text-black">{{ d.file_name || d.name }}</td>
                <td class="py-4 px-6 text-slate-700">{{ d.category }}</td>
                <td class="py-4 px-6 text-slate-600">{{ d.size || 'PDF / Doc' }}</td>
                <td class="py-4 px-6 text-slate-600">{{ d.updated || d.created_at?.slice(0, 10) || '-' }}</td>
                <td class="py-4 px-6 text-right">
                  <button class="rounded-full border border-black px-3 py-1 text-xs font-semibold hover:bg-slate-100">
                    Unduh
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Active Tab: Feedback -->
    <div v-else class="rounded-2xl border border-black bg-white p-8 text-center space-y-3">
      <h3 class="text-base font-bold text-black">Survei &amp; Feedback Peserta</h3>
      <p class="text-xs text-slate-600 max-w-md mx-auto">
        Kuesioner evaluasi acara otomatis dibuka setelah sesi penutupan selesai. Hasil rating dan masukan peserta akan dirangkum di sini.
      </p>
    </div>

    <!-- Modal Tambah Vendor -->
    <div
      v-if="showVendorModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-2xs"
    >
      <div class="w-full max-w-md rounded-3xl border-2 border-black bg-white p-6 sm:p-8 space-y-6">
        <div class="flex items-center justify-between border-b border-black/20 pb-3">
          <h3 class="text-xl font-bold text-black font-editorial">Tambah Rekanan Vendor</h3>
          <button @click="showVendorModal = false" class="p-1 rounded-full border border-black hover:bg-slate-100">
            <X class="h-4 w-4" />
          </button>
        </div>

        <form @submit.prevent="addVendor" class="space-y-4 text-xs">
          <div class="space-y-1">
            <label class="font-bold text-black">Nama Vendor / Perusahaan</label>
            <input
              v-model="newName"
              type="text"
              required
              placeholder="Contoh: Sonic Sound System"
              class="w-full rounded-xl border border-black p-2.5 text-black focus:outline-hidden"
            />
          </div>

          <div class="space-y-1">
            <label class="font-bold text-black">Kategori Layanan</label>
            <input
              v-model="newCat"
              type="text"
              placeholder="Audio & Lighting"
              class="w-full rounded-xl border border-black p-2.5 text-black focus:outline-hidden"
            />
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-1">
              <label class="font-bold text-black">Kontak Person / No HP</label>
              <input
                v-model="newContact"
                type="text"
                placeholder="0812-xxxx-xxxx"
                class="w-full rounded-xl border border-black p-2.5 text-black focus:outline-hidden"
              />
            </div>
            <div class="space-y-1">
              <label class="font-bold text-black">Nilai Kontrak</label>
              <input
                v-model="newValue"
                type="text"
                placeholder="Rp 10.000.000"
                class="w-full rounded-xl border border-black p-2.5 text-black focus:outline-hidden"
              />
            </div>
          </div>

          <div class="pt-4 flex justify-end gap-3 border-t border-black/20">
            <button
              type="button"
              @click="showVendorModal = false"
              class="rounded-full border border-black bg-white px-5 py-2 font-semibold text-black hover:bg-slate-100"
            >
              Batal
            </button>
            <button
              type="submit"
              class="rounded-full bg-black px-6 py-2 font-bold text-white hover:bg-slate-800"
            >
              Simpan Vendor
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

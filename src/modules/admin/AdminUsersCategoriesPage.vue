<script setup>
import { ref } from 'vue'
import { MOCK_CATEGORIES } from '@/services/mockData'
import { useToastStore } from '@/stores/toast'

const toast = useToastStore()
const categories = ref(MOCK_CATEGORIES.map((c) => ({ ...c })))
const newCat = ref('')

const users = ref([
  { id: 'u-1', name: 'Hikam Pratama', email: 'hikam@example.com', role: 'organizer', status: 'Active' },
  { id: 'u-2', name: 'Nadia Putri', email: 'nadia@example.com', role: 'customer', status: 'Active' },
  { id: 'u-3', name: 'Admin System', email: 'admin@terra.id', role: 'admin', status: 'Active' }
])

function addCategory() {
  if (!newCat.value.trim()) return
  categories.value.push({
    id: 'cat-' + Date.now(),
    name: newCat.value,
    slug: newCat.value.toLowerCase().replace(/\s+/g, '-'),
    count: 0
  })
  newCat.value = ''
  toast.success('Kategori baru ditambahkan.')
}
</script>

<template>
  <div class="space-y-6 min-h-[calc(100vh-6rem)]">
    <div class="space-y-1">
      <span class="text-[9px] font-bold uppercase tracking-widest text-slate-500 block">
        MASTER DATA
      </span>
      <h1 class="text-3xl font-bold text-black font-sans">Users &amp; Categories Management</h1>
      <p class="text-xs text-slate-500">Kelola pengguna platform dan daftar kategori marketplace.</p>
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
          class="rounded-full bg-black px-6 py-2 text-xs font-bold text-white hover:bg-slate-800"
        >
          + Tambah
        </button>
      </form>
      <div class="flex flex-wrap gap-2">
        <span
          v-for="c in categories"
          :key="c.id"
          class="rounded-full border border-black bg-white px-3.5 py-1 text-xs font-semibold text-black"
        >
          {{ c.name }}
        </span>
      </div>
    </div>

    <div class="rounded-xl border border-black bg-[#fafaf9] overflow-hidden">
      <div class="border-b border-black px-6 py-4 bg-white">
        <h2 class="text-sm font-bold text-black">Daftar Pengguna</h2>
      </div>
      <table class="min-w-full text-left text-xs">
        <thead class="bg-[#72a5e4]/30 border-b border-black text-[10px] font-bold uppercase text-black">
          <tr>
            <th class="px-6 py-3">NAMA</th>
            <th class="px-6 py-3">EMAIL</th>
            <th class="px-6 py-3">ROLE</th>
            <th class="px-6 py-3">STATUS</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-black/10">
          <tr v-for="u in users" :key="u.id" class="hover:bg-white">
            <td class="px-6 py-3.5 font-bold text-black">{{ u.name }}</td>
            <td class="px-6 py-3.5 text-slate-600">{{ u.email }}</td>
            <td class="px-6 py-3.5 capitalize font-semibold text-black">{{ u.role }}</td>
            <td class="px-6 py-3.5">
              <span class="rounded-full border border-black bg-[#72a5e4] px-3 py-0.5 text-[10px] font-bold text-black">
                {{ u.status }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

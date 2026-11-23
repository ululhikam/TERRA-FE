<script setup>
import { useEventWorkspaceStore } from '@/stores/eventWorkspace'
import { useToastStore } from '@/stores/toast'
import { formatDate } from '@/utils/formatters'

const store = useEventWorkspaceStore()
const toast = useToastStore()

async function moderate(evt, action) {
  if (action === 'request-revision') {
    const notes = window.prompt(`Catatan revisi untuk "${evt.title}":`, 'Lengkapi detail acara dan jadwal.')
    if (notes === null) return
    await store.adminRequestRevision(evt.id, notes)
    toast.success(`Permintaan revisi dikirim untuk "${evt.title}".`)
    return
  }
  await store.updateModeration(evt.id, action)
  toast.success(`Event "${evt.title}" berhasil di-${action}.`)
}
</script>

<template>
  <div class="space-y-6 min-h-[calc(100vh-6rem)]">
    <div class="space-y-1">
      <span class="text-[9px] font-bold uppercase tracking-widest text-slate-500 block">
        QUALITY CONTROL
      </span>
      <h1 class="text-3xl font-bold text-black font-sans">Event Moderation</h1>
      <p class="text-xs text-slate-500">Review, setujui, tolak, atau suspend event sebelum tampil di marketplace.</p>
    </div>

    <div class="overflow-hidden rounded-xl border border-black bg-[#fafaf9]">
      <div class="overflow-x-auto">
        <table class="min-w-full text-left text-xs">
          <thead class="bg-[#72a5e4]/30 border-b border-black text-[10px] font-bold uppercase text-black">
            <tr>
              <th class="px-6 py-3.5">EVENT</th>
              <th class="px-6 py-3.5">ORGANIZER</th>
              <th class="px-6 py-3.5">TANGGAL</th>
              <th class="px-6 py-3.5">STATUS PUBLIKASI</th>
              <th class="px-6 py-3.5 text-right">AKSI MODERASI</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-black/10">
            <tr v-for="evt in store.events" :key="evt.id" class="hover:bg-white">
              <td class="px-6 py-4 font-bold text-black">{{ evt.title }}</td>
              <td class="px-6 py-4 text-slate-600">{{ evt.organization?.name || evt.organization_name }}</td>
              <td class="px-6 py-4 text-slate-600">{{ formatDate(evt.start_at || evt.start_date) }}</td>
              <td class="px-6 py-4">
                <span
                  class="rounded-full border border-black px-3 py-0.5 text-[10px] font-bold"
                  :class="evt.publication_status === 'Published' ? 'bg-[#72a5e4] text-black' : 'bg-white text-black'"
                >
                  {{ evt.publication_status }}
                </span>
              </td>
              <td class="px-6 py-4 text-right space-x-1.5 whitespace-nowrap">
                <button
                  @click="moderate(evt, 'approve')"
                  class="rounded-full border border-black bg-[#72a5e4] px-3 py-1 text-xs font-bold text-black hover:bg-[#5c93d9]"
                >
                  ✓ Approve
                </button>
                <button
                  @click="moderate(evt, 'request-revision')"
                  class="rounded-full border border-black bg-amber-100 px-3 py-1 text-xs font-semibold text-black hover:bg-amber-200"
                >
                  Revisi
                </button>
                <button
                  @click="moderate(evt, 'reject')"
                  class="rounded-full border border-black bg-white px-3 py-1 text-xs font-semibold text-black hover:bg-rose-50"
                >
                  ✕ Reject
                </button>
                <button
                  @click="moderate(evt, 'suspend')"
                  class="rounded-full bg-black px-3 py-1 text-xs font-bold text-white hover:bg-slate-800"
                >
                  Suspend
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

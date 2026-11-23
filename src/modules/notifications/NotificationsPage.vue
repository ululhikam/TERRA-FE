<script setup>
import { onMounted, ref } from 'vue'
import { useEventWorkspaceStore } from '@/stores/eventWorkspace'
import { useToastStore } from '@/stores/toast'
import { formatDateTime } from '@/utils/formatters'
import { Bell, CheckCircle2 } from 'lucide-vue-next'

const store = useEventWorkspaceStore()
const toast = useToastStore()
const loading = ref(true)

onMounted(async () => {
  try {
    await store.fetchNotifications()
  } catch {
    // non-fatal
  } finally {
    loading.value = false
  }
})

async function handleMarkRead(item) {
  if (item.is_read) return
  try {
    await store.markNotificationRead(item.id)
    toast.success('Notifikasi ditandai sudah dibaca.')
  } catch (err) {
    toast.error(err?.message || 'Gagal menandai notifikasi.')
  }
}
</script>

<template>
  <div class="space-y-6 min-h-[calc(100vh-6rem)]">
    <div class="flex items-center justify-between gap-4">
      <div class="space-y-1">
        <span class="text-[9px] font-bold uppercase tracking-widest text-slate-500 block">INBOX STUDIO</span>
        <h1 class="text-3xl font-bold tracking-tight text-black font-sans">Notifikasi</h1>
        <p class="text-xs text-slate-600">Pembaruan moderasi event, verifikasi organisasi, dan transaksi tiket.</p>
      </div>
    </div>

    <div v-if="loading" class="text-xs text-slate-500 py-8">Memuat notifikasi...</div>

    <div v-else-if="store.notifications.length" class="space-y-3">
      <div
        v-for="item in store.notifications"
        :key="item.id"
        class="rounded-2xl border border-black p-5 flex items-start justify-between gap-4 transition-colors"
        :class="item.is_read ? 'bg-[#fafaf9]' : 'bg-[#72a5e4]/20'"
      >
        <div class="flex items-start gap-3">
          <div class="h-9 w-9 rounded-xl border border-black bg-white flex items-center justify-center shrink-0">
            <Bell class="h-4 w-4 text-black" />
          </div>
          <div class="space-y-1">
            <div class="flex items-center gap-2">
              <h3 class="text-sm font-bold text-black">{{ item.title }}</h3>
              <span
                v-if="!item.is_read"
                class="rounded-full border border-black bg-[#72a5e4] px-2 py-0.5 text-[9px] font-bold text-black uppercase"
              >
                Baru
              </span>
            </div>
            <p class="text-xs text-slate-700 leading-relaxed">{{ item.message }}</p>
            <p class="text-[10px] font-mono text-slate-500">{{ formatDateTime(item.created_at) }}</p>
          </div>
        </div>

        <button
          v-if="!item.is_read"
          @click="handleMarkRead(item)"
          class="inline-flex items-center gap-1 rounded-full border border-black bg-white px-3.5 py-1.5 text-xs font-bold text-black hover:bg-black hover:text-white shrink-0 transition-colors cursor-pointer"
        >
          <CheckCircle2 class="h-3.5 w-3.5" />
          <span>Tandai Dibaca</span>
        </button>
      </div>
    </div>

    <div v-else class="rounded-2xl border border-black bg-white p-10 text-center space-y-2">
      <h3 class="text-sm font-bold text-black">Belum Ada Notifikasi</h3>
      <p class="text-xs text-slate-500">Semua pembaruan penting dari Admin dan sistem akan muncul di sini.</p>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useEventWorkspaceStore } from '@/stores/eventWorkspace'
import { formatDateTime } from '@/utils/formatters'
import { History, RefreshCw } from 'lucide-vue-next'

const route = useRoute()
const store = useEventWorkspaceStore()
const eventId = computed(() => route.params.eventId || store.activeEvent?.id)
const loading = ref(true)

async function loadLogs() {
  if (!eventId.value) return
  loading.value = true
  try {
    await store.fetchEventActivityLogs(eventId.value)
  } finally {
    loading.value = false
  }
}

onMounted(loadLogs)
</script>

<template>
  <div class="space-y-6 min-h-[calc(100vh-6rem)]">
    <div class="flex items-center justify-between gap-4">
      <div class="space-y-1">
        <span class="text-[10px] font-bold uppercase tracking-wider text-slate-500">AUDIT TRAIL</span>
        <h1 class="text-3xl font-bold tracking-tight text-black font-sans">Log Aktivitas Event</h1>
        <p class="text-xs text-slate-600">Rekaman perubahan profil, aktivasi modul, verifikasi pembayaran, dan aksi tim.</p>
      </div>
      <button
        @click="loadLogs"
        class="inline-flex items-center gap-1.5 rounded-full border border-black bg-white px-4 py-2 text-xs font-bold text-black hover:bg-slate-100"
      >
        <RefreshCw class="h-3.5 w-3.5" /> Muat Ulang
      </button>
    </div>

    <div class="rounded-2xl border border-black bg-white overflow-hidden">
      <div v-if="loading" class="p-8 text-center text-xs text-slate-500">Memuat log aktivitas...</div>
      <div v-else-if="store.eventActivityLogs.length" class="divide-y divide-black/10">
        <div v-for="log in store.eventActivityLogs" :key="log.id" class="p-4 flex items-start justify-between gap-4 text-xs hover:bg-[#fafaf9]">
          <div class="flex items-start gap-3">
            <div class="h-8 w-8 rounded-lg border border-black bg-[#72a5e4]/30 flex items-center justify-center shrink-0">
              <History class="h-3.5 w-3.5 text-black" />
            </div>
            <div class="space-y-0.5">
              <p class="font-bold text-black">
                <span class="font-mono bg-slate-100 border border-black/20 px-2 py-0.5 rounded mr-1.5">{{ log.action }}</span>
                <span class="text-slate-600">{{ log.entity_type }}</span>
              </p>
              <p v-if="log.metadata && Object.keys(log.metadata).length" class="text-[11px] font-mono text-slate-500">
                {{ JSON.stringify(log.metadata) }}
              </p>
            </div>
          </div>
          <span class="text-[11px] font-mono text-slate-500 shrink-0">{{ formatDateTime(log.created_at) }}</span>
        </div>
      </div>
      <div v-else class="p-8 text-center text-xs text-slate-500">Belum ada aktivitas tercatat untuk event ini.</div>
    </div>
  </div>
</template>

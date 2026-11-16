<script setup>
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useEventWorkspaceStore } from '@/stores/eventWorkspace'
import { useToastStore } from '@/stores/toast'
import { MODULE_CATALOG } from '@/services/mockData'

const route = useRoute()
const store = useEventWorkspaceStore()
const toast = useToastStore()

const showAll = ref(false)

const event = computed(() => store.events.find((e) => e.id === route.params.eventId) || store.activeEvent)

const activeCount = computed(() => event.value?.enabled_modules.length || 0)

const displayedModules = computed(() => {
  if (showAll.value) return MODULE_CATALOG
  return MODULE_CATALOG.slice(0, 9)
})

async function handleToggle(moduleKey) {
  const res = await store.toggleModule(event.value.id, moduleKey)
  if (res.ok) {
    toast.success(res.message)
  } else {
    toast.warning(res.message)
  }
}

function getDepLabel(mod) {
  if (mod.required) return 'Modul wajib'
  const dep = mod.dependencies?.[0] || 'event_profile'
  return `Dependensi: ${dep}`
}
</script>

<template>
  <div v-if="event" class="space-y-6 min-h-[calc(100vh-6rem)]">
    <!-- Header -->
    <div class="space-y-1">
      <div class="flex items-center gap-3">
        <span class="text-[9px] font-bold uppercase tracking-wider text-slate-500">
          MODULAR ENGINE
        </span>
        <span class="rounded-full border border-black bg-[#72a5e4] px-4 py-0.5 text-[10px] font-bold text-black">
          {{ activeCount }} / 13 Modul Aktif
        </span>
      </div>
      <h1 class="text-3xl font-bold tracking-tight text-black font-sans pt-1">
        Module Configuration
      </h1>
      <p class="text-xs text-slate-500">
        Nyalakan modul yang dibutuhkan untuk mengaktifkan fitur dan endpoint API yang relevan.
      </p>
    </div>

    <!-- Prinsip Data Preservation Callout -->
    <div class="rounded-xl border border-black bg-[#72a5e4]/20 p-5 space-y-1.5 text-black">
      <h3 class="text-[10px] font-bold tracking-wider uppercase text-black">
        PRINSIP DATA PRESERVATION
      </h3>
      <p class="text-xs text-slate-800 leading-relaxed">
        Mematikan modul tidak akan menghapus data yang tersimpan di database. Jika modul dinyalakan kembali di masa depan, data Anda tetap utuh. Modul Participants dan Live QR Check-in memiliki dependensi langsung pada modul Ticketing.
      </p>
    </div>

    <!-- 3-Column Grid of Module Cards (100% Match to Screenshot 15) -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div
        v-for="mod in displayedModules"
        :key="mod.key"
        class="rounded-xl border border-black bg-[#fafaf9] p-5 space-y-4 flex flex-col justify-between"
      >
        <div class="space-y-2.5">
          <!-- Top Row: Name + Dependency on left, Toggle on right -->
          <div class="flex items-start justify-between gap-2">
            <div>
              <h4 class="text-sm font-bold text-black">{{ mod.name }}</h4>
              <p class="text-[10px] font-mono text-slate-500 mt-0.5">
                {{ getDepLabel(mod) }}
              </p>
            </div>

            <label class="relative inline-flex items-center cursor-pointer shrink-0">
              <input
                type="checkbox"
                :checked="event.enabled_modules.includes(mod.key)"
                :disabled="mod.required"
                @change="handleToggle(mod.key)"
                class="sr-only peer"
              />
              <div class="w-10 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-5 peer-checked:after:border-black after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-black after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#72a5e4] border border-black"></div>
            </label>
          </div>

          <p class="text-xs text-slate-600 leading-relaxed">
            {{ mod.description }}
          </p>
        </div>

        <!-- Bottom Status Row -->
        <div class="pt-3 border-t border-black/15 flex items-center justify-between text-[11px] font-bold">
          <span class="flex items-center gap-1.5 text-black">
            <span>●</span>
            <span>{{ event.enabled_modules.includes(mod.key) ? 'Modul Aktif' : 'Nonaktif' }}</span>
          </span>
          <span v-if="mod.required" class="text-[10px] font-bold uppercase text-slate-500">
            WAJIB
          </span>
        </div>
      </div>
    </div>

    <!-- Bottom Right Pill Button -->
    <div v-if="MODULE_CATALOG.length > 9" class="flex justify-end pt-2">
      <button
        @click="showAll = !showAll"
        class="rounded-full border border-black bg-[#fafaf9] px-8 py-2.5 text-xs font-bold text-black hover:bg-white transition-colors"
      >
        {{ showAll ? 'Tampilkan lebih sedikit ↑' : `Lihat ${MODULE_CATALOG.length - 9} modul lainnya ↓` }}
      </button>
    </div>
  </div>
</template>

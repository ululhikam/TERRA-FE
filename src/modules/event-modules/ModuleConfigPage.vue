<script setup>
import { computed, ref } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import { useEventWorkspaceStore } from '@/stores/eventWorkspace'
import { useToastStore } from '@/stores/toast'
import { MODULE_CATALOG } from '@/constants/modules'
import { Lock, Crown, ArrowUpRight } from 'lucide-vue-next'

const route = useRoute()
const store = useEventWorkspaceStore()
const toast = useToastStore()

const showAll = ref(true)

const event = computed(() => store.events.find((e) => e.id === route.params.eventId) || store.activeEvent)
const entitlement = computed(() => event.value?.entitlement || null)
const allowedSet = computed(() => {
  const arr = entitlement.value?.allowed_modules || []
  return arr.length ? new Set(arr) : null
})

const activeCount = computed(() => event.value?.enabled_modules.length || 0)

const displayedModules = computed(() => {
  if (showAll.value) return MODULE_CATALOG
  return MODULE_CATALOG.slice(0, 9)
})

function isModuleLocked(mod) {
  if (mod.isCore || mod.key === 'event_profile') return false
  if (!allowedSet.value) return false
  return !allowedSet.value.has(mod.key)
}

async function handleToggle(moduleKey) {
  const res = await store.toggleModule(event.value.id, moduleKey)
  if (res.ok) {
    toast.success(res.message)
  } else {
    toast.warning(res.message)
  }
}

function getDepLabel(mod) {
  if (mod.isCore) return 'Modul wajib'
  const dep = mod.dependsOn?.[0] || 'event_profile'
  return `Dependensi: ${dep}`
}
</script>

<template>
  <div v-if="event" class="space-y-6 min-h-[calc(100vh-6rem)]">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div class="space-y-1">
        <div class="flex flex-wrap items-center gap-2.5">
          <span class="text-[9px] font-bold uppercase tracking-wider text-slate-500">
            MODULAR ENGINE
          </span>
          <span class="rounded-full border border-black bg-[#72a5e4] px-4 py-0.5 text-[10px] font-bold text-black">
            {{ activeCount }} / 13 Modul Aktif
          </span>
          <span v-if="entitlement" class="inline-flex items-center gap-1 rounded-full border border-black bg-white px-3 py-0.5 text-[10px] font-bold text-black">
            <Crown class="h-3 w-3" /> Paket {{ entitlement.plan_name }}
          </span>
        </div>
        <h1 class="text-3xl font-bold tracking-tight text-black font-sans pt-1">
          Module Configuration
        </h1>
        <p class="text-xs text-slate-500">
          Nyalakan modul sesuai paket event Anda. Modul yang belum tersedia pada paket saat ini dapat dibuka dengan 14 Days Pro Trial atau Upgrade Paket.
        </p>
      </div>

      <RouterLink
        :to="`/dashboard/events/${event.id}/billing`"
        class="inline-flex items-center gap-1.5 rounded-full border border-black bg-black px-5 py-2.5 text-xs font-bold text-white hover:bg-slate-800 shrink-0"
      >
        <span>Kelola Paket &amp; Upgrade</span>
        <ArrowUpRight class="h-3.5 w-3.5" />
      </RouterLink>
    </div>

    <!-- Prinsip Data Preservation Callout -->
    <div class="rounded-xl border border-black bg-[#72a5e4]/20 p-5 space-y-1.5 text-black">
      <h3 class="text-[10px] font-bold tracking-wider uppercase text-black">
        PRINSIP DATA PRESERVATION &amp; ENTITLEMENTS
      </h3>
      <p class="text-xs text-slate-800 leading-relaxed">
        Mematikan modul atau berakhirnya masa trial tidak menghapus data di database. Jika modul dibuka kembali melalui upgrade, seluruh data Anda tetap utuh. Modul Participants dan Live QR Check-in membutuhkan modul Ticketing aktif.
      </p>
    </div>

    <!-- 3-Column Grid of Module Cards -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div
        v-for="mod in displayedModules"
        :key="mod.key"
        class="rounded-xl border border-black p-5 space-y-4 flex flex-col justify-between"
        :class="isModuleLocked(mod) ? 'bg-slate-100/80' : 'bg-[#fafaf9]'"
      >
        <div class="space-y-2.5">
          <div class="flex items-start justify-between gap-2">
            <div>
              <h4 class="text-sm font-bold text-black flex items-center gap-1.5">
                <span>{{ mod.name }}</span>
                <Lock v-if="isModuleLocked(mod)" class="h-3.5 w-3.5 text-amber-700" />
              </h4>
              <p class="text-[10px] font-mono text-slate-500 mt-0.5">
                {{ getDepLabel(mod) }}
              </p>
            </div>

            <RouterLink
              v-if="isModuleLocked(mod)"
              :to="`/dashboard/events/${event.id}/billing`"
              class="rounded-full border border-black bg-[#72a5e4] px-3 py-1 text-[10px] font-bold text-black hover:bg-[#5c93d9] shrink-0"
            >
              Upgrade
            </RouterLink>

            <label v-else class="relative inline-flex items-center cursor-pointer shrink-0">
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

        <div class="pt-3 border-t border-black/15 flex items-center justify-between text-[11px] font-bold">
          <span v-if="isModuleLocked(mod)" class="inline-flex items-center gap-1 text-amber-800">
            <Lock class="h-3 w-3" /> Membutuhkan Upgrade Paket
          </span>
          <span v-else class="flex items-center gap-1.5 text-black">
            <span>●</span>
            <span>{{ event.enabled_modules.includes(mod.key) ? 'Modul Aktif' : 'Nonaktif' }}</span>
          </span>
          <span v-if="mod.required" class="text-[10px] font-bold uppercase text-slate-500">
            WAJIB
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

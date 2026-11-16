<script setup>
import { useToastStore } from '@/stores/toast'
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-vue-next'

const toastStore = useToastStore()
</script>

<template>
  <div class="fixed right-4 bottom-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
    <TransitionGroup name="toast">
      <div
        v-for="t in toastStore.toasts"
        :key="t.id"
        class="pointer-events-auto flex items-start gap-3 rounded-xl border px-4 py-3 shadow-lg bg-white"
        :class="{
          'border-emerald-200 text-emerald-900': t.type === 'success',
          'border-rose-200 text-rose-900': t.type === 'error',
          'border-amber-200 text-amber-900': t.type === 'warning',
          'border-slate-200 text-slate-900': t.type === 'info'
        }"
      >
        <CheckCircle2 v-if="t.type === 'success'" class="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
        <AlertCircle v-else-if="t.type === 'error' || t.type === 'warning'" class="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
        <Info v-else class="h-5 w-5 text-indigo-600 shrink-0 mt-0.5" />
        <p class="text-sm font-medium flex-1">{{ t.message }}</p>
        <button @click="toastStore.remove(t.id)" class="text-slate-400 hover:text-slate-600">
          <X class="h-4 w-4" />
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>

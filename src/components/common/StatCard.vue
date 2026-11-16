<script setup>
defineProps({
  label: { type: String, required: true },
  value: { type: [String, Number], required: true },
  hint: { type: String, default: '' },
  trend: { type: String, default: '' }, // e.g. '+12%'
  trendUp: { type: Boolean, default: true }
})
</script>

<template>
  <div class="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition-all duration-300 hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md">
    <!-- Top subtle accent bar on hover -->
    <div class="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-indigo-500 to-indigo-600 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
    
    <div class="flex items-start justify-between">
      <p class="text-xs font-semibold uppercase tracking-wider text-slate-500">{{ label }}</p>
      <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 transition-colors group-hover:bg-indigo-600 group-hover:text-white">
        <slot name="icon" />
      </div>
    </div>

    <div class="mt-3 flex items-baseline gap-2">
      <span class="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">{{ value }}</span>
      <span
        v-if="trend"
        class="inline-flex items-center text-xs font-bold"
        :class="trendUp ? 'text-emerald-600' : 'text-rose-600'"
      >
        {{ trend }}
      </span>
    </div>

    <p v-if="hint" class="mt-1.5 text-xs text-slate-500 truncate font-medium flex items-center gap-1">
      {{ hint }}
    </p>
  </div>
</template>

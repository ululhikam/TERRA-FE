<script setup>
import { computed } from 'vue'

const props = defineProps({
  status: {
    type: String,
    required: true
  },
  size: {
    type: String,
    default: 'md' // 'sm' | 'md'
  }
})

const config = computed(() => {
  const s = (props.status || '').toLowerCase()
  if (['published', 'approved', 'on sale', 'active', 'confirmed', 'verified', 'done', 'success'].includes(s)) {
    return {
      bg: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
      dot: 'bg-emerald-500 animate-pulse'
    }
  }
  if (['pending review', 'pending', 'in progress', 'scheduled', 'preparation'].includes(s)) {
    return {
      bg: 'bg-amber-50 text-amber-700 border-amber-200/80',
      dot: 'bg-amber-500'
    }
  }
  if (['rejected', 'cancelled', 'suspended', 'sold out', 'disabled', 'failed'].includes(s)) {
    return {
      bg: 'bg-rose-50 text-rose-700 border-rose-200/80',
      dot: 'bg-rose-500'
    }
  }
  if (['used', 'completed', 'review', 'hybrid'].includes(s)) {
    return {
      bg: 'bg-indigo-50 text-indigo-700 border-indigo-200/80',
      dot: 'bg-indigo-500'
    }
  }
  return {
    bg: 'bg-slate-50 text-slate-700 border-slate-200',
    dot: 'bg-slate-400'
  }
})
</script>

<template>
  <span
    :class="[
      config.bg,
      size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs'
    ]"
    class="inline-flex items-center gap-1.5 rounded-full font-semibold border shadow-xs transition-all tracking-tight"
  >
    <span :class="config.dot" class="h-1.5 w-1.5 rounded-full shrink-0" />
    <span>{{ status }}</span>
  </span>
</template>

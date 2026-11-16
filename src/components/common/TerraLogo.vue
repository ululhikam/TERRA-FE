<script setup>
defineProps({
  size: {
    type: String,
    default: 'md'
  },
  showText: {
    type: Boolean,
    default: true
  },
  imgClass: {
    type: String,
    default: ''
  },
  textClass: {
    type: String,
    default: ''
  }
})

const iconSizeMap = {
  sm: 'h-7 w-7',
  md: 'h-8 w-8',
  lg: 'h-10 w-10',
  xl: 'h-12 w-12 sm:h-14 sm:w-14'
}

const textSizeMap = {
  sm: 'text-xl',
  md: 'text-2xl',
  lg: 'text-3xl',
  xl: 'text-5xl sm:text-6xl tracking-tighter'
}
</script>

<template>
  <span class="inline-flex items-center gap-2.5 select-none">
    <img
      src="/terra-logo.png"
      alt="TERRA Logo"
      :class="[iconSizeMap[size] || iconSizeMap.md, 'object-contain shrink-0', imgClass]"
    />
    <span
      v-if="showText"
      :class="[
        textSizeMap[size] || textSizeMap.md,
        'font-black tracking-tight text-black font-sans leading-none',
        textClass
      ]"
    >
      TERRA
    </span>
  </span>
</template>

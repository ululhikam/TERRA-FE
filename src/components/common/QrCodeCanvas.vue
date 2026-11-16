<script setup>
import { ref, onMounted, watch } from 'vue'
import QRCode from 'qrcode'

const props = defineProps({
  value: { type: String, required: true },
  size: { type: Number, default: 160 }
})

const dataUrl = ref('')

async function generate() {
  if (!props.value) return
  dataUrl.value = await QRCode.toDataURL(props.value, {
    width: props.size,
    margin: 1,
    color: { dark: '#0f172a', light: '#ffffff' }
  })
}

onMounted(generate)
watch(() => props.value, generate)
</script>

<template>
  <img v-if="dataUrl" :src="dataUrl" :width="size" :height="size" alt="Ticket QR Code" class="rounded-lg border border-slate-200 bg-white p-1.5" />
</template>

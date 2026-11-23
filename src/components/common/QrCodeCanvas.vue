<script setup>
import { ref, onMounted, watch } from 'vue'
import { generateTicketQrDataUrl } from '@/utils/qrCode'

const props = defineProps({
  value: { type: String, required: true },
  size: { type: Number, default: 160 }
})

const dataUrl = ref('')

async function generate() {
  if (!props.value) {
    dataUrl.value = ''
    return
  }
  try {
    dataUrl.value = await generateTicketQrDataUrl(props.value, {
      width: props.size,
      margin: 1
    })
  } catch {
    dataUrl.value = ''
  }
}

onMounted(generate)
watch(() => [props.value, props.size], generate)
</script>

<template>
  <img
    v-if="dataUrl"
    :src="dataUrl"
    :width="size"
    :height="size"
    alt="Ticket QR Code"
    class="rounded-lg border border-slate-200 bg-white p-1.5"
  />
</template>

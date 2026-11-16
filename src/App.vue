<script setup>
import { onMounted, watch } from 'vue'
import { RouterView } from 'vue-router'
import ToastContainer from '@/components/common/ToastContainer.vue'
import { useEventWorkspaceStore } from '@/stores/eventWorkspace'
import { useAuthStore } from '@/stores/auth'

const store = useEventWorkspaceStore()
const authStore = useAuthStore()

async function hydrateData() {
  await Promise.all([
    store.checkBackendHealth(),
    store.fetchMarketplace()
  ])
  if (authStore.isOrganizer || authStore.isAdmin) {
    await store.fetchOrganizerWorkspace()
  }
  if (authStore.isAuthenticated) {
    await store.fetchMyTickets()
  }
}

onMounted(hydrateData)
watch(() => authStore.isAuthenticated, (authed) => {
  if (authed) hydrateData()
})
</script>

<template>
  <RouterView />
  <ToastContainer />
</template>

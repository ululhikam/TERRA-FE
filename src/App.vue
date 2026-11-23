<script setup>
import { onMounted, watch } from 'vue'
import { RouterView } from 'vue-router'
import ToastContainer from '@/components/common/ToastContainer.vue'
import { useEventWorkspaceStore } from '@/stores/eventWorkspace'
import { useAuthStore } from '@/stores/auth'

const store = useEventWorkspaceStore()
const authStore = useAuthStore()

async function hydrateData() {
  try {
    await Promise.all([
      store.checkBackendHealth(),
      store.fetchMarketplace()
    ])
  } catch {
    // Handled via apiConnected state
  }

  if (authStore.isAdmin) {
    await store.fetchAdminWorkspace().catch(() => {})
  } else if (authStore.isOrganizer) {
    await store.fetchOrganizerWorkspace().catch(() => {})
  }

  if (authStore.isAuthenticated) {
    await store.fetchMyTickets().catch(() => {})
  }
}

onMounted(hydrateData)
watch(
  () => authStore.isAuthenticated,
  (authed) => {
    if (authed) {
      hydrateData()
    } else {
      store.myTickets = []
      store.fetchMarketplace().catch(() => {})
    }
  }
)
</script>

<template>
  <RouterView />
  <ToastContainer />
</template>

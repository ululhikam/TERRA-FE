<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import { useEventWorkspaceStore } from '@/stores/eventWorkspace'
import api from '@/services/api'
import { formatDate } from '@/utils/formatters'
import {
  updatePageSeo,
  buildOrganizerJsonLd,
  buildBreadcrumbJsonLd,
  DEFAULT_OG_IMAGE
} from '@/utils/seo'
import { ArrowUpRight } from 'lucide-vue-next'

const route = useRoute()
const store = useEventWorkspaceStore()
const fetchedOrg = ref(null)

async function loadOrganizer(slug) {
  if (!slug) return
  try {
    const res = await api.get(`/marketplace/organizers/${encodeURIComponent(slug)}`)
    if (res?.data) fetchedOrg.value = res.data
  } catch {
    fetchedOrg.value = null
  }
}

onMounted(() => {
  loadOrganizer(route.params.slug)
})

watch(
  () => route.params.slug,
  (slug) => {
    if (slug) loadOrganizer(slug)
  }
)

const organization = computed(
  () =>
    (fetchedOrg.value && fetchedOrg.value.slug === route.params.slug ? fetchedOrg.value : null) ||
    store.organizations.find((o) => o.slug === route.params.slug) ||
    store.organizations[0]
)

const orgEvents = computed(() => {
  if (Array.isArray(organization.value?.events) && organization.value.events.length > 0) {
    return organization.value.events.filter((e) => e.publication_status === 'Published')
  }
  return store.events.filter(
    (e) => (e.organization_id === organization.value?.id || !e.organization_id) && e.publication_status === 'Published'
  )
})

watch(
  [organization, orgEvents],
  ([org, events]) => {
    if (!org?.name) return
    const orgSlug = org.slug || route.params.slug
    const orgPath = `/organizers/${orgSlug}`
    updatePageSeo({
      title: `${org.name} — Event Organizer Terverifikasi | TERRA`,
      description:
        org.description ||
        `Profil penyelenggara event terverifikasi ${org.name} beserta daftar acara resmi di TERRA.`,
      path: orgPath,
      image: org.logo_url || org.cover_url || DEFAULT_OG_IMAGE,
      imageAlt: org.name,
      jsonLd: [
        buildOrganizerJsonLd(org, events),
        buildBreadcrumbJsonLd([
          { name: 'Beranda', path: '/' },
          { name: org.name, path: orgPath }
        ])
      ]
    })
  },
  { immediate: true }
)
</script>

<template>
  <div v-if="organization" class="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8 space-y-8 min-h-[calc(100vh-14rem)]">
    <!-- Unified Cover + Blue Profile Header Card -->
    <div class="rounded-2xl border border-black overflow-hidden bg-[#72a5e4]">
      <div class="h-44 sm:h-52 w-full bg-black border-b border-black overflow-hidden">
        <img
          :src="organization.cover_url || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1400&q=80'"
          :alt="organization.name"
          class="w-full h-full object-cover"
        />
      </div>

      <div class="p-6 sm:p-7 flex flex-col sm:flex-row items-start justify-between gap-5 text-black">
        <div class="flex items-start gap-5">
          <img
            :src="organization.logo_url"
            :alt="organization.name"
            class="h-16 w-16 sm:h-20 sm:w-20 rounded-xl border border-black object-cover shrink-0 bg-white"
          />
          <div class="space-y-1.5">
            <h1 class="text-2xl font-bold tracking-tight text-black font-sans">
              {{ organization.name }}
            </h1>
            <p class="text-xs sm:text-sm font-editorial text-slate-900">
              {{ organization.description }}
            </p>
            <div class="pt-1 flex flex-wrap gap-3 text-[11px] text-slate-900">
              <span>{{ organization.email || '-' }}</span>
              <span v-if="organization.website">•</span>
              <span v-if="organization.website">{{ organization.website }}</span>
            </div>
          </div>
        </div>

        <span class="rounded-full border border-black bg-white px-5 py-1 text-xs font-bold text-black shrink-0">
          ✓ Verified
        </span>
      </div>
    </div>

    <!-- Event oleh Organization Section -->
    <div class="space-y-4">
      <h2 class="text-xl font-bold tracking-tight text-black font-sans">
        Event oleh {{ organization.name }}
      </h2>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <RouterLink
          v-for="evt in orgEvents"
          :key="evt.id"
          :to="`/events/${evt.slug || evt.id}`"
          class="group rounded-xl border border-black bg-[#fafaf9] overflow-hidden flex flex-col justify-between hover:bg-white transition-colors"
        >
          <div class="aspect-video bg-black overflow-hidden border-b border-black">
            <img
              :src="evt.poster_url"
              :alt="evt.title"
              class="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
            />
          </div>

          <div class="p-5 space-y-4">
            <h3 class="text-base font-bold text-black group-hover:underline leading-snug">
              {{ evt.title }}
            </h3>
            <div class="flex items-center justify-between text-xs text-slate-500">
              <span>{{ formatDate(evt.start_date || evt.start_at) }}</span>
              <ArrowUpRight class="h-4 w-4 text-black" />
            </div>
          </div>
        </RouterLink>
      </div>
    </div>
  </div>
</template>

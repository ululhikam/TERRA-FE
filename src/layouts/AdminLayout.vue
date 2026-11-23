<script setup>
import { onMounted } from 'vue'
import { RouterLink, RouterView, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useEventWorkspaceStore } from '@/stores/eventWorkspace'
import TerraLogo from '@/components/common/TerraLogo.vue'
import {
  ShieldCheck,
  LayoutDashboard,
  FileCheck2,
  Building2,
  Users,
  Store,
  LogOut
} from 'lucide-vue-next'

const authStore = useAuthStore()
const store = useEventWorkspaceStore()
const router = useRouter()

onMounted(() => {
  store.fetchAdminWorkspace().catch(() => {})
})

async function handleLogout() {
  await authStore.logout()
  router.push('/admin/login')
}
</script>

<template>
  <div class="min-h-screen flex bg-[#fafaf9] bg-grid-paper font-sans text-black selection:bg-[#72a5e4] selection:text-black">
    <!-- Admin Sidebar -->
    <aside class="w-64 border-r border-black bg-white flex flex-col justify-between shrink-0">
      <div>
        <div class="flex h-16 items-center justify-between border-b border-black px-6">
          <RouterLink to="/admin" class="flex flex-col items-start">
            <TerraLogo size="md" />
            <span class="mt-1 rounded-full border border-black bg-black text-white px-2 py-0.2 text-[9px] font-bold uppercase tracking-widest">
              Admin Console
            </span>
          </RouterLink>
        </div>

        <div class="p-4 space-y-1.5">
          <span class="px-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            SUPERVISION
          </span>
          <nav class="space-y-1">
            <RouterLink
              to="/admin"
              exact-active-class="bg-[#72a5e4] border border-black text-black font-semibold"
              class="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs text-slate-800 hover:bg-slate-100 transition-colors"
            >
              <LayoutDashboard class="h-4 w-4 shrink-0 text-black" />
              <span>Admin Dashboard</span>
            </RouterLink>
            <RouterLink
              to="/admin/moderation"
              active-class="bg-[#72a5e4] border border-black text-black font-semibold"
              class="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs text-slate-800 hover:bg-slate-100 transition-colors"
            >
              <FileCheck2 class="h-4 w-4 shrink-0 text-black" />
              <span>Event Moderation</span>
            </RouterLink>
            <RouterLink
              to="/admin/verifications"
              active-class="bg-[#72a5e4] border border-black text-black font-semibold"
              class="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs text-slate-800 hover:bg-slate-100 transition-colors"
            >
              <Building2 class="h-4 w-4 shrink-0 text-black" />
              <span>Organizer Verification</span>
            </RouterLink>
            <RouterLink
              to="/admin/users-categories"
              active-class="bg-[#72a5e4] border border-black text-black font-semibold"
              class="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs text-slate-800 hover:bg-slate-100 transition-colors"
            >
              <Users class="h-4 w-4 shrink-0 text-black" />
              <span>Users &amp; Categories</span>
            </RouterLink>
            <RouterLink
              to="/admin/pricing"
              active-class="bg-[#72a5e4] border border-black text-black font-semibold"
              class="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs text-slate-800 hover:bg-slate-100 transition-colors"
            >
              <ShieldCheck class="h-4 w-4 shrink-0 text-black" />
              <span>Pricing &amp; Verifikasi</span>
            </RouterLink>
            <RouterLink
              to="/admin/reports-orders"
              active-class="bg-[#72a5e4] border border-black text-black font-semibold"
              class="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs text-slate-800 hover:bg-slate-100 transition-colors"
            >
              <Store class="h-4 w-4 shrink-0 text-black" />
              <span>Reports &amp; Orders</span>
            </RouterLink>
          </nav>
        </div>
      </div>

      <div class="border-t border-black p-4 space-y-2 bg-white">
        <RouterLink
          to="/"
          class="flex items-center justify-between rounded-full border border-black bg-white px-4 py-2 text-xs font-semibold text-black hover:bg-slate-100 transition-colors"
        >
          <span>Marketplace Publik</span>
          <span>↗</span>
        </RouterLink>
        <button
          @click="handleLogout"
          class="w-full rounded-full border border-black bg-white py-2 text-xs font-semibold text-slate-700 hover:bg-rose-50 hover:text-rose-600 transition-colors"
        >
          Keluar Admin
        </button>
      </div>
    </aside>

    <!-- Main Viewport -->
    <div class="flex-1 flex flex-col min-h-screen">
      <!-- Admin Header -->
      <header class="h-16 border-b border-black bg-[#fafaf9]/95 px-8 flex items-center justify-between">
        <div class="text-xs font-semibold text-slate-600">
          TERRA Platform Operations &amp; Moderation
        </div>
        <div class="flex items-center gap-3">
          <span class="rounded-full border border-black bg-white px-3 py-1 text-xs font-semibold">
            Admin: {{ authStore.user?.full_name || 'System Administrator' }}
          </span>
        </div>
      </header>

      <main class="flex-1 p-6 sm:p-8 max-w-7xl w-full mx-auto">
        <RouterView />
      </main>
    </div>
  </div>
</template>

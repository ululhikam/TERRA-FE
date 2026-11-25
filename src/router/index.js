import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useEventWorkspaceStore } from '@/stores/eventWorkspace'
import { updatePageSeo } from '@/utils/seo'

import PublicLayout from '@/layouts/PublicLayout.vue'
import DashboardLayout from '@/layouts/DashboardLayout.vue'
import AdminLayout from '@/layouts/AdminLayout.vue'

const routes = [
  // Public Marketplace & Customer Routes
  {
    path: '/',
    component: PublicLayout,
    children: [
      {
        path: '',
        name: 'home',
        component: () => import('@/modules/marketplace/HomePage.vue'),
        meta: {
          seo: {
            title: 'TERRA — Beli Tiket Event, Konser, Festival Kampus & Manajemen Kepanitiaan',
            description:
              'Platform tiket event resmi & ruang kerja kepanitiaan modular di Indonesia. Temukan konser, festival kampus, seminar, dan workshop dengan e-ticket QR instan di terra.concern.web.id.'
          }
        }
      },
      {
        path: 'events',
        name: 'explore',
        component: () => import('@/modules/marketplace/ExploreEventsPage.vue'),
        meta: {
          seo: {
            title: 'Jelajahi Event, Konser, Seminar & Festival Kampus | TERRA',
            description:
              'Cari dan beli tiket resmi konser, festival kampus, seminar teknologi, dan workshop terbaru di seluruh Indonesia lewat TERRA.'
          }
        }
      },
      {
        path: 'events/:slug',
        name: 'event-detail',
        component: () => import('@/modules/marketplace/EventDetailPage.vue'),
        meta: {
          seo: {
            title: 'Detail Event & Tiket Resmi | TERRA',
            description: 'Informasi jadwal, lokasi, dan pemesanan tiket QR resmi di TERRA.'
          }
        }
      },
      {
        path: 'pricing',
        name: 'pricing',
        component: () => import('@/modules/marketplace/PricingPage.vue'),
        meta: {
          seo: {
            title: 'Harga Langganan TERRA Studio Rp 50.000 / Bulan | TERRA',
            description:
              'Langganan TERRA Studio Rp 50.000/bulan via Midtrans untuk akses penuh seluruh 13 modul manajemen event, ticketing QR, dan Live Gate Scanner.'
          }
        }
      },
      {
        path: 'organizers/:slug',
        name: 'organizer-profile',
        component: () => import('@/modules/marketplace/OrganizerProfilePage.vue'),
        meta: {
          seo: {
            title: 'Profil Event Organizer Terverifikasi | TERRA',
            description: 'Lihat profil penyelenggara event terverifikasi dan daftar acara resmi di TERRA.'
          }
        }
      },
      { path: 'checkout/:eventSlug', name: 'checkout', component: () => import('@/modules/marketplace/CheckoutPage.vue'), meta: { requiresAuth: true, allowedRoles: ['customer', 'organizer', 'admin'] } },
      { path: 'my-tickets', name: 'my-tickets', component: () => import('@/modules/marketplace/MyTicketsPage.vue'), meta: { requiresAuth: true, allowedRoles: ['customer', 'organizer', 'admin'] } },
      { path: 'profile', name: 'profile', component: () => import('@/modules/marketplace/ProfilePage.vue'), meta: { requiresAuth: true } },
      {
        path: 'login',
        name: 'login',
        component: () => import('@/modules/auth/LoginPage.vue'),
        meta: {
          seo: {
            title: 'Masuk Peserta & Pembeli Tiket | TERRA',
            description: 'Masuk ke akun peserta TERRA untuk mengelola tiket QR, pesanan, dan profil event Anda.'
          }
        }
      },
      {
        path: 'register',
        name: 'register',
        component: () => import('@/modules/auth/RegisterPage.vue'),
        meta: {
          seo: {
            title: 'Daftar Akun Peserta Event | TERRA',
            description: 'Buat akun peserta TERRA gratis untuk membeli tiket event dan menerima e-ticket QR instan.'
          }
        }
      },
      { path: 'forgot-password', name: 'forgot-password', component: () => import('@/modules/auth/ForgotPasswordPage.vue') },
      { path: 'reset-password', name: 'reset-password', component: () => import('@/modules/auth/ResetPasswordPage.vue') },
      { path: 'verify-otp', name: 'verify-otp', component: () => import('@/modules/auth/VerifyOtpPage.vue') },
      { path: 'auth/callback', name: 'oauth-callback', component: () => import('@/modules/auth/OAuthCallbackPage.vue') }
    ]
  },

  // Team Invitation Acceptance (Standalone Organizer Portal Flow)
  { path: '/accept-invite', name: 'accept-invite', component: () => import('@/modules/auth/AcceptInvitePage.vue') },

  // Dedicated Organizer Auth Portal
  {
    path: '/organizer/login',
    name: 'organizer-login',
    component: () => import('@/modules/auth/OrganizerLoginPage.vue'),
    meta: {
      seo: {
        title: 'Masuk Portal Event Organizer | TERRA',
        description: 'Masuk ke dashboard Event Organizer TERRA untuk mengelola acara, tiket, gate scanner, dan keuangan kepanitiaan.'
      }
    }
  },
  {
    path: '/organizer/register',
    name: 'organizer-register',
    component: () => import('@/modules/auth/OrganizerRegisterPage.vue'),
    meta: {
      seo: {
        title: 'Daftar Event Organizer — Langganan Rp 50.000 / Bulan | TERRA',
        description: 'Daftar sebagai Event Organizer TERRA dengan Google OAuth atau email dan aktifkan langganan Rp 50.000/bulan via Midtrans.'
      }
    }
  },

  // Dedicated Platform Admin Auth Portal
  { path: '/admin/login', name: 'admin-login', component: () => import('@/modules/auth/AdminLoginPage.vue') },

  // Organizer Dashboard & Event Workspace
  {
    path: '/dashboard',
    component: DashboardLayout,
    meta: { requiresAuth: true, allowedRoles: ['organizer'], loginRoute: 'organizer-login' },
    children: [
      { path: '', name: 'dashboard-overview', component: () => import('@/modules/organizations/DashboardOverviewPage.vue') },
      { path: 'organizations', name: 'dashboard-organizations', component: () => import('@/modules/organizations/OrganizationsPage.vue') },
      { path: 'billing', name: 'dashboard-billing', component: () => import('@/modules/organizations/BillingHistoryPage.vue') },
      { path: 'notifications', name: 'dashboard-notifications', component: () => import('@/modules/notifications/NotificationsPage.vue') },
      { path: 'events', name: 'dashboard-events', component: () => import('@/modules/events/MyEventsPage.vue') },
      { path: 'events/create', name: 'dashboard-events-create', component: () => import('@/modules/events/CreateEventPage.vue') },
      { path: 'events/:eventId', name: 'event-workspace', component: () => import('@/modules/events/EventWorkspaceOverviewPage.vue') },
      { path: 'events/:eventId/profile', name: 'event-profile', component: () => import('@/modules/events/EventProfilePage.vue'), meta: { permission: 'Edit Event' } },
      { path: 'events/:eventId/modules', name: 'event-modules', component: () => import('@/modules/event-modules/ModuleConfigPage.vue'), meta: { permission: 'Edit Event' } },
      { path: 'events/:eventId/billing', name: 'event-billing', component: () => import('@/modules/events/EventBillingPage.vue'), meta: { permission: 'Edit Event' } },
      { path: 'events/:eventId/timeline', name: 'event-timeline', component: () => import('@/modules/events/TimelinePage.vue'), meta: { moduleKey: 'timeline', permission: 'Manage Timeline', fullBleed: true } },
      { path: 'events/:eventId/tasks', name: 'event-tasks', component: () => import('@/modules/events/TasksPage.vue'), meta: { moduleKey: 'tasks', permission: 'Manage Timeline' } },
      { path: 'events/:eventId/team', name: 'event-team', component: () => import('@/modules/team/TeamPage.vue'), meta: { moduleKey: 'team', permission: 'Manage Team' } },
      { path: 'events/:eventId/tickets', name: 'event-tickets', component: () => import('@/modules/ticketing/TicketTypesPage.vue'), meta: { moduleKey: 'ticketing', permission: 'Manage Tickets' } },
      { path: 'events/:eventId/orders', name: 'event-orders', component: () => import('@/modules/ticketing/EventOrdersPage.vue'), meta: { moduleKey: 'ticketing', permission: 'Manage Tickets' } },
      { path: 'events/:eventId/participants', name: 'event-participants', component: () => import('@/modules/participants/ParticipantsPage.vue'), meta: { moduleKey: 'participants', permission: 'View Participants' } },
      { path: 'events/:eventId/check-in', name: 'event-checkin', component: () => import('@/modules/check-in/CheckInPage.vue'), meta: { moduleKey: 'check_in', permission: 'Manage Check-in' } },
      { path: 'events/:eventId/finance', name: 'event-finance', component: () => import('@/modules/finance/FinancePage.vue'), meta: { moduleKey: 'finance', permission: 'View Finance' } },
      { path: 'events/:eventId/operations', name: 'event-operations', component: () => import('@/modules/events/OperationsPage.vue'), meta: { permission: 'View Event' } },
      { path: 'events/:eventId/reports', name: 'event-reports', component: () => import('@/modules/reports/ReportsPage.vue'), meta: { moduleKey: 'reports', permission: 'View Event' } },
      { path: 'events/:eventId/activity-logs', name: 'event-activity-logs', component: () => import('@/modules/events/EventActivityLogsPage.vue'), meta: { permission: 'View Event' } }
    ]
  },

  // Platform Admin Console
  {
    path: '/admin',
    component: AdminLayout,
    meta: { requiresAuth: true, allowedRoles: ['admin'], loginRoute: 'admin-login' },
    children: [
      { path: '', name: 'admin-dashboard', component: () => import('@/modules/admin/AdminDashboardPage.vue') },
      { path: 'moderation', name: 'admin-moderation', component: () => import('@/modules/admin/EventModerationPage.vue') },
      { path: 'verifications', name: 'admin-verifications', component: () => import('@/modules/admin/OrganizerVerificationPage.vue') },
      { path: 'users-categories', name: 'admin-users-categories', component: () => import('@/modules/admin/AdminUsersCategoriesPage.vue') },
      { path: 'pricing', name: 'admin-pricing', component: () => import('@/modules/admin/AdminPricingPage.vue') },
      { path: 'reports-orders', name: 'admin-reports-orders', component: () => import('@/modules/admin/AdminReportsOrdersPage.vue') }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to) {
    if (to.hash) {
      return { el: to.hash, behavior: 'smooth' }
    }
    return { top: 0, behavior: 'smooth' }
  }
})

router.beforeEach(async (to) => {
  const authStore = useAuthStore()

  // 1. Check authentication
  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    const loginRoute = to.meta.loginRoute || 'login'
    return { name: loginRoute, query: { redirect: to.fullPath } }
  }

  // 2. Check role isolation per portal
  if (to.meta.allowedRoles && authStore.user) {
    if (!to.meta.allowedRoles.includes(authStore.user.role)) {
      if (authStore.user.role === 'admin') return { name: 'admin-dashboard' }
      if (authStore.user.role === 'organizer') return { name: 'dashboard-overview' }
      return { name: 'home' }
    }
  }

  // 2b. Enforce Organizer monthly subscription lock across Studio routes (Pricing & Langganan stays accessible)
  if (to.path.startsWith('/dashboard') && authStore.isOrganizer) {
    if (!authStore.user?.subscription) {
      await authStore.fetchCurrentUser().catch(() => {})
    }
    if (to.name === 'event-billing') {
      return { name: 'dashboard-billing' }
    }
    if (!authStore.hasActiveSubscription && to.name !== 'dashboard-billing') {
      return { name: 'dashboard-billing', query: { locked: '1' } }
    }
  }

  // 3. Check active module & organizer-assigned permissions in Event Workspace
  if (to.params.eventId) {
    const workspace = useEventWorkspaceStore()
    const hasEventLoaded = workspace.events.some((e) => e.id === to.params.eventId)
    if (!hasEventLoaded) {
      try {
        await workspace.fetchEventWorkspace(to.params.eventId)
      } catch {
        // Proceed cleanly or let downstream fallback handle it
      }
    }
    if (to.meta.moduleKey && !workspace.isModuleEnabled(to.params.eventId, to.meta.moduleKey)) {
      return { name: 'event-modules', params: { eventId: to.params.eventId } }
    }
    if (to.meta.permission && !workspace.hasPermission(to.params.eventId, to.meta.permission)) {
      return { name: 'event-workspace', params: { eventId: to.params.eventId } }
    }
  }
})

const PRIVATE_ROUTE_NAMES = new Set([
  'forgot-password',
  'reset-password',
  'verify-otp',
  'oauth-callback',
  'accept-invite',
  'admin-login'
])

router.afterEach((to) => {
  const isPrivateRoute =
    Boolean(to.meta.requiresAuth) ||
    PRIVATE_ROUTE_NAMES.has(String(to.name || '')) ||
    to.path.startsWith('/dashboard') ||
    to.path.startsWith('/admin') ||
    to.path.startsWith('/checkout')

  if (to.name === 'event-detail' || to.name === 'organizer-profile') {
    updatePageSeo({
      title: to.meta?.seo?.title,
      description: to.meta?.seo?.description,
      path: to.path,
      noindex: false
    })
    return
  }

  updatePageSeo({
    title: to.meta?.seo?.title || (isPrivateRoute ? 'Workspace & Akun | TERRA' : undefined),
    description: to.meta?.seo?.description,
    path: to.path,
    noindex: isPrivateRoute
  })
})

export default router

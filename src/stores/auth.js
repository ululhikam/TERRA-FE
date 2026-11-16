import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '@/services/api'

export const useAuthStore = defineStore('auth', () => {
  let initialUser = null
  try {
    const savedUser = localStorage.getItem('terra_user')
    if (savedUser) initialUser = JSON.parse(savedUser)
  } catch {
    localStorage.removeItem('terra_user')
  }
  const user = ref(initialUser)

  const isAuthenticated = computed(() => Boolean(user.value))
  const isAdmin = computed(() => user.value?.role === 'admin')
  const isOrganizer = computed(() => user.value?.role === 'organizer')
  const isCustomer = computed(() => user.value?.role === 'customer')

  function persistSession(nextUser, token) {
    user.value = nextUser
    localStorage.setItem('terra_user', JSON.stringify(nextUser))
    if (token) {
      localStorage.setItem('terra_access_token', token)
      localStorage.setItem('terra_demo_token', token)
    }
  }

  async function login({ email, password, portalRole = 'customer' }) {
    try {
      const res = await api.post('/auth/login', {
        email,
        password,
        portal_role: portalRole
      })
      const payload = res?.data
      if (!payload?.user) {
        throw new Error('Respons autentikasi server tidak valid.')
      }
      persistSession(payload.user, payload.access_token)
      return payload.user
    } catch (err) {
      if (err?.code !== 'NETWORK_ERROR') {
        throw new Error(err?.message || 'Gagal masuk ke akun.')
      }

      // Offline / local fallback only when Express API cannot be reached
      const defaultNames = {
        customer: 'Nadia Putri (Peserta)',
        organizer: 'Hikam Pratama (Organizer)',
        admin: 'System Administrator'
      }
      const fallbackUser = {
        id: `usr-${portalRole}`,
        full_name: defaultNames[portalRole] || email.split('@')[0],
        email,
        role: portalRole
      }
      persistSession(fallbackUser, `demo-token-${portalRole}`)
      return fallbackUser
    }
  }

  async function register({ full_name, email, password, role = 'customer', organization_name = '' }) {
    try {
      const res = await api.post('/auth/register', {
        full_name,
        email,
        password,
        role,
        organization_name
      })
      const payload = res?.data
      if (payload?.access_token && payload?.user) {
        persistSession(payload.user, payload.access_token)
      }
      return payload?.user || payload
    } catch (err) {
      if (err?.code !== 'NETWORK_ERROR') {
        throw new Error(err?.message || 'Gagal mendaftarkan akun.')
      }

      const fallbackUser = {
        id: 'usr-' + Date.now(),
        full_name,
        email,
        role,
        organization_name
      }
      persistSession(fallbackUser, `demo-token-${role}`)
      return fallbackUser
    }
  }

  async function logout() {
    try {
      await api.post('/auth/logout')
    } catch {
      // Ignore network errors on stateless logout
    }
    user.value = null
    localStorage.removeItem('terra_user')
    localStorage.removeItem('terra_access_token')
    localStorage.removeItem('terra_demo_token')
  }

  return {
    user,
    isAuthenticated,
    isAdmin,
    isOrganizer,
    isCustomer,
    login,
    register,
    logout
  }
})

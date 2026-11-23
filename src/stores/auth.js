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
    }
  }

  async function login({ email, password, portalRole = 'customer' }) {
    const res = await api.post('/auth/login', {
      email,
      password,
      portal_role: portalRole
    })
    const payload = res?.data
    if (!payload?.user || !payload?.access_token) {
      throw new Error('Respons autentikasi dari server tidak lengkap.')
    }
    persistSession(payload.user, payload.access_token)
    return payload.user
  }

  function setPendingOtp(ctx) {
    if (!ctx) {
      sessionStorage.removeItem('terra_pending_otp')
      return
    }
    sessionStorage.setItem('terra_pending_otp', JSON.stringify(ctx))
  }

  function getPendingOtp() {
    try {
      const raw = sessionStorage.getItem('terra_pending_otp')
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  }

  async function register({ full_name, email, password, role = 'customer', organization_name = '', plan = 'free_trial' }) {
    const res = await api.post('/auth/register', {
      full_name,
      email,
      password,
      role,
      organization_name,
      plan
    })
    const payload = res?.data
    if (payload?.requires_otp) {
      setPendingOtp({
        email: payload.user?.email || email,
        otp_session_token: payload.otp_session_token,
        portal: role,
        email_status: payload.email_status || null
      })
      return payload
    }
    if (payload?.access_token && payload?.user) {
      persistSession(payload.user, payload.access_token)
    }
    return payload
  }

  async function verifyOtp({ email, otp_code, otp_session_token }) {
    const res = await api.post('/auth/verify-otp', {
      email,
      otp_code,
      otp_session_token
    })
    const payload = res?.data
    if (!payload?.user || !payload?.access_token) {
      throw new Error('Verifikasi OTP tidak menghasilkan sesi valid.')
    }
    setPendingOtp(null)
    persistSession(payload.user, payload.access_token)
    return payload
  }

  async function resendOtp({ email, otp_session_token }) {
    const res = await api.post('/auth/resend-otp', { email, otp_session_token })
    const payload = res?.data
    if (payload) {
      const prev = getPendingOtp() || {}
      setPendingOtp({
        ...prev,
        email: payload.email || email,
        otp_session_token: payload.otp_session_token || otp_session_token,
        email_status: payload.email_status || null
      })
    }
    return payload
  }

  async function changeUnverifiedEmail({ current_email, new_email, otp_session_token }) {
    const res = await api.post('/auth/change-unverified-email', {
      current_email,
      new_email,
      otp_session_token
    })
    const payload = res?.data
    if (payload) {
      const prev = getPendingOtp() || {}
      setPendingOtp({
        ...prev,
        email: payload.email || new_email,
        otp_session_token: payload.otp_session_token || otp_session_token,
        email_status: payload.email_status || null
      })
    }
    return payload
  }

  async function fetchCurrentUser() {
    const res = await api.get('/auth/me')
    if (res?.data?.user) {
      user.value = res.data.user
      localStorage.setItem('terra_user', JSON.stringify(res.data.user))
    }
    return res?.data?.user || null
  }

  async function updateProfile(patch) {
    const res = await api.patch('/auth/profile', patch)
    if (res?.data) {
      user.value = { ...(user.value || {}), ...res.data }
      localStorage.setItem('terra_user', JSON.stringify(user.value))
    }
    return user.value
  }

  function getGoogleAuthUrl(redirectAfter = '/my-tickets') {
    const base = String(api.defaults.baseURL || 'http://localhost:3000/api/v1').replace(/\/+$/, '')
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    return `${base}/auth/google?origin=${encodeURIComponent(origin)}&next=${encodeURIComponent(redirectAfter)}`
  }

  function startGoogleAuth(redirectAfter = '/my-tickets') {
    if (typeof window !== 'undefined') {
      window.location.href = getGoogleAuthUrl(redirectAfter)
    }
  }

  async function fetchOAuthStatus() {
    const res = await api.get('/auth/oauth/status')
    return res?.data || { google_enabled: false }
  }

  async function loginWithToken(token) {
    if (!token) throw new Error('Token OAuth tidak ditemukan.')
    localStorage.setItem('terra_access_token', token)
    const me = await fetchCurrentUser()
    if (!me) {
      localStorage.removeItem('terra_access_token')
      throw new Error('Gagal memuat profil akun Google.')
    }
    persistSession(me, token)
    return me
  }

  async function fetchInvite(token) {
    const res = await api.get(`/auth/invite/${encodeURIComponent(token)}`)
    return res?.data
  }

  async function acceptInvite({ token, full_name, password }) {
    const res = await api.post('/auth/accept-invite', {
      token,
      full_name,
      password
    })
    const payload = res?.data
    if (!payload?.user || !payload?.access_token) {
      throw new Error('Gagal memproses penerimaan undangan.')
    }
    persistSession(payload.user, payload.access_token)
    return payload
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
    verifyOtp,
    resendOtp,
    changeUnverifiedEmail,
    setPendingOtp,
    getPendingOtp,
    getGoogleAuthUrl,
    startGoogleAuth,
    fetchOAuthStatus,
    loginWithToken,
    fetchInvite,
    acceptInvite,
    fetchCurrentUser,
    updateProfile,
    logout
  }
})

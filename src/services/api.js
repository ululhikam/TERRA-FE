import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json'
  }
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('terra_access_token') || localStorage.getItem('terra_demo_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const payload = error?.response?.data?.error || {
      code: 'NETWORK_ERROR',
      message: error.message || 'Gagal terhubung ke server API.'
    }
    return Promise.reject(payload)
  }
)

export default api

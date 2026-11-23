<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useEventWorkspaceStore } from '@/stores/eventWorkspace'
import { useToastStore } from '@/stores/toast'
import TerraLogo from '@/components/common/TerraLogo.vue'
import { Mail, KeyRound, RefreshCw, Pencil, AlertTriangle, ArrowLeft } from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const workspace = useEventWorkspaceStore()
const toast = useToastStore()

const pending = authStore.getPendingOtp()
const activeEmail = ref(
  String(route.query.email || pending?.email || '').trim()
)
const otpSessionToken = ref(
  String(route.query.token || pending?.otp_session_token || '').trim()
)
const portal = ref(String(route.query.portal || pending?.portal || 'customer'))
const emailStatus = ref(pending?.email_status || null)

const otpCode = ref('')
const verifying = ref(false)
const resending = ref(false)
const changingEmail = ref(false)
const showChangeEmail = ref(false)
const newEmail = ref('')
const errorMsg = ref('')
const infoMsg = ref('')

const cooldown = ref(0)
let timer = null

function startCooldown(seconds = 30) {
  cooldown.value = seconds
  if (timer) clearInterval(timer)
  timer = setInterval(() => {
    if (cooldown.value > 0) {
      cooldown.value -= 1
    } else {
      clearInterval(timer)
      timer = null
    }
  }, 1000)
}

onMounted(() => {
  if (emailStatus.value && emailStatus.value.sent === false) {
    showChangeEmail.value = true
    errorMsg.value =
      emailStatus.value.reason ||
      'Pengiriman OTP ke alamat email ini gagal. Pastikan email aktif atau ganti dengan email lain.'
  } else if (activeEmail.value) {
    startCooldown(20)
  }
})

onBeforeUnmount(() => {
  if (timer) clearInterval(timer)
})

const emailSendFailed = computed(() => emailStatus.value && emailStatus.value.sent === false)

async function handleVerifyOtp() {
  errorMsg.value = ''
  infoMsg.value = ''
  const cleaned = otpCode.value.replace(/\D/g, '')
  if (cleaned.length !== 6) {
    errorMsg.value = 'Masukkan 6 digit angka kode OTP dari email Anda.'
    return
  }
  verifying.value = true
  try {
    const res = await authStore.verifyOtp({
      email: activeEmail.value,
      otp_code: cleaned,
      otp_session_token: otpSessionToken.value || undefined
    })
    toast.success('Email berhasil diverifikasi! Selamat datang di TERRA.')
    if (res.user?.role === 'organizer') {
      await workspace.fetchOrganizerWorkspace().catch(() => {})
      router.replace('/dashboard')
    } else {
      const redirect = route.query.redirect ? String(route.query.redirect) : '/profile'
      router.replace(redirect)
    }
  } catch (err) {
    errorMsg.value = err?.message || 'Kode OTP tidak valid.'
  } finally {
    verifying.value = false
  }
}

async function handleResendOtp() {
  if (cooldown.value > 0 || resending.value) return
  errorMsg.value = ''
  infoMsg.value = ''
  resending.value = true
  try {
    const res = await authStore.resendOtp({
      email: activeEmail.value,
      otp_session_token: otpSessionToken.value || undefined
    })
    if (res?.otp_session_token) otpSessionToken.value = res.otp_session_token
    emailStatus.value = res?.email_status || null
    if (res?.email_status?.sent === false) {
      showChangeEmail.value = true
      errorMsg.value =
        res.email_status.reason ||
        'Gagal mengirim ulang OTP. Email mungkin tidak valid atau tidak terdaftar — silakan ganti email.'
    } else {
      infoMsg.value = `Kode OTP baru telah dikirim ke ${activeEmail.value}.`
      toast.success('OTP baru berhasil dikirim!')
      startCooldown(30)
    }
  } catch (err) {
    errorMsg.value = err?.message || 'Gagal mengirim ulang OTP.'
  } finally {
    resending.value = false
  }
}

async function handleChangeEmail() {
  errorMsg.value = ''
  infoMsg.value = ''
  if (!newEmail.value.trim()) {
    errorMsg.value = 'Masukkan alamat email baru yang valid.'
    return
  }
  if (!otpSessionToken.value) {
    errorMsg.value = 'Sesi ganti email tidak tersedia. Silakan login kembali untuk memulai ulang verifikasi.'
    return
  }
  changingEmail.value = true
  try {
    const res = await authStore.changeUnverifiedEmail({
      current_email: activeEmail.value,
      new_email: newEmail.value.trim(),
      otp_session_token: otpSessionToken.value
    })
    activeEmail.value = res?.email || newEmail.value.trim()
    otpSessionToken.value = res?.otp_session_token || otpSessionToken.value
    emailStatus.value = res?.email_status || null
    newEmail.value = ''
    otpCode.value = ''
    if (res?.email_status?.sent) {
      showChangeEmail.value = false
      infoMsg.value = `Email berhasil diperbarui ke ${activeEmail.value} dan kode OTP baru telah dikirim!`
      toast.success('Email diganti & OTP dikirim!')
      startCooldown(30)
    } else {
      errorMsg.value =
        res?.email_status?.reason ||
        'Email diperbarui, namun pengiriman OTP masih gagal. Periksa alamat email Anda.'
    }
  } catch (err) {
    errorMsg.value = err?.message || 'Gagal mengganti email.'
  } finally {
    changingEmail.value = false
  }
}
</script>

<template>
  <div class="min-h-[calc(100vh-14rem)] flex items-center justify-center px-4 py-10">
    <div class="w-full max-w-lg rounded-3xl border-2 border-black bg-[#fafaf9] p-6 sm:p-8 space-y-6 shadow-[6px_6px_0_#000]">
      <div class="flex items-center justify-between border-b border-black/15 pb-4">
        <TerraLogo size="md" />
        <span class="rounded-full border border-black bg-[#72a5e4] px-3.5 py-1 text-[10px] font-bold uppercase tracking-wider text-black">
          Verifikasi OTP Email
        </span>
      </div>

      <div v-if="!activeEmail" class="space-y-4 text-center py-4">
        <h1 class="text-2xl font-bold font-editorial text-black">Tidak Ada Sesi Verifikasi</h1>
        <p class="text-xs text-slate-600">
          Silakan daftar atau masuk terlebih dahulu dengan akun Anda untuk meminta kode OTP.
        </p>
        <div class="flex justify-center gap-3 pt-2">
          <RouterLink
            to="/login"
            class="rounded-full border border-black bg-[#72a5e4] px-6 py-2.5 text-xs font-bold text-black hover:bg-[#5c93d9]"
          >
            Login Peserta
          </RouterLink>
          <RouterLink
            to="/register"
            class="rounded-full border border-black bg-white px-6 py-2.5 text-xs font-bold text-black hover:bg-slate-100"
          >
            Daftar Baru
          </RouterLink>
        </div>
      </div>

      <template v-else>
        <div class="space-y-2">
          <h1 class="text-2xl sm:text-3xl font-bold tracking-tight text-black font-editorial">
            Masukkan Kode OTP
          </h1>
          <p class="text-xs sm:text-sm text-slate-700 leading-relaxed">
            Kami mengirimkan kode verifikasi <strong>6 digit</strong> via Resend ke:
            <span class="inline-block rounded-lg border border-black bg-white px-2.5 py-0.5 font-mono text-xs font-bold text-black mt-1">
              {{ activeEmail }}
            </span>
          </p>
        </div>

        <div
          v-if="emailSendFailed"
          class="rounded-2xl border border-amber-500 bg-amber-50 p-3.5 text-xs text-amber-950 flex items-start gap-2.5"
        >
          <AlertTriangle class="h-4 w-4 shrink-0 text-amber-700 mt-0.5" />
          <div class="space-y-1">
            <p class="font-bold">Email OTP belum berhasil terkirim ke alamat tersebut.</p>
            <p class="text-[11px] text-amber-900">
              Jika email typo, tidak aktif, atau tidak dapat menerima pesan, gunakan formulir <strong>Ganti Email</strong> di bawah ini agar OTP dikirim ke email yang benar.
            </p>
          </div>
        </div>

        <div v-if="errorMsg" class="rounded-xl border border-rose-400 bg-rose-50 p-3 text-xs font-medium text-rose-800">
          {{ errorMsg }}
        </div>

        <div v-if="infoMsg" class="rounded-xl border border-emerald-500 bg-emerald-50 p-3 text-xs font-medium text-emerald-900">
          {{ infoMsg }}
        </div>

        <form @submit.prevent="handleVerifyOtp" class="space-y-4">
          <div class="space-y-1.5">
            <label class="block text-xs font-bold text-black">Kode OTP (6 Digit)</label>
            <div class="relative">
              <KeyRound class="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" />
              <input
                v-model="otpCode"
                type="text"
                inputmode="numeric"
                maxlength="6"
                required
                placeholder="123456"
                class="w-full rounded-xl border-2 border-black bg-white pl-10 pr-4 py-3 text-center font-mono text-xl font-black tracking-[0.45em] text-black placeholder:text-slate-300 focus:outline-hidden"
              />
            </div>
          </div>

          <button
            type="submit"
            :disabled="verifying"
            class="w-full rounded-full border border-black bg-[#72a5e4] py-3.5 text-xs sm:text-sm font-bold text-black hover:bg-[#5c93d9] transition-colors disabled:opacity-50 cursor-pointer"
          >
            {{ verifying ? 'Memverifikasi OTP...' : 'Verifikasi & Masuk Sekarang' }}
          </button>
        </form>

        <!-- Resend + Change Email Controls -->
        <div class="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-black/15 text-xs">
          <button
            type="button"
            @click="handleResendOtp"
            :disabled="cooldown > 0 || resending"
            class="inline-flex items-center gap-1.5 font-bold text-black hover:underline disabled:opacity-40 cursor-pointer"
          >
            <RefreshCw class="h-3.5 w-3.5" :class="{ 'animate-spin': resending }" />
            <span v-if="cooldown > 0">Kirim ulang OTP ({{ cooldown }}d)</span>
            <span v-else>{{ resending ? 'Mengirim...' : 'Kirim Ulang OTP' }}</span>
          </button>

          <button
            type="button"
            @click="showChangeEmail = !showChangeEmail"
            class="inline-flex items-center gap-1.5 rounded-full border border-black bg-white px-3.5 py-1 text-[11px] font-bold text-black hover:bg-slate-100 cursor-pointer"
          >
            <Pencil class="h-3 w-3" />
            <span>{{ showChangeEmail ? 'Tutup Ganti Email' : 'Salah Email? Ganti Email' }}</span>
          </button>
        </div>

        <!-- Inline Change Email Box -->
        <form
          v-if="showChangeEmail"
          @submit.prevent="handleChangeEmail"
          class="rounded-2xl border border-black bg-white p-4 space-y-3"
        >
          <div class="space-y-0.5">
            <h2 class="text-xs font-bold text-black">Ganti Alamat Email Tujuan OTP</h2>
            <p class="text-[11px] text-slate-600">
              Email lama yang belum terverifikasi akan diganti dan kode OTP baru langsung dikirim ke email baru Anda.
            </p>
          </div>
          <div class="relative">
            <Mail class="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
            <input
              v-model="newEmail"
              type="email"
              required
              placeholder="email.benar@domain.com"
              class="w-full rounded-xl border border-black bg-white pl-10 pr-4 py-2.5 text-xs text-black placeholder:text-slate-400 focus:outline-hidden"
            />
          </div>
          <button
            type="submit"
            :disabled="changingEmail"
            class="w-full rounded-full bg-black py-2.5 text-xs font-bold text-white hover:bg-slate-800 transition-colors disabled:opacity-50 cursor-pointer"
          >
            {{ changingEmail ? 'Mengirim ke Email Baru...' : 'Simpan Email Baru & Kirim OTP' }}
          </button>
        </form>

        <div class="pt-1 text-center">
          <RouterLink
            :to="portal === 'organizer' ? '/organizer/login' : '/login'"
            class="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-black"
          >
            <ArrowLeft class="h-3.5 w-3.5" />
            <span>Kembali ke Halaman Login</span>
          </RouterLink>
        </div>
      </template>
    </div>
  </div>
</template>

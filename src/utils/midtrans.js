let snapScriptPromise = null
let loadedScriptKey = ''

/**
 * Dynamically load Midtrans Snap.js once using server-provided snapJsUrl & clientKey.
 */
export function loadMidtransSnapScript({ clientKey, snapJsUrl } = {}) {
  const resolvedKey =
    String(clientKey || import.meta.env.VITE_MIDTRANS_CLIENT_KEY || '').trim()
  const resolvedUrl =
    String(snapJsUrl || '').trim() ||
    (import.meta.env.VITE_MIDTRANS_IS_PRODUCTION === 'true'
      ? 'https://app.midtrans.com/snap/snap.js'
      : 'https://app.sandbox.midtrans.com/snap/snap.js')

  if (!resolvedKey) {
    return Promise.reject(
      new Error('MIDTRANS_CLIENT_KEY belum dikonfigurasi pada server atau environment.')
    )
  }

  if (typeof window !== 'undefined' && window.snap && loadedScriptKey === `${resolvedUrl}::${resolvedKey}`) {
    return Promise.resolve(window.snap)
  }

  if (snapScriptPromise && loadedScriptKey === `${resolvedUrl}::${resolvedKey}`) {
    return snapScriptPromise
  }

  loadedScriptKey = `${resolvedUrl}::${resolvedKey}`
  snapScriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-terra-midtrans="snap"]')
    if (existing) {
      existing.remove()
    }

    const script = document.createElement('script')
    script.src = resolvedUrl
    script.type = 'text/javascript'
    script.async = true
    script.setAttribute('data-client-key', resolvedKey)
    script.setAttribute('data-terra-midtrans', 'snap')
    script.onload = () => {
      if (window.snap) {
        resolve(window.snap)
      } else {
        snapScriptPromise = null
        reject(new Error('Midtrans Snap gagal diinisialisasi di browser.'))
      }
    }
    script.onerror = () => {
      snapScriptPromise = null
      reject(new Error('Gagal memuat script pembayaran Midtrans Snap. Periksa koneksi internet Anda.'))
    }
    document.head.appendChild(script)
  })

  return snapScriptPromise
}

/**
 * Open Midtrans Snap popup and resolve with the user's completion status.
 */
export async function openMidtransSnap(snapToken, config = {}) {
  if (!snapToken) {
    throw new Error('Token pembayaran Midtrans Snap tidak tersedia.')
  }
  const snap = await loadMidtransSnapScript(config)
  return new Promise((resolve, reject) => {
    snap.pay(snapToken, {
      onSuccess(result) {
        resolve({ status: 'success', result })
      },
      onPending(result) {
        resolve({ status: 'pending', result })
      },
      onError(result) {
        reject(new Error(result?.status_message || 'Pembayaran gagal diproses oleh Midtrans.'))
      },
      onClose() {
        resolve({ status: 'closed', result: null })
      }
    })
  })
}

import QRCode from 'qrcode'
import { Html5Qrcode } from 'html5-qrcode'

/**
 * Build canonical TERRA ticket QR payload string.
 * Format: TERRA:<ticketCode>:<eventId>[:<token>]
 */
export function generateTicketQrPayload({ ticketCode, eventId, token = '' }) {
  const code = String(ticketCode || '').trim().toUpperCase()
  const evt = String(eventId || '').trim()
  const suffix = String(token || '').trim()
  return suffix ? `TERRA:${code}:${evt}:${suffix}` : `TERRA:${code}:${evt}`
}

/**
 * Generate a PNG Data URL from a ticket QR payload or code.
 */
export async function generateTicketQrDataUrl(qrValue, options = {}) {
  const value = String(qrValue || '').trim()
  if (!value) return ''
  return QRCode.toDataURL(value, {
    width: options.width || 240,
    margin: options.margin ?? 2,
    errorCorrectionLevel: options.errorCorrectionLevel || 'M',
    color: {
      dark: options.dark || '#0f172a',
      light: options.light || '#ffffff'
    }
  })
}

/**
 * Render a QR code directly onto a <canvas> element.
 */
export async function generateTicketQrCanvas(canvasEl, qrValue, options = {}) {
  const value = String(qrValue || '').trim()
  if (!canvasEl || !value) return
  await QRCode.toCanvas(canvasEl, value, {
    width: options.width || 240,
    margin: options.margin ?? 2,
    errorCorrectionLevel: options.errorCorrectionLevel || 'M',
    color: {
      dark: options.dark || '#0f172a',
      light: options.light || '#ffffff'
    }
  })
}

/**
 * Download the generated ticket QR code as a crisp PNG file.
 */
export async function downloadTicketQrPng(ticket, options = {}) {
  const qrValue =
    ticket?.qr_payload ||
    generateTicketQrPayload({
      ticketCode: ticket?.ticket_code,
      eventId: ticket?.event_id
    })
  const dataUrl =
    ticket?.qr_data_url ||
    (await generateTicketQrDataUrl(qrValue, {
      width: options.width || 512,
      margin: options.margin ?? 3
    }))

  if (!dataUrl) {
    throw new Error('Payload QR tiket kosong.')
  }

  const link = document.createElement('a')
  link.href = dataUrl
  link.download = `tiket-${ticket?.ticket_code || 'qr'}.png`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  return dataUrl
}

/**
 * Parse a decoded QR string or manually entered ticket code.
 */
export function parseScannedQrPayload(decodedText) {
  const raw = String(decodedText || '').trim()
  if (!raw) {
    return { raw: '', ticketCode: '', eventId: null, token: null, isTerraQr: false }
  }

  if (raw.startsWith('{') && raw.endsWith('}')) {
    try {
      const parsed = JSON.parse(raw)
      const code = String(parsed.ticket_code || parsed.ticketCode || parsed.code || '').trim()
      const eventId = parsed.event_id || parsed.eventId || null
      return {
        raw: parsed.qr_payload || raw,
        ticketCode: code.toUpperCase(),
        eventId: eventId ? String(eventId) : null,
        token: parsed.token ? String(parsed.token) : null,
        isTerraQr: Boolean(parsed.qr_payload?.startsWith('TERRA:') || code)
      }
    } catch {
      // Fallback to string parsing
    }
  }

  if (raw.toUpperCase().startsWith('TERRA:')) {
    const parts = raw.split(':')
    return {
      raw,
      ticketCode: String(parts[1] || '').trim().toUpperCase(),
      eventId: parts[2] ? String(parts[2]).trim() : null,
      token: parts[3] ? String(parts[3]).trim() : null,
      isTerraQr: true
    }
  }

  return {
    raw,
    ticketCode: raw.toUpperCase(),
    eventId: null,
    token: null,
    isTerraQr: false
  }
}

/**
 * Scan and decode a QR code from an uploaded image file (PNG/JPG/WebP).
 */
export async function scanTicketQrFromFile(file) {
  if (!file) {
    throw new Error('Pilih file gambar QR Code terlebih dahulu.')
  }

  const tempId = `terra-qr-file-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
  const tempEl = document.createElement('div')
  tempEl.id = tempId
  tempEl.style.display = 'none'
  document.body.appendChild(tempEl)

  const scanner = new Html5Qrcode(tempId)
  try {
    const decodedText = await scanner.scanFile(file, false)
    return {
      decodedText,
      parsed: parseScannedQrPayload(decodedText)
    }
  } finally {
    try {
      scanner.clear()
    } catch {
      // Ignore cleanup errors
    }
    tempEl.remove()
  }
}

/**
 * Create a managed camera QR scanner controller with built-in cooldown deduplication
 * so holding a ticket QR in front of the camera does not trigger duplicate check-ins.
 */
export function createCameraQrScanner(
  elementId,
  { onDecode, onError, fps = 12, qrbox = 240, cooldownMs = 3000 } = {}
) {
  let instance = null
  let active = false
  let processing = false
  let lastDecoded = ''
  let lastDecodedAt = 0

  async function handleDecoded(decodedText) {
    const now = Date.now()
    const normalized = String(decodedText || '').trim()
    if (!normalized) return
    if (processing) return
    if (normalized === lastDecoded && now - lastDecodedAt < cooldownMs) {
      return
    }

    processing = true
    lastDecoded = normalized
    lastDecodedAt = now
    try {
      await onDecode?.(normalized, parseScannedQrPayload(normalized))
    } finally {
      processing = false
    }
  }

  async function start(cameraConfig = { facingMode: 'environment' }) {
    if (active) return
    instance = new Html5Qrcode(elementId)
    active = true
    try {
      await instance.start(
        cameraConfig,
        { fps, qrbox: typeof qrbox === 'number' ? { width: qrbox, height: qrbox } : qrbox },
        handleDecoded,
        () => {}
      )
    } catch (err) {
      active = false
      try {
        instance.clear()
      } catch {
        // Ignore cleanup errors
      }
      instance = null
      onError?.(err)
      throw err
    }
  }

  async function stop() {
    if (!instance) {
      active = false
      return
    }
    try {
      if (active) {
        await instance.stop()
      }
      instance.clear()
    } catch {
      // Ignore cleanup errors
    } finally {
      instance = null
      active = false
      processing = false
    }
  }

  function resetCooldown() {
    lastDecoded = ''
    lastDecodedAt = 0
  }

  return {
    start,
    stop,
    resetCooldown,
    isActive: () => active
  }
}

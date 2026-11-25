import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { createPinia, setActivePinia } from 'pinia'

import { MODULE_CATALOG } from '../src/constants/modules.js'
import { formatDate, formatDateTime, formatCurrency, slugify } from '../src/utils/formatters.js'
import { useToastStore } from '../src/stores/toast.js'
import {
  SITE_URL,
  buildCanonicalUrl,
  cleanSeoDescription,
  buildBreadcrumbJsonLd,
  buildEventJsonLd,
  buildOrganizerJsonLd
} from '../src/utils/seo.js'

if (!globalThis.window) globalThis.window = globalThis
if (!globalThis.document) globalThis.document = {}
const { generateTicketQrPayload, parseScannedQrPayload } = await import('../src/utils/qrCode.js')

describe('MODULE_CATALOG validation', () => {
  it('contains all 13 PRD modules with isCore and dependsOn arrays', () => {
    assert.equal(MODULE_CATALOG.length, 13)
    const keys = MODULE_CATALOG.map((m) => m.key)
    const expectedKeys = [
      'event_profile',
      'timeline',
      'tasks',
      'team',
      'ticketing',
      'participants',
      'check_in',
      'finance',
      'vendors',
      'sponsors',
      'documents',
      'reports',
      'feedback'
    ]
    assert.deepEqual(keys, expectedKeys)

    for (const mod of MODULE_CATALOG) {
      assert.equal(typeof mod.isCore, 'boolean')
      assert.ok(Array.isArray(mod.dependsOn))
      if (mod.key === 'event_profile') {
        assert.equal(mod.isCore, true)
        assert.deepEqual(mod.dependsOn, [])
      } else {
        assert.equal(mod.isCore, false)
        assert.ok(mod.dependsOn.length > 0)
      }
    }

    const participants = MODULE_CATALOG.find((m) => m.key === 'participants')
    const checkIn = MODULE_CATALOG.find((m) => m.key === 'check_in')
    assert.deepEqual(participants.dependsOn, ['ticketing'])
    assert.deepEqual(checkIn.dependsOn, ['ticketing'])
  })
})

describe('formatters utilities', () => {
  it('formats dates safely and handles empty input', () => {
    assert.equal(formatDate(''), '-')
    assert.equal(formatDate(null), '-')
    assert.ok(formatDate('2026-08-29T10:00:00Z').includes('2026'))

    assert.equal(formatDateTime(''), '-')
    assert.ok(formatDateTime('2026-08-29T10:00:00Z').includes('2026'))
  })

  it('formats IDR currency and gratis zero values', () => {
    assert.equal(formatCurrency(0), 'Gratis')
    assert.equal(formatCurrency(null), 'Gratis')
    const formatted = formatCurrency(50000)
    assert.ok(formatted.includes('50.000'))
  })

  it('slugifies titles cleanly', () => {
    assert.equal(slugify('DEMAFEST 2026: Resonansi Dewantara!'), 'demafest-2026-resonansi-dewantara')
    assert.equal(slugify('  Multiple   Spaces & Symbols  '), 'multiple-spaces-symbols')
  })
})

describe('useToastStore (Pinia)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('adds info, success, error, warning toasts and removes by id', () => {
    const toast = useToastStore()
    assert.deepEqual(toast.toasts, [])

    toast.info('Info notice')
    toast.success('Saved')
    toast.error('Failed')
    toast.warning('Careful')

    assert.equal(toast.toasts.length, 4)
    assert.equal(toast.toasts[0].type, 'info')
    assert.equal(toast.toasts[1].type, 'success')
    assert.equal(toast.toasts[2].type, 'error')
    assert.equal(toast.toasts[3].type, 'warning')

    const firstId = toast.toasts[0].id
    toast.remove(firstId)
    assert.equal(toast.toasts.length, 3)
    assert.ok(!toast.toasts.some((t) => t.id === firstId))
  })
})

describe('QR payload generation and parsing', () => {
  it('generates canonical TERRA QR payload with optional token', () => {
    assert.equal(
      generateTicketQrPayload({ ticketCode: 'tkt-001', eventId: 'evt-1' }),
      'TERRA:TKT-001:evt-1'
    )
    assert.equal(
      generateTicketQrPayload({ ticketCode: ' tkt-abc ', eventId: 'evt-demafest-2026', token: 'sig123' }),
      'TERRA:TKT-ABC:evt-demafest-2026:sig123'
    )
  })

  it('parses TERRA:, JSON, and raw ticket codes accurately', () => {
    assert.deepEqual(parseScannedQrPayload(''), {
      raw: '',
      ticketCode: '',
      eventId: null,
      token: null,
      isTerraQr: false
    })

    const terraParsed = parseScannedQrPayload('TERRA:tkt-999:evt-1:tok-xyz')
    assert.equal(terraParsed.isTerraQr, true)
    assert.equal(terraParsed.ticketCode, 'TKT-999')
    assert.equal(terraParsed.eventId, 'evt-1')
    assert.equal(terraParsed.token, 'tok-xyz')

    const jsonParsed = parseScannedQrPayload(
      JSON.stringify({ ticket_code: 'tkt-json', event_id: 'evt-2', token: 'abc' })
    )
    assert.equal(jsonParsed.isTerraQr, true)
    assert.equal(jsonParsed.ticketCode, 'TKT-JSON')
    assert.equal(jsonParsed.eventId, 'evt-2')
    assert.equal(jsonParsed.token, 'abc')

    const manualParsed = parseScannedQrPayload('dmf-pass-01')
    assert.equal(manualParsed.isTerraQr, false)
    assert.equal(manualParsed.ticketCode, 'DMF-PASS-01')
    assert.equal(manualParsed.eventId, null)
  })
})

describe('SEO helpers & JSON-LD builders', () => {
  it('builds canonical URLs cleanly on terra.concern.web.id', () => {
    assert.equal(SITE_URL, 'https://terra.concern.web.id')
    assert.equal(buildCanonicalUrl('/'), 'https://terra.concern.web.id/')
    assert.equal(buildCanonicalUrl('events/demafest-2026/'), 'https://terra.concern.web.id/events/demafest-2026')
    assert.equal(buildCanonicalUrl('/pricing#plans'), 'https://terra.concern.web.id/pricing')
  })

  it('cleans HTML and truncates descriptions cleanly', () => {
    const cleaned = cleanSeoDescription('<p>Konser <strong>terbesar</strong> di kampus tahun ini!</p>', 40)
    assert.ok(!cleaned.includes('<p>'))
    assert.ok(cleaned.length <= 40)
  })

  it('builds Event, Organizer, and Breadcrumb Schema.org JSON-LD', () => {
    const eventLd = buildEventJsonLd({
      id: 'evt-1',
      slug: 'demafest-2026',
      title: 'DEMAFEST 2026',
      description: 'Festival musik dan teknologi kampus.',
      poster_url: 'https://cdn.example.com/poster.jpg',
      start_at: '2026-08-29T18:00:00+07:00',
      end_at: '2026-08-29T22:00:00+07:00',
      location_type: 'offline',
      location_name: 'Lapangan Utama UST',
      address: 'Jl. Batikan, Yogyakarta',
      organization: { name: 'DEMA FT UST', slug: 'dema-ft-ust' },
      ticket_types: [{ name: 'Presale', price: 75000, quantity: 100, sold_quantity: 20 }]
    })
    assert.equal(eventLd['@type'], 'Event')
    assert.equal(eventLd.url, 'https://terra.concern.web.id/events/demafest-2026')
    assert.equal(eventLd.eventAttendanceMode, 'https://schema.org/OfflineEventAttendanceMode')
    assert.equal(eventLd.offers[0].priceCurrency, 'IDR')
    assert.equal(eventLd.offers[0].availability, 'https://schema.org/InStock')

    const orgLd = buildOrganizerJsonLd({ name: 'DEMA FT UST', slug: 'dema-ft-ust' }, [
      { id: 'evt-1', slug: 'demafest-2026', title: 'DEMAFEST 2026', start_at: '2026-08-29T18:00:00+07:00' }
    ])
    assert.equal(orgLd['@type'], 'Organization')
    assert.equal(orgLd.url, 'https://terra.concern.web.id/organizers/dema-ft-ust')
    assert.equal(orgLd.event.length, 1)

    const breadcrumb = buildBreadcrumbJsonLd([
      { name: 'Beranda', path: '/' },
      { name: 'Jelajahi Event', path: '/events' }
    ])
    assert.equal(breadcrumb['@type'], 'BreadcrumbList')
    assert.equal(breadcrumb.itemListElement.length, 2)
  })
})

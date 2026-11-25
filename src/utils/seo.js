export const SITE_URL = 'https://terra.concern.web.id'
export const SITE_NAME = 'TERRA'
export const DEFAULT_OG_IMAGE = `${SITE_URL}/og-image.png`
export const DEFAULT_DESCRIPTION =
  'Platform tiket event resmi & ruang kerja kepanitiaan modular di Indonesia. Temukan konser, festival kampus, seminar, dan workshop dengan e-ticket QR instan.'

export function buildCanonicalUrl(path = '/') {
  const raw = String(path || '/').trim()
  if (/^https?:\/\//i.test(raw)) {
    return raw.replace(/\/+$/, '') || SITE_URL
  }
  const withoutHash = raw.split('#')[0]
  const normalizedPath = withoutHash.startsWith('/') ? withoutHash : `/${withoutHash}`
  if (normalizedPath === '/') return `${SITE_URL}/`
  return `${SITE_URL}${normalizedPath.replace(/\/+$/, '')}`
}

export function cleanSeoDescription(rawText, maxLength = 160) {
  const plain = String(rawText || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/[#*_`>~]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  if (!plain) return DEFAULT_DESCRIPTION
  if (plain.length <= maxLength) return plain
  const sliced = plain.slice(0, maxLength - 1)
  const lastSpace = sliced.lastIndexOf(' ')
  return `${(lastSpace > 40 ? sliced.slice(0, lastSpace) : sliced).trim()}…`
}

export function buildBreadcrumbJsonLd(items = []) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: (items || []).map((item, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      name: item.name,
      item: buildCanonicalUrl(item.path || '/')
    }))
  }
}

export function buildEventJsonLd(event) {
  if (!event) return null
  const slugOrId = event.slug || event.id || ''
  const eventUrl = buildCanonicalUrl(`/events/${slugOrId}`)
  const images = [event.poster_url, event.banner_url].filter((u) => typeof u === 'string' && u.trim())
  const attendanceMode =
    event.location_type === 'online'
      ? 'https://schema.org/OnlineEventAttendanceMode'
      : event.location_type === 'hybrid'
        ? 'https://schema.org/MixedEventAttendanceMode'
        : 'https://schema.org/OfflineEventAttendanceMode'

  const offlinePlace = {
    '@type': 'Place',
    name: event.location_name || 'Lokasi Event',
    address: {
      '@type': 'PostalAddress',
      streetAddress: event.address || event.location_name || 'Indonesia',
      addressCountry: 'ID'
    },
    ...(event.latitude && event.longitude
      ? {
          geo: {
            '@type': 'GeoCoordinates',
            latitude: Number(event.latitude),
            longitude: Number(event.longitude)
          }
        }
      : {})
  }

  const virtualLocation = {
    '@type': 'VirtualLocation',
    url: event.online_url || eventUrl
  }

  const location =
    event.location_type === 'online'
      ? virtualLocation
      : event.location_type === 'hybrid'
        ? [offlinePlace, virtualLocation]
        : offlinePlace

  const ticketTypes = Array.isArray(event.ticket_types) ? event.ticket_types : []
  const offers =
    ticketTypes.length > 0
      ? ticketTypes.map((t) => ({
          '@type': 'Offer',
          name: t.name || 'Tiket Event',
          price: Number(t.price || 0),
          priceCurrency: 'IDR',
          availability:
            Number(t.quantity || 0) - Number(t.sold_quantity || 0) > 0
              ? 'https://schema.org/InStock'
              : 'https://schema.org/SoldOut',
          url: eventUrl
        }))
      : [
          {
            '@type': 'Offer',
            name: 'Tiket Masuk',
            price: 0,
            priceCurrency: 'IDR',
            availability: 'https://schema.org/InStock',
            url: eventUrl
          }
        ]

  const orgName = event.organization?.name || event.organization_name || 'TERRA Verified Organizer'
  const orgSlug = event.organization?.slug || event.organization_slug

  return {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: event.title || 'Event TERRA',
    description: cleanSeoDescription(event.description || event.title),
    url: eventUrl,
    image: images.length > 0 ? images : [DEFAULT_OG_IMAGE],
    startDate: event.start_at || event.start_date,
    endDate: event.end_at || event.end_date || event.start_at || event.start_date,
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: attendanceMode,
    location,
    organizer: {
      '@type': 'Organization',
      name: orgName,
      ...(orgSlug ? { url: buildCanonicalUrl(`/organizers/${orgSlug}`) } : {})
    },
    offers
  }
}

export function buildOrganizerJsonLd(org, events = []) {
  if (!org) return null
  const url = buildCanonicalUrl(`/organizers/${org.slug || org.id || ''}`)
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: org.name || SITE_NAME,
    description: cleanSeoDescription(
      org.description || `Penyelenggara event terverifikasi ${org.name || ''} di TERRA.`
    ),
    url,
    logo: org.logo_url || DEFAULT_OG_IMAGE,
    ...(Array.isArray(events) && events.length > 0
      ? {
          event: events.slice(0, 10).map((evt) => ({
            '@type': 'Event',
            name: evt.title,
            startDate: evt.start_at || evt.start_date,
            url: buildCanonicalUrl(`/events/${evt.slug || evt.id}`)
          }))
        }
      : {})
  }
}

function upsertMeta(attrName, attrValue, content) {
  let el = document.head.querySelector(`meta[${attrName}="${attrValue}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attrName, attrValue)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

function upsertLink(rel, href) {
  let el = document.head.querySelector(`link[rel="${rel}"]`)
  if (!el) {
    el = document.createElement('link')
    el.setAttribute('rel', rel)
    document.head.appendChild(el)
  }
  el.setAttribute('href', href)
}

function upsertDynamicJsonLd(jsonLd) {
  const existing = document.head.querySelector('script[data-terra-seo="dynamic"]')
  const normalized = Array.isArray(jsonLd) ? jsonLd.filter(Boolean) : jsonLd
  const hasContent = Array.isArray(normalized) ? normalized.length > 0 : Boolean(normalized)

  if (!hasContent) {
    if (existing) existing.remove()
    return
  }

  const scriptEl = existing || document.createElement('script')
  scriptEl.type = 'application/ld+json'
  scriptEl.setAttribute('data-terra-seo', 'dynamic')
  scriptEl.textContent = JSON.stringify(normalized)
  if (!existing) {
    document.head.appendChild(scriptEl)
  }
}

export function updatePageSeo({
  title,
  description,
  path = '/',
  image = DEFAULT_OG_IMAGE,
  imageAlt = SITE_NAME,
  type = 'website',
  noindex = false,
  jsonLd = null
} = {}) {
  if (typeof document === 'undefined' || !document.head || typeof document.head.querySelector !== 'function') {
    return
  }

  const rawTitle = String(title || '').trim()
  const fullTitle = !rawTitle
    ? `${SITE_NAME} — Beli Tiket Event, Konser, Festival Kampus & Manajemen Kepanitiaan`
    : /terra/i.test(rawTitle)
      ? rawTitle
      : `${rawTitle} | ${SITE_NAME}`

  const cleanDesc = cleanSeoDescription(description || DEFAULT_DESCRIPTION)
  const canonicalUrl = buildCanonicalUrl(path)
  const resolvedImage = image && /^https?:\/\//i.test(image)
    ? image
    : image && image.startsWith('/')
      ? `${SITE_URL}${image}`
      : DEFAULT_OG_IMAGE
  const robotsValue = noindex
    ? 'noindex, nofollow'
    : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1'

  document.title = fullTitle
  upsertLink('canonical', canonicalUrl)
  upsertMeta('name', 'description', cleanDesc)
  upsertMeta('name', 'robots', robotsValue)

  upsertMeta('property', 'og:type', type)
  upsertMeta('property', 'og:locale', 'id_ID')
  upsertMeta('property', 'og:site_name', SITE_NAME)
  upsertMeta('property', 'og:title', fullTitle)
  upsertMeta('property', 'og:description', cleanDesc)
  upsertMeta('property', 'og:url', canonicalUrl)
  upsertMeta('property', 'og:image', resolvedImage)
  upsertMeta('property', 'og:image:secure_url', resolvedImage)
  upsertMeta('property', 'og:image:alt', imageAlt || fullTitle)

  upsertMeta('name', 'twitter:card', 'summary_large_image')
  upsertMeta('name', 'twitter:title', fullTitle)
  upsertMeta('name', 'twitter:description', cleanDesc)
  upsertMeta('name', 'twitter:image', resolvedImage)

  upsertDynamicJsonLd(jsonLd)
}

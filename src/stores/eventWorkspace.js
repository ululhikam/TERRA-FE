import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '@/services/api'
import { MODULE_CATALOG } from '@/constants/modules'

export const useEventWorkspaceStore = defineStore('eventWorkspace', () => {
  const organizations = ref([])
  const events = ref([])
  const categories = ref([])
  const myTickets = ref([])
  const myOrders = ref([])
  const participants = ref([])
  const tasks = ref([])
  const finance = ref({ budget: 0, incomes: [], expenses: [] })
  const vendors = ref([])
  const sponsors = ref([])
  const documents = ref([])
  const surveys = ref([])
  const teamMembers = ref([])
  const checkinLogs = ref([])

  // Admin Console state
  const adminDashboard = ref(null)
  const adminUsers = ref([])
  const adminVerifications = ref([])
  const adminReports = ref([])
  const adminOrders = ref([])
  const notifications = ref([])
  const eventOrders = ref([])
  const eventActivityLogs = ref([])
  const eventReport = ref(null)

  const loading = ref(false)
  const apiConnected = ref(false)
  const supabaseStatus = ref({ configured: false, connected: false, mode: 'checking' })
  const activeEventId = ref('')

  const activeEvent = computed(
    () => events.value.find((e) => e.id === activeEventId.value) || events.value[0] || null
  )

  function setActiveEvent(eventId) {
    activeEventId.value = eventId
  }

  function upsertListItem(listRef, item) {
    if (!item?.id) return
    const idx = listRef.value.findIndex((x) => x.id === item.id)
    if (idx === -1) {
      listRef.value.unshift(item)
    } else {
      listRef.value[idx] = { ...listRef.value[idx], ...item }
    }
  }

  function replaceForEvent(listRef, eventId, remoteItems) {
    const others = listRef.value.filter((item) => item.event_id && item.event_id !== eventId)
    listRef.value = [...(remoteItems || []), ...others]
  }

  // ---------------- HEALTH & HYDRATION ----------------
  async function checkBackendHealth() {
    try {
      const res = await api.get('/health')
      apiConnected.value = Boolean(res?.success)
      if (res?.supabase) supabaseStatus.value = res.supabase
      return res
    } catch {
      apiConnected.value = false
      return null
    }
  }

  async function fetchMarketplace() {
    loading.value = true
    try {
      const [evtsRes, orgsRes, catsRes] = await Promise.all([
        api.get('/marketplace/events', { params: { limit: 100 } }),
        api.get('/marketplace/organizers'),
        api.get('/marketplace/categories')
      ])
      if (Array.isArray(evtsRes?.data)) {
        // Merge published marketplace events without wiping organizer drafts if logged in
        const drafts = events.value.filter(
          (e) => e.publication_status !== 'Published' && !evtsRes.data.some((r) => r.id === e.id)
        )
        events.value = [...evtsRes.data, ...drafts]
        if (!activeEventId.value && events.value.length) {
          activeEventId.value = events.value[0].id
        }
      }
      if (Array.isArray(orgsRes?.data)) {
        organizations.value = orgsRes.data
      }
      if (Array.isArray(catsRes?.data)) {
        categories.value = catsRes.data
      }
      apiConnected.value = true
    } finally {
      loading.value = false
    }
  }

  async function fetchEventPublic(slugOrId) {
    if (!slugOrId) return null
    const res = await api.get(`/marketplace/events/${slugOrId}`)
    if (res?.data) {
      upsertListItem(events, res.data)
      return res.data
    }
    return null
  }

  async function fetchOrganizerWorkspace() {
    if (!localStorage.getItem('terra_access_token')) return
    const [evtsRes, orgsRes] = await Promise.all([
      api.get('/events'),
      api.get('/organizations')
    ])
    if (Array.isArray(evtsRes?.data)) {
      events.value = evtsRes.data
      if (!activeEventId.value && events.value.length) {
        activeEventId.value = events.value[0].id
      }
    }
    if (Array.isArray(orgsRes?.data)) {
      organizations.value = orgsRes.data
    }
  }

  async function fetchEventWorkspace(eventId) {
    if (!eventId || !localStorage.getItem('terra_access_token')) return
    activeEventId.value = eventId

    const evtRes = await api.get(`/events/${eventId}`)
    const evt = evtRes?.data
    if (!evt) return
    upsertListItem(events, evt)

    const mods = evt.enabled_modules || []
    const calls = []

    if (mods.includes('timeline') || mods.includes('tasks')) {
      calls.push(
        api.get(`/events/${eventId}/tasks`).then((r) => {
          if (Array.isArray(r?.data)) replaceForEvent(tasks, eventId, r.data)
        }).catch(() => {})
      )
    }
    if (mods.includes('ticketing')) {
      calls.push(
        api.get(`/events/${eventId}/ticket-types`).then((r) => {
          if (Array.isArray(r?.data)) evt.ticket_types = r.data
        }).catch(() => {}),
        api.get(`/events/${eventId}/orders`).then((r) => {
          if (Array.isArray(r?.data)) replaceForEvent(eventOrders, eventId, r.data)
        }).catch(() => {})
      )
    }
    if (mods.includes('participants')) {
      calls.push(
        api.get(`/events/${eventId}/participants`).then((r) => {
          if (Array.isArray(r?.data)) replaceForEvent(participants, eventId, r.data)
        }).catch(() => {})
      )
    }
    if (mods.includes('check_in')) {
      calls.push(
        api.get(`/events/${eventId}/check-ins`).then((r) => {
          if (Array.isArray(r?.data)) replaceForEvent(checkinLogs, eventId, r.data)
        }).catch(() => {})
      )
    }
    if (mods.includes('finance')) {
      calls.push(
        Promise.all([
          api.get(`/events/${eventId}/finance/summary`),
          api.get(`/events/${eventId}/finance/incomes`),
          api.get(`/events/${eventId}/finance/expenses`)
        ]).then(([sum, inc, exp]) => {
          finance.value = {
            budget: Number(sum?.data?.budget ?? 0),
            incomes: Array.isArray(inc?.data) ? inc.data : [],
            expenses: Array.isArray(exp?.data) ? exp.data : []
          }
        }).catch(() => {})
      )
    } else {
      finance.value = { budget: 0, incomes: [], expenses: [] }
    }
    if (mods.includes('vendors')) {
      calls.push(
        api.get(`/events/${eventId}/vendors`).then((r) => {
          if (Array.isArray(r?.data)) replaceForEvent(vendors, eventId, r.data)
        }).catch(() => {})
      )
    }
    if (mods.includes('sponsors')) {
      calls.push(
        api.get(`/events/${eventId}/sponsors`).then((r) => {
          if (Array.isArray(r?.data)) replaceForEvent(sponsors, eventId, r.data)
        }).catch(() => {})
      )
    }
    if (mods.includes('documents')) {
      calls.push(
        api.get(`/events/${eventId}/documents`).then((r) => {
          if (Array.isArray(r?.data)) replaceForEvent(documents, eventId, r.data)
        }).catch(() => {})
      )
    }
    if (mods.includes('team')) {
      calls.push(
        api.get(`/events/${eventId}/team`).then((r) => {
          if (Array.isArray(r?.data)) replaceForEvent(teamMembers, eventId, r.data)
        }).catch(() => {})
      )
    }
    if (mods.includes('feedback') || mods.includes('surveys')) {
      calls.push(
        api.get(`/events/${eventId}/surveys`).then((r) => {
          if (Array.isArray(r?.data)) replaceForEvent(surveys, eventId, r.data)
        }).catch(() => {})
      )
    }

    await Promise.all(calls)
  }

  async function fetchMyTickets() {
    if (!localStorage.getItem('terra_access_token')) {
      myTickets.value = []
      return
    }
    const res = await api.get('/tickets/my')
    if (Array.isArray(res?.data)) {
      myTickets.value = res.data
    }
  }

  async function fetchMyOrders() {
    if (!localStorage.getItem('terra_access_token')) {
      myOrders.value = []
      return
    }
    const res = await api.get('/orders/my')
    if (Array.isArray(res?.data)) {
      myOrders.value = res.data
    }
  }

  async function cancelMyOrder(orderId) {
    const res = await api.post(`/orders/${orderId}/cancel`)
    await Promise.all([fetchMyTickets(), fetchMyOrders()])
    return res?.data
  }

  async function fetchAdminWorkspace() {
    if (!localStorage.getItem('terra_access_token')) return
    const [dash, usersRes, orgsRes, verRes, evtsRes, catsRes, repsRes] = await Promise.all([
      api.get('/admin/dashboard'),
      api.get('/admin/users'),
      api.get('/admin/organizations'),
      api.get('/admin/verifications'),
      api.get('/admin/events'),
      api.get('/admin/categories'),
      api.get('/admin/reports')
    ])
    if (dash?.data) adminDashboard.value = dash.data
    if (Array.isArray(usersRes?.data)) adminUsers.value = usersRes.data
    if (Array.isArray(orgsRes?.data)) organizations.value = orgsRes.data
    if (Array.isArray(verRes?.data)) adminVerifications.value = verRes.data
    if (Array.isArray(evtsRes?.data)) events.value = evtsRes.data
    if (Array.isArray(catsRes?.data)) categories.value = catsRes.data
    if (Array.isArray(repsRes?.data)) adminReports.value = repsRes.data
  }

  // ---------------- MODULES ENGINE ----------------
  function isModuleEnabled(eventId, moduleKey) {
    const evt = events.value.find((e) => e.id === eventId)
    if (!evt) return false
    return (evt.enabled_modules || []).includes(moduleKey)
  }

  function hasPermission(eventId, perm) {
    if (!perm) return true
    const evt = events.value.find((e) => e.id === eventId)
    if (!evt) return false
    if (!Array.isArray(evt.my_permissions)) return true
    return evt.my_permissions.includes(perm)
  }

  async function toggleModule(eventId, moduleKey) {
    const evt = events.value.find((e) => e.id === eventId)
    if (!evt) return { ok: false, message: 'Event tidak ditemukan.' }

    const mod = MODULE_CATALOG.find((m) => m.key === moduleKey)
    if (!mod) return { ok: false, message: 'Modul tidak dikenali.' }
    const willEnable = !(evt.enabled_modules || []).includes(moduleKey)

    try {
      const res = await api.patch(`/events/${eventId}/modules/${moduleKey}`, {
        enabled: willEnable
      })
      if (Array.isArray(res?.data?.enabled_modules)) {
        evt.enabled_modules = res.data.enabled_modules
      }
      if (willEnable) {
        fetchEventWorkspace(eventId)
      }
      return {
        ok: true,
        enabled: willEnable,
        message: res?.message || (willEnable ? `Modul ${mod.name} diaktifkan.` : `Modul ${mod.name} dinonaktifkan.`)
      }
    } catch (err) {
      return { ok: false, message: err?.message || 'Gagal mengubah konfigurasi modul.' }
    }
  }

  // ---------------- FINANCE ENGINE ----------------
  function getPaidTicketBreakdown(eventId) {
    const evt = events.value.find((e) => e.id === eventId)
    if (!evt) return []
    return (evt.ticket_types || [])
      .filter((t) => Number(t.price) > 0)
      .map((t) => ({
        id: t.id,
        name: t.name,
        price: Number(t.price),
        sold: Number(t.sold_quantity) || 0,
        revenue: (Number(t.price) || 0) * (Number(t.sold_quantity) || 0)
      }))
  }

  function getPaidTicketRevenue(eventId) {
    return getPaidTicketBreakdown(eventId).reduce((sum, t) => sum + t.revenue, 0)
  }

  async function addFinanceRecord(eventId, type, payload) {
    const endpoint =
      type === 'income'
        ? `/events/${eventId}/finance/incomes`
        : `/events/${eventId}/finance/expenses`
    const res = await api.post(endpoint, {
      ...payload,
      amount: Number(payload.amount)
    })
    const created = res?.data
    if (created) {
      if (type === 'income') finance.value.incomes.unshift(created)
      else finance.value.expenses.unshift(created)
    }
    return created
  }

  async function setEventBudget(eventId, amount) {
    const res = await api.post(`/events/${eventId}/finance/budgets`, {
      amount: Number(amount || 0)
    })
    finance.value.budget = Number(res?.data?.amount ?? amount ?? 0)
    return res?.data || { event_id: eventId, amount: finance.value.budget }
  }

  async function updateFinanceRecord(type, id, patch) {
    const path = type === 'income' ? `/finance/incomes/${id}` : `/finance/expenses/${id}`
    const payload = { ...patch }
    if (payload.amount !== undefined) payload.amount = Number(payload.amount)
    const res = await api.patch(path, payload)
    const list = type === 'income' ? finance.value.incomes : finance.value.expenses
    const idx = list.findIndex((item) => item.id === id)
    if (idx !== -1 && res?.data) {
      list[idx] = { ...list[idx], ...res.data }
    }
    return res?.data || null
  }

  async function deleteFinanceRecord(type, id) {
    const path = type === 'income' ? `/finance/incomes/${id}` : `/finance/expenses/${id}`
    await api.delete(path)
    if (type === 'income') {
      finance.value.incomes = finance.value.incomes.filter((item) => item.id !== id)
    } else {
      finance.value.expenses = finance.value.expenses.filter((item) => item.id !== id)
    }
  }

  // ---------------- ORGANIZATIONS & EVENTS ----------------
  async function createOrganization(payload) {
    const res = await api.post('/organizations', payload)
    if (res?.data) {
      organizations.value.unshift(res.data)
      return res.data
    }
    return null
  }

  async function updateOrganization(orgId, payload) {
    const res = await api.patch(`/organizations/${orgId}`, payload)
    if (res?.data) {
      upsertListItem(organizations, res.data)
      return res.data
    }
    return null
  }

  async function deleteOrganization(orgId) {
    await api.delete(`/organizations/${orgId}`)
    organizations.value = organizations.value.filter((o) => o.id !== orgId)
  }

  async function requestOrgVerification(orgId, docs = []) {
    const res = await api.post(`/organizations/${orgId}/verification`, { documents: docs })
    const org = organizations.value.find((o) => o.id === orgId)
    if (org && org.verification_status !== 'verified') {
      org.verification_status = 'pending'
    }
    return res?.data || null
  }

  async function fetchOrgMembers(orgId) {
    const res = await api.get(`/organizations/${orgId}/members`)
    const list = Array.isArray(res?.data) ? res.data : []
    const org = organizations.value.find((o) => o.id === orgId)
    if (org) {
      org.members = list
      org.member_count = list.length
    }
    return list
  }

  async function addOrgMember(orgId, payload) {
    const res = await api.post(`/organizations/${orgId}/members`, payload)
    const org = organizations.value.find((o) => o.id === orgId)
    if (org && res?.data) {
      if (!Array.isArray(org.members)) org.members = []
      org.members.push(res.data)
      org.member_count = org.members.length
    }
    return res?.data || null
  }

  async function updateOrgMember(orgId, memberId, patch) {
    const res = await api.patch(`/organizations/${orgId}/members/${memberId}`, patch)
    const org = organizations.value.find((o) => o.id === orgId)
    if (org?.members && res?.data) {
      const m = org.members.find((item) => item.id === memberId)
      if (m) Object.assign(m, res.data)
    }
    return res?.data || null
  }

  async function removeOrgMember(orgId, memberId) {
    await api.delete(`/organizations/${orgId}/members/${memberId}`)
    const org = organizations.value.find((o) => o.id === orgId)
    if (org?.members) {
      org.members = org.members.filter((m) => m.id !== memberId)
      org.member_count = org.members.length
    }
  }

  async function createEvent(payload) {
    const res = await api.post('/events', payload)
    if (res?.data) {
      events.value.unshift(res.data)
      activeEventId.value = res.data.id
      return res.data
    }
    return null
  }

  async function duplicateEvent(eventId) {
    const res = await api.post(`/events/${eventId}/duplicate`)
    if (res?.data) {
      events.value.unshift(res.data)
      return res.data
    }
    return null
  }

  async function updateEventProfile(eventId, payload) {
    const res = await api.patch(`/events/${eventId}`, payload)
    if (res?.data) {
      upsertListItem(events, res.data)
      return res.data
    }
    return null
  }

  async function deleteEvent(eventId) {
    await api.delete(`/events/${eventId}`)
    events.value = events.value.filter((e) => e.id !== eventId)
    if (activeEventId.value === eventId) {
      activeEventId.value = events.value[0]?.id || ''
    }
  }

  async function submitEventReview(eventId) {
    const res = await api.post(`/events/${eventId}/submit-review`)
    if (res?.data) upsertListItem(events, res.data)
    return res?.data || null
  }

  async function publishEvent(eventId) {
    const res = await api.post(`/events/${eventId}/publish`)
    if (res?.data) upsertListItem(events, res.data)
    return res?.data || null
  }

  async function unpublishEvent(eventId) {
    const res = await api.post(`/events/${eventId}/unpublish`)
    if (res?.data) upsertListItem(events, res.data)
    return res?.data || null
  }

  // ---------------- TASKS & TIMELINE ----------------
  async function addTask(payload) {
    const eventId = payload.event_id || activeEventId.value
    const res = await api.post(`/events/${eventId}/tasks`, payload)
    if (res?.data) {
      tasks.value.push(res.data)
      return res.data
    }
    return null
  }

  async function updateTask(taskId, patch) {
    const res = await api.patch(`/tasks/${taskId}`, patch)
    const task = tasks.value.find((t) => t.id === taskId)
    if (task) {
      if (task.is_group && patch.shift_days) {
        const delta = Number(patch.shift_days)
        const addDays = (str) => {
          const d = new Date(str.slice(0, 10) + 'T00:00:00')
          d.setDate(d.getDate() + delta)
          return d.toISOString().slice(0, 10)
        }
        tasks.value.forEach((child) => {
          if (child.parent_id === task.id) {
            if (child.start_date) child.start_date = addDays(child.start_date)
            const dueStr = child.due_at || child.due_date
            if (dueStr) {
              const nextDue = addDays(dueStr)
              child.due_at = nextDue
              child.due_date = nextDue
            }
          }
        })
      }
      if (res?.data) {
        Object.assign(task, res.data)
      }
    }
    return task || res?.data
  }

  async function deleteTask(taskId) {
    await api.delete(`/tasks/${taskId}`)
    tasks.value = tasks.value.filter((t) => t.id !== taskId && t.parent_id !== taskId)
  }

  // ---------------- TICKETING, PARTICIPANTS & ORDERS ----------------
  async function addTicketType(eventId, payload) {
    const evt = events.value.find((e) => e.id === eventId)
    const res = await api.post(`/events/${eventId}/ticket-types`, payload)
    if (res?.data && evt) {
      if (!Array.isArray(evt.ticket_types)) evt.ticket_types = []
      evt.ticket_types.push(res.data)
      return res.data
    }
    return null
  }

  async function toggleTicketTypeStatus(tkt) {
    const nextStatus = tkt.status === 'On Sale' ? 'Disabled' : 'On Sale'
    await api.patch(`/ticket-types/${tkt.id}`, { status: nextStatus })
    tkt.status = nextStatus
    return tkt
  }

  async function updateTicketType(ticketTypeId, patch) {
    const res = await api.patch(`/ticket-types/${ticketTypeId}`, patch)
    if (res?.data) {
      events.value.forEach((evt) => {
        if (Array.isArray(evt.ticket_types)) {
          const t = evt.ticket_types.find((item) => item.id === ticketTypeId)
          if (t) Object.assign(t, res.data)
        }
      })
      return res.data
    }
    return null
  }

  async function deleteTicketType(ticketTypeId) {
    await api.delete(`/ticket-types/${ticketTypeId}`)
    events.value.forEach((evt) => {
      if (Array.isArray(evt.ticket_types)) {
        evt.ticket_types = evt.ticket_types.filter((item) => item.id !== ticketTypeId)
      }
    })
  }

  async function addManualParticipant(eventId, { full_name, email, phone, ticket_type }) {
    const res = await api.post(`/events/${eventId}/participants`, {
      full_name,
      email,
      phone,
      ticket_type
    })
    if (res?.data) {
      const created = {
        ...res.data.participant,
        ticket_code: res.data.ticket?.ticket_code || res.data.participant?.ticket_code,
        ticket_type: res.data.participant?.ticket_type || ticket_type
      }
      participants.value.unshift(created)
      if (res.data.ticket) {
        myTickets.value.unshift(res.data.ticket)
      }
      return created
    }
    return null
  }

  async function updateParticipant(participantId, patch) {
    const res = await api.patch(`/participants/${participantId}`, patch)
    const item = participants.value.find((p) => p.id === participantId)
    if (item && res?.data) {
      Object.assign(item, res.data)
    }
    return res?.data || item
  }

  async function deleteParticipant(participantId) {
    await api.delete(`/participants/${participantId}`)
    participants.value = participants.value.filter((p) => p.id !== participantId)
  }

  async function placeOrder({ eventId, ticketTypeId, quantity, attendee }) {
    const res = await api.post('/orders', {
      event_id: eventId,
      ticket_type_id: ticketTypeId,
      quantity,
      attendee: {
        full_name: attendee.full_name,
        email: attendee.email,
        phone: attendee.phone,
        ...(attendee.registration_data ? { registration_data: attendee.registration_data } : {})
      }
    })

    const data = res?.data
    const issued = data?.tickets || []
    if (issued.length) {
      myTickets.value.unshift(...issued)
    }

    const evt = events.value.find((e) => e.id === eventId)
    const tt = evt?.ticket_types?.find((t) => t.id === ticketTypeId)
    if (tt) {
      tt.sold_quantity = Number(tt.sold_quantity || 0) + Number(quantity)
    }

    return {
      orderId: data?.order?.id || null,
      orderNumber: data?.order?.order_number,
      orderStatus: data?.order?.order_status || 'Confirmed',
      paymentStatus: data?.order?.payment_status || 'Not Required',
      total: data?.order?.total || 0,
      currency: data?.order?.currency || 'IDR',
      order: data?.order || null,
      tickets: issued,
      payment: data?.payment || null,
      emailStatus: data?.email_status || null,
      emailNotification: data?.email_notification || data?.email_status || null
    }
  }

  async function downloadQrPdfFromEndpoint(urlPath, fallbackFilename) {
    const rawBase = api.defaults.baseURL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1'
    const baseUrl = String(rawBase).replace(/\/+$/, '')
    const token = localStorage.getItem('terra_access_token') || localStorage.getItem('terra_demo_token')
    let targetUrl = urlPath.startsWith('http') ? urlPath : `${baseUrl}${urlPath}`
    if (urlPath.startsWith('http') && baseUrl.startsWith('http')) {
      try {
        const parsed = new URL(urlPath)
        const apiOrigin = new URL(baseUrl).origin
        if (parsed.origin !== apiOrigin && parsed.pathname.startsWith('/api/v1')) {
          targetUrl = `${apiOrigin}${parsed.pathname}${parsed.search}`
        }
      } catch {
        // Keep original URL
      }
    }
    const headers = token ? { Authorization: `Bearer ${token}` } : {}
    const res = await fetch(targetUrl, { headers })
    if (!res.ok) {
      throw new Error('Gagal mengunduh file PDF QR dari server.')
    }
    const blob = await res.blob()
    const blobUrl = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = blobUrl
    link.download = fallbackFilename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(blobUrl)
  }

  async function downloadTicketQrPdf(ticket) {
    if (ticket?.pdf_download_url) {
      return downloadQrPdfFromEndpoint(ticket.pdf_download_url, `tiket-qr-${ticket.ticket_code || 'ticket'}.pdf`)
    }
    return downloadQrPdfFromEndpoint(`/tickets/${ticket.id}/qr-pdf`, `tiket-qr-${ticket.ticket_code || 'ticket'}.pdf`)
  }

  async function downloadOrderQrPdf(orderId, orderNumber, pdfDownloadUrl = '') {
    if (pdfDownloadUrl) {
      return downloadQrPdfFromEndpoint(pdfDownloadUrl, `tiket-qr-${orderNumber || orderId}.pdf`)
    }
    return downloadQrPdfFromEndpoint(`/orders/${orderId}/qr-pdf`, `tiket-qr-${orderNumber || orderId}.pdf`)
  }

  // ---------------- CHECK-IN VALIDATION ----------------
  async function checkInTicket(codeOrQr, station = 'Gate A - Main Lobby', eventId = null) {
    try {
      const res = await api.post('/tickets/check-in', {
        code: codeOrQr,
        station,
        ...(eventId ? { event_id: eventId } : {})
      })
      const data = res?.data
      if (data?.checkin) {
        checkinLogs.value.unshift({
          id: data.checkin.id,
          event_id: data.checkin.event_id,
          ticket_code: data.ticket?.ticket_code || codeOrQr,
          participant_name: data.participant?.full_name || data.ticket?.participant_name || 'Peserta',
          ticket_type: data.participant?.ticket_type || data.ticket?.ticket_type || 'Tiket Event',
          station: data.checkin.checkin_location || data.checkin.station || station,
          checked_in_at: data.checkin.checked_in_at
        })
      }
      const p = participants.value.find(
        (x) => x.ticket_code === (data?.ticket?.ticket_code || codeOrQr)
      )
      if (p) p.checked_in = true
      const mt = myTickets.value.find(
        (t) => t.ticket_code === (data?.ticket?.ticket_code || codeOrQr)
      )
      if (mt) mt.status = 'Used'
      return {
        success: true,
        ok: true,
        status: 'SUCCESS',
        participant: data?.participant || {
          full_name: data?.ticket?.participant_name || 'Peserta',
          ticket_type: data?.ticket?.ticket_type,
          ticket_code: data?.ticket?.ticket_code
        },
        ticket: data?.ticket,
        checkin: data?.checkin,
        message: res?.message || 'Check-in berhasil! Peserta diizinkan masuk.'
      }
    } catch (err) {
      return {
        success: false,
        ok: false,
        status: err?.code || 'ERROR',
        message: err?.message || 'Tiket tidak valid.'
      }
    }
  }

  // ---------------- OPERATIONS (VENDORS, SPONSORS, DOCS) & TEAM ----------------
  async function addVendor(eventId, payload) {
    const res = await api.post(`/events/${eventId}/vendors`, payload)
    if (res?.data) {
      vendors.value.unshift(res.data)
      return res.data
    }
    return null
  }

  async function updateVendor(vendorId, patch) {
    const res = await api.patch(`/vendors/${vendorId}`, patch)
    const item = vendors.value.find((v) => v.id === vendorId)
    if (item && res?.data) Object.assign(item, res.data)
    return res?.data || item
  }

  async function deleteVendor(vendorId) {
    await api.delete(`/vendors/${vendorId}`)
    vendors.value = vendors.value.filter((v) => v.id !== vendorId)
  }

  async function addSponsor(eventId, payload) {
    const res = await api.post(`/events/${eventId}/sponsors`, payload)
    if (res?.data) {
      sponsors.value.unshift(res.data)
      return res.data
    }
    return null
  }

  async function updateSponsor(sponsorId, patch) {
    const res = await api.patch(`/sponsors/${sponsorId}`, patch)
    const item = sponsors.value.find((s) => s.id === sponsorId)
    if (item && res?.data) Object.assign(item, res.data)
    return res?.data || item
  }

  async function deleteSponsor(sponsorId) {
    await api.delete(`/sponsors/${sponsorId}`)
    sponsors.value = sponsors.value.filter((s) => s.id !== sponsorId)
  }

  async function uploadMedia(file, { folder = 'general', bucketType = 'media' } = {}) {
    if (!file) throw new Error('File tidak ditemukan.')
    const formData = new FormData()
    formData.append('file', file)
    formData.append('folder', folder)
    formData.append('bucket_type', bucketType)
    const res = await api.post('/media/upload', formData)
    return res?.data
  }

  async function addDocument(eventId, payload) {
    let res
    if (payload?.file instanceof File) {
      const formData = new FormData()
      formData.append('file', payload.file)
      if (payload.category) formData.append('category', payload.category)
      if (payload.visibility) formData.append('visibility', payload.visibility)
      if (payload.file_name) formData.append('file_name', payload.file_name)
      res = await api.post(`/events/${eventId}/documents`, formData)
    } else {
      res = await api.post(`/events/${eventId}/documents`, payload)
    }
    if (res?.data) {
      documents.value.unshift(res.data)
      return res.data
    }
    return null
  }

  async function downloadDocument(doc) {
    const res = await api.get(`/documents/${doc.id}/download`)
    return res?.data?.signed_url || null
  }

  async function deleteDocument(docId) {
    await api.delete(`/documents/${docId}`)
    documents.value = documents.value.filter((d) => d.id !== docId)
  }

  async function fetchSurveys(eventId) {
    const res = await api.get(`/events/${eventId}/surveys`)
    if (Array.isArray(res?.data)) {
      replaceForEvent(surveys, eventId, res.data)
      return res.data
    }
    return []
  }

  async function createSurvey(eventId, payload) {
    const res = await api.post(`/events/${eventId}/surveys`, payload)
    if (res?.data) {
      surveys.value.unshift(res.data)
      return res.data
    }
    return null
  }

  async function inviteTeamMember(eventId, payload) {
    const res = await api.post(`/events/${eventId}/team`, payload)
    const data = res?.data
    const member = data?.member || data
    if (member) {
      teamMembers.value.push(member)
    }
    return {
      member,
      invite_url: data?.invite_url || null,
      email_status: data?.email_status || null,
      message: res?.message || 'Undangan anggota panitia berhasil dibuat.'
    }
  }

  async function updateTeamMember(eventId, memberId, patch) {
    const res = await api.patch(`/events/${eventId}/team/${memberId}`, patch)
    const member = teamMembers.value.find((m) => m.id === memberId)
    if (member && res?.data) {
      Object.assign(member, res.data)
    }
    return member
  }

  async function removeTeamMember(eventId, memberId) {
    await api.delete(`/events/${eventId}/team/${memberId}`)
    teamMembers.value = teamMembers.value.filter((m) => m.id !== memberId)
  }

  // ---------------- ADMIN MODERATION, VERIFICATION, CATEGORIES, USERS ----------------
  async function updateModeration(eventId, action) {
    const res = await api.post(`/admin/events/${eventId}/${action}`, {
      notes: `Moderated as ${action}`
    })
    if (res?.data?.event) {
      upsertListItem(events, res.data.event)
    }
  }

  async function reviewVerification(idOrOrgId, status, notes = '') {
    const res = await api.post(`/admin/verifications/${idOrOrgId}/review`, { status, notes })
    if (res?.data?.organization) {
      upsertListItem(organizations, res.data.organization)
    }
    if (res?.data?.verification) {
      upsertListItem(adminVerifications, res.data.verification)
    }
    return res?.data
  }

  async function createCategory(payload) {
    const res = await api.post('/admin/categories', payload)
    if (res?.data) {
      categories.value.push(res.data)
      return res.data
    }
    return null
  }

  async function deleteCategory(categoryId) {
    await api.delete(`/admin/categories/${categoryId}`)
    categories.value = categories.value.filter((c) => c.id !== categoryId)
  }

  async function toggleUserStatus(user) {
    const nextSuspended = !user.is_suspended
    const res = await api.patch(`/admin/users/${user.id}/status`, {
      is_suspended: nextSuspended
    })
    if (res?.data) {
      Object.assign(user, res.data)
    }
    return user
  }

  async function createAdminOrganizer(payload) {
    const res = await api.post('/admin/organizers', payload)
    const data = res?.data
    if (data?.organizer) {
      adminUsers.value.unshift(data.organizer)
    }
    if (data?.organization) {
      organizations.value.unshift(data.organization)
    }
    return data
  }

  async function updateOrganizerSubscription(organizerId, payload) {
    const res = await api.patch(`/admin/organizers/${organizerId}/subscription`, payload)
    const target = adminUsers.value.find((u) => u.id === organizerId)
    if (target && res?.data) {
      Object.assign(target, res.data)
    }
    return res?.data
  }

  async function fetchCompanionPosts(slugOrId) {
    const res = await api.get(`/marketplace/events/${slugOrId}/companions`)
    return Array.isArray(res?.data) ? res.data : []
  }

  async function createCompanionPost(slugOrId, payload) {
    const res = await api.post(`/marketplace/events/${slugOrId}/companions`, payload)
    return res?.data || null
  }

  async function updateCompanionPost(postId, payload) {
    const res = await api.patch(`/marketplace/companions/${postId}`, payload)
    return res?.data || null
  }

  async function deleteCompanionPost(postId) {
    const res = await api.delete(`/marketplace/companions/${postId}`)
    return res?.data || null
  }

  async function replyCompanionPost(postId, message) {
    const res = await api.post(`/marketplace/companions/${postId}/replies`, { message })
    return res?.data || null
  }

  // ---------------- TERRA PRICING, ENTITLEMENTS & BILLING ----------------
  async function fetchPricingCatalog() {
    const res = await api.get('/pricing/catalog')
    return res?.data || null
  }

  async function previewBillingCheckout(payload) {
    const res = await api.post('/pricing/preview', payload)
    return res?.data || null
  }

  async function fetchEventEntitlement(eventId) {
    const res = await api.get(`/events/${eventId}/subscription`)
    const evt = events.value.find((e) => e.id === eventId)
    if (evt && res?.data) evt.entitlement = res.data
    return res?.data || null
  }

  async function activateEventTrial(eventId) {
    const res = await api.post(`/events/${eventId}/subscription/trial`)
    const evt = events.value.find((e) => e.id === eventId)
    if (evt && res?.data) evt.entitlement = res.data
    return res?.data || null
  }

  async function applyBundleCreditToEvent(eventId, bundleCreditId) {
    const res = await api.post(`/events/${eventId}/subscription/apply-bundle`, { bundle_credit_id: bundleCreditId })
    const evt = events.value.find((e) => e.id === eventId)
    if (evt && res?.data) evt.entitlement = res.data
    return res?.data || null
  }

  async function downgradeEventPlan(eventId, planCode) {
    const res = await api.post(`/events/${eventId}/subscription/downgrade`, { plan_code: planCode })
    const evt = events.value.find((e) => e.id === eventId)
    if (evt && res?.data) evt.entitlement = res.data
    return res?.data || null
  }

  async function fetchOrganizerBillingHistory() {
    const res = await api.get('/billing/transactions')
    return res?.data || { transactions: [], bundle_credits: [], audit_logs: [] }
  }

  async function createBillingCheckout(payload) {
    const res = await api.post('/billing/checkout', payload)
    return res?.data || null
  }

  async function subscribeOrganizerMonthly({ forceNew = false, organizationId = null } = {}) {
    const res = await api.post('/billing/subscribe', {
      organization_id: organizationId || organizations.value?.[0]?.id || null,
      force_new: forceNew
    })
    return res?.data || null
  }

  async function uploadBillingProof(txId, file, paymentNotes = '') {
    const formData = new FormData()
    formData.append('file', file)
    if (paymentNotes) formData.append('payment_notes', paymentNotes)
    const res = await api.post(`/billing/transactions/${txId}/proof`, formData)
    return res?.data || null
  }

  async function fetchAdminPricingOverview() {
    const res = await api.get('/admin/pricing/overview')
    return res?.data || null
  }

  async function adminUpdatePricingPlan(code, patch) {
    const res = await api.patch(`/admin/pricing/plans/${code}`, patch)
    return res?.data || null
  }

  async function adminSaveBundle(payload) {
    const res = await api.post('/admin/pricing/bundles', payload)
    return res?.data || null
  }

  async function adminSavePromo(payload) {
    const res = await api.post('/admin/pricing/promos', payload)
    return res?.data || null
  }

  async function adminVerifyBillingTransaction(txId, payload) {
    const res = await api.post(`/admin/billing/transactions/${txId}/verify`, payload)
    return res?.data || null
  }

  async function fetchOrderDetail(orderId) {
    const res = await api.get(`/orders/${orderId}`)
    if (res?.data) upsertListItem(myOrders, res.data)
    return res?.data || null
  }

  async function fetchOrderTickets(orderId) {
    const res = await api.get(`/orders/${orderId}/tickets`)
    const list = Array.isArray(res?.data) ? res.data : []
    list.forEach((tk) => upsertListItem(myTickets, tk))
    return list
  }

  // ---------------- MIDTRANS PAYMENT GATEWAY ----------------
  async function fetchPaymentConfig() {
    const res = await api.get('/payments/config')
    return res?.data || null
  }

  async function createOrderSnapToken(orderId, { forceNew = false } = {}) {
    const res = await api.post(`/payments/orders/${orderId}/snap-token`, { force_new: forceNew })
    return res?.data || null
  }

  async function syncOrderPaymentStatus(orderId) {
    const res = await api.post(`/payments/orders/${orderId}/sync`)
    const data = res?.data || null
    if (data?.order) {
      upsertListItem(myOrders, data.order)
      upsertListItem(eventOrders, data.order)
    }
    if (Array.isArray(data?.tickets)) {
      data.tickets.forEach((tk) => upsertListItem(myTickets, tk))
    }
    return data
  }

  async function createBillingSnapToken(txId, { forceNew = false } = {}) {
    const res = await api.post(`/payments/billing/${txId}/snap-token`, { force_new: forceNew })
    return res?.data || null
  }

  async function syncBillingPaymentStatus(txId) {
    const res = await api.post(`/payments/billing/${txId}/sync`)
    return res?.data || null
  }

  // ---------------- ORDERS, PAYMENT PROOF, REPORTS, LOGS, SURVEYS, NOTIFICATIONS ----------------
  async function fetchEventOrders(eventId) {
    const res = await api.get(`/events/${eventId}/orders`)
    const list = Array.isArray(res?.data) ? res.data : []
    replaceForEvent(eventOrders, eventId, list)
    return list
  }

  async function verifyOrderPayment(eventId, orderId) {
    const res = await api.post(`/events/${eventId}/orders/${orderId}/verify-payment`)
    const data = res?.data
    if (data?.order) upsertListItem(eventOrders, data.order)
    return data
  }

  async function submitOrderPaymentProof(orderId, { file = null, payment_proof_url = '', payment_notes = '' } = {}) {
    let res
    if (file instanceof File) {
      const formData = new FormData()
      formData.append('file', file)
      if (payment_notes) formData.append('payment_notes', payment_notes)
      res = await api.post(`/orders/${orderId}/payment-proof`, formData)
    } else {
      res = await api.post(`/orders/${orderId}/payment-proof`, {
        payment_proof_url,
        payment_notes
      })
    }
    if (res?.data) upsertListItem(myOrders, res.data)
    return res?.data || null
  }

  async function fetchEventActivityLogs(eventId) {
    const res = await api.get(`/events/${eventId}/activity-logs`)
    const list = Array.isArray(res?.data) ? res.data : []
    eventActivityLogs.value = list
    return list
  }

  async function fetchEventReports(eventId) {
    const res = await api.get(`/events/${eventId}/reports`)
    if (res?.data) eventReport.value = res.data
    return res?.data || null
  }

  async function fetchPublicSurveys(slugOrId) {
    const res = await api.get(`/marketplace/events/${slugOrId}/surveys`)
    return Array.isArray(res?.data) ? res.data : []
  }

  async function submitSurveyResponse(surveyId, answers) {
    const res = await api.post(`/surveys/${surveyId}/responses`, { answers })
    return res?.data || null
  }

  async function reportPublicEvent(eventId, payload) {
    const res = await api.post(`/marketplace/events/${eventId}/report`, payload)
    return res?.data || null
  }

  async function adminRequestRevision(eventId, notes = '') {
    const res = await api.post(`/admin/events/${eventId}/request-revision`, { notes })
    if (res?.data?.event) upsertListItem(events, res.data.event)
    return res?.data || null
  }

  async function fetchAdminOrders() {
    const res = await api.get('/admin/orders')
    if (Array.isArray(res?.data)) adminOrders.value = res.data
    return adminOrders.value
  }

  async function updateAdminReportStatus(reportId, status) {
    const res = await api.patch(`/admin/reports/${reportId}`, { status })
    if (res?.data) upsertListItem(adminReports, res.data)
    return res?.data || null
  }

  async function fetchNotifications() {
    if (!localStorage.getItem('terra_access_token')) return []
    const res = await api.get('/notifications')
    if (Array.isArray(res?.data)) notifications.value = res.data
    return notifications.value
  }

  async function markNotificationRead(id) {
    const res = await api.patch(`/notifications/${id}/read`)
    if (res?.data) upsertListItem(notifications, res.data)
    return res?.data || null
  }

  async function forgotPassword(email) {
    const res = await api.post('/auth/forgot-password', { email })
    return res?.data || null
  }

  async function resetPassword(payload) {
    const res = await api.post('/auth/reset-password', payload)
    return res?.data || null
  }

  return {
    organizations,
    events,
    categories,
    myTickets,
    myOrders,
    participants,
    tasks,
    finance,
    vendors,
    sponsors,
    documents,
    surveys,
    teamMembers,
    checkinLogs,
    adminDashboard,
    adminUsers,
    adminVerifications,
    adminReports,
    adminOrders,
    notifications,
    eventOrders,
    eventActivityLogs,
    eventReport,
    loading,
    apiConnected,
    supabaseStatus,
    activeEventId,
    activeEvent,
    setActiveEvent,
    checkBackendHealth,
    fetchMarketplace,
    fetchEventPublic,
    fetchOrganizerWorkspace,
    fetchEventWorkspace,
    fetchMyTickets,
    fetchMyOrders,
    cancelMyOrder,
    fetchAdminWorkspace,
    isModuleEnabled,
    hasPermission,
    toggleModule,
    getPaidTicketBreakdown,
    getPaidTicketRevenue,
    addFinanceRecord,
    setEventBudget,
    updateFinanceRecord,
    deleteFinanceRecord,
    createOrganization,
    updateOrganization,
    deleteOrganization,
    requestOrgVerification,
    fetchOrgMembers,
    addOrgMember,
    updateOrgMember,
    removeOrgMember,
    createEvent,
    duplicateEvent,
    updateEventProfile,
    deleteEvent,
    submitEventReview,
    publishEvent,
    unpublishEvent,
    addTask,
    updateTask,
    deleteTask,
    addTicketType,
    toggleTicketTypeStatus,
    updateTicketType,
    deleteTicketType,
    addManualParticipant,
    updateParticipant,
    deleteParticipant,
    placeOrder,
    downloadTicketQrPdf,
    downloadOrderQrPdf,
    checkInTicket,
    addVendor,
    updateVendor,
    deleteVendor,
    addSponsor,
    updateSponsor,
    deleteSponsor,
    uploadMedia,
    addDocument,
    downloadDocument,
    deleteDocument,
    fetchSurveys,
    createSurvey,
    inviteTeamMember,
    updateTeamMember,
    removeTeamMember,
    updateModeration,
    reviewVerification,
    createCategory,
    deleteCategory,
    toggleUserStatus,
    createAdminOrganizer,
    updateOrganizerSubscription,
    fetchCompanionPosts,
    createCompanionPost,
    updateCompanionPost,
    deleteCompanionPost,
    replyCompanionPost,
    fetchPricingCatalog,
    previewBillingCheckout,
    fetchEventEntitlement,
    activateEventTrial,
    applyBundleCreditToEvent,
    downgradeEventPlan,
    fetchOrganizerBillingHistory,
    createBillingCheckout,
    subscribeOrganizerMonthly,
    uploadBillingProof,
    fetchOrderDetail,
    fetchOrderTickets,
    fetchPaymentConfig,
    createOrderSnapToken,
    syncOrderPaymentStatus,
    createBillingSnapToken,
    syncBillingPaymentStatus,
    fetchAdminPricingOverview,
    adminUpdatePricingPlan,
    adminSaveBundle,
    adminSavePromo,
    adminVerifyBillingTransaction,
    fetchEventOrders,
    verifyOrderPayment,
    submitOrderPaymentProof,
    fetchEventActivityLogs,
    fetchEventReports,
    fetchPublicSurveys,
    submitSurveyResponse,
    reportPublicEvent,
    adminRequestRevision,
    fetchAdminOrders,
    updateAdminReportStatus,
    fetchNotifications,
    markNotificationRead,
    forgotPassword,
    resetPassword
  }
})

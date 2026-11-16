import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '@/services/api'
import {
  MOCK_EVENTS,
  MOCK_ORGANIZATIONS,
  MOCK_TICKETS,
  MOCK_PARTICIPANTS,
  MOCK_TASKS,
  MOCK_FINANCE,
  MODULE_CATALOG
} from '@/services/mockData'

export const useEventWorkspaceStore = defineStore('eventWorkspace', () => {
  const organizations = ref(structuredClone(MOCK_ORGANIZATIONS))
  const events = ref(structuredClone(MOCK_EVENTS))
  const myTickets = ref(structuredClone(MOCK_TICKETS))
  const participants = ref(structuredClone(MOCK_PARTICIPANTS))
  const tasks = ref(structuredClone(MOCK_TASKS))
  const finance = ref(structuredClone(MOCK_FINANCE))
  const vendors = ref([
    { id: 'v-1', event_id: 'evt-1', name: 'Nusantara AV Production', category: 'Audio & LED Stage', contact: '0812-8899-1122', value: 'Rp 12.500.000', status: 'Confirmed' },
    { id: 'v-2', event_id: 'evt-1', name: 'Prima Catering Service', category: 'F&B & Konsumsi VIP', contact: '0813-4455-6677', value: 'Rp 6.500.000', status: 'Confirmed' },
    { id: 'v-3', event_id: 'evt-1', name: 'Karya Cetak Nusantara', category: 'Lanyard & Backdrop', contact: '0819-1122-3344', value: 'Rp 4.200.000', status: 'Pending' }
  ])
  const sponsors = ref([
    { id: 's-1', event_id: 'evt-1', name: 'CloudTech Indonesia', tier: 'Platinum Sponsor', contribution: 'Rp 45.000.000', pic: 'Aditya (Head of DevRel)', status: 'Confirmed' },
    { id: 's-2', event_id: 'evt-1', name: 'DevPay Gateway', tier: 'Gold Sponsor', contribution: 'Rp 20.000.000', pic: 'Dina (Brand Lead)', status: 'Pending' }
  ])
  const documents = ref([
    { id: 'd-1', event_id: 'evt-1', file_name: 'Proposal_Sponsorship_Summit_2026.pdf', category: 'Sponsorship', visibility: 'Internal', size: '2.4 MB', updated: '2026-11-10' },
    { id: 'd-2', event_id: 'evt-1', file_name: 'Layout_Denah_Hall_B_JCC.pdf', category: 'Operasional', visibility: 'Internal', size: '4.8 MB', updated: '2026-11-12' },
    { id: 'd-3', event_id: 'evt-1', file_name: 'Perjanjian_Kerjasama_AV.docx', category: 'Legal & Vendor', visibility: 'Internal', size: '540 KB', updated: '2026-11-14' }
  ])
  const teamMembers = ref([
    { id: 'tm-1', event_id: 'evt-1', name: 'Hikam Pratama', email: 'hikam@example.com', role: 'Owner', department: 'Executive Core', permissions: ['View Event', 'Edit Event', 'Manage Timeline', 'Manage Tickets', 'View Participants', 'Manage Check-in', 'View Finance', 'Manage Team'] },
    { id: 'tm-2', event_id: 'evt-1', name: 'Rina Kusuma', email: 'rina@example.com', role: 'Manager', department: 'Program & Timeline', permissions: ['View Event', 'Manage Timeline', 'View Participants'] },
    { id: 'tm-3', event_id: 'evt-1', name: 'Budi Santoso', email: 'budi@example.com', role: 'Staff', department: 'Gate & Check-in Desk', permissions: ['View Event', 'Manage Check-in'] }
  ])

  const checkinLogs = ref([
    {
      id: 'chk-1',
      event_id: 'evt-1',
      ticket_code: 'EVT26-3310-XY',
      participant_name: 'Nadia Putri',
      ticket_type: 'Community Free Pass',
      station: 'Gate A - Main Lobby',
      checked_in_at: '08:42 WIB'
    },
    {
      id: 'chk-2',
      event_id: 'evt-1',
      ticket_code: 'EVT26-4402-MN',
      participant_name: 'Siti Rahmawati',
      ticket_type: 'VIP Executive Pass',
      station: 'Gate B - VIP Lounge',
      checked_in_at: '08:55 WIB'
    }
  ])

  const apiConnected = ref(false)
  const supabaseStatus = ref({ configured: false, connected: false, mode: 'checking' })
  const activeEventId = ref('evt-1')

  const activeEvent = computed(() =>
    events.value.find((e) => e.id === activeEventId.value) || events.value[0]
  )

  function setActiveEvent(eventId) {
    activeEventId.value = eventId
  }

  function mergeById(localList, remoteList) {
    if (!Array.isArray(remoteList) || remoteList.length === 0) return localList
    const map = new Map(localList.map((item) => [item.id, item]))
    remoteList.forEach((remote) => {
      map.set(remote.id, { ...(map.get(remote.id) || {}), ...remote })
    })
    return Array.from(map.values())
  }

  // ---------------- BACKEND SYNC HYDRATION ----------------
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
    try {
      const [evtRes, orgRes] = await Promise.all([
        api.get('/marketplace/events', { params: { limit: 50 } }),
        api.get('/marketplace/organizers')
      ])
      apiConnected.value = true
      if (Array.isArray(orgRes?.data) && orgRes.data.length) {
        organizations.value = mergeById(organizations.value, orgRes.data)
      }
      if (Array.isArray(evtRes?.data) && evtRes.data.length) {
        events.value = mergeById(events.value, evtRes.data)
      }
    } catch {
      // Backend unreachable -> stay with local seed data
    }
  }

  async function fetchOrganizerWorkspace() {
    try {
      const [evtRes, orgRes] = await Promise.all([
        api.get('/events'),
        api.get('/organizations')
      ])
      apiConnected.value = true
      if (Array.isArray(orgRes?.data) && orgRes.data.length) {
        organizations.value = orgRes.data
      }
      if (Array.isArray(evtRes?.data) && evtRes.data.length) {
        events.value = evtRes.data
      }
    } catch {
      // Unauthenticated or backend unreachable
    }
  }

  async function fetchEventWorkspace(eventId) {
    if (!eventId) return
    activeEventId.value = eventId
    try {
      const evtRes = await api.get(`/events/${eventId}`)
      apiConnected.value = true
      if (evtRes?.data) {
        const idx = events.value.findIndex((e) => e.id === eventId)
        if (idx !== -1) events.value[idx] = { ...events.value[idx], ...evtRes.data }
        else events.value.unshift(evtRes.data)
      }

      const evt = events.value.find((e) => e.id === eventId)
      const mods = evt?.enabled_modules || []
      const calls = []

      if (mods.includes('timeline') || mods.includes('tasks')) {
        calls.push(
          api.get(`/events/${eventId}/tasks`).then((r) => {
            if (Array.isArray(r?.data)) {
              const others = tasks.value.filter((t) => t.event_id !== eventId)
              tasks.value = [...r.data, ...others]
            }
          }).catch(() => {})
        )
      }
      if (mods.includes('ticketing')) {
        calls.push(
          api.get(`/events/${eventId}/ticket-types`).then((r) => {
            if (Array.isArray(r?.data) && evt) evt.ticket_types = r.data
          }).catch(() => {})
        )
      }
      if (mods.includes('participants')) {
        calls.push(
          api.get(`/events/${eventId}/participants`).then((r) => {
            if (Array.isArray(r?.data)) {
              const others = participants.value.filter((p) => p.event_id !== eventId)
              participants.value = [...r.data, ...others]
            }
          }).catch(() => {})
        )
      }
      if (mods.includes('check_in')) {
        calls.push(
          api.get(`/events/${eventId}/check-ins`).then((r) => {
            if (Array.isArray(r?.data)) {
              const others = checkinLogs.value.filter((c) => c.event_id !== eventId)
              checkinLogs.value = [...r.data, ...others]
            }
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
            if (sum?.data?.budget !== undefined) finance.value.budget = sum.data.budget
            if (Array.isArray(inc?.data)) finance.value.incomes = inc.data
            if (Array.isArray(exp?.data)) finance.value.expenses = exp.data
          }).catch(() => {})
        )
      }
      if (mods.includes('vendors')) {
        calls.push(
          api.get(`/events/${eventId}/vendors`).then((r) => {
            if (Array.isArray(r?.data)) {
              const others = vendors.value.filter((v) => v.event_id !== eventId)
              vendors.value = [...r.data, ...others]
            }
          }).catch(() => {})
        )
      }
      if (mods.includes('sponsors')) {
        calls.push(
          api.get(`/events/${eventId}/sponsors`).then((r) => {
            if (Array.isArray(r?.data)) {
              const others = sponsors.value.filter((s) => s.event_id !== eventId)
              sponsors.value = [...r.data, ...others]
            }
          }).catch(() => {})
        )
      }
      if (mods.includes('documents')) {
        calls.push(
          api.get(`/events/${eventId}/documents`).then((r) => {
            if (Array.isArray(r?.data)) {
              const others = documents.value.filter((d) => d.event_id !== eventId)
              documents.value = [...r.data, ...others]
            }
          }).catch(() => {})
        )
      }
      if (mods.includes('team')) {
        calls.push(
          api.get(`/events/${eventId}/team`).then((r) => {
            if (Array.isArray(r?.data)) {
              const others = teamMembers.value.filter((m) => m.event_id !== eventId)
              teamMembers.value = [...r.data, ...others]
            }
          }).catch(() => {})
        )
      }

      await Promise.all(calls)
    } catch {
      // Offline / unauthenticated fallback
    }
  }

  async function fetchMyTickets() {
    try {
      const res = await api.get('/tickets/my')
      apiConnected.value = true
      if (Array.isArray(res?.data) && res.data.length) {
        myTickets.value = res.data
      }
    } catch {
      // Stay with local tickets
    }
  }

  // ---------------- MODULE ENGINE ----------------
  function isModuleEnabled(eventId, moduleKey) {
    const evt = events.value.find((e) => e.id === eventId)
    if (!evt) return false
    return evt.enabled_modules.includes(moduleKey)
  }

  async function toggleModule(eventId, moduleKey) {
    const evt = events.value.find((e) => e.id === eventId)
    if (!evt) return { ok: false, message: 'Event tidak ditemukan.' }

    const mod = MODULE_CATALOG.find((m) => m.key === moduleKey)
    if (!mod) return { ok: false, message: 'Modul tidak valid.' }
    if (mod.isCore) return { ok: false, message: 'Event Profile wajib aktif.' }

    const nextEnabled = !evt.enabled_modules.includes(moduleKey)

    try {
      const res = await api.patch(`/events/${eventId}/modules/${moduleKey}`, {
        is_enabled: nextEnabled
      })
      if (res?.data?.enabled_modules) {
        evt.enabled_modules = res.data.enabled_modules
      }
      return {
        ok: true,
        enabled: nextEnabled,
        message: nextEnabled
          ? `Modul ${mod.name} diaktifkan.`
          : `Modul ${mod.name} dinonaktifkan. Data historis tetap tersimpan.`
      }
    } catch (err) {
      if (err?.code && err.code !== 'NETWORK_ERROR') {
        return { ok: false, message: err.message }
      }
      // Fallback local toggle when offline
      if (nextEnabled) {
        const missingDeps = mod.dependsOn.filter((dep) => !evt.enabled_modules.includes(dep))
        if (missingDeps.length > 0) {
          return {
            ok: false,
            message: `Modul ini membutuhkan modul: ${missingDeps.join(', ')} untuk diaktifkan terlebih dahulu.`
          }
        }
        evt.enabled_modules.push(moduleKey)
        return { ok: true, enabled: true, message: `Modul ${mod.name} diaktifkan.` }
      } else {
        const dependents = MODULE_CATALOG.filter((m) => m.dependsOn.includes(moduleKey)).map((m) => m.key)
        evt.enabled_modules = evt.enabled_modules.filter(
          (k) => k !== moduleKey && !dependents.includes(k)
        )
        return {
          ok: true,
          enabled: false,
          message: `Modul ${mod.name} dinonaktifkan. Data historis tetap tersimpan.`
        }
      }
    }
  }

  // ---------------- FINANCE HELPERS ----------------
  function getPaidTicketBreakdown(eventId) {
    const evt = events.value.find((e) => e.id === eventId)
    if (!evt) return []
    return (evt.ticket_types || [])
      .filter((t) => Number(t.price) > 0)
      .map((t) => ({
        id: t.id,
        name: t.name,
        price: Number(t.price),
        sold_quantity: Number(t.sold_quantity),
        revenue: Number(t.price) * Number(t.sold_quantity)
      }))
  }

  function getPaidTicketRevenue(eventId) {
    return getPaidTicketBreakdown(eventId).reduce((sum, item) => sum + item.revenue, 0)
  }

  async function addFinanceRecord(eventId, type, payload) {
    const endpoint = type === 'income'
      ? `/events/${eventId}/finance/incomes`
      : `/events/${eventId}/finance/expenses`
    try {
      const res = await api.post(endpoint, payload)
      if (res?.data) {
        if (type === 'income') finance.value.incomes.unshift(res.data)
        else finance.value.expenses.unshift(res.data)
        return res.data
      }
    } catch {
      // Offline fallback
    }
    const item = {
      id: 'tx-' + Date.now(),
      event_id: eventId,
      ...payload,
      date: payload.date || new Date().toISOString().slice(0, 10)
    }
    if (type === 'income') finance.value.incomes.unshift(item)
    else finance.value.expenses.unshift(item)
    return item
  }

  // ---------------- ORGANIZATIONS & EVENTS CRUD ----------------
  async function createOrganization(payload) {
    try {
      const res = await api.post('/organizations', payload)
      if (res?.data) {
        organizations.value.unshift(res.data)
        return res.data
      }
    } catch {
      // Fallback
    }
    const org = {
      id: 'org-' + Date.now(),
      ...payload,
      logo_url: 'https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=200&q=80',
      cover_url: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200&q=80',
      verification_status: 'pending',
      member_count: 1,
      event_count: 0
    }
    organizations.value.unshift(org)
    return org
  }

  async function createEvent(payload) {
    try {
      const res = await api.post('/events', payload)
      if (res?.data) {
        events.value.unshift(res.data)
        activeEventId.value = res.data.id
        return res.data
      }
    } catch {
      // Fallback
    }
    const newEvt = {
      id: 'evt-' + Date.now(),
      organization_id: payload.organization_id || organizations.value[0].id,
      organization: organizations.value.find((o) => o.id === payload.organization_id) || organizations.value[0],
      ...payload,
      status: 'Draft',
      publication_status: 'Published',
      is_featured: false,
      enabled_modules: ['event_profile', 'timeline', 'tasks', 'ticketing', 'participants'],
      ticket_types: [],
      schedules: [],
      speakers: []
    }
    events.value.unshift(newEvt)
    activeEventId.value = newEvt.id
    return newEvt
  }

  async function duplicateEvent(eventId) {
    try {
      const res = await api.post(`/events/${eventId}/duplicate`)
      if (res?.data) {
        events.value.unshift(res.data)
        return res.data
      }
    } catch {
      // Fallback
    }
    const source = events.value.find((e) => e.id === eventId)
    if (!source) return null
    const copy = JSON.parse(JSON.stringify(source))
    copy.id = 'evt-' + Date.now()
    copy.title = `${source.title} (Copy)`
    copy.slug = `${source.slug}-copy-${Math.floor(100 + Math.random() * 900)}`
    copy.status = 'Draft'
    copy.publication_status = 'Unpublished'
    copy.ticket_types = (copy.ticket_types || []).map((t) => ({ ...t, id: 'tkt-' + Math.random(), sold_quantity: 0 }))
    events.value.unshift(copy)
    return copy
  }

  async function updateEventProfile(eventId, payload) {
    try {
      const res = await api.patch(`/events/${eventId}`, payload)
      if (res?.data) {
        const idx = events.value.findIndex((e) => e.id === eventId)
        if (idx !== -1) events.value[idx] = { ...events.value[idx], ...res.data }
        return events.value[idx]
      }
    } catch {
      // Offline fallback
    }
    const idx = events.value.findIndex((e) => e.id === eventId)
    if (idx === -1) return null
    events.value[idx] = {
      ...events.value[idx],
      ...payload
    }
    return events.value[idx]
  }

  // ---------------- TASKS & TIMELINE ----------------
  async function addTask(payload) {
    const eventId = payload.event_id || activeEventId.value
    try {
      const res = await api.post(`/events/${eventId}/tasks`, payload)
      if (res?.data) {
        tasks.value.push(res.data)
        return res.data
      }
    } catch {
      // Fallback
    }
    const task = {
      id: (payload.parent_id ? 'tsk-' : 'chk-') + Date.now(),
      event_id: eventId,
      is_group: !payload.parent_id,
      due_at: payload.due_date || payload.due_at || '2026-12-01',
      ...payload
    }
    tasks.value.push(task)
    return task
  }

  async function updateTask(taskId, patch) {
    try {
      await api.patch(`/tasks/${taskId}`, patch)
    } catch {
      // Offline fallback
    }
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
      const cleanPatch = { ...patch }
      delete cleanPatch.shift_days
      if (cleanPatch.due_date && !cleanPatch.due_at) cleanPatch.due_at = cleanPatch.due_date
      if (cleanPatch.due_at && !cleanPatch.due_date) cleanPatch.due_date = cleanPatch.due_at
      Object.assign(task, cleanPatch)
    }
    return task
  }

  async function deleteTask(taskId) {
    try {
      await api.delete(`/tasks/${taskId}`)
    } catch {
      // Offline fallback
    }
    tasks.value = tasks.value.filter((t) => t.id !== taskId && t.parent_id !== taskId)
  }

  // ---------------- TICKETING, PARTICIPANTS & ORDERS ----------------
  async function addTicketType(eventId, payload) {
    const evt = events.value.find((e) => e.id === eventId)
    try {
      const res = await api.post(`/events/${eventId}/ticket-types`, payload)
      if (res?.data && evt) {
        evt.ticket_types.push(res.data)
        return res.data
      }
    } catch {
      // Fallback
    }
    const item = {
      id: 'tkt-' + Date.now(),
      event_id: eventId,
      currency: 'IDR',
      sold_quantity: 0,
      min_per_order: 1,
      max_per_order: 3,
      status: 'On Sale',
      ...payload
    }
    if (evt) evt.ticket_types.push(item)
    return item
  }

  async function toggleTicketTypeStatus(tkt) {
    const nextStatus = tkt.status === 'On Sale' ? 'Disabled' : 'On Sale'
    try {
      await api.patch(`/ticket-types/${tkt.id}`, { status: nextStatus })
    } catch {
      // Offline fallback
    }
    tkt.status = nextStatus
    return tkt
  }

  async function addManualParticipant(eventId, { full_name, email, phone, ticket_type }) {
    try {
      const res = await api.post(`/events/${eventId}/participants`, {
        full_name,
        email,
        phone,
        ticket_type
      })
      if (res?.data) {
        participants.value.unshift(res.data)
        return res.data
      }
    } catch {
      // Fallback
    }
    const code = `EVT26-${Math.floor(1000 + Math.random() * 9000)}-${Math.random().toString(36).substring(2, 4).toUpperCase()}`
    const p = {
      id: 'pt-' + Date.now(),
      event_id: eventId,
      full_name,
      email,
      phone,
      ticket_type: ticket_type || 'Manual Registration',
      ticket_code: code,
      order_number: 'MAN-' + Math.floor(10000 + Math.random() * 90000),
      registration_status: 'Confirmed',
      checked_in: false
    }
    participants.value.unshift(p)
    return p
  }

  async function placeOrder({ eventId, ticketTypeId, quantity, attendee }) {
    try {
      const res = await api.post('/orders', {
        event_id: eventId,
        ticket_type_id: ticketTypeId,
        quantity,
        attendee
      })
      if (res?.data) {
        const { order, participant, tickets: created } = res.data
        if (Array.isArray(created) && created.length) {
          myTickets.value.unshift(...created)
        }
        if (participant) participants.value.unshift(participant)
        const evt = events.value.find((e) => e.id === eventId)
        const tkt = evt?.ticket_types?.find((t) => t.id === ticketTypeId)
        if (tkt) {
          tkt.sold_quantity += quantity
          if (tkt.sold_quantity >= tkt.quantity) tkt.status = 'Sold Out'
        }
        return { orderNumber: order.order_number, tickets: created }
      }
    } catch (err) {
      if (err?.code && err.code !== 'NETWORK_ERROR') {
        throw new Error(err.message)
      }
    }

    // Offline fallback
    const evt = events.value.find((e) => e.id === eventId)
    if (!evt) throw new Error('Event tidak ditemukan.')
    const tkt = evt.ticket_types.find((t) => t.id === ticketTypeId)
    if (!tkt) throw new Error('Jenis tiket tidak ditemukan.')
    const remaining = tkt.quantity - tkt.sold_quantity
    if (remaining < quantity) throw new Error('Kuota tiket tidak mencukupi.')

    tkt.sold_quantity += quantity
    if (tkt.sold_quantity >= tkt.quantity) tkt.status = 'Sold Out'

    const orderNumber = 'ORD-' + new Date().toISOString().slice(0, 10).replace(/-/g, '') + '-' + Math.floor(100 + Math.random() * 900)
    const createdTickets = []

    for (let i = 0; i < quantity; i++) {
      const code = `EVT26-${Math.floor(1000 + Math.random() * 9000)}-${Math.random().toString(36).substring(2, 4).toUpperCase()}`
      const ticketObj = {
        id: 'tc-' + Date.now() + '-' + i,
        ticket_code: code,
        qr_payload: `TERRA:${code}:${evt.id}`,
        event_id: evt.id,
        event_title: evt.title,
        event_date: evt.start_at,
        location: evt.location_name,
        ticket_type: tkt.name,
        participant_name: attendee.full_name,
        participant_email: attendee.email,
        order_number: orderNumber,
        status: 'Active'
      }
      myTickets.value.unshift(ticketObj)
      createdTickets.push(ticketObj)
      participants.value.unshift({
        id: 'pt-' + Date.now() + '-' + i,
        event_id: evt.id,
        full_name: attendee.full_name,
        email: attendee.email,
        phone: attendee.phone,
        ticket_type: tkt.name,
        ticket_code: code,
        order_number: orderNumber,
        registration_status: 'Confirmed',
        checked_in: false
      })
    }

    return { orderNumber, tickets: createdTickets }
  }

  async function checkInTicket(codeOrQr, station = 'Gate A - Main Lobby') {
    try {
      const res = await api.post('/tickets/check-in', {
        code: codeOrQr,
        station
      })
      if (res?.data?.ticket) {
        const tk = res.data.ticket
        const participant = participants.value.find((p) => p.ticket_code === tk.ticket_code)
        if (participant) participant.checked_in = true
        const myTk = myTickets.value.find((t) => t.ticket_code === tk.ticket_code)
        if (myTk) myTk.status = 'Used'
        if (res.data.checkin) {
          checkinLogs.value.unshift(res.data.checkin)
        }
        return {
          success: true,
          ok: true,
          status: 'SUCCESS',
          participant: participant || { full_name: tk.participant_name },
          message: res.message || `Check-in berhasil: ${tk.participant_name}`
        }
      }
    } catch (err) {
      if (err?.code && err.code !== 'NETWORK_ERROR') {
        return { success: false, ok: false, status: err.code, message: err.message }
      }
    }

    // Offline fallback
    const cleanCode = codeOrQr.includes('TERRA:') ? codeOrQr.split(':')[1] : codeOrQr.trim()
    const participant = participants.value.find((p) => p.ticket_code.toUpperCase() === cleanCode.toUpperCase())
    if (!participant) {
      return { success: false, ok: false, status: 'INVALID', message: `Tiket "${cleanCode}" tidak ditemukan.` }
    }
    if (participant.checked_in) {
      return {
        success: false,
        ok: false,
        status: 'DUPLICATE',
        message: `Tiket ${participant.ticket_code} (${participant.full_name}) sudah digunakan sebelumnya.`
      }
    }
    participant.checked_in = true
    const ticket = myTickets.value.find((t) => t.ticket_code === participant.ticket_code)
    if (ticket) ticket.status = 'Used'
    const timeStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB'
    checkinLogs.value.unshift({
      id: 'chk-' + Date.now(),
      ticket_code: participant.ticket_code,
      participant_name: participant.full_name,
      ticket_type: participant.ticket_type,
      station,
      checked_in_at: timeStr
    })
    return {
      success: true,
      ok: true,
      status: 'SUCCESS',
      participant,
      message: `Check-in berhasil: ${participant.full_name} (${participant.ticket_type}) di ${station}.`
    }
  }

  // ---------------- OPERATIONS, TEAM & ADMIN ----------------
  async function addVendor(eventId, payload) {
    try {
      const res = await api.post(`/events/${eventId}/vendors`, payload)
      if (res?.data) {
        vendors.value.unshift(res.data)
        return res.data
      }
    } catch {
      // Fallback
    }
    const item = { id: 'v-' + Date.now(), event_id: eventId, ...payload }
    vendors.value.unshift(item)
    return item
  }

  async function inviteTeamMember(eventId, payload) {
    try {
      const res = await api.post(`/events/${eventId}/team`, payload)
      if (res?.data) {
        teamMembers.value.push(res.data)
        return res.data
      }
    } catch {
      // Fallback
    }
    const member = {
      id: 'tm-' + Date.now(),
      event_id: eventId,
      permissions: payload.role === 'Staff' ? ['View Event', 'Manage Check-in'] : ['View Event', 'Edit Event', 'Manage Timeline'],
      ...payload
    }
    teamMembers.value.push(member)
    return member
  }

  async function updateTeamMember(eventId, memberId, patch) {
    try {
      await api.patch(`/events/${eventId}/team/${memberId}`, patch)
    } catch {
      // Fallback
    }
    const member = teamMembers.value.find((m) => m.id === memberId)
    if (member) Object.assign(member, patch)
    return member
  }

  async function removeTeamMember(eventId, memberId) {
    try {
      await api.delete(`/events/${eventId}/team/${memberId}`)
    } catch {
      // Fallback
    }
    teamMembers.value = teamMembers.value.filter((m) => m.id !== memberId)
  }

  async function updateModeration(eventId, action) {
    try {
      await api.post(`/admin/events/${eventId}/${action}`, { notes: `Moderated as ${action}` })
    } catch {
      // Fallback
    }
    const evt = events.value.find((e) => e.id === eventId)
    if (!evt) return
    if (action === 'approve') {
      evt.publication_status = 'Published'
      evt.status = 'Published'
    } else if (action === 'reject') {
      evt.publication_status = 'Rejected'
    } else if (action === 'suspend') {
      evt.publication_status = 'Suspended'
    }
  }

  return {
    organizations,
    events,
    myTickets,
    participants,
    tasks,
    finance,
    vendors,
    sponsors,
    documents,
    teamMembers,
    checkinLogs,
    apiConnected,
    supabaseStatus,
    activeEventId,
    activeEvent,
    setActiveEvent,
    checkBackendHealth,
    fetchMarketplace,
    fetchOrganizerWorkspace,
    fetchEventWorkspace,
    fetchMyTickets,
    isModuleEnabled,
    toggleModule,
    getPaidTicketBreakdown,
    getPaidTicketRevenue,
    addFinanceRecord,
    createOrganization,
    createEvent,
    duplicateEvent,
    updateEventProfile,
    addTask,
    updateTask,
    deleteTask,
    addTicketType,
    toggleTicketTypeStatus,
    addManualParticipant,
    placeOrder,
    checkInTicket,
    addVendor,
    inviteTeamMember,
    updateTeamMember,
    removeTeamMember,
    updateModeration
  }
})

<script setup>
import { computed, ref, reactive, onBeforeUnmount } from 'vue'
import { useRoute } from 'vue-router'
import { useEventWorkspaceStore } from '@/stores/eventWorkspace'
import { useToastStore } from '@/stores/toast'
import {
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  X,
  Trash2
} from 'lucide-vue-next'

const route = useRoute()
const store = useEventWorkspaceStore()
const toast = useToastStore()

// Toolbar State
const searchQuery = ref('')
const selectedGroup = ref('All')
const viewMode = ref('Mingguan')
const showCriticalPath = ref(false)
const showBaseline = ref(true)
const showModal = ref(false)
const scrollContainerRef = ref(null)

// Expand/Collapse state
const collapsedIds = reactive(new Set())

const currentEvent = computed(
  () => store.events.find((e) => e.id === route.params.eventId) || store.activeEvent
)
const todayIso = new Date().toISOString().slice(0, 10)
const BASE_START_DATE = computed(() => {
  const eventTasks = store.tasks.filter((t) => !t.event_id || t.event_id === route.params.eventId)
  const dates = eventTasks
    .map((t) => (t.start_date || t.due_at || t.due_date || '').slice(0, 10))
    .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d))
  if (dates.length) {
    dates.sort()
    const dt = new Date(dates[0] + 'T00:00:00Z')
    dt.setUTCDate(dt.getUTCDate() - 3)
    return dt.toISOString().slice(0, 10)
  }
  const evtStart = currentEvent.value?.start_at?.slice(0, 10)
  if (evtStart) {
    const dt = new Date(evtStart + 'T00:00:00Z')
    dt.setUTCDate(dt.getUTCDate() - 21)
    return dt.toISOString().slice(0, 10)
  }
  return todayIso
})
const timelineOffsetDays = ref(0)
const totalTimelineDays = 63
const todayMarkerDate = todayIso

// Create Modal Form
const newTitle = ref('')
const newParentId = ref('')
const newPhase = ref('Pre-Event')
const newAssignedTo = ref('Tim Event')
const newStartDate = ref('2026-11-05')
const newDueDate = ref('2026-11-12')
const newProgress = ref(0)

// Edit Modal State
const editingTask = ref(null)
const editForm = reactive({
  title: '',
  phase: 'Pre-Event',
  assigned_to: '',
  start_date: '',
  due_date: '',
  status: 'To Do',
  priority: 'Medium',
  progress: 0
})

// Drag / Resize State
const dragState = ref(null)
const panState = ref(null)

const phases = ['All', 'Pre-Event', 'Marketing', 'Production', 'Event Day', 'Post-Event']
const statusOptions = ['To Do', 'In Progress', 'Review', 'Done']
const priorityOptions = ['Low', 'Medium', 'High']

function parseUtcDate(isoStr) {
  const [y, m, d] = (isoStr || BASE_START_DATE.value).slice(0, 10).split('-').map(Number)
  return new Date(Date.UTC(y, (m || 1) - 1, d || 1))
}

function addDaysIso(isoStr, days) {
  const dt = parseUtcDate(isoStr)
  dt.setUTCDate(dt.getUTCDate() + days)
  return dt.toISOString().slice(0, 10)
}

function diffDaysIso(fromIso, toIso) {
  return Math.round((parseUtcDate(toIso).getTime() - parseUtcDate(fromIso).getTime()) / (1000 * 60 * 60 * 24))
}

function formatShortIdDate(isoStr) {
  if (!isoStr) return ''
  return parseUtcDate(isoStr).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    timeZone: 'UTC'
  })
}

const timelineStartIso = computed(() => addDaysIso(BASE_START_DATE.value, timelineOffsetDays.value))

const todayPercent = computed(() => {
  const diffDays = diffDaysIso(timelineStartIso.value, todayMarkerDate)
  return (diffDays / totalTimelineDays) * 100
})

const isTodayVisible = computed(() => todayPercent.value >= 0 && todayPercent.value <= 100)

const timelineHeaders = computed(() => {
  const weeks = []
  for (let w = 0; w < 9; w++) {
    const weekStartIso = addDaysIso(timelineStartIso.value, w * 7)
    const weekStartDate = parseUtcDate(weekStartIso)
    const monthName = weekStartDate.toLocaleDateString('id-ID', {
      month: 'short',
      year: '2-digit',
      timeZone: 'UTC'
    })
    const days = []
    for (let d = 0; d < 7; d++) {
      const isoDate = addDaysIso(weekStartIso, d)
      days.push({
        dayNum: parseUtcDate(isoDate).getUTCDate(),
        fullDate: isoDate,
        isToday: isoDate === todayMarkerDate
      })
    }
    weeks.push({
      weekNum: `M${w + 1} • ${monthName}`,
      days
    })
  }
  return weeks
})

function computeBarCoords(startIso, dueIso) {
  const diffStart = diffDaysIso(timelineStartIso.value, startIso)
  const duration = Math.max(1, diffDaysIso(startIso, dueIso) + 1)
  const rawLeft = (diffStart / totalTimelineDays) * 100
  const rawWidth = (duration / totalTimelineDays) * 100
  const clippedLeft = Math.max(0, rawLeft)
  const visibleEnd = Math.min(100, rawLeft + rawWidth)
  const clippedWidth = Math.max(0, visibleEnd - clippedLeft)
  return {
    leftPercent: clippedLeft,
    widthPercent: clippedWidth,
    isVisible: visibleEnd > 0 && rawLeft < 100
  }
}

const allTasks = computed(() => {
  const eventId = route.params.eventId
  return store.tasks
    .filter((task) => !task.event_id || !eventId || task.event_id === eventId)
    .map((task) => {
      let startIso = (task.start_date || '2026-11-01').slice(0, 10)
      let dueIso = (task.due_date || task.due_at || startIso).slice(0, 10)

      if (dragState.value && dragState.value.taskId === task.id) {
        startIso = dragState.value.currentStart
        dueIso = dragState.value.currentDue
      }

      const coords = computeBarCoords(startIso, dueIso)
      return {
        ...task,
        effectiveStart: startIso,
        effectiveDue: dueIso,
        isParent: !task.parent_id,
        leftPercent: coords.leftPercent,
        widthPercent: Math.max(coords.isVisible ? 2.2 : 0, coords.widthPercent),
        isBarVisible: coords.isVisible
      }
    })
})

const filteredTasks = computed(() => {
  let list = allTasks.value

  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase()
    list = list.filter((t) => (t.title || '').toLowerCase().includes(q))
  }

  if (selectedGroup.value !== 'All') {
    list = list.filter((t) => t.phase === selectedGroup.value)
  }

  return list.filter((t) => {
    if (!t.parent_id) return true
    return !collapsedIds.has(t.parent_id)
  })
})

const allParentsCollapsed = computed(() => {
  const parents = allTasks.value.filter((t) => t.isParent)
  return parents.length > 0 && parents.every((p) => collapsedIds.has(p.id))
})

function toggleCollapse(id) {
  if (collapsedIds.has(id)) {
    collapsedIds.delete(id)
  } else {
    collapsedIds.add(id)
  }
}

function toggleAllHierarchy() {
  const parents = allTasks.value.filter((t) => t.isParent)
  if (allParentsCollapsed.value) {
    collapsedIds.clear()
  } else {
    parents.forEach((p) => collapsedIds.add(p.id))
  }
}

function shiftWindow(days) {
  timelineOffsetDays.value += days
}

function focusToday() {
  timelineOffsetDays.value = 0
  if (scrollContainerRef.value) {
    const el = scrollContainerRef.value
    const target = (el.scrollWidth - 280) * (todayPercent.value / 100)
    el.scrollTo({ left: Math.max(0, target - 120), behavior: 'smooth' })
  }
}

function cycleViewMode() {
  viewMode.value = viewMode.value === 'Mingguan' ? 'Padat' : 'Mingguan'
}

// Click-to-edit modal
function openEditModal(task) {
  editingTask.value = task
  editForm.title = task.title || ''
  editForm.phase = task.phase || 'Pre-Event'
  editForm.assigned_to = task.assigned_to || ''
  editForm.start_date = (task.start_date || '2026-11-01').slice(0, 10)
  editForm.due_date = (task.due_date || task.due_at || editForm.start_date).slice(0, 10)
  editForm.status = task.status || 'To Do'
  editForm.priority = task.priority || 'Medium'
  editForm.progress = Number(task.progress) || 0
}

async function saveEditModal() {
  if (!editingTask.value || !editForm.title.trim()) return
  const startIso = editForm.start_date
  const dueIso = editForm.due_date < startIso ? startIso : editForm.due_date

  await store.updateTask(editingTask.value.id, {
    title: editForm.title.trim(),
    phase: editForm.phase,
    assigned_to: editForm.assigned_to.trim(),
    start_date: startIso,
    due_at: dueIso,
    due_date: dueIso,
    status: editForm.status,
    priority: editForm.priority,
    progress: Number(editForm.progress) || 0
  })

  toast.success(`Agenda "${editForm.title.trim()}" berhasil diperbarui`)
  editingTask.value = null
}

async function deleteEditingTask() {
  if (!editingTask.value) return
  const title = editingTask.value.title
  await store.deleteTask(editingTask.value.id)
  toast.success(`Agenda "${title}" dihapus`)
  editingTask.value = null
}

// Drag & Resize Bar Interaction
function startBarInteraction(event, task, mode) {
  if (event.button !== 0) return
  const trackEl = event.currentTarget.closest('[data-gantt-track]')
  const trackWidth = trackEl ? trackEl.getBoundingClientRect().width : 800
  const initStart = (task.start_date || '2026-11-01').slice(0, 10)
  const initDue = (task.due_date || task.due_at || initStart).slice(0, 10)

  dragState.value = {
    task,
    taskId: task.id,
    mode,
    startX: event.clientX,
    trackWidth: Math.max(200, trackWidth),
    initStart,
    initDue,
    currentStart: initStart,
    currentDue: initDue,
    deltaDays: 0,
    didMove: false
  }

  window.addEventListener('pointermove', onBarPointerMove)
  window.addEventListener('pointerup', onBarPointerUp)
}

function onBarPointerMove(event) {
  const st = dragState.value
  if (!st) return
  const dx = event.clientX - st.startX
  if (Math.abs(dx) > 4) {
    st.didMove = true
  }

  const deltaDays = Math.round((dx / st.trackWidth) * totalTimelineDays)
  if (deltaDays === st.deltaDays) return
  st.deltaDays = deltaDays

  if (st.mode === 'move') {
    st.currentStart = addDaysIso(st.initStart, deltaDays)
    st.currentDue = addDaysIso(st.initDue, deltaDays)
  } else if (st.mode === 'resize-left') {
    const candidate = addDaysIso(st.initStart, deltaDays)
    st.currentStart = candidate > st.initDue ? st.initDue : candidate
  } else if (st.mode === 'resize-right') {
    const candidate = addDaysIso(st.initDue, deltaDays)
    st.currentDue = candidate < st.initStart ? st.initStart : candidate
  }
}

async function onBarPointerUp() {
  window.removeEventListener('pointermove', onBarPointerMove)
  window.removeEventListener('pointerup', onBarPointerUp)

  const st = dragState.value
  dragState.value = null
  if (!st) return

  if (!st.didMove) {
    openEditModal(st.task)
    return
  }

  if (st.currentStart === st.initStart && st.currentDue === st.initDue) {
    return
  }

  const patch = {
    start_date: st.currentStart,
    due_at: st.currentDue,
    due_date: st.currentDue
  }

  if (st.mode === 'move' && st.task.isParent && st.deltaDays !== 0) {
    patch.shift_days = st.deltaDays
  }

  await store.updateTask(st.taskId, patch)
  toast.success(
    `Jadwal "${st.task.title}" diperbarui: ${formatShortIdDate(st.currentStart)} → ${formatShortIdDate(st.currentDue)}`
  )
}

// Drag-to-pan empty Gantt area horizontally
function startTrackPan(event) {
  if (event.button !== 0) return
  if (event.target.closest('[data-gantt-bar]')) return
  const scroller = scrollContainerRef.value
  if (!scroller) return

  panState.value = {
    startX: event.clientX,
    initScrollLeft: scroller.scrollLeft,
    initOffsetDays: timelineOffsetDays.value,
    canScrollX: scroller.scrollWidth > scroller.clientWidth + 4
  }
  window.addEventListener('pointermove', onTrackPanMove)
  window.addEventListener('pointerup', onTrackPanUp)
}

function onTrackPanMove(event) {
  const ps = panState.value
  const scroller = scrollContainerRef.value
  if (!ps || !scroller) return
  const dx = event.clientX - ps.startX
  if (ps.canScrollX) {
    scroller.scrollLeft = ps.initScrollLeft - dx
  } else {
    const deltaDays = Math.round((-dx / Math.max(400, scroller.clientWidth)) * 28)
    timelineOffsetDays.value = ps.initOffsetDays + deltaDays
  }
}

function onTrackPanUp() {
  panState.value = null
  window.removeEventListener('pointermove', onTrackPanMove)
  window.removeEventListener('pointerup', onTrackPanUp)
}

onBeforeUnmount(() => {
  window.removeEventListener('pointermove', onBarPointerMove)
  window.removeEventListener('pointerup', onBarPointerUp)
  window.removeEventListener('pointermove', onTrackPanMove)
  window.removeEventListener('pointerup', onTrackPanUp)
})

async function handleCreateTask() {
  if (!newTitle.value.trim()) {
    toast.error('Judul agenda/tugas wajib diisi')
    return
  }

  await store.addTask({
    event_id: route.params.eventId,
    title: newTitle.value.trim(),
    phase: newPhase.value,
    parent_id: newParentId.value || null,
    is_group: !newParentId.value,
    assigned_to: newAssignedTo.value,
    start_date: newStartDate.value,
    due_at: newDueDate.value,
    due_date: newDueDate.value,
    progress: Number(newProgress.value) || 0,
    status: 'To Do',
    priority: 'Medium'
  })

  toast.success('Agenda / tugas baru berhasil ditambahkan')
  showModal.value = false
  newTitle.value = ''
}
</script>

<template>
  <div class="w-full flex-1 min-h-0 flex flex-col bg-white overflow-hidden select-none">
    <!-- Full-Bleed Top Header & Toolbar -->
    <div class="px-4 sm:px-6 py-3.5 bg-[#fafaf9] border-b border-black flex flex-col xl:flex-row xl:items-center justify-between gap-3 shrink-0">
      <div>
        <span class="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
          JADWAL &amp; PANITIA
        </span>
        <div class="flex items-center gap-3">
          <h1 class="text-2xl sm:text-3xl font-bold tracking-tight text-black font-editorial leading-tight">
            Timeline Acara
          </h1>
          <span class="hidden sm:inline-block rounded-full border border-black bg-white px-2.5 py-0.5 text-[10px] font-medium text-slate-600">
            Klik atau geser bar untuk ubah jadwal
          </span>
        </div>
      </div>

      <!-- Full Toolbar -->
      <div class="flex flex-wrap items-center gap-2">
        <div class="relative w-full sm:w-52">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Cari agenda atau sub-tugas..."
            class="w-full rounded-full border border-black bg-white px-4 py-2 text-xs text-black placeholder:text-slate-400 focus:outline-hidden select-text"
          />
        </div>

        <button
          @click="toggleAllHierarchy"
          type="button"
          class="rounded-full border border-black bg-white px-4 py-2 text-xs font-semibold text-black hover:bg-slate-100 cursor-pointer"
        >
          {{ allParentsCollapsed ? 'Buka Semua' : 'Ringkas Grup' }}
        </button>

        <div class="relative">
          <select
            v-model="selectedGroup"
            class="rounded-full border border-black bg-white px-4 py-2 text-xs font-semibold text-black focus:outline-hidden appearance-none pr-8 cursor-pointer"
          >
            <option v-for="p in phases" :key="p" :value="p">
              {{ p === 'All' ? 'Semua Fase' : `Fase: ${p}` }}
            </option>
          </select>
          <span class="pointer-events-none absolute right-3 top-2 text-xs">⌄</span>
        </div>

        <button
          @click="showCriticalPath = !showCriticalPath"
          type="button"
          class="rounded-full border border-black px-4 py-2 text-xs font-semibold transition-colors cursor-pointer"
          :class="showCriticalPath ? 'bg-black text-white' : 'bg-white text-black hover:bg-slate-100'"
        >
          Jalur Kritis
        </button>

        <button
          @click="showBaseline = !showBaseline"
          type="button"
          class="rounded-full border border-black px-4 py-2 text-xs font-semibold transition-colors cursor-pointer"
          :class="showBaseline ? 'bg-[#72a5e4] text-black font-bold' : 'bg-white text-black hover:bg-slate-100'"
        >
          Target Awal
        </button>

        <button
          @click="showModal = true"
          type="button"
          class="rounded-full bg-black px-5 py-2 text-xs font-bold text-white hover:bg-slate-800 transition-colors flex items-center gap-2 shrink-0 cursor-pointer"
        >
          <span>+ Tambah Agenda / Tugas</span>
        </button>
      </div>
    </div>

    <!-- Full-Tab Gantt Chart Area -->
    <div class="w-full flex-1 min-h-0 flex flex-col overflow-hidden">
      <!-- Synchronized Horizontal & Vertical Scroll Area -->
      <div
        ref="scrollContainerRef"
        @pointerdown="startTrackPan"
        class="flex-1 w-full overflow-auto flex flex-col"
        :class="panState ? 'cursor-grabbing' : 'cursor-default'"
      >
        <div
          class="w-full flex-1 min-h-full flex flex-col"
          :class="viewMode === 'Mingguan' ? 'min-w-[1040px]' : 'min-w-[820px]'"
        >
          <!-- Header Row -->
          <div class="flex border-b border-black bg-[#fafaf9] text-xs font-bold text-black select-none sticky top-0 z-30 shrink-0">
            <div class="w-64 sm:w-72 lg:w-80 shrink-0 px-4 py-2.5 border-r border-black flex items-center justify-between sticky left-0 z-40 bg-[#fafaf9]">
              <span class="text-[11px] uppercase tracking-wider">AGENDA &amp; SUB-TUGAS</span>
              <span class="text-[10px] text-slate-500 font-semibold">{{ filteredTasks.length }} BARIS</span>
            </div>

            <!-- Weeks -->
            <div class="flex-1 relative grid grid-cols-9 divide-x divide-black/20 text-center">
              <div v-for="w in timelineHeaders" :key="w.weekNum" class="py-1.5">
                <div class="text-[10px] uppercase font-bold">{{ w.weekNum }}</div>
                <div
                  v-if="viewMode === 'Mingguan'"
                  class="grid grid-cols-7 text-[8px] text-slate-500 pt-0.5 border-t border-black/10"
                >
                  <span
                    v-for="d in w.days"
                    :key="d.fullDate"
                    :class="d.isToday ? 'bg-[#72a5e4] text-black font-black rounded-xs' : ''"
                  >
                    {{ d.dayNum }}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <!-- Gantt Rows Wrapper with Full-Height Continuous Vertical Grid Backdrop -->
          <div class="flex-1 relative flex flex-col">
            <!-- Continuous Full-Height Vertical Grid + Today Line -->
            <div class="pointer-events-none absolute inset-0 flex z-0">
              <div class="w-64 sm:w-72 lg:w-80 shrink-0 border-r border-black bg-white sticky left-0" />
              <div class="flex-1 relative grid grid-cols-9 divide-x divide-black/10">
                <div v-for="n in 9" :key="n" />
                <div
                  v-if="isTodayVisible"
                  class="absolute top-0 bottom-0 w-[1.5px] bg-black/80 z-10"
                  :style="{ left: `${todayPercent}%` }"
                >
                  <span class="sticky top-1 -translate-x-1/2 mt-1.5 inline-block bg-[#72a5e4] text-[9px] font-bold px-2 py-0.5 rounded-full border border-black whitespace-nowrap">
                    Hari Ini
                  </span>
                </div>
              </div>
            </div>

            <!-- Task Rows -->
            <div class="relative z-10 divide-y divide-black/10">
              <div
                v-for="task in filteredTasks"
                :key="task.id"
                class="flex items-stretch text-xs hover:bg-slate-50/70 transition-colors group"
                :class="task.isParent ? 'bg-slate-50/60 font-bold' : ''"
              >
                <!-- Left Task Label (Sticky Left + Clickable to Edit) -->
                <div
                  @click="openEditModal(task)"
                  class="w-64 sm:w-72 lg:w-80 shrink-0 px-4 py-3 border-r border-black flex items-center justify-between gap-2 sticky left-0 z-20 cursor-pointer hover:bg-[#72a5e4]/15 transition-colors"
                  :class="task.isParent ? 'bg-[#f8fafc]' : 'bg-white'"
                  title="Klik untuk ubah detail agenda"
                >
                  <div class="flex items-center gap-2 min-w-0">
                    <button
                      v-if="task.isParent"
                      @click.stop="toggleCollapse(task.id)"
                      type="button"
                      class="p-0.5 hover:bg-slate-200 rounded text-black shrink-0 cursor-pointer"
                    >
                      <ChevronDown v-if="!collapsedIds.has(task.id)" class="h-3.5 w-3.5" />
                      <ChevronRight v-else class="h-3.5 w-3.5" />
                    </button>
                    <span v-else class="w-4 shrink-0 text-slate-400 text-center">↳</span>

                    <div class="min-w-0">
                      <span class="truncate text-black block">{{ task.title }}</span>
                      <span class="text-[10px] text-slate-400 font-normal block truncate">
                        {{ task.phase }} • {{ formatShortIdDate(task.effectiveStart) }} → {{ formatShortIdDate(task.effectiveDue) }}
                      </span>
                    </div>
                  </div>

                  <span class="text-[10px] text-slate-500 font-mono shrink-0">{{ task.progress }}%</span>
                </div>

                <!-- Right Gantt Bar Track (Interactive Drag & Drop + Resize + Click) -->
                <div
                  data-gantt-track
                  class="flex-1 min-h-[52px] relative flex items-center cursor-grab active:cursor-grabbing"
                >
                  <!-- Interactive Task Bar Element -->
                  <div
                    v-if="task.isBarVisible"
                    data-gantt-bar
                    @pointerdown.stop="startBarInteraction($event, task, 'move')"
                    class="group/bar absolute h-7 rounded-md flex items-center px-2.5 text-[10px] font-semibold transition-shadow overflow-visible z-10 cursor-grab active:cursor-grabbing hover:shadow-[2px_2px_0px_#000]"
                    :class="[
                      task.isParent ? 'bg-black text-white' : 'bg-[#72a5e4] border border-black text-black',
                      dragState?.taskId === task.id ? 'shadow-[3px_3px_0px_#000] ring-2 ring-black z-30 opacity-95' : '',
                      showCriticalPath && (task.priority === 'High' || task.isParent)
                        ? 'ring-2 ring-rose-500 ring-offset-1'
                        : ''
                    ]"
                    :style="{
                      left: `${task.leftPercent}%`,
                      width: `${task.widthPercent}%`
                    }"
                    :title="`${task.title} (${formatShortIdDate(task.effectiveStart)} → ${formatShortIdDate(task.effectiveDue)}) — Geser untuk pindah tanggal atau klik untuk edit`"
                  >
                    <!-- Left Resize Handle -->
                    <span
                      @pointerdown.stop="startBarInteraction($event, task, 'resize-left')"
                      class="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize rounded-l-md hover:bg-black/25"
                      title="Geser untuk ubah tanggal mulai"
                    />

                    <span class="truncate pointer-events-none px-1">{{ task.title }}</span>

                    <!-- Right Resize Handle -->
                    <span
                      @pointerdown.stop="startBarInteraction($event, task, 'resize-right')"
                      class="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize rounded-r-md hover:bg-black/25"
                      title="Geser untuk ubah tanggal selesai"
                    />

                    <!-- Live Drag Date Tooltip -->
                    <span
                      v-if="dragState?.taskId === task.id && dragState.didMove"
                      class="pointer-events-none absolute -top-7 left-1/2 -translate-x-1/2 rounded-full border border-black bg-white px-2.5 py-0.5 text-[10px] font-bold text-black shadow-[2px_2px_0px_#000] whitespace-nowrap z-40"
                    >
                      {{ formatShortIdDate(task.effectiveStart) }} → {{ formatShortIdDate(task.effectiveDue) }}
                    </span>
                  </div>

                  <!-- Baseline Marker -->
                  <div
                    v-if="showBaseline && task.isBarVisible"
                    class="absolute bottom-1.5 h-1 bg-black/50 rounded-full pointer-events-none"
                    :style="{
                      left: `${task.leftPercent}%`,
                      width: `${Math.max(2, task.widthPercent * 0.9)}%`
                    }"
                  />
                </div>
              </div>

              <div v-if="!filteredTasks.length" class="p-10 text-center text-xs text-slate-500 bg-white/90">
                Tidak ada agenda atau tugas yang cocok dengan filter saat ini.
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Gantt Bottom Bar -->
      <div class="px-4 sm:px-6 py-2.5 border-t border-black bg-[#fafaf9] flex flex-wrap items-center justify-between gap-3 text-xs text-black shrink-0">
        <div class="flex flex-wrap items-center gap-4 text-[11px] font-medium text-slate-700">
          <span class="flex items-center gap-1.5"><span class="h-2.5 w-2.5 rounded-full bg-black inline-block" /> Tahap Utama</span>
          <span class="flex items-center gap-1.5"><span class="h-2.5 w-2.5 rounded-full bg-[#72a5e4] inline-block border border-black" /> Sub-Tugas</span>
          <span class="flex items-center gap-1.5"><span class="h-1 w-4 rounded-full bg-black/60 inline-block" /> Garis Target Awal</span>
          <span class="hidden md:inline text-slate-500">• Geser bar/tepi bar untuk ubah tanggal, klik baris untuk edit</span>
        </div>

        <div class="flex items-center gap-2">
          <div class="inline-flex items-center rounded-full border border-black bg-white overflow-hidden">
            <button
              @click="shiftWindow(-7)"
              type="button"
              class="px-2.5 py-1 hover:bg-slate-100 border-r border-black/20 cursor-pointer"
              title="Geser 1 minggu ke belakang"
            >
              <ChevronLeft class="h-3.5 w-3.5" />
            </button>
            <button
              @click="focusToday"
              type="button"
              class="px-3 py-1 text-xs font-semibold hover:bg-slate-100 cursor-pointer"
            >
              Hari Ini
            </button>
            <button
              @click="shiftWindow(7)"
              type="button"
              class="px-2.5 py-1 hover:bg-slate-100 border-l border-black/20 cursor-pointer"
              title="Geser 1 minggu ke depan"
            >
              <ChevronRight class="h-3.5 w-3.5" />
            </button>
          </div>
          <button
            @click="cycleViewMode"
            type="button"
            class="rounded-full border border-black bg-white px-3 py-1 text-xs font-semibold hover:bg-slate-100 cursor-pointer"
          >
            Tampilan: {{ viewMode }} ⌄
          </button>
        </div>
      </div>
    </div>

    <!-- Modal Tambah Agenda / Tugas Baru -->
    <div
      v-if="showModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-2xs"
    >
      <div class="w-full max-w-lg rounded-3xl border-2 border-black bg-white p-6 sm:p-8 space-y-6">
        <div class="flex items-center justify-between border-b border-black/20 pb-3">
          <h3 class="text-xl font-bold text-black font-editorial">Tambah Agenda / Tugas Baru</h3>
          <button @click="showModal = false" class="p-1 rounded-full border border-black hover:bg-slate-100 cursor-pointer">
            <X class="h-4 w-4" />
          </button>
        </div>

        <form @submit.prevent="handleCreateTask" class="space-y-4 text-xs">
          <div class="space-y-1">
            <label class="font-bold text-black">Judul Agenda / Tugas</label>
            <input
              v-model="newTitle"
              type="text"
              required
              placeholder="Contoh: Booking Venue & Kontrak JCC"
              class="w-full rounded-xl border border-black p-2.5 text-black focus:outline-hidden select-text"
            />
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-1">
              <label class="font-bold text-black">Kelompok Utama</label>
              <select
                v-model="newParentId"
                class="w-full rounded-xl border border-black p-2.5 text-black focus:outline-hidden"
              >
                <option value="">(Jadikan Tahap Utama)</option>
                <option
                  v-for="t in allTasks.filter(x => x.isParent)"
                  :key="t.id"
                  :value="t.id"
                >
                  {{ t.title }}
                </option>
              </select>
            </div>

            <div class="space-y-1">
              <label class="font-bold text-black">Fase Acara</label>
              <select
                v-model="newPhase"
                class="w-full rounded-xl border border-black p-2.5 text-black focus:outline-hidden"
              >
                <option v-for="p in phases.filter(x => x !== 'All')" :key="p" :value="p">{{ p }}</option>
              </select>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-1">
              <label class="font-bold text-black">Tanggal Mulai</label>
              <input
                v-model="newStartDate"
                type="date"
                required
                class="w-full rounded-xl border border-black p-2.5 text-black focus:outline-hidden"
              />
            </div>

            <div class="space-y-1">
              <label class="font-bold text-black">Tanggal Selesai</label>
              <input
                v-model="newDueDate"
                type="date"
                required
                class="w-full rounded-xl border border-black p-2.5 text-black focus:outline-hidden"
              />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-1">
              <label class="font-bold text-black">Penanggung Jawab</label>
              <input
                v-model="newAssignedTo"
                type="text"
                class="w-full rounded-xl border border-black p-2.5 text-black focus:outline-hidden select-text"
              />
            </div>

            <div class="space-y-1">
              <label class="font-bold text-black">Progres Awal (%)</label>
              <input
                v-model="newProgress"
                type="number"
                min="0"
                max="100"
                class="w-full rounded-xl border border-black p-2.5 text-black focus:outline-hidden"
              />
            </div>
          </div>

          <div class="pt-4 flex justify-end gap-3 border-t border-black/20">
            <button
              type="button"
              @click="showModal = false"
              class="rounded-full border border-black bg-white px-5 py-2 font-semibold text-black hover:bg-slate-100 cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              class="rounded-full bg-black px-6 py-2 font-bold text-white hover:bg-slate-800 cursor-pointer"
            >
              Simpan Agenda
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Modal Edit Detail Agenda / Tugas (Saat Bar atau Baris Diklik) -->
    <div
      v-if="editingTask"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-2xs"
    >
      <div class="w-full max-w-lg rounded-3xl border-2 border-black bg-white p-6 sm:p-8 space-y-5 shadow-[6px_6px_0px_#000]">
        <div class="flex items-center justify-between border-b border-black/20 pb-3">
          <div>
            <span class="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              {{ editingTask.isParent ? 'TAHAP UTAMA' : 'SUB-TUGAS' }}
            </span>
            <h3 class="text-xl font-bold text-black font-editorial">Ubah Detail &amp; Jadwal Agenda</h3>
          </div>
          <button @click="editingTask = null" class="p-1 rounded-full border border-black hover:bg-slate-100 cursor-pointer">
            <X class="h-4 w-4" />
          </button>
        </div>

        <form @submit.prevent="saveEditModal" class="space-y-4 text-xs">
          <div class="space-y-1">
            <label class="font-bold text-black">Judul Agenda / Tugas</label>
            <input
              v-model="editForm.title"
              type="text"
              required
              class="w-full rounded-xl border border-black p-2.5 text-black focus:outline-hidden select-text"
            />
          </div>

          <div class="grid grid-cols-3 gap-3">
            <div class="space-y-1">
              <label class="font-bold text-black">Fase Acara</label>
              <select v-model="editForm.phase" class="w-full rounded-xl border border-black p-2.5 text-black focus:outline-hidden">
                <option v-for="p in phases.filter(x => x !== 'All')" :key="p" :value="p">{{ p }}</option>
              </select>
            </div>

            <div class="space-y-1">
              <label class="font-bold text-black">Status</label>
              <select v-model="editForm.status" class="w-full rounded-xl border border-black p-2.5 text-black focus:outline-hidden">
                <option v-for="s in statusOptions" :key="s" :value="s">{{ s }}</option>
              </select>
            </div>

            <div class="space-y-1">
              <label class="font-bold text-black">Prioritas</label>
              <select v-model="editForm.priority" class="w-full rounded-xl border border-black p-2.5 text-black focus:outline-hidden">
                <option v-for="pr in priorityOptions" :key="pr" :value="pr">{{ pr }}</option>
              </select>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-1">
              <label class="font-bold text-black">Tanggal Mulai</label>
              <input
                v-model="editForm.start_date"
                type="date"
                required
                class="w-full rounded-xl border border-black p-2.5 text-black focus:outline-hidden"
              />
            </div>

            <div class="space-y-1">
              <label class="font-bold text-black">Tanggal Selesai</label>
              <input
                v-model="editForm.due_date"
                type="date"
                required
                class="w-full rounded-xl border border-black p-2.5 text-black focus:outline-hidden"
              />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4 items-center">
            <div class="space-y-1">
              <label class="font-bold text-black">Penanggung Jawab</label>
              <input
                v-model="editForm.assigned_to"
                type="text"
                class="w-full rounded-xl border border-black p-2.5 text-black focus:outline-hidden select-text"
              />
            </div>

            <div class="space-y-1">
              <div class="flex items-center justify-between">
                <label class="font-bold text-black">Progres</label>
                <span class="font-mono font-bold text-black">{{ editForm.progress }}%</span>
              </div>
              <input
                v-model.number="editForm.progress"
                type="range"
                min="0"
                max="100"
                class="w-full accent-[#72a5e4] cursor-pointer"
              />
            </div>
          </div>

          <div class="pt-4 flex items-center justify-between gap-3 border-t border-black/20">
            <button
              type="button"
              @click="deleteEditingTask"
              class="inline-flex items-center gap-1.5 rounded-full border border-rose-300 bg-rose-50 px-4 py-2 font-semibold text-rose-700 hover:bg-rose-100 cursor-pointer"
            >
              <Trash2 class="h-3.5 w-3.5" />
              <span>Hapus</span>
            </button>

            <div class="flex items-center gap-2.5">
              <button
                type="button"
                @click="editingTask = null"
                class="rounded-full border border-black bg-white px-5 py-2 font-semibold text-black hover:bg-slate-100 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                class="rounded-full bg-black px-6 py-2 font-bold text-white hover:bg-slate-800 cursor-pointer"
              >
                Simpan Perubahan
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

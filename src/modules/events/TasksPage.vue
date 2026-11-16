<script setup>
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useEventWorkspaceStore } from '@/stores/eventWorkspace'
import { useToastStore } from '@/stores/toast'
import { Plus } from 'lucide-vue-next'

const route = useRoute()
const store = useEventWorkspaceStore()
const toast = useToastStore()

const columns = ['To Do', 'In Progress', 'Review', 'Done']
const newTaskTitle = ref('')
const newTaskPriority = ref('Medium')

const eventTasks = computed(() => {
  return store.tasks.map(t => {
    // Normalise status
    let normStatus = 'To Do'
    if (t.status === 'in_progress' || t.status === 'In Progress') normStatus = 'In Progress'
    else if (t.status === 'review' || t.status === 'Review') normStatus = 'Review'
    else if (t.status === 'done' || t.status === 'Done') normStatus = 'Done'
    return { ...t, displayStatus: normStatus }
  })
})

function getColumnTasks(col) {
  return eventTasks.value.filter(t => t.displayStatus === col)
}

async function addTask() {
  if (!newTaskTitle.value.trim()) return
  await store.addTask({
    event_id: route.params.eventId,
    title: newTaskTitle.value.trim(),
    phase: 'Pre-Event',
    is_group: false,
    assigned_to: 'Hikam Pratama',
    priority: newTaskPriority.value,
    status: 'To Do',
    due_at: '2026-12-01',
    due_date: '2026-12-01',
    progress: 0
  })
  newTaskTitle.value = ''
  toast.success('Task berhasil ditambahkan ke board.')
}

async function updateTaskStatus(task, newStatus) {
  await store.updateTask(task.id, { status: newStatus })
  task.displayStatus = newStatus
  toast.success(`Task dipindahkan ke ${newStatus}`)
}
</script>

<template>
  <div class="space-y-6 min-h-[calc(100vh-6rem)]">
    <!-- Header -->
    <div class="space-y-1">
      <span class="text-[10px] font-bold uppercase tracking-wider text-slate-500">PLANNING &amp; TEAM</span>
      <h1 class="text-3xl font-bold tracking-tight text-black font-editorial">
        Task Management (Kanban)
      </h1>
      <p class="text-xs text-slate-600">
        Pantau progres persiapan panitia dari To Do hingga Done.
      </p>
    </div>

    <!-- Quick Input Form -->
    <form @submit.prevent="addTask" class="flex flex-col sm:flex-row items-center gap-3">
      <input
        v-model="newTaskTitle"
        type="text"
        required
        placeholder="Tambah task persiapan baru..."
        class="w-full flex-1 rounded-full border border-black bg-white px-5 py-2.5 text-xs text-black placeholder:text-slate-400 focus:outline-hidden"
      />
      <div class="relative shrink-0">
        <select
          v-model="newTaskPriority"
          class="rounded-full border border-black bg-white px-5 py-2.5 text-xs text-black focus:outline-hidden appearance-none pr-8 cursor-pointer"
        >
          <option value="Low">Low</option>
          <option value="Medium">Medium</option>
          <option value="High">High</option>
        </select>
        <span class="pointer-events-none absolute right-3 top-2.5 text-xs">⌄</span>
      </div>
      <button
        type="submit"
        class="rounded-full bg-black px-6 py-2.5 text-xs font-semibold text-white hover:bg-slate-800 transition-colors shrink-0"
      >
        + Tambah Task
      </button>
    </form>

    <!-- 4 Kanban Columns Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
      <div
        v-for="col in columns"
        :key="col"
        class="rounded-2xl border border-black p-4 space-y-3 min-h-[480px] flex flex-col justify-between"
        :class="col === 'In Progress' ? 'bg-[#72a5e4]/20' : 'bg-white'"
      >
        <!-- Column Header -->
        <div class="space-y-3">
          <div class="flex items-center justify-between pb-2 border-b border-black/10">
            <h3 class="text-sm font-bold text-black">{{ col }}</h3>
            <span
              class="rounded-full border border-black px-2 py-0.2 text-[10px] font-bold"
              :class="col === 'In Progress' ? 'bg-[#72a5e4] text-black' : 'bg-white text-black'"
            >
              {{ getColumnTasks(col).length }}
            </span>
          </div>

          <!-- Cards List -->
          <div class="space-y-2.5">
            <div
              v-for="task in getColumnTasks(col)"
              :key="task.id"
              class="rounded-xl border border-black bg-white p-3 space-y-2 hover:shadow-xs transition-shadow"
            >
              <div class="flex items-center justify-between text-[10px]">
                <span
                  class="rounded-full border border-black px-2 py-0.2 font-bold uppercase tracking-wider"
                  :class="task.priority === 'high' ? 'bg-[#72a5e4] text-black' : 'bg-white text-slate-700'"
                >
                  {{ task.priority || 'MEDIUM' }}
                </span>
                <span class="text-slate-400 font-mono">{{ task.due_date || '2026-11-15' }}</span>
              </div>

              <h4 class="text-xs font-bold text-black leading-snug">{{ task.title }}</h4>
              <p class="text-[11px] text-slate-500">PIC: {{ task.assigned_to || 'Hikam Pratama' }}</p>

              <!-- Move Dropdown -->
              <div class="pt-1">
                <select
                  :value="task.displayStatus"
                  @change="updateTaskStatus(task, $event.target.value)"
                  class="w-full rounded-lg border border-black bg-white px-2 py-1 text-[10px] font-semibold text-black cursor-pointer"
                >
                  <option v-for="c in columns" :key="c" :value="c">{{ c }}</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <!-- Optional Bottom Action for tall columns -->
        <div v-if="col === 'In Progress' && getColumnTasks(col).length > 3" class="pt-2">
          <button class="w-full rounded-full border border-black bg-[#72a5e4] py-1.5 text-[11px] font-bold text-black hover:bg-[#5c93d9]">
            Lihat semua task ↓
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useEventWorkspaceStore } from '@/stores/eventWorkspace'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'
import { Plus, Pencil, Trash2, X } from 'lucide-vue-next'

const route = useRoute()
const store = useEventWorkspaceStore()
const authStore = useAuthStore()
const toast = useToastStore()

const columns = ['To Do', 'In Progress', 'Review', 'Done']
const newTaskTitle = ref('')
const newTaskPriority = ref('Medium')

const showEditModal = ref(false)
const editingTaskId = ref(null)
const editTitle = ref('')
const editPriority = ref('Medium')
const editPhase = ref('Pre-Event')
const editAssignedTo = ref('')
const editDueDate = ref('')
const editStatus = ref('To Do')
const savingTask = ref(false)

const eventTasks = computed(() => {
  return store.tasks
    .filter((t) => (!t.event_id || t.event_id === route.params.eventId) && !t.is_group)
    .map((t) => {
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
  try {
    await store.addTask({
      event_id: route.params.eventId,
      title: newTaskTitle.value.trim(),
      phase: 'Pre-Event',
      is_group: false,
      assigned_to: authStore.user?.full_name || authStore.user?.email || 'Tim Panitia',
      priority: newTaskPriority.value,
      status: 'To Do',
      due_at: '2026-12-01',
      due_date: '2026-12-01',
      progress: 0
    })
    newTaskTitle.value = ''
    toast.success('Task berhasil ditambahkan ke board.')
  } catch (err) {
    toast.error(err?.message || 'Gagal menambah task.')
  }
}

async function updateTaskStatus(task, newStatus) {
  try {
    await store.updateTask(task.id, { status: newStatus })
    task.displayStatus = newStatus
    toast.success(`Task dipindahkan ke ${newStatus}`)
  } catch (err) {
    toast.error(err?.message || 'Gagal memperbarui status task.')
  }
}

function openEditTask(task) {
  editingTaskId.value = task.id
  editTitle.value = task.title || ''
  const low = (task.priority || 'medium').toLowerCase()
  editPriority.value = low === 'high' ? 'High' : low === 'low' ? 'Low' : 'Medium'
  editPhase.value = task.phase || 'Pre-Event'
  editAssignedTo.value = task.assigned_to || ''
  editDueDate.value = (task.due_at || task.due_date || '').slice(0, 10)
  editStatus.value = task.displayStatus || 'To Do'
  showEditModal.value = true
}

async function saveEditTask() {
  if (!editingTaskId.value || !editTitle.value.trim()) return
  savingTask.value = true
  try {
    await store.updateTask(editingTaskId.value, {
      title: editTitle.value.trim(),
      priority: editPriority.value,
      phase: editPhase.value,
      assigned_to: editAssignedTo.value.trim(),
      due_at: editDueDate.value || undefined,
      due_date: editDueDate.value || undefined,
      status: editStatus.value
    })
    showEditModal.value = false
    toast.success('Detail task berhasil diperbarui.')
  } catch (err) {
    toast.error(err?.message || 'Gagal memperbarui task.')
  } finally {
    savingTask.value = false
  }
}

async function removeTask(task) {
  if (!window.confirm(`Hapus task "${task.title}"?`)) return
  try {
    await store.deleteTask(task.id)
    toast.success(`Task "${task.title}" dihapus.`)
  } catch (err) {
    toast.error(err?.message || 'Gagal menghapus task.')
  }
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
              <div class="flex items-center justify-between gap-1 text-[10px]">
                <span
                  class="rounded-full border border-black px-2 py-0.2 font-bold uppercase tracking-wider"
                  :class="(task.priority || '').toLowerCase() === 'high' ? 'bg-[#72a5e4] text-black' : 'bg-white text-slate-700'"
                >
                  {{ task.priority || 'MEDIUM' }}
                </span>
                <div class="flex items-center gap-1">
                  <span class="text-slate-400 font-mono mr-1">{{ (task.due_at || task.due_date || '-').slice(0, 10) }}</span>
                  <button
                    @click="openEditTask(task)"
                    title="Edit Task"
                    class="rounded-full border border-black/40 p-1 text-black hover:bg-slate-100"
                  >
                    <Pencil class="h-3 w-3" />
                  </button>
                  <button
                    @click="removeTask(task)"
                    title="Hapus Task"
                    class="rounded-full border border-black/40 p-1 text-red-600 hover:bg-red-50"
                  >
                    <Trash2 class="h-3 w-3" />
                  </button>
                </div>
              </div>

              <h4 class="text-xs font-bold text-black leading-snug">{{ task.title }}</h4>
              <p class="text-[11px] text-slate-500">PIC: {{ task.assigned_to || 'Tim Panitia' }}</p>

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

    <!-- Modal Edit Task -->
    <div
      v-if="showEditModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-2xs"
    >
      <div class="w-full max-w-md rounded-3xl border-2 border-black bg-white p-6 sm:p-8 space-y-5">
        <div class="flex items-center justify-between border-b border-black/20 pb-3">
          <h3 class="text-xl font-bold text-black font-editorial">Edit Detail Task</h3>
          <button @click="showEditModal = false" class="p-1 rounded-full border border-black hover:bg-slate-100">
            <X class="h-4 w-4" />
          </button>
        </div>

        <form @submit.prevent="saveEditTask" class="space-y-4 text-xs">
          <div class="space-y-1">
            <label class="font-bold text-black">Judul Task</label>
            <input
              v-model="editTitle"
              type="text"
              required
              class="w-full rounded-xl border border-black p-2.5 text-black focus:outline-hidden"
            />
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div class="space-y-1">
              <label class="font-bold text-black">Prioritas</label>
              <select v-model="editPriority" class="w-full rounded-xl border border-black p-2.5 text-black bg-white">
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
            </div>
            <div class="space-y-1">
              <label class="font-bold text-black">Status</label>
              <select v-model="editStatus" class="w-full rounded-xl border border-black p-2.5 text-black bg-white">
                <option v-for="c in columns" :key="c" :value="c">{{ c }}</option>
              </select>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div class="space-y-1">
              <label class="font-bold text-black">PIC / Penanggung Jawab</label>
              <input
                v-model="editAssignedTo"
                type="text"
                placeholder="Nama divisi / PIC"
                class="w-full rounded-xl border border-black p-2.5 text-black focus:outline-hidden"
              />
            </div>
            <div class="space-y-1">
              <label class="font-bold text-black">Tenggat Waktu</label>
              <input
                v-model="editDueDate"
                type="date"
                class="w-full rounded-xl border border-black p-2.5 text-black focus:outline-hidden"
              />
            </div>
          </div>

          <div class="pt-4 flex justify-end gap-3 border-t border-black/20">
            <button
              type="button"
              @click="showEditModal = false"
              class="rounded-full border border-black bg-white px-5 py-2 font-semibold text-black hover:bg-slate-100"
            >
              Batal
            </button>
            <button
              type="submit"
              :disabled="savingTask"
              class="rounded-full bg-black px-6 py-2 font-bold text-white hover:bg-slate-800 disabled:opacity-60"
            >
              {{ savingTask ? 'Menyimpan...' : 'Simpan Perubahan' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

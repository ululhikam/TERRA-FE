<script setup>
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useEventWorkspaceStore } from '@/stores/eventWorkspace'
import { useAuthStore } from '@/stores/auth'
import { useToastStore } from '@/stores/toast'
import api from '@/services/api'
import { Plus, Pencil, Trash2, X, CheckSquare, MessageSquare } from 'lucide-vue-next'

const route = useRoute()
const store = useEventWorkspaceStore()
const authStore = useAuthStore()
const toast = useToastStore()

const columns = ['To Do', 'In Progress', 'Review', 'Done', 'Cancelled']
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
const editChecklists = ref([])
const newChecklistText = ref('')
const editComments = ref([])
const newCommentText = ref('')
const addingComment = ref(false)
const savingTask = ref(false)

const eventTasks = computed(() => {
  return store.tasks
    .filter((t) => (!t.event_id || t.event_id === route.params.eventId) && !t.is_group)
    .map((t) => {
      let normStatus = 'To Do'
      if (t.status === 'in_progress' || t.status === 'In Progress') normStatus = 'In Progress'
      else if (t.status === 'review' || t.status === 'Review') normStatus = 'Review'
      else if (t.status === 'done' || t.status === 'Done') normStatus = 'Done'
      else if (t.status === 'cancelled' || t.status === 'Cancelled') normStatus = 'Cancelled'
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
  editChecklists.value = Array.isArray(task.checklists)
    ? task.checklists.map((item) =>
        typeof item === 'string'
          ? { text: item, done: false }
          : { text: item?.text || item?.title || '', done: Boolean(item?.done) }
      )
    : []
  editComments.value = Array.isArray(task.comments) ? [...task.comments] : []
  newChecklistText.value = ''
  newCommentText.value = ''
  showEditModal.value = true
}

function addChecklistItem() {
  const text = newChecklistText.value.trim()
  if (!text) return
  editChecklists.value.push({ text, done: false })
  newChecklistText.value = ''
}

function removeChecklistItem(idx) {
  editChecklists.value.splice(idx, 1)
}

async function submitTaskComment() {
  if (!editingTaskId.value || !newCommentText.value.trim()) return
  addingComment.value = true
  try {
    const res = await api.post(`/tasks/${editingTaskId.value}/comments`, {
      content: newCommentText.value.trim()
    })
    if (res?.data) {
      editComments.value.push(res.data)
      const target = store.tasks.find((t) => t.id === editingTaskId.value)
      if (target) {
        if (!Array.isArray(target.comments)) target.comments = []
        target.comments.push(res.data)
      }
    }
    newCommentText.value = ''
    toast.success('Komentar task ditambahkan.')
  } catch (err) {
    toast.error(err?.message || 'Gagal menambah komentar.')
  } finally {
    addingComment.value = false
  }
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
      status: editStatus.value,
      checklists: editChecklists.value
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

    <!-- 5 Kanban Columns Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-start">
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

              <div
                v-if="(task.checklists || []).length || (task.comments || []).length"
                class="flex items-center gap-2 text-[10px] text-slate-600 font-semibold"
              >
                <span v-if="(task.checklists || []).length" class="inline-flex items-center gap-1">
                  <CheckSquare class="h-3 w-3" />
                  {{ (task.checklists || []).filter((c) => c?.done).length }}/{{ (task.checklists || []).length }}
                </span>
                <span v-if="(task.comments || []).length" class="inline-flex items-center gap-1">
                  <MessageSquare class="h-3 w-3" />
                  {{ (task.comments || []).length }}
                </span>
              </div>

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
      <div class="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl border-2 border-black bg-white p-6 sm:p-8 space-y-5">
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

          <!-- Sub-checklist -->
          <div class="space-y-2 rounded-2xl border border-black/20 bg-[#fafaf9] p-3.5">
            <label class="font-bold text-black block">Checklist Sub-Tugas</label>
            <div class="space-y-1.5">
              <div
                v-for="(item, idx) in editChecklists"
                :key="idx"
                class="flex items-center justify-between gap-2 rounded-lg border border-black/15 bg-white px-2.5 py-1.5"
              >
                <label class="flex items-center gap-2 cursor-pointer flex-1 min-w-0">
                  <input v-model="item.done" type="checkbox" class="accent-black" />
                  <span class="truncate" :class="item.done ? 'line-through text-slate-400' : 'text-black'">
                    {{ item.text }}
                  </span>
                </label>
                <button
                  type="button"
                  @click="removeChecklistItem(idx)"
                  class="text-[10px] font-bold text-rose-600 hover:underline"
                >
                  Hapus
                </button>
              </div>
            </div>
            <div class="flex gap-2">
              <input
                v-model="newChecklistText"
                type="text"
                placeholder="Tambah item checklist..."
                @keydown.enter.prevent="addChecklistItem"
                class="flex-1 rounded-xl border border-black bg-white px-3 py-1.5 text-black focus:outline-hidden"
              />
              <button
                type="button"
                @click="addChecklistItem"
                class="rounded-xl border border-black bg-[#72a5e4] px-3 py-1.5 font-bold text-black"
              >
                + Item
              </button>
            </div>
          </div>

          <!-- Comments Thread -->
          <div class="space-y-2 rounded-2xl border border-black/20 bg-[#fafaf9] p-3.5">
            <label class="font-bold text-black block">Diskusi &amp; Komentar Panitia</label>
            <div v-if="editComments.length" class="space-y-1.5 max-h-32 overflow-y-auto">
              <div
                v-for="cmt in editComments"
                :key="cmt.id || cmt.created_at"
                class="rounded-lg border border-black/15 bg-white px-2.5 py-1.5 space-y-0.5"
              >
                <span class="text-[10px] font-bold text-black">{{ cmt.author_name || 'Panitia' }}</span>
                <p class="text-[11px] text-slate-700">{{ cmt.content }}</p>
              </div>
            </div>
            <p v-else class="text-[11px] text-slate-500">Belum ada komentar.</p>
            <div class="flex gap-2">
              <input
                v-model="newCommentText"
                type="text"
                placeholder="Tulis catatan / komentar..."
                @keydown.enter.prevent="submitTaskComment"
                class="flex-1 rounded-xl border border-black bg-white px-3 py-1.5 text-black focus:outline-hidden"
              />
              <button
                type="button"
                :disabled="addingComment"
                @click="submitTaskComment"
                class="rounded-xl border border-black bg-white px-3 py-1.5 font-bold text-black hover:bg-slate-100 disabled:opacity-60"
              >
                {{ addingComment ? '...' : 'Kirim' }}
              </button>
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

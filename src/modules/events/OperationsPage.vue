<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useEventWorkspaceStore } from '@/stores/eventWorkspace'
import { useToastStore } from '@/stores/toast'
import { X, Plus, Download, Pencil, Trash2 } from 'lucide-vue-next'

const route = useRoute()
const store = useEventWorkspaceStore()
const toast = useToastStore()

const eventId = computed(() => route.params.eventId || store.activeEvent?.id || 'evt-1')

const tabConfig = [
  { key: 'vendors', moduleKey: 'vendors', label: 'Vendor & Mitra Layanan' },
  { key: 'sponsors', moduleKey: 'sponsors', label: 'Sponsorship & Partners' },
  { key: 'docs', moduleKey: 'documents', label: 'Dokumen & Lampiran' },
  { key: 'feedback', moduleKey: 'feedback', label: 'Survei Peserta' }
]
const enabledTabs = computed(() =>
  tabConfig.filter((tab) => store.isModuleEnabled(eventId.value, tab.moduleKey))
)
const activeTab = ref(enabledTabs.value[0]?.key || 'vendors')

watch(
  enabledTabs,
  (list) => {
    if (!list.length) {
      activeTab.value = ''
      return
    }
    if (!list.some((t) => t.key === activeTab.value)) {
      activeTab.value = list[0].key
      if (activeTab.value === 'feedback') {
        store.fetchSurveys(eventId.value).catch(() => {})
      }
    }
  },
  { immediate: true }
)
const vendors = computed(() =>
  store.vendors.filter((v) => !v.event_id || v.event_id === eventId.value)
)
const sponsors = computed(() =>
  store.sponsors.filter((s) => !s.event_id || s.event_id === eventId.value)
)
const documents = computed(() =>
  store.documents.filter((d) => !d.event_id || d.event_id === eventId.value)
)
const surveys = computed(() =>
  store.surveys.filter((s) => !s.event_id || s.event_id === eventId.value)
)

// Vendor CRUD state
const showVendorModal = ref(false)
const editingVendorId = ref(null)
const newName = ref('')
const newCat = ref('Logistik & Venue')
const newContact = ref('')
const newValue = ref('Rp 5.000.000')
const vendorStatus = ref('Confirmed')
const savingVendor = ref(false)

// Sponsor CRUD state
const showSponsorModal = ref(false)
const editingSponsorId = ref(null)
const spName = ref('')
const spTier = ref('Gold')
const spPic = ref('')
const spContribution = ref('Rp 10.000.000')
const spStatus = ref('Pending')
const savingSponsor = ref(false)

// Document state
const showDocModal = ref(false)
const docFile = ref(null)
const docCategory = ref('Operasional')
const docVisibility = ref('internal')
const uploadingDoc = ref(false)

// Survey state
const showSurveyModal = ref(false)
const surveyTitle = ref('')
const surveyDesc = ref('')
const surveyQuestions = ref([
  { id: 'q1', question: 'Bagaimana penilaian keseluruhan acara?', question_type: 'rating', optionsText: '' }
])
const savingSurvey = ref(false)

function addSurveyQuestion() {
  surveyQuestions.value.push({
    id: `q${Date.now()}`,
    question: '',
    question_type: 'text',
    optionsText: ''
  })
}

function removeSurveyQuestion(idx) {
  if (surveyQuestions.value.length <= 1) return
  surveyQuestions.value.splice(idx, 1)
}

function exportSurveyCsv(srv) {
  const responses = Array.isArray(srv.responses) ? srv.responses : []
  const rows = [
    ['Response ID', 'Submitted At', 'Answers (JSON)'],
    ...responses.map((r, i) => [
      r.id || `resp-${i + 1}`,
      r.submitted_at || r.created_at || '-',
      JSON.stringify(r.answers || {})
    ])
  ]
  const csv = rows.map((r) => r.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `survey-${srv.id}-responses.csv`
  a.click()
  URL.revokeObjectURL(url)
  toast.success(`Respons survei "${srv.title}" diekspor ke CSV.`)
}

function openCreateVendor() {
  editingVendorId.value = null
  newName.value = ''
  newCat.value = 'Logistik & Venue'
  newContact.value = ''
  newValue.value = 'Rp 5.000.000'
  vendorStatus.value = 'Confirmed'
  showVendorModal.value = true
}

function openEditVendor(v) {
  editingVendorId.value = v.id
  newName.value = v.name || ''
  newCat.value = v.category || ''
  newContact.value = v.contact || ''
  newValue.value = v.value || ''
  vendorStatus.value = v.status || 'Confirmed'
  showVendorModal.value = true
}

async function saveVendor() {
  if (!newName.value.trim()) return
  savingVendor.value = true
  try {
    const payload = {
      name: newName.value.trim(),
      category: newCat.value || 'Logistik',
      contact: newContact.value || '-',
      value: newValue.value || 'Rp 0',
      status: vendorStatus.value
    }
    if (editingVendorId.value) {
      await store.updateVendor(editingVendorId.value, payload)
      toast.success(`Vendor "${payload.name}" diperbarui.`)
    } else {
      await store.addVendor(eventId.value, payload)
      toast.success('Vendor baru berhasil ditambahkan.')
    }
    showVendorModal.value = false
  } catch (err) {
    toast.error(err?.message || 'Gagal menyimpan data vendor.')
  } finally {
    savingVendor.value = false
  }
}

async function removeVendor(v) {
  if (!window.confirm(`Hapus vendor "${v.name}"?`)) return
  try {
    await store.deleteVendor(v.id)
    toast.success(`Vendor "${v.name}" dihapus.`)
  } catch (err) {
    toast.error(err?.message || 'Gagal menghapus vendor.')
  }
}

function openCreateSponsor() {
  editingSponsorId.value = null
  spName.value = ''
  spTier.value = 'Gold'
  spPic.value = ''
  spContribution.value = 'Rp 10.000.000'
  spStatus.value = 'Pending'
  showSponsorModal.value = true
}

function openEditSponsor(s) {
  editingSponsorId.value = s.id
  spName.value = s.name || ''
  spTier.value = s.tier || 'Gold'
  spPic.value = s.pic || ''
  spContribution.value = s.contribution || ''
  spStatus.value = s.status || 'Pending'
  showSponsorModal.value = true
}

async function saveSponsor() {
  if (!spName.value.trim()) return
  savingSponsor.value = true
  try {
    const payload = {
      name: spName.value.trim(),
      tier: spTier.value || 'Silver',
      pic: spPic.value || '-',
      contribution: spContribution.value || 'Rp 0',
      status: spStatus.value
    }
    if (editingSponsorId.value) {
      await store.updateSponsor(editingSponsorId.value, payload)
      toast.success(`Sponsor "${payload.name}" diperbarui.`)
    } else {
      await store.addSponsor(eventId.value, payload)
      toast.success(`Sponsor "${payload.name}" ditambahkan.`)
    }
    showSponsorModal.value = false
  } catch (err) {
    toast.error(err?.message || 'Gagal menyimpan data sponsor.')
  } finally {
    savingSponsor.value = false
  }
}

async function removeSponsor(s) {
  if (!window.confirm(`Hapus sponsor "${s.name}"?`)) return
  try {
    await store.deleteSponsor(s.id)
    toast.success(`Sponsor "${s.name}" dihapus.`)
  } catch (err) {
    toast.error(err?.message || 'Gagal menghapus sponsor.')
  }
}

async function handleUploadDoc() {
  if (!docFile.value) {
    toast.error('Pilih file dokumen terlebih dahulu.')
    return
  }
  uploadingDoc.value = true
  try {
    await store.addDocument(eventId.value, {
      file: docFile.value,
      category: docCategory.value,
      visibility: docVisibility.value
    })
    docFile.value = null
    showDocModal.value = false
    toast.success('Dokumen berhasil diunggah ke Supabase Storage.')
  } catch (err) {
    toast.error(err?.message || 'Gagal mengunggah dokumen.')
  } finally {
    uploadingDoc.value = false
  }
}

async function handleDownloadDoc(doc) {
  try {
    const signedUrl = await store.downloadDocument(doc)
    if (signedUrl) {
      window.open(signedUrl, '_blank', 'noopener')
    }
  } catch (err) {
    toast.error(err?.message || 'Gagal mengambil tautan unduhan Supabase Storage.')
  }
}

async function removeDoc(doc) {
  if (!window.confirm(`Hapus dokumen "${doc.file_name || doc.name}"?`)) return
  try {
    await store.deleteDocument(doc.id)
    toast.success('Dokumen dihapus.')
  } catch (err) {
    toast.error(err?.message || 'Gagal menghapus dokumen.')
  }
}

function switchTab(tab) {
  activeTab.value = tab
  if (tab === 'feedback') {
    store.fetchSurveys(eventId.value).catch(() => {})
  }
}

async function saveSurvey() {
  if (!surveyTitle.value.trim()) return
  savingSurvey.value = true
  try {
    const questions = surveyQuestions.value
      .filter((q) => q.question.trim())
      .map((q, idx) => ({
        id: q.id || `q${idx + 1}`,
        question: q.question.trim(),
        question_type: q.question_type || 'text',
        options:
          q.question_type === 'multiple_choice'
            ? String(q.optionsText || '')
                .split(',')
                .map((opt) => opt.trim())
                .filter(Boolean)
            : []
      }))

    await store.createSurvey(eventId.value, {
      title: surveyTitle.value.trim(),
      description: surveyDesc.value.trim(),
      ...(questions.length ? { questions } : {})
    })
    surveyTitle.value = ''
    surveyDesc.value = ''
    surveyQuestions.value = [
      { id: 'q1', question: 'Bagaimana penilaian keseluruhan acara?', question_type: 'rating', optionsText: '' }
    ]
    showSurveyModal.value = false
    toast.success('Survei evaluasi berhasil dibuat.')
  } catch (err) {
    toast.error(err?.message || 'Gagal membuat survei. Pastikan modul Feedback aktif pada event.')
  } finally {
    savingSurvey.value = false
  }
}
</script>

<template>
  <div class="space-y-6 min-h-[calc(100vh-6rem)]">
    <!-- Header -->
    <div class="space-y-1">
      <span class="text-[10px] font-bold uppercase tracking-wider text-slate-500">LOGISTICS HUB</span>
      <h1 class="text-3xl font-bold tracking-tight text-black font-editorial">
        Operations, Vendors &amp; Partners
      </h1>
      <p class="text-xs text-slate-600">
        Kelola database rekanan vendor, paket kemitraan sponsor, arsip dokumen, dan survei kepuasan.
      </p>
    </div>

    <!-- Tab Pills Bar (Gated by Event Modules) -->
    <div v-if="enabledTabs.length" class="flex flex-wrap items-center gap-2.5">
      <button
        v-for="tab in enabledTabs"
        :key="tab.key"
        @click="switchTab(tab.key)"
        class="rounded-full border border-black px-5 py-2 text-xs font-semibold transition-colors cursor-pointer"
        :class="activeTab === tab.key ? 'bg-black text-white' : 'bg-white text-black hover:bg-slate-100'"
      >
        {{ tab.label }}
      </button>
    </div>

    <div
      v-if="!enabledTabs.length"
      class="rounded-2xl border border-black bg-white p-8 text-center space-y-2"
    >
      <h3 class="text-base font-bold text-black">Tidak Ada Modul Operasional Aktif</h3>
      <p class="text-xs text-slate-600 max-w-md mx-auto">
        Aktifkan minimal satu modul (Vendors, Sponsors, Dokumen, atau Feedback &amp; Survey) pada menu Pengaturan Modul Event.
      </p>
    </div>

    <!-- Active Tab: Vendors -->
    <div v-else-if="activeTab === 'vendors'" class="space-y-4">
      <div class="flex items-center justify-between">
        <span class="text-xs text-slate-600 font-medium">Total {{ vendors.length }} Vendor Terdaftar</span>
        <button
          @click="openCreateVendor"
          class="rounded-full bg-black px-5 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition-colors"
        >
          + Tambah Vendor
        </button>
      </div>

      <!-- Table Card -->
      <div class="rounded-2xl border border-black bg-white overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs">
            <thead class="bg-[#72a5e4]/30 border-b border-black text-[10px] font-bold uppercase text-slate-800">
              <tr>
                <th class="py-3.5 px-6">NAMA REKANAN VENDOR</th>
                <th class="py-3.5 px-6">KATEGORI LAYANAN</th>
                <th class="py-3.5 px-6">KONTAK PERSON</th>
                <th class="py-3.5 px-6">ESTIMASI KONTRAK</th>
                <th class="py-3.5 px-6">STATUS</th>
                <th class="py-3.5 px-6 text-right">AKSI</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-black/10">
              <tr v-for="v in vendors" :key="v.id" class="hover:bg-slate-50/50">
                <td class="py-4 px-6 font-bold text-black">{{ v.name }}</td>
                <td class="py-4 px-6 text-slate-700">{{ v.category }}</td>
                <td class="py-4 px-6 font-mono text-slate-600">{{ v.contact }}</td>
                <td class="py-4 px-6 font-bold text-black">{{ v.value }}</td>
                <td class="py-4 px-6">
                  <span
                    class="rounded-full border border-black px-3 py-1 text-xs font-semibold inline-flex items-center gap-1.5"
                    :class="v.status === 'Confirmed' || v.status === 'Completed' ? 'bg-[#72a5e4] text-black font-bold' : 'bg-white text-slate-700'"
                  >
                    <span>●</span>
                    <span>{{ v.status }}</span>
                  </span>
                </td>
                <td class="py-4 px-6 text-right">
                  <div class="inline-flex items-center gap-1.5">
                    <button
                      @click="openEditVendor(v)"
                      title="Edit Vendor"
                      class="rounded-full border border-black p-1.5 text-black hover:bg-slate-100"
                    >
                      <Pencil class="h-3.5 w-3.5" />
                    </button>
                    <button
                      @click="removeVendor(v)"
                      title="Hapus Vendor"
                      class="rounded-full border border-black p-1.5 text-red-600 hover:bg-red-50"
                    >
                      <Trash2 class="h-3.5 w-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
              <tr v-if="!vendors.length">
                <td colspan="6" class="py-8 px-6 text-center text-slate-500">
                  Belum ada vendor terdaftar pada event ini.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Active Tab: Sponsorship -->
    <div v-else-if="activeTab === 'sponsors'" class="space-y-4">
      <div class="flex items-center justify-between">
        <span class="text-xs text-slate-600 font-medium">Total {{ sponsors.length }} Mitra Sponsor</span>
        <button
          @click="openCreateSponsor"
          class="rounded-full bg-black px-5 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition-colors"
        >
          + Tambah Sponsor
        </button>
      </div>
      <div class="rounded-2xl border border-black bg-white overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs">
            <thead class="bg-[#72a5e4]/30 border-b border-black text-[10px] font-bold uppercase text-slate-800">
              <tr>
                <th class="py-3.5 px-6">NAMA PERUSAHAAN</th>
                <th class="py-3.5 px-6">TIER SPONSOR</th>
                <th class="py-3.5 px-6">PIC SPONSOR</th>
                <th class="py-3.5 px-6">NILAI KONTRIBUSI</th>
                <th class="py-3.5 px-6">STATUS</th>
                <th class="py-3.5 px-6 text-right">AKSI</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-black/10">
              <tr v-for="s in sponsors" :key="s.id" class="hover:bg-slate-50/50">
                <td class="py-4 px-6 font-bold text-black">{{ s.name }}</td>
                <td class="py-4 px-6 text-slate-700">{{ s.tier }}</td>
                <td class="py-4 px-6 text-slate-600">{{ s.pic }}</td>
                <td class="py-4 px-6 font-bold text-black">{{ s.contribution }}</td>
                <td class="py-4 px-6">
                  <span
                    class="rounded-full border border-black px-3 py-1 text-xs font-semibold inline-flex items-center gap-1.5"
                    :class="s.status === 'Confirmed' ? 'bg-[#72a5e4] text-black font-bold' : 'bg-white text-slate-700'"
                  >
                    <span>●</span>
                    <span>{{ s.status }}</span>
                  </span>
                </td>
                <td class="py-4 px-6 text-right">
                  <div class="inline-flex items-center gap-1.5">
                    <button
                      @click="openEditSponsor(s)"
                      title="Edit Sponsor"
                      class="rounded-full border border-black p-1.5 text-black hover:bg-slate-100"
                    >
                      <Pencil class="h-3.5 w-3.5" />
                    </button>
                    <button
                      @click="removeSponsor(s)"
                      title="Hapus Sponsor"
                      class="rounded-full border border-black p-1.5 text-red-600 hover:bg-red-50"
                    >
                      <Trash2 class="h-3.5 w-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
              <tr v-if="!sponsors.length">
                <td colspan="6" class="py-8 px-6 text-center text-slate-500">
                  Belum ada mitra sponsor tercatat.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Active Tab: Docs -->
    <div v-else-if="activeTab === 'docs'" class="space-y-4">
      <div class="flex items-center justify-between">
        <span class="text-xs text-slate-600 font-medium">Total {{ documents.length }} Dokumen Tersimpan</span>
        <button
          @click="showDocModal = true"
          class="rounded-full bg-black px-5 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition-colors cursor-pointer"
        >
          + Unggah Dokumen
        </button>
      </div>
      <div class="rounded-2xl border border-black bg-white overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs">
            <thead class="bg-[#72a5e4]/30 border-b border-black text-[10px] font-bold uppercase text-slate-800">
              <tr>
                <th class="py-3.5 px-6">NAMA DOKUMEN</th>
                <th class="py-3.5 px-6">KATEGORI</th>
                <th class="py-3.5 px-6">VISIBILITAS</th>
                <th class="py-3.5 px-6">DIPERBARUI</th>
                <th class="py-3.5 px-6 text-right">AKSI</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-black/10">
              <tr v-for="d in documents" :key="d.id" class="hover:bg-slate-50/50">
                <td class="py-4 px-6 font-bold text-black">{{ d.file_name || d.name }}</td>
                <td class="py-4 px-6 text-slate-700">{{ d.category }}</td>
                <td class="py-4 px-6 text-slate-600 uppercase">{{ d.visibility || 'internal' }}</td>
                <td class="py-4 px-6 text-slate-600">{{ d.updated || d.created_at?.slice(0, 10) || '-' }}</td>
                <td class="py-4 px-6 text-right">
                  <div class="inline-flex items-center gap-1.5">
                    <button
                      @click="handleDownloadDoc(d)"
                      type="button"
                      class="inline-flex items-center gap-1 rounded-full border border-black px-3 py-1 text-xs font-semibold hover:bg-slate-100 cursor-pointer"
                    >
                      <Download class="h-3 w-3" />
                      <span>Unduh</span>
                    </button>
                    <button
                      @click="removeDoc(d)"
                      type="button"
                      title="Hapus Dokumen"
                      class="rounded-full border border-black p-1.5 text-red-600 hover:bg-red-50 cursor-pointer"
                    >
                      <Trash2 class="h-3.5 w-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
              <tr v-if="!documents.length">
                <td colspan="5" class="py-8 px-6 text-center text-slate-500">
                  Belum ada dokumen tersimpan pada event ini.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Active Tab: Feedback & Surveys -->
    <div v-else-if="activeTab === 'feedback'" class="space-y-4">
      <div class="flex items-center justify-between">
        <span class="text-xs text-slate-600 font-medium">Total {{ surveys.length }} Kuesioner Survei</span>
        <button
          @click="showSurveyModal = true"
          class="rounded-full bg-black px-5 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition-colors"
        >
          + Buat Survei Evaluasi
        </button>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div
          v-for="srv in surveys"
          :key="srv.id"
          class="rounded-2xl border border-black bg-white p-5 space-y-3"
        >
          <div class="flex items-start justify-between gap-3">
            <div>
              <h3 class="text-sm font-bold text-black">{{ srv.title }}</h3>
              <p class="text-xs text-slate-600 mt-1">{{ srv.description || 'Survei evaluasi kepuasan peserta.' }}</p>
            </div>
            <span class="rounded-full border border-black bg-[#72a5e4] px-2.5 py-0.5 text-[10px] font-bold text-black shrink-0">
              {{ srv.is_active ? 'Aktif' : 'Nonaktif' }}
            </span>
          </div>

          <div v-if="(srv.questions || []).length" class="rounded-xl border border-black/15 bg-[#fafaf9] p-3 space-y-1 text-[11px]">
            <p class="font-bold text-black">{{ (srv.questions || []).length }} Pertanyaan Kuesioner:</p>
            <ul class="list-disc list-inside text-slate-700 space-y-0.5">
              <li v-for="(q, qIdx) in srv.questions.slice(0, 3)" :key="q.id || qIdx" class="truncate">
                {{ q.question }} <span class="text-[10px] text-slate-500">({{ q.question_type || 'text' }})</span>
              </li>
            </ul>
          </div>

          <div class="pt-3 border-t border-black/10 flex flex-wrap items-center justify-between gap-2 text-[11px] font-semibold text-slate-700">
            <span>{{ (srv.responses || []).length }} Respons Masuk</span>
            <div class="flex items-center gap-2">
              <button
                type="button"
                @click="exportSurveyCsv(srv)"
                class="inline-flex items-center gap-1 rounded-full border border-black bg-white px-2.5 py-1 text-[10px] font-bold text-black hover:bg-slate-100 cursor-pointer"
              >
                <Download class="h-3 w-3" />
                Ekspor CSV
              </button>
              <span class="font-mono text-slate-400">ID: {{ srv.id }}</span>
            </div>
          </div>
        </div>
      </div>

      <div v-if="!surveys.length" class="rounded-2xl border border-black bg-white p-8 text-center space-y-2">
        <h3 class="text-base font-bold text-black">Survei &amp; Feedback Peserta</h3>
        <p class="text-xs text-slate-600 max-w-md mx-auto">
          Belum ada survei evaluasi dibuat. Klik "+ Buat Survei Evaluasi" (memerlukan modul Feedback &amp; Survey aktif).
        </p>
      </div>
    </div>

    <!-- Modal Tambah / Edit Vendor -->
    <div
      v-if="showVendorModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-2xs"
    >
      <div class="w-full max-w-md rounded-3xl border-2 border-black bg-white p-6 sm:p-8 space-y-6">
        <div class="flex items-center justify-between border-b border-black/20 pb-3">
          <h3 class="text-xl font-bold text-black font-editorial">
            {{ editingVendorId ? 'Edit Rekanan Vendor' : 'Tambah Rekanan Vendor' }}
          </h3>
          <button @click="showVendorModal = false" class="p-1 rounded-full border border-black hover:bg-slate-100">
            <X class="h-4 w-4" />
          </button>
        </div>

        <form @submit.prevent="saveVendor" class="space-y-4 text-xs">
          <div class="space-y-1">
            <label class="font-bold text-black">Nama Vendor / Perusahaan</label>
            <input
              v-model="newName"
              type="text"
              required
              placeholder="Contoh: Sonic Sound System"
              class="w-full rounded-xl border border-black p-2.5 text-black focus:outline-hidden"
            />
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div class="space-y-1">
              <label class="font-bold text-black">Kategori Layanan</label>
              <input
                v-model="newCat"
                type="text"
                placeholder="Audio & Lighting"
                class="w-full rounded-xl border border-black p-2.5 text-black focus:outline-hidden"
              />
            </div>
            <div class="space-y-1">
              <label class="font-bold text-black">Status Kontrak</label>
              <select v-model="vendorStatus" class="w-full rounded-xl border border-black p-2.5 text-black bg-white">
                <option value="Pending">Pending</option>
                <option value="Confirmed">Confirmed</option>
                <option value="Completed">Completed</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-1">
              <label class="font-bold text-black">Kontak Person / No HP</label>
              <input
                v-model="newContact"
                type="text"
                placeholder="0812-xxxx-xxxx"
                class="w-full rounded-xl border border-black p-2.5 text-black focus:outline-hidden"
              />
            </div>
            <div class="space-y-1">
              <label class="font-bold text-black">Nilai Kontrak</label>
              <input
                v-model="newValue"
                type="text"
                placeholder="Rp 10.000.000"
                class="w-full rounded-xl border border-black p-2.5 text-black focus:outline-hidden"
              />
            </div>
          </div>

          <div class="pt-4 flex justify-end gap-3 border-t border-black/20">
            <button
              type="button"
              @click="showVendorModal = false"
              class="rounded-full border border-black bg-white px-5 py-2 font-semibold text-black hover:bg-slate-100"
            >
              Batal
            </button>
            <button
              type="submit"
              :disabled="savingVendor"
              class="rounded-full bg-black px-6 py-2 font-bold text-white hover:bg-slate-800 disabled:opacity-60"
            >
              {{ savingVendor ? 'Menyimpan...' : editingVendorId ? 'Simpan Perubahan' : 'Simpan Vendor' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Modal Tambah / Edit Sponsor -->
    <div
      v-if="showSponsorModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-2xs"
    >
      <div class="w-full max-w-md rounded-3xl border-2 border-black bg-white p-6 sm:p-8 space-y-6">
        <div class="flex items-center justify-between border-b border-black/20 pb-3">
          <h3 class="text-xl font-bold text-black font-editorial">
            {{ editingSponsorId ? 'Edit Mitra Sponsor' : 'Tambah Mitra Sponsor' }}
          </h3>
          <button @click="showSponsorModal = false" class="p-1 rounded-full border border-black hover:bg-slate-100">
            <X class="h-4 w-4" />
          </button>
        </div>

        <form @submit.prevent="saveSponsor" class="space-y-4 text-xs">
          <div class="space-y-1">
            <label class="font-bold text-black">Nama Perusahaan / Sponsor</label>
            <input
              v-model="spName"
              type="text"
              required
              placeholder="Contoh: Bank Kampus Indonesia"
              class="w-full rounded-xl border border-black p-2.5 text-black focus:outline-hidden"
            />
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div class="space-y-1">
              <label class="font-bold text-black">Tier Sponsor</label>
              <select v-model="spTier" class="w-full rounded-xl border border-black p-2.5 text-black bg-white">
                <option value="Platinum">Platinum</option>
                <option value="Gold">Gold</option>
                <option value="Silver">Silver</option>
                <option value="Media Partner">Media Partner</option>
                <option value="Community Partner">Community Partner</option>
              </select>
            </div>
            <div class="space-y-1">
              <label class="font-bold text-black">Status</label>
              <select v-model="spStatus" class="w-full rounded-xl border border-black p-2.5 text-black bg-white">
                <option value="Pending">Pending</option>
                <option value="Confirmed">Confirmed</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-1">
              <label class="font-bold text-black">PIC Sponsor</label>
              <input
                v-model="spPic"
                type="text"
                placeholder="Nama & kontak PIC"
                class="w-full rounded-xl border border-black p-2.5 text-black focus:outline-hidden"
              />
            </div>
            <div class="space-y-1">
              <label class="font-bold text-black">Nilai Kontribusi</label>
              <input
                v-model="spContribution"
                type="text"
                placeholder="Rp 10.000.000"
                class="w-full rounded-xl border border-black p-2.5 text-black focus:outline-hidden"
              />
            </div>
          </div>

          <div class="pt-4 flex justify-end gap-3 border-t border-black/20">
            <button
              type="button"
              @click="showSponsorModal = false"
              class="rounded-full border border-black bg-white px-5 py-2 font-semibold text-black hover:bg-slate-100"
            >
              Batal
            </button>
            <button
              type="submit"
              :disabled="savingSponsor"
              class="rounded-full bg-black px-6 py-2 font-bold text-white hover:bg-slate-800 disabled:opacity-60"
            >
              {{ savingSponsor ? 'Menyimpan...' : editingSponsorId ? 'Simpan Perubahan' : 'Simpan Sponsor' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Modal Buat Survei -->
    <div
      v-if="showSurveyModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-2xs"
    >
      <div class="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl border-2 border-black bg-white p-6 sm:p-8 space-y-5">
        <div class="flex items-center justify-between border-b border-black/20 pb-3">
          <h3 class="text-xl font-bold text-black font-editorial">Buat Survei Evaluasi Event</h3>
          <button @click="showSurveyModal = false" class="p-1 rounded-full border border-black hover:bg-slate-100">
            <X class="h-4 w-4" />
          </button>
        </div>

        <form @submit.prevent="saveSurvey" class="space-y-4 text-xs">
          <div class="space-y-1">
            <label class="font-bold text-black">Judul Kuesioner</label>
            <input
              v-model="surveyTitle"
              type="text"
              required
              placeholder="Contoh: Evaluasi Kepuasan Peserta DEMAFEST 2026"
              class="w-full rounded-xl border border-black p-2.5 text-black focus:outline-hidden"
            />
          </div>
          <div class="space-y-1">
            <label class="font-bold text-black">Deskripsi / Petunjuk Pengisian</label>
            <textarea
              v-model="surveyDesc"
              rows="2"
              placeholder="Berikan penilaian acara, materi pembicara, dan fasilitas venue..."
              class="w-full rounded-xl border border-black p-2.5 text-black focus:outline-hidden resize-none"
            />
          </div>

          <div class="space-y-2 rounded-2xl border border-black/20 bg-[#fafaf9] p-3.5">
            <div class="flex items-center justify-between">
              <label class="font-bold text-black">Daftar Pertanyaan Kuesioner</label>
              <button
                type="button"
                @click="addSurveyQuestion"
                class="rounded-full border border-black bg-[#72a5e4] px-3 py-1 text-[10px] font-bold text-black"
              >
                + Tambah Pertanyaan
              </button>
            </div>

            <div
              v-for="(q, idx) in surveyQuestions"
              :key="q.id"
              class="rounded-xl border border-black/20 bg-white p-3 space-y-2"
            >
              <div class="flex items-center justify-between gap-2">
                <span class="text-[10px] font-bold text-slate-500">Pertanyaan #{{ idx + 1 }}</span>
                <button
                  v-if="surveyQuestions.length > 1"
                  type="button"
                  @click="removeSurveyQuestion(idx)"
                  class="text-[10px] font-bold text-rose-600 hover:underline"
                >
                  Hapus
                </button>
              </div>
              <input
                v-model="q.question"
                type="text"
                placeholder="Tulis pertanyaan survei..."
                class="w-full rounded-lg border border-black p-2 text-black focus:outline-hidden"
              />
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <select v-model="q.question_type" class="rounded-lg border border-black p-2 text-black bg-white">
                  <option value="rating">Rating (1 - 5 Bintang)</option>
                  <option value="text">Isian Teks</option>
                  <option value="multiple_choice">Pilihan Ganda</option>
                </select>
                <input
                  v-if="q.question_type === 'multiple_choice'"
                  v-model="q.optionsText"
                  type="text"
                  placeholder="Opsi dipisah koma: Ya, Tidak"
                  class="rounded-lg border border-black p-2 text-black focus:outline-hidden"
                />
              </div>
            </div>
          </div>
          <div class="pt-3 flex justify-end gap-2 border-t border-black/20">
            <button
              type="button"
              @click="showSurveyModal = false"
              class="rounded-full border border-black bg-white px-4 py-2 font-semibold text-black hover:bg-slate-100"
            >
              Batal
            </button>
            <button
              type="submit"
              :disabled="savingSurvey"
              class="rounded-full bg-black px-5 py-2 font-bold text-white hover:bg-slate-800 disabled:opacity-60"
            >
              {{ savingSurvey ? 'Menyimpan...' : 'Buat Survei' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- Modal Unggah Dokumen ke Supabase Storage -->
    <div
      v-if="showDocModal"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-2xs"
    >
      <div class="w-full max-w-md rounded-3xl border-2 border-black bg-white p-6 sm:p-8 space-y-6">
        <div class="flex items-center justify-between border-b border-black/20 pb-3">
          <h3 class="text-xl font-bold text-black font-editorial">Unggah Dokumen Event</h3>
          <button @click="showDocModal = false" class="p-1 rounded-full border border-black hover:bg-slate-100">
            <X class="h-4 w-4" />
          </button>
        </div>

        <form @submit.prevent="handleUploadDoc" class="space-y-4 text-xs">
          <div class="space-y-1">
            <label class="font-bold text-black">Pilih File (PDF / Office / Gambar, maks 4MB)</label>
            <input
              type="file"
              required
              accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.csv,.txt,image/*"
              @change="(e) => { docFile = e.target.files?.[0] || null }"
              class="w-full rounded-xl border border-black p-2.5 text-black bg-[#fafaf9]"
            />
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div class="space-y-1">
              <label class="font-bold text-black">Kategori</label>
              <select v-model="docCategory" class="w-full rounded-xl border border-black p-2.5 text-black bg-white">
                <option value="Operasional">Operasional</option>
                <option value="Sponsorship">Sponsorship</option>
                <option value="Legal & Perizinan">Legal &amp; Perizinan</option>
                <option value="Materi Pembicara">Materi Pembicara</option>
              </select>
            </div>
            <div class="space-y-1">
              <label class="font-bold text-black">Visibilitas</label>
              <select v-model="docVisibility" class="w-full rounded-xl border border-black p-2.5 text-black bg-white">
                <option value="internal">Internal Panitia</option>
                <option value="public">Publik</option>
              </select>
            </div>
          </div>

          <div class="pt-4 flex justify-end gap-3 border-t border-black/20">
            <button
              type="button"
              @click="showDocModal = false"
              class="rounded-full border border-black bg-white px-5 py-2 font-semibold text-black hover:bg-slate-100"
            >
              Batal
            </button>
            <button
              type="submit"
              :disabled="uploadingDoc"
              class="rounded-full bg-black px-6 py-2 font-bold text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {{ uploadingDoc ? 'Mengunggah...' : 'Unggah ke Supabase' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

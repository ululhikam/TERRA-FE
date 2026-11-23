<script setup>
import { useEventWorkspaceStore } from '@/stores/eventWorkspace'
import { useToastStore } from '@/stores/toast'

const store = useEventWorkspaceStore()
const toast = useToastStore()

async function setStatus(org, status) {
  let notes = ''
  if (status === 'request_documents' || status === 'rejected') {
    const promptMsg = window.prompt(
      status === 'request_documents'
        ? `Dokumen tambahan yang diminta dari ${org.name}:`
        : `Alasan penolakan verifikasi ${org.name}:`,
      ''
    )
    if (promptMsg === null) return
    notes = promptMsg
  }
  await store.reviewVerification(org.id, status, notes)
  toast.success(`Status verifikasi ${org.name} diubah menjadi ${status}.`)
}
</script>

<template>
  <div class="space-y-6 min-h-[calc(100vh-6rem)]">
    <div class="space-y-1">
      <span class="text-[9px] font-bold uppercase tracking-widest text-slate-500 block">
        TRUST &amp; SAFETY
      </span>
      <h1 class="text-3xl font-bold text-black font-sans">Organizer Verification</h1>
      <p class="text-xs text-slate-500">Verifikasi legalitas dan profil organisasi penyelenggara event.</p>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div
        v-for="org in store.organizations"
        :key="org.id"
        class="rounded-xl border border-black bg-[#fafaf9] p-6 space-y-4 flex flex-col justify-between"
      >
        <div class="space-y-3">
          <div class="flex items-start justify-between gap-2">
            <div>
              <h3 class="text-base font-bold text-black">{{ org.name }}</h3>
              <p class="text-xs text-slate-500">{{ org.email }} • {{ org.website }}</p>
            </div>
            <span
              class="rounded-full border border-black px-3 py-0.5 text-[10px] font-bold"
              :class="org.verification_status === 'verified' ? 'bg-[#72a5e4] text-black' : 'bg-white text-black'"
            >
              {{ org.verification_status }}
            </span>
          </div>
          <p class="text-xs text-slate-600 leading-relaxed">{{ org.description }}</p>
        </div>

        <div class="flex flex-wrap gap-2 pt-3 border-t border-black/15">
          <button
            @click="setStatus(org, 'verified')"
            class="rounded-full border border-black bg-[#72a5e4] px-4 py-1.5 text-xs font-bold text-black hover:bg-[#5c93d9]"
          >
            ✓ Verify
          </button>
          <button
            @click="setStatus(org, 'request_documents')"
            class="rounded-full border border-black bg-amber-100 px-4 py-1.5 text-xs font-semibold text-black hover:bg-amber-200"
          >
            Minta Dokumen
          </button>
          <button
            @click="setStatus(org, 'rejected')"
            class="rounded-full border border-black bg-white px-4 py-1.5 text-xs font-semibold text-black hover:bg-rose-50"
          >
            Reject
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

export const MODULE_CATALOG = [
  {
    key: 'event_profile',
    name: 'Event Profile',
    description: 'Informasi inti, lokasi, jadwal utama, dan media event.',
    isCore: true,
    dependsOn: []
  },
  {
    key: 'timeline',
    name: 'Project Timeline',
    description: 'Timeline pengerjaan task, fase persiapan, dan milestone panitia.',
    isCore: false,
    dependsOn: ['event_profile']
  },
  {
    key: 'tasks',
    name: 'Task Management',
    description: 'Kanban board dan checklist persiapan panitia event.',
    isCore: false,
    dependsOn: ['event_profile']
  },
  {
    key: 'team',
    name: 'Team Management',
    description: 'Atur anggota tim event, departemen, dan granular permissions.',
    isCore: false,
    dependsOn: ['event_profile']
  },
  {
    key: 'ticketing',
    name: 'Ticketing',
    description: 'Jenis tiket gratis & berbayar, kuota atomik, dan periode penjualan.',
    isCore: false,
    dependsOn: ['event_profile']
  },
  {
    key: 'participants',
    name: 'Participant Management',
    description: 'Database peserta terdaftar, registrasi manual, dan export CSV.',
    isCore: false,
    dependsOn: ['ticketing']
  },
  {
    key: 'check_in',
    name: 'Check-in Scanner',
    description: 'Live kamera QR Scanner dan validasi kehadiran di venue.',
    isCore: false,
    dependsOn: ['ticketing']
  },
  {
    key: 'finance',
    name: 'Finance',
    description: 'Anggaran, pemasukan otomatis dari tiket berbayar, dan pengeluaran.',
    isCore: false,
    dependsOn: ['event_profile']
  },
  {
    key: 'vendors',
    name: 'Vendor Management',
    description: 'Database vendor, kontak, kontrak, dan status layanan.',
    isCore: false,
    dependsOn: ['event_profile']
  },
  {
    key: 'sponsors',
    name: 'Sponsor Management',
    description: 'Paket sponsorship, kontribusi, dan benefit sponsor.',
    isCore: false,
    dependsOn: ['event_profile']
  },
  {
    key: 'documents',
    name: 'Document Management',
    description: 'Penyimpanan dokumen internal & publik acara.',
    isCore: false,
    dependsOn: ['event_profile']
  },
  {
    key: 'reports',
    name: 'Reports & Analytics',
    description: 'Analisis mendalam penjualan tiket, funnel kehadiran, dan performa.',
    isCore: false,
    dependsOn: ['event_profile']
  },
  {
    key: 'feedback',
    name: 'Feedback & Survey',
    description: 'Buat kuesioner pasca-event dan kumpulkan rating peserta.',
    isCore: false,
    dependsOn: ['event_profile']
  }
]

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
    description: 'Penyimpanan dokumen internal & publik di Supabase Storage.',
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

export const MOCK_CATEGORIES = [
  { id: 'cat-1', name: 'Teknologi & Startup', slug: 'teknologi-startup', icon: 'Cpu', count: 14 },
  { id: 'cat-2', name: 'Musik & Konser', slug: 'musik-konser', icon: 'Music', count: 9 },
  { id: 'cat-3', name: 'Workshop & Edukasi', slug: 'workshop-edukasi', icon: 'BookOpen', count: 21 },
  { id: 'cat-4', name: 'Bisnis & Karir', slug: 'bisnis-karir', icon: 'Briefcase', count: 11 },
  { id: 'cat-5', name: 'Komunitas & Sosial', slug: 'komunitas-sosial', icon: 'Users', count: 16 },
  { id: 'cat-6', name: 'Seni & Desain', slug: 'seni-desain', icon: 'Palette', count: 8 }
]

export const MOCK_ORGANIZATIONS = [
  {
    id: 'org-1',
    name: 'Nusantara Tech Community',
    slug: 'nusantara-tech',
    description: 'Komunitas pengembang perangkat lunak, AI, dan ekosistem startup Indonesia.',
    logo_url: 'https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=200&q=80',
    cover_url: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200&q=80',
    email: 'hello@nusantaratech.id',
    phone: '+62 812 3456 7890',
    website: 'https://nusantaratech.id',
    verification_status: 'verified',
    member_count: 8,
    event_count: 5
  },
  {
    id: 'org-2',
    name: 'Kreatif Studio Lab',
    slug: 'kreatif-studio-lab',
    description: 'Penyelenggara workshop desain produk, UI/UX, dan pameran seni kontemporer.',
    logo_url: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=200&q=80',
    cover_url: 'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?w=1200&q=80',
    email: 'team@kreatiflab.id',
    phone: '+62 813 9876 5432',
    website: 'https://kreatiflab.id',
    verification_status: 'pending',
    member_count: 4,
    event_count: 2
  }
]

export const MOCK_EVENTS = [
  {
    id: 'evt-1',
    organization_id: 'org-1',
    organization: MOCK_ORGANIZATIONS[0],
    title: 'Indonesia Fullstack & AI Summit 2026',
    slug: 'indonesia-fullstack-ai-summit-2026',
    description:
      'Konferensi tahunan membahas arsitektur web modern, Vue 3, Node.js, dan implementasi AI generatif di skala produksi bersama 20+ praktisi industri.',
    category_id: 'cat-1',
    category: 'Teknologi & Startup',
    poster_url: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=900&q=80',
    banner_url: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1400&q=80',
    location_type: 'hybrid',
    location_name: 'Jakarta Convention Center (Hall B)',
    address: 'Jl. Gatot Subroto, Senayan, Jakarta Pusat',
    start_at: '2026-12-12T09:00:00+07:00',
    end_at: '2026-12-12T17:30:00+07:00',
    timezone: 'Asia/Jakarta',
    capacity: 600,
    status: 'Published',
    publication_status: 'Published',
    visibility: 'public',
    is_featured: true,
    enabled_modules: [
      'event_profile',
      'timeline',
      'tasks',
      'team',
      'ticketing',
      'participants',
      'check_in',
      'finance',
      'vendors',
      'sponsors',
      'documents',
      'reports',
      'feedback'
    ],
    ticket_types: [
      {
        id: 'tkt-1',
        event_id: 'evt-1',
        name: 'Community Free Pass',
        description: 'Akses penuh seluruh sesi keynote & networking area.',
        price: 0,
        currency: 'IDR',
        quantity: 300,
        sold_quantity: 214,
        sale_start_at: '2026-10-01T00:00:00+07:00',
        sale_end_at: '2026-12-11T23:59:00+07:00',
        min_per_order: 1,
        max_per_order: 3,
        status: 'On Sale'
      },
      {
        id: 'tkt-vip-1',
        event_id: 'evt-1',
        name: 'VIP Executive Pass',
        description: 'Kursi barisan depan, makan siang eksklusif, & akses Speaker Lounge.',
        price: 250000,
        currency: 'IDR',
        quantity: 100,
        sold_quantity: 48,
        sale_start_at: '2026-10-01T00:00:00+07:00',
        sale_end_at: '2026-12-11T23:59:00+07:00',
        min_per_order: 1,
        max_per_order: 4,
        status: 'On Sale'
      },
      {
        id: 'tkt-2',
        event_id: 'evt-1',
        name: 'Online Livestream Pass',
        description: 'Akses streaming HD + rekaman sesi selama 30 hari.',
        price: 0,
        currency: 'IDR',
        quantity: 200,
        sold_quantity: 89,
        sale_start_at: '2026-10-01T00:00:00+07:00',
        sale_end_at: '2026-12-12T09:00:00+07:00',
        min_per_order: 1,
        max_per_order: 2,
        status: 'On Sale'
      }
    ],
    schedules: [
      {
        id: 'sch-1',
        title: 'Registrasi & Morning Coffee',
        date: '2026-12-12',
        start_time: '08:30',
        end_time: '09:30',
        location: 'Main Lobby',
        pic: 'Rina Kusuma',
        visibility: 'public',
        status: 'Scheduled'
      },
      {
        id: 'sch-2',
        title: 'Keynote: Scalable Decoupled Web Architecture',
        date: '2026-12-12',
        start_time: '09:30',
        end_time: '11:00',
        location: 'Hall B Stage',
        pic: 'Andi Pratama',
        visibility: 'public',
        status: 'Scheduled'
      }
    ],
    speakers: [
      {
        id: 'spk-1',
        name: 'Dr. Aris Wibowo',
        type: 'Keynote Speaker',
        role_title: 'VP of AI Engineering • Nusantara Cloud',
        topic: 'Production-Grade Generative AI',
        avatar_url: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=300&q=80'
      },
      {
        id: 'spk-2',
        name: 'Sarah Wijaya',
        type: 'Pemateri',
        role_title: 'Principal Frontend Architect • TechScale',
        topic: 'Scalable Decoupled Vue 3 Architecture',
        avatar_url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=300&q=80'
      },
      {
        id: 'spk-3',
        name: 'Reza Prakoso',
        type: 'Guest Star',
        role_title: 'Tech Content Creator & Founder',
        topic: 'Fireside Chat: Future of Indonesian Developers',
        avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&q=80'
      }
    ]
  },
  {
    id: 'evt-2',
    organization_id: 'org-2',
    organization: MOCK_ORGANIZATIONS[1],
    title: 'Design Systems & Product Craft Workshop',
    slug: 'design-systems-product-craft-workshop',
    description:
      'Hands-on workshop membangun design system yang konsisten menggunakan Figma Tokens dan Tailwind CSS.',
    category_id: 'cat-6',
    category: 'Seni & Desain',
    poster_url: 'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?w=900&q=80',
    banner_url: 'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?w=1400&q=80',
    location_type: 'offline',
    location_name: 'Bandung Creative Hub',
    address: 'Jl. Laswi No.7, Bandung',
    start_at: '2026-12-20T13:00:00+07:00',
    end_at: '2026-12-20T17:00:00+07:00',
    timezone: 'Asia/Jakarta',
    capacity: 80,
    status: 'Published',
    publication_status: 'Published',
    visibility: 'public',
    is_featured: true,
    enabled_modules: ['event_profile', 'timeline', 'tasks', 'ticketing', 'participants', 'check_in', 'finance', 'reports'],
    ticket_types: [
      {
        id: 'tkt-3',
        event_id: 'evt-2',
        name: 'Regular Workshop Seat',
        description: 'Termasuk materi workshop, sertifikat digital, dan snack.',
        price: 150000,
        currency: 'IDR',
        quantity: 80,
        sold_quantity: 62,
        sale_start_at: '2026-10-15T00:00:00+07:00',
        sale_end_at: '2026-12-19T23:59:00+07:00',
        min_per_order: 1,
        max_per_order: 2,
        status: 'On Sale'
      }
    ],
    schedules: [
      {
        id: 'sch-4',
        title: 'Foundations of Design Tokens',
        date: '2026-12-20',
        start_time: '13:00',
        end_time: '15:00',
        location: 'Studio A',
        pic: 'Siti Rahma',
        visibility: 'public',
        status: 'Scheduled'
      }
    ],
    speakers: [
      {
        id: 'spk-4',
        name: 'Siti Rahma',
        type: 'Pemateri',
        role_title: 'Design Systems Lead • Kreatif Lab',
        topic: 'Design Tokens & Component Craft',
        avatar_url: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=300&q=80'
      }
    ]
  },
  {
    id: 'evt-3',
    organization_id: 'org-1',
    organization: MOCK_ORGANIZATIONS[0],
    title: 'Startup Founder & Investor Networking Night',
    slug: 'startup-founder-investor-networking-night',
    description:
      'Sesi networking eksklusif bagi founder tahap awal untuk bertukar wawasan dan pitching singkat bersama angel investor.',
    category_id: 'cat-4',
    category: 'Bisnis & Karir',
    poster_url: 'https://images.unsplash.com/photo-1515187029135-18ee286d815b?w=900&q=80',
    banner_url: 'https://images.unsplash.com/photo-1515187029135-18ee286d815b?w=1400&q=80',
    location_type: 'offline',
    location_name: 'SCBD Equity Tower Lounge',
    address: 'Sudirman Central Business District, Jakarta',
    start_at: '2027-01-10T18:30:00+07:00',
    end_at: '2027-01-10T21:30:00+07:00',
    timezone: 'Asia/Jakarta',
    capacity: 120,
    status: 'Preparation',
    publication_status: 'Pending Review',
    visibility: 'public',
    is_featured: false,
    enabled_modules: ['event_profile', 'timeline', 'tasks', 'team', 'ticketing', 'participants', 'check_in'],
    ticket_types: [
      {
        id: 'tkt-4',
        event_id: 'evt-3',
        name: 'Founder Pass (Free)',
        description: 'Khusus founder & co-founder startup.',
        price: 0,
        currency: 'IDR',
        quantity: 120,
        sold_quantity: 0,
        sale_start_at: '2026-11-20T00:00:00+07:00',
        sale_end_at: '2027-01-09T23:59:00+07:00',
        min_per_order: 1,
        max_per_order: 1,
        status: 'Scheduled'
      }
    ],
    schedules: [],
    speakers: []
  },
  {
    id: 'evt-4',
    organization_id: 'org-2',
    organization: MOCK_ORGANIZATIONS[1],
    title: 'Soundwave Indie & Jazz Night Festival 2026',
    slug: 'soundwave-indie-jazz-night-festival-2026',
    description:
      'Festival musik lintas genre menghadirkan musisi indie dan jazz terbaik tanah air dengan tata panggung imersif.',
    category_id: 'cat-2',
    category: 'Musik & Konser',
    poster_url: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=900&q=80',
    banner_url: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=1400&q=80',
    location_type: 'offline',
    location_name: 'GBK Senayan Outdoor Park, Jakarta',
    address: 'Gelora Bung Karno, Jakarta Pusat',
    start_at: '2026-12-27T16:00:00+07:00',
    end_at: '2026-12-27T23:00:00+07:00',
    timezone: 'Asia/Jakarta',
    capacity: 1000,
    status: 'Published',
    publication_status: 'Published',
    visibility: 'public',
    is_featured: true,
    enabled_modules: ['event_profile', 'ticketing', 'participants', 'check_in', 'finance', 'reports'],
    ticket_types: [
      {
        id: 'tkt-5',
        event_id: 'evt-4',
        name: 'Festival Pass - Presale 1',
        description: 'Tiket masuk area festival reguler.',
        price: 175000,
        currency: 'IDR',
        quantity: 500,
        sold_quantity: 440,
        min_per_order: 1,
        max_per_order: 4,
        status: 'On Sale'
      },
      {
        id: 'tkt-6',
        event_id: 'evt-4',
        name: 'VIP Front Row + Merch',
        description: 'Akses barisan depan panggung + official merchandise pack.',
        price: 350000,
        currency: 'IDR',
        quantity: 200,
        sold_quantity: 165,
        min_per_order: 1,
        max_per_order: 4,
        status: 'On Sale'
      }
    ],
    schedules: [
      {
        id: 'sch-5',
        title: 'Open Gate & Sunset Acoustic Session',
        date: '2026-12-27',
        start_time: '16:30',
        end_time: '18:30',
        location: 'Main Lawn Stage',
        pic: 'Stage Manager',
        visibility: 'public',
        status: 'Scheduled'
      },
      {
        id: 'sch-6',
        title: 'Headliner Performance: Senja & Orchestra',
        date: '2026-12-27',
        start_time: '20:00',
        end_time: '22:30',
        location: 'Main Stage',
        pic: 'Stage Manager',
        visibility: 'public',
        status: 'Scheduled'
      }
    ],
    speakers: [
      {
        id: 'spk-5',
        name: 'Senja & The Brass',
        type: 'Guest Star',
        role_title: 'Headliner Band',
        topic: 'Special Album Tour Performance',
        avatar_url: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&q=80'
      }
    ]
  },
  {
    id: 'evt-5',
    organization_id: 'org-1',
    organization: MOCK_ORGANIZATIONS[0],
    title: 'Product Management & AI Growth Bootcamp',
    slug: 'product-management-ai-growth-bootcamp',
    description:
      'Bootcamp intensif 1 hari membahas strategi pertumbuhan produk digital, eksperimen A/B, dan adopsi AI untuk Product Manager.',
    category_id: 'cat-3',
    category: 'Workshop & Edukasi',
    poster_url: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?w=900&q=80',
    banner_url: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?w=1400&q=80',
    location_type: 'online',
    location_name: 'Online via TERRA Live / Zoom',
    address: 'Virtual Event',
    start_at: '2026-12-18T09:00:00+07:00',
    end_at: '2026-12-18T16:00:00+07:00',
    timezone: 'Asia/Jakarta',
    capacity: 300,
    status: 'Published',
    publication_status: 'Published',
    visibility: 'public',
    is_featured: true,
    enabled_modules: ['event_profile', 'ticketing', 'participants', 'reports'],
    ticket_types: [
      {
        id: 'tkt-7',
        event_id: 'evt-5',
        name: 'Early Bird Bootcamp Ticket',
        description: 'Akses live session, e-certificate, dan template PRD.',
        price: 99000,
        currency: 'IDR',
        quantity: 300,
        sold_quantity: 230,
        min_per_order: 1,
        max_per_order: 2,
        status: 'On Sale'
      }
    ],
    schedules: [],
    speakers: [
      {
        id: 'spk-6',
        name: 'Kevin Wijaya',
        type: 'Pemateri',
        role_title: 'Head of Product • FinNext',
        topic: 'AI-First Product Discovery & Metrics',
        avatar_url: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=300&q=80'
      }
    ]
  },
  {
    id: 'evt-6',
    organization_id: 'org-2',
    organization: MOCK_ORGANIZATIONS[1],
    title: 'Nusantara Creators & Community Meetup Bali',
    slug: 'nusantara-creators-community-meetup-bali',
    description:
      'Temu komunitas kreator digital, desainer, dan pekerja remote di Bali disertai sesi sharing terbuka.',
    category_id: 'cat-5',
    category: 'Komunitas & Sosial',
    poster_url: 'https://images.unsplash.com/photo-1528605248644-14dd04022da1?w=900&q=80',
    banner_url: 'https://images.unsplash.com/photo-1528605248644-14dd04022da1?w=1400&q=80',
    location_type: 'offline',
    location_name: 'Canggu Creative Hub, Bali',
    address: 'Jl. Pantai Batu Bolong, Canggu, Bali',
    start_at: '2027-01-05T15:00:00+07:00',
    end_at: '2027-01-05T19:00:00+07:00',
    timezone: 'Asia/Makassar',
    capacity: 150,
    status: 'Published',
    publication_status: 'Published',
    visibility: 'public',
    is_featured: true,
    enabled_modules: ['event_profile', 'ticketing', 'participants', 'check_in'],
    ticket_types: [
      {
        id: 'tkt-8',
        event_id: 'evt-6',
        name: 'Community Free Pass',
        description: 'Gratis masuk + welcome drink untuk 100 pendaftar pertama.',
        price: 0,
        currency: 'IDR',
        quantity: 150,
        sold_quantity: 118,
        min_per_order: 1,
        max_per_order: 2,
        status: 'On Sale'
      }
    ],
    schedules: [],
    speakers: []
  }
]

export const MOCK_TASKS = [
  {
    id: 'chk-p1',
    parent_id: null,
    is_group: true,
    event_id: 'evt-1',
    title: 'Persiapan Acara (2 Minggu)',
    description: 'Fase perencanaan konsep, rundown, dan pengamanan venue utama.',
    phase: 'Pre-Event',
    assigned_to: 'Hikam Pratama',
    priority: 'High',
    status: 'In Progress',
    start_date: '2026-11-01',
    due_at: '2026-11-15',
    progress: 80
  },
  {
    id: 'tsk-1',
    parent_id: 'chk-p1',
    is_group: false,
    event_id: 'evt-1',
    title: 'Konsep Acara & Tema Utama',
    description: 'Menentukan tema besar, target audiens, dan format acara.',
    phase: 'Pre-Event',
    assigned_to: 'Rina Kusuma',
    priority: 'High',
    status: 'Done',
    start_date: '2026-11-01',
    due_at: '2026-11-05',
    progress: 100
  },
  {
    id: 'tsk-1b',
    parent_id: 'chk-p1',
    is_group: false,
    event_id: 'evt-1',
    title: 'Penyusunan Rundown & Kurasi Pembicara',
    description: 'Menyusun jadwal sesi dan konfirmasi pembicara keynote.',
    phase: 'Pre-Event',
    assigned_to: 'Rina Kusuma',
    priority: 'High',
    status: 'Done',
    start_date: '2026-11-05',
    due_at: '2026-11-10',
    progress: 100
  },
  {
    id: 'tsk-1c',
    parent_id: 'chk-p1',
    is_group: false,
    event_id: 'evt-1',
    title: 'Booking Venue & Kontrak Hall B JCC',
    description: 'DP 50% dan tanda tangan perjanjian sewa tempat.',
    phase: 'Pre-Event',
    assigned_to: 'Hikam Pratama',
    priority: 'High',
    status: 'In Progress',
    start_date: '2026-11-10',
    due_at: '2026-11-15',
    progress: 50
  },
  {
    id: 'chk-p2',
    parent_id: null,
    is_group: true,
    event_id: 'evt-1',
    title: 'Marketing & Publikasi Tiket',
    description: 'Promosi digital, media partner, dan pembukaan pendaftaran.',
    phase: 'Marketing',
    assigned_to: 'Rina Kusuma',
    priority: 'Medium',
    status: 'In Progress',
    start_date: '2026-11-14',
    due_at: '2026-12-01',
    progress: 55
  },
  {
    id: 'tsk-3',
    parent_id: 'chk-p2',
    is_group: false,
    event_id: 'evt-1',
    title: 'Kampanye Sosial Media & Partner Blast',
    description: 'Publikasi poster pembicara gelombang kedua di Instagram & LinkedIn.',
    phase: 'Marketing',
    assigned_to: 'Rina Kusuma',
    priority: 'Medium',
    status: 'In Progress',
    start_date: '2026-11-14',
    due_at: '2026-11-24',
    progress: 60
  },
  {
    id: 'tsk-3b',
    parent_id: 'chk-p2',
    is_group: false,
    event_id: 'evt-1',
    title: 'Email Blast & Early Bird Reminder',
    description: 'Kirim newsletter ke database komunitas.',
    phase: 'Marketing',
    assigned_to: 'Andi Pratama',
    priority: 'Medium',
    status: 'To Do',
    start_date: '2026-11-23',
    due_at: '2026-12-01',
    progress: 20
  },
  {
    id: 'chk-p3',
    parent_id: null,
    is_group: true,
    event_id: 'evt-1',
    title: 'Produksi, Vendor & Persiapan Hari-H',
    description: 'Eksekusi teknis venue, audio LED, materi pembicara, dan gate check-in.',
    phase: 'Production',
    assigned_to: 'Budi Santoso',
    priority: 'High',
    status: 'In Progress',
    start_date: '2026-11-18',
    due_at: '2026-12-12',
    progress: 50
  },
  {
    id: 'tsk-2',
    parent_id: 'chk-p3',
    is_group: false,
    event_id: 'evt-1',
    title: 'Finalisasi Kontrak Audio & LED Stage',
    description: 'Pastikan vendor AV mengirimkan layout teknis paling lambat H-14.',
    phase: 'Production',
    assigned_to: 'Budi Santoso',
    priority: 'High',
    status: 'In Progress',
    start_date: '2026-11-18',
    due_at: '2026-11-29',
    progress: 65
  },
  {
    id: 'tsk-4',
    parent_id: 'chk-p3',
    is_group: false,
    event_id: 'evt-1',
    title: 'Konfirmasi Slide Materi Pembicara',
    description: 'Kumpulkan deck presentasi dalam format 16:9.',
    phase: 'Production',
    assigned_to: 'Rina Kusuma',
    priority: 'Medium',
    status: 'To Do',
    start_date: '2026-11-28',
    due_at: '2026-12-08',
    progress: 15
  },
  {
    id: 'tsk-5',
    parent_id: 'chk-p3',
    is_group: false,
    event_id: 'evt-1',
    title: 'Gladi Resik & Setup Gate QR Scanner',
    description: 'Uji coba 4 perangkat kamera scanner dengan database check-in.',
    phase: 'Event Day',
    assigned_to: 'Andi Pratama',
    priority: 'High',
    status: 'Review',
    start_date: '2026-12-08',
    due_at: '2026-12-12',
    progress: 85
  },
  {
    id: 'chk-p4',
    parent_id: null,
    is_group: true,
    event_id: 'evt-1',
    title: 'Pelaksanaan & Evaluasi Pasca Acara',
    description: 'Eksekusi hari-H, rekap anggaran final, dan survei kepuasan peserta.',
    phase: 'Post-Event',
    assigned_to: 'Hikam Pratama',
    priority: 'Medium',
    status: 'To Do',
    start_date: '2026-12-12',
    due_at: '2026-12-22',
    progress: 10
  },
  {
    id: 'tsk-6',
    parent_id: 'chk-p4',
    is_group: false,
    event_id: 'evt-1',
    title: 'Registrasi Ulang & Acara Utama Hari-H',
    description: 'Operasional seluruh gate dan panggung utama.',
    phase: 'Event Day',
    assigned_to: 'Seluruh Panitia',
    priority: 'High',
    status: 'To Do',
    start_date: '2026-12-12',
    due_at: '2026-12-14',
    progress: 0
  },
  {
    id: 'tsk-7',
    parent_id: 'chk-p4',
    is_group: false,
    event_id: 'evt-1',
    title: 'Rekap Keuangan, Survei & Laporan Akhir',
    description: 'Penutupan pembukuan dan pengiriman laporan akhir sponsor.',
    phase: 'Post-Event',
    assigned_to: 'Hikam Pratama',
    priority: 'Medium',
    status: 'To Do',
    start_date: '2026-12-15',
    due_at: '2026-12-22',
    progress: 0
  }
]

export const MOCK_TICKETS = [
  {
    id: 'tc-1',
    ticket_code: 'EVT26-9841-AB',
    qr_payload: 'TERRA:EVT26-9841-AB:evt-1',
    event_id: 'evt-1',
    event_title: 'Indonesia Fullstack & AI Summit 2026',
    event_date: '2026-12-12T09:00:00+07:00',
    location: 'Jakarta Convention Center (Hall B)',
    ticket_type: 'VIP Executive Pass',
    participant_name: 'Nadia Putri',
    participant_email: 'nadia@example.com',
    order_number: 'ORD-20261116-001',
    status: 'Active'
  },
  {
    id: 'tc-2',
    ticket_code: 'EVT26-5512-CD',
    qr_payload: 'TERRA:EVT26-5512-CD:evt-2',
    event_id: 'evt-2',
    event_title: 'Design Systems & Product Craft Workshop',
    event_date: '2026-12-20T13:00:00+07:00',
    location: 'Bandung Creative Hub',
    ticket_type: 'Regular Workshop Seat',
    participant_name: 'Nadia Putri',
    participant_email: 'nadia@example.com',
    order_number: 'ORD-20261116-002',
    status: 'Used'
  }
]

export const MOCK_PARTICIPANTS = [
  {
    id: 'pt-1',
    event_id: 'evt-1',
    full_name: 'Hikam Pratama',
    email: 'hikam@example.com',
    phone: '081234567890',
    ticket_type: 'VIP Executive Pass',
    ticket_code: 'EVT26-9841-AB',
    order_number: 'ORD-20261116-001',
    registration_status: 'Confirmed',
    checked_in: false
  },
  {
    id: 'pt-2',
    event_id: 'evt-1',
    full_name: 'Nadia Putri',
    email: 'nadia@example.com',
    phone: '081345678901',
    ticket_type: 'Community Free Pass',
    ticket_code: 'EVT26-3310-XY',
    order_number: 'ORD-20261115-088',
    registration_status: 'Confirmed',
    checked_in: true
  },
  {
    id: 'pt-3',
    event_id: 'evt-1',
    full_name: 'Dimas Wijaya',
    email: 'dimas@example.com',
    phone: '081567890123',
    ticket_type: 'Online Livestream Pass',
    ticket_code: 'EVT26-7721-KL',
    order_number: 'ORD-20261114-042',
    registration_status: 'Confirmed',
    checked_in: false
  },
  {
    id: 'pt-4',
    event_id: 'evt-1',
    full_name: 'Siti Rahmawati',
    email: 'siti@example.com',
    phone: '081711223344',
    ticket_type: 'VIP Executive Pass',
    ticket_code: 'EVT26-4402-MN',
    order_number: 'ORD-20261113-019',
    registration_status: 'Confirmed',
    checked_in: true
  }
]

export const MOCK_FINANCE = {
  budget: 75000000,
  incomes: [
    { id: 'inc-1', category: 'Sponsorship', description: 'Sponsor Utama CloudTech', amount: 45000000, date: '2026-11-01' },
    { id: 'inc-2', category: 'Partner Grant', description: 'Dukungan Komunitas', amount: 15000000, date: '2026-11-05' }
  ],
  expenses: [
    { id: 'exp-1', category: 'Venue', description: 'Sewa Hall B JCC (DP)', amount: 25000000, date: '2026-11-03' },
    { id: 'exp-2', category: 'AV & Stage', description: 'Vendor Sound & LED Screen', amount: 12500000, date: '2026-11-10' },
    { id: 'exp-3', category: 'Marketing', description: 'Produksi Banner & Lanyard', amount: 4200000, date: '2026-11-12' },
    { id: 'exp-4', category: 'Konsumsi', description: 'Catering VIP & Panitia', amount: 6500000, date: '2026-11-14' }
  ]
}

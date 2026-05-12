# Product Requirements Document (PRD)
# Sistem Informasi Akademik & Penjadwalan Pascasarjana

**Nama Produk:** Prodi CMS (Jadwal)  
**Versi Dokumen:** 1.0  
**Tanggal:** 11 Mei 2026  
**Status:** In Development  

---

## 1. Ringkasan Eksekutif

Prodi CMS adalah Sistem Informasi Akademik berbasis web yang dirancang khusus untuk kebutuhan **Program Pascasarjana (S2/S3)**. Sistem ini menangani seluruh siklus operasional akademik mulai dari penjadwalan kuliah, monitoring kehadiran dosen, pengelolaan nilai, hingga layanan surat menyurat dan survei evaluasi dosen (EDOM).

Sistem dibangun dengan arsitektur modern (REST API + SPA) yang memungkinkan akses multi-platform (Web Responsive & Android PWA) serta mendukung multi-prodi dengan pembatasan akses data yang ketat.

---

## 2. Latar Belakang & Masalah

### Masalah yang Diselesaikan

1. **Penjadwalan Kompleks Pascasarjana** — Dosen S2/S3 sering merupakan dosen praktisi dengan jadwal tidak tetap, membutuhkan sistem reschedule yang fleksibel dan deteksi bentrok otomatis.
2. **Monitoring Kehadiran Dosen** — Staff prodi membutuhkan dashboard real-time untuk memantau apakah dosen hadir mengajar sesuai jadwal.
3. **Administrasi Surat Menyurat** — Proses pembuatan surat keterangan mahasiswa yang manual dan lambat perlu diotomasi dengan template dan penomoran otomatis.
4. **Evaluasi Dosen (EDOM)** — Survei evaluasi dosen perlu dilakukan secara digital dengan target otomatis berdasarkan enrollment mahasiswa.
5. **Pelaporan BKD** — Dosen membutuhkan cetak laporan Beban Kerja Dosen (SK Mengajar, Jurnal, Rekap Nilai) yang terintegrasi.
6. **Isolasi Data Multi-Prodi** — Setiap staff prodi hanya boleh mengakses data prodi yang menjadi tanggung jawabnya.

---

## 3. Tujuan Produk

| # | Tujuan | Metrik Keberhasilan |
|---|--------|---------------------|
| 1 | Mengotomasi penjadwalan kuliah | Jadwal 1 semester ter-generate < 5 menit |
| 2 | Menyediakan monitoring kehadiran dosen real-time | Staff dapat melihat status kelas hari ini dalam 1 klik |
| 3 | Mempercepat layanan surat mahasiswa | Waktu proses surat dari request hingga cetak < 1 hari kerja |
| 4 | Mendigitalisasi survei evaluasi dosen | 100% mahasiswa aktif dapat mengisi EDOM secara online |
| 5 | Menyediakan portal dosen terintegrasi | Dosen dapat input jurnal, absensi, dan nilai dalam 1 platform |

---

## 4. Target Pengguna (User Personas)

### 4.1 Superadmin / Admin Sistem
- **Deskripsi:** Pengelola utama sistem, memiliki akses penuh ke seluruh fitur dan data.
- **Kebutuhan:** Manajemen user, role, permission, konfigurasi sistem, dan monitoring global.

### 4.2 Staff Prodi
- **Deskripsi:** Tenaga administrasi yang mengelola operasional akademik satu atau beberapa program studi.
- **Kebutuhan:** Plotting jadwal, monitoring kehadiran dosen, pengelolaan kelas & enrollment, proses surat, dan pelaksanaan EDOM.
- **Batasan:** Hanya dapat mengakses data prodi yang di-assign kepadanya.

### 4.3 Dosen / Pengajar
- **Deskripsi:** Tenaga pengajar (termasuk dosen praktisi) yang mengampu mata kuliah.
- **Kebutuhan:** Melihat jadwal pribadi, input jurnal perkuliahan, absensi mahasiswa, input nilai, cetak laporan BKD, dan request reschedule.

### 4.4 Mahasiswa
- **Deskripsi:** Peserta didik program S2/S3.
- **Kebutuhan:** Melihat jadwal kuliah, mengisi survei EDOM, mengajukan surat, dan upload tugas.
- **Catatan:** Akses terbatas, beberapa fitur (surat, survei) tersedia tanpa login penuh via portal publik.

---

## 5. Arsitektur Sistem

### 5.1 Stack Teknologi

| Layer | Teknologi | Versi |
|-------|-----------|-------|
| Backend Framework | NestJS (TypeScript) | 11.x |
| ORM | TypeORM | 0.3.x |
| Database | PostgreSQL | 15+ |
| Frontend Framework | Vue 3 (Composition API) | 3.5.x |
| Build Tool | Vite | 7.x |
| UI Components | shadcn-vue (Reka UI) | 2.x |
| CSS Framework | TailwindCSS | 4.x |
| State Management | Pinia | 3.x |
| Authentication | JWT (Access + Refresh Token) | — |
| File Storage | Supabase Storage | — |
| Rich Text Editor | TinyMCE + Tiptap | 6.x / 3.x |

### 5.2 Arsitektur Tingkat Tinggi

```
┌─────────────────────────────────────────────────────────┐
│                    CLIENT LAYER                          │
│  ┌──────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │ Web SPA  │  │ Survey Portal│  │ Letter Portal    │  │
│  │ (Admin)  │  │ (Public)     │  │ (Public/Student) │  │
│  └──────────┘  └──────────────┘  └──────────────────┘  │
└────────────────────────┬────────────────────────────────┘
                         │ HTTPS / REST API
┌────────────────────────┴────────────────────────────────┐
│                    API LAYER (NestJS)                    │
│  ┌────────┐ ┌──────┐ ┌──────────┐ ┌─────────────────┐  │
│  │  Auth  │ │ RBAC │ │ Prodi    │ │ Feature Modules │  │
│  │ Guard  │ │Guard │ │ Scope    │ │ (10+ modules)   │  │
│  └────────┘ └──────┘ └──────────┘ └─────────────────┘  │
└────────────────────────┬────────────────────────────────┘
                         │ TypeORM
┌────────────────────────┴────────────────────────────────┐
│              DATA LAYER (PostgreSQL)                     │
│         32 entities, soft deletes, relations             │
└─────────────────────────────────────────────────────────┘
```

### 5.3 Deployment Modes

Aplikasi frontend mendukung 3 mode deployment via environment variable:
1. **Main App** (default) — Admin panel lengkap dengan semua fitur.
2. **Survey Portal** (`VITE_IS_SURVEY_PORTAL=true`) — Hanya menampilkan halaman survei publik.
3. **Letter Portal** (`VITE_IS_LETTER_PORTAL=true`) — Hanya menampilkan layanan surat mahasiswa.

---

## 6. Fitur & Modul

### 6.1 Modul Autentikasi & Manajemen User (ACL)

**Deskripsi:** Sistem login berbasis JWT dengan role-based access control granular.

| Fitur | Deskripsi | Status |
|-------|-----------|--------|
| Login/Logout | Email + Password, JWT access & refresh token | ✅ Selesai |
| Auto Refresh Token | Token expired otomatis di-refresh tanpa re-login | ✅ Selesai |
| CRUD User | Buat, edit, hapus user dengan soft delete | ✅ Selesai |
| Assign Role | Satu user bisa memiliki banyak role | ✅ Selesai |
| Permission Granular | Setiap role memiliki set permission spesifik | ✅ Selesai |
| Profil Dosen | NIDN, NIP, Gelar, Homebase Prodi | ✅ Selesai |
| Profil Mahasiswa | NIM, Angkatan, Status, Prodi, Konsentrasi | ✅ Selesai |
| Staff Prodi Access | Mapping staff ke banyak prodi (data scoping) | ✅ Selesai |
| Bulk Import Excel | Import data user dari file .xlsx | ✅ Selesai |

**Roles yang tersedia:**
- `superadmin` — Akses penuh tanpa batasan
- `admin` — Akses penuh ke semua prodi
- `staff` — Akses terbatas sesuai prodi yang di-assign
- `dosen` — Akses portal dosen
- `mahasiswa` — Akses terbatas (jadwal, survei, surat)

---

### 6.2 Modul Master Data Akademik

**Deskripsi:** Pengelolaan data referensi akademik yang menjadi fondasi seluruh sistem.

| Fitur | Deskripsi | Status |
|-------|-----------|--------|
| Semester | Ganjil/Genap per tahun akademik, flag aktif | ✅ Selesai |
| Program Studi | Kode, nama, jenjang (S2/S3), short name | ✅ Selesai |
| Mata Kuliah | Kode, nama, SKS, prodi, import Excel | ✅ Selesai |
| Ruangan | Nama, kapasitas, status ketersediaan | ✅ Selesai |
| Timeslot | Slot waktu standar (jam mulai-selesai) | ✅ Selesai |
| Kurikulum | Kurikulum per prodi per tahun, mapping MK | ✅ Selesai |
| Konsentrasi | Peminatan/bidang keahlian per prodi | ✅ Selesai |
| Komponen Nilai | Definisi bobot penilaian (Tugas, UTS, UAS) | ✅ Selesai |

**Constraint:**
- Semua entity mendukung soft delete
- Bulk actions (trash, restore, force delete) tersedia di semua tabel
- Data default mengacu ke semester aktif

---

### 6.3 Modul Kelas & Enrollment

**Deskripsi:** Pengelolaan rombongan belajar (kelas), penugasan mata kuliah ke kelas, penugasan dosen, dan enrollment mahasiswa.

| Fitur | Deskripsi | Status |
|-------|-----------|--------|
| CRUD Kelas (Rombel) | Buat kelas per semester per prodi | ✅ Selesai |
| Class Courses | Assign banyak MK ke satu rombel | ✅ Selesai |
| Assign Dosen | Tugaskan dosen (termasuk tim teaching) ke MK | ✅ Selesai |
| Enroll Mahasiswa | Masukkan mahasiswa ke kelas/MK spesifik | ✅ Selesai |
| Detail Kelas | Lihat MK, dosen, mahasiswa, jadwal dalam 1 halaman | ✅ Selesai |
| Prodi Scoping | Staff hanya lihat kelas prodi-nya | ✅ Selesai |

**Struktur Data:**
```
Class (Rombel) → has many → ClassCourse (MK dalam rombel)
ClassCourse → has many → ClassLecturer (Dosen pengampu)
ClassCourse → has many → ClassSchedule (Jadwal pertemuan)
ClassCourse → has many → ClassCourseStudent (Mahasiswa per MK)
Class → has many → ClassStudent (Mahasiswa per rombel)
```

---

### 6.4 Modul Penjadwalan

**Deskripsi:** Sistem penjadwalan kuliah dengan algoritma backtracking untuk auto-generate dan fitur manual scheduling.

| Fitur | Deskripsi | Status |
|-------|-----------|--------|
| Auto-Generate Jadwal | Algoritma backtracking untuk plotting otomatis | ✅ Selesai |
| Manual Scheduling | Tambah jadwal pertemuan satu per satu | ✅ Selesai |
| Deteksi Bentrok | Cek konflik ruangan dan dosen | ✅ Selesai |
| Reschedule (Edit) | Ubah tanggal/waktu/ruang pertemuan | ✅ Selesai |
| Bulk Update/Delete | Operasi massal pada banyak jadwal | ✅ Selesai |
| Jadwal Personal | Dosen/mahasiswa lihat jadwal sendiri | ✅ Selesai |
| Jadwal per Dosen | Lihat jadwal mengajar dosen lintas prodi | ✅ Selesai |
| Prodi Scoping | Staff hanya lihat jadwal prodi-nya | ✅ Selesai |

**Algoritma Generate:**
- Input: Semester, kelas, constraint (timeslot, ruangan, dosen)
- Proses: Backtracking dengan constraint satisfaction
- Output: Jadwal optimal tanpa bentrok

---

### 6.5 Modul Survei / EDOM (Evaluasi Dosen oleh Mahasiswa)

**Deskripsi:** Sistem survei digital untuk evaluasi dosen yang terintegrasi dengan data enrollment.

| Fitur | Deskripsi | Status |
|-------|-----------|--------|
| CRUD Instrumen Survei | Buat/edit/hapus instrumen survei | ✅ Selesai |
| Survey Builder | Drag & drop pertanyaan (skala, essay, pilihan) | ✅ Selesai |
| Duplikasi Instrumen | Salin instrumen untuk semester berikutnya | ✅ Selesai |
| Enrollment-Based Target | Otomatis target ke mahasiswa yang mengambil MK | ✅ Selesai |
| Form Pengisian | Mahasiswa isi survei per dosen per MK | ✅ Selesai |
| My Pending Surveys | Mahasiswa lihat survei yang belum diisi | ✅ Selesai |
| Hasil & Analisis | Admin lihat hasil agregat per dosen/MK | ✅ Selesai |
| Public URL | Survei bisa diakses via link publik (hash) | ✅ Selesai |
| Survey Portal Mode | Deployment terpisah khusus survei | ✅ Selesai |
| Reset Data | Admin bisa reset response (per rombel/total) | ✅ Selesai |

---

### 6.6 Modul Surat Menyurat (Letters)

**Deskripsi:** Sistem layanan surat keterangan mahasiswa dengan template dinamis, penomoran otomatis, dan portal publik.

| Fitur | Deskripsi | Status |
|-------|-----------|--------|
| Template Surat | Editor template dengan 3 mode (TinyMCE, Raw HTML, Form Blok) | ✅ Selesai |
| Kop Surat | Mode gambar atau mode blok (logo + teks otomatis) | ✅ Selesai |
| Jenis Surat | Definisi jenis surat dengan form builder dinamis | ✅ Selesai |
| Form Builder | Drag & drop field (text, date, file, select) | ✅ Selesai |
| Klasifikasi Surat | Kode klasifikasi untuk penomoran otomatis | ✅ Selesai |
| Penomoran Otomatis | Format nomor surat kustom per jenis | ✅ Selesai |
| Variable Mapping | Variabel dinamis ([nama], [nim], dll) di template | ✅ Selesai |
| Portal Publik Mahasiswa | Mahasiswa ajukan surat tanpa login admin | ✅ Selesai |
| PIN Authentication | Mahasiswa verifikasi identitas via PIN | ✅ Selesai |
| Tracking Tiket | Mahasiswa lacak status surat via nomor tiket | ✅ Selesai |
| Workflow Status | PENDING → PROCESSING → APPROVED → FINISHED | ✅ Selesai |
| Cetak Surat | Halaman print-ready (A4) dengan kop & tanda tangan | ✅ Selesai |
| Media Library | Upload & kelola gambar (logo, tanda tangan) | ✅ Selesai |
| Letter Portal Mode | Deployment terpisah khusus layanan surat | ✅ Selesai |

---

### 6.7 Modul Absensi & Monitoring *(Planned)*

**Deskripsi:** Dashboard monitoring kehadiran dosen secara real-time oleh staff prodi.

| Fitur | Deskripsi | Status |
|-------|-----------|--------|
| Dashboard Live | Tabel kelas yang sedang berlangsung hari ini | ❌ Planned |
| Status Warna | Hijau/Kuning/Merah berdasarkan kehadiran dosen | ❌ Planned |
| Clock In Dosen | Staff menandai dosen mulai mengajar | ❌ Planned |
| Clock Out Dosen | Staff menandai dosen selesai mengajar | ❌ Planned |
| Set Sesuai Jadwal | Shortcut isi waktu sesuai jadwal resmi | ❌ Planned |
| Absensi Mahasiswa | Check-in mahasiswa (geo-tagging / QR / manual) | ❌ Planned |
| Log Kehadiran | Riwayat lengkap kehadiran dosen per pertemuan | ❌ Planned |

---

### 6.8 Portal Dosen *(Planned)*

**Deskripsi:** Dashboard personal dosen untuk mengelola aktivitas mengajar.

| Fitur | Deskripsi | Status |
|-------|-----------|--------|
| Dashboard Jadwal | Cards jadwal hari ini & besok | ❌ Planned |
| Jurnal Perkuliahan | Input topik & catatan per pertemuan (wajib) | ❌ Planned |
| Absensi Mahasiswa | Bulk check hadir/tidak hadir | ❌ Planned |
| Input Nilai | Input skor per komponen, konversi otomatis ke grade | ❌ Planned |
| Progress Pertemuan | Visual progress bar (pertemuan ke-X dari 16) | ❌ Planned |
| Cetak SK Mengajar | Generate PDF SK Mengajar | ❌ Planned |
| Cetak Jurnal | Generate PDF Jurnal Perkuliahan | ❌ Planned |
| Cetak Rekap Nilai | Generate PDF Rekap Nilai | ❌ Planned |
| Cetak Absensi | Generate PDF Daftar Hadir | ❌ Planned |

---

### 6.9 Modul Penugasan *(Planned)*

**Deskripsi:** Sistem penugasan ringan dengan fitur auto-grouping dan public upload.

| Fitur | Deskripsi | Status |
|-------|-----------|--------|
| CRUD Tugas | Buat tugas individu/kelompok per kelas | ❌ Planned |
| Auto-Grouping | Bagi mahasiswa ke X kelompok secara acak | ❌ Planned |
| Public Upload Link | Generate link unik untuk upload tugas tanpa login | ❌ Planned |
| Halaman Upload Publik | Pilih nama → upload file → konfirmasi | ❌ Planned |
| Daftar Submission | Dosen lihat siapa yang sudah mengumpulkan | ❌ Planned |

---

### 6.10 Modul Display TV *(Planned)*

**Deskripsi:** Halaman publik untuk ditampilkan di layar TV kampus.

| Fitur | Deskripsi | Status |
|-------|-----------|--------|
| Jadwal Hari Ini | Running text/scroll jadwal kuliah | ❌ Planned |
| Jam Digital | Header dengan jam real-time | ❌ Planned |
| Slider Agenda | Informasi penting / agenda prodi | ❌ Planned |
| API Endpoint | JSON endpoint untuk Android client | ❌ Planned |

---

### 6.11 Modul Pengaturan *(Planned)*

**Deskripsi:** Konfigurasi global aplikasi.

| Fitur | Deskripsi | Status |
|-------|-----------|--------|
| General Settings | Nama app, logo, copyright | ❌ Planned |
| Academic Settings | Set tahun/semester aktif | ❌ Planned |
| AI Configuration | Provider, API Key (encrypted), Model | ❌ Planned |

---

## 7. Persyaratan Non-Fungsional

### 7.1 Keamanan
- JWT dengan access token (short-lived) + refresh token (long-lived)
- Password di-hash dengan bcrypt
- RBAC granular per endpoint (permission-based)
- Data scoping per prodi (staff tidak bisa akses data prodi lain)
- API Key AI disimpan terenkripsi di database
- PIN authentication untuk portal surat mahasiswa

### 7.2 Performa
- Pagination di semua endpoint list (default 10 items/page)
- Lazy loading pada frontend (route-based code splitting)
- Database indexing pada foreign keys dan kolom pencarian

### 7.3 Skalabilitas
- Arsitektur modular (setiap fitur adalah NestJS module independen)
- Stateless API (JWT, no server-side session)
- File storage via Supabase (cloud-based, scalable)

### 7.4 Usability
- Responsive design (desktop + mobile)
- Skeleton loading states (bukan spinner)
- Toast notifications untuk feedback aksi
- Global search (Ctrl+K)
- Breadcrumb navigation
- Bulk actions di semua tabel admin

### 7.5 Maintainability
- TypeScript end-to-end (backend + frontend)
- Soft deletes di semua entity (data tidak pernah hilang permanen tanpa konfirmasi)
- Consistent API response format
- Swagger/OpenAPI documentation di backend

---

## 8. Skema Database

### 8.1 Entity Relationship Overview

```
Users ──┬── Roles ──── Permissions
        ├── StudentProfile ──── Prodi
        ├── LecturerProfile ──── Prodi
        └── StaffProdiAccess ──── Prodi

Semester ──── Class ──── ClassCourse ──┬── Course
                                       ├── ClassLecturer ──── User (Dosen)
                                       ├── ClassSchedule ──── Room
                                       ├── ClassMeeting
                                       └── ClassCourseStudent ──── User (Mhs)

SurveyInstrument ──── SurveyQuestion
                 └── SurveyResponse ──── SurveyAnswer

LetterTemplate ──── LetterType ──── LetterRequest
                                └── LetterClassification

Curriculum ──── CurriculumCourse ──── Course
Prodi ──── Concentration
```

### 8.2 Total Entities: 32

Lihat detail lengkap di `docs/specification.md` bagian "Skema Database".

---

## 9. API Endpoints (Ringkasan)

| Module | Base Path | Metode |
|--------|-----------|--------|
| Auth | `/api/auth` | POST login, register, refresh, logout; GET profile |
| Users | `/api/users` | CRUD + bulk import |
| Roles | `/api/roles` | CRUD + permission assignment |
| Permissions | `/api/permissions` | CRUD |
| Courses | `/api/courses` | CRUD + import Excel |
| Prodis | `/api/prodis` | CRUD |
| Semesters | `/api/semesters` | CRUD |
| Rooms | `/api/rooms` | CRUD |
| Timeslots | `/api/timeslots` | CRUD |
| Grade Components | `/api/grade-components` | CRUD |
| Classes | `/api/classes` | CRUD + courses + lecturers + students |
| Schedules | `/api/schedules` | CRUD + generate + bulk + my-schedule |
| Surveys | `/api/surveys` | CRUD instruments + questions + submit + results |
| Letters | `/api/letters` | Templates + types + classifications + requests + pins |
| Curriculums | `/api/curriculums` | CRUD + course mapping |
| Concentrations | `/api/concentrations` | CRUD |

---

## 10. Desain UI/UX

### 10.1 Design System
- **Warna Primer:** Emerald-600 (#059669)
- **Font:** Plus Jakarta Sans / Inter
- **Layout:** Sidebar (kiri) + Top Bar + Content Area
- **Komponen:** shadcn-vue (Reka UI primitives)
- **Tema:** Clean, Modern, Informative

### 10.2 Layout Utama
- **Admin Layout:** Sidebar collapsible + breadcrumb + global search + notifications
- **Auth Layout:** Split screen (form kiri, visual kanan)
- **Blank Layout:** Untuk halaman publik (survei, surat, display TV)

### 10.3 Prinsip UX
- Skeleton loading (bukan spinner)
- Hover effects pada cards
- Toast notifications (Sonner) di pojok kanan atas
- Modal dengan fade + scale transition
- Mobile: sidebar menjadi sheet (slide-over), tabel menjadi card list

Lihat detail lengkap di `docs/ui_ux_design.md`.

---

## 11. Roadmap & Prioritas

### Phase 1: Foundation ✅ (Selesai)
- NestJS + TypeORM + PostgreSQL setup
- Auth (JWT + RBAC + Permissions)
- Vue 3 + Vite + TailwindCSS + shadcn-vue
- API layer (Axios + JWT interceptor)
- Admin layout

### Phase 2: Master Data & Scheduling ✅ (Selesai)
- CRUD semua master data akademik
- Kelas, enrollment, penugasan dosen
- Penjadwalan (auto-generate + manual)
- Kurikulum & konsentrasi

### Phase 3: Survei & Surat ✅ (Selesai)
- Sistem EDOM lengkap (builder, form, results)
- Sistem surat (template, form builder, portal publik, cetak)
- Portal modes (survey portal, letter portal)

### Phase 4: Operational Core ⏳ (Selanjutnya)
- Dashboard monitoring kehadiran dosen
- Portal dosen (jurnal, absensi mhs, nilai)
- Modul penugasan & auto-grouping
- Public upload page

### Phase 5: Reporting & Advanced ⏳ (Masa Depan)
- Laporan BKD (PDF generation)
- Display TV
- Settings UI
- AI Integration (scheduling assistant, survey generator)
- Calendar sync (.ics)
- Reschedule management (request/approval)

---

## 12. Batasan & Asumsi

### Batasan
- Sistem tidak menangani pembayaran/keuangan mahasiswa
- Tidak ada fitur chat/messaging internal
- Absensi mahasiswa berbasis web (bukan fingerprint/face recognition hardware)
- AI features bersifat opsional dan bergantung pada konfigurasi API key

### Asumsi
- Setiap semester memiliki maksimal 16 pertemuan per mata kuliah
- Satu kelas (rombel) bisa memiliki banyak mata kuliah
- Satu mata kuliah bisa diampu oleh tim teaching (banyak dosen)
- Staff prodi bisa di-assign ke lebih dari satu prodi
- Mahasiswa pascasarjana memiliki jadwal yang relatif fleksibel

---

## 13. Glosarium

| Istilah | Definisi |
|---------|----------|
| Rombel | Rombongan Belajar (Kelas) — grup mahasiswa yang belajar bersama |
| Prodi | Program Studi (S2/S3) |
| EDOM | Evaluasi Dosen oleh Mahasiswa |
| BKD | Beban Kerja Dosen |
| SKS | Satuan Kredit Semester |
| NIDN | Nomor Induk Dosen Nasional |
| NIM | Nomor Induk Mahasiswa |
| Plotting | Proses penempatan jadwal kuliah ke slot waktu & ruangan |
| Bentrok | Konflik jadwal (dosen/ruangan sudah terpakai di waktu yang sama) |
| Soft Delete | Penghapusan logis (data ditandai `deletedAt`, bukan dihapus permanen) |
| ClassCourse | Relasi antara kelas (rombel) dengan mata kuliah yang diajarkan di dalamnya |

---

## 14. Referensi Dokumen Teknis

| Dokumen | Lokasi | Isi |
|---------|--------|-----|
| Spesifikasi Teknis | `docs/specification.md` | Schema DB, workflow, project structure |
| Module Breakdown | `docs/module_breakdown.md` | Detail per modul |
| UI/UX Design | `docs/ui_ux_design.md` | Design system, komponen, layout |
| Implementation Plan | `docs/implementation_plan.md` | Rencana implementasi & prioritas |
| Project Tasks | `docs/project_tasks.md` | Daftar tugas per phase |

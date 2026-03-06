# Rincian Modul Sistem (Module Breakdown)

> **Arsitektur**: REST API (NestJS backend) + SPA Client (Vue 3 frontend).
> Setiap modul di bawah ini diimplementasikan sebagai **NestJS Module** (Controller + Service + TypeORM Entities) di backend, dan **Vue pages/components** di frontend.

## 1. Modul Manajemen User & ACL

- **NestJS Modules**: `AuthModule`, `UsersModule`, `RolesModule`.
- **Fitur Utama**:
  - Manajemen User, Role, Permission (custom RBAC via `RolesGuard` + `@Roles()` decorator).
  - **Profil Terpisah**: Student Profile (NIM) entity, Lecturer Profile (NIDN) entity, Staff Access (Multi-Prodi) via pivot table.
  - **Bulk Import**: Import Excel untuk User Baru (via `exceljs` library).
- **Auth Flow**: Login endpoint → JWT (access + refresh token) → `JwtAuthGuard` (global).

## 2. Modul Master Data Akademik

- **NestJS Module**: `AcademicModule`.
- **Entitas (TypeORM)**: Tahun Akademik, Semester (Ganjil/Genap), Prodi (S2/S3), Matakuliah, Ruangan.
- **Fitur**:
  - CRUD dengan Soft Deletes (`@DeleteDateColumn()`).
  - Validasi kurikulum per angkatan.
  - Bulk actions via dedicated endpoints (e.g., `PATCH /api/courses/bulk`).

## 3. Modul Penjadwalan Terpadu

- **NestJS Module**: `SchedulingModule`.
- **Core Features**:
  - **Plotting**: Jadwal Kuliah Reguler.
  - **Lecture Modes**: Online / Offline / Hybrid.
  - **Conflict Check**: Deteksi bentrok Ruang/Dosen (via `SchedulingService`).
- **Advanced Features**:
  - **Reschedule Management**: Request ganti jadwal, Approval Kaprodi, Notifikasi.
  - **Exam Scheduling**: Jadwal khusus UTS/UAS (Kartu Ujian, Berita Acara).
  - **Calendar Sync**: Export jadwal ke Google Calendar (`.ics` generation).

## 4. Modul Absensi & Jurnal (Core)

- **NestJS Module**: `AttendanceModule`.
- **Monitoring Staff**:
  - Dashboard Live "Kelas Berlangsung" (real-time via polling atau WebSocket).
  - **Action**: Clock In / Clock Out / Set Sesuai Jadwal (REST endpoints).
- **Absensi Mahasiswa**:
  - Login: Geo-tagging check-in.
  - Non-Login: Scan QR / Pilih Nama dari List Enrollment.

## 5. Portal Dosen (Teaching Hub)

- **NestJS Module**: `LecturerModule`.
- **Dashboard**: Jadwal Hari Ini & Statistik (via dedicated API endpoints).
- **Teaching Tools**:
  - **Jurnal**: Input Topik & Catatan Harian (Wajib).
  - **Absensi Mhs**: Bulk Check (Hadir Semua/Nihil).
  - **Nilai**: Input angka, konversi otomatis ke Grade (A/B) sesuai Skala Prodi.
- **Penugasan (Assignments)**:
  - **Auto Grouping**: Pecah kelas jadi X kelompok secara acak (`AssignmentService`).
  - **Public Upload**: Link upload tugas tanpa login untuk mahasiswa.
- **Laporan BKD**:
  - Cetak SK Mengajar (PDF via `pdfkit` / `puppeteer`).
  - Cetak Jurnal Perkuliahan.
  - Cetak Rekap Nilai & Absensi.

## 6. Modul Survei & Evaluasi

- **NestJS Module**: `SurveysModule`.
- **Enrollment Based**: Target survei otomatis ke mahasiswa yang mengambil MK tersebut.
- **AI Generator**: Generate pertanyaan survei otomatis (via AI service integration).

## 7. Modul Pengaturan & AI

- **NestJS Module**: `SettingsModule`.
- **General**: Nama App, Logo.
- **AI Config**: API Key (OpenAI/Gemini) terenkripsi (stored via `app_settings` entity with `isEncrypted` flag).
- **AI Features**: Scheduling Assistant, Journal Summarizer (via dedicated AI service).

## 8. Display TV & Public Info

- **NestJS Module**: `DisplayModule` (public endpoints, no auth required via `@Public()` decorator).
- **Vue Route**: `/display/tv` (public, no sidebar layout).
- **Tampilan**: Running Text Jadwal, Slider Agenda.
- **Data Source**: REST API endpoint `GET /api/display/today-schedule`.

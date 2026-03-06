# Spesifikasi Teknis Sistem Informasi Akademik & Penjadwalan Pascasarjana

## 1. Ikhtisar & Stack Teknologi

- **Platform**: Web (Responsive) & Android (WebView/PWA).
- **Framework Backend**: **NestJS** (Node.js / TypeScript).
- **ORM**: **TypeORM** (PostgreSQL driver via `pg`).
- **Framework Frontend**: **Vue 3** (SPA via **Vite**).
- **UI Components**: **shadcn-vue** (Reka UI primitives).
- **State Management**: **Pinia**.
- **Styling**: **TailwindCSS v4**.
- **Database**: PostgreSQL 15+.
- **Arsitektur**: REST API (NestJS backend) + SPA Client (Vue 3 frontend).
- **Auth**: JWT (Access Token + Refresh Token) via `@nestjs/jwt`.

## 2. Persyaratan Global (Global Constraints)

1.  **Soft Deletes**: Semua entity `Master Data` dan `Transaksi` WAJIB memiliki kolom `deletedAt` (menggunakan TypeORM `@DeleteDateColumn()`).
2.  **Bulk Actions**:
    - Setiap tabel admin harus punya "Check All" checkbox.
    - Action: _Bulk Trash_, _Bulk Restore_, _Bulk Force Delete_, _Bulk Active/Inactive_.
3.  **Role-Based Access Control (RBAC)**: Validasi ketat pada setiap endpoint menggunakan NestJS **Guards** & **Decorators** (custom `@Roles()` decorator).
4.  **Prodi Scoping (Data Restriction)**: Staff Prodi HANYA boleh melihat data (Jadwal, Mahasiswa, Nilai) yang terkait dengan Prodi yang di-assign ke user tersebut (`staff_prodi_access`). Implementasi via NestJS **Interceptors** atau custom **Guards**.
5.  **Active Year Default**: Secara default, semua query menampilkan data **Tahun Akademik Aktif**. User bisa melihat tahun lalu via filter.
6.  **No `prodi_id` in Users**: Relasi Prodi selalu via tabel profil atau pivot staff.

---

## 3. Rincian Modul (Module Breakdown)

### A. Modul Manajemen User (ACL)

- **Tabel Terkait**: `users`, `roles`, `permissions`, `lecturer_profiles`, `student_profiles`, `staff_prodi_access`.
- **NestJS Module**: `UsersModule`, `AuthModule`, `RolesModule`.
- **Fitur**:
  - **User Management**: CRUD User, Assign Role, Reset Password.
  - **Lecturer Profile**: Input NIDN, NIP, Gelar Depan/Belakang, Homebase Prodi.
  - **Student Profile**: Input NIM, Angkatan, Status (Aktif/Cuti/Lulus), Prodi.
  - **Staff Access**: Mapping Staff -> Many Prodi (tabel `staff_prodi_access`).
  - **Bulk Import**: Import Excel untuk user mahasiswa/dosen baru (via `exceljs` atau `xlsx`).
- **Auth Flow**:
  - Login → POST `/api/auth/login` → return JWT (access + refresh token).
  - Guard: `JwtAuthGuard` (global) + `RolesGuard` (per-route via `@Roles()` decorator).

### B. Modul Master Data Akademik

- **Academic Years**: `id`, `name` (2024/2025), `isActive`, `startDate`, `endDate`.
- **Semesters**: `id`, `academicYearId`, `type` (Ganjil/Genap), `isActive`.
- **Prodis**: `id`, `code`, `name`, `degree` (S2/S3).
- **Courses**: `id`, `prodiId`, `code`, `name`, `sks`, `semesterDefault`.
- **Rooms**: `id`, `name`, `capacity`, `location`, `isUsable`.
- **Classes**: `id`, `courseId`, `semesterId`, `name` (Kelas A/B), `quota`.

### C. Modul Penjadwalan & Pertemuan (Central Scheduling)

- **Tabel Terkait**: `class_schedules`, `class_lecturers`, `class_meetings`, `lecturer_attendance_logs`, `class_students`.
- **NestJS Module**: `SchedulingModule`.
- **Fitur**:
  - **Class Enrollment**: Setiap kelas WAJIB memiliki daftar mahasiswa (`class_students`). Otomatisasi data (Assign Mahasiswa ke Kelas).
  - **Auto-Generate Meetings**: Saat jadwal dibuat, sistem bisa meng-generate 16 pertemuan placeholder untuk memudahkan tracking Staf ("Pertemuan Ke-X").
  - **Lecture Modes**: Tiap pertemuan bisa diset: **ONLINE / OFFLINE / HYBRID**.
  - **Lecture Types**: Tiap pertemuan bisa bertipe: **KULIAH / UTS / UAS**.
  - **Staff Monitoring View**: HANYA menampilkan jadwal Prodi mereka (enforced via `ProdiScopeGuard`). Column "Pertemuan Ke" wajib tampil jelas.

### D. Modul Absensi & Monitoring (Staff View)

- **Dashboard Monitoring**:
  - Tabel Live: Menampilkan kelas yang _sedang berlangsung_ hari ini.
  - Status Warna: Hijau (Dosen di kelas), Kuning (Belum hadir), Merah (Tidak hadir/Kosong).
- **Action Staff**:
  1.  **Clock In**: Menandai Dosen masuk (mencatat `createdAt` real).
  2.  **Clock Out**: Menandai Dosen keluar.
  3.  **Set By Schedule**: Mengisi jam masuk/keluar persis sesuai jadwal (shortcut).
- **Logic**: Data absensi dosen tersimpan di `lecturer_attendance_logs`.

### E. Portal Dosen & Penilaian

- **Dashboard Personal**:
  - Cards Jadwal Hari Ini & Besok.
- **Grading Module**:
  - **Grade Scales**: Master data Skala Nilai (A, A-, B+, dll) dengan range angka & bobot.
  - **Grading Components**: Define Bobot (Tugas 20%, UTS 30%, UAS 50%).
- **Laporan BKD (Split Output)**:
  - Tombol **"Cetak SK Mengajar"**.
  - Tombol **"Cetak Jurnal Perkuliahan"**.
  - Tombol **"Cetak Rekap Nilai"**.
  - Tombol **"Cetak Absensi"**.

### F. Modul Penugasan & E-Learning (Light)

- **Fitur**:
  - **Auto Grouping**: Input jumlah kelompok (misal 5). Sistem membagi mahasiswa secara acak rata.
  - **Public Link Generation**: Dosen generate link unik untuk tugas tertentu.
  - **Public Upload Page**:
    - URL: `/upload/{token}`.
    - Dropdown: Pilih Nama Siswa (Searchable).
    - Upload: File PDF/ZIP.
    - Tombol: Kirim.

### G. Modul Survei (Enrollment Based)

- **Logic**:
  - Target Audience based on Enrollment: "Kirim survei ke semua mahasiswa yang mengambil mata kuliah X".
  - Bulk Fill/Enroll: Saat survei dibuat untuk kelas X, otomatis daftar user diambil dari `class_students` kelas tersebut.

### H. Modul Display TV & Public Info

- **Route**: `/display/tv`.
- **Tampilan**:
  - **Header**: Logo & Jam Digital Besar.
  - **Area Kiri (60%)**: Jadwal Kuliah Hari Ini (Running Text / Scroll Up otomatis).
  - **Area Kanan (40%)**: Slider Agenda Prodi / Informasi Penting.
- **API**: Endpoint JSON (`GET /api/display/today-schedule`) untuk Android Client menampilkan data serupa.

### I. Modul Pengaturan (Settings)

- **General**: Nama Aplikasi, Logo Instansi, Copyright Text.
- **Academic**: Set Default Active Year.
- **AI Configuration**:
  - **Provider**: Selector (OpenAI / Gemini / Anthropic).
  - **API Key**: Encrypted Input Field.
  - **Model**: Selector (e.g., gpt-4o, gemini-pro).

### J. Modul Tambahan Khusus Jadwal (Rekomendasi)

Berikut adalah modul lanjutan yang sangat disarankan untuk S2/S3:

1.  **Reschedule Management (Perubahan Jadwal)**
    - **Problem**: Dosen pascasarjana sering memiliki agenda mendadak.
    - **Fitur**:
      - Dosen request "Ganti Jadwal" via Portal.
      - Pilih Slot Pengganti (Sistem cek bentrok otomatis).
      - Approval Kaprodi/Staf.
      - Notifikasi Blast ke Mahasiswa via WA/Email.
2.  **Exam Scheduling (Jadwal Ujian Terpisah)**
    - **Problem**: Jadwal UTS/UAS sering berbeda ruang & waktu dengan kuliah rutin.
    - **Fitur**:
      - Mode plotting khusus "Masa Ujian".
      - Cetak Kartu Ujian (Kartu Peserta) dengan QR Code.
      - Berita Acara Ujian (Daftar Hadir Ujian).

3.  **Calendar Integration (iCal/Google Calendar)**
    - **Feature**: Tombol "Sync to Calendar" di dashboard mahasiswa/dosen.
    - **Tech**: Generate dynamic `.ics` subscription link.
    - **Benefit**: Notifikasi 15 menit sebelum kuliah langsung di HP user tanpa buka aplikasi.

## 4. Rekomendasi Integrasi AI (AI Enhancements)

Berikut adalah modul yang direkomendasikan untuk dioptimalkan menggunakan AI:

1.  **AI Scheduling Assistant (Modul Penjadwalan)**
    - **Fungsi**: Memberikan saran slot waktu & ruangan kosong saat plotting jadwal bentrok.
    - **Input**: Jadwal existing + Constraint (Dosen X bisanya Hari Senin).
    - **Output**: "Rekomendasi: Ruang 304 Hari Selasa Jam 10.00".

2.  **Smart Survey Generator (Modul Survei)**
    - **Fungsi**: Generate pertanyaan survei otomatis berdasarkan konteks (misal: "Buatkan survei evaluasi dosen untuk akhir semester").
    - **Input**: Prompt User.
    - **Output**: List Pertanyaan JSON (Skala/Essay).

3.  **Journal Summarizer (Portal Dosen)**
    - **Fungsi**: Merangkum 16 pertemuan jurnal menjadi satu paragraf deskripsi untuk public display/silabus.
    - **Input**: 16 Text Jurnal Harian.
    - **Output**: Ringkasan Eksekutif Materi.

4.  **Student Retention Analysis (Modul Absensi)**
    - **Fungsi**: Mendeteksi mahasiswa yang "Rawan DO" berdasarkan pola absensi & nilai.
    - **Output**: Alert ke Kaprodi.

---

## 5. Skema Database (Detailed Schema)

> **Note**: Semua entity menggunakan TypeORM decorators. Nama kolom menggunakan `camelCase` di entity, TypeORM otomatis map ke `snake_case` di database (via `namingStrategy`).

### Core Users & ACL

```sql
users (id, name, email, password, deletedAt)
roles (id, name, slug)
permissions (id, name, slug)
role_permissions (roleId, permissionId)
user_roles (userId, roleId)
staff_prodi_access (userId, prodiId) -- Many-to-Many
student_profiles (userId, prodiId, nim, angkatan, status)
lecturer_profiles (userId, homeProdiId, nidn, nip, titles)
```

### Academic & Master

```sql
academic_years (id, name, startDate, endDate, isActive, deletedAt)
semesters (id, academicYearId, type, isActive, deletedAt)
prodis (id, code, name, degree, deletedAt)
courses (id, prodiId, code, name, sks, deletedAt)
rooms (id, name, capacity, deletedAt)
classes (id, courseId, semesterId, name, token, deletedAt)
class_lecturers (classId, lecturerId, isPrimary) -- Tim Teaching
```

### Scheduling & Transactions

```sql
class_schedules (id, classId, roomId, dayOfWeek, startTime, endTime, deletedAt)

class_students (
    id, classId, studentId, semesterId, deletedAt
) -- Enrollment Table

class_meetings (
    id, classId, scheduleIdRef, meetingNumber,
    date, type (KULIAH/UTS/UAS), mode (ONLINE/OFFLINE/HYBRID),
    topic, notes, materialFile,
    isLocked, deletedAt
)

grade_scales (
    id, prodiId, grade (A/B), minScore, maxScore, weight, deletedAt
)

grade_components (
    id, classId, name (Tugas 1), date, weightPercentage, deletedAt
)

app_settings (
    id, key (string unique), value (text), type (text/boolean/json), isEncrypted (boolean)
)

lecturer_attendance_logs (
    id, classMeetingId, staffUserId,
    clockInTime, clockOutTime,
    isManualEntry, durationMinutes, deletedAt
)

student_attendances (
    id, classMeetingId, studentId,
    status (H/I/S/A), checkInTime,
    locationLat, locationLng, deletedAt
)

grades (
    id, classId, studentId,
    component (Tugas/UTS/UAS), score, deletedAt
)
```

### Assignments & Groups

```sql
assignments (
    id, classId, title, description,
    deadline, publicToken, isGroupTask,
    allowPublicUpload, deletedAt
)

student_groups (id, assignmentId, name)
student_group_members (groupId, studentId)

submissions (
    id, assignmentId, studentId, groupId,
    filePath, uploadedAt, studentNotes, deletedAt
)
```

### Surveys

```sql
surveys (id, academicYearId, title, targetRole, isMandatory, deletedAt)
survey_questions (id, surveyId, type, text, optionsJson)
survey_responses (id, surveyId, userId, respondentMetaJson, completedAt)
survey_answers (responseId, questionId, answerText, answerValue)
```

---

## 6. Alur Kerja Detil (Detailed Workflows)

### A. Workflow Absensi Dosen (Oleh Staf)

1.  **Trigger**: Dosen datang untuk mengajar Offline/Online.
2.  **Staf Action**: Login dashboard -> Menu "Monitoring Jadwal".
3.  **Cari Kelas**: Filter berdasarkan Ruangan atau Nama Dosen.
4.  **Clock In**: Klik tombol "Mulai". Status berubah "Sedang Mengajar". API call `POST /api/attendance/clock-in` → create `class_meetings` & `lecturer_attendance_logs`.
5.  **Clock Out**: Setelah kelas selesai, Klik "Selesai". API call `PATCH /api/attendance/clock-out` → update `clockOutTime`.
6.  **Exception**: Jika staf lupa, admin bisa "Edit Log" atau gunakan tombol "Set Sesuai Jadwal" yang akan mengisi waktu start/end sama persis dengan `class_schedules`.

### B. Workflow Pembagian Kelompok (Auto-Grouping)

1.  **Dosen Action**: Buka detail kelas -> Tab "Tugas".
2.  **Create Assignment**: Judul "Tugas Besar", Tipe "Kelompok".
3.  **Config**: Klik tombol "Generate Groups".
4.  **Input**: Jumlah Kelompok = 4.
5.  **Process**:
    - API call `POST /api/assignments/:id/generate-groups` with `{ groupCount: 4 }`.
    - Service get all students in class.
    - Shuffle array students.
    - Chunk array into 4 parts.
    - Insert to `student_groups` and `student_group_members`.
6.  **Result**: Tampilkan daftar kelompok. Dosen bisa drag-drop untuk adjust manual jika perlu.

### C. Workflow Public Upload (Tanpa Login)

1.  **Dosen**: Share link `siakad.ac/upload/TGS-KLS-A-XYZ123`.
2.  **Mahasiswa**: Buka link di browser HP.
3.  **UI**:
    - Judul Tugas & Deadline.
    - Dropdown: "Pilih Nama Anda" (Data dari anggota kelas).
    - File Input: "Upload PDF".
4.  **Submit**:
    - Validasi: File type & size (via NestJS `FileInterceptor` + `ParseFilePipe`).
    - Process: Simpan file ke storage `/submissions/{classId}/{assignmentId}/`.
    - Record ke tabel `submissions`.
5.  **Feedback**: Muncul pesan "Tugas berhasil dikirim pada Tgl X Jam Y".

---

## 7. Struktur Proyek (Project Structure)

### Backend (NestJS)

```
backend/
├── src/
│   ├── app.module.ts
│   ├── main.ts
│   ├── config/                    # ConfigModule, database config
│   ├── common/                    # Shared decorators, guards, pipes, interceptors
│   │   ├── decorators/            # @Roles(), @Public(), @CurrentUser()
│   │   ├── guards/                # JwtAuthGuard, RolesGuard, ProdiScopeGuard
│   │   ├── interceptors/          # TransformInterceptor, ProdiScopeInterceptor
│   │   └── pipes/                 # ValidationPipe config
│   ├── modules/
│   │   ├── auth/                  # AuthModule (login, JWT, refresh token)
│   │   ├── users/                 # UsersModule (CRUD, profiles)
│   │   ├── roles/                 # RolesModule (RBAC)
│   │   ├── academic/              # AcademicModule (years, semesters, prodis, courses)
│   │   ├── rooms/                 # RoomsModule
│   │   ├── classes/               # ClassesModule (classes, enrollment)
│   │   ├── scheduling/            # SchedulingModule (schedules, meetings)
│   │   ├── attendance/            # AttendanceModule (lecturer & student)
│   │   ├── grading/               # GradingModule (scales, components, scores)
│   │   ├── assignments/           # AssignmentsModule (tasks, groups, submissions)
│   │   ├── surveys/               # SurveysModule
│   │   ├── settings/              # SettingsModule (app_settings)
│   │   └── display/               # DisplayModule (TV public data)
│   └── database/
│       ├── entities/              # TypeORM entities
│       ├── migrations/            # TypeORM migrations
│       └── seeds/                 # Seed data (admin, dummy users)
├── .env
├── nest-cli.json
├── package.json
└── tsconfig.json
```

### Frontend (Vue 3 SPA)

```
frontend/
├── src/
│   ├── main.ts
│   ├── App.vue
│   ├── assets/
│   │   └── index.css              # @import "tailwindcss"
│   ├── components/
│   │   └── ui/                    # shadcn-vue components (auto-generated)
│   ├── composables/               # Vue composables (useAuth, useApi, etc.)
│   ├── layouts/
│   │   ├── AdminLayout.vue        # Sidebar + TopBar + Content Area
│   │   ├── AuthLayout.vue         # Split-screen login layout
│   │   └── PublicLayout.vue       # Public pages (upload, display)
│   ├── lib/
│   │   ├── api.ts                 # Axios instance + interceptors (JWT)
│   │   └── utils.ts               # shadcn-vue cn() utility
│   ├── pages/                     # Route-based pages
│   │   ├── auth/
│   │   ├── dashboard/
│   │   ├── academic/
│   │   ├── scheduling/
│   │   ├── attendance/
│   │   ├── lecturer/
│   │   ├── grading/
│   │   ├── assignments/
│   │   ├── surveys/
│   │   ├── settings/
│   │   ├── display/
│   │   └── public/
│   ├── router/
│   │   └── index.ts               # Vue Router config + route guards
│   ├── stores/                    # Pinia stores
│   │   ├── auth.ts
│   │   ├── academic.ts
│   │   └── ...
│   └── types/                     # TypeScript interfaces/types
├── .env
├── vite.config.ts
├── components.json                # shadcn-vue config
├── package.json
└── tsconfig.json
```

---

## 8. Daftar Tugas Pengembangan (Task Breakdown)

- [ ] **Phase 1: Foundation**
  - NestJS Project Init & Config (TypeORM + PostgreSQL).
  - Database Entities & Migrations (All Tables).
  - Auth Module (JWT + Guards + RBAC).
  - Vue 3 SPA Init (Vite + shadcn-vue + TailwindCSS v4 + Pinia).
  - API Integration Layer (Axios instance + JWT interceptor).
- [ ] **Phase 2: Master Data & Scheduling**
  - CRUD Prodi, Tahun, Matakuliah (NestJS Controllers + Services + TypeORM Repositories).
  - CRUD Jadwal & Plotting Dosen.
  - Logic Bentrok Jadwal (SchedulingService).
- [ ] **Phase 3: Operational Core**
  - Dashboard Staf (Monitoring & Absensi Dosen).
  - Portal Dosen (Jurnal & Absensi Mhs).
  - Logic Absensi Mahasiswa (Login/Non-login).
- [ ] **Phase 4: Assignments & Public Features**
  - Module Tugas & Auto-grouping logic.
  - Public Upload Page.
  - Display TV Page.
- [ ] **Phase 5: Reporting & Finishing**
  - Export BKD (PDF/Excel) via `pdfkit` atau `puppeteer`.
  - Survei Engine.
  - Testing & Deployment.

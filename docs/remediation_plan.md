# Rencana Penyelesaian & Penanganan Kekurangan Sistem

**Tanggal:** 11 Mei 2026  
**Prinsip:** Selesaikan yang setengah jadi dulu, baru bangun yang baru.

---

## BAGIAN A: Modul yang Belum Selesai (Prioritas Utama)

Modul-modul ini sudah memiliki entity/database schema tapi belum ada logic, controller, atau UI.

---

### A1. Dashboard — Data Real (Bukan Hardcoded)

**Masalah:** Dashboard saat ini menampilkan angka statis (`248`, `36`, `12`, `5`) dan aktivitas palsu. Chart belum diimplementasi.

**Scope Pekerjaan:**

| # | Task | Layer |
|---|------|-------|
| 1 | Buat endpoint `GET /api/dashboard/stats` yang menghitung real data (total mahasiswa aktif, dosen aktif, kelas hari ini, dll) | Backend |
| 2 | Buat endpoint `GET /api/dashboard/attendance-chart` untuk data chart kehadiran per minggu | Backend |
| 3 | Buat endpoint `GET /api/dashboard/recent-activities` untuk log aktivitas terbaru | Backend |
| 4 | Ganti data hardcoded di `DashboardPage.vue` dengan API call | Frontend |
| 5 | Integrasikan chart library (ECharts atau Chart.js) untuk statistik kehadiran | Frontend |
| 6 | Tampilkan info semester aktif dari database (bukan hardcoded) | Frontend |
| 7 | Buat stats berbeda per role (admin lihat global, staff lihat per prodi, dosen lihat personal) | Both |

**Estimasi:** 2-3 hari

---

### A2. AppSetting — Modul Pengaturan Sistem

**Masalah:** Entity `AppSetting` sudah ada di database tapi tidak ada controller, service, atau halaman UI. Admin tidak bisa mengatur nama aplikasi, logo, semester aktif, atau konfigurasi AI.

**Scope Pekerjaan:**

| # | Task | Layer |
|---|------|-------|
| 1 | Buat `SettingsModule` (controller + service) dengan endpoint CRUD `GET/PATCH /api/settings` | Backend |
| 2 | Implementasi logic enkripsi untuk field `isEncrypted: true` (API keys) | Backend |
| 3 | Buat endpoint `GET /api/settings/public` untuk setting yang boleh diakses tanpa auth (nama app, logo) | Backend |
| 4 | Seed default settings (app_name, app_logo, active_semester_id, ai_provider, ai_api_key, ai_model) | Backend |
| 5 | Buat halaman `/settings` di frontend dengan tabs: General, Academic, AI Config | Frontend |
| 6 | Form General: Nama Aplikasi, Logo (upload), Copyright Text | Frontend |
| 7 | Form Academic: Pilih Semester Aktif (dropdown dari data semester) | Frontend |
| 8 | Form AI: Provider selector, API Key (masked input), Model selector | Frontend |
| 9 | Tambahkan route `/settings` di router | Frontend |
| 10 | Gunakan setting `active_semester_id` sebagai default filter di seluruh aplikasi | Both |

**Estimasi:** 2-3 hari

---

### A3. ClassMeeting — Jurnal Pertemuan (Dosen)

**Masalah:** Entity `ClassMeeting` sudah lengkap (meetingNumber, topic, notes, type, mode, materialFile, isLocked) dan sudah di-inject di `ClassesService`, tapi tidak ada satupun method yang menggunakannya. Dosen tidak bisa mengisi jurnal pertemuan.

**Scope Pekerjaan:**

| # | Task | Layer |
|---|------|-------|
| 1 | Buat endpoint `GET /api/classes/courses/:classCourseId/meetings` — list semua pertemuan | Backend |
| 2 | Buat endpoint `POST /api/classes/courses/:classCourseId/meetings/generate` — auto-generate 16 pertemuan | Backend |
| 3 | Buat endpoint `PATCH /api/meetings/:id` — update topic, notes, type, mode, materialFile | Backend |
| 4 | Buat endpoint `POST /api/meetings/:id/lock` — lock pertemuan (tidak bisa diedit lagi) | Backend |
| 5 | Buat endpoint `POST /api/meetings/:id/upload-material` — upload file materi (Supabase) | Backend |
| 6 | Tambahkan tab "Jurnal" di `ClassDetailPage.vue` — timeline 16 pertemuan | Frontend |
| 7 | Buat komponen `MeetingCard` — tampilkan status (kosong/terisi/locked), tombol isi jurnal | Frontend |
| 8 | Buat modal/form input jurnal: Topic (wajib), Notes (opsional), Mode selector, Upload material | Frontend |
| 9 | Tampilkan progress bar "Pertemuan X/16 terisi" di header kelas | Frontend |
| 10 | Auto-generate meetings saat pertama kali tab Jurnal dibuka (jika belum ada) | Frontend |

**Estimasi:** 3-4 hari

---

### A4. LecturerAttendanceLog — Monitoring Kehadiran Dosen

**Masalah:** Entity `LecturerAttendanceLog` sudah ada (clockInTime, clockOutTime, isManualEntry, durationMinutes) tapi tidak ada module, service, controller, atau halaman apapun yang menggunakannya.

**Scope Pekerjaan:**

| # | Task | Layer |
|---|------|-------|
| 1 | Buat `AttendanceModule` (module + controller + service) | Backend |
| 2 | Endpoint `GET /api/attendance/today` — list kelas hari ini dengan status kehadiran dosen | Backend |
| 3 | Endpoint `POST /api/attendance/clock-in` — catat dosen mulai mengajar (buat meeting + log) | Backend |
| 4 | Endpoint `PATCH /api/attendance/:logId/clock-out` — catat dosen selesai mengajar | Backend |
| 5 | Endpoint `PATCH /api/attendance/:logId/set-by-schedule` — isi waktu sesuai jadwal | Backend |
| 6 | Endpoint `GET /api/attendance/history` — riwayat kehadiran (filter: dosen, tanggal, prodi) | Backend |
| 7 | Logic: Hitung `durationMinutes` otomatis dari selisih clockIn-clockOut | Backend |
| 8 | Prodi scoping: Staff hanya lihat kelas prodi-nya | Backend |
| 9 | Buat halaman `/attendance` — Dashboard Monitoring Hari Ini | Frontend |
| 10 | Tabel live: Kelas, Dosen, Waktu, Status (badge warna: hijau/kuning/merah) | Frontend |
| 11 | Tombol aksi: "Clock In", "Clock Out", "Set Sesuai Jadwal" per baris | Frontend |
| 12 | Buat halaman `/attendance/history` — Riwayat dengan filter & export | Frontend |
| 13 | Tambahkan route di router + menu di sidebar | Frontend |

**Estimasi:** 4-5 hari

---

## BAGIAN B: Modul Baru yang Belum Dibangun (Prioritas Kedua)

Modul-modul ini belum ada sama sekali (tidak ada entity, controller, maupun UI).

---

### B1. Portal Dosen (Tanpa Login — Via Link Unik)

**Deskripsi:** Portal personal dosen yang diakses tanpa login melalui link unik per dosen (`/dosen/{token}`). Dirancang untuk dosen S2/S3 senior yang tidak mau repot dengan username/password. Setiap dosen mendapat URL yang di-bookmark atau dikirim via WhatsApp.

**Konsep Keamanan:**
- Token random 12 karakter alphanumeric (62^12 = ~3.2×10²¹ kombinasi, tidak bisa brute force)
- Token tidak expired (berlaku sampai di-revoke admin)
- Admin bisa regenerate token kapan saja (token lama langsung invalid)
- Rate limit 30 req/min per token

**Fitur Portal:**
1. **Home** — Grid cards semua kelas yang diampu semester aktif + jadwal hari ini
2. **Tab Jurnal** — Timeline 16 pertemuan, isi topik & catatan, upload materi
3. **Tab Absensi** — Checklist mahasiswa (H/I/S/A) per pertemuan, tombol "Hadir Semua"
4. **Tab Nilai** — Tabel spreadsheet-like (mahasiswa × komponen), auto-calculate grade
5. **Tab Tugas** — Buat tugas, generate link upload publik, lihat submissions

**Halaman Upload Tugas (Mahasiswa — Tanpa Login):**
- URL: `/tugas/{publicToken}`
- Pilih nama dari dropdown → upload file (PDF/ZIP/DOCX, max 25MB) → selesai

**Scope Pekerjaan:**

| # | Task | Layer |
|---|------|-------|
| 1 | Tambah kolom `portalToken` (unique, 12 char) di entity `LecturerProfile` | Backend |
| 2 | Buat entity baru: `Assignment`, `Submission`, `StudentAttendance`, `StudentGrade` | Backend |
| 3 | Buat `LecturerPortalModule` (controller + service) — semua endpoint public (no auth) | Backend |
| 4 | Endpoint `GET /api/portal/dosen/:token` — validasi token, return info dosen + list kelas | Backend |
| 5 | Endpoint `GET /api/portal/dosen/:token/kelas/:classCourseId` — detail kelas | Backend |
| 6 | Endpoint meetings: list, generate 16 pertemuan, update jurnal, upload materi | Backend |
| 7 | Endpoint absensi: get + bulk save per pertemuan | Backend |
| 8 | Endpoint nilai: get tabel (mahasiswa × komponen) + bulk save | Backend |
| 9 | Endpoint tugas: CRUD assignments + list submissions | Backend |
| 10 | Endpoint public upload: `GET/POST /api/public/tugas/:publicToken` | Backend |
| 11 | Endpoint admin: generate/revoke/bulk-generate token dosen | Backend |
| 12 | Buat halaman `/dosen/:token` — portal home (grid kelas + jadwal hari ini) | Frontend |
| 13 | Buat halaman `/dosen/:token/kelas/:id` — detail kelas dengan 5 tabs | Frontend |
| 14 | Tab Jurnal: timeline + modal input + upload material | Frontend |
| 15 | Tab Absensi: tabel + radio H/I/S/A + bulk save | Frontend |
| 16 | Tab Nilai: spreadsheet input + auto-calculate + save | Frontend |
| 17 | Tab Tugas: list + create modal + copy link publik | Frontend |
| 18 | Halaman `/tugas/:publicToken` — form upload mahasiswa (searchable dropdown + file) | Frontend |
| 19 | Admin: kolom "Portal Link" + tombol generate/copy/revoke di halaman dosen | Frontend |

**Estimasi:** 10-12 hari

> **Spec lengkap:** Lihat `docs/spec_portal_dosen.md`

---

### B2. Modul Penugasan (Assignments) — Terintegrasi di Portal Dosen

**Deskripsi:** Fitur penugasan sudah termasuk dalam Portal Dosen (B1). Dosen membuat tugas via portal, mahasiswa upload via link publik. Tidak perlu modul terpisah.

**Fitur tambahan (opsional, setelah B1 selesai):**

| # | Task | Layer |
|---|------|-------|
| 1 | Auto-grouping: bagi mahasiswa ke X kelompok secara acak | Backend |
| 2 | Entity `StudentGroup` + `StudentGroupMember` untuk tugas kelompok | Backend |
| 3 | UI grouping: input jumlah kelompok → tampilkan hasil → drag-drop adjust | Frontend |
| 4 | Tampilkan tab "Tugas" juga di `ClassDetailPage.vue` (admin view) | Frontend |

**Estimasi:** 2-3 hari (setelah B1 selesai, karena entity Assignment & Submission sudah dibuat di B1)

---

### B3. Display TV (Public Info Screen)

**Deskripsi:** Halaman publik untuk ditampilkan di layar TV kampus.

**Scope Pekerjaan:**

| # | Task | Layer |
|---|------|-------|
| 1 | Buat endpoint `GET /api/display/today-schedule` — jadwal hari ini (public, no auth) | Backend |
| 2 | Buat endpoint `GET /api/display/announcements` — pengumuman aktif | Backend |
| 3 | Buat halaman `/display/tv` — layout split (jadwal kiri 60%, info kanan 40%) | Frontend |
| 4 | Header: Logo + jam digital real-time | Frontend |
| 5 | Area kiri: Auto-scroll jadwal kuliah hari ini | Frontend |
| 6 | Area kanan: Slider/carousel pengumuman | Frontend |
| 7 | Auto-refresh data setiap 5 menit | Frontend |
| 8 | Tambahkan route public (no auth, no sidebar) | Frontend |

**Estimasi:** 2-3 hari

---

## BAGIAN C: Penanganan Kekurangan Teknis & Infrastruktur (Prioritas Ketiga)

Setelah modul fungsional selesai, tangani kekurangan teknis.

---

### C1. Notification System (In-App + Email)

| # | Task | Estimasi |
|---|------|----------|
| 1 | Buat entity `Notification` (userId, title, message, type, isRead, createdAt) | 0.5 hari |
| 2 | Buat `NotificationsModule` — CRUD + mark as read + mark all read | 1 hari |
| 3 | Integrasikan notifikasi ke workflow surat (status berubah → notify mahasiswa) | 0.5 hari |
| 4 | Integrasikan notifikasi ke reschedule (jadwal berubah → notify mahasiswa) | 0.5 hari |
| 5 | UI: Bell icon di topbar + dropdown list notifikasi + badge count | 1 hari |
| 6 | (Opsional) Email notification via Nodemailer/Resend untuk event kritis | 1 hari |

**Total Estimasi:** 3-4 hari

---

### C2. Audit Log (Activity Tracking)

| # | Task | Estimasi |
|---|------|----------|
| 1 | Buat entity `AuditLog` (userId, action, entity, entityId, oldValue, newValue, ip, createdAt) | 0.5 hari |
| 2 | Buat NestJS Interceptor yang otomatis log setiap CUD operation | 1 hari |
| 3 | Endpoint `GET /api/audit-logs` dengan filter (user, entity, date range) | 0.5 hari |
| 4 | UI: Halaman `/audit-logs` dengan tabel + filter (hanya superadmin) | 1 hari |
| 5 | Log khusus untuk: perubahan nilai, approve surat, edit jadwal | 0.5 hari |

**Total Estimasi:** 3-4 hari

---

### C3. Export Data (Excel/PDF)

| # | Task | Estimasi |
|---|------|----------|
| 1 | Buat utility service `ExportService` (xlsx generation via `xlsx` package) | 0.5 hari |
| 2 | Export jadwal per semester (Excel) | 0.5 hari |
| 3 | Export daftar mahasiswa per kelas (Excel) | 0.5 hari |
| 4 | Export hasil survei/EDOM (Excel) | 0.5 hari |
| 5 | Export rekap kehadiran dosen (Excel) | 0.5 hari |
| 6 | Laporan BKD — SK Mengajar (PDF via Puppeteer) | 1 hari |
| 7 | Laporan BKD — Jurnal Perkuliahan (PDF) | 1 hari |
| 8 | Laporan BKD — Rekap Nilai (PDF) | 1 hari |
| 9 | Tombol "Export" di setiap halaman tabel yang relevan | 1 hari |

**Total Estimasi:** 6-7 hari

---

### C4. Rate Limiting & Security Hardening

| # | Task | Estimasi |
|---|------|----------|
| 1 | Install `@nestjs/throttler`, konfigurasi global rate limit (100 req/min) | 0.5 hari |
| 2 | Rate limit ketat pada endpoint publik (login: 5/min, surat: 10/min, upload: 3/min) | 0.5 hari |
| 3 | Validasi file upload (size limit, mime type check, extension whitelist) | 0.5 hari |
| 4 | CORS configuration yang proper (whitelist domain) | 0.5 hari |
| 5 | Helmet middleware untuk security headers | 0.5 hari |

**Total Estimasi:** 2-3 hari

---

### C5. Automated Testing (Foundation)

| # | Task | Estimasi |
|---|------|----------|
| 1 | Setup Jest + Supertest untuk e2e testing | 0.5 hari |
| 2 | Test auth flow (login, refresh, guard) | 1 hari |
| 3 | Test RBAC (permission check, prodi scoping) | 1 hari |
| 4 | Test schedule generator (conflict detection) | 1 hari |
| 5 | Test letter workflow (request → approve → numbering) | 1 hari |
| 6 | Frontend: Setup Vitest + Vue Test Utils, test auth store | 1 hari |

**Total Estimasi:** 5-6 hari

---

## BAGIAN D: Nice-to-Have (Prioritas Keempat)

| # | Fitur | Estimasi |
|---|-------|----------|
| 1 | Calendar Sync — Generate .ics subscription link per user | 2 hari |
| 2 | Reschedule Request/Approval — Workflow dosen request ganti jadwal | 3 hari |
| 3 | AI Scheduling Assistant — Saran slot kosong saat bentrok | 3 hari |
| 4 | AI Survey Generator — Generate pertanyaan dari prompt | 2 hari |
| 5 | AI Journal Summarizer — Rangkum 16 jurnal jadi 1 paragraf | 1 hari |
| 6 | Dark Mode — Toggle tema gelap | 1 hari |
| 7 | PWA / Offline Support — Service worker + cache strategy | 3 hari |
| 8 | WebSocket Real-time — Live update dashboard monitoring | 2 hari |

---

## Timeline Rekomendasi

```
┌─────────────────────────────────────────────────────────────────┐
│ SPRINT 1 (Minggu 1-2): Selesaikan yang Setengah Jadi            │
├─────────────────────────────────────────────────────────────────┤
│ A1. Dashboard Real Data .......................... 2-3 hari      │
│ A2. Settings Module .............................. 2-3 hari      │
│ A3. ClassMeeting / Jurnal Pertemuan .............. 3-4 hari      │
│ A4. Attendance Monitoring ........................ 4-5 hari      │
│                                          Total: ~12-15 hari     │
├─────────────────────────────────────────────────────────────────┤
│ SPRINT 2 (Minggu 3-5): Portal Dosen (Modul Terbesar)            │
├─────────────────────────────────────────────────────────────────┤
│ B1. Portal Dosen (tanpa login) .................. 10-12 hari     │
│     - Backend: entities, module, endpoints ...... (5-6 hari)    │
│     - Frontend: pages, tabs, forms .............. (5-6 hari)    │
│ B2. Penugasan (tambahan auto-grouping) .......... 2-3 hari      │
│ B3. Display TV .................................. 2-3 hari      │
│                                          Total: ~14-18 hari     │
├─────────────────────────────────────────────────────────────────┤
│ SPRINT 3 (Minggu 6-7): Infrastruktur & Kualitas                 │
├─────────────────────────────────────────────────────────────────┤
│ C1. Notification System .......................... 3-4 hari      │
│ C2. Audit Log .................................... 3-4 hari      │
│ C3. Export Data (Excel/PDF) ...................... 6-7 hari      │
│                                          Total: ~12-15 hari     │
├─────────────────────────────────────────────────────────────────┤
│ SPRINT 4 (Minggu 8-9): Security & Testing                       │
├─────────────────────────────────────────────────────────────────┤
│ C4. Rate Limiting & Security ..................... 2-3 hari      │
│ C5. Automated Testing ............................ 5-6 hari      │
│ D. Nice-to-Have (pilih 2-3) ..................... 4-6 hari      │
│                                          Total: ~11-15 hari     │
└─────────────────────────────────────────────────────────────────┘

TOTAL ESTIMASI: 9-11 minggu (1 developer full-time)
```

---

## Urutan Pengerjaan yang Direkomendasikan

```
A1 (Dashboard) → A2 (Settings) → A3 (Jurnal) → A4 (Attendance)
       ↓
B1 (Portal Dosen) → B2 (Penugasan) → B3 (Display TV)
       ↓
C1 (Notifikasi) → C2 (Audit Log) → C3 (Export)
       ↓
C4 (Security) → C5 (Testing) → D (Nice-to-Have)
```

**Alasan urutan:**
1. Dashboard & Settings adalah fondasi yang dipakai modul lain (semester aktif, stats)
2. Jurnal (A3) harus selesai dulu karena Portal Dosen (B1) bergantung padanya
3. Attendance (A4) bisa paralel dengan A3, keduanya pakai entity ClassMeeting
4. Portal Dosen (B1) adalah modul terbesar — sudah include fitur penugasan di dalamnya
5. B2 (auto-grouping) dan B3 (Display TV) bisa dikerjakan setelah B1 karena independen
6. Infrastruktur (notifikasi, audit, export) ditambahkan setelah fitur core stabil
7. Security & testing sebagai finishing sebelum production

---

## Catatan Penting

- **Jangan bangun modul baru sebelum A1-A4 selesai** — entity sudah ada, tinggal disambungkan. Ini technical debt yang harus dibayar dulu.
- **Portal Dosen (B1) adalah modul terbesar** — sudah mencakup jurnal, absensi mhs, nilai, DAN penugasan. Pertimbangkan pecah jadi sub-sprint.
- **Portal Dosen tanpa login** — keputusan desain yang tepat untuk konteks S2/S3. Spec lengkap ada di `docs/spec_portal_dosen.md`.
- **Export PDF (C3)** bisa ditunda jika belum urgent — tapi pasti diminta saat go-live.
- **Testing (C5)** idealnya dilakukan paralel dengan development, bukan di akhir. Minimal test critical path (auth, scheduling, letter numbering, portal token validation).

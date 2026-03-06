# Rencana Implementasi Sistem Akademik (Implementation Plan)

## 1. Ikhtisar Proyek

Membangun Sistem Informasi Akademik & Penjadwalan Pascasarjana (S2/S3) yang modern, fleksibel, dan mendukung proses bisnis spesifik seperti perkuliahan hybrid, dosen praktisi, dan pelaporan BKD.

## 2. Stack Teknologi

- **Backend**: NestJS (TypeScript) + TypeORM
- **Frontend**: Vue 3 (Vite SPA)
- **UI Library**: shadcn-vue (Reka UI primitives)
- **CSS Framework**: TailwindCSS v4
- **Database**: PostgreSQL 15+
- **Auth**: JWT (Access + Refresh Token) via `@nestjs/jwt`
- **State Management**: Pinia
- **Platform**: Web & Android (PWA)

## 3. Prinsip Pengembangan (Constraints)

1.  **Soft Deletes**: Wajib ada di seluruh entity master & transaksi (TypeORM `@DeleteDateColumn()`).
2.  **Bulk Actions**: Fitur Trash, Restore, dan Edit Massal di Admin Panel.
3.  **Scoped Access**: Staff Admin hanya bisa melihat data Prodinya sendiri (via NestJS Guards & Interceptors).
4.  **No `prodi_id` in Users**: Identitas user dipisah dari data akademik (via tabel profil).
5.  **Strict Enrollment**: Setiap kelas wajib memiliki data mahasiswa (`class_students`) untuk otomasi survei/nilai.
6.  **Separation of Concerns**: Backend (NestJS REST API) dan Frontend (Vue SPA) terpisah, berkomunikasi via JSON API.
7.  **Type Safety**: TypeScript digunakan secara konsisten di backend dan frontend.

## 4. Prioritas Fitur (MoSCoW)

### Must Have

- Management Jadwal S2/S3 (Ganjil/Genap, Ganti Jadwal).
- Portal Dosen (Jurnal, Absensi, Nilai).
- Absensi Dosen (Kontrol oleh Staff).
- Laporan BKD (Split Output: SK, Jurnal, Nilai).
- Setting Global & AI Key.

### Should Have

- Notifikasi WA/Email (Reschedule).
- Calendar Sync (.ics).

### Could Have

- AI Scheduling Assistant.
- AI Survey Generator.

---

## Phase 3: Import Matakuliah

Implement an Excel (.xlsx / .xls) import functionality for Matakuliah (Courses), including customized row mapping and error handling for failed rows.

### User Review Required

No breaking changes. This adds new endpoints and UI components. Please review the proposed flow below.

### Backend Requirements

- **Multer Integration**: Add `multer` support for receiving file uploads on a new endpoint `POST /courses/import`.
- **Excel Parsing**: Use the `xlsx` package to read the uploaded buffer and convert it to JSON arrays.
- **Data Validation & Mapping**:
  - Iterate through rows. Extract expected columns: Code, Name, SKS, Semester, Prodi Code.
  - Map the _Prodi Code_ to the actual database `prodiId`.
  - Validate required fields.
- **Transaction/Partial Success**: Save valid rows to the database. Track invalid rows and reason for failure.
- **Response Format**: Return a summary of successful and failed rows, including the raw data of failed rows and the specific error message (e.g., "Prodi Code not found", "Code already exists").


### Frontend Requirements

- **Import Modal Component**: A reusable `ImportModal.vue` containing:
  - Drag & Drop file zone.
  - "Download Template" button.
  - Custom mapping UI to allow users to select which Excel column maps to which Database field (if headers don't strictly match the template).
  - A results table showing both successful records and a tab/list for failed rows (with reasons).
- **Integration**: Placed inside `CoursePage.vue`. After a successful import, refresh the `DataTable`.

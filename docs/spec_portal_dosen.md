# Spesifikasi: Portal Dosen (Tanpa Login via Link Unik)

**Tanggal:** 11 Mei 2026  
**Status:** Draft — Siap Implementasi

---

## 1. Konsep Utama

Portal Dosen adalah halaman khusus yang diakses **tanpa login** melalui link unik per dosen. Setiap dosen mendapat URL personal (contoh: `siakad.ac/dosen/Xk9mP2qR7vL4`) yang langsung membuka portal mereka.

**Alasan:** Dosen S2/S3 umumnya senior dan tidak mau repot dengan username/password. Cukup klik link yang di-bookmark atau dikirim via WhatsApp.

**Keamanan:** Token random 12 karakter (alphanumeric) — cukup aman karena:
- 62^12 = ~3.2 × 10^21 kemungkinan (tidak bisa brute force)
- Token bisa di-regenerate oleh admin kapan saja
- Tidak ada data super-sensitif (nilai bisa dilihat tapi perubahan tetap di-log)

---

## 2. Alur Pengguna (User Flow)

```
Admin generate token dosen → Kirim link via WA/Email
         ↓
Dosen klik link → /dosen/{token}
         ↓
Portal terbuka (tanpa login) → Lihat semua kelas semester aktif
         ↓
Pilih kelas → Tabs: Jadwal | Jurnal | Absensi | Nilai | Tugas
```

---

## 3. Struktur URL & Routing

| Route | Deskripsi |
|-------|-----------|
| `/dosen/:token` | Halaman utama portal (list kelas) |
| `/dosen/:token/kelas/:classCourseId` | Detail kelas (tabs) |
| `/dosen/:token/kelas/:classCourseId/tugas/:assignmentId` | Detail tugas & submissions |
| `/tugas/:publicToken` | Halaman upload tugas publik (mahasiswa) |

Semua route `/dosen/*` menggunakan layout `blank` (tanpa sidebar admin) dan meta `public: true`.

---

## 4. Perubahan Database

### 4.1 Tambah kolom `portalToken` di `lecturer_profiles`

```typescript
// lecturer-profile.entity.ts — tambah field:
@Column({ nullable: true, unique: true })
portalToken: string; // Random 12-char alphanumeric
```

### 4.2 Entity Baru: `Assignment`

```typescript
@Entity('assignments')
export class Assignment {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  classCourseId: number;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'timestamptz', nullable: true })
  deadline: Date;

  @Column({ unique: true })
  publicToken: string; // Random token untuk link upload publik

  @Column({ default: false })
  isGroupTask: boolean;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;

  @ManyToOne(() => ClassCourse, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'classCourseId' })
  classCourse: ClassCourse;

  @OneToMany(() => Submission, (s) => s.assignment)
  submissions: Submission[];
}
```

### 4.3 Entity Baru: `Submission`

```typescript
@Entity('submissions')
export class Submission {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  assignmentId: number;

  @Column()
  studentId: number;

  @Column()
  fileName: string;

  @Column()
  filePath: string; // URL Supabase storage

  @Column({ type: 'bigint', nullable: true })
  fileSize: number;

  @Column({ type: 'text', nullable: true })
  studentNotes: string;

  @CreateDateColumn()
  uploadedAt: Date;

  @ManyToOne(() => Assignment, (a) => a.submissions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'assignmentId' })
  assignment: Assignment;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'studentId' })
  student: User;
}
```

### 4.4 Entity Baru: `StudentAttendance`

```typescript
@Entity('student_attendances')
export class StudentAttendance {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  classMeetingId: number;

  @Column()
  studentId: number;

  @Column({ default: 'H' })
  status: string; // H = Hadir, I = Izin, S = Sakit, A = Alpha

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => ClassMeeting, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'classMeetingId' })
  classMeeting: ClassMeeting;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'studentId' })
  student: User;
}
```

### 4.5 Entity Baru: `StudentGrade`

```typescript
@Entity('student_grades')
export class StudentGrade {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  classCourseId: number;

  @Column()
  studentId: number;

  @Column()
  gradeComponentId: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  score: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => ClassCourse, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'classCourseId' })
  classCourse: ClassCourse;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'studentId' })
  student: User;

  @ManyToOne(() => GradeComponent, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'gradeComponentId' })
  gradeComponent: GradeComponent;
}
```

---

## 5. Backend API Endpoints

### 5.1 Portal Dosen (Public — No Auth)

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | `/api/portal/dosen/:token` | Validasi token, return info dosen + list kelas semester aktif |
| GET | `/api/portal/dosen/:token/kelas/:classCourseId` | Detail kelas (info MK, jadwal, mahasiswa) |

### 5.2 Jurnal Pertemuan

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | `/api/portal/dosen/:token/kelas/:classCourseId/meetings` | List 16 pertemuan |
| POST | `/api/portal/dosen/:token/kelas/:classCourseId/meetings/generate` | Auto-generate meetings |
| PATCH | `/api/portal/dosen/:token/meetings/:meetingId` | Update topic, notes, mode |
| POST | `/api/portal/dosen/:token/meetings/:meetingId/upload` | Upload materi (file) |

### 5.3 Absensi Mahasiswa

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | `/api/portal/dosen/:token/meetings/:meetingId/attendance` | List absensi pertemuan |
| POST | `/api/portal/dosen/:token/meetings/:meetingId/attendance` | Bulk save absensi |

### 5.4 Penilaian

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | `/api/portal/dosen/:token/kelas/:classCourseId/grades` | Tabel nilai (mahasiswa × komponen) |
| POST | `/api/portal/dosen/:token/kelas/:classCourseId/grades` | Bulk save/update nilai |

### 5.5 Penugasan

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | `/api/portal/dosen/:token/kelas/:classCourseId/assignments` | List tugas |
| POST | `/api/portal/dosen/:token/kelas/:classCourseId/assignments` | Buat tugas baru |
| PATCH | `/api/portal/dosen/:token/assignments/:assignmentId` | Edit tugas |
| DELETE | `/api/portal/dosen/:token/assignments/:assignmentId` | Hapus tugas |
| GET | `/api/portal/dosen/:token/assignments/:assignmentId/submissions` | List submission |

### 5.6 Upload Tugas Publik (Mahasiswa — No Auth)

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | `/api/public/tugas/:publicToken` | Info tugas + list mahasiswa kelas |
| POST | `/api/public/tugas/:publicToken/upload` | Upload file submission |

### 5.7 Admin — Manajemen Token Dosen

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | `/api/lecturers/portal-tokens` | List semua dosen + token status |
| POST | `/api/lecturers/:id/generate-token` | Generate/regenerate token |
| POST | `/api/lecturers/bulk-generate-tokens` | Generate token untuk semua dosen |
| DELETE | `/api/lecturers/:id/revoke-token` | Cabut/nonaktifkan token |

---

## 6. Frontend Pages & Komponen

### 6.1 Portal Dosen (Public Layout)

| Page | Route | Deskripsi |
|------|-------|-----------|
| `LecturerPortalHome.vue` | `/dosen/:token` | Header nama dosen + grid cards kelas |
| `LecturerPortalClass.vue` | `/dosen/:token/kelas/:id` | Detail kelas dengan tabs |
| `LecturerPortalAssignment.vue` | `/dosen/:token/kelas/:id/tugas/:aid` | Detail tugas + submissions |
| `PublicAssignmentUpload.vue` | `/tugas/:publicToken` | Halaman upload mahasiswa |

### 6.2 Halaman Utama Portal (`LecturerPortalHome.vue`)

```
┌─────────────────────────────────────────────────────────┐
│  [Logo]  Portal Dosen — Dr. Ahmad Fauzi, M.Kom.         │
│          Semester Ganjil 2025/2026                       │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │ Metode      │  │ Algoritma   │  │ Basis Data  │     │
│  │ Penelitian  │  │ Lanjut      │  │ Terdistribusi│    │
│  │             │  │             │  │             │     │
│  │ Kelas A     │  │ Kelas A     │  │ Kelas B     │     │
│  │ 3 SKS       │  │ 3 SKS       │  │ 2 SKS       │     │
│  │             │  │             │  │             │     │
│  │ Jurnal: 8/16│  │ Jurnal: 5/16│  │ Jurnal: 3/16│     │
│  │ ████████░░  │  │ █████░░░░░  │  │ ███░░░░░░░  │     │
│  │             │  │             │  │             │     │
│  │ [Buka Kelas]│  │ [Buka Kelas]│  │ [Buka Kelas]│     │
│  └─────────────┘  └─────────────┘  └─────────────┘     │
│                                                         │
│  ── Jadwal Hari Ini ──────────────────────────────────  │
│  08:00-10:00  Metode Penelitian  R.304  Kelas A         │
│  13:00-15:00  Algoritma Lanjut   R.201  Kelas A         │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 6.3 Detail Kelas — Tabs

**Tab Jadwal:**
- Tabel jadwal pertemuan (hari, jam, ruangan)
- Info semester & total pertemuan

**Tab Jurnal:**
- Timeline vertikal 16 pertemuan
- Setiap card: Nomor pertemuan, tanggal, status (kosong/terisi)
- Tombol "Isi Jurnal" → modal: Topic (wajib), Notes (opsional), Mode (Online/Offline/Hybrid)
- Upload materi (PDF/PPT)
- Pertemuan yang sudah diisi: tampilkan ringkasan, tombol "Edit"

**Tab Absensi:**
- Pilih pertemuan (dropdown/tabs per nomor)
- Tabel mahasiswa: Nama, NIM, Status (radio: H/I/S/A)
- Tombol "Hadir Semua" (shortcut)
- Tombol "Simpan Absensi"
- Rekap: Total H/I/S/A per pertemuan

**Tab Nilai:**
- Tabel: Baris = Mahasiswa, Kolom = Komponen Nilai (Tugas 1, UTS, UAS, dll)
- Input angka per cell (0-100)
- Auto-calculate: Nilai Akhir = Σ(skor × bobot)
- Kolom terakhir: Grade (A/B+/B/C+/C/D/E) — auto-convert berdasarkan range
- Tombol "Simpan Nilai"

**Tab Tugas:**
- List tugas yang sudah dibuat
- Tombol "Buat Tugas Baru" → modal: Judul, Deskripsi, Deadline
- Setiap tugas menampilkan:
  - Link publik (copy to clipboard)
  - Jumlah submission: "12/25 mahasiswa sudah mengumpulkan"
  - Tombol "Lihat Submission" → halaman detail

### 6.4 Halaman Upload Tugas Publik (`/tugas/:publicToken`)

```
┌─────────────────────────────────────────────────────────┐
│  [Logo]  Pengumpulan Tugas                              │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Tugas: Tugas Besar - Implementasi Algoritma            │
│  Mata Kuliah: Algoritma Lanjut (Kelas A)                │
│  Deadline: 15 Juni 2026, 23:59 WIB                      │
│                                                         │
│  ┌───────────────────────────────────────────────────┐  │
│  │  Pilih Nama Anda:                                 │  │
│  │  [▼ Cari nama mahasiswa...                    ]   │  │
│  └───────────────────────────────────────────────────┘  │
│                                                         │
│  ┌───────────────────────────────────────────────────┐  │
│  │  📎 Drag & drop file di sini                      │  │
│  │     atau klik untuk memilih file                  │  │
│  │     (PDF, ZIP, DOCX — Maks 25MB)                  │  │
│  └───────────────────────────────────────────────────┘  │
│                                                         │
│  Catatan (opsional):                                    │
│  ┌───────────────────────────────────────────────────┐  │
│  │                                                   │  │
│  └───────────────────────────────────────────────────┘  │
│                                                         │
│  [        Kirim Tugas        ]                          │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 6.5 Admin — Manajemen Token Dosen

Di halaman `/lecturers` yang sudah ada, tambahkan:
- Kolom "Portal Link" di tabel dosen
- Tombol "Generate Link" per dosen
- Tombol "Generate Semua" (bulk)
- Tombol "Copy Link" (salin ke clipboard)
- Tombol "Cabut Akses" (revoke token)

---

## 7. Validasi & Business Rules

### Token
- Format: 12 karakter alphanumeric random (`[a-zA-Z0-9]`)
- Unique constraint di database
- Bisa di-regenerate (token lama langsung invalid)
- Tidak expired (berlaku sampai di-revoke)

### Jurnal
- Topic wajib diisi (minimal 5 karakter)
- Pertemuan hanya bisa diisi secara berurutan (tidak bisa isi pertemuan 5 jika 4 belum diisi) — opsional, bisa direlaksasi
- Setelah di-lock oleh admin, dosen tidak bisa edit lagi

### Absensi
- Default status: "H" (Hadir) untuk semua mahasiswa
- Satu mahasiswa hanya punya 1 record per pertemuan (upsert)
- Bisa diedit ulang selama pertemuan belum di-lock

### Nilai
- Skor: 0-100 (decimal 2 digit)
- Grade auto-calculate berdasarkan `grade_components.weight`
- Nilai akhir = Σ(skor_komponen × bobot_komponen / 100)
- Konversi ke huruf: A (≥85), A- (≥80), B+ (≥75), B (≥70), B- (≥65), C+ (≥60), C (≥55), D (≥40), E (<40) — konfigurabel per prodi

### Tugas
- Token publik: 16 karakter random
- File upload: max 25MB, tipe: PDF, ZIP, DOCX, PPTX, XLSX
- Satu mahasiswa bisa upload ulang (replace submission lama)
- Setelah deadline, upload masih bisa tapi ditandai "Terlambat"

---

## 8. Keamanan

| Concern | Mitigasi |
|---------|----------|
| Token ditebak | 62^12 kombinasi = brute force tidak feasible |
| Token bocor | Admin bisa regenerate kapan saja, token lama langsung mati |
| Manipulasi data | Semua perubahan di-log (audit trail) |
| Upload malicious file | Validasi mime type + extension + size limit |
| Rate abuse | Rate limit pada endpoint portal (30 req/min per token) |

---

## 9. Integrasi dengan Modul Lain

| Modul | Integrasi |
|-------|-----------|
| ClassCourse | Portal menampilkan kelas berdasarkan `class_lecturers` yang terkait dosen |
| ClassMeeting | Jurnal menggunakan entity yang sudah ada (sekarang diaktifkan) |
| ClassSchedule | Jadwal ditampilkan dari data yang sudah ada |
| ClassCourseStudent | List mahasiswa untuk absensi & nilai diambil dari enrollment |
| GradeComponent | Komponen nilai (kolom) diambil dari master data |
| Semester (aktif) | Portal hanya menampilkan kelas semester aktif |

---

## 10. Task Breakdown (Implementasi)

### Backend (5-6 hari)

| # | Task | Estimasi |
|---|------|----------|
| 1 | Tambah `portalToken` di `LecturerProfile` entity + migration | 0.5 hari |
| 2 | Buat entity `Assignment`, `Submission`, `StudentAttendance`, `StudentGrade` | 1 hari |
| 3 | Buat `LecturerPortalModule` — controller + service | 0.5 hari |
| 4 | Endpoint: validasi token + get dosen info + list kelas | 0.5 hari |
| 5 | Endpoint: CRUD meetings (generate, update, upload material) | 1 hari |
| 6 | Endpoint: absensi mahasiswa (get + bulk save) | 0.5 hari |
| 7 | Endpoint: penilaian (get tabel + bulk save) | 0.5 hari |
| 8 | Endpoint: CRUD assignments + list submissions | 0.5 hari |
| 9 | Endpoint: public upload tugas (validasi token + upload file) | 0.5 hari |
| 10 | Endpoint admin: generate/revoke token dosen | 0.5 hari |

### Frontend (5-6 hari)

| # | Task | Estimasi |
|---|------|----------|
| 1 | Setup routes portal dosen (public, blank layout) | 0.5 hari |
| 2 | `LecturerPortalHome.vue` — grid kelas + jadwal hari ini | 1 hari |
| 3 | `LecturerPortalClass.vue` — tabs container + tab jadwal | 0.5 hari |
| 4 | Tab Jurnal — timeline + modal input + upload | 1 hari |
| 5 | Tab Absensi — tabel + radio buttons + bulk save | 1 hari |
| 6 | Tab Nilai — spreadsheet-like input + auto-calculate | 1 hari |
| 7 | Tab Tugas — list + create modal + copy link | 0.5 hari |
| 8 | `PublicAssignmentUpload.vue` — form upload mahasiswa | 0.5 hari |
| 9 | Admin: kolom token + generate/copy/revoke di halaman dosen | 0.5 hari |

### Total: ~10-12 hari kerja

---

## 11. Dependensi

Sebelum portal dosen bisa dibangun, pastikan:
- [x] Entity `ClassMeeting` sudah ada ✅
- [x] Entity `ClassCourse` + `ClassLecturer` sudah ada ✅
- [x] Entity `ClassCourseStudent` sudah ada ✅
- [x] Entity `GradeComponent` sudah ada ✅
- [x] Supabase storage sudah terkonfigurasi ✅
- [ ] Entity `Assignment`, `Submission`, `StudentAttendance`, `StudentGrade` — **perlu dibuat**
- [ ] Kolom `portalToken` di `LecturerProfile` — **perlu ditambah**

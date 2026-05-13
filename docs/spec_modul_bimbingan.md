# Spesifikasi Modul Bimbingan & Tugas Akhir (Tesis/Disertasi)

**Tanggal:** 13 Mei 2026  
**Status:** Planning  
**Posisi:** Sub-modul dalam Sistem Informasi Akademik (terintegrasi)

---

## 1. Ringkasan

Modul ini menangani **seluruh siklus tugas akhir mahasiswa pascasarjana** — dari pengajuan judul/proposal hingga sidang akhir dan kelulusan. Bukan hanya jadwal bimbingan, tapi juga:

- Plotting pembimbing & penguji
- Tracking progress per tahapan
- Penjadwalan sidang (proposal, hasil, akhir)
- Log bimbingan per sesi
- Monitoring oleh Kaprodi/Admin
- Notifikasi & reminder otomatis

---

## 2. Alur Proses (Workflow Utama)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    ALUR TUGAS AKHIR PASCASARJANA                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. PENGAJUAN JUDUL                                                         │
│     Mahasiswa submit judul + abstrak → Admin review → Approve/Revisi        │
│                          ↓                                                  │
│  2. PENETAPAN PEMBIMBING                                                    │
│     Admin assign Pembimbing 1 & 2 → SK Pembimbing (cetak)                   │
│                          ↓                                                  │
│  3. BIMBINGAN PROPOSAL                                                      │
│     Mahasiswa request jadwal → Dosen approve → Bimbingan → Log              │
│     (Minimal X kali bimbingan sebelum boleh sidang)                         │
│                          ↓                                                  │
│  4. SIDANG PROPOSAL                                                         │
│     Admin jadwalkan sidang → Assign penguji → Sidang → Hasil (Lulus/Revisi) │
│                          ↓                                                  │
│  5. BIMBINGAN TESIS/DISERTASI                                               │
│     Mahasiswa bimbingan rutin → Log per BAB → Progress tracking             │
│     (Minimal Y kali bimbingan sebelum boleh sidang hasil)                   │
│                          ↓                                                  │
│  6. SIDANG HASIL                                                            │
│     Admin jadwalkan → Penguji → Sidang → Hasil (Lulus/Revisi)               │
│                          ↓                                                  │
│  7. REVISI PASCA-SIDANG                                                     │
│     Mahasiswa upload revisi → Pembimbing verifikasi → Approve               │
│                          ↓                                                  │
│  8. SIDANG AKHIR / TUTUP (Opsional, tergantung prodi)                       │
│     Sidang tertutup → Lulus → Status mahasiswa: LULUS                       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Entitas Database

### 3.1 `thesis_submissions` — Data Tugas Akhir Mahasiswa

```typescript
ThesisSubmission {
  id: number
  studentId: number           // FK → users
  prodiId: number             // FK → prodis
  title: string               // Judul tesis/disertasi
  titleEn: string             // Judul (English)
  abstract: text              // Abstrak
  type: 'TESIS' | 'DISERTASI'
  status: ThesisStatus        // Enum (lihat di bawah)
  submittedAt: Date
  approvedAt: Date
  completedAt: Date
  
  // Relations
  supervisors: ThesisSupervisor[]
  examiners: ThesisExaminer[]
  guidanceLogs: GuidanceLog[]
  examSchedules: ThesisExamSchedule[]
  documents: ThesisDocument[]
  milestones: ThesisMilestone[]
}
```

**ThesisStatus Enum:**
```
DRAFT → SUBMITTED → TITLE_APPROVED → SUPERVISOR_ASSIGNED → 
PROPOSAL_GUIDANCE → PROPOSAL_EXAM_SCHEDULED → PROPOSAL_PASSED → 
THESIS_GUIDANCE → RESULT_EXAM_SCHEDULED → RESULT_PASSED → 
REVISION → REVISION_APPROVED → FINAL_EXAM_SCHEDULED → COMPLETED
```

### 3.2 `thesis_supervisors` — Pembimbing

```typescript
ThesisSupervisor {
  id: number
  thesisId: number            // FK → thesis_submissions
  lecturerId: number          // FK → users
  role: 'PEMBIMBING_1' | 'PEMBIMBING_2'
  assignedAt: Date
  skNumber: string            // Nomor SK Pembimbing
}
```

### 3.3 `thesis_examiners` — Penguji Sidang

```typescript
ThesisExaminer {
  id: number
  thesisId: number
  lecturerId: number
  examScheduleId: number      // FK → thesis_exam_schedules
  role: 'KETUA' | 'PENGUJI_1' | 'PENGUJI_2' | 'SEKRETARIS'
}
```

### 3.4 `guidance_logs` — Log Bimbingan Per Sesi

```typescript
GuidanceLog {
  id: number
  thesisId: number
  scheduleId: number          // FK → guidance_schedules (opsional)
  lecturerId: number
  studentId: number
  date: Date
  startTime: time
  endTime: time
  topic: text                 // Apa yang dibahas
  notes: text                 // Catatan/arahan dosen
  studentProgress: text       // Apa yang sudah dikerjakan mahasiswa
  nextAction: text            // Yang harus dikerjakan selanjutnya
  chapter: string             // BAB berapa yang dibahas (BAB 1, BAB 2, dll)
  attachmentUrl: string       // File yang di-review (draft BAB, dll)
  status: 'DONE' | 'CANCELLED' | 'NO_SHOW'
  createdAt: Date
}
```

### 3.5 `thesis_exam_schedules` — Jadwal Sidang

```typescript
ThesisExamSchedule {
  id: number
  thesisId: number
  type: 'PROPOSAL' | 'HASIL' | 'AKHIR'
  date: Date
  startTime: time
  endTime: time
  roomId: number
  status: 'SCHEDULED' | 'ONGOING' | 'PASSED' | 'REVISION' | 'FAILED' | 'CANCELLED'
  result: text                // Catatan hasil sidang
  score: decimal              // Nilai sidang (opsional)
  revisionDeadline: Date      // Batas waktu revisi
  revisionNotes: text         // Catatan revisi yang harus diperbaiki
  
  // Relations
  examiners: ThesisExaminer[]
}
```

### 3.6 `thesis_documents` — Dokumen Terkait

```typescript
ThesisDocument {
  id: number
  thesisId: number
  type: 'PROPOSAL' | 'DRAFT_BAB' | 'FULL_DRAFT' | 'REVISION' | 'FINAL' | 'SK_PEMBIMBING' | 'BERITA_ACARA' | 'KARTU_BIMBINGAN'
  title: string
  filePath: string
  uploadedBy: number          // FK → users
  version: number             // Versi ke-berapa
  notes: string
  createdAt: Date
}
```

### 3.7 `thesis_milestones` — Progress Tracking

```typescript
ThesisMilestone {
  id: number
  thesisId: number
  name: string                // "BAB 1 Selesai", "Proposal Lulus", dll
  targetDate: Date            // Target penyelesaian
  completedDate: Date         // Tanggal aktual selesai
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE'
  notes: string
  order: number               // Urutan milestone
}
```

---

## 4. Fitur Per Role

### 4.1 Mahasiswa (Portal `/mahasiswa/:nim`)

| Fitur | Deskripsi |
|-------|-----------|
| Pengajuan Judul | Form: judul, abstrak, jenis (tesis/disertasi) |
| Lihat Status | Timeline visual progress tugas akhir |
| Request Bimbingan | Pilih dosen, tanggal, jam, topik |
| Lihat Jadwal Sidang | Tanggal, ruangan, penguji |
| Upload Dokumen | Upload draft per BAB, revisi, final |
| Lihat Log Bimbingan | Riwayat semua sesi bimbingan + catatan dosen |
| Lihat Milestone | Checklist progress (BAB 1 ✓, BAB 2 ✓, ...) |

### 4.2 Dosen Pembimbing (Portal `/dosen/:token`)

| Fitur | Deskripsi |
|-------|-----------|
| List Mahasiswa Bimbingan | Semua mahasiswa yang dibimbing + status masing-masing |
| Approve/Reject Request | Terima atau tolak request jadwal bimbingan |
| Isi Log Bimbingan | Catat topik, catatan, arahan, next action |
| Review Dokumen | Lihat & download draft yang diupload mahasiswa |
| Update Progress | Tandai milestone selesai |
| Approve Revisi | Verifikasi revisi pasca-sidang sudah benar |

### 4.3 Admin / Staff Prodi

| Fitur | Deskripsi |
|-------|-----------|
| Approve Judul | Review & approve pengajuan judul |
| Assign Pembimbing | Tetapkan pembimbing 1 & 2 |
| Jadwalkan Sidang | Set tanggal, ruangan, assign penguji |
| Cetak SK Pembimbing | Generate PDF SK |
| Cetak Berita Acara | Generate PDF berita acara sidang |
| Cetak Kartu Bimbingan | Generate PDF log bimbingan |
| Monitoring Dashboard | Overview semua mahasiswa + progress |
| Set Aturan | Minimal bimbingan sebelum sidang, deadline, dll |

### 4.4 Kaprodi (Monitoring)

| Fitur | Deskripsi |
|-------|-----------|
| Dashboard Progress | Grafik: berapa mahasiswa di tahap mana |
| Alert Mahasiswa Lambat | Mahasiswa yang > 6 bulan tidak bimbingan |
| Statistik | Rata-rata waktu penyelesaian, jumlah lulus per semester |
| Approval Sidang | Verifikasi kelayakan sidang (minimal bimbingan terpenuhi) |

---

## 5. Halaman & Route

### Frontend Routes

| Route | Halaman | Role |
|-------|---------|------|
| `/mahasiswa/:nim` | Portal Mahasiswa (sudah ada, tambah tab Tugas Akhir) | Mahasiswa |
| `/dosen/:token` | Portal Dosen (tambah tab Bimbingan Tesis) | Dosen |
| `/thesis` | Admin: List semua tugas akhir | Admin/Staff |
| `/thesis/:id` | Admin: Detail tugas akhir (timeline + actions) | Admin/Staff |
| `/thesis/exams` | Admin: Jadwal sidang (kalender) | Admin/Staff |
| `/thesis/monitoring` | Kaprodi: Dashboard monitoring | Kaprodi |
| `/guidance` | Admin: Jadwal bimbingan (sudah ada) | Admin/Staff |

### API Endpoints

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| **Mahasiswa** | | |
| POST | `/api/thesis/submit` | Ajukan judul |
| GET | `/api/thesis/my` | Lihat tugas akhir saya |
| POST | `/api/thesis/:id/documents` | Upload dokumen |
| GET | `/api/thesis/:id/logs` | Lihat log bimbingan |
| GET | `/api/thesis/:id/milestones` | Lihat progress |
| **Dosen** | | |
| GET | `/api/portal/dosen/:token/thesis-students` | List mahasiswa bimbingan |
| POST | `/api/portal/dosen/:token/guidance-log` | Isi log bimbingan |
| PATCH | `/api/portal/dosen/:token/thesis/:id/milestone` | Update milestone |
| POST | `/api/portal/dosen/:token/thesis/:id/approve-revision` | Approve revisi |
| **Admin** | | |
| GET | `/api/thesis` | List semua tugas akhir (filter: status, prodi) |
| GET | `/api/thesis/:id` | Detail tugas akhir |
| PATCH | `/api/thesis/:id/status` | Update status (approve judul, dll) |
| POST | `/api/thesis/:id/supervisors` | Assign pembimbing |
| POST | `/api/thesis/:id/exams` | Jadwalkan sidang |
| POST | `/api/thesis/:id/exams/:examId/examiners` | Assign penguji |
| PATCH | `/api/thesis/exams/:examId/result` | Input hasil sidang |
| GET | `/api/thesis/monitoring` | Dashboard monitoring |
| GET | `/api/thesis/exams` | List semua jadwal sidang |

---

## 6. UI Design Concept

### 6.1 Detail Tugas Akhir (Admin View)

```
┌─────────────────────────────────────────────────────────────────┐
│ ← Kembali                                                       │
│                                                                 │
│ IMPLEMENTASI MACHINE LEARNING UNTUK PREDIKSI...                 │
│ Ahmad Fauzi · NIM 2024001 · S2 Informatika                      │
│ Status: [████████░░░░] BIMBINGAN TESIS                          │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│ [Timeline] [Bimbingan] [Dokumen] [Sidang] [Milestone]           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ TIMELINE:                                                       │
│                                                                 │
│ ● 10 Jan 2026 — Judul Diajukan                                 │
│ ● 15 Jan 2026 — Judul Disetujui                                │
│ ● 20 Jan 2026 — Pembimbing Ditetapkan                          │
│   ├ Pembimbing 1: Prof. Dr. Budi Santoso                       │
│   └ Pembimbing 2: Dr. Rina Wijaya                              │
│ ● 01 Feb - 15 Apr — Bimbingan Proposal (8 sesi)                │
│ ● 20 Apr 2026 — Sidang Proposal → LULUS                        │
│ ● 01 Mei - sekarang — Bimbingan Tesis (5 sesi)                 │
│ ○ (Belum) — Sidang Hasil                                       │
│ ○ (Belum) — Revisi                                             │
│ ○ (Belum) — Sidang Akhir                                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 6.2 Monitoring Kaprodi

```
┌─────────────────────────────────────────────────────────────────┐
│ MONITORING TUGAS AKHIR — S2 Informatika                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ [12] Pengajuan Judul  [8] Bimbingan Proposal  [15] Bimbingan    │
│ [3] Sidang Proposal   [5] Sidang Hasil        [2] Revisi        │
│ [45] Total Aktif      [12] Selesai Semester Ini                 │
│                                                                 │
│ ⚠️ ALERT: 3 mahasiswa tidak bimbingan > 3 bulan                 │
│ ⚠️ ALERT: 2 mahasiswa melewati batas waktu studi                │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Nama          │ Status         │ Terakhir Bimbingan │ Alert │ │
│ │ Ahmad Fauzi   │ Bimbingan Tesis│ 2 minggu lalu      │       │ │
│ │ Siti Aminah   │ Revisi         │ 1 bulan lalu       │ ⚠️    │ │
│ │ Budi Prasetyo │ Bimbingan      │ 4 bulan lalu       │ 🔴    │ │
│ └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## 7. Aturan Bisnis (Business Rules)

| Rule | Deskripsi |
|------|-----------|
| Minimal bimbingan proposal | Minimal 4 sesi bimbingan sebelum boleh sidang proposal |
| Minimal bimbingan tesis | Minimal 8 sesi bimbingan sebelum boleh sidang hasil |
| Batas revisi | Revisi harus selesai dalam 30 hari setelah sidang |
| Batas waktu studi | S2: 4 tahun, S3: 7 tahun (alert jika mendekati) |
| Pembimbing wajib | Minimal 1 pembimbing, maksimal 2 |
| Penguji sidang | Minimal 3 orang (Ketua + 2 Penguji) |
| Approval berjenjang | Judul → Kaprodi approve, Sidang → Kaprodi approve kelayakan |
| Log bimbingan wajib | Setiap sesi bimbingan HARUS ada log (topik + catatan) |

---

## 8. Integrasi dengan Modul Lain

| Modul | Integrasi |
|-------|-----------|
| Display TV | Tampilkan jadwal sidang & bimbingan hari ini |
| Portal Dosen | Tab "Mahasiswa Bimbingan" dengan list + log |
| Portal Mahasiswa | Tab "Tugas Akhir" dengan timeline + upload |
| Surat | Generate SK Pembimbing, Undangan Sidang, Berita Acara |
| Notifikasi | Reminder bimbingan, alert deadline, notif hasil sidang |
| Export | Cetak kartu bimbingan, rekap progress, statistik |

---

## 9. Task Breakdown (Implementasi)

### Phase 1: Foundation (3-4 hari)
- [ ] Buat entity: `ThesisSubmission`, `ThesisSupervisor`, `ThesisExaminer`, `GuidanceLog`, `ThesisExamSchedule`, `ThesisDocument`, `ThesisMilestone`
- [ ] Buat `ThesisModule` (controller + service)
- [ ] Endpoint CRUD thesis submissions
- [ ] Endpoint assign pembimbing
- [ ] Endpoint update status (state machine)

### Phase 2: Bimbingan & Log (3-4 hari)
- [ ] Endpoint guidance log (create, list per thesis)
- [ ] Integrasi dengan `guidance_schedules` yang sudah ada
- [ ] Portal dosen: tab "Mahasiswa Bimbingan"
- [ ] Portal mahasiswa: tab "Tugas Akhir" + timeline
- [ ] Validasi minimal bimbingan sebelum sidang

### Phase 3: Sidang (3-4 hari)
- [ ] Endpoint jadwal sidang (CRUD)
- [ ] Endpoint assign penguji
- [ ] Endpoint input hasil sidang
- [ ] Halaman admin: kalender sidang
- [ ] Halaman admin: detail tugas akhir (timeline view)

### Phase 4: Monitoring & Reporting (2-3 hari)
- [ ] Dashboard monitoring kaprodi
- [ ] Alert mahasiswa lambat
- [ ] Statistik (rata-rata waktu, jumlah lulus)
- [ ] Export: kartu bimbingan, berita acara (PDF)
- [ ] Integrasi Display TV (jadwal sidang hari ini)

### Phase 5: Dokumen & Polish (2-3 hari)
- [ ] Upload & versioning dokumen
- [ ] Milestone tracking UI
- [ ] Notifikasi (reminder bimbingan, deadline revisi)
- [ ] Generate SK Pembimbing (integrasi modul surat)

---

## 10. Estimasi Total

| Phase | Estimasi |
|-------|----------|
| Phase 1: Foundation | 3-4 hari |
| Phase 2: Bimbingan & Log | 3-4 hari |
| Phase 3: Sidang | 3-4 hari |
| Phase 4: Monitoring | 2-3 hari |
| Phase 5: Dokumen & Polish | 2-3 hari |
| **TOTAL** | **13-18 hari kerja** |

---

## 11. Prioritas Implementasi

**Harus ada (MVP):**
1. Pengajuan judul + approve
2. Assign pembimbing
3. Request & log bimbingan
4. Jadwal sidang + assign penguji
5. Input hasil sidang
6. Status tracking (timeline)

**Bisa menyusul:**
- Milestone tracking detail
- Dokumen versioning
- Dashboard monitoring kaprodi
- Generate PDF (SK, Berita Acara)
- Alert otomatis
- Statistik

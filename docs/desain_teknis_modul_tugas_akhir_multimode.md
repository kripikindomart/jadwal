# Desain Teknis Modul Tugas Akhir Multi-Mode

## 1. Database Schema (Proposed)

## 1.1 Perubahan pada tabel existing
Tabel `prodis`:
- tambah kolom `thesis_flow_mode` (`A` | `B` | `C`), default `C`.

## 1.2 Tabel baru

### `thesis_workflow`
Mewakili 1 pengajuan tugas akhir per mahasiswa.

Kolom inti:
- `id` bigint PK
- `student_id` bigint FK -> `users.id`
- `prodi_id` bigint FK -> `prodis.id`
- `flow_mode` varchar(1) not null (`A/B/C`)
- `current_status` varchar(50) not null
- `title` varchar(255) not null
- `research_background` text null
- `problem_statement` text null
- `methodology_summary` text null
- `submitted_at` timestamptz null
- `completed_at` timestamptz null
- `created_at` timestamptz not null
- `updated_at` timestamptz not null
- `deleted_at` timestamptz null

Index:
- (`student_id`, `deleted_at`)
- (`prodi_id`, `current_status`, `deleted_at`)

Constraint:
- 1 workflow aktif per mahasiswa per periode (opsional via `semester_id` jika dipakai).

### `thesis_supervisors`
Relasi pembimbing.

Kolom:
- `id` bigint PK
- `workflow_id` bigint FK -> `thesis_workflow.id`
- `lecturer_id` bigint FK -> `users.id`
- `role` varchar(20) not null (`PRIMARY` | `SECONDARY`)
- `assigned_at` timestamptz not null
- `created_at`, `updated_at`, `deleted_at`

Unique:
- (`workflow_id`, `lecturer_id`)
- (`workflow_id`, `role`) untuk memastikan satu `PRIMARY`.

### `thesis_stage_events`
Riwayat transisi status (audit workflow domain).

Kolom:
- `id` bigint PK
- `workflow_id` bigint FK
- `from_status` varchar(50) null
- `to_status` varchar(50) not null
- `action` varchar(100) not null
- `notes` text null
- `acted_by` bigint FK -> `users.id`
- `acted_at` timestamptz not null
- `metadata` jsonb null

Index:
- (`workflow_id`, `acted_at desc`)

### `thesis_documents`
Dokumen upload per tahap.

Kolom:
- `id` bigint PK
- `workflow_id` bigint FK
- `stage` varchar(30) not null (`PROPOSAL`, `RESULT_SEMINAR`, `THESIS_DEFENSE`, `FINAL`)
- `document_type` varchar(50) not null
- `file_url` text not null
- `file_name` varchar(255) not null
- `uploaded_by` bigint FK -> `users.id`
- `uploaded_at` timestamptz not null
- `is_active` boolean default true

### `thesis_exams`
Jadwal dan hasil ujian (seminar proposal / seminar hasil / sidang tesis).

Kolom:
- `id` bigint PK
- `workflow_id` bigint FK
- `exam_type` varchar(20) not null (`PROPOSAL`, `RESULT`, `DEFENSE`)
- `status` varchar(30) not null (`SCHEDULED`, `DONE`, `CANCELED`)
- `scheduled_at` timestamptz null
- `location` varchar(255) null
- `result` varchar(30) null (`PASSED`, `PASSED_WITH_REVISION`, `FAILED`)
- `revision_deadline` date null
- `finalized_at` timestamptz null
- `created_by` bigint FK -> `users.id`
- `created_at`, `updated_at`, `deleted_at`

Index:
- (`workflow_id`, `exam_type`, `deleted_at`)

### `thesis_exam_examiners`
Penguji pada exam tertentu.

Kolom:
- `id` bigint PK
- `exam_id` bigint FK -> `thesis_exams.id`
- `lecturer_id` bigint FK -> `users.id`
- `role` varchar(20) not null (`CHAIR`, `MEMBER`)
- `created_at`, `updated_at`, `deleted_at`

Unique:
- (`exam_id`, `lecturer_id`)

### `thesis_exam_notes`
Catatan per penguji.

Kolom:
- `id` bigint PK
- `exam_id` bigint FK
- `examiner_id` bigint FK -> `users.id`
- `notes` text null
- `score` numeric(5,2) null
- `recommendation` varchar(30) null (`PASS`, `REVISION`, `FAIL`)
- `created_at`, `updated_at`

## 1.3 Contoh DDL ringkas (PostgreSQL)
```sql
alter table prodis
  add column if not exists thesis_flow_mode varchar(1) not null default 'C';

create table if not exists thesis_workflow (
  id bigserial primary key,
  student_id bigint not null references users(id),
  prodi_id bigint not null references prodis(id),
  flow_mode varchar(1) not null check (flow_mode in ('A','B','C')),
  current_status varchar(50) not null,
  title varchar(255) not null,
  research_background text,
  problem_statement text,
  methodology_summary text,
  submitted_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
```

## 2. Application Flow

## 2.1 Global flow
1. Mahasiswa submit proposal (`SUBMITTED`).
2. Admin verifikasi (`ADMIN_REVIEW` -> valid/tidak).
3. Prodi assign pembimbing (`SUPERVISOR_ASSIGNED`).
4. Bimbingan aktif (`SUPERVISION_ACTIVE`).
5. Sistem jalankan jalur stage berdasarkan `flow_mode`.
6. Sidang tesis.
7. Revisi final (jika ada) -> `COMPLETED`.

## 2.2 Flow per mode
Mode A:
1. `SUPERVISION_ACTIVE`
2. `RESULT_SEMINAR_SCHEDULED`
3. `RESULT_SEMINAR_PASSED`
4. `THESIS_DEFENSE_SCHEDULED`
5. `THESIS_DEFENSE_PASSED`
6. `COMPLETED`

Mode B:
1. `SUPERVISION_ACTIVE`
2. `PROPOSAL_SEMINAR_SCHEDULED`
3. `PROPOSAL_SEMINAR_PASSED`
4. `THESIS_DEFENSE_SCHEDULED`
5. `THESIS_DEFENSE_PASSED`
6. `COMPLETED`

Mode C:
1. `SUPERVISION_ACTIVE`
2. `PROPOSAL_SEMINAR_SCHEDULED`
3. `PROPOSAL_SEMINAR_PASSED`
4. `RESULT_SEMINAR_SCHEDULED`
5. `RESULT_SEMINAR_PASSED`
6. `THESIS_DEFENSE_SCHEDULED`
7. `THESIS_DEFENSE_PASSED`
8. `COMPLETED`

## 3. Breakdown Module

## 3.1 Backend (NestJS)
- `ThesisWorkflowModule`
  - `thesis-workflow.controller.ts`
  - `thesis-workflow.service.ts`
  - `thesis-workflow.state-machine.ts`
  - `dto/`
- `ThesisExamModule`
  - jadwal exam, examiner, hasil exam.
- `ThesisDocumentModule`
  - upload/list dokumen per stage.
- Integrasi:
  - `NotificationsModule` untuk notifikasi transisi.
  - `AuditModule` untuk logging aksi.

Endpoint minimum:
- `POST /api/thesis-workflows`
- `GET /api/thesis-workflows`
- `GET /api/thesis-workflows/:id`
- `POST /api/thesis-workflows/:id/assign-supervisors`
- `POST /api/thesis-workflows/:id/transition`
- `POST /api/thesis-workflows/:id/exams`
- `PATCH /api/thesis-exams/:id/result`
- `POST /api/thesis-workflows/:id/documents`

## 3.2 Frontend (Vue)
- Halaman mahasiswa:
  - `MyThesisWorkflowPage`
  - stepper status + upload dokumen + timeline.
- Halaman admin/prodi:
  - `ThesisWorkflowQueuePage`
  - filter prodi/status/mode.
- Halaman ujian:
  - scheduling, assign penguji, input hasil.

Komponen:
- `WorkflowStepper`
- `StatusTransitionDialog`
- `ExamSchedulerForm`
- `ExamResultForm`
- `DocumentStageUploader`
- `ThesisTimeline`

## 4. Rules Engine (State Machine)
- State machine wajib centralized di backend.
- Frontend hanya membaca allowed actions dari API.
- Response detail:
  - `currentStatus`
  - `allowedTransitions[]`
  - `requiredDocuments[]`
  - `blockedReason[]`

## 5. Data Migration Strategy
1. Tambah tabel baru + kolom mode prodi.
2. Mapping data existing `thesis_submission` ke `thesis_workflow` (jika dipakai).
3. Backfill status awal.
4. Jalankan mode default `C` untuk prodi yang belum diset.

## 6. Risiko Teknis
- Inkonsistensi data jika transisi tidak transactional.
- Role permission tidak sinkron dengan endpoint baru.
- Prodi mode berubah saat workflow sudah berjalan.

Mitigasi:
- Gunakan transaction + lock saat transisi.
- Simpan `flow_mode` snapshot di `thesis_workflow` (jangan selalu baca prodi terbaru).
- Tambahkan validation guard khusus workflow.

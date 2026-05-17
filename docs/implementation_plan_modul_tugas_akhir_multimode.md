# Implementation Plan Modul Tugas Akhir Multi-Mode

## 1. Strategi Implementasi
Pendekatan bertahap per sprint dengan feature flag agar rollout aman.

Feature flag yang disarankan:
- `THESIS_WORKFLOW_V2_ENABLED`

Jika `false`:
- sistem lama tetap berjalan.

Jika `true`:
- endpoint dan UI baru aktif untuk prodi terpilih.

## 2. Fase Implementasi

## Fase 0: Discovery dan Finalisasi Aturan (3-5 hari)
Deliverables:
- Final status map per mode (`A/B/C`).
- Matriks role-permission final.
- Mapping proses akademik per prodi.

Output:
- Dokumen aturan transisi yang disetujui stakeholder.

## Fase 1: Data Layer (5-7 hari)
Task:
1. Tambah kolom `thesis_flow_mode` di `prodis`.
2. Buat tabel workflow/exam/document/event.
3. Buat entity TypeORM + repository.
4. Tambah migration script dan rollback.

Acceptance criteria:
- Migration up/down sukses.
- Index utama terpasang.

## Fase 2: Workflow Engine Backend (7-10 hari)
Task:
1. Implement state machine service.
2. Implement validasi transisi per mode.
3. Implement endpoint create workflow + transition.
4. Simpan event ke `thesis_stage_events`.
5. Tambah guard permission.

Acceptance criteria:
- Unit test state transition lulus.
- Transisi invalid ditolak dengan pesan jelas.

## Fase 3: Exam & Document Module (7-10 hari)
Task:
1. Endpoint scheduling exam + assign examiner.
2. Endpoint input hasil ujian + revisi.
3. Endpoint upload dokumen per stage.
4. Integrasi notifikasi dasar.

Acceptance criteria:
- Alur end-to-end mode A/B/C bisa dijalankan via API.

## Fase 4: Frontend Core UI (10-14 hari)
Task:
1. Halaman mahasiswa: status stepper + dokumen + timeline.
2. Halaman admin/prodi: queue, filter, detail workflow.
3. Form penjadwalan ujian dan input hasil.
4. Action button hanya tampil untuk allowed transitions.

Acceptance criteria:
- UAT internal untuk 3 mode flow lolos.

## Fase 5: Migration Existing Data + Pilot (5-7 hari)
Task:
1. Backfill data workflow dari data tesis lama (jika ada).
2. Aktifkan feature flag untuk 1-2 prodi pilot.
3. Monitoring bug + perbaikan cepat.

Acceptance criteria:
- Tidak ada blocker pada proses real pilot.

## Fase 6: Full Rollout (3-5 hari)
Task:
1. Aktifkan seluruh prodi.
2. Nonaktifkan alur lama bertahap.
3. Dokumentasi operasional + training admin.

Acceptance criteria:
- Semua prodi berjalan pada workflow baru.

## 3. Work Breakdown Structure (WBS)

## Backend
1. Migration dan entity.
2. Service state machine.
3. Controller workflow.
4. Controller exam.
5. Controller documents.
6. Integration notifications/audit.
7. Test unit + integration.

## Frontend
1. Workflow list page.
2. Workflow detail page.
3. Exam scheduling UI.
4. Exam result UI.
5. Stage document uploader.
6. Permission-based action rendering.
7. E2E flow test.

## QA
1. Test scenario mode A.
2. Test scenario mode B.
3. Test scenario mode C.
4. Negative testing (transisi invalid, permission deny).
5. Regression module tesis existing.

## 4. Estimasi Timeline
- Total estimasi: 6-8 minggu (dengan 2 engineer backend, 1 engineer frontend, 1 QA).

Contoh sprint:
1. Sprint 1: Fase 0-1
2. Sprint 2: Fase 2
3. Sprint 3: Fase 3
4. Sprint 4: Fase 4
5. Sprint 5: Fase 5-6

## 5. Definition of Done
- PRD dan desain teknis approved.
- Migration stabil di staging.
- Semua test case mode A/B/C pass.
- Monitoring + logging tersedia.
- SOP operasional untuk admin prodi tersedia.

## 6. Risiko dan Mitigasi Rollout
- Risiko:
  - Perubahan aturan akademik mendadak di tengah implementasi.
  - Data lama tidak bersih untuk migrasi.
  - Perbedaan interpretasi hasil ujian antar prodi.

Mitigasi:
  - Freeze requirement per sprint.
  - Siapkan script validasi data pra-migrasi.
  - Tambah konfigurasi kebijakan per prodi di level metadata.

## 7. Next Step Eksekusi
1. Kunci final status dictionary dan mode transition matrix.
2. Implement migration + entity (Fase 1).
3. Implement state machine backend + unit test (Fase 2).

# PRD Modul Tugas Akhir Multi-Mode

## 1. Ringkasan
Modul ini mengelola proses tugas akhir dari pengajuan proposal sampai sidang tesis dengan alur berbeda antar program studi.

Tujuan utama:
- Menstandardisasi proses akademik lintas prodi tanpa memaksa satu alur tunggal.
- Memberikan kontrol status, approval, dan audit trail yang konsisten.
- Mendukung 3 mode alur ujian:
  - Mode A: `Proposal -> Pembimbing -> Seminar Hasil -> Sidang Tesis`
  - Mode B: `Proposal -> Pembimbing -> Seminar Proposal -> Sidang Tesis`
  - Mode C: `Proposal -> Pembimbing -> Seminar Proposal -> Seminar Hasil -> Sidang Tesis`

## 2. Scope
In scope:
- Konfigurasi mode alur per prodi.
- Workflow state machine pengajuan tesis.
- Manajemen pembimbing, seminar proposal, seminar hasil, sidang tesis.
- Manajemen jadwal, penguji, hasil ujian, revisi.
- Notifikasi dan audit log.

Out of scope (fase awal):
- Integrasi plagiarisme eksternal.
- Integrasi tanda tangan digital tersertifikasi.
- Integrasi repository institusi eksternal.

## 3. Persona dan Hak Akses
- Mahasiswa:
  - Buat pengajuan, upload dokumen, lihat status, submit revisi.
- Dosen Pembimbing:
  - Review progres, isi catatan bimbingan, approve readiness tahap berikutnya.
- Penguji:
  - Isi hasil ujian dan catatan.
- Admin/Staff Prodi:
  - Verifikasi administrasi, set jadwal, tetapkan pembimbing/penguji.
- Kaprodi:
  - Approval kebijakan akademik (opsional, sesuai prodi).
- Superadmin/Admin:
  - Konfigurasi global dan monitoring.

## 4. Kebutuhan Fungsional
1. Sistem menyimpan mode alur per prodi (`A/B/C`).
2. Pengajuan tesis memiliki state machine valid berdasarkan mode prodi.
3. Sistem memblokir transisi status yang tidak valid.
4. Penentuan pembimbing wajib sebelum tahap ujian apa pun.
5. Seminar proposal hanya muncul jika mode `B` atau `C`.
6. Seminar hasil muncul jika mode `A` atau `C`.
7. Sidang tesis hanya bisa dijadwalkan jika tahap sebelumnya lulus.
8. Hasil ujian: `Lulus`, `Lulus dengan Revisi`, `Belum Lulus`.
9. Jika `Lulus dengan Revisi`, ada deadline revisi dan verifikasi final.
10. Semua aksi penting tercatat di audit log.

## 5. Kebutuhan Non-Fungsional
- Security:
  - ACL + prodi scoping.
  - Validasi server-side untuk semua transisi status.
- Reliability:
  - Transaksi DB untuk update status + log + notifikasi.
- Observability:
  - Event log per transisi.
- Performance:
  - List pengajuan dan dashboard harus mendukung pagination/filter.

## 6. Definisi Tahap
- `Pengajuan Proposal`: submit awal mahasiswa.
- `Penentuan Pembimbing`: assignment pembimbing utama/pendamping.
- `Seminar Proposal`: checkpoint awal untuk kelayakan metodologi.
- `Seminar Hasil`: checkpoint akhir untuk hasil penelitian.
- `Sidang Tesis`: ujian akhir.

Perbedaan inti:
- Seminar Proposal: fase awal.
- Seminar Hasil: fase akhir setelah bimbingan/penelitian.

## 7. Status Workflow yang Disarankan
- `DRAFT`
- `SUBMITTED`
- `ADMIN_REVIEW`
- `NEED_ADMIN_REVISION`
- `SUPERVISOR_ASSIGNED`
- `SUPERVISION_ACTIVE`
- `PROPOSAL_SEMINAR_SCHEDULED`
- `PROPOSAL_SEMINAR_PASSED`
- `PROPOSAL_SEMINAR_REVISION`
- `RESULT_SEMINAR_SCHEDULED`
- `RESULT_SEMINAR_PASSED`
- `RESULT_SEMINAR_REVISION`
- `THESIS_DEFENSE_SCHEDULED`
- `THESIS_DEFENSE_PASSED`
- `THESIS_DEFENSE_REVISION`
- `COMPLETED`
- `REJECTED`

## 8. Aturan Transisi per Mode
Mode A:
- `SUPERVISION_ACTIVE -> RESULT_SEMINAR_SCHEDULED -> THESIS_DEFENSE_SCHEDULED`

Mode B:
- `SUPERVISION_ACTIVE -> PROPOSAL_SEMINAR_SCHEDULED -> THESIS_DEFENSE_SCHEDULED`

Mode C:
- `SUPERVISION_ACTIVE -> PROPOSAL_SEMINAR_SCHEDULED -> RESULT_SEMINAR_SCHEDULED -> THESIS_DEFENSE_SCHEDULED`

## 9. KPI
- Lead time dari `SUBMITTED` ke `THESIS_DEFENSE_SCHEDULED`.
- Persentase kelulusan per tahap.
- Rata-rata jumlah iterasi revisi.
- SLA verifikasi admin.

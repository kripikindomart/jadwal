# Alur Proses Tugas Akhir (Multi-Mode per Program Studi)

## 1. Tujuan
Dokumen ini menjelaskan alur operasional tugas akhir mahasiswa pascasarjana dengan mode alur yang bisa berbeda antar program studi, mulai dari pengajuan proposal penelitian hingga sidang tesis.

## 2. Aktor Utama
- Mahasiswa
- Admin/Staff Prodi
- Dosen Pembimbing
- Dosen Penguji
- Kaprodi/Koordinator Akademik

## 3. Alur End-to-End

### Tahap A: Persiapan dan Pengajuan Proposal
1. Mahasiswa menyiapkan draft proposal penelitian (judul, latar belakang, rumusan masalah, metodologi awal).
2. Mahasiswa mengajukan proposal melalui modul `My Thesis` atau kanal administrasi prodi.
3. Sistem memberi nomor pengajuan dan status awal `Diajukan`.
4. Admin/Prodi melakukan verifikasi administratif:
   - Kelengkapan dokumen
   - Kesesuaian format
   - Status akademik mahasiswa
5. Jika tidak lengkap, status menjadi `Perlu Revisi Administratif` dan dikembalikan ke mahasiswa.
6. Jika lengkap, status menjadi `Siap Review Prodi`.

### Tahap B: Review Prodi dan Penetapan Pembimbing
1. Kaprodi/Prodi menilai kelayakan topik dan kecocokan bidang keilmuan.
2. Prodi menetapkan pembimbing utama (dan pembimbing pendamping jika diperlukan).
3. Sistem mengirim notifikasi ke mahasiswa dan dosen pembimbing.
4. Status pengajuan berubah menjadi `Bimbingan Aktif`.

### Tahap C: Bimbingan Proposal
1. Mahasiswa menjadwalkan bimbingan awal dengan pembimbing.
2. Setiap sesi bimbingan dicatat dalam log bimbingan:
   - Tanggal
   - Topik bahasan
   - Catatan perbaikan
   - Tindak lanjut
3. Mahasiswa mengunggah revisi proposal sesuai arahan.
4. Siklus bimbingan berulang sampai pembimbing menyatakan proposal layak seminar/proposal defense.
5. Status menjadi `Layak Ujian Proposal` (atau setara sesuai kebijakan prodi).

### Tahap D: Seminar/Ujian Proposal (jika diberlakukan)
1. Admin menjadwalkan seminar/ujian proposal:
   - Tanggal, jam, ruang/link
   - Penetapan penguji
2. Mahasiswa menerima jadwal resmi.
3. Pelaksanaan seminar/ujian proposal.
4. Hasil seminar:
   - `Lulus`
   - `Lulus dengan Revisi`
   - `Belum Lulus`
5. Jika revisi diminta, mahasiswa memperbaiki proposal dan validasi ulang oleh pembimbing/penguji.
6. Status lanjut ke `Penelitian Berjalan` jika dinyatakan lolos tahap proposal.

### Tahap E: Pelaksanaan Penelitian dan Bimbingan Tesis
1. Mahasiswa menjalankan penelitian (pengumpulan data, analisis, pembahasan).
2. Mahasiswa rutin melakukan bimbingan dan mengunggah progres bab.
3. Pembimbing memberi evaluasi berkala melalui log bimbingan.
4. Sistem/Prodi memonitor minimal frekuensi bimbingan (jika ada aturan).
5. Saat naskah tesis dianggap siap, pembimbing memberi persetujuan maju pra-sidang/sidang.
6. Status menjadi `Siap Daftar Sidang`.

### Tahap F: Seminar Hasil (jika diberlakukan)
1. Seminar hasil dilakukan setelah fase penelitian/bimbingan berjalan.
2. Mahasiswa mempresentasikan hasil penelitian akhir (temuan, analisis, kesimpulan).
3. Penguji/pembimbing memberi catatan final sebelum sidang tesis.
4. Hasil seminar:
   - `Lulus`
   - `Lulus dengan Revisi`
   - `Belum Lulus`
5. Jika lolos, status lanjut ke `Siap Daftar Sidang`.

### Tahap G: Pendaftaran Sidang Tesis
1. Mahasiswa mendaftar sidang tesis dengan melampirkan:
   - Naskah tesis final bimbingan
   - Dokumen administratif wajib
2. Admin memverifikasi dokumen pendaftaran sidang.
3. Jika belum lengkap, status `Perlu Perbaikan Berkas Sidang`.
4. Jika lengkap, prodi menetapkan:
   - Tim penguji
   - Jadwal sidang
   - Lokasi/tautan sidang
5. Status menjadi `Sidang Terjadwal`.

### Tahap H: Pelaksanaan Sidang Tesis
1. Sidang dilaksanakan sesuai jadwal.
2. Penguji memberikan penilaian dan catatan perbaikan.
3. Hasil sidang ditetapkan:
   - `Lulus`
   - `Lulus dengan Revisi`
   - `Belum Lulus`
4. Berita acara sidang dan nilai diinput oleh prodi.
5. Status diperbarui sesuai hasil sidang.

### Tahap I: Pasca-Sidang
1. Jika `Lulus dengan Revisi`, mahasiswa melakukan perbaikan naskah sesuai batas waktu.
2. Pembimbing/penguji memvalidasi revisi final.
3. Mahasiswa mengunggah naskah final untuk arsip/repository.
4. Prodi menutup proses dengan status `Selesai`.

## 4. Status Proses yang Disarankan
- `Diajukan`
- `Perlu Revisi Administratif`
- `Siap Review Prodi`
- `Bimbingan Aktif`
- `Layak Ujian Proposal`
- `Penelitian Berjalan`
- `Layak Seminar Hasil`
- `Siap Daftar Sidang`
- `Perlu Perbaikan Berkas Sidang`
- `Sidang Terjadwal`
- `Lulus`
- `Lulus dengan Revisi`
- `Belum Lulus`
- `Selesai`

## 5. Mode Alur per Program Studi
Setiap program studi memilih salah satu mode berikut.

### Mode A: Tanpa Seminar Proposal, langsung Seminar Hasil
`Pengajuan Proposal -> Penentuan Pembimbing -> Seminar Hasil -> Sidang Tesis`

Keterangan:
- Proposal tetap diajukan di awal untuk dasar penetapan pembimbing.
- Tidak ada ujian/seminar proposal formal.
- Evaluasi formal sebelum sidang hanya di seminar hasil.

### Mode B: Dengan Seminar Proposal, tanpa Seminar Hasil
`Pengajuan Proposal -> Penentuan Pembimbing -> Seminar Proposal -> Sidang Tesis`

Keterangan:
- Seminar proposal menjadi gerbang formal untuk lanjut penelitian.
- Setelah bimbingan selesai, mahasiswa dapat langsung ke sidang tesis.

### Mode C: Dengan Seminar Proposal dan Seminar Hasil
`Pengajuan Proposal -> Penentuan Pembimbing -> Seminar Proposal -> Seminar Hasil -> Sidang Tesis`

Keterangan:
- Ada dua checkpoint akademik formal:
  - Awal: seminar proposal
  - Akhir: seminar hasil
- Cocok untuk prodi yang butuh kontrol mutu di awal dan akhir penelitian.

## 6. Perbedaan Seminar Proposal vs Seminar Hasil
- Seminar/Ujian Proposal:
  - Dilakukan di awal.
  - Fokus pada rencana penelitian (latar belakang, rumusan masalah, metodologi).
- Seminar Hasil:
  - Dilakukan di akhir, setelah bimbingan/penelitian berjalan.
  - Fokus pada hasil penelitian (temuan, analisis, kesimpulan) sebelum sidang tesis.

## 7. SLA/Waktu Layanan (Opsional)
- Verifikasi administrasi awal: 2-5 hari kerja
- Penetapan pembimbing: 3-7 hari kerja
- Verifikasi pendaftaran sidang: 2-5 hari kerja
- Validasi revisi pasca sidang: 3-10 hari kerja

## 8. Catatan Implementasi Sistem
- Setiap perpindahan status harus tercatat pada audit log.
- Notifikasi otomatis perlu dikirim ke aktor terkait pada setiap perubahan status.
- Dokumen wajib harus tervalidasi sebelum status bisa maju ke tahap berikutnya.
- Hak akses data harus mengikuti role dan prodi scope.
- Setiap prodi harus memiliki konfigurasi `examFlowMode` (contoh: `A`, `B`, `C`) agar workflow engine tahu tahap mana yang aktif/nonaktif.

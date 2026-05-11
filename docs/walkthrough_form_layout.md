# Walkthrough: Mode Form Blok untuk Template Surat

Pekerjaan implementasi alternatif 1 (**Mode Form Blok**) telah selesai! Ini adalah solusi paling praktis dan anti-berantakan untuk membuat maupun mengedit cetakan surat resmi.

## Perubahan yang Dilakukan

1. **Mode Editor Utama: Form Blok**
   Di `TemplateEditorPage`, kami telah menambahkan *Mode Form Blok*. Mode ini menggantikan layar editor kosong dengan 5 blok formulir terstruktur yang langsung merakit komponen surat dengan format *print-ready*:
   *   **Informasi Surat (Metadata):** *Checkbox* sederhana untuk menampilkan/menyembunyikan Nomor Surat, Lampiran, dan Perihal, beserta isian teks untuk tujuan surat di sebelah kanan.
   *   **Paragraf Pembuka:** Kotak teks WYSIWYG mini untuk kalimat pengantar surat.
   *   **Tabel Identitas:** Formulir baris dinamis (Label & Isian) untuk mencetak identitas mahasiswa (Nama, NIM, dll). Sistem akan merendernya sebagai tabel rapi tanpa *border*.
   *   **Isi Utama:** Kotak teks WYSIWYG untuk rincian atau pasal-pasal inti.
   *   **Paragraf Penutup:** Kotak teks penutup beserta ucapan terima kasih.

2. **Kop Surat: Mode Blok**
   Seperti saran Anda yang brilian, pengaturan Kop Surat sekarang juga memiliki **Mode Blok**.
   *   Anda tidak perlu memusingkan penempatan logo dan tata letak tengah paragraf secara manual.
   *   Cukup isikan Baris 1, Baris Utama, Baris 3, Alamat/Kontak, dan unggah Logo institusi.
   *   Sistem akan merendernya otomatis dengan pemisah garis horizontal tebal (standar kop resmi) saat dicetak!

3. **Mesin Cetak (`LetterPrintPage`)**
   Jika sebuah template menggunakan opsi *Form*, halaman ini tidak sekadar mengekstrak satu HTML kotor, melainkan ia akan mem-parsing objek data JSON di baliknya, lalu merakit (menyusun ulang) kode HTML tabel & paragraf yang optimal untuk format A4.

## Cara Menggunakan (Manual Verification)

1. Buka browser dan kunjungi kembali editor template pada `http://localhost:5173/letters/templates`.
2. Klik edit pada salah satu jenis surat.
3. Pada **Kop Surat**, pilih opsi **Mode Blok**.
   *   Unggah logo Universitas/Fakultas (lewat Pustaka Media).
   *   Isikan nama Universitas dan alamatnya.
4. Pada **Mode Editor** (tengah layar), pilih opsi **Form Blok (Mudah)**.
   *   Centang Metadata (Nomor, dsb) dan atur Tujuan (Kepada Yth...).
   *   Atur paragraf Anda secara terpisah.
   *   Sesuaikan Tabel Identitas.
   *   *Tips:* Anda bisa langsung menekan tombol variabel (misal: "Nama") untuk menyalin `[nama]` ke *clipboard* dan menempelkannya (*paste*) pada form yang diinginkan.
5. Klik **Simpan Perubahan** dan lakukan tes cetak.

Format yang dihasilkan dijamin konsisten dan bebas dari masalah *layouting* berantakan khas editor WYSIWYG tradisional.

> [!TIP]
> Fitur ini bekerja secara bertahap (non-destruktif). Template yang sudah dirancang sebelumnya menggunakan "TinyMCE" atau "Raw HTML" tetap dapat berjalan normal sesuai konfigurasinya tanpa terganggu fitur baru ini.

render_diffs(file:///c:/laragon/www/jadwal/frontend/src/pages/letters/TemplateEditorPage.vue)
render_diffs(file:///c:/laragon/www/jadwal/frontend/src/pages/letters/LetterPrintPage.vue)

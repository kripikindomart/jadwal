# Walkthrough: Editor Mode Raw HTML untuk Template Surat

Pekerjaan menambahkan mode editor `Raw HTML` telah selesai. Fitur ini akan menyelesaikan masalah ketidaksesuaian format (font, margin) yang sering terjadi antara editor WYSIWYG dengan hasil cetak.

## Perubahan yang Dilakukan

1. **Tombol Mode Editor:**
   Sekarang terdapat opsi baru yaitu **Raw HTML** yang sejajar dengan `TinyMCE` dan `TipTap` pada header editor.

2. **Textarea Raw HTML:**
   Saat "Raw HTML" dipilih, editor visual akan berganti menjadi kolom input (textarea) *monospace*. Anda bebas menyalin dan menempel (*copy-paste*) kode template HTML murni beserta inline CSS-nya tanpa takut ada gaya (styling) tambahan yang tidak diinginkan.

3. **Tombol Preview:**
   Di sudut kanan atas area "Raw HTML", terdapat *toggle* **Code** dan **Preview**. Anda bisa menekan **Preview** untuk melihat secara persis bagaimana HTML tersebut di-render oleh web browser sebelum menyimpannya atau mencetaknya.

4. **Integrasi Toolbar & Variabel:**
   Fitur untuk menyisipkan variabel otomatis (seperti `[nama]`, `[nim]`) atau "Sisipkan Cepat" (seperti Layout Kop) tetap dapat digunakan pada mode Raw HTML. Sistem akan memasukkan tag tersebut secara otomatis pada posisi kursor terakhir Anda berada di dalam kolom input HTML.

## Cara Penggunaan (Manual Verification)

1. Buka browser dan arahkan ke alamat **`http://localhost:5173/letters/templates`** (pastikan server frontend sudah berjalan).
2. Edit salah satu template.
3. Ubah pilihan `Mode Editor` menjadi **Raw HTML**.
4. Tempel (*paste*) format HTML khusus surat Anda (bisa menggunakan tag tabel atau inline styles yang pasti tidak akan terpengaruh oleh WYSIWYG editor).
5. Gunakan tombol **Preview** di kanan atas kotak editor untuk memastikan tampilan sudah sesuai ekspektasi.
6. Klik **Simpan Perubahan** dan lakukan cetak. Hasil cetakan (Print Dialog) akan seragam dengan apa yang Anda rancang.

> [!TIP]
> Jika ada template tabel HTML khusus (misalnya dibuat dari Microsoft Word lalu diekspor menjadi HTML), Anda bisa langsung mem-paste kode tersebut ke dalam mode Raw HTML ini agar margin dan paddingnya tetap terpreservasi.

render_diffs(file:///c:/laragon/www/jadwal/frontend/src/pages/letters/TemplateEditorPage.vue)

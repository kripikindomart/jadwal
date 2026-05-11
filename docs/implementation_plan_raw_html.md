# Implementasi Mode Raw HTML pada Editor Template Surat

Masalah yang saat ini terjadi adalah perbedaan format (font size, margin, dll) antara tampilan WYSIWYG Editor (TinyMCE/Tiptap) dengan hasil cetak akhir. WYSIWYG sering menambahkan inline styles yang bisa merusak format ketika dicetak.

Untuk menyelesaikan masalah ini, kita akan menambahkan mode "Raw HTML/Code" agar pengguna (admin) bisa secara langsung mengedit dan memasukkan template HTML/CSS murni, sehingga format cetakan 100% konsisten sesuai kode HTML.

## User Review Required

> [!IMPORTANT]
> Mengedit dengan Raw HTML membutuhkan pengetahuan dasar mengenai HTML dan CSS. Namun cara ini menjamin bahwa dokumen yang dihasilkan saat di-print (CTRL+P) akan sama persis dengan kode yang dituliskan tanpa adanya *interference* atau tambahan styling liar dari Editor WYSIWYG.

## Proposed Changes

### `frontend/src/pages/letters/TemplateEditorPage.vue`

1.  **Tambahkan Mode Editor "Raw HTML":**
    *   Ubah bagian *toggle mode editor* (yang saat ini memiliki TinyMCE dan Tiptap) untuk menyertakan tombol baru: `Raw HTML`.
    *   Nilai property `templateData.editorType` akan di-set ke `'html'`.

2.  **Tambahkan Komponen Textarea untuk Raw HTML:**
    *   Saat mode `'html'` aktif, ganti instance WYSIWYG editor dengan sebuah elemen `<textarea>` besar ber-font *monospace* (seperti editor kode).
    *   Tautkan `v-model="templateData.htmlContent"` langsung ke `<textarea>` ini.

3.  **Tambahkan Tab/Mode "Preview" pada Mode Raw HTML:**
    *   Untuk memudahkan admin, di atas textarea Raw HTML akan ditambahkan *toggle* kecil: `[ Mode Kode ]` vs `[ Mode Preview ]`.
    *   Jika `Mode Preview` dipilih, sistem akan merender isi dari `templateData.htmlContent` ke dalam `div` biasa menggunakan `v-html`, sehingga admin bisa melihat tampilan akhirnya tanpa harus menyimpan dan mencetak terlebih dahulu.

4.  **Penyesuaian Action Button (Sisipkan Variabel):**
    *   Tombol "Sisipkan Variabel" (seperti `[nama]`, `[nim]`) akan disesuaikan agar bisa bekerja dan menyisipkan teks ke posisi *cursor* pada `<textarea>` Raw HTML.

## Verification Plan

### Manual Verification
1. Masuk ke halaman `/letters/templates`.
2. Edit salah satu template.
3. Ubah mode editor menjadi **Raw HTML**.
4. Masukkan kode HTML sederhana seperti `<h1>Teks Uji Coba [nama]</h1>`.
5. Beralih ke **Mode Preview** di dalam editor untuk memastikan HTML terender dengan benar.
6. Simpan perubahan.
7. Lakukan *preview print* (CTRL+P) atau tes print pada salah satu permintaan surat untuk memastikan format HTML utuh dan tidak terganggu.

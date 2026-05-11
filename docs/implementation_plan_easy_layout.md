# Rencana Perbaikan: Cara Mudah Mengatur Layout Template Surat

Jika raw HTML dirasa terlalu sulit, itu sangat wajar karena layout HTML memerlukan ketelitian tinggi. Masalah utama dari WYSIWYG (seperti TinyMCE/Tiptap) adalah mereka sering menyisipkan *styling* yang bagus di layar komputer, namun berantakan saat dicetak ke kertas A4.

Untuk membuat pembuatan template surat menjadi **mudah namun hasil cetaknya sempurna**, saya memiliki 2 alternatif solusi. Silakan pilih mana yang menurut Anda paling cocok:

## Alternatif 1: Editor Berbasis Blok/Form (Sangat Mudah, Anti-Berantakan)

Daripada Anda diberikan satu "kertas kosong" besar yang harus diatur manual tabel dan spasinya, kita memecah isi surat menjadi formulir/blok terstruktur.

**Konsep:**
- **Blok Header:** Anda cukup mengetik Nomor Surat, Lampiran, Perihal, dan Tujuan di kotak input biasa. Sistem otomatis merendernya menjadi layout yang rapi di pojok kiri & kanan.
- **Blok Tabel Identitas:** Cukup centang data apa saja yang ingin ditampilkan (Nama, NIM, Prodi, dll). Sistem akan membuatkan tabel rapi tanpa border secara otomatis.
- **Blok Paragraf (Pembuka & Penutup):** Menggunakan editor teks (WYSIWYG) biasa yang sangat simpel HANYA untuk mengetik teks paragraf (tebal, miring, list), tanpa perlu memusingkan layouting tabel.
- **Kelebihan:** Sangat mudah, pasti rapi saat dicetak, tidak butuh keahlian desain.
- **Kekurangan:** Struktur surat sedikit kaku (selalu urut: Metadata -> Pembuka -> Identitas -> Penutup).

## Alternatif 2: MS Word "A4 Print-Ready Mode" (Visual / WYSIWYG yang Diperbaiki)

Kita tetap menggunakan editor visual (seperti Microsoft Word), TAPI kita merombak konfigurasi editornya agar perilakunya sama persis dengan Microsoft Word.

**Konsep:**
- **Ukuran Fix A4:** Editor di layar akan dibuat kotak putih berukuran persis 21cm x 29.7cm.
- **Satuan Cetak (pt):** Font tidak lagi menggunakan pixel (px), melainkan point (pt) seperti 11pt atau 12pt yang merupakan standar surat resmi.
- **Elemen Terkunci (Non-editable structure):** Jika Anda menyisipkan "Layout Identitas", struktur tabelnya akan dikunci (tidak bisa tergeser/rusak secara tidak sengaja oleh tombol Enter/Spasi), Anda hanya bisa mengisi teks di dalamnya.
- **Kelebihan:** Mirip menggunakan MS Word, sangat fleksibel.
- **Kekurangan:** Tetap ada kemungkinan kecil format sedikit bergeser jika pengguna terlalu banyak mem-paste teks dari sumber luar (seperti website lain) beserta formatnya.

---

## User Review Required

> [!IMPORTANT]
> Mohon pilih pendekatan mana yang lebih Anda sukai:
> 
> **Balas "Pilih Alternatif 1"** jika Anda ingin form pengisian blok yang praktis dan pasti rapi.
> **Balas "Pilih Alternatif 2"** jika Anda ingin kebebasan mengetik gaya MS Word dengan ukuran kertas yang dikunci ke A4.
> 
> Atau beri tahu saya jika Anda memiliki bayangan/ide lain!

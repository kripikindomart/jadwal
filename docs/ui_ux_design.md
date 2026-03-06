# Spesifikasi UI/UX Sistem Akademik (Prodi CMS Style)

Dokumen ini menjelaskan standar desain antarmuka (UI) dan pengalaman pengguna (UX) untuk Sistem Informasi Akademik. Desain mengacu pada gaya **"Clean, Modern, & Informative"** dengan nuansa warna Hijau (Emerald/Teal) yang profesional.

## 1. Design System

### A. Color Palette (Nuansa Hijau Akademik)

- **Primary**: `Emerald-600` (#059669) - Tombol Utama, Header Aktif, Aksen Logo.
- **Secondary**: `Slate-600` (#475569) - Teks Sekunder, Icon Inaktif.
- **Background**: `Slate-50` (#F8FAFC) - Latar Belakang Aplikasi (Light Gray).
- **Surface**: `White` (#FFFFFF) - Kartu (Cards), Sidebar, Modal.
- **Success**: `Green-500` (#22C55E) - Indikator Hadir, Nilai A, Status Aktif.
- **Warning**: `Amber-500` (#F59E0B) - Indikator Pending, Izin.
- **Danger**: `Rose-500` (#F43F5E) - Tombol Hapus, Tidak Hadir, Error.

### B. Typography

- **Font Family**: **Plus Jakarta Sans** atau **Inter** (Modern Sans Serif, import via Google Fonts di `index.css`).
- **Headings**: Bold, Dark Slate (`Slate-800`).
- **Body**: Regular, Slate (`Slate-600`).
- **Micro-text**: Medium, Slate (`Slate-400`) untuk label tanggal/metadata.

### C. Layout Structure

1.  **Sidebar (Left)**:
    - Komponen: shadcn-vue `Sidebar` + `SidebarMenu` + `SidebarMenuItem`.
    - **Logo Area**: Logo Kampus + Nama Aplikasi "Prodi CMS".
    - **Menu Group**: Dashboard, Content, Akademik, User Management.
    - **User Profile**: `Avatar` kecil + Nama + Role di bagian bawah sidebar.
2.  **Top Bar (Header)**:
    - **Left**: `Breadcrumb` (Home > Jadwal > Detail).
    - **Center**: Global Search (`Command` / Ctrl+K dialog).
    - **Right**: Notifikasi (Bell Icon) dengan `Badge` Merah.
3.  **Content Area**:
    - Padding konsisten (`p-6`).
    - `Card`-based layout dengan rounded corners.
    - Soft Shadows.

---

## 2. Komponen shadcn-vue (Component Mapping)

| UI Element          | shadcn-vue Component                    | Catatan                                         |
| ------------------- | --------------------------------------- | ----------------------------------------------- |
| Data Tables         | `DataTable` + `Table`                   | Dengan sorting, filtering, pagination           |
| Status Badges       | `Badge`                                 | Variant: default, success, warning, destructive |
| Buttons             | `Button`                                | Variant: default, outline, ghost, destructive   |
| Form Inputs         | `Input`, `Select`, `Checkbox`, `Switch` | Dengan `FormField` + `FormLabel` wrapper        |
| Cards               | `Card` + `CardHeader` + `CardContent`   | Untuk dashboard stats & info panels             |
| Modals              | `Dialog` + `DialogContent`              | Fade in + Scale up                              |
| Toast Notifications | `Sonner` (toast)                        | Pojok kanan atas, slide-in animation            |
| Tabs                | `Tabs` + `TabsList` + `TabsContent`     | Untuk navigation dalam detail pages             |
| Sidebar             | `Sidebar` + `SidebarMenu`               | Collapsible, dengan user profile                |
| Dropdown Menus      | `DropdownMenu`                          | Untuk action menus (Edit, Delete, Detail)       |
| Pagination          | `Pagination`                            | Di pojok kanan bawah tabel                      |
| Calendar            | `Calendar`                              | Untuk date picker & calendar view               |
| Charts              | `Chart`                                 | Line/Bar chart untuk statistik                  |
| Skeleton Loading    | `Skeleton`                              | Placeholder loading states                      |
| Search              | `Command`                               | Global search (Ctrl+K)                          |
| Breadcrumb          | `Breadcrumb`                            | Navigation path di top bar                      |
| Avatar              | `Avatar`                                | Untuk user profile & dosen list                 |
| Alert Dialog        | `AlertDialog`                           | Konfirmasi delete / destructive actions         |
| Tooltip             | `Tooltip`                               | Hover info pada icon & actions                  |
| Sheet               | `Sheet`                                 | Mobile sidebar (slide-over)                     |

---

## 3. Spesifikasi Tampilan Per Modul

### A. Dashboard Utama (Home)

**Tujuan**: Memberikan _overview_ cepat status akademik hari ini.

- **Hero Section**:
  - Text: "Halo, Selamat Datang [Nama User]!"
  - Subtext: "Semester Ganjil 2025/2026 - Minggu ke-8".
- **Stats Cards (4 Grid)**:
  - Menggunakan `Card` + `CardHeader` + `CardContent`.
  1.  **Total Mahasiswa**: Angka Besar + `Badge` "+12% dari semester lalu" (Hijau).
  2.  **Dosen Aktif**: Icon Gedung + Angka.
  3.  **Kelas Hari Ini**: Angka + Link "Lihat Jadwal".
  4.  **Pengumuman Baru**: Angka `Badge` Merah.
- **Chart Area**:
  - **"Statistik Kehadiran"**: Line Chart (Minggu 1-16) via `Chart` component.
  - **"Aktivitas Terakhir"**: List vertical timeline.

### B. Modul Penjadwalan (Schedule View)

**Tujuan**: Menampilkan jadwal dengan konteks waktu dan status yang jelas.

- **Header**: Filter (`Select` components untuk Prodi, Semester, Hari) + `Button` "Plotting Jadwal Baru".
- **Views**: `Tabs` (List View | Calendar View).
- **Card Jadwal (List View Item)**:
  - `Table` row dengan columns:
  - **Column 1 (Waktu)**: `Badge` Jam "08:00 - 10:00" (Warna beda jika sedang berlangsung).
  - **Column 2 (Mata Kuliah)**: Nama MK (Bold) + Kode MK (Small Gray) + SKS.
  - **Column 3 (Dosen)**: `Avatar` Dosen + Nama Dosen + (Tim Teaching jika ada).
  - **Column 4 (Lokasi)**: Icon Pin + Nama Ruangan (e.g., "R. 304 (Lt 3)").
  - **Column 5 (Status)**:
    - 🟢 **Sedang Berlangsung** (Pulse Animation).
    - ⚪ **Belum Mulai**.
    - ✅ **Selesai**.
- **Action**: `Button` "Reschedule" (Icon Calendar-Edit) di ujung kanan.

### C. Portal Dosen (Teaching Dashboard)

**Tujuan**: Fokus pada aksi harian dosen (Absen & Jurnal).

- **Teaching Cards**:
  - `Card` grid untuk setiap kelas yang diampu.
  - Visual: Progress Bar "Pertemuan 8/16".
  - **Tombol Aksi Utama**: `Button` "Isi Jurnal" & "Absensi Mahasiswa".
- **Detail Kelas UI**:
  - **Header Kelas**: Nama MK besar, Jadwal, Ruangan.
  - **`Tabs` Navigation**: Overview | Jurnal | Absensi | Nilai | Tugas.
  - **Tab Jurnal**: Timeline Vertical dari Pertemuan 1 s.d 16.
    - _State Kosong_: `Button` "Isi Jurnal" berwarna Primary.
    - _State Terisi_: Ringkasan topik, `Button` "Edit".

### D. Modul Login & Landing

- **Split Screen Layout**:
  - **Kiri (Form)**: Logo, "Selamat Datang", `Input` Email/NIM, `Input` Password, `Button` "Masuk" (Full Width Green).
  - **Kanan (Visual)**: Background Hijau Tua + Ilustrasi Kampus/Grafis Abstrak + Quote/Informasi singkat.

### E. Modul Tabel (Data Tables)

- **Fitur Standar** (menggunakan shadcn-vue `DataTable`):
  - **`Checkbox`**: Di setiap baris (untuk Bulk Action).
  - **`Avatar`**: Untuk tabel User/Mahasiswa.
  - **Status `Badge`**: Pill shape (e.g., success variant untuk "Aktif").
  - **Actions `DropdownMenu`**: Titik tiga (Kebab Menu) -> Edit, Delete, Detail.
  - **`Pagination`**: Di pojok kanan bawah.

---

## 4. Micro-Interactions (UX Polish)

- **Hover Effects**: Kartu sedikit naik (`-translate-y-1`) dan bayangan menebal saat di-hover (via Tailwind `hover:` utilities).
- **Loading States**: `Skeleton` loading (kotak abu-abu berkedip) saat data sedang diambil, bukan spinner intrusif.
- **Toast Notifications**: `Sonner` toast muncul di pojok kanan atas (Sukses/Gagal) dengan animasi slide-in.
- **Modal Transitions**: `Dialog` dengan fade in + scale up lembut (built-in transitions).
- **Page Transitions**: Vue Router transition wrapper untuk smooth page navigation.

## 5. Mobile Responsiveness (Gadget View)

- **Sidebar**: Berubah menjadi `Sheet` (Slide Over) dengan hamburger trigger.
- **Tables**: `DataTable` berubah menjadi **Card List** (Stack) agar mudah scroll ke bawah.
- **Touch Targets**: `Button` dan `Input` minimal tinggi 44px untuk jari.

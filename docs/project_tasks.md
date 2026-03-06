# Daftar Tugas Pengembangan (Task List)

## Phase 1: Foundation & Architecture

- [ ] **Setup NestJS**: `npx @nestjs/cli new backend`, setup `.env`, ConfigModule.
- [ ] **Database Setup**: TypeORM config (PostgreSQL), entities & migrations for Users, Roles, Permissions, Profiles.
- [ ] **Auth Module**: JWT strategy (`@nestjs/jwt` + `@nestjs/passport`), login/register endpoints, refresh token.
- [ ] **RBAC Module**: Custom `@Roles()` decorator, `RolesGuard`, seed Admin/Staff/Dosen roles.
- [ ] **Data Seeding**: Buat User Admin, Staff, Dosen Dummy via TypeORM seeds.
- [ ] **Setup Vue 3 SPA**: `npm create vite@latest frontend -- --template vue-ts`, install TailwindCSS v4 + shadcn-vue.
- [ ] **API Layer**: Axios instance dengan JWT interceptor, Pinia auth store.
- [ ] **Base Layout**: AdminLayout (Sidebar + TopBar) menggunakan shadcn-vue `Sidebar`, `Button`, `Avatar`.
- [ ] **Settings Module**: Create entity `AppSetting` & CRUD API + UI Config.

## Phase 2: Master Data Management

- [ ] **CRUD Akademik**: Tahun Akademik, Semester, Prodi, Matakuliah (NestJS Controller + Service + TypeORM Repository).
- [ ] **CRUD Ruangan & Kelas**: Termasuk logic `class_students` (Enrollment).
- [ ] **Implementasi Soft Deletes & Bulk Action**: `@DeleteDateColumn()` + bulk endpoints (PATCH `/api/xxx/bulk`).
- [ ] **Data Tables UI**: shadcn-vue `DataTable` + `Table` components dengan pagination, search, filter.

## Phase 3: Scheduling System

- [ ] **Plotting UI**: Form input jadwal dengan validasi bentrok (SchedulingService).
- [ ] **Meeting Generator**: Logic generate 16 pertemuan otomatis.
- [ ] **Reschedule Logic**: Form request & approval workflow.
- [ ] **Public Display**: Halaman TV `/display/tv` (Vue public route, no auth).

## Phase 4: Operational (Attendance & Portal)

- [ ] **Staff Dashboard**: UI Monitoring & Tombol Clock-In/Out Dosen.
- [ ] **Lecturer Portal**:
  - [ ] Halaman Dashboard & Jurnal.
  - [ ] Form Penilaian & Skala Nilai.
  - [ ] Fitur Penugasan (Auto-grouping).
- [ ] **Student Attendance**: Logic Check-in Login & Non-Login.

## Phase 5: Reporting & AI

- [ ] **BKD Reports**: Generate PDF (SK, Jurnal, Nilai) via `pdfkit` atau `puppeteer`.
- [ ] **AI Integration**: Service untuk koneksi ke LLM (Scheduling/Survei) via `@nestjs/axios`.
- [ ] **Final Testing**: Uji coba permission scope & flow data (e2e tests).

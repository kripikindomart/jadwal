import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../entities/user.entity';
import { Role } from '../entities/role.entity';
import { Permission } from '../entities/permission.entity';
import { Timeslot } from '../entities/timeslot.entity';
import { GradeComponent } from '../entities/grade-component.entity';

export async function seedDatabase(dataSource: DataSource) {
  const roleRepository = dataSource.getRepository(Role);
  const userRepository = dataSource.getRepository(User);
  const permRepository = dataSource.getRepository(Permission);

  // ── Seed Permissions ──────────────────────────────────────
  const permsData = [
    // Users & ACL
    { name: 'Lihat User', slug: 'users.view', group: 'Users' },
    { name: 'Buat User', slug: 'users.create', group: 'Users' },
    { name: 'Edit User', slug: 'users.update', group: 'Users' },
    { name: 'Hapus User', slug: 'users.delete', group: 'Users' },
    { name: 'Lihat Role', slug: 'roles.view', group: 'ACL' },
    { name: 'Kelola Role', slug: 'roles.manage', group: 'ACL' },
    { name: 'Lihat Permission', slug: 'permissions.view', group: 'ACL' },
    { name: 'Kelola Permission', slug: 'permissions.manage', group: 'ACL' },

    // Periode Akademik (Semester)
    {
      name: 'Lihat Periode Akademik',
      slug: 'semesters.view',
      group: 'Akademik',
    },
    {
      name: 'Buat Periode Akademik',
      slug: 'semesters.create',
      group: 'Akademik',
    },
    {
      name: 'Edit Periode Akademik',
      slug: 'semesters.update',
      group: 'Akademik',
    },
    {
      name: 'Hapus Periode Akademik',
      slug: 'semesters.delete',
      group: 'Akademik',
    },

    // Program Studi
    { name: 'Lihat Prodi', slug: 'prodis.view', group: 'Akademik' },
    { name: 'Buat Prodi', slug: 'prodis.create', group: 'Akademik' },
    { name: 'Edit Prodi', slug: 'prodis.update', group: 'Akademik' },
    { name: 'Hapus Prodi', slug: 'prodis.delete', group: 'Akademik' },

    // Mata Kuliah
    { name: 'Lihat Matakuliah', slug: 'courses.view', group: 'Akademik' },
    { name: 'Buat Matakuliah', slug: 'courses.create', group: 'Akademik' },
    { name: 'Edit Matakuliah', slug: 'courses.update', group: 'Akademik' },
    { name: 'Hapus Matakuliah', slug: 'courses.delete', group: 'Akademik' },
    { name: 'Import Matakuliah', slug: 'courses.import', group: 'Akademik' },

    // Ruangan
    { name: 'Lihat Ruangan', slug: 'rooms.view', group: 'Akademik' },
    { name: 'Buat Ruangan', slug: 'rooms.create', group: 'Akademik' },
    { name: 'Edit Ruangan', slug: 'rooms.update', group: 'Akademik' },
    { name: 'Hapus Ruangan', slug: 'rooms.delete', group: 'Akademik' },

    // Slot Waktu
    { name: 'Lihat Slot Waktu', slug: 'timeslots.view', group: 'Akademik' },
    { name: 'Buat Slot Waktu', slug: 'timeslots.create', group: 'Akademik' },
    { name: 'Edit Slot Waktu', slug: 'timeslots.update', group: 'Akademik' },
    { name: 'Hapus Slot Waktu', slug: 'timeslots.delete', group: 'Akademik' },

    // Komponen Nilai
    {
      name: 'Lihat Komponen Nilai',
      slug: 'grade_components.view',
      group: 'Akademik',
    },
    {
      name: 'Buat Komponen Nilai',
      slug: 'grade_components.create',
      group: 'Akademik',
    },
    {
      name: 'Edit Komponen Nilai',
      slug: 'grade_components.update',
      group: 'Akademik',
    },
    {
      name: 'Hapus Komponen Nilai',
      slug: 'grade_components.delete',
      group: 'Akademik',
    },

    // Kelas
    { name: 'Lihat Kelas', slug: 'classes.view', group: 'Akademik' },
    { name: 'Buat Kelas', slug: 'classes.create', group: 'Akademik' },
    { name: 'Edit Kelas', slug: 'classes.update', group: 'Akademik' },
    { name: 'Hapus Kelas', slug: 'classes.delete', group: 'Akademik' },

    // Jadwal Perkuliahan
    { name: 'Lihat Jadwal', slug: 'schedules.view', group: 'Akademik' },
    { name: 'Generate Jadwal', slug: 'schedules.generate', group: 'Akademik' },
    { name: 'Edit Jadwal', slug: 'schedules.update', group: 'Akademik' },

    // Dosen
    { name: 'Lihat Dosen', slug: 'lecturers.view', group: 'Dosen' },
    { name: 'Buat Dosen', slug: 'lecturers.create', group: 'Dosen' },
    { name: 'Edit Dosen', slug: 'lecturers.update', group: 'Dosen' },
    { name: 'Hapus Dosen', slug: 'lecturers.delete', group: 'Dosen' },
    { name: 'Import Dosen', slug: 'lecturers.import', group: 'Dosen' },

    // Mahasiswa
    { name: 'Lihat Mahasiswa', slug: 'students.view', group: 'Mahasiswa' },
    { name: 'Buat Mahasiswa', slug: 'students.create', group: 'Mahasiswa' },
    { name: 'Edit Mahasiswa', slug: 'students.update', group: 'Mahasiswa' },
    { name: 'Hapus Mahasiswa', slug: 'students.delete', group: 'Mahasiswa' },
    { name: 'Import Mahasiswa', slug: 'students.import', group: 'Mahasiswa' },

    // Penjadwalan
    { name: 'Lihat Jadwal', slug: 'schedule.view', group: 'Penjadwalan' },
    { name: 'Kelola Jadwal', slug: 'schedule.manage', group: 'Penjadwalan' },

    // Kelas
    { name: 'Lihat Kelas', slug: 'class.view', group: 'Kelas' },
    { name: 'Kelola Kelas', slug: 'class.manage', group: 'Kelas' },
    { name: 'Isi Jurnal', slug: 'journal.fill', group: 'Kelas' },
    { name: 'Input Nilai', slug: 'grade.input', group: 'Kelas' },

    // Absensi
    { name: 'Absensi Staff', slug: 'attendance.staff', group: 'Absensi' },
    { name: 'Absensi Dosen', slug: 'attendance.lecturer', group: 'Absensi' },

    // Laporan
    { name: 'Lihat Laporan', slug: 'report.view', group: 'Laporan' },
    { name: 'Export Laporan', slug: 'report.export', group: 'Laporan' },

    // Pengaturan
    { name: 'Kelola Pengaturan', slug: 'settings.manage', group: 'Pengaturan' },
  ];

  let created = 0;
  for (const permData of permsData) {
    const existing = await permRepository.findOne({
      where: { slug: permData.slug },
    });
    if (!existing) {
      await permRepository.save(permRepository.create(permData));
      created++;
    }
  }
  console.log(
    `  ✅ Permissions: ${created} baru, ${permsData.length - created} sudah ada`,
  );

  // ── Seed Roles ──────────────────────────────────────
  const rolesData = [
    { name: 'Super Admin', slug: 'superadmin' },
    { name: 'Admin', slug: 'admin' },
    { name: 'Staff', slug: 'staff' },
    { name: 'Dosen', slug: 'dosen' },
    { name: 'Mahasiswa', slug: 'mahasiswa' },
  ];

  const roles: Role[] = [];
  for (const roleData of rolesData) {
    let role = await roleRepository.findOne({ where: { slug: roleData.slug } });
    if (!role) {
      role = roleRepository.create(roleData);
      await roleRepository.save(role);
      console.log(`  ✅ Role "${roleData.name}" dibuat`);
    }
    roles.push(role);
  }

  // ── Assign permissions to roles ──────────────────────────
  const allPerms = await permRepository.find();
  const permBySlug = (slug: string) => allPerms.find((p) => p.slug === slug);

  // Super Admin = ALL permissions
  const superadmin = roles[0];
  superadmin.permissions = allPerms;
  await roleRepository.save(superadmin);
  console.log(`  ✅ Super Admin: ${allPerms.length} permission`);

  // Admin = same as superadmin except ACL management
  const admin = roles[1];
  admin.permissions = allPerms.filter(
    (p) =>
      !['roles.manage', 'permissions.manage', 'settings.manage'].includes(
        p.slug,
      ),
  );
  await roleRepository.save(admin);
  console.log(`  ✅ Admin: ${admin.permissions.length} permission`);

  // Staff = view academic + manage dosen/mahasiswa
  const staff = roles[2];
  staff.permissions = allPerms.filter((p) =>
    [
      'semesters.view',
      'prodis.view',
      'courses.view',
      'rooms.view',
      'timeslots.view',
      'timeslots.create',
      'timeslots.update',
      'timeslots.delete',
      'grade_components.view',
      'grade_components.create',
      'grade_components.update',
      'grade_components.delete',
      'classes.view',
      'classes.create',
      'classes.update',
      'classes.delete',
      'schedules.view',
      'schedules.generate',
      'schedules.update',
      'lecturers.view',
      'lecturers.create',
      'lecturers.update',
      'lecturers.import',
      'students.view',
      'students.create',
      'students.update',
      'students.import',
      'schedule.view',
      'class.view',
      'report.view',
    ].includes(p.slug),
  );
  await roleRepository.save(staff);
  console.log(`  ✅ Staff: ${staff.permissions.length} permission`);

  // Dosen = view schedule, class, jurnal, nilai
  const dosen = roles[3];
  dosen.permissions = allPerms.filter((p) =>
    [
      'semesters.view',
      'prodis.view',
      'courses.view',
      'rooms.view',
      'schedule.view',
      'class.view',
      'journal.fill',
      'grade.input',
      'attendance.lecturer',
      'students.view',
    ].includes(p.slug),
  );
  await roleRepository.save(dosen);
  console.log(`  ✅ Dosen: ${dosen.permissions.length} permission`);

  // Mahasiswa = view only
  const mahasiswa = roles[4];
  mahasiswa.permissions = allPerms.filter((p) =>
    ['semesters.view', 'schedule.view', 'class.view'].includes(p.slug),
  );
  await roleRepository.save(mahasiswa);
  console.log(`  ✅ Mahasiswa: ${mahasiswa.permissions.length} permission`);

  // ── Seed Admin User ──────────────────────────────────
  const adminEmail = 'admin@pasca.ac.id';
  let adminUser = await userRepository.findOne({
    where: { email: adminEmail },
  });

  if (!adminUser) {
    const hashedPassword = await bcrypt.hash('password', 10);
    adminUser = userRepository.create({
      name: 'Administrator',
      email: adminEmail,
      password: hashedPassword,
      roles: [roles[0]], // superadmin
    });
    await userRepository.save(adminUser);
    console.log(`  ✅ Admin user dibuat (${adminEmail} / password)`);
  } else {
    console.log(`  ⏭️  Admin user sudah ada`);
  }

  // ── Seed Timeslots ──────────────────────────────────
  const timeslotRepository = dataSource.getRepository(Timeslot);
  const timeslotsData = [];
  for (let day = 1; day <= 5; day++) {
    timeslotsData.push({
      dayOfWeek: day,
      startTime: '07:00:00',
      endTime: '08:40:00',
      isUsable: true,
    });
    timeslotsData.push({
      dayOfWeek: day,
      startTime: '08:40:00',
      endTime: '10:20:00',
      isUsable: true,
    });
    timeslotsData.push({
      dayOfWeek: day,
      startTime: '10:20:00',
      endTime: '12:00:00',
      isUsable: true,
    });
    timeslotsData.push({
      dayOfWeek: day,
      startTime: '13:00:00',
      endTime: '14:40:00',
      isUsable: true,
    });
    timeslotsData.push({
      dayOfWeek: day,
      startTime: '14:40:00',
      endTime: '16:20:00',
      isUsable: true,
    });
  }

  let createdTimeslots = 0;
  for (const slot of timeslotsData) {
    const existing = await timeslotRepository.findOne({
      where: {
        dayOfWeek: slot.dayOfWeek,
        startTime: slot.startTime,
        endTime: slot.endTime,
      },
    });
    if (!existing) {
      await timeslotRepository.save(timeslotRepository.create(slot));
      createdTimeslots++;
    }
  }
  console.log(`  ✅ Timeslots: ${createdTimeslots} baru`);

  // ── Seed Grade Components ───────────────────────────
  const gradeComponentRepository = dataSource.getRepository(GradeComponent);
  const gradeComponentsData = [
    { name: 'Presensi', weight: 10, isActive: true },
    { name: 'Tugas', weight: 20, isActive: true },
    { name: 'UTS', weight: 30, isActive: true },
    { name: 'UAS', weight: 40, isActive: true },
  ];

  let createdGrades = 0;
  for (const comp of gradeComponentsData) {
    const existing = await gradeComponentRepository.findOne({
      where: { name: comp.name },
    });
    if (!existing) {
      await gradeComponentRepository.save(
        gradeComponentRepository.create(comp),
      );
      createdGrades++;
    }
  }
  console.log(`  ✅ Komponen Nilai: ${createdGrades} baru`);

  console.log('\n🌱 Seed selesai!\n');
}

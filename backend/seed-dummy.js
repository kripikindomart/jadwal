const { Client } = require('pg');
const bcrypt = require('bcrypt');
require('dotenv').config();

async function seedDummy() {
  const client = new Client({
    user: process.env.DB_USERNAME || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_DATABASE || 'pasca_jadwal',
    password: process.env.DB_PASSWORD || 'postgres',
    port: parseInt(process.env.DB_PORT || '5432', 10),
  });

  try {
    await client.connect();
    console.log('Connected to DB for dummy seeding...');
    
    await client.query(`
      TRUNCATE TABLE semesters, prodis, courses, rooms, classes, class_courses, class_lecturers, class_students CASCADE;
    `);

    // 1. Semester (Periode)
    const semesterRes = await client.query(`
      INSERT INTO semesters (code, name, type, "startDate", "endDate", "isActive") 
      VALUES ('20251', 'Gasal 2025/2026', 'gasal', '2025-08-01', '2026-01-31', true) 
      RETURNING id;
    `);
    const semesterId = semesterRes.rows[0].id;

    // 2. Program Studi
    const prodiRes = await client.query(`
      INSERT INTO prodis (code, name, "degree") 
      VALUES ('TI', 'Magister Teknik Informatika', 'S2') 
      RETURNING id;
    `);
    const prodiId = prodiRes.rows[0].id;

    // 3. Rooms
    await client.query(`
      INSERT INTO rooms (name, capacity, location) VALUES 
      ('Lab Komputer H.1.1', 40, 'Lantai 1'),
      ('Ruang Teori H.1.2', 50, 'Lantai 1');
    `);

    // 4. Master Courses
    const courseRes1 = await client.query(`
      INSERT INTO courses (code, name, sks, "prodiId") 
      VALUES ('MTS101', 'Arsitektur Perangkat Lunak Lanjut', 3, $1) RETURNING id;
    `, [prodiId]);
    const courseId1 = courseRes1.rows[0].id;

    const courseRes2 = await client.query(`
      INSERT INTO courses (code, name, sks, "prodiId") 
      VALUES ('MTS102', 'Kecerdasan Buatan Terapan', 3, $1) RETURNING id;
    `, [prodiId]);
    const courseId2 = courseRes2.rows[0].id;

    // 5. Users (Dosen & Mahasiswa)
    const pw = await bcrypt.hash('password', 10);
    
    // Clean up dummy users first
    await client.query(`DELETE FROM users WHERE email IN ('budi@dosen.com', 'siti@dosen.com', 'andi@mhs.com');`);
    
    // Fetch roles
    const dosenRoleRes = await client.query(`SELECT id FROM roles WHERE slug = 'dosen' LIMIT 1`);
    const mahasiswaRoleRes = await client.query(`SELECT id FROM roles WHERE slug = 'mahasiswa' LIMIT 1`);
    const dosenRoleId = dosenRoleRes.rows[0].id;
    const mahasiswaRoleId = mahasiswaRoleRes.rows[0].id;

    // Insert Dosen
    const dosenRes1 = await client.query(`
      INSERT INTO users (name, email, password) VALUES ('Dr. Budi Dosen', 'budi@dosen.com', $1) RETURNING id;
    `, [pw]);
    const dosenId1 = dosenRes1.rows[0].id;
    await client.query(`INSERT INTO "user_roles" ("userId", "roleId") VALUES ($1, $2)`, [dosenId1, dosenRoleId]);

    const dosenRes2 = await client.query(`
      INSERT INTO users (name, email, password) VALUES ('Prof. Siti Dosen', 'siti@dosen.com', $1) RETURNING id;
    `, [pw]);
    const dosenId2 = dosenRes2.rows[0].id;
    await client.query(`INSERT INTO "user_roles" ("userId", "roleId") VALUES ($1, $2)`, [dosenId2, dosenRoleId]);

    // Insert Mahasiswa
    const mhsRes1 = await client.query(`
      INSERT INTO users (name, email, password) VALUES ('Andi Mahasiswa', 'andi@mhs.com', $1) RETURNING id;
    `, [pw]);
    const mhsId1 = mhsRes1.rows[0].id;
    await client.query(`INSERT INTO "user_roles" ("userId", "roleId") VALUES ($1, $2)`, [mhsId1, mahasiswaRoleId]);
    
    // 6. Rombel
    const classRes = await client.query(`
      INSERT INTO classes (name, quota, "semesterId") VALUES ('Rombel A - S2 TI', 40, $1) RETURNING id;
    `, [semesterId]);
    const classId = classRes.rows[0].id;

    // Enroll Mahasiswa
    await client.query(`
      INSERT INTO class_students ("classId", "studentId", "semesterId") VALUES ($1, $2, $3);
    `, [classId, mhsId1, semesterId]);

    // Maps Courses to Rombel
    const ccRes = await client.query(`
      INSERT INTO class_courses ("classId", "courseId", "isOnline", "totalMeetings") 
      VALUES ($1, $2, false, 16) RETURNING id;
    `, [classId, courseId1]);
    const ccId1 = ccRes.rows[0].id;

    await client.query(`
      INSERT INTO class_courses ("classId", "courseId", "isOnline", "totalMeetings") 
      VALUES ($1, $2, true, 16) RETURNING id;
    `, [classId, courseId2]);
    const ccId2 = ccRes.rows[0].id;

    // Assign Lecturers to ClassCourses
    await client.query(`
      INSERT INTO class_lecturers ("classCourseId", "lecturerId", "isPrimary") VALUES ($1, $2, true);
    `, [ccId1, dosenId1]);

    await client.query(`
      INSERT INTO class_lecturers ("classCourseId", "lecturerId", "isPrimary") VALUES ($1, $2, true);
    `, [ccId2, dosenId2]);

    console.log('✅ Dummy data seeded successfully!');

  } catch (err) {
    console.error('❌ Error dummy seeding:', err);
  } finally {
    await client.end();
  }
}

seedDummy();

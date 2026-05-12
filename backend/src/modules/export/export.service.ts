import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as XLSX from 'xlsx';
import {
  ClassSchedule,
  ClassCourse,
  ClassCourseStudent,
  ClassMeeting,
  StudentAttendance,
  StudentGrade,
  GradeComponent,
  Semester,
  LecturerAttendanceLog,
} from '../../database/entities';

@Injectable()
export class ExportService {
  constructor(
    @InjectRepository(ClassSchedule)
    private readonly scheduleRepo: Repository<ClassSchedule>,
    @InjectRepository(ClassCourse)
    private readonly classCourseRepo: Repository<ClassCourse>,
    @InjectRepository(ClassCourseStudent)
    private readonly studentRepo: Repository<ClassCourseStudent>,
    @InjectRepository(ClassMeeting)
    private readonly meetingRepo: Repository<ClassMeeting>,
    @InjectRepository(StudentAttendance)
    private readonly attendanceRepo: Repository<StudentAttendance>,
    @InjectRepository(StudentGrade)
    private readonly gradeRepo: Repository<StudentGrade>,
    @InjectRepository(GradeComponent)
    private readonly componentRepo: Repository<GradeComponent>,
    @InjectRepository(Semester)
    private readonly semesterRepo: Repository<Semester>,
    @InjectRepository(LecturerAttendanceLog)
    private readonly lecturerLogRepo: Repository<LecturerAttendanceLog>,
  ) {}

  async exportSchedule(semesterId: number): Promise<Buffer> {
    const schedules = await this.scheduleRepo.find({
      where: { classCourse: { class: { semesterId } } },
      relations: ['classCourse', 'classCourse.class', 'classCourse.course', 'room', 'classCourse.classLecturers', 'classCourse.classLecturers.lecturer'],
      order: { dayOfWeek: 'ASC', startTime: 'ASC' },
    });

    const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

    const rows = schedules.map((s) => ({
      Hari: dayNames[s.dayOfWeek] || s.dayOfWeek,
      'Jam Mulai': s.startTime,
      'Jam Selesai': s.endTime,
      'Mata Kuliah': s.classCourse?.course?.name || '-',
      Kode: s.classCourse?.course?.code || '-',
      Kelas: s.classCourse?.class?.name || '-',
      Ruangan: s.room?.name || 'Online',
      Dosen: s.classCourse?.classLecturers?.map((cl: any) => cl.lecturer?.name).join(', ') || '-',
    }));

    return this.generateExcel(rows, 'Jadwal');
  }

  async exportStudentList(classCourseId: number): Promise<Buffer> {
    const students = await this.studentRepo.find({
      where: { classCourseId },
      relations: ['student', 'student.studentProfile'],
      order: { student: { name: 'ASC' } },
    });

    const rows = students.map((s, idx) => ({
      No: idx + 1,
      Nama: s.student?.name || '-',
      NIM: s.student?.studentProfile?.nim || '-',
      Email: s.student?.email || '-',
    }));

    return this.generateExcel(rows, 'Mahasiswa');
  }

  async exportGrades(classCourseId: number): Promise<Buffer> {
    const components = await this.componentRepo.find({ where: { isActive: true }, order: { id: 'ASC' } });
    const students = await this.studentRepo.find({
      where: { classCourseId },
      relations: ['student', 'student.studentProfile'],
    });
    const grades = await this.gradeRepo.find({ where: { classCourseId } });

    const gradeMap = new Map<string, number>();
    for (const g of grades) {
      gradeMap.set(`${g.studentId}-${g.gradeComponentId}`, Number(g.score));
    }

    const rows = students.map((s) => {
      const row: any = {
        Nama: s.student?.name || '-',
        NIM: s.student?.studentProfile?.nim || '-',
      };
      let totalWeighted = 0;
      for (const c of components) {
        const score = gradeMap.get(`${s.studentId}-${c.id}`);
        row[c.name] = score ?? '';
        if (score !== undefined) {
          totalWeighted += score * (Number(c.weight) / 100);
        }
      }
      row['Nilai Akhir'] = Math.round(totalWeighted * 100) / 100;
      row['Grade'] = this.scoreToGrade(totalWeighted);
      return row;
    });

    return this.generateExcel(rows, 'Nilai');
  }

  async exportAttendance(classCourseId: number): Promise<Buffer> {
    const meetings = await this.meetingRepo.find({
      where: { classCourseId },
      order: { meetingNumber: 'ASC' },
    });
    const students = await this.studentRepo.find({
      where: { classCourseId },
      relations: ['student', 'student.studentProfile'],
    });
    const attendances = await this.attendanceRepo.find({
      where: { classMeetingId: undefined }, // will filter below
    });

    // Get all attendances for these meetings
    const meetingIds = meetings.map((m) => m.id);
    let allAttendances: StudentAttendance[] = [];
    if (meetingIds.length > 0) {
      allAttendances = await this.attendanceRepo
        .createQueryBuilder('a')
        .where('a.classMeetingId IN (:...ids)', { ids: meetingIds })
        .getMany();
    }

    const attMap = new Map<string, string>();
    for (const a of allAttendances) {
      attMap.set(`${a.studentId}-${a.classMeetingId}`, a.status);
    }

    const rows = students.map((s) => {
      const row: any = {
        Nama: s.student?.name || '-',
        NIM: s.student?.studentProfile?.nim || '-',
      };
      let hadir = 0;
      for (const m of meetings) {
        const status = attMap.get(`${s.studentId}-${m.id}`) || '-';
        row[`P${m.meetingNumber}`] = status;
        if (status === 'H') hadir++;
      }
      row['Total Hadir'] = hadir;
      row['Persentase'] = meetings.length > 0 ? `${Math.round((hadir / meetings.length) * 100)}%` : '0%';
      return row;
    });

    return this.generateExcel(rows, 'Absensi');
  }

  async exportLecturerAttendance(semesterId: number): Promise<Buffer> {
    const logs = await this.lecturerLogRepo
      .createQueryBuilder('log')
      .leftJoinAndSelect('log.classMeeting', 'meeting')
      .leftJoinAndSelect('meeting.classCourse', 'cc')
      .leftJoinAndSelect('cc.course', 'course')
      .leftJoinAndSelect('cc.class', 'cls')
      .leftJoinAndSelect('cc.classLecturers', 'clec')
      .leftJoinAndSelect('clec.lecturer', 'lecturer')
      .leftJoinAndSelect('log.staffUser', 'staff')
      .where('cls.semesterId = :semesterId', { semesterId })
      .orderBy('log.clockInTime', 'DESC')
      .getMany();

    const rows = logs.map((l) => ({
      Tanggal: l.clockInTime ? new Date(l.clockInTime).toLocaleDateString('id-ID') : '-',
      'Jam Masuk': l.clockInTime ? new Date(l.clockInTime).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-',
      'Jam Keluar': l.clockOutTime ? new Date(l.clockOutTime).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-',
      'Durasi (menit)': l.durationMinutes || '-',
      'Mata Kuliah': l.classMeeting?.classCourse?.course?.name || '-',
      Kelas: l.classMeeting?.classCourse?.class?.name || '-',
      Dosen: l.classMeeting?.classCourse?.classLecturers?.[0]?.lecturer?.name || '-',
      'Dicatat Oleh': (l.staffUser as any)?.name || '-',
      Manual: l.isManualEntry ? 'Ya' : 'Tidak',
    }));

    return this.generateExcel(rows, 'Kehadiran Dosen');
  }

  private generateExcel(data: any[], sheetName: string): Buffer {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
  }

  private scoreToGrade(score: number): string {
    if (score >= 85) return 'A';
    if (score >= 80) return 'A-';
    if (score >= 75) return 'B+';
    if (score >= 70) return 'B';
    if (score >= 65) return 'B-';
    if (score >= 60) return 'C+';
    if (score >= 55) return 'C';
    if (score >= 40) return 'D';
    return 'E';
  }
}

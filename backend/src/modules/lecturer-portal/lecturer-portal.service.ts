import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  LecturerProfile,
  ClassCourse,
  ClassLecturer,
  ClassSchedule,
  ClassMeeting,
  ClassCourseStudent,
  GradeComponent,
  Semester,
  Assignment,
  Submission,
  StudentAttendance,
  StudentGrade,
  ThesisSubmission,
  ThesisSupervisor,
  GuidanceLog,
} from '../../database/entities';

@Injectable()
export class LecturerPortalService {
  constructor(
    @InjectRepository(LecturerProfile)
    private readonly profileRepo: Repository<LecturerProfile>,
    @InjectRepository(ClassLecturer)
    private readonly classLecturerRepo: Repository<ClassLecturer>,
    @InjectRepository(ClassCourse)
    private readonly classCourseRepo: Repository<ClassCourse>,
    @InjectRepository(ClassSchedule)
    private readonly scheduleRepo: Repository<ClassSchedule>,
    @InjectRepository(ClassMeeting)
    private readonly meetingRepo: Repository<ClassMeeting>,
    @InjectRepository(ClassCourseStudent)
    private readonly studentRepo: Repository<ClassCourseStudent>,
    @InjectRepository(GradeComponent)
    private readonly gradeComponentRepo: Repository<GradeComponent>,
    @InjectRepository(Semester)
    private readonly semesterRepo: Repository<Semester>,
    @InjectRepository(Assignment)
    private readonly assignmentRepo: Repository<Assignment>,
    @InjectRepository(Submission)
    private readonly submissionRepo: Repository<Submission>,
    @InjectRepository(StudentAttendance)
    private readonly attendanceRepo: Repository<StudentAttendance>,
    @InjectRepository(StudentGrade)
    private readonly gradeRepo: Repository<StudentGrade>,
    @InjectRepository(ThesisSubmission)
    private readonly thesisRepo: Repository<ThesisSubmission>,
    @InjectRepository(ThesisSupervisor)
    private readonly thesisSupervisorRepo: Repository<ThesisSupervisor>,
    @InjectRepository(GuidanceLog)
    private readonly guidanceLogRepo: Repository<GuidanceLog>,
  ) {}

  // ============ AUTH / VALIDATE TOKEN ============

  async validateToken(token: string) {
    const profile = await this.profileRepo.findOne({
      where: { portalToken: token },
      relations: ['user', 'homeProdi'],
    });
    if (!profile) throw new NotFoundException('Token tidak valid');

    return {
      lecturerId: profile.userId,
      name: profile.user?.name || '-',
      nidn: profile.nidn,
      prodi: profile.homeProdi?.name || '-',
      frontTitle: profile.frontTitle,
      backTitle: profile.backTitle,
    };
  }

  async getClasses(token: string) {
    const profile = await this.getProfile(token);
    const activeSemester = await this.semesterRepo.findOne({ where: { isActive: true } });
    if (!activeSemester) return { lecturer: profile, classes: [] };

    const assignments = await this.classLecturerRepo.find({
      where: { lecturerId: profile.userId },
      relations: [
        'classCourse',
        'classCourse.class',
        'classCourse.course',
        'classCourse.classMeetings',
      ],
    });

    const classes = assignments
      .filter((a) => a.classCourse?.class?.semesterId === activeSemester.id)
      .map((a) => {
        const filledMeetings = a.classCourse.classMeetings?.filter((m) => m.topic) || [];
        const totalMeetings = a.classCourse.totalMeetings || 16;
        return {
          classCourseId: a.classCourseId,
          className: a.classCourse.class?.name || '-',
          courseName: a.classCourse.course?.name || '-',
          courseCode: a.classCourse.course?.code || '',
          sks: a.classCourse.course?.sks || 0,
          totalMeetings,
          filledMeetings: filledMeetings.length,
          isPrimary: a.isPrimary,
        };
      });

    return { lecturer: profile, classes, semester: activeSemester.name };
  }

  // ============ CLASS DETAIL ============

  async getClassDetail(token: string, classCourseId: number) {
    await this.verifyAccess(token, classCourseId);

    const cc = await this.classCourseRepo.findOne({
      where: { id: classCourseId },
      relations: ['class', 'course', 'classLecturers', 'classLecturers.lecturer'],
    });
    if (!cc) throw new NotFoundException('Kelas tidak ditemukan');

    const schedules = await this.scheduleRepo.find({
      where: { classCourseId },
      relations: ['room'],
      order: { dayOfWeek: 'ASC', startTime: 'ASC' },
    });

    const students = await this.studentRepo.find({
      where: { classCourseId },
      relations: ['student', 'student.studentProfile'],
    });

    return {
      classCourse: {
        id: cc.id,
        className: cc.class?.name,
        courseName: cc.course?.name,
        courseCode: cc.course?.code,
        sks: cc.course?.sks,
        totalMeetings: cc.totalMeetings,
      },
      schedules: schedules.map((s) => ({
        id: s.id,
        dayOfWeek: s.dayOfWeek,
        startTime: s.startTime,
        endTime: s.endTime,
        room: s.room?.name || 'Online',
      })),
      students: students.map((s) => ({
        id: s.studentId,
        name: s.student?.name || '-',
        nim: s.student?.studentProfile?.nim || '-',
      })),
      lecturers: cc.classLecturers?.map((cl) => ({
        id: cl.lecturerId,
        name: cl.lecturer?.name || '-',
        isPrimary: cl.isPrimary,
      })),
    };
  }

  // ============ MEETINGS / JURNAL ============

  async getMeetings(token: string, classCourseId: number) {
    await this.verifyAccess(token, classCourseId);
    return this.meetingRepo.find({
      where: { classCourseId },
      order: { meetingNumber: 'ASC' },
    });
  }

  async generateMeetings(token: string, classCourseId: number) {
    await this.verifyAccess(token, classCourseId);

    const existing = await this.meetingRepo.count({ where: { classCourseId } });
    if (existing > 0) {
      throw new BadRequestException('Pertemuan sudah di-generate sebelumnya');
    }

    const cc = await this.classCourseRepo.findOne({ where: { id: classCourseId } });
    const total = cc?.totalMeetings || 16;
    const startDate = cc?.startDate ? new Date(cc.startDate) : new Date();

    const meetings: Partial<ClassMeeting>[] = [];
    for (let i = 1; i <= total; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + (i - 1) * 7);

      let type = 'KULIAH';
      if (i === Math.ceil(total / 2)) type = 'UTS';
      if (i === total) type = 'UAS';

      meetings.push({
        classCourseId,
        meetingNumber: i,
        date,
        type,
        mode: 'OFFLINE',
        isLocked: false,
      });
    }

    const saved = await this.meetingRepo.save(this.meetingRepo.create(meetings));
    return { message: `${total} pertemuan berhasil di-generate`, data: saved };
  }

  async updateMeeting(
    token: string,
    meetingId: number,
    data: { topic?: string; notes?: string; mode?: string; type?: string; materialFile?: string },
  ) {
    const meeting = await this.meetingRepo.findOne({
      where: { id: meetingId },
      relations: ['classCourse'],
    });
    if (!meeting) throw new NotFoundException('Pertemuan tidak ditemukan');

    await this.verifyAccess(token, meeting.classCourseId);

    if (meeting.isLocked) {
      throw new BadRequestException('Pertemuan sudah di-lock');
    }

    if (data.topic !== undefined) meeting.topic = data.topic;
    if (data.notes !== undefined) meeting.notes = data.notes;
    if (data.mode !== undefined) meeting.mode = data.mode;
    if (data.type !== undefined) meeting.type = data.type;
    if (data.materialFile !== undefined) meeting.materialFile = data.materialFile;

    await this.meetingRepo.save(meeting);
    return { message: 'Jurnal berhasil disimpan', data: meeting };
  }

  // ============ ATTENDANCE ============

  async getAttendance(token: string, meetingId: number) {
    const meeting = await this.meetingRepo.findOne({ where: { id: meetingId } });
    if (!meeting) throw new NotFoundException('Pertemuan tidak ditemukan');

    await this.verifyAccess(token, meeting.classCourseId);

    const students = await this.studentRepo.find({
      where: { classCourseId: meeting.classCourseId },
      relations: ['student', 'student.studentProfile'],
    });

    const attendances = await this.attendanceRepo.find({
      where: { classMeetingId: meetingId },
    });

    const attendanceMap = new Map(attendances.map((a) => [a.studentId, a.status]));

    return students.map((s) => ({
      studentId: s.studentId,
      name: s.student?.name || '-',
      nim: s.student?.studentProfile?.nim || '-',
      status: attendanceMap.get(s.studentId) || 'H',
    }));
  }

  async saveAttendance(
    token: string,
    meetingId: number,
    data: { studentId: number; status: string }[],
  ) {
    const meeting = await this.meetingRepo.findOne({ where: { id: meetingId } });
    if (!meeting) throw new NotFoundException('Pertemuan tidak ditemukan');

    await this.verifyAccess(token, meeting.classCourseId);

    for (const item of data) {
      const existing = await this.attendanceRepo.findOne({
        where: { classMeetingId: meetingId, studentId: item.studentId },
      });

      if (existing) {
        existing.status = item.status;
        await this.attendanceRepo.save(existing);
      } else {
        await this.attendanceRepo.save(
          this.attendanceRepo.create({
            classMeetingId: meetingId,
            studentId: item.studentId,
            status: item.status,
          }),
        );
      }
    }

    return { message: 'Absensi berhasil disimpan' };
  }

  // ============ GRADES ============

  async getGrades(token: string, classCourseId: number) {
    await this.verifyAccess(token, classCourseId);

    const components = await this.gradeComponentRepo.find({
      where: { isActive: true },
      order: { id: 'ASC' },
    });

    const students = await this.studentRepo.find({
      where: { classCourseId },
      relations: ['student', 'student.studentProfile'],
    });

    const grades = await this.gradeRepo.find({ where: { classCourseId } });
    const gradeMap = new Map<string, number>();
    for (const g of grades) {
      gradeMap.set(`${g.studentId}-${g.gradeComponentId}`, Number(g.score));
    }

    return {
      components: components.map((c) => ({
        id: c.id,
        name: c.name,
        weight: Number(c.weight),
      })),
      students: students.map((s) => ({
        studentId: s.studentId,
        name: s.student?.name || '-',
        nim: s.student?.studentProfile?.nim || '-',
        scores: components.map((c) => ({
          componentId: c.id,
          score: gradeMap.get(`${s.studentId}-${c.id}`) ?? null,
        })),
      })),
    };
  }

  async saveGrades(
    token: string,
    classCourseId: number,
    data: { studentId: number; gradeComponentId: number; score: number }[],
  ) {
    await this.verifyAccess(token, classCourseId);

    for (const item of data) {
      const existing = await this.gradeRepo.findOne({
        where: {
          classCourseId,
          studentId: item.studentId,
          gradeComponentId: item.gradeComponentId,
        },
      });

      if (existing) {
        existing.score = item.score;
        await this.gradeRepo.save(existing);
      } else {
        await this.gradeRepo.save(
          this.gradeRepo.create({
            classCourseId,
            studentId: item.studentId,
            gradeComponentId: item.gradeComponentId,
            score: item.score,
          }),
        );
      }
    }

    return { message: 'Nilai berhasil disimpan' };
  }

  // ============ ASSIGNMENTS ============

  async getAssignments(token: string, classCourseId: number) {
    await this.verifyAccess(token, classCourseId);

    const assignments = await this.assignmentRepo.find({
      where: { classCourseId },
      relations: ['submissions'],
      order: { createdAt: 'DESC' },
    });

    const totalStudents = await this.studentRepo.count({ where: { classCourseId } });

    return assignments.map((a) => ({
      id: a.id,
      title: a.title,
      description: a.description,
      deadline: a.deadline,
      publicToken: a.publicToken,
      isGroupTask: a.isGroupTask,
      isActive: a.isActive,
      submissionCount: a.submissions?.length || 0,
      totalStudents,
      createdAt: a.createdAt,
    }));
  }

  async createAssignment(
    token: string,
    classCourseId: number,
    data: { title: string; description?: string; deadline?: string; isGroupTask?: boolean },
  ) {
    await this.verifyAccess(token, classCourseId);

    const assignment = this.assignmentRepo.create({
      classCourseId,
      title: data.title,
      description: data.description,
      deadline: data.deadline ? new Date(data.deadline) : undefined,
      isGroupTask: data.isGroupTask || false,
    });

    await this.assignmentRepo.save(assignment);
    return { message: 'Tugas berhasil dibuat', data: assignment };
  }

  async getSubmissions(token: string, assignmentId: number) {
    const assignment = await this.assignmentRepo.findOne({
      where: { id: assignmentId },
    });
    if (!assignment) throw new NotFoundException('Tugas tidak ditemukan');

    await this.verifyAccess(token, assignment.classCourseId);

    const submissions = await this.submissionRepo.find({
      where: { assignmentId },
      relations: ['student', 'student.studentProfile'],
      order: { uploadedAt: 'DESC' },
    });

    return submissions.map((s) => ({
      id: s.id,
      studentName: s.student?.name || '-',
      nim: s.student?.studentProfile?.nim || '-',
      fileName: s.fileName,
      filePath: s.filePath,
      fileSize: s.fileSize,
      studentNotes: s.studentNotes,
      isLate: s.isLate,
      uploadedAt: s.uploadedAt,
    }));
  }

  // ============ PUBLIC ASSIGNMENT UPLOAD ============

  async getPublicAssignment(publicToken: string) {
    const assignment = await this.assignmentRepo.findOne({
      where: { publicToken, isActive: true },
      relations: ['classCourse', 'classCourse.course', 'classCourse.class'],
    });
    if (!assignment) throw new NotFoundException('Tugas tidak ditemukan atau sudah tidak aktif');

    const students = await this.studentRepo.find({
      where: { classCourseId: assignment.classCourseId },
      relations: ['student', 'student.studentProfile'],
    });

    return {
      id: assignment.id,
      title: assignment.title,
      description: assignment.description,
      deadline: assignment.deadline,
      courseName: assignment.classCourse?.course?.name || '-',
      className: assignment.classCourse?.class?.name || '-',
      students: students.map((s) => ({
        id: s.studentId,
        name: s.student?.name || '-',
        nim: s.student?.studentProfile?.nim || '-',
      })),
    };
  }

  async submitPublicAssignment(
    publicToken: string,
    data: { studentId: number; fileName: string; filePath: string; fileSize?: number; studentNotes?: string },
  ) {
    const assignment = await this.assignmentRepo.findOne({
      where: { publicToken, isActive: true },
    });
    if (!assignment) throw new NotFoundException('Tugas tidak ditemukan');

    // Check if late
    const isLate = assignment.deadline ? new Date() > new Date(assignment.deadline) : false;

    // Upsert: replace existing submission
    const existing = await this.submissionRepo.findOne({
      where: { assignmentId: assignment.id, studentId: data.studentId },
    });

    if (existing) {
      existing.fileName = data.fileName;
      existing.filePath = data.filePath;
      existing.fileSize = data.fileSize || 0;
      existing.studentNotes = data.studentNotes || '';
      existing.isLate = isLate;
      await this.submissionRepo.save(existing);
      return { message: 'Tugas berhasil diperbarui (upload ulang)', isLate };
    }

    const submission = this.submissionRepo.create({
      assignmentId: assignment.id,
      studentId: data.studentId,
      fileName: data.fileName,
      filePath: data.filePath,
      fileSize: data.fileSize || 0,
      studentNotes: data.studentNotes || '',
      isLate,
    });

    await this.submissionRepo.save(submission);
    return { message: 'Tugas berhasil dikirim', isLate };
  }

  // ============ ADMIN: TOKEN MANAGEMENT ============

  async generateToken(lecturerId: number) {
    const profile = await this.profileRepo.findOne({ where: { userId: lecturerId } });
    if (!profile) throw new NotFoundException('Profil dosen tidak ditemukan');

    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let token = '';
    for (let i = 0; i < 12; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    profile.portalToken = token;
    await this.profileRepo.save(profile);

    return { message: 'Token berhasil di-generate', token };
  }

  async revokeToken(lecturerId: number) {
    const profile = await this.profileRepo.findOne({ where: { userId: lecturerId } });
    if (!profile) throw new NotFoundException('Profil dosen tidak ditemukan');

    profile.portalToken = '';
    await this.profileRepo.save(profile);

    return { message: 'Token berhasil dicabut' };
  }

  // ============ THESIS / BIMBINGAN TESIS ============

  async getThesisStudents(token: string) {
    const profile = await this.getProfile(token);

    const supervisors = await this.thesisSupervisorRepo.find({
      where: { lecturerId: profile.userId },
      relations: ['thesis', 'thesis.student', 'thesis.student.studentProfile', 'thesis.prodi'],
    });

    return supervisors.map((s) => ({
      thesisId: s.thesis.id,
      studentName: s.thesis.student?.name || '-',
      studentNim: s.thesis.student?.studentProfile?.nim || '-',
      title: s.thesis.title,
      type: s.thesis.type,
      status: s.thesis.status,
      role: s.role,
      prodi: s.thesis.prodi?.name || '-',
    }));
  }

  async getThesisLogs(token: string, thesisId: number) {
    const profile = await this.getProfile(token);

    // Verify this lecturer is supervisor
    const sup = await this.thesisSupervisorRepo.findOne({
      where: { thesisId, lecturerId: profile.userId },
    });
    if (!sup) throw new BadRequestException('Anda bukan pembimbing mahasiswa ini');

    const logs = await this.guidanceLogRepo.find({
      where: { thesisId },
      order: { date: 'DESC' },
    });

    return logs;
  }

  async addThesisLog(token: string, thesisId: number, data: {
    date: string; startTime?: string; endTime?: string;
    topic: string; notes?: string; studentProgress?: string;
    nextAction?: string; chapter?: string;
  }) {
    const profile = await this.getProfile(token);

    const sup = await this.thesisSupervisorRepo.findOne({
      where: { thesisId, lecturerId: profile.userId },
      relations: ['thesis'],
    });
    if (!sup) throw new BadRequestException('Anda bukan pembimbing mahasiswa ini');

    const log = this.guidanceLogRepo.create({
      thesisId,
      lecturerId: profile.userId,
      studentId: sup.thesis.studentId,
      ...data,
      status: 'DONE',
    });
    await this.guidanceLogRepo.save(log);

    return { message: 'Log bimbingan berhasil ditambahkan', data: log };
  }

  // ============ HELPERS ============

  private async getProfile(token: string) {
    const profile = await this.profileRepo.findOne({
      where: { portalToken: token },
      relations: ['user'],
    });
    if (!profile) throw new NotFoundException('Token tidak valid');
    return profile;
  }

  private async verifyAccess(token: string, classCourseId: number) {
    const profile = await this.getProfile(token);

    const assignment = await this.classLecturerRepo.findOne({
      where: { lecturerId: profile.userId, classCourseId },
    });
    if (!assignment) {
      throw new BadRequestException('Anda tidak memiliki akses ke kelas ini');
    }

    return profile;
  }
}

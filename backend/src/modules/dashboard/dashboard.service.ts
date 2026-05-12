import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import {
  User,
  Semester,
  Class,
  ClassCourse,
  ClassSchedule,
  StudentProfile,
  LecturerProfile,
} from '../../database/entities';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Semester)
    private readonly semesterRepository: Repository<Semester>,
    @InjectRepository(Class)
    private readonly classRepository: Repository<Class>,
    @InjectRepository(ClassSchedule)
    private readonly classScheduleRepository: Repository<ClassSchedule>,
    @InjectRepository(StudentProfile)
    private readonly studentProfileRepository: Repository<StudentProfile>,
    @InjectRepository(LecturerProfile)
    private readonly lecturerProfileRepository: Repository<LecturerProfile>,
  ) {}

  async getStats(user: any) {
    const isSuperAdminOrAdmin = user.roles?.some(
      (r: any) => r.slug === 'superadmin' || r.slug === 'admin',
    );
    const allowedProdiIds =
      user.staffProdiAccess?.map((a: any) => a.prodiId) || [];

    // Get active semester
    const activeSemester = await this.semesterRepository.findOne({
      where: { isActive: true },
    });

    // Count students
    const studentQuery = this.studentProfileRepository
      .createQueryBuilder('sp')
      .where('sp.status = :status', { status: 'aktif' });

    if (!isSuperAdminOrAdmin && allowedProdiIds.length > 0) {
      studentQuery.andWhere('sp.prodiId IN (:...prodiIds)', {
        prodiIds: allowedProdiIds,
      });
    }
    const totalStudents = await studentQuery.getCount();

    // Count lecturers
    const lecturerQuery = this.lecturerProfileRepository.createQueryBuilder('lp');
    if (!isSuperAdminOrAdmin && allowedProdiIds.length > 0) {
      lecturerQuery.andWhere('lp.homeProdiId IN (:...prodiIds)', {
        prodiIds: allowedProdiIds,
      });
    }
    const totalLecturers = await lecturerQuery.getCount();

    // Count today's classes
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0=Sunday, 1=Monday...
    const todayStr = today.toISOString().split('T')[0];

    let todayClassesQuery = this.classScheduleRepository
      .createQueryBuilder('cs')
      .leftJoin('cs.classCourse', 'cc')
      .leftJoin('cc.class', 'cl')
      .where('(cs.date = :todayStr OR (cs.date IS NULL AND cs.dayOfWeek = :dayOfWeek))', { todayStr, dayOfWeek });

    if (activeSemester) {
      todayClassesQuery = todayClassesQuery.andWhere(
        'cl.semesterId = :semesterId',
        { semesterId: activeSemester.id },
      );
    }

    if (!isSuperAdminOrAdmin && allowedProdiIds.length > 0) {
      todayClassesQuery = todayClassesQuery.andWhere(
        'cl.prodiId IN (:...prodiIds)',
        { prodiIds: allowedProdiIds },
      );
    }

    const todayClassesCount = await todayClassesQuery.getCount();

    // Count total classes this semester
    let totalClassesQuery = this.classRepository.createQueryBuilder('c');
    if (activeSemester) {
      totalClassesQuery = totalClassesQuery.where('c.semesterId = :semesterId', {
        semesterId: activeSemester.id,
      });
    }
    if (!isSuperAdminOrAdmin && allowedProdiIds.length > 0) {
      totalClassesQuery = totalClassesQuery.andWhere(
        'c.prodiId IN (:...prodiIds)',
        { prodiIds: allowedProdiIds },
      );
    }
    const totalClasses = await totalClassesQuery.getCount();

    return {
      totalStudents,
      totalLecturers,
      todayClasses: todayClassesCount,
      totalClasses,
      activeSemester: activeSemester
        ? { id: activeSemester.id, name: activeSemester.name }
        : null,
    };
  }

  async getTodayClasses(user: any) {
    const isSuperAdminOrAdmin = user.roles?.some(
      (r: any) => r.slug === 'superadmin' || r.slug === 'admin',
    );
    const allowedProdiIds =
      user.staffProdiAccess?.map((a: any) => a.prodiId) || [];

    const activeSemester = await this.semesterRepository.findOne({
      where: { isActive: true },
    });

    const today = new Date();
    const dayOfWeek = today.getDay();
    const todayStr = today.toISOString().split('T')[0];

    let query = this.classScheduleRepository
      .createQueryBuilder('cs')
      .leftJoinAndSelect('cs.classCourse', 'cc')
      .leftJoinAndSelect('cc.class', 'cl')
      .leftJoinAndSelect('cc.course', 'course')
      .leftJoinAndSelect('cs.room', 'room')
      .leftJoinAndSelect('cc.classLecturers', 'clec')
      .leftJoinAndSelect('clec.lecturer', 'lecturer')
      .where('(cs.date = :todayStr OR (cs.date IS NULL AND cs.dayOfWeek = :dayOfWeek))', { todayStr, dayOfWeek });

    if (activeSemester) {
      query = query.andWhere('cl.semesterId = :semesterId', {
        semesterId: activeSemester.id,
      });
    }

    if (!isSuperAdminOrAdmin && allowedProdiIds.length > 0) {
      query = query.andWhere('cl.prodiId IN (:...prodiIds)', {
        prodiIds: allowedProdiIds,
      });
    }

    query = query.orderBy('cs.startTime', 'ASC');

    const schedules = await query.getMany();

    return schedules.map((s) => ({
      id: s.id,
      startTime: s.startTime,
      endTime: s.endTime,
      room: s.room?.name || 'Online',
      className: s.classCourse?.class?.name || '-',
      courseName: s.classCourse?.course?.name || '-',
      courseCode: s.classCourse?.course?.code || '',
      lecturers:
        s.classCourse?.classLecturers?.map(
          (cl: any) => cl.lecturer?.name || 'Unknown',
        ) || [],
    }));
  }

  async getActiveSemesterInfo() {
    const activeSemester = await this.semesterRepository.findOne({
      where: { isActive: true },
    });

    if (!activeSemester) {
      return { id: null, name: 'Belum ada semester aktif', type: null, weekNumber: null };
    }

    // Calculate week number
    let weekNumber: number | null = null;
    if (activeSemester.startDate) {
      const start = new Date(activeSemester.startDate);
      const now = new Date();
      const diffMs = now.getTime() - start.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      weekNumber = Math.max(1, Math.ceil(diffDays / 7));
    }

    return {
      id: activeSemester.id,
      name: activeSemester.name,
      type: activeSemester.type,
      weekNumber,
    };
  }
}

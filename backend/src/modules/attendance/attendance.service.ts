import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import {
  LecturerAttendanceLog,
  ClassMeeting,
  ClassSchedule,
  ClassCourse,
  Class,
  Semester,
} from '../../database/entities';

@Injectable()
export class AttendanceService {
  constructor(
    @InjectRepository(LecturerAttendanceLog)
    private readonly logRepository: Repository<LecturerAttendanceLog>,
    @InjectRepository(ClassMeeting)
    private readonly meetingRepository: Repository<ClassMeeting>,
    @InjectRepository(ClassSchedule)
    private readonly scheduleRepository: Repository<ClassSchedule>,
    @InjectRepository(ClassCourse)
    private readonly classCourseRepository: Repository<ClassCourse>,
    @InjectRepository(Semester)
    private readonly semesterRepository: Repository<Semester>,
  ) {}

  async getTodaySchedules(user: any) {
    const isSuperAdminOrAdmin = user.roles?.some(
      (r: any) => r.slug === 'superadmin' || r.slug === 'admin',
    );
    const allowedProdiIds =
      user.staffProdiAccess?.map((a: any) => a.prodiId) || [];

    const activeSemester = await this.semesterRepository.findOne({
      where: { isActive: true },
    });
    if (!activeSemester) return [];

    const today = new Date();
    const dayOfWeek = today.getDay();
    const todayStr = today.toISOString().split('T')[0];

    let query = this.scheduleRepository
      .createQueryBuilder('cs')
      .leftJoinAndSelect('cs.classCourse', 'cc')
      .leftJoinAndSelect('cc.class', 'cl')
      .leftJoinAndSelect('cc.course', 'course')
      .leftJoinAndSelect('cs.room', 'room')
      .leftJoinAndSelect('cc.classLecturers', 'clec')
      .leftJoinAndSelect('clec.lecturer', 'lecturer')
      .where('(cs.date = :todayStr OR (cs.date IS NULL AND cs.dayOfWeek = :dayOfWeek))', { todayStr, dayOfWeek })
      .andWhere('cl.semesterId = :semesterId', {
        semesterId: activeSemester.id,
      });

    if (!isSuperAdminOrAdmin && allowedProdiIds.length > 0) {
      query = query.andWhere('cl.prodiId IN (:...prodiIds)', {
        prodiIds: allowedProdiIds,
      });
    }

    query = query.orderBy('cs.startTime', 'ASC');
    const schedules = await query.getMany();

    // Get today's attendance logs
    const todayStart = new Date(today);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(today);
    todayEnd.setHours(23, 59, 59, 999);

    const classCourseIds = schedules.map((s) => s.classCourseId);
    let logs: LecturerAttendanceLog[] = [];

    if (classCourseIds.length > 0) {
      logs = await this.logRepository
        .createQueryBuilder('log')
        .leftJoinAndSelect('log.classMeeting', 'meeting')
        .where('meeting.classCourseId IN (:...ids)', { ids: classCourseIds })
        .andWhere('log.clockInTime >= :start', { start: todayStart })
        .andWhere('log.clockInTime <= :end', { end: todayEnd })
        .getMany();
    }

    // Map logs by classCourseId for quick lookup
    const logMap = new Map<number, LecturerAttendanceLog>();
    for (const log of logs) {
      if (log.classMeeting) {
        logMap.set(log.classMeeting.classCourseId, log);
      }
    }

    return schedules.map((s) => {
      const log = logMap.get(s.classCourseId);
      let status: 'ongoing' | 'pending' | 'done' | 'absent' = 'pending';

      if (log) {
        if (log.clockOutTime) {
          status = 'done';
        } else {
          status = 'ongoing';
        }
      } else {
        // Check if class time has passed
        const now = new Date();
        const [endH, endM] = (s.endTime || '23:59').split(':').map(Number);
        const endDate = new Date(now);
        endDate.setHours(endH, endM, 0, 0);
        if (now > endDate) {
          status = 'absent';
        }
      }

      return {
        id: s.id,
        classCourseId: s.classCourseId,
        startTime: s.startTime,
        endTime: s.endTime,
        room: s.room?.name || 'Online',
        className: s.classCourse?.class?.name || '-',
        courseName: s.classCourse?.course?.name || '-',
        lecturers:
          s.classCourse?.classLecturers?.map(
            (cl: any) => cl.lecturer?.name || 'Unknown',
          ) || [],
        status,
        attendanceLog: log
          ? {
              id: log.id,
              clockInTime: log.clockInTime,
              clockOutTime: log.clockOutTime,
              durationMinutes: log.durationMinutes,
            }
          : null,
      };
    });
  }

  async clockIn(classCourseId: number, staffUserId: number) {
    // Find or create the next meeting for this class course
    let meeting = await this.meetingRepository.findOne({
      where: { classCourseId, topic: undefined },
      order: { meetingNumber: 'ASC' },
    });

    if (!meeting) {
      // Find the next meeting without attendance
      const allMeetings = await this.meetingRepository.find({
        where: { classCourseId },
        order: { meetingNumber: 'ASC' },
      });

      const logsForMeetings = await this.logRepository.find({
        where: {
          classMeetingId: In(allMeetings.map((m) => m.id)),
        },
      });
      const loggedMeetingIds = new Set(logsForMeetings.map((l) => l.classMeetingId));

      meeting = allMeetings.find((m) => !loggedMeetingIds.has(m.id)) || null;
    }

    if (!meeting) {
      throw new BadRequestException(
        'Tidak ada pertemuan tersedia. Generate pertemuan terlebih dahulu.',
      );
    }

    // Check if already clocked in today for this meeting
    const existingLog = await this.logRepository.findOne({
      where: { classMeetingId: meeting.id },
    });
    if (existingLog) {
      throw new BadRequestException('Sudah ada log kehadiran untuk pertemuan ini');
    }

    const log = this.logRepository.create({
      classMeetingId: meeting.id,
      staffUserId,
      clockInTime: new Date(),
      isManualEntry: false,
    });

    await this.logRepository.save(log);

    return {
      message: 'Clock-in berhasil',
      data: { logId: log.id, meetingId: meeting.id, meetingNumber: meeting.meetingNumber },
    };
  }

  async clockOut(logId: number) {
    const log = await this.logRepository.findOne({ where: { id: logId } });
    if (!log) throw new NotFoundException('Log kehadiran tidak ditemukan');

    if (log.clockOutTime) {
      throw new BadRequestException('Sudah clock-out sebelumnya');
    }

    log.clockOutTime = new Date();

    // Calculate duration
    if (log.clockInTime) {
      const diffMs = log.clockOutTime.getTime() - new Date(log.clockInTime).getTime();
      log.durationMinutes = Math.round(diffMs / 60000);
    }

    await this.logRepository.save(log);

    return { message: 'Clock-out berhasil', data: log };
  }

  async setBySchedule(logId: number, scheduleId: number) {
    const log = await this.logRepository.findOne({ where: { id: logId } });
    if (!log) throw new NotFoundException('Log kehadiran tidak ditemukan');

    const schedule = await this.scheduleRepository.findOne({
      where: { id: scheduleId },
    });
    if (!schedule) throw new NotFoundException('Jadwal tidak ditemukan');

    // Set clock in/out to match schedule times
    const today = new Date();
    const [startH, startM] = schedule.startTime.split(':').map(Number);
    const [endH, endM] = schedule.endTime.split(':').map(Number);

    const clockIn = new Date(today);
    clockIn.setHours(startH, startM, 0, 0);

    const clockOut = new Date(today);
    clockOut.setHours(endH, endM, 0, 0);

    log.clockInTime = clockIn;
    log.clockOutTime = clockOut;
    log.isManualEntry = true;
    log.durationMinutes = Math.round(
      (clockOut.getTime() - clockIn.getTime()) / 60000,
    );

    await this.logRepository.save(log);

    return { message: 'Waktu diset sesuai jadwal', data: log };
  }

  async getHistory(filters: {
    lecturerId?: number;
    classCourseId?: number;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }) {
    const { lecturerId, classCourseId, startDate, endDate, page = 1, limit = 20 } = filters;

    let query = this.logRepository
      .createQueryBuilder('log')
      .leftJoinAndSelect('log.classMeeting', 'meeting')
      .leftJoinAndSelect('meeting.classCourse', 'cc')
      .leftJoinAndSelect('cc.course', 'course')
      .leftJoinAndSelect('cc.class', 'cls')
      .leftJoinAndSelect('cc.classLecturers', 'clec')
      .leftJoinAndSelect('clec.lecturer', 'lecturer')
      .leftJoinAndSelect('log.staffUser', 'staff');

    if (classCourseId) {
      query = query.andWhere('meeting.classCourseId = :classCourseId', {
        classCourseId,
      });
    }

    if (lecturerId) {
      query = query.andWhere('clec.lecturerId = :lecturerId', { lecturerId });
    }

    if (startDate) {
      query = query.andWhere('log.clockInTime >= :startDate', { startDate });
    }

    if (endDate) {
      query = query.andWhere('log.clockInTime <= :endDate', {
        endDate: endDate + ' 23:59:59',
      });
    }

    query = query.orderBy('log.clockInTime', 'DESC');

    const total = await query.getCount();
    const data = await query
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    return {
      data: data.map((log) => ({
        id: log.id,
        clockInTime: log.clockInTime,
        clockOutTime: log.clockOutTime,
        durationMinutes: log.durationMinutes,
        isManualEntry: log.isManualEntry,
        meetingNumber: log.classMeeting?.meetingNumber,
        courseName: log.classMeeting?.classCourse?.course?.name || '-',
        className: log.classMeeting?.classCourse?.class?.name || '-',
        lecturers:
          log.classMeeting?.classCourse?.classLecturers?.map(
            (cl: any) => cl.lecturer?.name,
          ) || [],
        staffName: (log.staffUser as any)?.name || '-',
      })),
      total,
      page,
      limit,
    };
  }
}

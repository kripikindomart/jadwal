import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClassSchedule, Semester } from '../../database/entities';

@Injectable()
export class DisplayService {
  constructor(
    @InjectRepository(ClassSchedule)
    private readonly scheduleRepo: Repository<ClassSchedule>,
    @InjectRepository(Semester)
    private readonly semesterRepo: Repository<Semester>,
  ) {}

  async getTodaySchedule() {
    const activeSemester = await this.semesterRepo.findOne({ where: { isActive: true } });
    if (!activeSemester) return { semester: null, schedules: [] };

    const today = new Date();
    const dayOfWeek = today.getDay();
    const todayStr = today.toISOString().split('T')[0]; // YYYY-MM-DD

    // Match by specific date OR by dayOfWeek (for recurring schedules without date)
    const schedules = await this.scheduleRepo
      .createQueryBuilder('cs')
      .leftJoinAndSelect('cs.classCourse', 'cc')
      .leftJoinAndSelect('cc.class', 'cl')
      .leftJoinAndSelect('cc.course', 'course')
      .leftJoinAndSelect('cs.room', 'room')
      .leftJoinAndSelect('cc.classLecturers', 'clec')
      .leftJoinAndSelect('clec.lecturer', 'lecturer')
      .leftJoinAndSelect('cl.prodi', 'prodi')
      .where('cl.semesterId = :semesterId', { semesterId: activeSemester.id })
      .andWhere('(cs.date = :todayStr OR (cs.date IS NULL AND cs.dayOfWeek = :dayOfWeek))', { todayStr, dayOfWeek })
      .orderBy('cs.startTime', 'ASC')
      .getMany();

    return {
      semester: activeSemester.name,
      date: today.toISOString(),
      dayOfWeek,
      totalSchedules: schedules.length,
      schedules: schedules.map((s) => ({
        id: s.id,
        startTime: s.startTime,
        endTime: s.endTime,
        room: s.room?.name || 'Online',
        courseName: s.classCourse?.course?.name || '-',
        courseCode: s.classCourse?.course?.code || '',
        className: s.classCourse?.class?.name || '-',
        prodi: s.classCourse?.class?.prodi?.name || '-',
        lecturers: s.classCourse?.classLecturers?.map((cl: any) => cl.lecturer?.name || '') || [],
      })),
    };
  }
}

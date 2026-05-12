import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClassSchedule, ClassLecturer, Semester } from '../../database/entities';

@Injectable()
export class CalendarService {
  constructor(
    @InjectRepository(ClassSchedule)
    private readonly scheduleRepo: Repository<ClassSchedule>,
    @InjectRepository(Semester)
    private readonly semesterRepo: Repository<Semester>,
  ) {}

  async generateIcs(userId: number): Promise<string> {
    const activeSemester = await this.semesterRepo.findOne({ where: { isActive: true } });
    if (!activeSemester) throw new NotFoundException('Tidak ada semester aktif');

    // Get schedules where user is lecturer or student
    const schedules = await this.scheduleRepo
      .createQueryBuilder('cs')
      .leftJoinAndSelect('cs.classCourse', 'cc')
      .leftJoinAndSelect('cc.class', 'cl')
      .leftJoinAndSelect('cc.course', 'course')
      .leftJoinAndSelect('cs.room', 'room')
      .leftJoinAndSelect('cc.classLecturers', 'clec')
      .where('cl.semesterId = :semesterId', { semesterId: activeSemester.id })
      .andWhere(
        '(clec.lecturerId = :userId OR EXISTS (SELECT 1 FROM class_course_students ccs WHERE ccs."classCourseId" = cc.id AND ccs."studentId" = :userId))',
        { userId },
      )
      .orderBy('cs.dayOfWeek', 'ASC')
      .addOrderBy('cs.startTime', 'ASC')
      .getMany();

    // Generate ICS content
    const lines: string[] = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//ProdiCMS//Jadwal//ID',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      `X-WR-CALNAME:Jadwal ${activeSemester.name}`,
    ];

    const startDate = activeSemester.startDate
      ? new Date(activeSemester.startDate)
      : new Date();

    for (const s of schedules) {
      const courseName = s.classCourse?.course?.name || 'Kuliah';
      const className = s.classCourse?.class?.name || '';
      const room = s.room?.name || 'Online';

      // Generate recurring events for 16 weeks
      for (let week = 0; week < 16; week++) {
        const eventDate = new Date(startDate);
        // Find the first occurrence of this dayOfWeek
        const diff = (s.dayOfWeek - eventDate.getDay() + 7) % 7;
        eventDate.setDate(eventDate.getDate() + diff + week * 7);

        const [startH, startM] = (s.startTime || '08:00').split(':').map(Number);
        const [endH, endM] = (s.endTime || '10:00').split(':').map(Number);

        const dtStart = this.formatIcsDate(eventDate, startH, startM);
        const dtEnd = this.formatIcsDate(eventDate, endH, endM);
        const uid = `${s.id}-week${week}@prodicms`;

        lines.push('BEGIN:VEVENT');
        lines.push(`UID:${uid}`);
        lines.push(`DTSTART:${dtStart}`);
        lines.push(`DTEND:${dtEnd}`);
        lines.push(`SUMMARY:${courseName} (${className})`);
        lines.push(`LOCATION:${room}`);
        lines.push(`DESCRIPTION:Pertemuan ke-${week + 1}`);
        lines.push('BEGIN:VALARM');
        lines.push('TRIGGER:-PT15M');
        lines.push('ACTION:DISPLAY');
        lines.push('DESCRIPTION:Kuliah dimulai 15 menit lagi');
        lines.push('END:VALARM');
        lines.push('END:VEVENT');
      }
    }

    lines.push('END:VCALENDAR');
    return lines.join('\r\n');
  }

  private formatIcsDate(date: Date, hours: number, minutes: number): string {
    const y = date.getFullYear();
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const d = date.getDate().toString().padStart(2, '0');
    const h = hours.toString().padStart(2, '0');
    const min = minutes.toString().padStart(2, '0');
    return `${y}${m}${d}T${h}${min}00`;
  }
}

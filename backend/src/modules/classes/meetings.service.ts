import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClassMeeting, ClassCourse, ClassSchedule } from '../../database/entities';

@Injectable()
export class MeetingsService {
  constructor(
    @InjectRepository(ClassMeeting)
    private readonly meetingRepository: Repository<ClassMeeting>,
    @InjectRepository(ClassCourse)
    private readonly classCourseRepository: Repository<ClassCourse>,
    @InjectRepository(ClassSchedule)
    private readonly classScheduleRepository: Repository<ClassSchedule>,
  ) {}

  async findByClassCourse(classCourseId: number) {
    // Auto-generate from schedules if no meetings exist
    const count = await this.meetingRepository.count({ where: { classCourseId } });
    if (count === 0) {
      await this.generate(classCourseId);
    }

    const meetings = await this.meetingRepository.find({
      where: { classCourseId },
      order: { meetingNumber: 'ASC' },
    });
    return meetings;
  }

  async findOne(id: number) {
    const meeting = await this.meetingRepository.findOne({
      where: { id },
      relations: ['classCourse', 'classCourse.course'],
    });
    if (!meeting) throw new NotFoundException('Pertemuan tidak ditemukan');
    return meeting;
  }

  async generate(classCourseId: number, totalMeetings?: number) {
    const classCourse = await this.classCourseRepository.findOne({
      where: { id: classCourseId },
    });
    if (!classCourse) {
      throw new NotFoundException('Class course tidak ditemukan');
    }

    // Check if meetings already exist
    const existing = await this.meetingRepository.count({
      where: { classCourseId },
    });
    if (existing > 0) {
      return {
        message: `Sudah ada ${existing} pertemuan untuk class course ini.`,
        data: await this.meetingRepository.find({ where: { classCourseId }, order: { meetingNumber: 'ASC' } }),
      };
    }

    const total = totalMeetings || classCourse.totalMeetings || 16;

    // Get existing schedules for this class course
    const schedules = await this.classScheduleRepository.find({
      where: { classCourseId },
      order: { date: 'ASC', dayOfWeek: 'ASC' },
    });

    const meetings: Partial<ClassMeeting>[] = [];

    if (schedules.length > 0) {
      // Generate from actual schedule dates
      for (let i = 0; i < Math.min(schedules.length, total); i++) {
        const sched = schedules[i];
        let type = 'KULIAH';
        if (i + 1 === Math.ceil(total / 2)) type = 'UTS';
        if (i + 1 === total) type = 'UAS';

        meetings.push({
          classCourseId,
          meetingNumber: i + 1,
          date: sched.date ? new Date(sched.date) : undefined,
          type,
          mode: 'OFFLINE',
          isLocked: false,
          scheduleIdRef: sched.id,
        });
      }

      // Fill remaining if schedules < total
      if (schedules.length < total) {
        const lastDate = schedules[schedules.length - 1].date
          ? new Date(schedules[schedules.length - 1].date)
          : new Date();

        for (let i = schedules.length; i < total; i++) {
          const date = new Date(lastDate);
          date.setDate(date.getDate() + (i - schedules.length + 1) * 7);

          let type = 'KULIAH';
          if (i + 1 === Math.ceil(total / 2)) type = 'UTS';
          if (i + 1 === total) type = 'UAS';

          meetings.push({
            classCourseId,
            meetingNumber: i + 1,
            date,
            type,
            mode: 'OFFLINE',
            isLocked: false,
          });
        }
      }
    } else {
      // No schedules, use start date with weekly interval
      const startDate = classCourse.startDate
        ? new Date(classCourse.startDate)
        : new Date();

      for (let i = 0; i < total; i++) {
        const meetingDate = new Date(startDate);
        meetingDate.setDate(meetingDate.getDate() + i * 7);

        let type = 'KULIAH';
        if (i + 1 === Math.ceil(total / 2)) type = 'UTS';
        if (i + 1 === total) type = 'UAS';

        meetings.push({
          classCourseId,
          meetingNumber: i + 1,
          date: meetingDate,
          type,
          mode: 'OFFLINE',
          isLocked: false,
        });
      }
    }

    const saved = await this.meetingRepository.save(
      this.meetingRepository.create(meetings),
    );

    return {
      message: `Berhasil generate ${saved.length} pertemuan dari jadwal`,
      data: saved,
    };
  }

  async update(
    id: number,
    data: {
      topic?: string;
      notes?: string;
      mode?: string;
      type?: string;
      date?: string;
      materialFile?: string;
    },
  ) {
    const meeting = await this.meetingRepository.findOne({ where: { id } });
    if (!meeting) throw new NotFoundException('Pertemuan tidak ditemukan');

    if (meeting.isLocked) {
      throw new BadRequestException(
        'Pertemuan sudah di-lock dan tidak bisa diedit',
      );
    }

    if (data.topic !== undefined) meeting.topic = data.topic;
    if (data.notes !== undefined) meeting.notes = data.notes;
    if (data.mode !== undefined) meeting.mode = data.mode;
    if (data.type !== undefined) meeting.type = data.type;
    if (data.date !== undefined) meeting.date = new Date(data.date);
    if (data.materialFile !== undefined) meeting.materialFile = data.materialFile;

    await this.meetingRepository.save(meeting);

    return { message: 'Pertemuan berhasil diperbarui', data: meeting };
  }

  async lock(id: number) {
    const meeting = await this.meetingRepository.findOne({ where: { id } });
    if (!meeting) throw new NotFoundException('Pertemuan tidak ditemukan');

    meeting.isLocked = true;
    await this.meetingRepository.save(meeting);

    return { message: 'Pertemuan berhasil di-lock', data: meeting };
  }

  async unlock(id: number) {
    const meeting = await this.meetingRepository.findOne({ where: { id } });
    if (!meeting) throw new NotFoundException('Pertemuan tidak ditemukan');

    meeting.isLocked = false;
    await this.meetingRepository.save(meeting);

    return { message: 'Pertemuan berhasil di-unlock', data: meeting };
  }
}

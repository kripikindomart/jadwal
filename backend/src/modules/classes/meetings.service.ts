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
      throw new BadRequestException(
        `Sudah ada ${existing} pertemuan untuk class course ini. Hapus dulu jika ingin generate ulang.`,
      );
    }

    const total = totalMeetings || classCourse.totalMeetings || 16;

    // Try to get schedule for date calculation
    const schedule = await this.classScheduleRepository.findOne({
      where: { classCourseId },
      order: { date: 'ASC' },
    });

    const meetings: Partial<ClassMeeting>[] = [];
    const startDate = classCourse.startDate
      ? new Date(classCourse.startDate)
      : schedule?.date
        ? new Date(schedule.date)
        : new Date();

    for (let i = 1; i <= total; i++) {
      // Calculate date: start + (i-1) weeks
      const meetingDate = new Date(startDate);
      meetingDate.setDate(meetingDate.getDate() + (i - 1) * 7);

      // Determine type based on meeting number
      let type = 'KULIAH';
      if (i === Math.ceil(total / 2)) type = 'UTS';
      if (i === total) type = 'UAS';

      meetings.push({
        classCourseId,
        meetingNumber: i,
        date: meetingDate,
        type,
        mode: 'OFFLINE',
        topic: undefined,
        notes: undefined,
        materialFile: undefined,
        isLocked: false,
        scheduleIdRef: schedule?.id ?? undefined,
      });
    }

    const saved = await this.meetingRepository.save(
      this.meetingRepository.create(meetings),
    );

    return {
      message: `Berhasil generate ${total} pertemuan`,
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

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RescheduleRequest, ClassSchedule } from '../../database/entities';
import { RescheduleStatus } from '../../database/entities/reschedule-request.entity';

@Injectable()
export class RescheduleService {
  constructor(
    @InjectRepository(RescheduleRequest)
    private readonly requestRepo: Repository<RescheduleRequest>,
    @InjectRepository(ClassSchedule)
    private readonly scheduleRepo: Repository<ClassSchedule>,
  ) {}

  async createRequest(data: {
    scheduleId: number;
    requestedBy: number;
    newDate: string;
    newStartTime: string;
    newEndTime: string;
    newRoomId?: number;
    reason?: string;
  }) {
    const request = this.requestRepo.create({
      ...data,
      status: RescheduleStatus.PENDING,
    });
    await this.requestRepo.save(request);
    return { message: 'Request reschedule berhasil dikirim', data: request };
  }

  async findAll(filters: { status?: string; page?: number; limit?: number }) {
    const { status, page = 1, limit = 20 } = filters;

    let query = this.requestRepo
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.schedule', 'schedule')
      .leftJoinAndSelect('schedule.classCourse', 'cc')
      .leftJoinAndSelect('cc.course', 'course')
      .leftJoinAndSelect('cc.class', 'cls')
      .leftJoinAndSelect('r.requester', 'requester')
      .leftJoinAndSelect('r.newRoom', 'newRoom')
      .leftJoinAndSelect('schedule.room', 'oldRoom');

    if (status) query = query.andWhere('r.status = :status', { status });

    query = query.orderBy('r.createdAt', 'DESC');
    const total = await query.getCount();
    const data = await query.skip((page - 1) * limit).take(limit).getMany();

    return {
      data: data.map((r) => ({
        id: r.id,
        status: r.status,
        reason: r.reason,
        requesterName: r.requester?.name || '-',
        courseName: r.schedule?.classCourse?.course?.name || '-',
        className: r.schedule?.classCourse?.class?.name || '-',
        oldDate: r.schedule?.date,
        oldStartTime: r.schedule?.startTime,
        oldEndTime: r.schedule?.endTime,
        oldRoom: r.schedule?.room?.name || '-',
        newDate: r.newDate,
        newStartTime: r.newStartTime,
        newEndTime: r.newEndTime,
        newRoom: r.newRoom?.name || '-',
        adminNotes: r.adminNotes,
        createdAt: r.createdAt,
      })),
      total,
      page,
      limit,
    };
  }

  async approve(id: number, approvedBy: number, adminNotes?: string) {
    const request = await this.requestRepo.findOne({
      where: { id },
      relations: ['schedule'],
    });
    if (!request) throw new NotFoundException('Request tidak ditemukan');

    // Update the actual schedule
    const schedule = request.schedule;
    if (schedule) {
      schedule.date = request.newDate;
      schedule.startTime = request.newStartTime;
      schedule.endTime = request.newEndTime;
      if (request.newRoomId) schedule.roomId = request.newRoomId;
      // Recalculate dayOfWeek from new date
      const d = new Date(request.newDate);
      schedule.dayOfWeek = d.getDay();
      await this.scheduleRepo.save(schedule);
    }

    request.status = RescheduleStatus.APPROVED;
    request.approvedBy = approvedBy;
    if (adminNotes) request.adminNotes = adminNotes;
    await this.requestRepo.save(request);

    return { message: 'Request reschedule disetujui, jadwal telah diperbarui' };
  }

  async reject(id: number, approvedBy: number, adminNotes?: string) {
    const request = await this.requestRepo.findOne({ where: { id } });
    if (!request) throw new NotFoundException('Request tidak ditemukan');

    request.status = RescheduleStatus.REJECTED;
    request.approvedBy = approvedBy;
    if (adminNotes) request.adminNotes = adminNotes;
    await this.requestRepo.save(request);

    return { message: 'Request reschedule ditolak' };
  }
}

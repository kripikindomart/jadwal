import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GuidanceSchedule, LecturerProfile, StudentProfile } from '../../database/entities';
import { GuidanceStatus } from '../../database/entities/guidance-schedule.entity';

@Injectable()
export class GuidanceService {
  constructor(
    @InjectRepository(GuidanceSchedule)
    private readonly guidanceRepo: Repository<GuidanceSchedule>,
    @InjectRepository(LecturerProfile)
    private readonly lecturerProfileRepo: Repository<LecturerProfile>,
    @InjectRepository(StudentProfile)
    private readonly studentProfileRepo: Repository<StudentProfile>,
  ) {}

  // ============ STUDENT: Request Bimbingan ============

  async createRequest(studentId: number, data: {
    lecturerId: number;
    date: string;
    startTime: string;
    endTime: string;
    topic?: string;
    studentNotes?: string;
    type?: string;
  }) {
    // Check conflict: lecturer already has guidance at that time
    const conflict = await this.guidanceRepo
      .createQueryBuilder('g')
      .where('g.lecturerId = :lecturerId', { lecturerId: data.lecturerId })
      .andWhere('g.date = :date', { date: data.date })
      .andWhere('g.status IN (:...statuses)', { statuses: ['PENDING', 'APPROVED'] })
      .andWhere('((g.startTime <= :endTime AND g.endTime >= :startTime))', {
        startTime: data.startTime,
        endTime: data.endTime,
      })
      .getOne();

    if (conflict) {
      throw new BadRequestException('Dosen sudah memiliki jadwal bimbingan di waktu tersebut');
    }

    const guidance = this.guidanceRepo.create({
      studentId,
      lecturerId: data.lecturerId,
      date: data.date,
      startTime: data.startTime,
      endTime: data.endTime,
      topic: data.topic,
      studentNotes: data.studentNotes,
      type: data.type || 'TESIS',
      status: GuidanceStatus.PENDING,
    });

    await this.guidanceRepo.save(guidance);
    return { message: 'Request bimbingan berhasil dikirim', data: guidance };
  }

  async getMyRequests(studentId: number) {
    const requests = await this.guidanceRepo.find({
      where: { studentId },
      relations: ['lecturer', 'lecturer.lecturerProfile', 'room'],
      order: { date: 'DESC', startTime: 'ASC' },
    });

    return requests.map((r) => ({
      id: r.id,
      date: r.date,
      startTime: r.startTime,
      endTime: r.endTime,
      status: r.status,
      topic: r.topic,
      type: r.type,
      studentNotes: r.studentNotes,
      lecturerNotes: r.lecturerNotes,
      lecturerName: r.lecturer?.name || '-',
      room: r.room?.name || 'Belum ditentukan',
    }));
  }

  // ============ STUDENT PORTAL (via token) ============

  async getStudentPortalData(studentToken: string) {
    const profile = await this.studentProfileRepo.findOne({
      where: { nim: studentToken },
      relations: ['user'],
    });
    if (!profile) throw new NotFoundException('NIM tidak ditemukan');

    const requests = await this.getMyRequests(profile.userId);

    // Get available lecturers (dosen pembimbing)
    const lecturers = await this.lecturerProfileRepo.find({
      relations: ['user'],
    });

    return {
      student: {
        id: profile.userId,
        name: profile.user?.name || '-',
        nim: profile.nim,
      },
      requests,
      lecturers: lecturers.map((l) => ({
        id: l.userId,
        name: `${l.frontTitle || ''} ${l.user?.name || ''} ${l.backTitle || ''}`.trim(),
        nidn: l.nidn,
      })),
    };
  }

  async createRequestFromPortal(nim: string, data: {
    lecturerId: number;
    date: string;
    startTime: string;
    endTime: string;
    topic?: string;
    studentNotes?: string;
    type?: string;
  }) {
    const profile = await this.studentProfileRepo.findOne({ where: { nim } });
    if (!profile) throw new NotFoundException('NIM tidak ditemukan');

    return this.createRequest(profile.userId, data);
  }

  // ============ ADMIN: Manage Bimbingan ============

  async findAll(filters: {
    status?: string;
    lecturerId?: number;
    date?: string;
    page?: number;
    limit?: number;
  }) {
    const { status, lecturerId, date, page = 1, limit = 20 } = filters;

    let query = this.guidanceRepo
      .createQueryBuilder('g')
      .leftJoinAndSelect('g.student', 'student')
      .leftJoinAndSelect('student.studentProfile', 'sp')
      .leftJoinAndSelect('g.lecturer', 'lecturer')
      .leftJoinAndSelect('lecturer.lecturerProfile', 'lp')
      .leftJoinAndSelect('g.room', 'room');

    if (status) query = query.andWhere('g.status = :status', { status });
    if (lecturerId) query = query.andWhere('g.lecturerId = :lecturerId', { lecturerId });
    if (date) query = query.andWhere('g.date = :date', { date });

    query = query.orderBy('g.date', 'DESC').addOrderBy('g.startTime', 'ASC');

    const total = await query.getCount();
    const data = await query.skip((page - 1) * limit).take(limit).getMany();

    return {
      data: data.map((g) => ({
        id: g.id,
        date: g.date,
        startTime: g.startTime,
        endTime: g.endTime,
        status: g.status,
        topic: g.topic,
        type: g.type,
        studentName: g.student?.name || '-',
        studentNim: g.student?.studentProfile?.nim || '-',
        lecturerName: g.lecturer?.name || '-',
        room: g.room?.name || '-',
        studentNotes: g.studentNotes,
        lecturerNotes: g.lecturerNotes,
        createdAt: g.createdAt,
      })),
      total,
      page,
      limit,
    };
  }

  async updateStatus(id: number, data: {
    status: GuidanceStatus;
    roomId?: number;
    lecturerNotes?: string;
  }) {
    const guidance = await this.guidanceRepo.findOne({ where: { id } });
    if (!guidance) throw new NotFoundException('Jadwal bimbingan tidak ditemukan');

    guidance.status = data.status;
    if (data.roomId !== undefined) guidance.roomId = data.roomId;
    if (data.lecturerNotes !== undefined) guidance.lecturerNotes = data.lecturerNotes;

    await this.guidanceRepo.save(guidance);
    return { message: 'Status bimbingan berhasil diperbarui', data: guidance };
  }

  async createByAdmin(data: {
    studentId: number;
    lecturerId: number;
    date: string;
    startTime: string;
    endTime: string;
    roomId?: number;
    topic?: string;
    type?: string;
    status?: GuidanceStatus;
  }) {
    const guidance = this.guidanceRepo.create({
      ...data,
      status: data.status || GuidanceStatus.APPROVED,
    });
    await this.guidanceRepo.save(guidance);
    return { message: 'Jadwal bimbingan berhasil dibuat', data: guidance };
  }

  async delete(id: number) {
    await this.guidanceRepo.softDelete(id);
    return { message: 'Jadwal bimbingan berhasil dihapus' };
  }

  // ============ DISPLAY TV: Today's Guidance ============

  async getTodayGuidance() {
    const today = new Date().toISOString().split('T')[0];

    const data = await this.guidanceRepo.find({
      where: { date: today, status: GuidanceStatus.APPROVED },
      relations: ['student', 'student.studentProfile', 'lecturer', 'lecturer.lecturerProfile', 'room'],
      order: { startTime: 'ASC' },
    });

    return data.map((g) => ({
      time: g.startTime?.slice(0, 5),
      title: `Bimbingan ${g.type || 'Tesis'} - ${g.student?.name || '-'}`,
      info: `${g.lecturer?.lecturerProfile?.frontTitle || ''} ${g.lecturer?.name || '-'}, ${g.room?.name || 'TBA'}`.trim(),
    }));
  }
}

import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import {
  ThesisSubmission,
  ThesisSupervisor,
  ThesisExamSchedule,
  ThesisExaminer,
  GuidanceLog,
} from '../../database/entities';
import { ThesisStatus } from '../../database/entities/thesis-submission.entity';
import { ExamStatus } from '../../database/entities/thesis-exam-schedule.entity';

@Injectable()
export class ThesisService {
  constructor(
    @InjectRepository(ThesisSubmission)
    private readonly thesisRepo: Repository<ThesisSubmission>,
    @InjectRepository(ThesisSupervisor)
    private readonly supervisorRepo: Repository<ThesisSupervisor>,
    @InjectRepository(ThesisExamSchedule)
    private readonly examRepo: Repository<ThesisExamSchedule>,
    @InjectRepository(ThesisExaminer)
    private readonly examinerRepo: Repository<ThesisExaminer>,
    @InjectRepository(GuidanceLog)
    private readonly logRepo: Repository<GuidanceLog>,
  ) {}

  // ============ THESIS CRUD ============

  async findAll(filters: { prodiId?: number; status?: string; search?: string; page?: number; limit?: number }) {
    const { prodiId, status, search, page = 1, limit = 20 } = filters;

    let query = this.thesisRepo
      .createQueryBuilder('t')
      .leftJoinAndSelect('t.student', 'student')
      .leftJoinAndSelect('student.studentProfile', 'sp')
      .leftJoinAndSelect('t.prodi', 'prodi');

    if (prodiId) query = query.andWhere('t.prodiId = :prodiId', { prodiId });
    if (status) query = query.andWhere('t.status = :status', { status });
    if (search) query = query.andWhere('(t.title ILIKE :search OR student.name ILIKE :search)', { search: `%${search}%` });

    query = query.orderBy('t.createdAt', 'DESC');
    const total = await query.getCount();
    const data = await query.skip((page - 1) * limit).take(limit).getMany();

    // Get supervisors for each thesis
    const thesisIds = data.map(d => d.id);
    let supervisors: ThesisSupervisor[] = [];
    if (thesisIds.length > 0) {
      supervisors = await this.supervisorRepo.find({
        where: { thesisId: In(thesisIds) },
        relations: ['lecturer', 'lecturer.lecturerProfile'],
      });
    }

    const supervisorMap = new Map<number, ThesisSupervisor[]>();
    for (const s of supervisors) {
      if (!supervisorMap.has(s.thesisId)) supervisorMap.set(s.thesisId, []);
      supervisorMap.get(s.thesisId)!.push(s);
    }

    return {
      data: data.map(t => ({
        id: t.id,
        title: t.title,
        type: t.type,
        status: t.status,
        studentName: t.student?.name || '-',
        studentNim: t.student?.studentProfile?.nim || '-',
        prodiName: t.prodi?.name || '-',
        supervisors: (supervisorMap.get(t.id) || []).map(s => ({
          id: s.id,
          name: s.lecturer?.name || '-',
          role: s.role,
        })),
        submittedAt: t.submittedAt,
        createdAt: t.createdAt,
      })),
      total,
      page,
      limit,
    };
  }

  async findOne(id: number) {
    const thesis = await this.thesisRepo.findOne({
      where: { id },
      relations: ['student', 'student.studentProfile', 'prodi'],
    });
    if (!thesis) throw new NotFoundException('Tugas akhir tidak ditemukan');

    const supervisors = await this.supervisorRepo.find({
      where: { thesisId: id },
      relations: ['lecturer', 'lecturer.lecturerProfile'],
      order: { role: 'ASC' },
    });

    const exams = await this.examRepo.find({
      where: { thesisId: id },
      relations: ['room'],
      order: { date: 'ASC' },
    });

    const examIds = exams.map(e => e.id);
    let examiners: ThesisExaminer[] = [];
    if (examIds.length > 0) {
      examiners = await this.examinerRepo.find({
        where: { examScheduleId: In(examIds) },
        relations: ['lecturer', 'lecturer.lecturerProfile'],
      });
    }

    const logs = await this.logRepo.find({
      where: { thesisId: id },
      relations: ['lecturer'],
      order: { date: 'DESC' },
    });

    const guidanceCount = await this.logRepo.count({ where: { thesisId: id, status: 'DONE' } });

    return {
      ...thesis,
      studentName: thesis.student?.name,
      studentNim: thesis.student?.studentProfile?.nim,
      prodiName: thesis.prodi?.name,
      supervisors: supervisors.map(s => ({
        id: s.id,
        lecturerId: s.lecturerId,
        name: s.lecturer?.name || '-',
        fullName: `${s.lecturer?.lecturerProfile?.frontTitle || ''} ${s.lecturer?.name || ''} ${s.lecturer?.lecturerProfile?.backTitle || ''}`.trim(),
        role: s.role,
        skNumber: s.skNumber,
        assignedAt: s.assignedAt,
      })),
      exams: exams.map(e => ({
        id: e.id,
        type: e.type,
        date: e.date,
        startTime: e.startTime,
        endTime: e.endTime,
        room: e.room?.name || '-',
        status: e.status,
        score: e.score,
        result: e.result,
        revisionDeadline: e.revisionDeadline,
        revisionNotes: e.revisionNotes,
        examiners: examiners.filter(ex => ex.examScheduleId === e.id).map(ex => ({
          id: ex.id,
          lecturerId: ex.lecturerId,
          name: ex.lecturer?.name || '-',
          fullName: `${ex.lecturer?.lecturerProfile?.frontTitle || ''} ${ex.lecturer?.name || ''} ${ex.lecturer?.lecturerProfile?.backTitle || ''}`.trim(),
          role: ex.role,
          score: ex.score,
          notes: ex.notes,
        })),
      })),
      guidanceLogs: logs.map(l => ({
        id: l.id,
        date: l.date,
        topic: l.topic,
        notes: l.notes,
        chapter: l.chapter,
        nextAction: l.nextAction,
        lecturerName: l.lecturer?.name || '-',
        status: l.status,
      })),
      guidanceCount,
    };
  }

  // ============ KAPRODI: MAPPING PEMBIMBING ============

  async assignSupervisor(thesisId: number, data: { lecturerId: number; role: string; skNumber?: string }) {
    const thesis = await this.thesisRepo.findOne({ where: { id: thesisId } });
    if (!thesis) throw new NotFoundException('Tugas akhir tidak ditemukan');

    // Check if role already assigned
    const existing = await this.supervisorRepo.findOne({
      where: { thesisId, role: data.role },
    });
    if (existing) {
      // Update existing
      existing.lecturerId = data.lecturerId;
      if (data.skNumber) existing.skNumber = data.skNumber;
      await this.supervisorRepo.save(existing);
      return { message: `${data.role} berhasil diperbarui` };
    }

    const supervisor = this.supervisorRepo.create({
      thesisId,
      lecturerId: data.lecturerId,
      role: data.role,
      skNumber: data.skNumber,
    });
    await this.supervisorRepo.save(supervisor);

    // Update thesis status if both supervisors assigned
    const count = await this.supervisorRepo.count({ where: { thesisId } });
    if (count >= 1 && thesis.status === ThesisStatus.TITLE_APPROVED) {
      thesis.status = ThesisStatus.SUPERVISOR_ASSIGNED;
      await this.thesisRepo.save(thesis);
    }

    return { message: `${data.role} berhasil ditetapkan`, data: supervisor };
  }

  async removeSupervisor(supervisorId: number) {
    await this.supervisorRepo.delete(supervisorId);
    return { message: 'Pembimbing berhasil dihapus' };
  }

  // ============ KAPRODI: MAPPING PENGUJI ============

  async scheduleExam(thesisId: number, data: {
    type: string;
    date: string;
    startTime: string;
    endTime: string;
    roomId?: number;
  }) {
    const thesis = await this.thesisRepo.findOne({ where: { id: thesisId } });
    if (!thesis) throw new NotFoundException('Tugas akhir tidak ditemukan');

    const exam = this.examRepo.create({
      thesisId,
      type: data.type,
      date: data.date,
      startTime: data.startTime,
      endTime: data.endTime,
      roomId: data.roomId,
      status: ExamStatus.SCHEDULED,
    });
    await this.examRepo.save(exam);

    // Update thesis status
    if (data.type === 'SEMINAR_PROPOSAL' && thesis.status === ThesisStatus.PROPOSAL_GUIDANCE) {
      thesis.status = ThesisStatus.PROPOSAL_EXAM_SCHEDULED;
    } else if (data.type === 'SEMINAR_HASIL' && thesis.status === ThesisStatus.THESIS_GUIDANCE) {
      thesis.status = ThesisStatus.RESULT_EXAM_SCHEDULED;
    } else if (data.type === 'SIDANG_AKHIR') {
      thesis.status = ThesisStatus.FINAL_EXAM_SCHEDULED;
    }
    await this.thesisRepo.save(thesis);

    return { message: 'Sidang berhasil dijadwalkan', data: exam };
  }

  async assignExaminer(examScheduleId: number, data: { lecturerId: number; role: string }) {
    const exam = await this.examRepo.findOne({ where: { id: examScheduleId } });
    if (!exam) throw new NotFoundException('Jadwal sidang tidak ditemukan');

    const examiner = this.examinerRepo.create({
      examScheduleId,
      lecturerId: data.lecturerId,
      role: data.role,
    });
    await this.examinerRepo.save(examiner);

    return { message: `Penguji (${data.role}) berhasil ditambahkan`, data: examiner };
  }

  async removeExaminer(examinerId: number) {
    await this.examinerRepo.delete(examinerId);
    return { message: 'Penguji berhasil dihapus' };
  }

  async updateExamResult(examId: number, data: {
    status: ExamStatus;
    result?: string;
    score?: number;
    revisionDeadline?: string;
    revisionNotes?: string;
  }) {
    const exam = await this.examRepo.findOne({ where: { id: examId }, relations: ['thesis'] });
    if (!exam) throw new NotFoundException('Jadwal sidang tidak ditemukan');

    exam.status = data.status;
    if (data.result) exam.result = data.result;
    if (data.score) exam.score = data.score;
    if (data.revisionDeadline) exam.revisionDeadline = data.revisionDeadline;
    if (data.revisionNotes) exam.revisionNotes = data.revisionNotes;
    await this.examRepo.save(exam);

    // Update thesis status based on result
    const thesis = exam.thesis;
    if (data.status === ExamStatus.PASSED) {
      if (exam.type === 'SEMINAR_PROPOSAL') thesis.status = ThesisStatus.PROPOSAL_PASSED;
      else if (exam.type === 'SEMINAR_HASIL') thesis.status = ThesisStatus.RESULT_PASSED;
      else if (exam.type === 'SIDANG_AKHIR') {
        thesis.status = ThesisStatus.COMPLETED;
        thesis.completedAt = new Date();
      }
    } else if (data.status === ExamStatus.REVISION) {
      thesis.status = ThesisStatus.REVISION;
    }
    await this.thesisRepo.save(thesis);

    return { message: 'Hasil sidang berhasil disimpan' };
  }

  // ============ STATUS UPDATE ============

  async updateStatus(id: number, status: ThesisStatus) {
    const thesis = await this.thesisRepo.findOne({ where: { id } });
    if (!thesis) throw new NotFoundException('Tugas akhir tidak ditemukan');

    thesis.status = status;
    if (status === ThesisStatus.TITLE_APPROVED) thesis.approvedAt = new Date();
    if (status === ThesisStatus.SUBMITTED) thesis.submittedAt = new Date();
    await this.thesisRepo.save(thesis);

    return { message: 'Status berhasil diperbarui' };
  }

  // ============ GUIDANCE LOG ============

  async addGuidanceLog(thesisId: number, data: {
    lecturerId: number;
    studentId: number;
    date: string;
    startTime?: string;
    endTime?: string;
    topic: string;
    notes?: string;
    studentProgress?: string;
    nextAction?: string;
    chapter?: string;
    attachmentUrl?: string;
  }) {
    const log = this.logRepo.create({ thesisId, ...data, status: 'DONE' });
    await this.logRepo.save(log);
    return { message: 'Log bimbingan berhasil ditambahkan', data: log };
  }

  // ============ MONITORING ============

  async getMonitoring(prodiId?: number) {
    let query = this.thesisRepo.createQueryBuilder('t')
      .leftJoin('t.student', 'student')
      .leftJoin('t.prodi', 'prodi');

    if (prodiId) query = query.andWhere('t.prodiId = :prodiId', { prodiId });

    const all = await query.getMany();

    const statusCounts: Record<string, number> = {};
    for (const t of all) {
      statusCounts[t.status] = (statusCounts[t.status] || 0) + 1;
    }

    // Get students with no guidance in last 3 months
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const activeTheses = all.filter(t =>
      ![ThesisStatus.COMPLETED, ThesisStatus.DRAFT].includes(t.status as ThesisStatus)
    );

    const alerts: any[] = [];
    for (const t of activeTheses) {
      const lastLog = await this.logRepo.findOne({
        where: { thesisId: t.id },
        order: { date: 'DESC' },
      });
      if (!lastLog || new Date(lastLog.date) < threeMonthsAgo) {
        alerts.push({
          thesisId: t.id,
          studentId: t.studentId,
          title: t.title,
          lastGuidance: lastLog?.date || null,
          status: t.status,
        });
      }
    }

    return {
      total: all.length,
      statusCounts,
      alerts,
      activeCount: activeTheses.length,
      completedCount: all.filter(t => t.status === ThesisStatus.COMPLETED).length,
    };
  }
}

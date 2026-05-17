import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import {
  ThesisSubmission,
  ThesisSupervisor,
  ThesisExamSchedule,
  ThesisExaminer,
  GuidanceLog,
  Prodi,
} from '../../database/entities';
import { ThesisStatus } from '../../database/entities/thesis-submission.entity';
import { ExamStatus } from '../../database/entities/thesis-exam-schedule.entity';
import { ThesisFlowMode } from '../../database/entities/prodi.entity';

type AllowedExamType = 'SEMINAR_PROPOSAL' | 'SEMINAR_HASIL' | 'SIDANG_AKHIR';

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
    @InjectRepository(Prodi)
    private readonly prodiRepo: Repository<Prodi>,
  ) {}

  private normalizeFlowMode(mode?: string | null): ThesisFlowMode {
    if (mode === ThesisFlowMode.A) return ThesisFlowMode.A;
    if (mode === ThesisFlowMode.B) return ThesisFlowMode.B;
    return ThesisFlowMode.C;
  }

  private async getFlowModeByProdiId(prodiId: number): Promise<ThesisFlowMode> {
    const prodi = await this.prodiRepo.findOne({
      where: { id: prodiId },
      select: ['id', 'thesisFlowMode'],
    });
    return this.normalizeFlowMode(prodi?.thesisFlowMode);
  }

  private getAllowedExamTypes(mode: ThesisFlowMode): AllowedExamType[] {
    if (mode === ThesisFlowMode.A) return ['SEMINAR_HASIL', 'SIDANG_AKHIR'];
    if (mode === ThesisFlowMode.B) return ['SEMINAR_PROPOSAL', 'SIDANG_AKHIR'];
    return ['SEMINAR_PROPOSAL', 'SEMINAR_HASIL', 'SIDANG_AKHIR'];
  }

  private getNextExamType(
    mode: ThesisFlowMode,
    status: ThesisStatus,
  ): AllowedExamType | null {
    if (mode === ThesisFlowMode.A) {
      if (
        [
          ThesisStatus.SUPERVISOR_ASSIGNED,
          ThesisStatus.THESIS_GUIDANCE,
          ThesisStatus.REVISION_APPROVED,
        ].includes(status)
      ) {
        return 'SEMINAR_HASIL';
      }
      if (status === ThesisStatus.RESULT_PASSED) return 'SIDANG_AKHIR';
      return null;
    }

    if (mode === ThesisFlowMode.B) {
      if (
        [
          ThesisStatus.SUPERVISOR_ASSIGNED,
          ThesisStatus.PROPOSAL_GUIDANCE,
          ThesisStatus.REVISION_APPROVED,
        ].includes(status)
      ) {
        return 'SEMINAR_PROPOSAL';
      }
      if (status === ThesisStatus.PROPOSAL_PASSED) return 'SIDANG_AKHIR';
      return null;
    }

    if (
      [
        ThesisStatus.SUPERVISOR_ASSIGNED,
        ThesisStatus.PROPOSAL_GUIDANCE,
        ThesisStatus.REVISION_APPROVED,
      ].includes(status)
    ) {
      return 'SEMINAR_PROPOSAL';
    }
    if (status === ThesisStatus.PROPOSAL_PASSED) return 'SEMINAR_HASIL';
    if (status === ThesisStatus.RESULT_PASSED) return 'SIDANG_AKHIR';
    return null;
  }

  private getFlowStatusHint(mode: ThesisFlowMode): ThesisStatus {
    return mode === ThesisFlowMode.A
      ? ThesisStatus.THESIS_GUIDANCE
      : ThesisStatus.PROPOSAL_GUIDANCE;
  }

  private getAllowedActions(
    mode: ThesisFlowMode,
    status: ThesisStatus,
  ): string[] {
    const actions: string[] = [];
    if ([ThesisStatus.TITLE_APPROVED, ThesisStatus.SUPERVISOR_ASSIGNED].includes(status)) {
      actions.push('START_GUIDANCE');
    }
    if (status === ThesisStatus.PROPOSAL_PASSED && mode === ThesisFlowMode.C) {
      actions.push('MOVE_TO_THESIS_GUIDANCE');
    }
    if (status === ThesisStatus.REVISION) {
      actions.push('APPROVE_REVISION');
    }
    if (status === ThesisStatus.FINAL_EXAM_SCHEDULED) {
      actions.push('MARK_COMPLETED');
    }
    return actions;
  }

  private getExamTypeLabel(type: string): string {
    if (type === 'SEMINAR_PROPOSAL') return 'Seminar Proposal';
    if (type === 'SEMINAR_HASIL') return 'Seminar Hasil';
    if (type === 'SIDANG_AKHIR') return 'Sidang Akhir';
    return type;
  }

  // ============ THESIS CRUD ============

  async findAll(filters: { prodiId?: number | number[]; status?: string; search?: string; page?: number; limit?: number }) {
    const { prodiId, status, search, page = 1, limit = 20 } = filters;

    let query = this.thesisRepo
      .createQueryBuilder('t')
      .leftJoinAndSelect('t.student', 'student')
      .leftJoinAndSelect('student.studentProfile', 'sp')
      .leftJoinAndSelect('t.prodi', 'prodi');

    if (Array.isArray(prodiId)) {
      if (prodiId.length === 0) return { data: [], total: 0, page, limit };
      query = query.andWhere('t.prodiId IN (:...prodiIds)', { prodiIds: prodiId });
    } else if (typeof prodiId === 'number') {
      query = query.andWhere('t.prodiId = :prodiId', { prodiId });
    }
    if (status) query = query.andWhere('t.status = :status', { status });
    if (search) query = query.andWhere('(t.title ILIKE :search OR student.name ILIKE :search)', { search: `%${search}%` });

    query = query.orderBy('t.createdAt', 'DESC');
    const allData = await query.getMany();

    // Group by student
    const studentMap = new Map<number, { student: any; proposals: any[] }>();
    for (const t of allData) {
      if (!studentMap.has(t.studentId)) {
        studentMap.set(t.studentId, {
          student: {
            id: t.studentId,
            name: t.student?.name || '-',
            nim: t.student?.studentProfile?.nim || '-',
            prodi: t.prodi?.name || '-',
          },
          proposals: [],
        });
      }
      studentMap.get(t.studentId)!.proposals.push({
        id: t.id,
        title: t.title,
        type: t.type,
        status: t.status,
        submittedAt: t.submittedAt,
        flowMode: this.normalizeFlowMode(t.prodi?.thesisFlowMode),
      });
    }

    const grouped = Array.from(studentMap.values());
    const total = grouped.length;
    const paginated = grouped.slice((page - 1) * limit, page * limit);

    return {
      data: paginated.map(g => ({
        studentId: g.student.id,
        studentName: g.student.name,
        studentNim: g.student.nim,
        prodiName: g.student.prodi,
        proposalCount: g.proposals.length,
        latestStatus: g.proposals[0]?.status || '-',
        latestTitle: g.proposals[0]?.title || '-',
        latestFlowMode: g.proposals[0]?.flowMode || ThesisFlowMode.C,
        proposals: g.proposals,
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

  async getThesisProdiId(id: number): Promise<number | null> {
    const thesis = await this.thesisRepo.findOne({
      where: { id },
      select: ['id', 'prodiId'],
    });
    return thesis?.prodiId ?? null;
  }

  async getFlowInfo(id: number) {
    const thesis = await this.thesisRepo.findOne({ where: { id } });
    if (!thesis) throw new NotFoundException('Tugas akhir tidak ditemukan');

    const flowMode = await this.getFlowModeByProdiId(thesis.prodiId);
    const allowedExamTypes = this.getAllowedExamTypes(flowMode);
    const nextExamType = this.getNextExamType(flowMode, thesis.status);

    const exams = await this.examRepo.find({
      where: { thesisId: id },
      order: { date: 'ASC', startTime: 'ASC' },
    });

    return {
      thesisId: thesis.id,
      currentStatus: thesis.status,
      flowMode,
      allowedExamTypes,
      nextExamType,
      allowedActions: this.getAllowedActions(flowMode, thesis.status),
      exams: exams.map((e) => ({
        id: e.id,
        type: e.type,
        status: e.status,
        date: e.date,
      })),
    };
  }

  async getHistory(id: number) {
    const thesis = await this.thesisRepo.findOne({
      where: { id },
      relations: ['prodi'],
    });
    if (!thesis) throw new NotFoundException('Tugas akhir tidak ditemukan');

    const supervisors = await this.supervisorRepo.find({
      where: { thesisId: id },
      relations: ['lecturer'],
      order: { assignedAt: 'ASC' },
    });

    const exams = await this.examRepo.find({
      where: { thesisId: id },
      order: { date: 'ASC', startTime: 'ASC' },
    });

    const logs = await this.logRepo.find({
      where: { thesisId: id },
      relations: ['lecturer'],
      order: { date: 'ASC', createdAt: 'ASC' },
    });

    const timeline: Array<{
      timestamp: string;
      type: string;
      title: string;
      description?: string;
      meta?: Record<string, any>;
    }> = [];

    timeline.push({
      timestamp: thesis.createdAt.toISOString(),
      type: 'THESIS_CREATED',
      title: 'Pengajuan proposal dibuat',
      description: thesis.title,
    });

    if (thesis.submittedAt) {
      timeline.push({
        timestamp: thesis.submittedAt.toISOString(),
        type: 'THESIS_SUBMITTED',
        title: 'Proposal diajukan',
      });
    }

    if (thesis.approvedAt) {
      timeline.push({
        timestamp: thesis.approvedAt.toISOString(),
        type: 'TITLE_APPROVED',
        title: 'Judul disetujui',
      });
    }

    for (const supervisor of supervisors) {
      timeline.push({
        timestamp: supervisor.assignedAt.toISOString(),
        type: 'SUPERVISOR_ASSIGNED',
        title: `Pembimbing ditetapkan (${supervisor.role})`,
        description: supervisor.lecturer?.name || '-',
        meta: {
          role: supervisor.role,
          lecturerId: supervisor.lecturerId,
          skNumber: supervisor.skNumber,
        },
      });
    }

    for (const log of logs) {
      timeline.push({
        timestamp: log.createdAt.toISOString(),
        type: 'GUIDANCE_LOG',
        title: 'Bimbingan tercatat',
        description: log.topic,
        meta: {
          guidanceDate: log.date,
          lecturerName: log.lecturer?.name || '-',
          chapter: log.chapter,
          status: log.status,
        },
      });
    }

    for (const exam of exams) {
      timeline.push({
        timestamp: exam.createdAt.toISOString(),
        type: 'EXAM_SCHEDULED',
        title: `${this.getExamTypeLabel(exam.type)} dijadwalkan`,
        meta: {
          examType: exam.type,
          examDate: exam.date,
          startTime: exam.startTime,
          endTime: exam.endTime,
        },
      });

      if (exam.status !== ExamStatus.SCHEDULED) {
        timeline.push({
          timestamp: exam.updatedAt.toISOString(),
          type: 'EXAM_RESULT',
          title: `Hasil ${this.getExamTypeLabel(exam.type)}: ${exam.status}`,
          description: exam.result || undefined,
          meta: {
            examType: exam.type,
            status: exam.status,
            score: exam.score,
            revisionDeadline: exam.revisionDeadline,
          },
        });
      }
    }

    if (thesis.completedAt) {
      timeline.push({
        timestamp: thesis.completedAt.toISOString(),
        type: 'THESIS_COMPLETED',
        title: 'Tugas akhir selesai',
      });
    }

    timeline.sort((a, b) => a.timestamp.localeCompare(b.timestamp));

    return {
      thesisId: thesis.id,
      flowMode: this.normalizeFlowMode(thesis.prodi?.thesisFlowMode),
      currentStatus: thesis.status,
      timeline,
    };
  }

  // ============ KAPRODI: MAPPING PEMBIMBING ============

  async assignSupervisor(thesisId: number, data: { lecturerId: number; role: string; skNumber?: string }) {
    const thesis = await this.thesisRepo.findOne({ where: { id: thesisId } });
    if (!thesis) throw new NotFoundException('Tugas akhir tidak ditemukan');
    const flowMode = await this.getFlowModeByProdiId(thesis.prodiId);

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
      // Auto move to first guidance stage based on prodi flow mode.
      thesis.status = this.getFlowStatusHint(flowMode);
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
    const flowMode = await this.getFlowModeByProdiId(thesis.prodiId);

    const examType = data.type as AllowedExamType;
    const allowedExamTypes = this.getAllowedExamTypes(flowMode);
    if (!allowedExamTypes.includes(examType)) {
      throw new BadRequestException(
        `Mode prodi ${flowMode} tidak mengizinkan ujian ${data.type}`,
      );
    }

    const nextExamType = this.getNextExamType(flowMode, thesis.status);
    if (!nextExamType) {
      throw new BadRequestException(
        `Status saat ini (${thesis.status}) belum memenuhi syarat penjadwalan ujian`,
      );
    }
    if (nextExamType !== examType) {
      throw new BadRequestException(
        `Urutan ujian tidak valid. Ujian berikutnya yang diizinkan: ${nextExamType}`,
      );
    }

    const existingExam = await this.examRepo.findOne({
      where: { thesisId, type: examType },
    });
    if (existingExam) {
      throw new BadRequestException(
        `Ujian ${examType} sudah pernah dijadwalkan untuk tugas akhir ini`,
      );
    }

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
    } else if (data.type === 'SEMINAR_HASIL' && thesis.status === ThesisStatus.PROPOSAL_PASSED) {
      thesis.status = ThesisStatus.RESULT_EXAM_SCHEDULED;
    } else if (data.type === 'SEMINAR_HASIL' && thesis.status === ThesisStatus.REVISION_APPROVED) {
      thesis.status = ThesisStatus.RESULT_EXAM_SCHEDULED;
    } else if (data.type === 'SEMINAR_PROPOSAL' && thesis.status === ThesisStatus.REVISION_APPROVED) {
      thesis.status = ThesisStatus.PROPOSAL_EXAM_SCHEDULED;
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
    const flowMode = await this.getFlowModeByProdiId(exam.thesis.prodiId);

    exam.status = data.status;
    if (data.result) exam.result = data.result;
    if (data.score !== undefined) exam.score = data.score;
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
    } else if (data.status === ExamStatus.FAILED) {
      if (exam.type === 'SEMINAR_PROPOSAL') {
        thesis.status = ThesisStatus.PROPOSAL_GUIDANCE;
      } else if (exam.type === 'SEMINAR_HASIL') {
        thesis.status =
          flowMode === ThesisFlowMode.A
            ? ThesisStatus.THESIS_GUIDANCE
            : ThesisStatus.THESIS_GUIDANCE;
      } else if (exam.type === 'SIDANG_AKHIR') {
        thesis.status = ThesisStatus.THESIS_GUIDANCE;
      }
    }
    await this.thesisRepo.save(thesis);

    return { message: 'Hasil sidang berhasil disimpan' };
  }

  // ============ STATUS UPDATE ============

  async applyTransition(
    id: number,
    action:
      | 'START_GUIDANCE'
      | 'MOVE_TO_THESIS_GUIDANCE'
      | 'APPROVE_REVISION'
      | 'MARK_COMPLETED',
  ) {
    const thesis = await this.thesisRepo.findOne({ where: { id } });
    if (!thesis) throw new NotFoundException('Tugas akhir tidak ditemukan');
    const flowMode = await this.getFlowModeByProdiId(thesis.prodiId);

    if (action === 'START_GUIDANCE') {
      if (
        ![ThesisStatus.TITLE_APPROVED, ThesisStatus.SUPERVISOR_ASSIGNED].includes(
          thesis.status,
        )
      ) {
        throw new BadRequestException(
          `Status ${thesis.status} tidak bisa pindah ke tahap bimbingan`,
        );
      }
      thesis.status = this.getFlowStatusHint(flowMode);
    } else if (action === 'MOVE_TO_THESIS_GUIDANCE') {
      if (thesis.status !== ThesisStatus.PROPOSAL_PASSED) {
        throw new BadRequestException(
          `Status ${thesis.status} tidak bisa dipindah ke bimbingan tesis`,
        );
      }
      thesis.status = ThesisStatus.THESIS_GUIDANCE;
    } else if (action === 'APPROVE_REVISION') {
      if (thesis.status !== ThesisStatus.REVISION) {
        throw new BadRequestException(
          `Status ${thesis.status} tidak berada di tahap revisi`,
        );
      }
      thesis.status = ThesisStatus.REVISION_APPROVED;
    } else if (action === 'MARK_COMPLETED') {
      if (thesis.status !== ThesisStatus.FINAL_EXAM_SCHEDULED) {
        throw new BadRequestException(
          `Status ${thesis.status} belum siap ditutup`,
        );
      }
      thesis.status = ThesisStatus.COMPLETED;
      thesis.completedAt = new Date();
    }

    await this.thesisRepo.save(thesis);
    return { message: 'Transisi status berhasil', status: thesis.status };
  }

  async updateStatus(id: number, status: ThesisStatus) {
    const thesis = await this.thesisRepo.findOne({ where: { id } });
    if (!thesis) throw new NotFoundException('Tugas akhir tidak ditemukan');
    const flowMode = await this.getFlowModeByProdiId(thesis.prodiId);

    const allowedManualStatusesByMode: Record<ThesisFlowMode, ThesisStatus[]> = {
      [ThesisFlowMode.A]: [
        ThesisStatus.DRAFT,
        ThesisStatus.SUBMITTED,
        ThesisStatus.TITLE_APPROVED,
        ThesisStatus.SUPERVISOR_ASSIGNED,
        ThesisStatus.THESIS_GUIDANCE,
        ThesisStatus.RESULT_EXAM_SCHEDULED,
        ThesisStatus.RESULT_PASSED,
        ThesisStatus.FINAL_EXAM_SCHEDULED,
        ThesisStatus.REVISION,
        ThesisStatus.REVISION_APPROVED,
        ThesisStatus.COMPLETED,
      ],
      [ThesisFlowMode.B]: [
        ThesisStatus.DRAFT,
        ThesisStatus.SUBMITTED,
        ThesisStatus.TITLE_APPROVED,
        ThesisStatus.SUPERVISOR_ASSIGNED,
        ThesisStatus.PROPOSAL_GUIDANCE,
        ThesisStatus.PROPOSAL_EXAM_SCHEDULED,
        ThesisStatus.PROPOSAL_PASSED,
        ThesisStatus.FINAL_EXAM_SCHEDULED,
        ThesisStatus.REVISION,
        ThesisStatus.REVISION_APPROVED,
        ThesisStatus.COMPLETED,
      ],
      [ThesisFlowMode.C]: [
        ThesisStatus.DRAFT,
        ThesisStatus.SUBMITTED,
        ThesisStatus.TITLE_APPROVED,
        ThesisStatus.SUPERVISOR_ASSIGNED,
        ThesisStatus.PROPOSAL_GUIDANCE,
        ThesisStatus.PROPOSAL_EXAM_SCHEDULED,
        ThesisStatus.PROPOSAL_PASSED,
        ThesisStatus.THESIS_GUIDANCE,
        ThesisStatus.RESULT_EXAM_SCHEDULED,
        ThesisStatus.RESULT_PASSED,
        ThesisStatus.FINAL_EXAM_SCHEDULED,
        ThesisStatus.REVISION,
        ThesisStatus.REVISION_APPROVED,
        ThesisStatus.COMPLETED,
      ],
    };

    if (!allowedManualStatusesByMode[flowMode].includes(status)) {
      throw new BadRequestException(
        `Mode prodi ${flowMode} tidak mengizinkan status ${status}`,
      );
    }

    // Validasi: tidak bisa approve jika mahasiswa sudah punya proposal yang approved
    if (status === ThesisStatus.TITLE_APPROVED) {
      const existingApproved = await this.thesisRepo
        .createQueryBuilder('t')
        .where('t.studentId = :studentId', { studentId: thesis.studentId })
        .andWhere('t.id != :id', { id })
        .andWhere('t.status NOT IN (:...rejectedStatuses)', {
          rejectedStatuses: [ThesisStatus.DRAFT, ThesisStatus.SUBMITTED, ThesisStatus.REVISION],
        })
        .getOne();

      if (existingApproved) {
        throw new BadRequestException(
          'Mahasiswa ini sudah memiliki proposal yang disetujui. Batalkan atau reject proposal sebelumnya terlebih dahulu.'
        );
      }
    }

    // Prevent direct status jumps that bypass key workflow stages.
    const directAllowedTransitions: Partial<Record<ThesisStatus, ThesisStatus[]>> = {
      [ThesisStatus.DRAFT]: [ThesisStatus.SUBMITTED],
      [ThesisStatus.SUBMITTED]: [ThesisStatus.TITLE_APPROVED, ThesisStatus.REVISION],
      [ThesisStatus.TITLE_APPROVED]: [ThesisStatus.SUPERVISOR_ASSIGNED],
      [ThesisStatus.SUPERVISOR_ASSIGNED]: [this.getFlowStatusHint(flowMode)],
      [ThesisStatus.PROPOSAL_GUIDANCE]: [ThesisStatus.PROPOSAL_EXAM_SCHEDULED],
      [ThesisStatus.PROPOSAL_EXAM_SCHEDULED]: [ThesisStatus.PROPOSAL_PASSED, ThesisStatus.REVISION],
      [ThesisStatus.PROPOSAL_PASSED]:
        flowMode === ThesisFlowMode.C
          ? [ThesisStatus.THESIS_GUIDANCE]
          : [ThesisStatus.FINAL_EXAM_SCHEDULED],
      [ThesisStatus.THESIS_GUIDANCE]: [ThesisStatus.RESULT_EXAM_SCHEDULED],
      [ThesisStatus.RESULT_EXAM_SCHEDULED]: [ThesisStatus.RESULT_PASSED, ThesisStatus.REVISION],
      [ThesisStatus.RESULT_PASSED]: [ThesisStatus.FINAL_EXAM_SCHEDULED],
      [ThesisStatus.FINAL_EXAM_SCHEDULED]: [ThesisStatus.COMPLETED, ThesisStatus.REVISION],
      [ThesisStatus.REVISION]: [ThesisStatus.REVISION_APPROVED],
      [ThesisStatus.REVISION_APPROVED]:
        flowMode === ThesisFlowMode.A
          ? [ThesisStatus.THESIS_GUIDANCE]
          : flowMode === ThesisFlowMode.B
          ? [ThesisStatus.PROPOSAL_GUIDANCE]
          : [ThesisStatus.PROPOSAL_GUIDANCE, ThesisStatus.THESIS_GUIDANCE],
    };

    if (status !== thesis.status) {
      const allowedTargets = directAllowedTransitions[thesis.status] || [];
      if (!allowedTargets.includes(status)) {
        throw new BadRequestException(
          `Transisi langsung dari ${thesis.status} ke ${status} tidak diizinkan. Gunakan endpoint transition atau alur ujian.`,
        );
      }
    }

    thesis.status = status;
    if (status === ThesisStatus.TITLE_APPROVED) thesis.approvedAt = new Date();
    if (status === ThesisStatus.SUBMITTED) thesis.submittedAt = new Date();
    if (status === ThesisStatus.COMPLETED) thesis.completedAt = new Date();
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

  async getMonitoring(prodiId?: number | number[]) {
    let query = this.thesisRepo.createQueryBuilder('t')
      .leftJoin('t.student', 'student')
      .leftJoin('t.prodi', 'prodi');

    if (Array.isArray(prodiId)) {
      if (prodiId.length === 0) {
        return {
          total: 0,
          statusCounts: {},
          alerts: [],
          activeCount: 0,
          completedCount: 0,
        };
      }
      query = query.andWhere('t.prodiId IN (:...prodiIds)', { prodiIds: prodiId });
    } else if (typeof prodiId === 'number') {
      query = query.andWhere('t.prodiId = :prodiId', { prodiId });
    }

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

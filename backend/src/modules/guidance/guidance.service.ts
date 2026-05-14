import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GuidanceSchedule, LecturerProfile, StudentProfile, ThesisSubmission, Concentration } from '../../database/entities';
import { GuidanceStatus } from '../../database/entities/guidance-schedule.entity';
import { ThesisStatus } from '../../database/entities/thesis-submission.entity';

@Injectable()
export class GuidanceService {
  constructor(
    @InjectRepository(GuidanceSchedule)
    private readonly guidanceRepo: Repository<GuidanceSchedule>,
    @InjectRepository(LecturerProfile)
    private readonly lecturerProfileRepo: Repository<LecturerProfile>,
    @InjectRepository(StudentProfile)
    private readonly studentProfileRepo: Repository<StudentProfile>,
    @InjectRepository(ThesisSubmission)
    private readonly thesisRepo: Repository<ThesisSubmission>,
    @InjectRepository(Concentration)
    private readonly concentrationRepo: Repository<Concentration>,
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

  // ============ STUDENT PORTAL: THESIS ============

  async getMyThesisById(userId: number) {
    const theses = await this.thesisRepo.find({
      where: { studentId: userId },
      order: { createdAt: 'DESC' },
    });
    return theses;
  }

  async getAvailableLecturers() {
    const lecturers = await this.lecturerProfileRepo.find({
      relations: ['user'],
    });
    return lecturers.map((l) => ({
      id: l.userId,
      name: l.user?.name || '-',
      fullName: `${l.frontTitle || ''} ${l.user?.name || ''} ${l.backTitle || ''}`.trim(),
      nidn: l.nidn,
    }));
  }

  async getAvailableConcentrations() {
    const data = await this.concentrationRepo.find({
      where: { isActive: true },
      relations: ['prodi'],
      order: { name: 'ASC' },
    });
    return data.map((c) => ({
      id: c.id,
      name: c.name,
      prodi: c.prodi?.name || '-',
    }));
  }

  async submitThesisAuth(userId: number, data: {
    title: string; titleEn?: string; abstract?: string; type?: string;
    keywords?: string; concentration?: string;
    supervisorId1?: number; supervisorId2?: number; documentUrl?: string;
  }) {
    const profile = await this.studentProfileRepo.findOne({ where: { userId } });
    if (!profile) throw new NotFoundException('Profil mahasiswa tidak ditemukan');

    // Check: max 3 proposals, and none approved
    const existing = await this.thesisRepo.find({ where: { studentId: userId } });
    const hasApproved = existing.some(t => t.status !== ThesisStatus.DRAFT && t.status !== ThesisStatus.SUBMITTED && t.status !== ThesisStatus.REVISION);
    if (hasApproved) {
      throw new BadRequestException('Anda sudah memiliki proposal yang disetujui. Tidak bisa mengajukan lagi.');
    }
    if (existing.length >= 3) {
      throw new BadRequestException('Maksimal 3 proposal. Hapus atau tunggu review proposal sebelumnya.');
    }

    const thesis = this.thesisRepo.create({
      studentId: userId,
      prodiId: profile.prodiId,
      title: data.title,
      titleEn: data.titleEn,
      abstract: data.abstract,
      type: data.type || 'TESIS',
      keywords: data.keywords,
      concentration: data.concentration,
      documentUrl: data.documentUrl,
      plagiarismUrl: (data as any).plagiarismUrl,
      requestedSupervisorId1: data.supervisorId1,
      requestedSupervisorId2: data.supervisorId2,
      status: ThesisStatus.SUBMITTED,
      submittedAt: new Date(),
    });
    await this.thesisRepo.save(thesis);

    return { message: 'Proposal berhasil diajukan', data: thesis };
  }

  async updateThesisDraft(userId: number, thesisId: number, data: any) {
    const thesis = await this.thesisRepo.findOne({ where: { id: thesisId, studentId: userId } });
    if (!thesis) throw new NotFoundException('Tugas akhir tidak ditemukan');

    if (data.title !== undefined) thesis.title = data.title;
    if (data.titleEn !== undefined) thesis.titleEn = data.titleEn;
    if (data.abstract !== undefined) thesis.abstract = data.abstract;
    if (data.type !== undefined) thesis.type = data.type;

    await this.thesisRepo.save(thesis);
    return { message: 'Draft berhasil disimpan', data: thesis };
  }

  async uploadThesisFile(userId: number, file: any): Promise<{ url: string }> {
    const { createClient } = await import('@supabase/supabase-js');
    const supabaseUrl = process.env.SUPABASE_URL || 'https://thhtumfgfrcjuznfgmoy.supabase.co';
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_ANON_KEY || '';
    const bucket = (process.env.SUPABASE_BUCKET || 'uploads').trim();

    const supabase = createClient(supabaseUrl, supabaseKey);

    const ext = file.originalname.split('.').pop() || 'pdf';
    const filename = `thesis/${userId}-${Date.now()}.${ext}`;

    const { error } = await supabase.storage
      .from(bucket)
      .upload(filename, file.buffer, { contentType: file.mimetype, upsert: true });

    if (error) {
      throw new BadRequestException('Gagal upload file: ' + error.message);
    }

    const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(filename);
    return { url: publicUrlData.publicUrl };
  }

  async submitThesisFromPortal(nim: string, data: { title: string; titleEn?: string; abstract?: string; type?: string }) {
    const profile = await this.studentProfileRepo.findOne({ where: { nim } });
    if (!profile) throw new NotFoundException('NIM tidak ditemukan');

    const thesis = this.thesisRepo.create({
      studentId: profile.userId,
      prodiId: profile.prodiId,
      title: data.title,
      titleEn: data.titleEn,
      abstract: data.abstract,
      type: data.type || 'TESIS',
      status: ThesisStatus.SUBMITTED,
      submittedAt: new Date(),
    });
    await this.thesisRepo.save(thesis);

    return { message: 'Judul tugas akhir berhasil diajukan', data: thesis };
  }

  async getMyThesis(nim: string) {
    const profile = await this.studentProfileRepo.findOne({ where: { nim } });
    if (!profile) throw new NotFoundException('NIM tidak ditemukan');

    const theses = await this.thesisRepo.find({
      where: { studentId: profile.userId },
      order: { createdAt: 'DESC' },
    });

    return theses.map(t => ({
      id: t.id,
      title: t.title,
      type: t.type,
      status: t.status,
      submittedAt: t.submittedAt,
      approvedAt: t.approvedAt,
    }));
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

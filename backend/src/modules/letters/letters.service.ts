import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull, ILike } from 'typeorm';
import * as fs from 'fs/promises';
import { join } from 'path';
import { LetterType } from '../../database/entities/letter-type.entity';
import { LetterTemplate } from '../../database/entities/letter-template.entity';
import {
  LetterRequest,
  LetterRequestStatus,
} from '../../database/entities/letter-request.entity';
import { Prodi } from '../../database/entities/prodi.entity';
import { StudentProfile } from '../../database/entities/student-profile.entity';
import { User } from '../../database/entities/user.entity';
import { LecturerProfile } from '../../database/entities/lecturer-profile.entity';
import { Concentration } from '../../database/entities/concentration.entity';
import {
  CreateLetterTypeDto,
  UpdateLetterTypeDto,
  SubmitLetterRequestDto,
  UpdateLetterRequestStatusDto,
} from './dto/letter.dto';
import {
  CreateLetterTemplateDto,
  UpdateLetterTemplateDto,
} from './dto/letter-template.dto';

@Injectable()
export class LettersService {
  constructor(
    @InjectRepository(LetterTemplate)
    private readonly templateRepo: Repository<LetterTemplate>,
    @InjectRepository(LetterType)
    private readonly typeRepo: Repository<LetterType>,
    @InjectRepository(LetterRequest)
    private readonly requestRepo: Repository<LetterRequest>,
    @InjectRepository(Prodi)
    private readonly prodiRepo: Repository<Prodi>,
    @InjectRepository(StudentProfile)
    private readonly studentProfileRepo: Repository<StudentProfile>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(LecturerProfile)
    private readonly lecturerProfileRepo: Repository<LecturerProfile>,
    @InjectRepository(Concentration)
    private readonly concentrationRepo: Repository<Concentration>,
  ) {}

  // ====== Letter Templates (Admin) ======

  async findAllTemplates() {
    return this.templateRepo.find({
      order: { createdAt: 'DESC' },
    });
  }

  async findTemplateById(id: number) {
    const template = await this.templateRepo.findOne({ where: { id } });
    if (!template)
      throw new NotFoundException('Template Surat tidak ditemukan');
    return template;
  }

  async createTemplate(dto: CreateLetterTemplateDto) {
    const template = this.templateRepo.create(dto);
    return this.templateRepo.save(template);
  }

  async updateTemplate(id: number, dto: UpdateLetterTemplateDto) {
    const template = await this.findTemplateById(id);
    Object.assign(template, dto);
    return this.templateRepo.save(template);
  }

  async deleteTemplate(id: number) {
    const template = await this.findTemplateById(id);
    await this.templateRepo.remove(template);
    return { success: true };
  }

  // ====== Letter Types (Admin) ======

  async findAllTypes() {
    return this.typeRepo.find({
      relations: ['template'],
      order: { createdAt: 'DESC' },
    });
  }

  async findTypeById(id: number) {
    const type = await this.typeRepo.findOne({ where: { id } });
    if (!type) throw new NotFoundException('Jenis surat tidak ditemukan');
    return type;
  }

  async createType(dto: CreateLetterTypeDto) {
    const type = this.typeRepo.create(dto);
    return this.typeRepo.save(type);
  }

  async updateType(id: number, dto: UpdateLetterTypeDto) {
    const type = await this.findTypeById(id);
    Object.assign(type, dto);
    return this.typeRepo.save(type);
  }

  async deleteType(id: number) {
    const type = await this.findTypeById(id);
    return this.typeRepo.remove(type);
  }

  // ====== Letter Requests (Admin) ======

  async findAllRequests(status?: LetterRequestStatus) {
    const qb = this.requestRepo
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.letterType', 'lt')
      .orderBy('r.createdAt', 'DESC');

    if (status) {
      qb.where('r.status = :status', { status });
    }

    return qb.getMany();
  }

  async findRequestById(id: number) {
    const request = await this.requestRepo.findOne({
      where: { id },
      relations: ['letterType', 'letterType.template', 'prodi'],
    });
    if (!request)
      throw new NotFoundException('Pengajuan surat tidak ditemukan');
    return request;
  }

  async updateRequestStatus(id: number, dto: UpdateLetterRequestStatusDto) {
    const request = await this.findRequestById(id);
    request.status = dto.status;
    if (dto.adminNotes !== undefined) {
      request.adminNotes = dto.adminNotes;
    }
    return this.requestRepo.save(request);
  }

  async deleteRequest(id: number) {
    const request = await this.findRequestById(id);
    return this.requestRepo.remove(request);
  }

  async updateRequestData(id: number, submittedData: any) {
    const request = await this.findRequestById(id);
    request.submittedData = submittedData;
    return this.requestRepo.save(request);
  }

  async updateRequestMetadata(
    id: number,
    dto: {
      nomorSurat?: string;
      lampiran?: string;
      perihal?: string;
      tanggalSurat?: string;
    },
  ) {
    const request = await this.findRequestById(id);
    if (dto.nomorSurat !== undefined) request.nomorSurat = dto.nomorSurat;
    if (dto.lampiran !== undefined) request.lampiran = dto.lampiran;
    if (dto.perihal !== undefined) request.perihal = dto.perihal;
    if (dto.tanggalSurat !== undefined) request.tanggalSurat = dto.tanggalSurat;
    return this.requestRepo.save(request);
  }

  // ====== Media Library ======
  async getMediaLibrary() {
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabaseUrl =
        process.env.SUPABASE_URL || 'https://thhtumfgfrcjuznfgmoy.supabase.co';
      const supabaseKey =
        process.env.SUPABASE_SERVICE_ROLE ||
        process.env.SUPABASE_ANON_KEY ||
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRoaHR1bWZnZnJjanV6bmZnbW95Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjgzODA2MSwiZXhwIjoyMDg4NDE0MDYxfQ.bbD4pU_047MTxMs2QVeydwNe2fbtmbNSYWv72TubriA';
      const bucket = (process.env.SUPABASE_BUCKET || 'uploads').trim();

      const supabase = createClient(supabaseUrl, supabaseKey);

      const { data, error } = await supabase.storage
        .from(bucket)
        .list('letters', {
          limit: 100,
          sortBy: { column: 'created_at', order: 'desc' },
        });

      if (error || !data) {
        console.error('Supabase list error:', error);
        return [];
      }

      return data
        .filter((f) => f.name && !f.name.startsWith('.'))
        .map((f) => {
          const { data: urlData } = supabase.storage
            .from(bucket)
            .getPublicUrl(`letters/${f.name}`);
          return {
            name: f.name,
            url: urlData.publicUrl,
            size: f.metadata?.size || 0,
            createdAt: f.created_at || new Date().toISOString(),
          };
        });
    } catch (e) {
      console.error('Media library error:', e);
      return [];
    }
  }

  // ====== Public Endpoints (Mahasiswa Portal) ======

  async getStudyPrograms() {
    return this.prodiRepo.find({
      order: { name: 'ASC' },
      where: { deletedAt: IsNull() },
    });
  }

  async getStudentsByProdi(prodiId: number) {
    const profiles = await this.studentProfileRepo.find({
      where: { prodiId, status: 'aktif' },
      relations: ['user', 'prodi'],
      order: { nim: 'ASC' },
    });

    return profiles.map((p) => ({
      id: p.userId,
      nim: p.nim,
      name: p.user?.name || '',
      email: p.user?.email || '',
      phone: p.user?.phone || '',
      prodi: p.prodi?.name || '',
      prodiId: p.prodiId,
      angkatan: p.angkatan,
    }));
  }

  async searchStudents(query: string) {
    const qb = this.studentProfileRepo
      .createQueryBuilder('sp')
      .leftJoinAndSelect('sp.user', 'user')
      .leftJoinAndSelect('sp.prodi', 'prodi')
      .where('sp.status = :status', { status: 'aktif' });

    if (query) {
      qb.andWhere('(sp.nim LIKE :q OR user.name LIKE :q)', { q: `%${query}%` });
    }

    qb.orderBy('sp.nim', 'ASC').take(20);

    const profiles = await qb.getMany();

    return profiles.map((p) => ({
      id: p.userId,
      nim: p.nim,
      name: p.user?.name || '',
      email: p.user?.email || '',
      phone: p.user?.phone || '',
      prodi: p.prodi?.name || '',
      prodiId: p.prodiId,
      angkatan: p.angkatan,
    }));
  }

  async getStudentDetail(studentId: number) {
    const profile = await this.studentProfileRepo.findOne({
      where: { userId: studentId },
      relations: ['user', 'prodi', 'concentration'],
    });
    if (!profile) throw new NotFoundException('Mahasiswa tidak ditemukan');

    return {
      id: profile.userId,
      nim: profile.nim,
      name: profile.user?.name || '',
      email: profile.profileEditedByUser ? profile.user?.email || '' : '',
      phone: profile.user?.phone || '',
      prodi: profile.prodi?.name || '',
      prodiId: profile.prodiId,
      angkatan: profile.angkatan,
      gender: profile.gender,
      tempatLahir: profile.tempatLahir,
      tanggalLahir: profile.tanggalLahir,
      konsentrasi: profile.concentration?.name || '',
      concentrationId: profile.concentrationId,
      judulTesis: profile.judulTesis,
      pembimbing1: profile.pembimbing1,
      pembimbing2: profile.pembimbing2,
      pekerjaan: profile.pekerjaan,
      alamatRumah: profile.alamatRumah,
      alamatKantor: profile.alamatKantor,
      nik: profile.nik,
      noTelp: profile.noTelp,
      tanggalLulus: profile.tanggalLulus,
      tanggalSidang: profile.tanggalSidang,
      masaStudi: profile.masaStudi,
      namaAyah: profile.namaAyah,
      namaIbu: profile.namaIbu,
      photoUrl: profile.photoUrl,
      keterangan: profile.keterangan,
      profileEditedByUser: profile.profileEditedByUser,
      hasPin: !!profile.pin,
    };
  }

  async verifyStudentPin(studentId: number, pin: string) {
    const profile = await this.studentProfileRepo.findOne({
      where: { userId: studentId },
    });
    if (!profile) throw new NotFoundException('Mahasiswa tidak ditemukan');

    if (!profile.pin) {
      throw new NotFoundException(
        'PIN belum diatur untuk mahasiswa ini. Silakan hubungi staf prodi.',
      );
    }

    if (profile.pin !== pin) {
      return { valid: false, message: 'PIN tidak sesuai' };
    }

    return { valid: true };
  }

  async generatePin(studentId: number) {
    const profile = await this.studentProfileRepo.findOne({
      where: { userId: studentId },
    });
    if (!profile) throw new NotFoundException('Mahasiswa tidak ditemukan');

    const pin = String(Math.floor(1000 + Math.random() * 9000));
    profile.pin = pin;
    await this.studentProfileRepo.save(profile);
    return { pin };
  }

  async bulkGeneratePins() {
    const profiles = await this.studentProfileRepo.find({
      where: { pin: IsNull() },
    });
    let count = 0;
    for (const profile of profiles) {
      profile.pin = String(Math.floor(1000 + Math.random() * 9000));
      await this.studentProfileRepo.save(profile);
      count++;
    }
    return { message: `PIN berhasil di-generate untuk ${count} mahasiswa` };
  }

  async getAllStudentPins(search?: string, prodiId?: number) {
    const qb = this.studentProfileRepo
      .createQueryBuilder('sp')
      .leftJoinAndSelect('sp.user', 'user')
      .leftJoinAndSelect('sp.prodi', 'prodi');

    if (search) {
      qb.andWhere('(user.name ILIKE :s OR sp.nim ILIKE :s)', {
        s: `%${search}%`,
      });
    }
    if (prodiId) {
      qb.andWhere('sp.prodiId = :prodiId', { prodiId });
    }

    qb.orderBy('user.name', 'ASC');

    const profiles = await qb.getMany();
    return profiles.map((p) => ({
      id: p.userId,
      nim: p.nim,
      name: p.user?.name || '',
      prodi: p.prodi?.name || '',
      pin: p.pin || null,
      profileEditedByUser: p.profileEditedByUser,
    }));
  }

  async updateStudentProfile(studentId: number, dto: any) {
    const profile = await this.studentProfileRepo.findOne({
      where: { userId: studentId },
    });
    if (!profile)
      throw new NotFoundException('Profil mahasiswa tidak ditemukan');

    // Handle concentrationId
    if (dto.concentrationId !== undefined) {
      profile.concentrationId = dto.concentrationId || null;
      delete dto.concentrationId;
    }

    // Mark profile as edited by user
    profile.profileEditedByUser = true;

    // Update profile fields
    Object.assign(profile, dto);
    await this.studentProfileRepo.save(profile);

    // Also update user email/phone if provided
    if (dto.email || dto.noTelp) {
      const user = await this.userRepo.findOne({ where: { id: studentId } });
      if (user) {
        if (dto.email) user.email = dto.email;
        if (dto.noTelp) user.phone = dto.noTelp;
        await this.userRepo.save(user);
      }
    }

    return this.getStudentDetail(studentId);
  }

  // ====== Public: Lecturers for dropdown ======

  async getPublicLecturers(search?: string) {
    const qb = this.lecturerProfileRepo
      .createQueryBuilder('lp')
      .leftJoinAndSelect('lp.user', 'user');

    if (search) {
      qb.andWhere('user.name ILIKE :s', { s: `%${search}%` });
    }
    qb.orderBy('user.name', 'ASC');

    const profiles = await qb.getMany();
    return profiles.map((lp) => ({
      id: lp.id,
      userId: lp.userId,
      name: `${lp.frontTitle ? lp.frontTitle + ' ' : ''}${lp.user?.name || ''}${lp.backTitle ? ', ' + lp.backTitle : ''}`,
      nidn: lp.nidn,
    }));
  }

  // ====== Public: Concentrations for dropdown ======

  async getPublicConcentrations(prodiId?: number) {
    const where: any = { isActive: true };
    if (prodiId) where.prodiId = prodiId;

    return this.concentrationRepo.find({
      where,
      order: { name: 'ASC' },
    });
  }

  async findActiveTypes() {
    return this.typeRepo.find({
      where: { isActive: true },
      order: { title: 'ASC' },
      relations: ['template'],
    });
  }

  async getPublicTypeWithFields(id: number) {
    const type = await this.typeRepo.findOne({
      where: { id, isActive: true },
      relations: ['template'],
    });
    if (!type)
      throw new NotFoundException(
        'Jenis surat tidak ditemukan atau tidak aktif',
      );
    return type;
  }

  async submitRequest(dto: SubmitLetterRequestDto) {
    const type = await this.typeRepo.findOne({
      where: { id: dto.letterTypeId, isActive: true },
    });
    if (!type)
      throw new NotFoundException(
        'Jenis surat tidak ditemukan atau tidak aktif',
      );

    const request = this.requestRepo.create({
      letterTypeId: dto.letterTypeId,
      requesterName: dto.requesterName,
      requesterNim: dto.requesterNim,
      requesterEmail: dto.requesterEmail,
      requesterPhone: dto.requesterPhone,
      studentId: dto.studentId,
      prodiId: dto.prodiId,
      submittedData: dto.submittedData,
      status: LetterRequestStatus.PENDING,
    });

    return this.requestRepo.save(request);
  }

  async trackRequest(ticketNumber: string) {
    const request = await this.requestRepo.findOne({
      where: { ticketNumber },
      relations: ['letterType'],
    });
    if (!request) throw new NotFoundException('Nomor tiket tidak ditemukan');

    return {
      ticketNumber: request.ticketNumber,
      letterType: request.letterType.title,
      requesterName: request.requesterName,
      status: request.status,
      adminNotes: request.adminNotes,
      submittedAt: request.createdAt,
      updatedAt: request.updatedAt,
    };
  }

  // ====== Public: History and Approved Print ======

  async getStudentLetterHistory(studentId: number, pin: string) {
    // 1. Verify PIN
    const isValid = await this.verifyStudentPin(studentId, pin);
    if (!isValid) throw new BadRequestException('PIN tidak valid');

    // 2. Fetch history
    const history = await this.requestRepo.find({
      where: { studentId },
      relations: ['letterType'],
      order: { createdAt: 'DESC' },
    });

    return history.map((req) => ({
      id: req.id,
      ticketNumber: req.ticketNumber,
      letterType: req.letterType.title,
      status: req.status,
      createdAt: req.createdAt,
      adminNotes: req.adminNotes,
    }));
  }

  async getApprovedRequestData(ticketNumber: string) {
    const request = await this.requestRepo.findOne({
      where: { ticketNumber },
      relations: ['letterType', 'letterType.template', 'prodi'],
    });

    if (!request) {
      throw new NotFoundException('Nomor tiket tidak ditemukan');
    }

    if (
      request.status !== LetterRequestStatus.APPROVED &&
      request.status !== LetterRequestStatus.FINISHED
    ) {
      throw new BadRequestException('Surat belum disetujui');
    }

    return request;
  }
}

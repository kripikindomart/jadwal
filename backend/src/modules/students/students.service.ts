import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../database/entities/user.entity';
import { StudentProfile } from '../../database/entities/student-profile.entity';
import { Role } from '../../database/entities/role.entity';
import { Prodi } from '../../database/entities/prodi.entity';
import * as bcrypt from 'bcrypt';

// Sanitize imported string: strip quotes, trim, remove HTML tags
function sanitize(val: any): string {
  if (val === null || val === undefined) return '';
  return val
    .toString()
    .trim()
    .replace(/^['"`]+|['"`]+$/g, '') // strip surrounding quotes
    .replace(/<[^>]*>/g, ''); // strip HTML tags (XSS)
}

@Injectable()
export class StudentsService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(StudentProfile)
    private readonly profileRepo: Repository<StudentProfile>,
    @InjectRepository(Role)
    private readonly roleRepo: Repository<Role>,
    @InjectRepository(Prodi)
    private readonly prodiRepo: Repository<Prodi>,
  ) {}

  async findAll(options: {
    page: number;
    perPage: number;
    search?: string;
    prodiId?: number;
    angkatan?: number;
    profileStatus?: string;
    status?: 'active' | 'trash' | 'all';
  }) {
    const {
      page,
      perPage,
      search,
      prodiId,
      angkatan,
      profileStatus,
      status = 'active',
    } = options;

    const qb = this.userRepo
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.studentProfile', 'profile')
      .leftJoinAndSelect('profile.prodi', 'prodi')
      .leftJoinAndSelect('user.roles', 'role')
      .where('role.slug = :roleSlug', { roleSlug: 'mahasiswa' });

    if (status === 'active') {
      qb.andWhere('user.deletedAt IS NULL');
    } else if (status === 'trash') {
      qb.withDeleted().andWhere('user.deletedAt IS NOT NULL');
    } else {
      qb.withDeleted();
    }

    if (search) {
      qb.andWhere(
        '(user.name ILIKE :search OR user.email ILIKE :search OR profile.nim ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (prodiId) {
      qb.andWhere('profile.prodiId = :prodiId', { prodiId });
    }

    if (angkatan) {
      qb.andWhere('profile.angkatan = :angkatan', { angkatan });
    }

    if (profileStatus) {
      qb.andWhere('profile.status = :profileStatus', { profileStatus });
    }

    qb.orderBy('user.name', 'ASC');

    const total = await qb.getCount();
    const data = await qb
      .skip((page - 1) * perPage)
      .take(perPage)
      .getMany();

    return {
      data: data.map((u) => this.formatStudent(u)),
      meta: {
        total,
        page,
        perPage,
        totalPages: Math.ceil(total / perPage),
      },
    };
  }

  async findOne(id: number) {
    const user = await this.userRepo.findOne({
      where: { id },
      relations: ['studentProfile', 'studentProfile.prodi', 'roles'],
    });
    if (!user) throw new Error('Mahasiswa tidak ditemukan');
    return this.formatStudent(user);
  }

  async create(dto: {
    name: string;
    email: string;
    password?: string;
    nim: string;
    prodiId: number;
    angkatan: string;
    status?: string;
  }) {
    const hashedPassword = await bcrypt.hash(dto.password || '12345678', 10);
    const user = this.userRepo.create({
      name: dto.name,
      email: dto.email,
      password: hashedPassword,
    });

    const mhsRole = await this.roleRepo.findOne({
      where: { slug: 'mahasiswa' },
    });
    if (mhsRole) {
      user.roles = [mhsRole];
    }

    const savedUser = await this.userRepo.save(user);

    const profile = this.profileRepo.create({
      userId: savedUser.id,
      nim: dto.nim,
      prodiId: dto.prodiId,
      angkatan: dto.angkatan,
      status: dto.status || 'aktif',
    });
    await this.profileRepo.save(profile);

    return this.findOne(savedUser.id);
  }

  async update(
    id: number,
    dto: {
      name?: string;
      email?: string;
      nim?: string;
      prodiId?: number;
      angkatan?: string;
      status?: string;
    },
  ) {
    const user = await this.userRepo.findOne({
      where: { id },
      relations: ['studentProfile'],
    });
    if (!user) throw new Error('Mahasiswa tidak ditemukan');

    if (dto.name) user.name = dto.name;
    if (dto.email) user.email = dto.email;
    await this.userRepo.save(user);

    let profile = user.studentProfile;
    if (!profile) {
      profile = this.profileRepo.create({
        userId: id,
        nim: '',
        prodiId: 0,
        angkatan: '',
      });
    }
    if (dto.nim !== undefined) profile.nim = dto.nim;
    if (dto.prodiId !== undefined) profile.prodiId = dto.prodiId;
    if (dto.angkatan !== undefined) profile.angkatan = dto.angkatan;
    if (dto.status !== undefined) profile.status = dto.status;
    await this.profileRepo.save(profile);

    return this.findOne(id);
  }

  async softDelete(id: number) {
    await this.userRepo.softDelete(id);
    return { message: 'Mahasiswa berhasil dihapus' };
  }

  async restore(id: number) {
    await this.userRepo.restore(id);
    return { message: 'Mahasiswa berhasil dipulihkan' };
  }

  async forceDelete(id: number) {
    const user = await this.userRepo.findOne({
      where: { id },
      withDeleted: true,
      relations: ['studentProfile'],
    });
    if (user?.studentProfile) {
      await this.profileRepo.remove(user.studentProfile);
    }
    await this.userRepo.delete(id);
    return { message: 'Mahasiswa berhasil dihapus permanen' };
  }

  async bulkAction(ids: number[], action: string) {
    switch (action) {
      case 'trash':
        await this.userRepo.softDelete(ids);
        return { message: `${ids.length} mahasiswa berhasil dihapus` };
      case 'restore':
        await this.userRepo.restore(ids);
        return { message: `${ids.length} mahasiswa berhasil dipulihkan` };
      case 'forceDelete':
        for (const id of ids) {
          await this.forceDelete(id);
        }
        return {
          message: `${ids.length} mahasiswa berhasil dihapus permanen`,
        };
      default:
        throw new Error('Action tidak valid');
    }
  }

  async importStudents(rows: any[]) {
    const prodiMap = new Map<string, number>();
    const prodis = await this.prodiRepo.find();
    prodis.forEach((p) => {
      prodiMap.set(p.code.toLowerCase(), p.id);
      prodiMap.set(p.name.toLowerCase(), p.id);
      prodiMap.set(`${p.name.toLowerCase()} (${p.degree.toLowerCase()})`, p.id);
      const shortName = p.name
        .replace(/^(magister|doktor|master|doctor)\s+/i, '')
        .toLowerCase();
      prodiMap.set(`${shortName} (${p.degree.toLowerCase()})`, p.id);
      prodiMap.set(shortName, p.id);
    });

    let total = 0;
    let successful = 0;
    const failed: { row: any; reason: string }[] = [];

    for (const row of rows) {
      total++;
      try {
        const name = sanitize(row.name);
        const email = sanitize(row.email).toLowerCase();
        const nim = sanitize(row.nim);
        const phone = sanitize(row.phone);
        const angkatan = sanitize(row.angkatan);
        const mhsStatus = sanitize(row.status) || 'aktif';
        const prodiCode = sanitize(row.prodiCode).toLowerCase();

        if (!name || !email || !nim) {
          failed.push({ row, reason: 'Nama, Email, atau NIM kosong.' });
          continue;
        }

        if (!angkatan) {
          failed.push({ row, reason: 'Angkatan kosong.' });
          continue;
        }

        const existingEmail = await this.userRepo.findOne({ where: { email } });
        if (existingEmail) {
          failed.push({ row, reason: `Email '${email}' sudah terdaftar.` });
          continue;
        }

        const existingNim = await this.profileRepo.findOne({ where: { nim } });
        if (existingNim) {
          failed.push({ row, reason: `NIM '${nim}' sudah terdaftar.` });
          continue;
        }

        let prodiId: number | undefined;
        if (prodiCode) {
          prodiId = prodiMap.get(prodiCode);
          if (!prodiId) {
            failed.push({
              row,
              reason: `Kode Prodi '${row.prodiCode}' tidak ditemukan.`,
            });
            continue;
          }
        } else {
          failed.push({ row, reason: 'Kode Prodi kosong.' });
          continue;
        }

        await this.create({
          name,
          email,
          nim,
          prodiId,
          angkatan,
          status: mhsStatus,
        });
        successful++;
      } catch (err: any) {
        failed.push({ row, reason: err.message || 'Error tidak diketahui' });
      }
    }

    return { message: 'Proses import selesai', total, successful, failed };
  }

  async getStats() {
    const total = await this.userRepo
      .createQueryBuilder('user')
      .leftJoin('user.roles', 'role')
      .where('role.slug = :slug', { slug: 'mahasiswa' })
      .getCount();

    const trashed = await this.userRepo
      .createQueryBuilder('user')
      .withDeleted()
      .leftJoin('user.roles', 'role')
      .where('role.slug = :slug', { slug: 'mahasiswa' })
      .andWhere('user.deletedAt IS NOT NULL')
      .getCount();

    return { total, active: total, trashed };
  }

  private formatStudent(user: User) {
    const profile = user.studentProfile;
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      nim: profile?.nim || null,
      angkatan: profile?.angkatan || null,
      status: profile?.status || null,
      prodiId: profile?.prodiId || null,
      prodi: profile?.prodi || null,
      createdAt: user.createdAt,
      deletedAt: user.deletedAt,
    };
  }
}

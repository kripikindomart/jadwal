import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike, In } from 'typeorm';
import { User } from '../../database/entities/user.entity';
import { LecturerProfile } from '../../database/entities/lecturer-profile.entity';
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
export class LecturersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(LecturerProfile)
    private readonly profileRepo: Repository<LecturerProfile>,
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
    status?: 'active' | 'trash' | 'all';
  }) {
    const { page, perPage, search, prodiId, status = 'active' } = options;

    const qb = this.userRepo
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.lecturerProfile', 'profile')
      .leftJoinAndSelect('profile.homeProdi', 'prodi')
      .leftJoinAndSelect('user.roles', 'role')
      .where('role.slug = :roleSlug', { roleSlug: 'dosen' });

    if (status === 'active') {
      qb.andWhere('user.deletedAt IS NULL');
    } else if (status === 'trash') {
      qb.withDeleted().andWhere('user.deletedAt IS NOT NULL');
    } else {
      qb.withDeleted();
    }

    if (search) {
      qb.andWhere(
        '(user.name ILIKE :search OR user.email ILIKE :search OR profile.nidn ILIKE :search OR profile.nip ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (prodiId) {
      qb.andWhere('profile.homeProdiId = :prodiId', { prodiId });
    }

    qb.orderBy('user.name', 'ASC');

    const total = await qb.getCount();
    const data = await qb
      .skip((page - 1) * perPage)
      .take(perPage)
      .getMany();

    return {
      data: data.map((u) => this.formatLecturer(u)),
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
      relations: ['lecturerProfile', 'lecturerProfile.homeProdi', 'roles'],
    });
    if (!user) throw new Error('Dosen tidak ditemukan');
    return this.formatLecturer(user);
  }

  async create(dto: {
    name: string;
    email: string;
    phone?: string;
    password?: string;
    nidn?: string;
    nip?: string;
    frontTitle?: string;
    backTitle?: string;
    homeProdiId?: number;
  }) {
    // Create user
    const hashedPassword = await bcrypt.hash(dto.password || '12345678', 10);
    const user = this.userRepo.create({
      name: dto.name,
      email: dto.email,
      phone: dto.phone,
      password: hashedPassword,
    });

    // Assign dosen role
    const dosenRole = await this.roleRepo.findOne({
      where: { slug: 'dosen' },
    });
    if (dosenRole) {
      user.roles = [dosenRole];
    }

    const savedUser = await this.userRepo.save(user);

    // Create lecturer profile
    const profile = this.profileRepo.create({
      userId: savedUser.id,
      nidn: dto.nidn,
      nip: dto.nip,
      frontTitle: dto.frontTitle,
      backTitle: dto.backTitle,
      homeProdiId: dto.homeProdiId,
    });
    await this.profileRepo.save(profile);

    return this.findOne(savedUser.id);
  }

  async update(
    id: number,
    dto: {
      name?: string;
      email?: string;
      phone?: string;
      nidn?: string;
      nip?: string;
      frontTitle?: string;
      backTitle?: string;
      homeProdiId?: number;
    },
  ) {
    const user = await this.userRepo.findOne({
      where: { id },
      relations: ['lecturerProfile'],
    });
    if (!user) throw new Error('Dosen tidak ditemukan');

    // Update user fields
    if (dto.name) user.name = dto.name;
    if (dto.email) user.email = dto.email;
    if (dto.phone !== undefined) user.phone = dto.phone;
    await this.userRepo.save(user);

    // Update or create profile
    let profile = user.lecturerProfile;
    if (!profile) {
      profile = this.profileRepo.create({ userId: id });
    }
    if (dto.nidn !== undefined) profile.nidn = dto.nidn;
    if (dto.nip !== undefined) profile.nip = dto.nip;
    if (dto.frontTitle !== undefined) profile.frontTitle = dto.frontTitle;
    if (dto.backTitle !== undefined) profile.backTitle = dto.backTitle;
    if (dto.homeProdiId !== undefined) profile.homeProdiId = dto.homeProdiId;
    await this.profileRepo.save(profile);

    return this.findOne(id);
  }

  async softDelete(id: number) {
    await this.userRepo.softDelete(id);
    return { message: 'Dosen berhasil dihapus' };
  }

  async restore(id: number) {
    await this.userRepo.restore(id);
    return { message: 'Dosen berhasil dipulihkan' };
  }

  async forceDelete(id: number) {
    const user = await this.userRepo.findOne({
      where: { id },
      withDeleted: true,
      relations: ['lecturerProfile'],
    });
    if (user?.lecturerProfile) {
      await this.profileRepo.remove(user.lecturerProfile);
    }
    await this.userRepo.delete(id);
    return { message: 'Dosen berhasil dihapus permanen' };
  }

  async bulkAction(ids: number[], action: string) {
    switch (action) {
      case 'trash':
        await this.userRepo.softDelete(ids);
        return { message: `${ids.length} dosen berhasil dihapus` };
      case 'restore':
        await this.userRepo.restore(ids);
        return { message: `${ids.length} dosen berhasil dipulihkan` };
      case 'forceDelete':
        for (const id of ids) {
          await this.forceDelete(id);
        }
        return { message: `${ids.length} dosen berhasil dihapus permanen` };
      default:
        throw new Error('Action tidak valid');
    }
  }

  async importLecturers(rows: any[]) {
    const prodiMap = new Map<string, number>();
    const prodis = await this.prodiRepo.find();
    prodis.forEach((p) => {
      // Map by code (e.g. "MESI")
      prodiMap.set(p.code.toLowerCase(), p.id);
      // Map by name (e.g. "magister ekonomi syariah")
      prodiMap.set(p.name.toLowerCase(), p.id);
      // Map by "name (degree)" (e.g. "ekonomi syariah (s2)")
      prodiMap.set(`${p.name.toLowerCase()} (${p.degree.toLowerCase()})`, p.id);
      // Map by "name (degree)" without "Magister/Doktor" prefix
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
        const phone = sanitize(row.phone) || sanitize(row.noHp);
        const nidn = sanitize(row.nidn);
        const nip = sanitize(row.nip);
        const frontTitle = sanitize(row.frontTitle);
        const backTitle = sanitize(row.backTitle);
        const prodiCode = sanitize(row.prodiCode).toLowerCase();

        if (!name || !email) {
          failed.push({ row, reason: 'Nama atau Email kosong.' });
          continue;
        }

        // Check duplicate email
        const existing = await this.userRepo.findOne({ where: { email } });
        if (existing) {
          failed.push({ row, reason: `Email '${email}' sudah terdaftar.` });
          continue;
        }

        // Check duplicate NIDN
        if (nidn) {
          const existingNidn = await this.profileRepo.findOne({
            where: { nidn },
          });
          if (existingNidn) {
            failed.push({ row, reason: `NIDN '${nidn}' sudah terdaftar.` });
            continue;
          }
        }

        let homeProdiId: number | undefined;
        if (prodiCode) {
          homeProdiId = prodiMap.get(prodiCode);
          if (!homeProdiId) {
            failed.push({
              row,
              reason: `Kode/Nama Prodi '${row.prodiCode}' tidak ditemukan.`,
            });
            continue;
          }
        }

        await this.create({
          name,
          email,
          phone,
          nidn,
          nip,
          frontTitle,
          backTitle,
          homeProdiId,
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
      .where('role.slug = :slug', { slug: 'dosen' })
      .getCount();

    const trashed = await this.userRepo
      .createQueryBuilder('user')
      .withDeleted()
      .leftJoin('user.roles', 'role')
      .where('role.slug = :slug', { slug: 'dosen' })
      .andWhere('user.deletedAt IS NOT NULL')
      .getCount();

    return { total, active: total, trashed };
  }

  private formatLecturer(user: User) {
    const profile = user.lecturerProfile;
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone || null,
      nidn: profile?.nidn || null,
      nip: profile?.nip || null,
      frontTitle: profile?.frontTitle || null,
      backTitle: profile?.backTitle || null,
      fullName:
        `${profile?.frontTitle || ''} ${user.name}${profile?.backTitle ? ', ' + profile.backTitle : ''}`.trim(),
      homeProdiId: profile?.homeProdiId || null,
      homeProdi: profile?.homeProdi || null,
      createdAt: user.createdAt,
      deletedAt: user.deletedAt,
    };
  }
}

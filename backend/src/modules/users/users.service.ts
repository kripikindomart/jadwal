import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, ILike, IsNull, Not } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, Role, StaffProdiAccess } from '../../database/entities';
import { CreateUserDto, UpdateUserDto } from './dto/users.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Role)
    private rolesRepository: Repository<Role>,
    @InjectRepository(StaffProdiAccess)
    private staffProdiAccessRepository: Repository<StaffProdiAccess>,
  ) {}

  async findAll(
    page = 1,
    limit = 10,
    search?: string,
    status: 'active' | 'trash' | 'all' = 'active',
  ) {
    const where: any = {};
    if (search) {
      where.name = ILike(`%${search}%`);
    }

    let withDeleted = false;
    if (status === 'trash') {
      withDeleted = true;
      where.deletedAt = Not(IsNull());
    } else if (status === 'all') {
      withDeleted = true;
    }

    const [data, total] = await this.usersRepository.findAndCount({
      where,
      relations: [
        'roles',
        'staffProdiAccess',
        'staffProdiAccess.prodi',
        'studentProfile',
        'studentProfile.prodi',
        'lecturerProfile',
        'lecturerProfile.homeProdi',
      ],
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return {
      data: data.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        roles: u.roles.map((r) => ({ id: r.id, name: r.name, slug: r.slug })),
        prodis: (() => {
          const prodiMap = new Map<number, any>();
          u.staffProdiAccess?.forEach((pa) => {
            if (pa.prodiId && pa.prodi) {
              prodiMap.set(pa.prodiId, { id: pa.prodiId, name: pa.prodi.name });
            }
          });
          if (u.studentProfile?.prodiId && u.studentProfile?.prodi) {
            prodiMap.set(u.studentProfile.prodiId, {
              id: u.studentProfile.prodi.id,
              name: u.studentProfile.prodi.name,
            });
          }
          if (u.lecturerProfile?.homeProdiId && u.lecturerProfile?.homeProdi) {
            prodiMap.set(u.lecturerProfile.homeProdiId, {
              id: u.lecturerProfile.homeProdi.id,
              name: u.lecturerProfile.homeProdi.name,
            });
          }
          return Array.from(prodiMap.values());
        })(),
        createdAt: u.createdAt,
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: number) {
    const user = await this.usersRepository.findOne({
      where: { id },
      relations: [
        'roles',
        'roles.permissions',
        'studentProfile',
        'studentProfile.prodi',
        'lecturerProfile',
        'lecturerProfile.homeProdi',
        'staffProdiAccess',
        'staffProdiAccess.prodi',
      ],
    });

    if (!user) {
      throw new NotFoundException('User tidak ditemukan');
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      roles: user.roles.map((r) => ({
        id: r.id,
        name: r.name,
        slug: r.slug,
        permissions:
          r.permissions?.map((p) => ({
            id: p.id,
            name: p.name,
            slug: p.slug,
          })) || [],
      })),
      studentProfile: user.studentProfile || null,
      lecturerProfile: user.lecturerProfile || null,
      prodis: (() => {
        const prodiMap = new Map<number, any>();
        // From staffProdiAccess
        user.staffProdiAccess?.forEach((pa) => {
          if (pa.prodiId && pa.prodi) {
            prodiMap.set(pa.prodiId, {
              id: pa.prodiId,
              name: pa.prodi.name,
              degree: pa.prodi.degree,
            });
          }
        });
        // From studentProfile
        if (user.studentProfile?.prodiId && user.studentProfile?.prodi) {
          const p = user.studentProfile.prodi;
          prodiMap.set(p.id, { id: p.id, name: p.name, degree: p.degree });
        }
        // From lecturerProfile
        if (
          user.lecturerProfile?.homeProdiId &&
          user.lecturerProfile?.homeProdi
        ) {
          const p = user.lecturerProfile.homeProdi;
          prodiMap.set(p.id, { id: p.id, name: p.name, degree: p.degree });
        }
        return Array.from(prodiMap.values());
      })(),
      staffProdiAccess: user.staffProdiAccess || [],
      createdAt: user.createdAt,
    };
  }

  async create(dto: CreateUserDto) {
    const existing = await this.usersRepository.findOne({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException('Email sudah terdaftar');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const user = this.usersRepository.create({
      name: dto.name,
      email: dto.email,
      password: hashedPassword,
    });

    if (dto.roleIds?.length) {
      user.roles = await this.rolesRepository.findBy({ id: In(dto.roleIds) });
    }

    await this.usersRepository.save(user);

    if (dto.prodiIds) {
      const accessEntries = dto.prodiIds.map((prodiId: number) => ({
        userId: user.id,
        prodiId,
      }));
      await this.staffProdiAccessRepository.save(accessEntries);
    }

    return this.findOne(user.id);
  }

  async update(id: number, dto: UpdateUserDto) {
    const user = await this.usersRepository.findOne({
      where: { id },
      relations: ['roles'],
    });

    if (!user) {
      throw new NotFoundException('User tidak ditemukan');
    }

    if (dto.name) user.name = dto.name;
    if (dto.email) user.email = dto.email;
    if (dto.password) {
      user.password = await bcrypt.hash(dto.password, 10);
    }

    if (dto.roleIds !== undefined) {
      user.roles = dto.roleIds.length
        ? await this.rolesRepository.findBy({ id: In(dto.roleIds) })
        : [];
    }

    await this.usersRepository.save(user);

    if (dto.prodiIds !== undefined) {
      // Remove old access
      await this.staffProdiAccessRepository.delete({ userId: id });
      // Add new access
      if (dto.prodiIds.length > 0) {
        const accessEntries = dto.prodiIds.map((prodiId: number) => ({
          userId: id,
          prodiId,
        }));
        await this.staffProdiAccessRepository.save(accessEntries);
      }
    }

    return this.findOne(user.id);
  }

  async softDelete(id: number) {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('User tidak ditemukan');
    }
    await this.usersRepository.softDelete(id);
    return { message: 'User berhasil dihapus' };
  }

  async forceDelete(id: number) {
    const user = await this.usersRepository.findOne({
      where: { id },
      withDeleted: true,
    });
    if (!user) {
      throw new NotFoundException('User tidak ditemukan');
    }
    await this.usersRepository.delete(id);
    return { message: 'User berhasil dihapus permanen' };
  }

  async restore(id: number) {
    await this.usersRepository.restore(id);
    return { message: 'User berhasil direstore' };
  }

  async processBulkAction(ids: number[], action: string) {
    if (!ids || ids.length === 0) return;
    const options = { id: In(ids) } as any;

    switch (action) {
      case 'trash':
        await this.usersRepository.softDelete(options);
        break;
      case 'restore':
        await this.usersRepository.restore(options);
        break;
      case 'delete':
        await this.usersRepository.delete(options);
        break;
    }
    return { message: `Bulk ${action} berhasil dilakukan` };
  }
}

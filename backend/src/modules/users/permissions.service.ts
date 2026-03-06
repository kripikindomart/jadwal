import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Permission } from '../../database/entities';
import { CreatePermissionDto, UpdatePermissionDto } from './dto/users.dto';

@Injectable()
export class PermissionsService {
  constructor(
    @InjectRepository(Permission)
    private permissionsRepository: Repository<Permission>,
  ) {}

  async findAll() {
    return this.permissionsRepository.find({
      order: { group: 'ASC', name: 'ASC' },
    });
  }

  async findOne(id: number) {
    const perm = await this.permissionsRepository.findOne({ where: { id } });
    if (!perm) {
      throw new NotFoundException('Permission tidak ditemukan');
    }
    return perm;
  }

  async create(dto: CreatePermissionDto) {
    const existing = await this.permissionsRepository.findOne({
      where: { slug: dto.slug },
    });
    if (existing) {
      throw new ConflictException('Slug sudah digunakan');
    }

    const perm = this.permissionsRepository.create(dto);
    return this.permissionsRepository.save(perm);
  }

  async update(id: number, dto: UpdatePermissionDto) {
    const perm = await this.permissionsRepository.findOne({ where: { id } });
    if (!perm) {
      throw new NotFoundException('Permission tidak ditemukan');
    }

    Object.assign(perm, dto);
    return this.permissionsRepository.save(perm);
  }

  async remove(id: number) {
    const perm = await this.permissionsRepository.findOne({ where: { id } });
    if (!perm) {
      throw new NotFoundException('Permission tidak ditemukan');
    }
    await this.permissionsRepository.remove(perm);
    return { message: 'Permission berhasil dihapus' };
  }
}

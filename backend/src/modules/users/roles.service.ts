import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Role, Permission } from '../../database/entities';
import { CreateRoleDto, UpdateRoleDto } from './dto/users.dto';

@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(Role)
    private rolesRepository: Repository<Role>,
    @InjectRepository(Permission)
    private permissionsRepository: Repository<Permission>,
  ) {}

  async findAll() {
    const roles = await this.rolesRepository.find({
      relations: ['permissions'],
      order: { id: 'ASC' },
    });

    return roles.map((r) => ({
      id: r.id,
      name: r.name,
      slug: r.slug,
      permissions:
        r.permissions?.map((p) => ({
          id: p.id,
          name: p.name,
          slug: p.slug,
          group: p.group,
        })) || [],
      createdAt: r.createdAt,
    }));
  }

  async findOne(id: number) {
    const role = await this.rolesRepository.findOne({
      where: { id },
      relations: ['permissions'],
    });

    if (!role) {
      throw new NotFoundException('Role tidak ditemukan');
    }

    return {
      id: role.id,
      name: role.name,
      slug: role.slug,
      permissions:
        role.permissions?.map((p) => ({
          id: p.id,
          name: p.name,
          slug: p.slug,
          group: p.group,
        })) || [],
      createdAt: role.createdAt,
    };
  }

  async create(dto: CreateRoleDto) {
    const existing = await this.rolesRepository.findOne({
      where: { slug: dto.slug },
    });
    if (existing) {
      throw new ConflictException('Slug sudah digunakan');
    }

    const role = this.rolesRepository.create({
      name: dto.name,
      slug: dto.slug,
    });

    if (dto.permissionIds?.length) {
      role.permissions = await this.permissionsRepository.findBy({
        id: In(dto.permissionIds),
      });
    }

    await this.rolesRepository.save(role);
    return this.findOne(role.id);
  }

  async update(id: number, dto: UpdateRoleDto) {
    const role = await this.rolesRepository.findOne({
      where: { id },
      relations: ['permissions'],
    });

    if (!role) {
      throw new NotFoundException('Role tidak ditemukan');
    }

    if (dto.name) role.name = dto.name;
    if (dto.slug) role.slug = dto.slug;

    if (dto.permissionIds !== undefined) {
      role.permissions = dto.permissionIds.length
        ? await this.permissionsRepository.findBy({ id: In(dto.permissionIds) })
        : [];
    }

    await this.rolesRepository.save(role);
    return this.findOne(role.id);
  }

  async remove(id: number) {
    const role = await this.rolesRepository.findOne({ where: { id } });
    if (!role) {
      throw new NotFoundException('Role tidak ditemukan');
    }
    await this.rolesRepository.remove(role);
    return { message: 'Role berhasil dihapus' };
  }
}

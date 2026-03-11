import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, IsNull, Not, ILike } from 'typeorm';
import { Concentration } from '../../database/entities/concentration.entity';
import {
  CreateConcentrationDto,
  UpdateConcentrationDto,
} from './concentrations.dto';

@Injectable()
export class ConcentrationsService {
  constructor(
    @InjectRepository(Concentration)
    private readonly concentrationRepo: Repository<Concentration>,
  ) {}

  async findAll(options: {
    page?: number;
    perPage?: number;
    search?: string;
    prodiId?: number;
    status?: 'active' | 'trash' | 'all';
  }): Promise<{ data: Concentration[]; meta: any }> {
    const {
      page = 1,
      perPage = 50,
      search,
      prodiId,
      status = 'active',
    } = options;

    const qb = this.concentrationRepo
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.prodi', 'prodi');

    if (status === 'active') {
      qb.andWhere('c.deletedAt IS NULL');
    } else if (status === 'trash') {
      qb.withDeleted().andWhere('c.deletedAt IS NOT NULL');
    } else {
      qb.withDeleted();
    }

    if (prodiId) {
      qb.andWhere('c.prodiId = :prodiId', { prodiId });
    }

    if (search) {
      qb.andWhere('(c.name ILIKE :search OR c.code ILIKE :search)', {
        search: `%${search}%`,
      });
    }

    qb.orderBy('c.name', 'ASC');

    const total = await qb.getCount();
    const data = await qb
      .skip((page - 1) * perPage)
      .take(perPage)
      .getMany();

    return {
      data,
      meta: {
        total,
        page,
        perPage,
        totalPages: Math.ceil(total / perPage),
      },
    };
  }

  async findOne(id: number): Promise<Concentration> {
    const concentration = await this.concentrationRepo.findOne({
      where: { id },
      relations: ['prodi'],
    });

    if (!concentration) {
      throw new NotFoundException(
        `Konsentrasi dengan ID ${id} tidak ditemukan`,
      );
    }

    return concentration;
  }

  async create(createDto: CreateConcentrationDto): Promise<Concentration> {
    const concentration = this.concentrationRepo.create(createDto);
    return await this.concentrationRepo.save(concentration);
  }

  async update(
    id: number,
    updateDto: UpdateConcentrationDto,
  ): Promise<Concentration> {
    const concentration = await this.findOne(id);
    Object.assign(concentration, updateDto);
    return await this.concentrationRepo.save(concentration);
  }

  async softDelete(id: number) {
    const concentration = await this.findOne(id);
    await this.concentrationRepo.softDelete(id);
    return { message: `Konsentrasi "${concentration.name}" berhasil dihapus` };
  }

  async restore(id: number) {
    await this.concentrationRepo.restore(id);
    return { message: 'Konsentrasi berhasil dipulihkan' };
  }

  async forceDelete(id: number) {
    const concentration = await this.concentrationRepo.findOne({
      where: { id },
      withDeleted: true,
    });
    if (!concentration) {
      throw new NotFoundException('Konsentrasi tidak ditemukan');
    }
    await this.concentrationRepo.delete(id);
    return { message: 'Konsentrasi berhasil dihapus permanen' };
  }

  async bulkAction(ids: number[], action: string) {
    if (!ids || ids.length === 0) return;

    switch (action) {
      case 'trash':
        await this.concentrationRepo.softDelete(ids);
        return { message: `${ids.length} konsentrasi berhasil dihapus` };
      case 'restore':
        await this.concentrationRepo.restore(ids);
        return { message: `${ids.length} konsentrasi berhasil dipulihkan` };
      case 'forceDelete':
        for (const id of ids) {
          await this.forceDelete(id);
        }
        return {
          message: `${ids.length} konsentrasi berhasil dihapus permanen`,
        };
      default:
        throw new Error('Action tidak valid');
    }
  }

  async getStats() {
    const total = await this.concentrationRepo.count();
    const trashed = await this.concentrationRepo.count({
      withDeleted: true,
      where: { deletedAt: Not(IsNull()) },
    });
    return { total, active: total, trashed };
  }
}

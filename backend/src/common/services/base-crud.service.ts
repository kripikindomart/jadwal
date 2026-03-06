import {
  Repository,
  FindOptionsWhere,
  FindOptionsOrder,
  DeepPartial,
  In,
  IsNull,
  Not,
} from 'typeorm';
import { NotFoundException } from '@nestjs/common';

export interface PaginationResult<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    perPage: number;
    lastPage: number;
  };
}

export abstract class BaseCrudService<T extends { id: number }> {
  constructor(protected readonly repository: Repository<T>) {}

  async findAllPaginated(
    page: number = 1,
    perPage: number = 10,
    where?: FindOptionsWhere<T> | FindOptionsWhere<T>[],
    order?: FindOptionsOrder<T>,
    relations?: string[],
    withDeleted: boolean = false,
    status: 'active' | 'trash' | 'all' = 'active',
  ): Promise<PaginationResult<T>> {
    const skip = (page - 1) * perPage;

    // Handle soft delete status logic
    let finalWithDeleted = withDeleted;
    let finalWhere: any = where
      ? Array.isArray(where)
        ? [...where]
        : { ...where }
      : {};

    if (status === 'trash') {
      finalWithDeleted = true;
      if (Array.isArray(finalWhere)) {
        finalWhere = finalWhere.map((w) => ({
          ...w,
          deletedAt: Not(IsNull()),
        }));
      } else {
        finalWhere.deletedAt = Not(IsNull());
      }
    } else if (status === 'all') {
      finalWithDeleted = true;
    }

    const [data, total] = await this.repository.findAndCount({
      where: finalWhere,
      order,
      skip,
      take: perPage,
      relations,
      withDeleted: finalWithDeleted,
    });

    return {
      data,
      meta: {
        total,
        page,
        perPage,
        lastPage: Math.ceil(total / perPage),
      },
    };
  }

  async findOneOrFail(
    id: number,
    relations?: string[],
    withDeleted = false,
  ): Promise<T> {
    const where = { id } as any;
    const entity = await this.repository.findOne({
      where,
      relations,
      withDeleted,
    });
    if (!entity) throw new NotFoundException('Data tidak ditemukan');
    return entity;
  }

  async create(createDto: DeepPartial<T>): Promise<T> {
    const entity = this.repository.create(createDto);
    return this.repository.save(entity);
  }

  async update(id: number, updateDto: DeepPartial<T>): Promise<T> {
    const entity = await this.findOneOrFail(id);
    const updated = this.repository.merge(entity, updateDto);
    return this.repository.save(updated);
  }

  async softDelete(id: number): Promise<void> {
    await this.findOneOrFail(id);
    await this.repository.softDelete(id);
  }

  async restore(id: number): Promise<void> {
    await this.findOneOrFail(id, [], true);
    await this.repository.restore(id);
  }

  async forceDelete(id: number): Promise<void> {
    await this.findOneOrFail(id, [], true);
    await this.repository.delete(id);
  }

  async processBulkAction(
    ids: number[],
    action: string,
    updates?: any,
  ): Promise<void> {
    if (!ids || ids.length === 0) return;

    const options = { id: In(ids) } as any;

    switch (action) {
      case 'trash':
        await this.repository.softDelete(options);
        break;
      case 'restore':
        await this.repository.restore(options);
        break;
      case 'delete':
        await this.repository.delete(options);
        break;
      case 'active':
      case 'inactive':
        if (updates) {
          // @ts-ignore
          await this.repository.update(options, updates);
        }
        break;
    }
  }
}

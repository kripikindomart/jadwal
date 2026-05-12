import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from '../../database/entities';

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditRepo: Repository<AuditLog>,
  ) {}

  async log(data: {
    userId?: number;
    action: string;
    entityName: string;
    entityId?: number;
    description?: string;
    oldValue?: Record<string, any>;
    newValue?: Record<string, any>;
    ipAddress?: string;
  }) {
    const entry = this.auditRepo.create(data);
    return this.auditRepo.save(entry);
  }

  async findAll(filters: {
    userId?: number;
    entityName?: string;
    action?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }) {
    const { userId, entityName, action, startDate, endDate, page = 1, limit = 30 } = filters;

    let query = this.auditRepo
      .createQueryBuilder('log')
      .leftJoinAndSelect('log.user', 'user');

    if (userId) query = query.andWhere('log.userId = :userId', { userId });
    if (entityName) query = query.andWhere('log.entityName = :entityName', { entityName });
    if (action) query = query.andWhere('log.action = :action', { action });
    if (startDate) query = query.andWhere('log.createdAt >= :startDate', { startDate });
    if (endDate) query = query.andWhere('log.createdAt <= :endDate', { endDate: endDate + ' 23:59:59' });

    query = query.orderBy('log.createdAt', 'DESC');

    const total = await query.getCount();
    const data = await query.skip((page - 1) * limit).take(limit).getMany();

    return {
      data: data.map((d) => ({
        id: d.id,
        action: d.action,
        entityName: d.entityName,
        entityId: d.entityId,
        description: d.description,
        userName: d.user?.name || 'System',
        ipAddress: d.ipAddress,
        createdAt: d.createdAt,
      })),
      total,
      page,
      limit,
    };
  }
}

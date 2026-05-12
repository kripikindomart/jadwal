import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from '../../database/entities';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly notifRepo: Repository<Notification>,
  ) {}

  async findByUser(userId: number, options?: { unreadOnly?: boolean; limit?: number }) {
    const { unreadOnly = false, limit = 20 } = options || {};

    const where: any = { userId };
    if (unreadOnly) where.isRead = false;

    const notifications = await this.notifRepo.find({
      where,
      order: { createdAt: 'DESC' },
      take: limit,
    });

    const unreadCount = await this.notifRepo.count({
      where: { userId, isRead: false },
    });

    return { notifications, unreadCount };
  }

  async markAsRead(id: number, userId: number) {
    await this.notifRepo.update({ id, userId }, { isRead: true });
    return { message: 'Notifikasi ditandai sudah dibaca' };
  }

  async markAllAsRead(userId: number) {
    await this.notifRepo.update({ userId, isRead: false }, { isRead: true });
    return { message: 'Semua notifikasi ditandai sudah dibaca' };
  }

  async delete(id: number, userId: number) {
    await this.notifRepo.delete({ id, userId });
    return { message: 'Notifikasi dihapus' };
  }

  async getUnreadCount(userId: number): Promise<number> {
    return this.notifRepo.count({ where: { userId, isRead: false } });
  }

  // Helper: create notification (used by other services)
  async create(data: {
    userId: number;
    title: string;
    message: string;
    type?: string;
    link?: string;
  }) {
    const notif = this.notifRepo.create({
      userId: data.userId,
      title: data.title,
      message: data.message,
      type: data.type || 'info',
      link: data.link,
    });
    return this.notifRepo.save(notif);
  }

  // Helper: send to multiple users
  async createBulk(
    userIds: number[],
    data: { title: string; message: string; type?: string; link?: string },
  ) {
    const notifications = userIds.map((userId) =>
      this.notifRepo.create({
        userId,
        title: data.title,
        message: data.message,
        type: data.type || 'info',
        link: data.link,
      }),
    );
    return this.notifRepo.save(notifications);
  }
}

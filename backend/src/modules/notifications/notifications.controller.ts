import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  Query,
  Req,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { NotificationsService } from './notifications.service';

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/notifications')
export class NotificationsController {
  constructor(private readonly notifService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Get notifikasi user yang login' })
  findMine(
    @Req() req: any,
    @Query('unreadOnly') unreadOnly?: string,
    @Query('limit') limit?: string,
  ) {
    return this.notifService.findByUser(req.user.id, {
      unreadOnly: unreadOnly === 'true',
      limit: limit ? parseInt(limit) : 20,
    });
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get jumlah notifikasi belum dibaca' })
  getUnreadCount(@Req() req: any) {
    return this.notifService.getUnreadCount(req.user.id);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Tandai satu notifikasi sudah dibaca' })
  markAsRead(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.notifService.markAsRead(id, req.user.id);
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Tandai semua notifikasi sudah dibaca' })
  markAllAsRead(@Req() req: any) {
    return this.notifService.markAllAsRead(req.user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Hapus notifikasi' })
  delete(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.notifService.delete(id, req.user.id);
  }
}

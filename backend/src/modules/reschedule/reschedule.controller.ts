import {
  Controller, Get, Post, Patch, Body, Param, Query,
  ParseIntPipe, UseGuards, Req,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { Public } from '../../common/decorators';
import { RescheduleService } from './reschedule.service';

@ApiTags('Reschedule')
@Controller('api/reschedule')
export class RescheduleController {
  constructor(private readonly rescheduleService: RescheduleService) {}

  // Dosen request (via portal token — handled separately, or authenticated)
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('request')
  @ApiOperation({ summary: 'Dosen: request reschedule' })
  createRequest(
    @Req() req: any,
    @Body() body: {
      scheduleId: number;
      newDate: string;
      newStartTime: string;
      newEndTime: string;
      newRoomId?: number;
      reason?: string;
    },
  ) {
    return this.rescheduleService.createRequest({
      ...body,
      requestedBy: req.user.id,
    });
  }

  // Public endpoint for portal dosen
  @Public()
  @Post('portal-request')
  @ApiOperation({ summary: 'Portal dosen: request reschedule (via token validation in body)' })
  createPortalRequest(
    @Body() body: {
      scheduleId: number;
      requestedBy: number;
      newDate: string;
      newStartTime: string;
      newEndTime: string;
      newRoomId?: number;
      reason?: string;
    },
  ) {
    return this.rescheduleService.createRequest(body);
  }

  // Admin: list all requests
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('schedules.generate')
  @Get()
  @ApiOperation({ summary: 'Admin: list semua request reschedule' })
  findAll(
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.rescheduleService.findAll({
      status,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
    });
  }

  // Admin: approve
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('schedules.generate')
  @Patch(':id/approve')
  @ApiOperation({ summary: 'Admin: approve reschedule (jadwal otomatis diperbarui)' })
  approve(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: any,
    @Body() body: { adminNotes?: string },
  ) {
    return this.rescheduleService.approve(id, req.user.id, body.adminNotes);
  }

  // Admin: reject
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('schedules.generate')
  @Patch(':id/reject')
  @ApiOperation({ summary: 'Admin: reject reschedule' })
  reject(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: any,
    @Body() body: { adminNotes?: string },
  ) {
    return this.rescheduleService.reject(id, req.user.id, body.adminNotes);
  }
}

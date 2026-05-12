import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  Req,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { AttendanceService } from './attendance.service';

@ApiTags('Attendance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('api/attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Get('today')
  @RequirePermissions('attendance.view')
  @ApiOperation({ summary: 'List jadwal hari ini dengan status kehadiran dosen' })
  getToday(@Req() req: any) {
    return this.attendanceService.getTodaySchedules(req.user);
  }

  @Post('clock-in')
  @RequirePermissions('attendance.manage')
  @ApiOperation({ summary: 'Clock-in dosen (catat mulai mengajar)' })
  clockIn(
    @Req() req: any,
    @Body() body: { classCourseId: number },
  ) {
    return this.attendanceService.clockIn(body.classCourseId, req.user.id);
  }

  @Patch(':logId/clock-out')
  @RequirePermissions('attendance.manage')
  @ApiOperation({ summary: 'Clock-out dosen (catat selesai mengajar)' })
  clockOut(@Param('logId', ParseIntPipe) logId: number) {
    return this.attendanceService.clockOut(logId);
  }

  @Patch(':logId/set-by-schedule')
  @RequirePermissions('attendance.manage')
  @ApiOperation({ summary: 'Set waktu sesuai jadwal (shortcut)' })
  setBySchedule(
    @Param('logId', ParseIntPipe) logId: number,
    @Body() body: { scheduleId: number },
  ) {
    return this.attendanceService.setBySchedule(logId, body.scheduleId);
  }

  @Get('history')
  @RequirePermissions('attendance.view')
  @ApiOperation({ summary: 'Riwayat kehadiran dosen' })
  getHistory(
    @Query('lecturerId') lecturerId?: string,
    @Query('classCourseId') classCourseId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.attendanceService.getHistory({
      lecturerId: lecturerId ? parseInt(lecturerId) : undefined,
      classCourseId: classCourseId ? parseInt(classCourseId) : undefined,
      startDate,
      endDate,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
    });
  }
}

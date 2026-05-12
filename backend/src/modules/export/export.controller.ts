import { Controller, Get, Query, Res, UseGuards, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { ExportService } from './export.service';

@ApiTags('Export')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('api/export')
export class ExportController {
  constructor(private readonly exportService: ExportService) {}

  @Get('schedule')
  @RequirePermissions('schedules.view')
  @ApiOperation({ summary: 'Export jadwal semester ke Excel' })
  async exportSchedule(
    @Query('semesterId', ParseIntPipe) semesterId: number,
    @Res() res: Response,
  ) {
    const buffer = await this.exportService.exportSchedule(semesterId);
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename=jadwal-semester-${semesterId}.xlsx`,
    });
    res.send(buffer);
  }

  @Get('students')
  @RequirePermissions('classes.view')
  @ApiOperation({ summary: 'Export daftar mahasiswa per kelas ke Excel' })
  async exportStudents(
    @Query('classCourseId', ParseIntPipe) classCourseId: number,
    @Res() res: Response,
  ) {
    const buffer = await this.exportService.exportStudentList(classCourseId);
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename=mahasiswa-kelas-${classCourseId}.xlsx`,
    });
    res.send(buffer);
  }

  @Get('grades')
  @RequirePermissions('classes.view')
  @ApiOperation({ summary: 'Export rekap nilai per kelas ke Excel' })
  async exportGrades(
    @Query('classCourseId', ParseIntPipe) classCourseId: number,
    @Res() res: Response,
  ) {
    const buffer = await this.exportService.exportGrades(classCourseId);
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename=nilai-kelas-${classCourseId}.xlsx`,
    });
    res.send(buffer);
  }

  @Get('attendance')
  @RequirePermissions('classes.view')
  @ApiOperation({ summary: 'Export rekap absensi mahasiswa per kelas ke Excel' })
  async exportAttendance(
    @Query('classCourseId', ParseIntPipe) classCourseId: number,
    @Res() res: Response,
  ) {
    const buffer = await this.exportService.exportAttendance(classCourseId);
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename=absensi-kelas-${classCourseId}.xlsx`,
    });
    res.send(buffer);
  }

  @Get('lecturer-attendance')
  @RequirePermissions('attendance.view')
  @ApiOperation({ summary: 'Export rekap kehadiran dosen per semester ke Excel' })
  async exportLecturerAttendance(
    @Query('semesterId', ParseIntPipe) semesterId: number,
    @Res() res: Response,
  ) {
    const buffer = await this.exportService.exportLecturerAttendance(semesterId);
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename=kehadiran-dosen-semester-${semesterId}.xlsx`,
    });
    res.send(buffer);
  }
}

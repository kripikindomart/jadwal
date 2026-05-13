import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, Req, ParseIntPipe, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { Public } from '../../common/decorators';
import { GuidanceService } from './guidance.service';
import { GuidanceStatus } from '../../database/entities/guidance-schedule.entity';

@ApiTags('Guidance / Bimbingan')
@Controller('api/guidance')
export class GuidanceController {
  constructor(private readonly guidanceService: GuidanceService) {}

  // ============ STUDENT PORTAL (Public, via NIM) ============

  @Public()
  @Get('portal/:nim')
  @ApiOperation({ summary: 'Portal mahasiswa: get data bimbingan via NIM' })
  getPortal(@Param('nim') nim: string) {
    return this.guidanceService.getStudentPortalData(nim);
  }

  @Public()
  @Post('portal/:nim/request')
  @ApiOperation({ summary: 'Portal mahasiswa: request bimbingan baru' })
  createFromPortal(
    @Param('nim') nim: string,
    @Body() body: {
      lecturerId: number;
      date: string;
      startTime: string;
      endTime: string;
      topic?: string;
      studentNotes?: string;
      type?: string;
    },
  ) {
    return this.guidanceService.createRequestFromPortal(nim, body);
  }

  @Public()
  @Post('portal/:nim/thesis/submit')
  @ApiOperation({ summary: 'Portal mahasiswa: ajukan judul tugas akhir' })
  submitThesis(
    @Param('nim') nim: string,
    @Body() body: { title: string; titleEn?: string; abstract?: string; type?: string },
  ) {
    return this.guidanceService.submitThesisFromPortal(nim, body);
  }

  @Public()
  @Get('portal/:nim/thesis')
  @ApiOperation({ summary: 'Portal mahasiswa: lihat data tugas akhir saya' })
  getMyThesis(@Param('nim') nim: string) {
    return this.guidanceService.getMyThesis(nim);
  }

  // ============ AUTHENTICATED STUDENT ============

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('my-requests')
  @ApiOperation({ summary: 'Mahasiswa: list request bimbingan saya' })
  getMyRequests(@Req() req: any) {
    return this.guidanceService.getMyRequests(req.user.id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('request')
  @ApiOperation({ summary: 'Mahasiswa: buat request bimbingan' })
  createRequest(
    @Req() req: any,
    @Body() body: {
      lecturerId: number;
      date: string;
      startTime: string;
      endTime: string;
      topic?: string;
      studentNotes?: string;
      type?: string;
    },
  ) {
    return this.guidanceService.createRequest(req.user.id, body);
  }

  // ============ ADMIN ============

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('guidance.manage')
  @Get()
  @ApiOperation({ summary: 'Admin: list semua jadwal bimbingan' })
  findAll(
    @Query('status') status?: string,
    @Query('lecturerId') lecturerId?: string,
    @Query('date') date?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.guidanceService.findAll({
      status,
      lecturerId: lecturerId ? parseInt(lecturerId) : undefined,
      date,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
    });
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('guidance.manage')
  @Post()
  @ApiOperation({ summary: 'Admin: buat jadwal bimbingan langsung' })
  createByAdmin(@Body() body: {
    studentId: number;
    lecturerId: number;
    date: string;
    startTime: string;
    endTime: string;
    roomId?: number;
    topic?: string;
    type?: string;
  }) {
    return this.guidanceService.createByAdmin(body);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('guidance.manage')
  @Patch(':id/status')
  @ApiOperation({ summary: 'Admin: approve/reject/done bimbingan' })
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { status: GuidanceStatus; roomId?: number; lecturerNotes?: string },
  ) {
    return this.guidanceService.updateStatus(id, body);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('guidance.manage')
  @Delete(':id')
  @ApiOperation({ summary: 'Admin: hapus jadwal bimbingan' })
  delete(@Param('id', ParseIntPipe) id: number) {
    return this.guidanceService.delete(id);
  }

  // ============ DISPLAY TV ============

  @Public()
  @Get('today')
  @ApiOperation({ summary: 'Display TV: jadwal bimbingan hari ini (public)' })
  getTodayGuidance() {
    return this.guidanceService.getTodayGuidance();
  }
}

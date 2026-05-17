import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, Req, ParseIntPipe, UseGuards,
  UseInterceptors, UploadedFile, BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { Public } from '../../common/decorators';
import { GuidanceService } from './guidance.service';
import { GuidanceStatus } from '../../database/entities/guidance-schedule.entity';

const THESIS_UPLOAD_MAX_MB = Number(process.env.THESIS_UPLOAD_MAX_MB || 25);
const THESIS_UPLOAD_MAX_BYTES = THESIS_UPLOAD_MAX_MB * 1024 * 1024;

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
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('guidance.student.view')
  @Get('my-requests')
  @ApiOperation({ summary: 'Mahasiswa: list request bimbingan saya' })
  getMyRequests(@Req() req: any) {
    return this.guidanceService.getMyRequests(req.user.id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('guidance.student.view')
  @Get('my-logbook')
  @ApiOperation({ summary: 'Mahasiswa: list logbook bimbingan saya' })
  getMyLogbook(@Req() req: any) {
    return this.guidanceService.getMyLogbook(req.user.id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('guidance.student.manage')
  @Post('my-logbook')
  @ApiOperation({ summary: 'Mahasiswa: buat logbook bimbingan untuk validasi pembimbing' })
  createMyLogbook(
    @Req() req: any,
    @Body() body: {
      thesisId: number;
      lecturerId: number;
      date: string;
      startTime?: string;
      endTime?: string;
      topic: string;
      notes?: string;
      studentProgress?: string;
      nextAction?: string;
      chapter?: string;
      attachmentUrl?: string;
    },
  ) {
    return this.guidanceService.createMyLogbook(req.user.id, body);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('guidance.student.manage')
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

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('guidance.student.view')
  @Get('my-thesis')
  @ApiOperation({ summary: 'Mahasiswa: lihat data tugas akhir saya (authenticated)' })
  getMyThesisAuth(@Req() req: any) {
    return this.guidanceService.getMyThesisById(req.user.id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('guidance.student.view')
  @Get('available-lecturers')
  @ApiOperation({ summary: 'Mahasiswa: list dosen yang tersedia sebagai pembimbing' })
  getAvailableLecturers(@Req() req: any) {
    return this.guidanceService.getAvailableLecturers(req.user.id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('guidance.student.view')
  @Get('available-concentrations')
  @ApiOperation({ summary: 'Mahasiswa: list konsentrasi yang tersedia' })
  getAvailableConcentrations() {
    return this.guidanceService.getAvailableConcentrations();
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('guidance.student.manage')
  @Post('my-thesis/submit')
  @ApiOperation({ summary: 'Mahasiswa: ajukan proposal tugas akhir (authenticated)' })
  submitMyThesis(
    @Req() req: any,
    @Body() body: {
      title: string;
      titleEn?: string;
      abstract?: string;
      type?: string;
      keywords?: string;
      concentration?: string;
      supervisorId1?: number;
      supervisorId2?: number;
      documentUrl?: string;
    },
  ) {
    return this.guidanceService.submitThesisAuth(req.user.id, body);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('guidance.student.manage')
  @Patch('my-thesis/:id')
  @ApiOperation({ summary: 'Mahasiswa: update draft proposal' })
  updateMyThesis(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: any,
  ) {
    return this.guidanceService.updateThesisDraft(req.user.id, id, body);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('guidance.student.manage')
  @Delete('my-thesis/:id')
  @ApiOperation({ summary: 'Mahasiswa: batalkan pengajuan proposal sebelum direview' })
  cancelMyThesis(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.guidanceService.cancelThesisSubmission(req.user.id, id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('guidance.student.manage')
  @Post('my-thesis/upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: THESIS_UPLOAD_MAX_BYTES },
    }),
  )
  @ApiOperation({ summary: 'Mahasiswa: upload file proposal (PDF)' })
  async uploadThesisFile(
    @Req() req: any,
    @UploadedFile() file: any,
  ) {
    if (!file) throw new BadRequestException('File tidak ditemukan');
    return this.guidanceService.uploadThesisFile(req.user.id, file);
  }

  // ============ ADMIN ============

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('guidance.manage')
  @Get('logbook')
  @ApiOperation({ summary: 'Reviewer: list logbook mahasiswa untuk verifikasi' })
  getLogbookForReview(
    @Req() req: any,
    @Query('status') status?: 'PENDING' | 'APPROVED' | 'REJECTED',
  ) {
    const roles = (req.user?.roles || []).map((r: any) => r.slug);
    const isDosenOnly = roles.includes('dosen') && !roles.includes('staff') && !roles.includes('admin') && !roles.includes('superadmin');

    return this.guidanceService.getLogbookForReview({
      lecturerId: isDosenOnly ? req.user.id : undefined,
      status,
    });
  }

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

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('guidance.manage')
  @Patch('logbook/:id/validate')
  @ApiOperation({ summary: 'Validasi logbook bimbingan (approve/reject)' })
  validateLogbook(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { status: 'APPROVED' | 'REJECTED'; reviewerNotes?: string; nextSteps?: string },
  ) {
    return this.guidanceService.validateLogbook(id, body.status, body.reviewerNotes, body.nextSteps);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('guidance.manage')
  @Get('logbook/student/:studentId')
  @ApiOperation({ summary: 'Get all logbooks for a specific student' })
  getStudentLogbooks(
    @Param('studentId', ParseIntPipe) studentId: number,
    @Req() req: any,
  ) {
    const roles = (req.user?.roles || []).map((r: any) => r.slug);
    const isDosenOnly = roles.includes('dosen') && !roles.includes('staff') && !roles.includes('admin') && !roles.includes('superadmin');
    return this.guidanceService.getStudentLogbooks(studentId, isDosenOnly ? req.user.id : undefined);
  }

  // ============ DISPLAY TV ============

  @Public()
  @Get('today')
  @ApiOperation({ summary: 'Display TV: jadwal bimbingan hari ini (public)' })
  getTodayGuidance() {
    return this.guidanceService.getTodayGuidance();
  }
}
